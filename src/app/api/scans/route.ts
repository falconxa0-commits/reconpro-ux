import { withProtection } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  const { error, auth } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const orgId = auth?.organizationId;
    const whereClause = orgId
      ? {
          findings: { some: {} },
        }
      : undefined;

    const scans = await db.scan.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: {
        target: true,
        findings: true,
      },
    });

    return NextResponse.json({ scans });
  } catch (error) {
    console.error('Scans fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
  }
}