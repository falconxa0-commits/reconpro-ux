import { withProtection } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/** Valid severity levels for filtering */
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;

type ValidSeverity = (typeof VALID_SEVERITIES)[number];

/**
 * GET /api/scans/history
 *
 * Returns paginated scan history with findings summary.
 *
 * Query params:
 * - page (default 1)
 * - limit (default 20, max 100)
 * - severity (optional filter — critical, high, medium, low, info)
 * - domain (optional search — filters by target domain containing this string)
 */
export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;

    // Parse optional filters
    const severityParam = searchParams.get('severity');
    const domain = searchParams.get('domain')?.trim() || null;

    // Validate severity filter if provided
    let severityFilter: ValidSeverity | undefined;
    if (severityParam) {
      if (!VALID_SEVERITIES.includes(severityParam as ValidSeverity)) {
        return NextResponse.json(
          {
            error: `Invalid severity '${severityParam}'. Must be one of: ${VALID_SEVERITIES.join(', ')}`,
          },
          { status: 400 }
        );
      }
      severityFilter = severityParam as ValidSeverity;
    }

    // Build the where clause
    const where: Record<string, unknown> = {};

    // Filter by domain (search on target relation)
    if (domain) {
      where.target = { domain: { contains: domain } };
    }

    // If severity filter, only include scans that have findings with that severity
    if (severityFilter) {
      where.findings = { some: { severity: severityFilter } };
    }

    // Fetch paginated scans with target and limited findings
    const [scans, total] = await Promise.all([
      db.scan.findMany({
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          target: true,
          findings: {
            take: 10,
            orderBy: { severity: 'desc' },
          },
        },
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
      db.scan.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // Map scans to response shape with findings summary
    const mappedScans = scans.map((scan) => ({
      id: scan.id,
      targetId: scan.targetId,
      domain: scan.target.domain,
      status: scan.status,
      scanType: scan.scanType,
      triggeredBy: scan.triggeredBy,
      riskScore: scan.riskScore,
      totalVulns: scan.totalVulns,
      criticalCount: scan.criticalCount,
      highCount: scan.highCount,
      mediumCount: scan.mediumCount,
      lowCount: scan.lowCount,
      infoCount: scan.infoCount,
      complianceScore: scan.complianceScore,
      startedAt: scan.startedAt.toISOString(),
      completedAt: scan.completedAt?.toISOString() ?? null,
      duration: scan.duration,
      findingsCount: scan.findings.length,
      findings: scan.findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        category: f.category,
        description: f.description,
        asset: f.asset,
        status: f.status,
        cve: f.cve,
        cvss: f.cvss,
      })),
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      scans: mappedScans,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error('Scan history fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch scan history' },
      { status: 500 }
    );
  }
}
