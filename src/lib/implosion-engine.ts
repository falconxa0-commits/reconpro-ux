// ═══════════════════════════════════════════════════════════════════════
// Proof-of-Implosion Engine — Executive Risk Simulator
// Financial impact modeling engine. This is the brain that makes
// C-suite people sign contracts.
// ═══════════════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────────────

export type IndustryKey =
  | 'healthcare'
  | 'finance'
  | 'technology'
  | 'retail'
  | 'government'
  | 'education';

export type SeverityPresetKey =
  | 'minimal'
  | 'moderate'
  | 'severe'
  | 'catastrophic';

export type RegulatoryKey = 'gdpr' | 'hipaa' | 'pci_dss' | 'sox';

export interface ScanFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
}

export interface SimulationParams {
  industry: IndustryKey;
  companyName?: string;
  annualRevenue?: number; // millions USD
  employeeCount?: number;
  customerCount?: number;
  severityPreset?: SeverityPresetKey;
  scanFindings?: ScanFinding[];
  customFactors?: Partial<SeverityPreset>;
}

export interface SeverityPreset {
  costMultiplier: number;
  downtimeMultiplier: number;
  churnMultiplier: number;
  stockMultiplier: number;
  insuranceMultiplier: number;
  description: string;
}

export interface IndustryCostProfile {
  avgBreachCost: number; // millions
  perRecordCost: number; // millions per record
  avgDowntimeHours: number;
  avgTimeToIdentify: number; // days
  avgTimeToContain: number; // days
  regulatoryExposure: 'critical' | 'high' | 'moderate' | 'low';
}

export interface RegulatoryFine {
  maxFine: number;
  description: string;
  perViolation?: number;
  perViolationMonthly?: { min: number; max: number };
}

export interface FineBreakdown {
  gdpr?: number;
  hipaa?: number;
  pci_dss?: number;
  sox?: number;
}

export interface ScanBasedAdjustments {
  vulnerabilityMultiplier: number;
  findingsUsed: number;
  criticalCount: number;
  highCount: number;
}

export interface SimulationResult {
  // Direct costs
  dataBreachCost: number;
  detectionCost: number;
  containmentCost: number;
  lostBusinessCost: number;
  postBreachCost: number;

  // Regulatory
  regulatoryFines: number;
  fineBreakdown: FineBreakdown;

  // Reputational
  reputationalDamage: number;
  customerChurnRate: number;
  estimatedCustomersLost: number;
  stockImpactPct: number;
  estimatedMarketCapLoss: number;

  // Operational
  operationalDowntime: number;
  revenuePerHour: number;
  downtimeRevenueLoss: number;

  // Insurance
  insurancePremiumIncrease: number;
  currentAnnualPremium: number;
  newAnnualPremium: number;

  // Scan-based adjustments (if scanFindings provided)
  scanBasedAdjustments?: ScanBasedAdjustments;

  // Narrative
  narrative: string[];
  totalEstimatedImpact: number;
  recoveryTimeline: string;
}

export interface IndustryComparison {
  industry: string;
  companyTotal: number;
  industryAvg: number;
  delta: number;
  deltaPct: number;
  percentiles: {
    cost: number;
    downtime: number;
    churn: number;
  };
}

// ── Industry Breach Cost Database (IBM Cost of Data Breach 2024) ─────

