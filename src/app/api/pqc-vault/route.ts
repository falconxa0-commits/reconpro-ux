// ═══════════════════════════════════════════════════════════════════════
// PQC Sovereign Vault API
// POST /api/pqc-vault       — Run full PQC analysis
// GET  /api/pqc-vault/algorithms — List all PQC + classical algorithms
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzePQCVault,
  generateSyntheticTLSData,
  PQC_ALGORITHMS,
  CLASSICAL_ALGORITHMS,
  PROTOCOL_ANALYSIS,
  type OrganizationType,
} from '@/lib/pqc-vault-engine';
import { checkRateLimit } from '@/lib/api-security';

const VALID_ORG_TYPES: OrganizationType[] = [
  'central_bank', 'clearing_house', 'tier1_bank',
  'payment_processor', 'government', 'enterprise',
];

const VALID_PROTOCOLS = Object.keys(PROTOCOL_ANALYSIS);

// ── POST /api/pqc-vault ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json();
    const { organizationType, protocols, domain, complianceFrameworks } = body;

    // Validate organization type
    if (!organizationType || !VALID_ORG_TYPES.includes(organizationType)) {
      return NextResponse.json(
        { error: `Invalid organizationType. Must be one of: ${VALID_ORG_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate protocols
    if (!protocols || !Array.isArray(protocols) || protocols.length === 0) {
      return NextResponse.json(
        { error: 'protocols must be a non-empty array. Valid values: ' + VALID_PROTOCOLS.join(', ') },
        { status: 400 },
      );
    }

    const invalidProtos = protocols.filter((p: string) => !VALID_PROTOCOLS.includes(p));
    if (invalidProtos.length > 0) {
      return NextResponse.json(
        { error: `Unknown protocols: ${invalidProtos.join(', ')}. Valid: ${VALID_PROTOCOLS.join(', ')}` },
        { status: 400 },
      );
    }

    // Build TLS data — if domain provided and HTTPS is in protocols, generate synthetic data
    let tlsData = body.tlsData;
    if (!tlsData && protocols.includes('https')) {
      tlsData = generateSyntheticTLSData();
    }

    // Run analysis
    const result = analyzePQCVault({
      organizationType,
      protocols,
      tlsData,
      complianceFrameworks,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      organizationType,
      analysis: result,
    });
  } catch (error) {
    console.error('[PQC Vault] Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error during PQC analysis' },
      { status: 500 },
    );
  }
}

// ── GET /api/pqc-vault/algorithms ─────────────────────────────────────

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { searchParams } = new URL(request.url);

  // Route: /api/pqc-vault/algorithms
  if (searchParams.toString() === '' && request.url.endsWith('/algorithms')) {
    const pqcList = Object.entries(PQC_ALGORITHMS).map(([key, algo]) => ({
      id: key,
      ...algo,
    }));

    const classicalList = Object.entries(CLASSICAL_ALGORITHMS).map(([key, algo]) => ({
      id: key,
      ...algo,
    }));

    const protocols = Object.entries(PROTOCOL_ANALYSIS).map(([key, proto]) => ({
      id: key,
      ...proto,
    }));

    return NextResponse.json({
      pqcAlgorithms: pqcList,
      classicalAlgorithms: classicalList,
      protocols,
    });
  }

  return NextResponse.json(
    { error: 'Not found. Use GET /api/pqc-vault/algorithms or POST /api/pqc-vault' },
    { status: 404 },
  );
}
