import { extractClientIP } from '@/lib/api-protection';
// ═══════════════════════════════════════════════════════════════════════
// Echo-Sign Active API — /api/broadcast/active
// GET → currently active (non-expired) broadcasts
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getActiveBroadcasts, seedDemoBroadcasts } from '@/lib/broadcast-engine';
import { checkRateLimit } from '@/lib/api-security';


seedDemoBroadcasts();

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const active = getActiveBroadcasts();
  return NextResponse.json({
    ok: true,
    count: active.length,
    broadcasts: active,
  });
}
