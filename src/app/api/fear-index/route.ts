import { NextRequest, NextResponse } from 'next/server';
import { calculateFearIndex } from '@/lib/fear-index-engine';
import { checkRateLimit } from '@/lib/api-security';


// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index API — Current Index
// GET /api/fear-index
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const current = calculateFearIndex();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ...current,
  });
}
