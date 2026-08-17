import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAttestation, type AttestationPayload } from '@/lib/genesis-crypto';

// ═══════════════════════════════════════════════════════════════════════
// GET /api/genesis/verify/[stampId] — Public verification endpoint
// ═══════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stampId: string }> }
) {
  const { error } = await withProtection(request, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const { stampId } = await params;

    // ── 1. Look up stamp by stampId ─────────────────────────────────────
    const stamp = await db.genesisStamp.findUnique({
      where: { stampId },
    });

    if (!stamp) {
      return NextResponse.json(
        { valid: false, error: 'Stamp not found' },
        { status: 404 }
      );
    }

    const now = new Date();

    // ── 2. Check expiry / revocation ────────────────────────────────────
    const notExpired = !stamp.expiresAt || stamp.expiresAt > now;
    const notRevoked = stamp.status !== 'revoked';

    // Auto-expire if past expiry
    if (notExpired === false && stamp.status === 'active') {
      await db.genesisStamp.update({
        where: { id: stamp.id },
        data: { status: 'expired' },
      });
    }

    // ── 3. Reconstruct attestation payload ──────────────────────────────
    const payload: AttestationPayload = {
      stampId: stamp.stampId,
      domain: stamp.domain,
      tier: stamp.tier,
      score: stamp.score,
      grade: stamp.grade,
      issuedAt: stamp.issuedAt.toISOString(),
      expiresAt: stamp.expiresAt ? stamp.expiresAt.toISOString() : '',
      frameworks: JSON.parse(stamp.frameworks),
      complianceScores: JSON.parse(stamp.complianceScores),
      findingsSummary: JSON.parse(stamp.findingsSummary),
    };

    // ── 4. Verify Ed25519 signature ─────────────────────────────────────
    const signatureValid = verifyAttestation(
      payload,
      stamp.signature,
      stamp.publicKey
    );

    const verifiedAt = new Date();

    // ── 5. Increment verifiedCount ──────────────────────────────────────
    await db.genesisStamp.update({
      where: { id: stamp.id },
      data: { verifiedCount: { increment: 1 } },
    });

    // ── 6. Log to audit trail ───────────────────────────────────────────
    const ip =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      undefined;

    await db.genesisAuditTrail.create({
      data: {
        stampId: stamp.id,
        action: 'verified',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') ?? undefined,
        details: JSON.stringify({
          signatureValid,
          notExpired,
          notRevoked,
        }),
      },
    });

    // ── 7. Return verification result ───────────────────────────────────
    const valid = signatureValid && notExpired && notRevoked;

    return NextResponse.json({
      valid,
      stamp: {
        stampId: stamp.stampId,
        domain: stamp.domain,
        tier: stamp.tier,
        score: stamp.score,
        grade: stamp.grade,
        status: stamp.status,
        issuedAt: stamp.issuedAt,
        expiresAt: stamp.expiresAt,
        frameworks: JSON.parse(stamp.frameworks),
        complianceScores: JSON.parse(stamp.complianceScores),
        findingsSummary: JSON.parse(stamp.findingsSummary),
        verifiedCount: stamp.verifiedCount + 1,
        embedViews: stamp.embedViews,
      },
      verification: {
        signatureValid,
        notExpired,
        notRevoked,
        verifiedAt: verifiedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Genesis Stamp verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