export const INDUSTRY_COSTS: Record<IndustryKey, IndustryCostProfile> = {
  healthcare: {
    avgBreachCost: 10.93,
    perRecordCost: 0.429,
    avgDowntimeHours: 287,
    avgTimeToIdentify: 231,
    avgTimeToContain: 276,
    regulatoryExposure: 'critical',
  },
  finance: {
    avgBreachCost: 5.90,
    perRecordCost: 0.183,
    avgDowntimeHours: 168,
    avgTimeToIdentify: 177,
    avgTimeToContain: 197,
    regulatoryExposure: 'high',
  },
  technology: {
    avgBreachCost: 4.88,
    perRecordCost: 0.164,
    avgDowntimeHours: 198,
    avgTimeToIdentify: 199,
    avgTimeToContain: 201,
    regulatoryExposure: 'moderate',
  },
  retail: {
    avgBreachCost: 3.28,
    perRecordCost: 0.133,
    avgDowntimeHours: 142,
    avgTimeToIdentify: 167,
    avgTimeToContain: 178,
    regulatoryExposure: 'moderate',
  },
  government: {
    avgBreachCost: 4.72,
    perRecordCost: 0.156,
    avgDowntimeHours: 220,
    avgTimeToIdentify: 210,
    avgTimeToContain: 245,
    regulatoryExposure: 'high',
  },
  education: {
    avgBreachCost: 3.65,
    perRecordCost: 0.142,
    avgDowntimeHours: 155,
    avgTimeToIdentify: 185,
    avgTimeToContain: 192,
    regulatoryExposure: 'moderate',
  },
};

// ── Regulatory Fine Calculator Database ──────────────────────────────

export const REGULATORY_FINES: Record<RegulatoryKey, RegulatoryFine> = {
  gdpr: {
    maxFine: 0.04,
    description: 'Up to 4% of global annual revenue',
  },
  hipaa: {
    maxFine: 1.5,
    description: '$1.5M per violation category per year',
    perViolation: 1.5,
  },
  pci_dss: {
    maxFine: 0.1,
    description: '$5K-100K/month until compliance',
    perViolationMonthly: { min: 0.005, max: 0.1 },
  },
  sox: {
    maxFine: 5.0,
    description: 'Up to $5M in fines + 20yr imprisonment',
    perViolation: 5.0,
  },
};

// ── Severity Presets ─────────────────────────────────────────────────

export const SEVERITY_PRESETS: Record<SeverityPresetKey, SeverityPreset> = {
  minimal: {
    costMultiplier: 0.2,
    downtimeMultiplier: 0.3,
    churnMultiplier: 0.5,
    stockMultiplier: 0.3,
    insuranceMultiplier: 1.1,
    description: 'Limited data exposure, quick containment',
  },
  moderate: {
    costMultiplier: 1.0,
    downtimeMultiplier: 1.0,
    churnMultiplier: 1.0,
    stockMultiplier: 1.0,
    insuranceMultiplier: 1.5,
    description: 'Standard breach scenario',
  },
  severe: {
    costMultiplier: 2.5,
    downtimeMultiplier: 2.0,
    churnMultiplier: 2.5,
    stockMultiplier: 2.0,
    insuranceMultiplier: 2.5,
    description:
      'Major breach with widespread data exfiltration',
  },
  catastrophic: {
    costMultiplier: 5.0,
    downtimeMultiplier: 4.0,
    churnMultiplier: 5.0,
    stockMultiplier: 4.0,
    insuranceMultiplier: 4.0,
    description: 'Existential threat — complete system compromise',
  },
};

// ── Industry → Applicable Regulations Mapping ────────────────────────

// Education modeled under GDPR + HIPAA (FERPA uses HIPAA-like penalty structure)
const INDUSTRY_REGULATIONS: Record<IndustryKey, RegulatoryKey[]> = {
  healthcare: ['hipaa', 'gdpr'],
  finance: ['sox', 'gdpr', 'pci_dss'],
  technology: ['gdpr', 'pci_dss'],
  retail: ['pci_dss', 'gdpr'],
  government: ['sox', 'gdpr'],
  education: ['gdpr', 'hipaa'],
};

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Compute a scan-based vulnerability multiplier from real findings.
 * More critical/high findings = higher impact.
 */
function computeScanMultiplier(
  findings: ScanFinding[]
): ScanBasedAdjustments {
  if (!findings || findings.length === 0) {
    return {
      vulnerabilityMultiplier: 1.0,
      findingsUsed: 0,
      criticalCount: 0,
      highCount: 0,
    };
  }

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const f of findings) {
    switch (f.severity) {
      case 'critical':
        criticalCount++;
        break;
      case 'high':
        highCount++;
        break;
      case 'medium':
        mediumCount++;
        break;
      case 'low':
      case 'info':
        lowCount++;
        break;
    }
  }

  // Base multiplier starts at 1.0. Each critical adds 0.35, high adds 0.15,
  // medium adds 0.05. Cap at 4.0x.
  const rawMultiplier =
    1.0 + criticalCount * 0.35 + highCount * 0.15 + mediumCount * 0.05;
  const vulnerabilityMultiplier = Math.min(4.0, rawMultiplier);

  return {
    vulnerabilityMultiplier,
    findingsUsed: findings.length,
    criticalCount,
    highCount,
  };
}

