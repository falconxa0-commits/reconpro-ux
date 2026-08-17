import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeErrorResponse, sanitizeDomain, isBlockedDomain, isPrivateIP } from '@/lib/api-security';
import { safeFetch } from '@/lib/safe-fetch';


// ─── VibeSec micro-scan: HTTP probe for 5 key paths ────────────────

interface ProbeResult {
  path: string;
  status: number;
  exposed: boolean;
}

async function httpProbe(
  domain: string,
  path: string,
): Promise<ProbeResult> {
  try {
    const url = `https://${domain}${path}`;
    const res = await safeFetch(url, {
      method: 'HEAD',
      timeout: 5000,
      followRedirects: false,
    });
    return {
      path,
      status: res.status,
      exposed: res.status >= 200 && res.status < 400 && res.text.length > 0,
    };
  } catch {
    return { path, status: 0, exposed: false };
  }
}

const VIBESEC_PROBE_PATHS = [
  '/.env',
  '/api/webhooks',
  '/admin',
  '/dashboard',
  '/uploads/',
];

function computeGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

async function runVibeSecMicroScan(domain: string): Promise<{
  score: number;
  grade: string;
  findings: number;
  probes: ProbeResult[];
}> {
  const probes = await Promise.all(
    VIBESEC_PROBE_PATHS.map((path) => httpProbe(domain, path)),
  );

  const exposedPaths = probes.filter((p) => p.exposed);
  const exposedCount = exposedPaths.length;
  const totalPaths = VIBESEC_PROBE_PATHS.length;

  // Score: start at 100, deduct for each exposed path
  // But if domain is unreachable, give a low score
  const anyReachable = probes.some((p) => p.status > 0);

  if (!anyReachable) {
    return {
      score: 0,
      grade: 'F',
      findings: 0,
      probes,
    };
  }

  const deductionPerFinding = Math.floor(100 / (totalPaths + 1));
  const score = Math.max(0, 100 - exposedCount * deductionPerFinding);
  const grade = computeGrade(score);

  return { score, grade, findings: exposedCount, probes };
}

// ─── GET: Leaderboard ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { error } = await withProtection(req, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';

  const where: Record<string, unknown> = { verified: true };
  if (category && category !== 'all') {
    where.category = category;
  }
  if (search) {
    where.domain = { contains: search };
  }

  const entries = await db.vibeSecEntry.findMany({
    where,
    orderBy: { score: 'desc' },
    take: 100,
  });

  const now = new Date();
  const ranked = entries.map((entry, idx) => {
    const verifiedAt = entry.verifiedAt
      ? new Date(entry.verifiedAt)
      : null;
    const daysAgo = verifiedAt
      ? Math.floor((now.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      rank: idx + 1,
      id: entry.id,
      domain: entry.domain,
      score: entry.score,
      grade: entry.grade,
      findings: entry.findings,
      category: entry.category,
      submittedBy: entry.submittedBy,
      verifiedAt: entry.verifiedAt,
      daysAgo,
    };
  });

  // Stats
  const allVerified = await db.vibeSecEntry.findMany({
    where: { verified: true },
  });
  const totalEntries = allVerified.length;
  const avgScore =
    totalEntries > 0
      ? Math.round(
          allVerified.reduce((sum, e) => sum + e.score, 0) / totalEntries,
        )
      : 0;
  const aPlusCount = allVerified.filter((e) => e.grade === 'A+').length;

  return NextResponse.json({
    entries: ranked,
    stats: { totalEntries, avgScore, aPlusCount },
  });
}

// ─── POST: Submit domain for scanning ──────────────────────────────

export async function POST(req: NextRequest) {
  const { error } = await withProtection(req, { requireAuth: true, rateLimit: { maxRequests: 5, windowMs: 60_000 } });
  if (error) return error;

  try {
    const body = await req.json();
    const { domain, submittedBy, category } = body;

    // Validate domain using centralized security
    const sanitized = sanitizeDomain(domain);
    if (!sanitized) {
      return NextResponse.json(
        { error: 'Invalid domain format. Must be a public FQDN.' },
        { status: 400 },
      );
    }
    if (isBlockedDomain(sanitized)) {
      return NextResponse.json(
        { error: 'Scanning internal domains is not permitted.' },
        { status: 403 },
      );
    }

    // Check if domain already exists
    const existing = await db.vibeSecEntry.findUnique({
      where: { domain: sanitized },
    });

    if (existing) {
      const now = new Date();
      const verifiedAt = existing.verifiedAt
        ? new Date(existing.verifiedAt)
        : null;
      const daysAgo = verifiedAt
        ? Math.floor(
            (now.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null;
      return NextResponse.json({
        entry: {
          ...existing,
          daysAgo,
          rank: 0, // will be computed client-side if needed
        },
        existing: true,
      });
    }

    // Run VibeSec micro-scan
    const scanResult = await runVibeSecMicroScan(sanitized);

    const isVerified = scanResult.score >= 90;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const entry = await db.vibeSecEntry.create({
      data: {
        domain: sanitized,
        score: scanResult.score,
        grade: scanResult.grade,
        findings: scanResult.findings,
        submittedBy: submittedBy || null,
        category: category || 'other',
        verified: isVerified,
        verifiedAt: isVerified ? now : null,
        expiresAt,
      },
    });

    return NextResponse.json({
      entry: {
        ...entry,
        daysAgo: 0,
        rank: 0,
      },
      existing: false,
    });
  } catch (error) {
    return safeErrorResponse(error, 500, 'hall-of-fame');
  }
}
