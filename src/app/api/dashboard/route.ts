import { extractClientIP } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api-security';


export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const totalScans = await db.scan.count();
    const totalFindings = await db.finding.count();
    const criticalFindings = await db.finding.count({ where: { severity: 'critical' } });
    const highFindings = await db.finding.count({ where: { severity: 'high' } });
    const mediumFindings = await db.finding.count({ where: { severity: 'medium' } });
    const lowFindings = await db.finding.count({ where: { severity: 'low' } });
    const infoFindings = await db.finding.count({ where: { severity: 'info' } });

    const recentScans = await db.scan.findMany({
      orderBy: { startedAt: 'desc' },
      take: 7,
      include: { target: true },
    });

    const categoryBreakdown = await db.finding.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const severityBreakdown = [
      { name: 'Critical', value: criticalFindings, color: '#ef4444' },
      { name: 'High', value: highFindings, color: '#f97316' },
      { name: 'Medium', value: mediumFindings, color: '#eab308' },
      { name: 'Low', value: lowFindings, color: '#22c55e' },
      { name: 'Info', value: infoFindings, color: '#6b7280' },
    ];

    const avgRiskScore = totalScans > 0
      ? Math.round((await db.scan.aggregate({ _avg: { riskScore: true } }))._avg.riskScore || 0)
      : 0;

    return NextResponse.json({
      stats: {
        totalScans,
        totalFindings,
        criticalFindings,
        highFindings,
        mediumFindings,
        lowFindings,
        infoFindings,
        avgRiskScore,
      },
      recentScans,
      categoryBreakdown,
      severityBreakdown,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}