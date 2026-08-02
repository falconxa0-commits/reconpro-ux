// ═══════════════════════════════════════════════════════════════════════
// Echo-Sign Active API — /api/broadcast/active
// GET → currently active (non-expired) broadcasts
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { getActiveBroadcasts, seedDemoBroadcasts } from '@/lib/broadcast-engine';

seedDemoBroadcasts();

export async function GET() {
  const active = getActiveBroadcasts();
  return NextResponse.json({
    ok: true,
    count: active.length,
    broadcasts: active,
  });
}