/**
 * Calculate regulatory fines for a given industry and revenue.
 */
function calculateRegulatoryFines(
  industry: IndustryKey,
  annualRevenue: number, // millions
  severityMultiplier: number
): { total: number; breakdown: FineBreakdown } {
  const regulations = INDUSTRY_REGULATIONS[industry] ?? ['gdpr'];

  const breakdown: FineBreakdown = {};
  let total = 0;

  for (const reg of regulations) {
    const fine = REGULATORY_FINES[reg];
    if (!fine) continue;

    let fineAmount = 0;

    if (reg === 'gdpr') {
      // 4% of global annual revenue, scaled by severity (use 40-80% of max)
      const severityFraction = 0.4 + severityMultiplier * 0.1;
      fineAmount = annualRevenue * fine.maxFine * Math.min(severityFraction, 0.8);
    } else if (reg === 'hipaa') {
      // $1.5M per violation category per year. Assume 2-4 categories.
      const violationCategories = Math.ceil(2 + severityMultiplier);
      fineAmount = (fine.perViolation ?? 1.5) * violationCategories;
    } else if (reg === 'pci_dss') {
      // $5K-100K/month until compliance. Assume 6-18 months.
      const months = Math.ceil(6 + severityMultiplier * 3);
      const monthlyRange = fine.perViolationMonthly ?? { min: 0.005, max: 0.1 };
      const monthlyFine =
        (monthlyRange.min + monthlyRange.max) / 2 * severityMultiplier;
      fineAmount = monthlyFine * months;
    } else if (reg === 'sox') {
      // Up to $5M. Scale by severity.
      fineAmount = (fine.perViolation ?? 5.0) * Math.min(severityMultiplier * 0.5, 1.0);
    }

    fineAmount = Math.round(fineAmount * 100) / 100;
    breakdown[reg] = fineAmount;
    total += fineAmount;
  }

  return { total: Math.round(total * 100) / 100, breakdown };
}

/**
 * Estimate current cyber insurance premium based on revenue and industry.
 */
function estimateInsurancePremium(
  annualRevenue: number, // millions
  industry: IndustryKey
): number {
  // Cyber insurance typically costs 0.1% - 0.3% of revenue
  // Healthcare and finance are on the higher end
  const baseRates: Record<IndustryKey, number> = {
    healthcare: 0.0028,
    finance: 0.0025,
    technology: 0.0020,
    retail: 0.0015,
    government: 0.0022,
    education: 0.0012,
  };

  const rate = baseRates[industry] ?? 0.002;
  // Premium in millions
  return annualRevenue * rate;
}

/**
 * Determine recovery timeline based on severity and downtime.
 */
function determineRecoveryTimeline(
  severity: SeverityPresetKey,
  downtimeHours: number
): string {
  if (severity === 'minimal') {
    if (downtimeHours < 50) return '1-3 months';
    return '3-6 months';
  }
  if (severity === 'moderate') {
    if (downtimeHours < 200) return '6-12 months';
    return '9-15 months';
  }
  if (severity === 'severe') {
    return '12-24 months';
  }
  // catastrophic
  return '2-5 years';
}

// ── Main Simulation Function ─────────────────────────────────────────

/**
 * Run a full Proof-of-Implosion financial impact simulation.
 *
 * This is the core engine that transforms abstract security findings
 * into concrete dollar figures that boardrooms understand.
 */
