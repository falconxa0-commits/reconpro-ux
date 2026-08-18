import { withProtection } from '@/lib/api-protection';
// ═══════════════════════════════════════════════════════════════════════
// Echo-Sign Active API — /api/broadcast/active
// GET → currently active (non-expired) broadcasts
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getActiveBroadcasts, seedDemoBroadcasts } from '@/lib/broadcast-engine';


seedDemoBroadcasts();

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  const active = getActiveBroadcasts();
  return NextResponse.json({
    ok: true,
    count: active.length,
    broadcasts: active,
  });
}
