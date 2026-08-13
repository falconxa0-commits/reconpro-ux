import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';


export async function GET(request: NextRequest) {
  const { error, auth } = await withProtection(request, { requireAuth: true, rateLimit: { maxRequests: 30, windowMs: 60_000 } });
  if (error) return error;

  try {
    const orgId = auth?.organizationId ?? 'org_default';
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = await db.nHIAuditLog.findMany({
      where: { organizationId: orgId },
      include: { revocation: { select: { id: true, identifier: true, cloudProvider: true } } },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('NHI audit error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