export function runImplosionSimulation(
  params: SimulationParams
): SimulationResult {
  const {
    industry,
    companyName = 'the organization',
    annualRevenue = 100, // default $100M
    employeeCount = 500,
    customerCount = 10000,
    severityPreset = 'moderate',
    scanFindings,
    customFactors,
  } = params;

  // ── 1. Resolve multipliers ──────────────────────────────────────────
  const basePreset = SEVERITY_PRESETS[severityPreset] ?? SEVERITY_PRESETS.moderate;

  // Merge custom factors over the preset
  const preset: SeverityPreset = {
    costMultiplier: customFactors?.costMultiplier ?? basePreset.costMultiplier,
    downtimeMultiplier:
      customFactors?.downtimeMultiplier ?? basePreset.downtimeMultiplier,
    churnMultiplier:
      customFactors?.churnMultiplier ?? basePreset.churnMultiplier,
    stockMultiplier:
      customFactors?.stockMultiplier ?? basePreset.stockMultiplier,
    insuranceMultiplier:
      customFactors?.insuranceMultiplier ?? basePreset.insuranceMultiplier,
    description: basePreset.description,
  };

  // ── 2. Scan-based vulnerability adjustment ─────────────────────────
  const scanAdj = scanFindings
    ? computeScanMultiplier(scanFindings)
    : undefined;

  const vulnMultiplier = scanAdj?.vulnerabilityMultiplier ?? 1.0;

  // ── 3. Industry cost profile ────────────────────────────────────────
  const profile = INDUSTRY_COSTS[industry] ?? INDUSTRY_COSTS.technology;

  // ── 4. Direct breach cost breakdown ────────────────────────────────
  // IBM cost structure: ~33% detection, ~28% escalation/containment,
  // ~35% lost business, ~4% post-breach
  const baseCost = profile.avgBreachCost;
  const scaledBaseCost = baseCost * preset.costMultiplier * vulnMultiplier;

  const detectionCost =
    Math.round(scaledBaseCost * 0.33 * 100) / 100;
  const containmentCost =
    Math.round(scaledBaseCost * 0.28 * 100) / 100;
  const lostBusinessCost =
    Math.round(scaledBaseCost * 0.35 * 100) / 100;
  const postBreachCost =
    Math.round(scaledBaseCost * 0.04 * 100) / 100;
  const dataBreachCost =
    Math.round(
      (detectionCost + containmentCost + lostBusinessCost + postBreachCost) *
        100
    ) / 100;

  // ── 5. Regulatory fines ─────────────────────────────────────────────
  const { total: regulatoryFines, breakdown: fineBreakdown } =
    calculateRegulatoryFines(industry, annualRevenue, preset.costMultiplier);

  // ── 6. Reputational damage ──────────────────────────────────────────
  // Reputational cost: typically 10-25% of annual revenue for severe breaches
  // Scaled by churn and stock multipliers
  const reputationalBase = annualRevenue * 0.15;
  const reputationalDamage =
    Math.round(
      reputationalBase *
        preset.churnMultiplier *
        preset.stockMultiplier *
        0.5 *
        vulnMultiplier *
        100
    ) / 100;

  // Customer churn rate: industry baseline + severity
  const baseChurnRates: Record<IndustryKey, number> = {
    healthcare: 3.4,
    finance: 4.2,
    technology: 3.8,
    retail: 5.1,
    government: 1.5,
    education: 2.1,
  };
  const customerChurnRate =
    Math.round(
      (baseChurnRates[industry] ?? 3.0) * preset.churnMultiplier * 10
    ) / 10;
  const estimatedCustomersLost = Math.round(
    (customerCount * customerChurnRate) / 100
  );

  // Stock impact: average 3-7% drop for public companies
  const baseStockImpact: Record<IndustryKey, number> = {
    healthcare: 4.8,
    finance: 5.2,
    technology: 6.1,
    retail: 4.5,
    government: 0, // not publicly traded
    education: 0,
  };
  const stockImpactPct =
    Math.round(
      (baseStockImpact[industry] ?? 3.0) * preset.stockMultiplier * 10
    ) / 10;

  // Estimated market cap loss (assume P/E ratio of ~20 for public cos)
  const estimatedMarketCapLoss =
    stockImpactPct > 0
      ? Math.round(annualRevenue * 20 * (stockImpactPct / 100) * 100) / 100
      : 0;

  // ── 7. Operational downtime ─────────────────────────────────────────
  const operationalDowntime = Math.round(
    profile.avgDowntimeHours * preset.downtimeMultiplier * vulnMultiplier
  );

  // Revenue per hour (annual revenue in millions / working hours in a year)
  // Assume 2000 working hours/year
  const revenuePerHour =
    Math.round((annualRevenue / 2000) * 10000) / 10000; // in millions
  const downtimeRevenueLoss =
    Math.round(operationalDowntime * revenuePerHour * 100) / 100;

  // ── 8. Insurance impact ─────────────────────────────────────────────
  const currentAnnualPremium = estimateInsurancePremium(annualRevenue, industry);
  const insurancePremiumIncrease =
    Math.round(
      ((preset.insuranceMultiplier - 1) * 100 + (vulnMultiplier - 1) * 50) * 10
    ) / 10;
  const newAnnualPremium =
    Math.round(
      currentAnnualPremium *
        (1 + insurancePremiumIncrease / 100) *
        10000
    ) / 10000;

  // ── 9. Total impact ────────────────────────────────────────────────
  const totalEstimatedImpact =
    Math.round(
      (dataBreachCost +
        regulatoryFines +
        reputationalDamage +
        downtimeRevenueLoss +
        estimatedMarketCapLoss) *
        100
    ) / 100;

  // ── 10. Recovery timeline ──────────────────────────────────────────
  const recoveryTimeline = determineRecoveryTimeline(
    severityPreset,
    operationalDowntime
  );

  // ── 11. Build result ───────────────────────────────────────────────
  const result: SimulationResult = {
    dataBreachCost,
    detectionCost,
    containmentCost,
    lostBusinessCost,
    postBreachCost,
    regulatoryFines,
    fineBreakdown,
    reputationalDamage,
    customerChurnRate,
    estimatedCustomersLost,
    stockImpactPct,
    estimatedMarketCapLoss,
    operationalDowntime,
    revenuePerHour,
    downtimeRevenueLoss,
    insurancePremiumIncrease,
    currentAnnualPremium,
    newAnnualPremium,
    narrative: [], // filled by generateNarrative
    totalEstimatedImpact,
    recoveryTimeline,
  };

  if (scanAdj) {
    result.scanBasedAdjustments = scanAdj;
  }

  return result;
}

