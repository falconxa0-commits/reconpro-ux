import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════
// POST /api/genesis/revoke — Revoke a Genesis Stamp
// ═══════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stampId, reason } = body as {
      stampId?: string;
      reason?: string;
    };

    if (!stampId) {
      return NextResponse.json(
        { error: 'stampId is required' },
        { status: 400 }
      );
    }

    // ── 1. Look up the stamp ─────────────────────────────────────────────
    const stamp = await db.genesisStamp.findUnique({
      where: { stampId },
    });

    if (!stamp) {
      return NextResponse.json(
        { error: 'Stamp not found' },
        { status: 404 }
      );
    }

    if (stamp.status === 'revoked') {
      return NextResponse.json(
        { error: 'Stamp is already revoked' },
        { status: 409 }
      );
    }

    // ── 2. Revoke ────────────────────────────────────────────────────────
    const revokedAt = new Date();
    const updated = await db.genesisStamp.update({
      where: { id: stamp.id },
      data: {
        status: 'revoked',
        revokedAt,
        revokeReason: reason ?? 'No reason provided',
      },
    });

    // ── 3. Audit trail ───────────────────────────────────────────────────
    await db.genesisAuditTrail.create({
      data: {
        stampId: stamp.id,
        action: 'revoked',
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
        details: JSON.stringify({ reason: reason ?? 'No reason provided' }),
      },
    });

    return NextResponse.json({
      stamp: {
        stampId: updated.stampId,
        domain: updated.domain,
        status: updated.status,
        revokedAt: updated.revokedAt,
        revokeReason: updated.revokeReason,
      },
    });
  } catch (error) {
    console.error('Genesis Stamp revoke error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke Genesis Stamp' },
      { status: 500 }
    );
  }
}
