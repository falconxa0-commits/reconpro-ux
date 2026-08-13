import { extractClientIP } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { calculateFearIndex, buildRssFeed } from '@/lib/fear-index-engine';
import { checkRateLimit } from '@/lib/api-security';


// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index API — RSS Feed
// GET /api/fear-index/feed
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const current = calculateFearIndex();
  const xml = buildRssFeed(current);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
