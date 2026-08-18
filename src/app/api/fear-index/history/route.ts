// STATUS: SIMULATED — Historical trend data is PRNG-generated, not from real historical threat data
import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { generateHistoricalData } from '@/lib/fear-index-engine';


// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index API — Historical Trend
// GET /api/fear-index/history?days=90
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') || '90', 10)));

  const history = generateHistoricalData(days);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    days: history.length,
    data: history,
    simulated: true,
  });
}
