import { extractClientIP } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { calculateFearIndex } from '@/lib/fear-index-engine';
import { checkRateLimit } from '@/lib/api-security';


// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index API — Current Index
// GET /api/fear-index
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const current = calculateFearIndex();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ...current,
  });
}
