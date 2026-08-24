import { withProtection } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

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
      { name: 'Critical', value: criticalFindings, color: '#ff3355' },
      { name: 'High', value: highFindings, color: '#ff8800' },
      { name: 'Medium', value: mediumFindings, color: '#d29922' },
      { name: 'Low', value: lowFindings, color: '#00ff88' },
      { name: 'Info', value: infoFindings, color: '#666666' },
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