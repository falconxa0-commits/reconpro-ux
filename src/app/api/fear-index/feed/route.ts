import { NextResponse } from 'next/server';
import { calculateFearIndex, buildRssFeed } from '@/lib/fear-index-engine';

// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index API — RSS Feed
// GET /api/fear-index/feed
// ═══════════════════════════════════════════════════════════════════════

export async function GET() {
  const current = calculateFearIndex();
  const xml = buildRssFeed(current);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
