import { NextRequest, NextResponse } from 'next/server';
import { calculateDoomClock, type TLSAssetInput, type DoomClockResult } from '@/lib/quantum-doom-engine';

// ═══════════════════════════════════════════════════════════════════════
// POST /api/doom-clock — Run doom clock analysis
// Body: { domain, companyName?, industry?, tlsData? }
// ═══════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, companyName, industry, tlsData } = body as {
      domain?: string;
      companyName?: string;
      industry?: string;
      tlsData?: TLSAssetInput[];
    };

    if (!domain && (!tlsData || tlsData.length === 0)) {
      return NextResponse.json(
        { error: 'domain or tlsData is required' },
        { status: 400 }
      );
    }

    const validIndustries = [
      'finance', 'healthcare', 'technology', 'government',
      'retail', 'energy', 'telecom', 'education',
    ];
    const validatedIndustry = industry && validIndustries.includes(industry)
      ? industry
      : undefined;

    const result = calculateDoomClock({
      tlsData,
      domain,
      companyName,
      industry: validatedIndustry,
    });

    return NextResponse.json(
      {
        doomClock: serializeDoomClock(result),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[doom-clock] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET /api/doom-clock?domain=xxx — Get doom clock analysis
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const companyName = searchParams.get('companyName');
    const industry = searchParams.get('industry');

    if (!domain) {
      return NextResponse.json(
        { error: 'domain query parameter is required' },
        { status: 400 }
      );
    }

    const validIndustries = [
      'finance', 'healthcare', 'technology', 'government',
      'retail', 'energy', 'telecom', 'education',
    ];
    const validatedIndustry = industry && validIndustries.includes(industry)
      ? industry
      : undefined;

    const result = calculateDoomClock({
      domain,
      companyName: companyName || undefined,
      industry: validatedIndustry,
    });

    return NextResponse.json({ doomClock: serializeDoomClock(result) });
  } catch (error) {
    console.error('[doom-clock] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── Serializer ────────────────────────────────────────────────────────

function serializeDoomClock(result: DoomClockResult) {
  return {
    ...result,
    overallDoomDate: result.overallDoomDate.toISOString(),
    calculatedAt: result.calculatedAt.toISOString(),
    assets: result.assets.map(a => ({
      ...a,
      doomDate: a.doomDate.toISOString(),
    })),
  };
}
