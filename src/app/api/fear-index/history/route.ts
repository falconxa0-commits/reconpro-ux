import { NextRequest, NextResponse } from 'next/server';
import { generateHistoricalData } from '@/lib/fear-index-engine';
import { checkRateLimit } from '@/lib/api-security';


// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index API — Historical Trend
// GET /api/fear-index/history?days=90
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') || '90', 10)));

  const history = generateHistoricalData(days);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    days: history.length,
    data: history,
  });
}
