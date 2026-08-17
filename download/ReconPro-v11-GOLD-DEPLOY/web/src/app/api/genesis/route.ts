import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateStampId,
  signAttestation,
  type AttestationPayload,
} from '@/lib/genesis-crypto';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

type Tier = 'basic' | 'professional' | 'enterprise';

const TIER_EXPIRY_DAYS: Record<Tier, number> = {
  basic: 90,
  professional: 60,
  enterprise: 30,
};

/**
 * Derive a letter grade from a 0–100 score.
 */
function scoreToGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'C+';
  if (score >= 65) return 'C';
  if (score >= 60) return 'D+';
  if (score >= 55) return 'D';
  return 'F';
}

/**
 * Grade → badge colour for the embed snippet.
 */
function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#00ff88';
  if (grade.startsWith('B')) return '#a3e635';
  if (grade.startsWith('C')) return '#facc15';
  if (grade.startsWith('D')) return '#fb923c';
  return '#ef4444';
}

// ═══════════════════════════════════════════════════════════════════════
// POST — Issue a new Genesis Stamp
// ═══════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const { error, auth, clientIp } = await withProtection(request, { requireAuth: true, rateLimit: { maxRequests: 5, windowMs: 60_000 } });
  if (error) return error;

  try {
    const body = await request.json();
    const { domain, tier, scanId } = body as {
      domain?: string;
      tier?: Tier;
      scanId?: string;
      organizationId?: string;
    };

    if (!domain) {
      return NextResponse.json(
        { error: 'domain is required' },
        { status: 400 }
      );
    }

    const selectedTier: Tier = tier ?? 'basic';

    // ── 1. Find the latest completed scan for this domain ─────────────
    let targetScanId = scanId;

    if (!targetScanId) {
      // Find the ScanTarget for this domain
      const scanTarget = await db.scanTarget.findFirst({
        where: { domain },
        orderBy: { lastScanned: 'desc' },
      });

      if (scanTarget) {
        const latestScan = await db.scan.findFirst({
          where: { targetId: scanTarget.id, status: 'completed' },
          orderBy: { completedAt: 'desc' },
        });
        targetScanId = latestScan?.id;
      }
    }

    // ── 2. Aggregate score from scan findings ─────────────────────────
    let score = 0;
    let findingsSummary: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    if (targetScanId) {
      const findings = await db.finding.findMany({
        where: { scanId: targetScanId },
      });

      // Count by severity
      for (const f of findings) {
        const s = f.severity as keyof typeof findingsSummary;
        if (s in findingsSummary) {
          findingsSummary[s]++;
        }
      }

      // Score = 100 minus severity-weighted deductions
      const deductions =
        findingsSummary.critical * 15 +
        findingsSummary.high * 8 +
        findingsSummary.medium * 3 +
        findingsSummary.low * 1;
      score = Math.max(0, Math.min(100, 100 - deductions));

      // Also factor in the scan's own complianceScore if available
      if (findings.length > 0) {
        const scan = await db.scan.findUnique({
          where: { id: targetScanId },
        });
        if (scan && scan.complianceScore > 0) {
          // Blend: 60% finding-based + 40% compliance score
          score = Math.round(score * 0.6 + scan.complianceScore * 0.4);
        }
      }
    } else {
      // No scan data — assign a default low score
      score = 0;
    }

    score = Math.max(0, Math.min(100, score));
    const grade = scoreToGrade(score);

    // ── 3. Gather compliance scores ────────────────────────────────────
    let complianceScores: Record<string, number> = {};
    let frameworks: string[] = [];

    if (targetScanId) {
      const reports = await db.complianceReport.findMany({
        where: { scanId: targetScanId },
      });
      for (const r of reports) {
        complianceScores[r.framework] = r.overallScore;
        frameworks.push(r.framework);
      }
    }

    // ── 4. Build attestation payload and sign ──────────────────────────
    const stampId = generateStampId();
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + TIER_EXPIRY_DAYS[selectedTier] * 86400000
    );

    const payload: AttestationPayload = {
      stampId,
      domain,
      tier: selectedTier,
      score,
      grade,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      frameworks,
      complianceScores,
      findingsSummary,
    };

    const { signature, publicKey, payloadHash } = signAttestation(payload);

    // ── 5. Store in DB ─────────────────────────────────────────────────
    const stamp = await db.genesisStamp.create({
      data: {
        stampId,
        organizationId: auth?.organizationId ?? null,
        domain,
        tier: selectedTier,
        score,
        grade,
        scanId: targetScanId,
        complianceScores: JSON.stringify(complianceScores),
        findingsSummary: JSON.stringify(findingsSummary),
        frameworks: JSON.stringify(frameworks),
        signature,
        publicKey,
        payloadHash,
        status: 'active',
        issuedAt,
        expiresAt,
      },
    });

    // ── 6. Audit trail ─────────────────────────────────────────────────
    await db.genesisAuditTrail.create({
      data: {
        stampId: stamp.id,
        action: 'issued',
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') ?? undefined,
        details: JSON.stringify({ tier: selectedTier, scanId: targetScanId }),
      },
    });

    // ── 7. Embed code snippet ──────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reconpro.dev';
    const embedCode = `<script src="${baseUrl}/api/genesis/embed/${stampId}.js"></script>`;

    return NextResponse.json({
      stamp: {
        id: stamp.id,
        stampId: stamp.stampId,
        domain: stamp.domain,
        tier: stamp.tier,
        score: stamp.score,
        grade: stamp.grade,
        status: stamp.status,
        issuedAt: stamp.issuedAt,
        expiresAt: stamp.expiresAt,
        frameworks,
        complianceScores,
        findingsSummary,
        signature,
        publicKey,
        payloadHash,
        verifiedCount: 0,
        embedViews: 0,
      },
      embedCode,
    }, { status: 201 });
  } catch (error) {
    console.error('Genesis Stamp issuance error:', error);
    return NextResponse.json(
      { error: 'Failed to issue Genesis Stamp' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET — List stamps for an org or domain
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const domain = searchParams.get('domain');

    if (!organizationId && !domain) {
      return NextResponse.json(
        { error: 'organizationId or domain query param is required' },
        { status: 400 }
      );
    }

    const stamps = await db.genesisStamp.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(domain ? { domain } : {}),
      },
      orderBy: { issuedAt: 'desc' },
    });

    return NextResponse.json({ stamps });
  } catch (error) {
    console.error('Genesis Stamp list error:', error);
    return NextResponse.json(
      { error: 'Failed to list Genesis Stamps' },
      { status: 500 }
    );
  }
}
