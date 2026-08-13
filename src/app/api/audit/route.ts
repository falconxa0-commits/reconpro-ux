import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api-security';


export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const scans = await db.scan.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { target: true },
    });

    const threats = await db.threatAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const logs = [
      ...scans.map(s => ({
        id: s.id,
        action: 'scan_completed',
        resource: 'scan',
        resourceId: s.id,
        description: `Scan completed for ${s.target.domain} with risk score ${s.riskScore}/100 (${s.totalVulns} findings)`,
        severity: s.riskScore > 70 ? 'critical' : s.riskScore > 40 ? 'high' : 'info',
        timestamp: s.startedAt.toISOString(),
      })),
      ...threats.map(t => ({
        id: t.id,
        action: 'threat_detected',
        resource: 'threat',
        resourceId: t.id,
        description: t.title,
        severity: t.severity,
        timestamp: t.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 30);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
