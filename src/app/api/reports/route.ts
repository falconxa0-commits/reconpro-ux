import { withProtection } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/reports
 * Query params: scanId (optional), format (json — default)
 *
 * Returns a structured in-app JSON report with:
 * - executive summary
 * - risk score
 * - findings by severity
 * - recommendations
 * - metadata
 */
export async function GET(request: NextRequest) {
  const { error, auth } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scanId');

    // Fetch scan data
    let scan;
    if (scanId) {
      scan = await db.scan.findFirst({
        where: { id: scanId },
        include: {
          target: true,
          findings: {
            orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          },
        },
      });

      if (!scan) {
        return NextResponse.json(
          { error: `Scan '${scanId}' not found` },
          { status: 404 }
        );
      }
    } else {
      const orgFilter = auth?.organizationId ? { target: { organizationId: auth.organizationId } } : undefined;
      scan = await db.scan.findFirst({
        where: orgFilter,
        orderBy: { startedAt: 'desc' },
        include: {
          target: true,
          findings: {
            orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          },
        },
      });

      if (!scan) {
        return NextResponse.json(
          { error: 'No scans available to report' },
          { status: 404 }
        );
      }
    }

    const report = buildStructuredReport(scan);
    return NextResponse.json(report);
  } catch (err) {
    console.error('Report generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports
 * Body: { scanId?: string }
 *
 * Accepts an optional scanId to generate a report for a specific scan.
 * Falls back to the most recent scan for the authenticated organization.
 */
export async function POST(request: NextRequest) {
  const { error, auth } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const scanId = body.scanId as string | undefined;

    let scan;
    if (scanId) {
      scan = await db.scan.findFirst({
        where: { id: scanId },
        include: {
          target: true,
          findings: {
            orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          },
        },
      });

      if (!scan) {
        return NextResponse.json(
          { error: `Scan '${scanId}' not found` },
          { status: 404 }
        );
      }
    } else {
      const orgFilter = auth?.organizationId ? { target: { organizationId: auth.organizationId } } : undefined;
      scan = await db.scan.findFirst({
        where: orgFilter,
        orderBy: { startedAt: 'desc' },
        include: {
          target: true,
          findings: {
            orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          },
        },
      });

      if (!scan) {
        return NextResponse.json(
          { error: 'No scans available to report' },
          { status: 404 }
        );
      }
    }

    const report = buildStructuredReport(scan);
    return NextResponse.json(report);
  } catch (err) {
    console.error('Report generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// ── Report Builder ──────────────────────────────────────────

function buildStructuredReport(scan: {
  id: string;
  riskScore: number;
  totalVulns: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  startedAt: Date;
  completedAt: Date | null;
  scanType: string;
  triggeredBy: string;
  complianceScore: number;
  target: { domain: string; ip: string | null };
  findings: {
    id: string;
    title: string;
    severity: string;
    description: string;
    category: string;
    asset: string;
    remediation: string | null;
    cve: string | null;
    cvss: number | null;
  }[];
}) {
  const domain = scan.target.domain;
  const timestamp = scan.completedAt
    ? scan.completedAt.toISOString()
    : scan.startedAt.toISOString();

  // Build findings by severity
  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'] as const;
  const findingsBySeverity: Record<string, typeof scan.findings> = {};

  for (const severity of severityOrder) {
    const items = scan.findings.filter((f) => f.severity === severity);
    if (items.length > 0) {
      findingsBySeverity[severity] = items.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        category: f.category,
        asset: f.asset,
        severity: f.severity,
        remediation: f.remediation,
        cve: f.cve,
        cvss: f.cvss,
      }));
    }
  }

  // Build recommendations from findings with remediation
  const recommendations = scan.findings
    .filter((f) => f.remediation && f.remediation.trim().length > 0)
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
    })
    .map((f) => ({
      finding: f.title,
      severity: f.severity,
      recommendation: f.remediation,
      priority: f.severity === 'critical' || f.severity === 'high' ? 'immediate' : f.severity === 'medium' ? 'short-term' : 'long-term',
    }));

  // Risk level label
  const riskLevel =
    scan.riskScore >= 80 ? 'Critical'
    : scan.riskScore >= 60 ? 'High'
    : scan.riskScore >= 40 ? 'Medium'
    : scan.riskScore >= 20 ? 'Low'
    : 'Minimal';

  return {
    report: {
      id: `rpt_${scan.id}`,
      generatedAt: new Date().toISOString(),
      type: 'security-assessment',
    },
    metadata: {
      scanId: scan.id,
      target: {
        domain,
        ip: scan.target.ip,
      },
      scanType: scan.scanType,
      triggeredBy: scan.triggeredBy,
      scanStartedAt: scan.startedAt.toISOString(),
      scanCompletedAt: scan.completedAt?.toISOString() ?? null,
      platformVersion: '0.3.0',
    },
    executiveSummary: {
      riskScore: scan.riskScore,
      riskLevel,
      complianceScore: scan.complianceScore,
      totalFindings: scan.totalVulns,
      severityBreakdown: {
        critical: scan.criticalCount,
        high: scan.highCount,
        medium: scan.mediumCount,
        low: scan.lowCount,
        info: scan.infoCount,
      },
      summary: `Security assessment of ${domain} identified ${scan.totalVulns} findings across ${scan.findings.length ? Object.keys(findingsBySeverity).length : 0} severity levels. Overall risk score is ${scan.riskScore}/100 (${riskLevel}). ${scan.criticalCount > 0 ? `${scan.criticalCount} critical vulnerabilities require immediate attention.` : 'No critical vulnerabilities were identified.'}`,
    },
    findings: findingsBySeverity,
    recommendations,
  };
}
