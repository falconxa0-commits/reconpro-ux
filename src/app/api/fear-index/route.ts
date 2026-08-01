import { NextResponse } from 'next/server';
import { calculateFearIndex } from '@/lib/fear-index-engine';

// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index API — Current Index
// GET /api/fear-index
// ═══════════════════════════════════════════════════════════════════════

export async function GET() {
  const current = calculateFearIndex();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ...current,
  });
}
