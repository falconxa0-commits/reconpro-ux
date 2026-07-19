import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
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