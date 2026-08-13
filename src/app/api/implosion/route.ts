import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  runImplosionSimulation,
  generateNarrative,
  compareWithIndustry,
  type IndustryKey,
  type SeverityPresetKey,
  type ScanFinding,
} from '@/lib/implosion-engine';
import { checkRateLimit } from '@/lib/api-security';

// ═══════════════════════════════════════════════════════════════════════
// POST /api/implosion — Run a simulation & persist it
// ═══════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json();
    const {
      industry,
      companyName,
      annualRevenue,
      employeeCount,
      customerCount,
      severityPreset,
      scanId,
      organizationId,
      domain,
      customFactors,
    } = body as {
      industry?: string;
      companyName?: string;
      annualRevenue?: number;
      employeeCount?: number;
      customerCount?: number;
      severityPreset?: string;
      scanId?: string;
      organizationId?: string;
      domain?: string;
      customFactors?: Record<string, number>;
    };

    if (!industry) {
      return NextResponse.json(
        { error: 'industry is required' },
        { status: 400 }
      );
    }

    const validIndustries: string[] = [
      'healthcare', 'finance', 'technology', 'retail', 'government', 'education',
    ];
    if (!validIndustries.includes(industry)) {
      return NextResponse.json(
        { error: `industry must be one of: ${validIndustries.join(', ')}` },
        { status: 400 }
      );
    }

    // ── 1. If scanId provided, fetch real findings to adjust sim ──────
    let scanFindings: ScanFinding[] | undefined;

    if (scanId) {
      const findings = await db.finding.findMany({
        where: { scanId },
        select: { severity: true, category: true },
      });

      if (findings.length > 0) {
        scanFindings = findings.map((f) => ({
          severity: f.severity as ScanFinding['severity'],
          category: f.category,
        }));
      }
    }

    // ── 2. Build simulation params ──────────────────────────────────
    const params = {
      industry: industry as IndustryKey,
      companyName: companyName || undefined,
      annualRevenue: annualRevenue ?? undefined,
      employeeCount: employeeCount ?? undefined,
      customerCount: customerCount ?? undefined,
      severityPreset: (severityPreset as SeverityPresetKey) ?? 'moderate',
      scanFindings,
      customFactors: customFactors
        ? {
            costMultiplier: customFactors.costMultiplier,
            downtimeMultiplier: customFactors.downtimeMultiplier,
            churnMultiplier: customFactors.churnMultiplier,
            stockMultiplier: customFactors.stockMultiplier,
            insuranceMultiplier: customFactors.insuranceMultiplier,
          }
        : undefined,
    };

    // ── 3. Run simulation ───────────────────────────────────────────
    const result = runImplosionSimulation(params);
    const narrative = generateNarrative(result, params);
    result.narrative = narrative;

    const comparison = compareWithIndustry(
      result,
      industry as IndustryKey
    );

    // ── 4. Persist to DB ────────────────────────────────────────────
    const scenario = await db.implosionScenario.create({
      data: {
        organizationId: organizationId ?? null,
        domain: domain ?? null,
        scanId: scanId ?? null,
        industry: industry as IndustryKey,
        companyName: companyName ?? null,
        annualRevenue: annualRevenue ?? null,
        employeeCount: employeeCount ?? null,
        customerCount: customerCount ?? null,
        dataBreachCost: result.dataBreachCost,
        regulatoryFines: result.regulatoryFines,
        reputationalDamage: result.reputationalDamage,
        operationalDowntime: result.operationalDowntime,
        customerChurnRate: result.customerChurnRate,
        stockImpactPct: result.stockImpactPct,
        insurancePremiumIncrease: result.insurancePremiumIncrease,
        scenarioName: severityPreset
          ? `${severityPreset.charAt(0).toUpperCase() + severityPreset.slice(1)} Breach Simulation`
          : 'Full Breach Simulation',
        severityPreset: (severityPreset as SeverityPresetKey) ?? 'moderate',
        customFactors: customFactors
          ? JSON.stringify(customFactors)
          : undefined,
      },
    });

    // ── 5. Return full result ───────────────────────────────────────
    return NextResponse.json(
      {
        scenario: {
          id: scenario.id,
          createdAt: scenario.createdAt,
          scenarioName: scenario.scenarioName,
          severityPreset: scenario.severityPreset,
          industry: scenario.industry,
          companyName: scenario.companyName,
        },
        result,
        comparison,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Implosion simulation error:', error);
    return NextResponse.json(
      { error: 'Failed to run implosion simulation' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET /api/implosion — List saved scenarios
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const domain = searchParams.get('domain');

    if (!organizationId && !domain) {
      return NextResponse.json(
        { error: 'organizationId or domain query param is required' },
        { status: 400 }
      );
    }

    const scenarios = await db.implosionScenario.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(domain ? { domain } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error('Implosion list error:', error);
    return NextResponse.json(
      { error: 'Failed to list implosion scenarios' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DELETE /api/implosion?id=xxx — Delete a saved scenario
// ═══════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id query param is required' },
        { status: 400 }
      );
    }

    // Verify the scenario exists before deleting
    const existing = await db.implosionScenario.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    await db.implosionScenario.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error('Implosion delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete implosion scenario' },
      { status: 500 }
    );
  }
}
