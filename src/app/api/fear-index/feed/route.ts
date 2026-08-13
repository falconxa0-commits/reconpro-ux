// STATUS: SIMULATED — RSS feed is generated from fabricated threat data, not from real security incidents
import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { calculateFearIndex, buildRssFeed } from '@/lib/fear-index-engine';


// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index API — RSS Feed
// GET /api/fear-index/feed
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  const current = calculateFearIndex();
  const xml = buildRssFeed(current);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Simulated': 'true',
    },
  });
}