// ── Narrative Generator ───────────────────────────────────────────────

/**
 * Generate an executive threat brief narrative from simulation results.
 * Returns 5-8 hard-hitting bullet points describing the destruction
 * in business terms.
 */
export function generateNarrative(
  result: SimulationResult,
  params: SimulationParams
): string[] {
  const {
    industry,
    companyName = 'the organization',
    annualRevenue = 100,
    severityPreset = 'moderate',
    scanFindings,
  } = params;

  const lines: string[] = [];
  const preset =
    SEVERITY_PRESETS[severityPreset] ?? SEVERITY_PRESETS.moderate;

  // 1. Opening — total cost with drama
  lines.push(
    `A breach of this magnitude would cost approximately $${result.totalEstimatedImpact.toFixed(2)}M in total impact, representing ${((result.totalEstimatedImpact / annualRevenue) * 100).toFixed(1)}% of ${companyName}'s annual revenue.`
  );

  // 2. Direct costs breakdown
  lines.push(
    `Direct breach costs alone are estimated at $${result.dataBreachCost.toFixed(2)}M — $${result.detectionCost.toFixed(2)}M in detection, $${result.containmentCost.toFixed(2)}M in containment, and $${result.lostBusinessCost.toFixed(2)}M in lost business.`
  );

  // 3. Regulatory fines
  const regEntries = Object.entries(result.fineBreakdown).filter(
    ([, v]) => v > 0
  );
  if (regEntries.length > 0) {
    const regNames: Record<string, string> = {
      gdpr: 'GDPR',
      hipaa: 'HIPAA',
      pci_dss: 'PCI DSS',
      sox: 'SOX',
    };
    const regList = regEntries
      .map(([k, v]) => `${regNames[k] ?? k} ($${v.toFixed(2)}M)`)
      .join(', ');
    lines.push(
      `Based on the ${industry} industry's regulatory exposure, fines could reach $${result.regulatoryFines.toFixed(2)}M across ${regEntries.length} framework(s): ${regList}.`
    );
  }

  // 4. Customer churn
  if (result.estimatedCustomersLost > 0) {
    lines.push(
      `Customer churn is projected at ${result.customerChurnRate}%, representing approximately ${result.estimatedCustomersLost.toLocaleString()} lost customers — with an average customer acquisition cost of $${((annualRevenue / (params.customerCount ?? 10000)) * 5).toFixed(0)}, replacement costs alone could exceed $${(result.estimatedCustomersLost * (annualRevenue / (params.customerCount ?? 10000)) * 5 / 1000000).toFixed(2)}M.`
    );
  }

  // 5. Stock impact
  if (result.stockImpactPct > 0) {
    lines.push(
      `Public market impact: an estimated ${result.stockImpactPct}% stock price decline would erase approximately $${result.estimatedMarketCapLoss.toFixed(2)}M in market capitalization.`
    );
  }

  // 6. Downtime
  lines.push(
    `Operational downtime of ${result.operationalDowntime.toLocaleString()} hours at $${result.revenuePerHour.toFixed(4)}M/hour translates to $${result.downtimeRevenueLoss.toFixed(2)}M in lost revenue during the incident.`
  );

  // 7. Insurance
  lines.push(
    `Cyber insurance premiums would increase by ${result.insurancePremiumIncrease}%, raising annual premiums from $${(result.currentAnnualPremium * 1000).toFixed(0)}K to $${(result.newAnnualPremium * 1000).toFixed(0)}K — and coverage may still be denied if negligence is found.`
  );

  // 8. Scan-based findings (if applicable)
  if (result.scanBasedAdjustments && scanFindings && scanFindings.length > 0) {
    const adj = result.scanBasedAdjustments;
    lines.push(
      `Based on ${adj.findingsUsed} actual scan findings (${adj.criticalCount} critical, ${adj.highCount} high), the vulnerability multiplier is ${adj.vulnerabilityMultiplier.toFixed(1)}x — meaning this is not hypothetical, these are live attack surfaces right now.`
    );
  }

  // 9. Recovery
  lines.push(
    `Full recovery is estimated at ${result.recoveryTimeline}, during which competitive advantage erodes, talent is lost, and customer trust may never fully return.`
  );

  return lines;
}

