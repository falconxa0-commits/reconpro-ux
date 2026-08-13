import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeCNIThreats,
  SCADA_PROTOCOLS,
  APT_GROUPS,
} from '@/lib/cni-sentinel-engine';
import type { NetworkSegment, Industry, DeviceInfo, ScanFinding } from '@/lib/cni-sentinel-engine';
import { checkRateLimit, safeErrorResponse, applySecurityHeaders } from '@/lib/api-security';


// ══════════════════════════════════════════════════════════════════════════════
// CNI THREAT SENTINEL API
// POST /api/cni-sentinel/analyze  — Run full CNI threat analysis
// GET /api/cni-sentinel/protocols — List supported SCADA/ICS protocols
// GET /api/cni-sentinel/apt-groups — List known APT groups
// ══════════════════════════════════════════════════════════════════════════════

const VALID_SEGMENTS: NetworkSegment[] = ['scada', 'plc', 'hmi', 'dcs', 'enterprise', 'dmz'];
const VALID_INDUSTRIES: Industry[] = ['energy', 'water', 'transportation', 'telecom', 'defense', 'manufacturing'];

export async function POST(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json();

    const networkSegment = body.networkSegment as NetworkSegment | undefined;
    const industry = body.industry as Industry | undefined;
    const protocols = body.protocols as string[] | undefined;
    const devices = body.devices as DeviceInfo[] | undefined;
    const scanFindings = body.scanFindings as ScanFinding[] | undefined;

    // Validate required fields
    if (!networkSegment || !VALID_SEGMENTS.includes(networkSegment)) {
      return NextResponse.json(
        { error: `Invalid networkSegment. Must be one of: ${VALID_SEGMENTS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!industry || !VALID_INDUSTRIES.includes(industry)) {
      return NextResponse.json(
        { error: `Invalid industry. Must be one of: ${VALID_INDUSTRIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!protocols || !Array.isArray(protocols) || protocols.length === 0) {
      return NextResponse.json(
        { error: 'protocols is required and must be a non-empty array of protocol keys' },
        { status: 400 }
      );
    }

    // Validate protocol keys
    const invalidProtocols = protocols.filter(p => !SCADA_PROTOCOLS[p]);
    if (invalidProtocols.length > 0) {
      return NextResponse.json(
        { error: `Unknown protocol(s): ${invalidProtocols.join(', ')}. Valid keys: ${Object.keys(SCADA_PROTOCOLS).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate devices if provided
    if (devices) {
      for (const device of devices) {
        if (!device.type || !device.vendor || !device.ip) {
          return NextResponse.json(
            { error: 'Each device must have: type, vendor, firmware, ip' },
            { status: 400 }
          );
        }
      }
    }

    // Run analysis
    const results = analyzeCNIThreats({
      networkSegment,
      industry,
      protocols,
      devices,
      scanFindings,
    });

    // Strip the large STIX/IODEF from main response (available via separate download)
    const { stixReport, iodefReport, ...analysisData } = results;

    return applySecurityHeaders(NextResponse.json({
      success: true,
      ...analysisData,
      _reportMeta: {
        stixAvailable: stixReport.length > 0,
        stixSize: Buffer.byteLength(stixReport, 'utf-8'),
        iodefAvailable: iodefReport.length > 0,
        iodefSize: Buffer.byteLength(iodefReport, 'utf-8'),
      },
    }));
  } catch (error) {
    return safeErrorResponse(error, 500, 'cni-sentinel');
  }
}

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');

  if (resource === 'protocols') {
    // Return all supported SCADA/ICS protocols
    const protocolsList = Object.entries(SCADA_PROTOCOLS).map(([key, proto]) => ({
      key,
      name: proto.name,
      port: proto.port,
      risk: proto.risk,
      commonVulns: proto.commonVulns,
      iec62443: proto.iec62443,
      nercCip: proto.nercCip,
    }));
    return NextResponse.json({
      success: true,
      count: protocolsList.length,
      protocols: protocolsList,
    });
  }

  if (resource === 'apt-groups') {
    // Return all known APT groups targeting CNI
    return NextResponse.json({
      success: true,
      count: APT_GROUPS.length,
      groups: APT_GROUPS,
    });
  }

  if (resource === 'stix-report') {
    // Generate a STIX report on-the-fly
    const segment = (searchParams.get('networkSegment') || 'scada') as NetworkSegment;
    const industry = (searchParams.get('industry') || 'energy') as Industry;
    const protocols = (searchParams.get('protocols') || '').split(',').filter(Boolean);

    if (protocols.length > 0) {
      const results = analyzeCNIThreats({ networkSegment: segment, industry, protocols });
      return new NextResponse(results.stixReport, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="cni-stix-report.json"',
        },
      });
    }
    return NextResponse.json({ error: 'Provide protocols query param (comma-separated)' }, { status: 400 });
  }

  if (resource === 'iodef-report') {
    const segment = (searchParams.get('networkSegment') || 'scada') as NetworkSegment;
    const industry = (searchParams.get('industry') || 'energy') as Industry;
    const protocols = (searchParams.get('protocols') || '').split(',').filter(Boolean);

    if (protocols.length > 0) {
      const results = analyzeCNIThreats({ networkSegment: segment, industry, protocols });
      return new NextResponse(results.iodefReport, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': 'attachment; filename="cni-iodef-report.xml"',
        },
      });
    }
    return NextResponse.json({ error: 'Provide protocols query param (comma-separated)' }, { status: 400 });
  }

  // Default: return both lists
  return NextResponse.json({
    success: true,
    endpoints: [
      'GET ?resource=protocols — List SCADA/ICS protocols',
      'GET ?resource=apt-groups — List APT groups',
      'GET ?resource=stix-report&protocols=modbus_tcp,dnp3 — Download STIX 2.1 JSON',
      'GET ?resource=iodef-report&protocols=modbus_tcp,dnp3 — Download IODEF XML',
      'POST / — Run full CNI threat analysis',
    ],
  });
}
