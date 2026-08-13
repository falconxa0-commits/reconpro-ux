import { withProtection } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
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