// ── Industry Comparison ───────────────────────────────────────────────

/**
 * Compare simulation results against industry averages.
 * Returns how the company's projected costs compare to typical breaches.
 */
export function compareWithIndustry(
  result: SimulationResult,
  industry: IndustryKey
): IndustryComparison {
  const profile = INDUSTRY_COSTS[industry] ?? INDUSTRY_COSTS.technology;

  const companyTotal = result.totalEstimatedImpact;
  const industryAvg = profile.avgBreachCost * 2.2; // avg total impact is ~2.2x direct cost

  const delta = companyTotal - industryAvg;
  const deltaPct =
    industryAvg > 0 ? Math.round((delta / industryAvg) * 1000) / 10 : 0;

  // Percentile estimates (how bad is this compared to industry peers)
  // Based on the ratio of company impact vs industry average
  const ratio = companyTotal / industryAvg;

  const costPercentile = Math.min(99, Math.max(1, Math.round(ratio * 35)));
  const downtimePercentile = Math.min(
    99,
    Math.max(
      1,
      Math.round(
        (result.operationalDowntime / profile.avgDowntimeHours) * 35
      )
    )
  );
  const churnPercentile = Math.min(
    99,
    Math.max(
      1,
      Math.round(
        (result.customerChurnRate / 4.0) * 35 + 15
      )
    )
  );

  return {
    industry,
    companyTotal: Math.round(companyTotal * 100) / 100,
    industryAvg: Math.round(industryAvg * 100) / 100,
    delta: Math.round(delta * 100) / 100,
    deltaPct,
    percentiles: {
      cost: costPercentile,
      downtime: downtimePercentile,
      churn: churnPercentile,
    },
  };
}
