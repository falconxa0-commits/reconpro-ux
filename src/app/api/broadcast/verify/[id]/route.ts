// ═══════════════════════════════════════════════════════════════════════
// Echo-Sign Verify API — /api/broadcast/verify/[id]
// GET → verify a specific broadcast's Ed25519 signature
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getAllBroadcasts, verifyBroadcast, seedDemoBroadcasts, type BroadcastMessage } from '@/lib/broadcast-engine';

seedDemoBroadcasts();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const broadcasts: BroadcastMessage[] = getAllBroadcasts();
  const broadcast = broadcasts.find((b) => b.id === id);

  if (!broadcast) {
    return NextResponse.json(
      { ok: false, error: `Broadcast ${id} not found` },
      { status: 404 }
    );
  }

  const isValid = verifyBroadcast(broadcast);
  const isExpired = new Date(broadcast.expiresAt) < new Date();

  return NextResponse.json({
    ok: true,
    id: broadcast.id,
    verified: isValid,
    expired: isExpired,
    broadcast: {
      id: broadcast.id,
      priority: broadcast.priority,
      title: broadcast.title,
      body: broadcast.body,
      channel: broadcast.channel,
      issuedBy: broadcast.issuedBy,
      issuedAt: broadcast.issuedAt,
      expiresAt: broadcast.expiresAt,
      publicKey: broadcast.publicKey,
      signature: broadcast.signature,
      targetScope: broadcast.targetScope,
    },
  });
}
