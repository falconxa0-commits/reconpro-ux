// STATUS: SIMULATED — Fear index value is generated from a seeded PRNG, not derived from real threat intelligence
import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { calculateFearIndex } from '@/lib/fear-index-engine';


// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index API — Current Index
// GET /api/fear-index
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  const current = calculateFearIndex();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ...current,
    simulated: true,
  });
}
