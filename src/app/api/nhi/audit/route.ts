import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ORG_ID = 'org_default';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = await db.nHIAuditLog.findMany({
      where: { organizationId: ORG_ID },
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
