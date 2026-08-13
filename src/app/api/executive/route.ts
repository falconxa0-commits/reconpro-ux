import { withProtection } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    // Core stats from real data
    const totalScans = await db.scan.count();
    const totalFindings = await db.finding.count();
    const criticalFindings = await db.finding.count({ where: { severity: 'critical' } });
    const highFindings = await db.finding.count({ where: { severity: 'high' } });
    const mediumFindings = await db.finding.count({ where: { severity: 'medium' } });
    const lowFindings = await db.finding.count({ where: { severity: 'low' } });
    const infoFindings = await db.finding.count({ where: { severity: 'info' } });
    const avgRiskResult = await db.scan.aggregate({ _avg: { riskScore: true } });
    const avgRiskScore = Math.round(avgRiskResult._avg.riskScore || 0);

    // Top risk assets
    const topAssets = await db.scan.findMany({
      orderBy: { riskScore: 'desc' },
      take: 5,
      include: { target: true },
    });

    // Generate risk trend — ONLY from real data
    const allScans = await db.scan.findMany({
      orderBy: { startedAt: 'asc' },
      select: { riskScore: true, startedAt: true },
    });

    let riskTrend: { date: string; score: number }[];
    if (allScans.length === 0) {
      riskTrend = [];
    } else if (allScans.length < 10) {
      // Return actual scan data points — no padding, no fake data
      riskTrend = allScans.map((s) => ({
        date: new Date(s.startedAt).toISOString().split('T')[0],
        score: s.riskScore,
      }));
    } else {
      // 10+ scans: interpolate to 30 points for a smooth chart
      const step = allScans.length / 30;
      riskTrend = Array.from({ length: 30 }, (_, i) => {
        const idx = Math.min(Math.floor(i * step), allScans.length - 1);
        const scan = allScans[idx];
        return {
          date: new Date(scan.startedAt).toISOString().split('T')[0],
          score: scan.riskScore,
        };
      });
    }

    // Compliance scores — query real ComplianceReport records
    const complianceReports = await db.complianceReport.findMany({
      orderBy: { generatedAt: 'desc' },
    });

    // Group by framework, take the most recent report per framework
    const latestByFramework = new Map<string, (typeof complianceReports)[number]>();
    for (const report of complianceReports) {
      if (!latestByFramework.has(report.framework)) {
        latestByFramework.set(report.framework, report);
      }
    }

    // Map framework keys to display names
    const frameworkDisplayNames: Record<string, string> = {
      soc2: 'SOC 2 Type II',
      hipaa: 'HIPAA',
      pci_dss: 'PCI-DSS',
      iso27001: 'ISO 27001',
      nist: 'NIST CSF',
      gdpr: 'GDPR',
    };

    const allFrameworks = ['soc2', 'hipaa', 'pci_dss', 'iso27001', 'nist', 'gdpr'] as const;
    const compliance: Record<string, { score: number | null; status: string | null; controlsPassed: number | null; controlsTotal: number | null }> = {};

    for (const fw of allFrameworks) {
      const report = latestByFramework.get(fw);
      if (report) {
        let status: string | null = report.status;
        if (status === 'pass') status = 'pass';
        else if (status === 'fail') status = 'fail';
        else status = 'warn';

        let controlsPassed: number | null = null;
        let controlsTotal: number | null = null;
        try {
          const controls = JSON.parse(report.controls);
          if (Array.isArray(controls) && controls.length > 0) {
            controlsTotal = controls.length;
            controlsPassed = controls.filter((c: { passed?: boolean }) => c.passed).length;
          }
        } catch {
          // controls JSON is not parseable or not an array
        }

        compliance[fw] = {
          score: report.overallScore,
          status,
          controlsPassed,
          controlsTotal,
        };
      } else {
        compliance[fw] = {
          score: null,
          status: null,
          controlsPassed: null,
          controlsTotal: null,
        };
      }
    }

    // MTTD — Mean Time To Detect = avg scan duration (startedAt → completedAt)
    const completedScans = await db.scan.findMany({
      where: { completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
    });

    let mttd: string | null = null;
    if (completedScans.length > 0) {
      const totalDuration = completedScans.reduce((sum, s) => {
        return sum + (s.completedAt!.getTime() - s.startedAt.getTime());
      }, 0);
      const avgDurationMs = totalDuration / completedScans.length;
      mttd = formatDuration(avgDurationMs);
    }

    // MTTR — Mean Time To Remediate = avg age of open findings (createdAt → now)
    const openFindings = await db.finding.findMany({
      where: { status: 'open' },
      select: { createdAt: true },
    });

    let mttr: string | null = null;
    if (openFindings.length > 0) {
      const now = Date.now();
      const totalAge = openFindings.reduce((sum, f) => {
        return sum + (now - f.createdAt.getTime());
      }, 0);
      const avgAgeMs = totalAge / openFindings.length;
      mttr = formatDuration(avgAgeMs);
    }

    // Recent activity feed (combine scans + threats)
    const recentScans = await db.scan.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: { id: true, riskScore: true, status: true, startedAt: true, target: { select: { domain: true } } },
    });

    const recentThreats = await db.threatAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentActivity = [
      ...recentScans.map((s) => ({
        type: 'scan_completed' as const,
        description: `Scan completed for ${s.target.domain} — Risk Score: ${s.riskScore}/100`,
        timestamp: s.startedAt.toISOString(),
        severity: s.riskScore > 70 ? 'critical' : s.riskScore > 40 ? 'high' : 'info',
      })),
      ...recentThreats.map((t) => ({
        type: 'threat_detected' as const,
        description: t.title,
        timestamp: t.createdAt.toISOString(),
        severity: t.severity,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return NextResponse.json({
      overview: {
        totalScans,
        totalFindings,
        criticalFindings,
        highFindings,
        mediumFindings,
        lowFindings,
        infoFindings,
        avgRiskScore,
        complianceScore: null, // Derived from compliance data — handled client-side
        mttd,
        mttr,
      },
      topAssets,
      riskTrend,
      compliance,
      recentActivity,
    });
  } catch (error) {
    console.error('Executive dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch executive data' }, { status: 500 });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)} min`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return `${hours.toFixed(1)} hr`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}
