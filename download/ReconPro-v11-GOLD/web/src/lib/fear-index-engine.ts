// ═══════════════════════════════════════════════════════════════════════
// CISO Fear Index Engine
// "Security Weather Report" for the internet.
// Global risk score aggregation from 5 weighted threat components.
// ═══════════════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────────────

export type FearLevel = 'CALM' | 'ELEVATED' | 'HIGH' | 'SEVERE' | 'CRITICAL';
export type TrendDirection = 'rising' | 'falling' | 'stable';

export interface FearComponent {
  weight: number;
  label: string;
  description: string;
  score: number;
  value: string;
  trend: TrendDirection;
}

export interface ComponentResult {
  score: number;
  value: string;
  trend: TrendDirection;
  description: string;
}

export interface SectorResult {
  score: number;
  level: FearLevel;
}

export interface FearIndexResult {
  overallScore: number;
  level: FearLevel;
  trend: TrendDirection;
  changeFromYesterday: number;
  components: {
    nhi_exposure: ComponentResult;
    api_key_exposure: ComponentResult;
    c2_activity: ComponentResult;
    vibesec_distribution: ComponentResult;
    zero_day_active: ComponentResult;
  };
  sectorBreakdown: {
    fintech: SectorResult;
    healthcare: SectorResult;
    saas: SectorResult;
    government: SectorResult;
    ecommerce: SectorResult;
    education: SectorResult;
  };
  topThreats: string[];
  recommendation: string;
}

export interface HistoricalDataPoint {
  date: string;
  score: number;
  level: FearLevel;
  components: Record<string, number>;
}

export type SectorKey = 'fintech' | 'healthcare' | 'saas' | 'government' | 'ecommerce' | 'education';
export type ComponentKey = 'nhi_exposure' | 'api_key_exposure' | 'c2_activity' | 'vibesec_distribution' | 'zero_day_active';

// ── Constants ──────────────────────────────────────────────────────────

export const FEAR_COMPONENTS: Record<ComponentKey, { weight: number; label: string; description: string }> = {
  nhi_exposure: {
    weight: 0.30,
    label: 'Non-Human Identity Leaks',
    description: 'Exposed API keys, service account credentials, CI/CD tokens',
  },
  api_key_exposure: {
    weight: 0.25,
    label: 'API Key Exposure',
    description: 'Hardcoded secrets, .env files, credential dumps',
  },
  c2_activity: {
    weight: 0.20,
    label: 'Active C2 Infrastructure',
    description: 'Known command-and-control servers, botnet nodes',
  },
  vibesec_distribution: {
    weight: 0.15,
    label: 'AI App Security Posture',
    description: 'Distribution of VibeSec scores across scanned apps',
  },
  zero_day_active: {
    weight: 0.10,
    label: 'Active Zero-Days',
    description: 'Exploited vulnerabilities in the wild',
  },
};

const LEVEL_THRESHOLDS: { max: number; level: FearLevel }[] = [
  { max: 20, level: 'CALM' },
  { max: 40, level: 'ELEVATED' },
  { max: 60, level: 'HIGH' },
  { max: 80, level: 'SEVERE' },
  { max: 100, level: 'CRITICAL' },
];

export const LEVEL_COLORS: Record<FearLevel, string> = {
  CALM: '#22c55e',
  ELEVATED: '#eab308',
  HIGH: '#f97316',
  SEVERE: '#ef4444',
  CRITICAL: '#7f1d1d',
};

export const LEVEL_BG: Record<FearLevel, string> = {
  CALM: 'bg-green-500/10 border-green-500/20',
  ELEVATED: 'bg-yellow-500/10 border-yellow-500/20',
  HIGH: 'bg-orange-500/10 border-orange-500/20',
  SEVERE: 'bg-red-500/10 border-red-500/20',
  CRITICAL: 'bg-red-950/30 border-red-800/40',
};

// ── Deterministic Seed ─────────────────────────────────────────────────
// Generates a consistent seed from a date string so the same day always
// produces the same values.

function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

/** Seeded PRNG — Mulberry32 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Score Level Classification ─────────────────────────────────────────

export function classifyLevel(score: number): FearLevel {
  for (const { max, level } of LEVEL_THRESHOLDS) {
    if (score <= max) return level;
  }
  return 'CRITICAL';
}

// ── Trend Calculation ──────────────────────────────────────────────────

function calculateTrend(current: number, previous: number): { trend: TrendDirection; change: number } {
  const change = Math.round((current - previous) * 10) / 10;
  if (Math.abs(change) < 1.5) return { trend: 'stable', change };
  return { trend: change > 0 ? 'rising' : 'falling', change };
}

// ── Component Value Generators ─────────────────────────────────────────
// These create realistic raw metric values for each component.

interface RawComponentData {
  nhi_exposure: number;      // millions of exposed NHIs
  api_key_exposure: number;  // millions of exposed API keys
  c2_active_nodes: number;   // thousands of active C2 nodes
  vibesec_avg: number;       // average VibeSec score (inverted: 100 - vibesec = fear)
  zero_day_count: number;    // active zero-days in the wild
}

function generateRawComponentData(rand: () => number): RawComponentData {
  return {
    nhi_exposure: 1.5 + rand() * 8.0,          // 1.5M – 9.5M
    api_key_exposure: 0.8 + rand() * 6.0,       // 0.8M – 6.8M
    c2_active_nodes: 5.0 + rand() * 25.0,       // 5K – 30K
    vibesec_avg: 100 - (35 + rand() * 40),      // fear score from vibesec inversion
    zero_day_count: Math.floor(2 + rand() * 14), // 2 – 15
  };
}

/** Convert raw data to 0-100 fear component scores */
function normalizeComponentScores(raw: RawComponentData): Record<ComponentKey, number> {
  const nhiScore = Math.min(100, (raw.nhi_exposure / 9.5) * 100);
  const apiScore = Math.min(100, (raw.api_key_exposure / 6.8) * 100);
  const c2Score = Math.min(100, (raw.c2_active_nodes / 30) * 100);
  const vibesecScore = Math.min(100, Math.max(0, raw.vibesec_avg));
  const zeroDayScore = Math.min(100, (raw.zero_day_count / 15) * 100);

  return {
    nhi_exposure: Math.round(nhiScore * 10) / 10,
    api_key_exposure: Math.round(apiScore * 10) / 10,
    c2_activity: Math.round(c2Score * 10) / 10,
    vibesec_distribution: Math.round(vibesecScore * 10) / 10,
    zero_day_active: Math.round(zeroDayScore * 10) / 10,
  };
}

// ── Value Formatting ───────────────────────────────────────────────────

function formatComponentValue(key: ComponentKey, raw: RawComponentData): string {
  switch (key) {
    case 'nhi_exposure':
      return `${raw.nhi_exposure.toFixed(1)}M identities`;
    case 'api_key_exposure':
      return `${raw.api_key_exposure.toFixed(1)}M keys`;
    case 'c2_activity':
      return `${raw.c2_active_nodes.toFixed(1)}K nodes`;
    case 'vibesec_distribution':
      return `Avg ${(100 - raw.vibesec_avg).toFixed(0)}/100 risk`;
    case 'zero_day_active':
      return `${raw.zero_day_count} active`;
  }
}

// ── Sector Scoring ─────────────────────────────────────────────────────

const SECTOR_MODIFIERS: Record<SectorKey, { base: number; variance: number }> = {
  fintech:     { base: 12, variance: 8 },
  healthcare:  { base: 15, variance: 10 },
  saas:        { base: 8,  variance: 7 },
  government:  { base: 18, variance: 12 },
  ecommerce:   { base: 10, variance: 9 },
  education:   { base: 14, variance: 11 },
};

function generateSectorScores(
  overallScore: number,
  rand: () => number,
): Record<SectorKey, SectorResult> {
  const sectors = {} as Record<SectorKey, SectorResult>;
  for (const [key, mod] of Object.entries(SECTOR_MODIFIERS) as [SectorKey, typeof SECTOR_MODIFIERS[SectorKey]][]) {
    const modifier = (rand() - 0.4) * mod.variance * 2;
    const sectorScore = Math.max(0, Math.min(100, Math.round(overallScore + mod.base + modifier)));
    sectors[key] = { score: sectorScore, level: classifyLevel(sectorScore) };
  }
  return sectors;
}

// ── Threat Generation ──────────────────────────────────────────────────

const THREAT_POOL: Array<(raw: RawComponentData) => string> = [
  (r) => `${r.nhi_exposure.toFixed(1)}M exposed non-human identities detected across GitHub and CI/CD pipelines`,
  (r) => `${r.api_key_exposure.toFixed(1)}M API keys found in public code repositories`,
  (r) => `Active C2 cluster with ${r.c2_active_nodes.toFixed(0)}K nodes operating from Eastern Europe`,
  (r) => `${r.zero_day_count} zero-day vulnerabilities under active exploitation`,
  () => 'Major cloud provider credential leak — 500K service accounts potentially compromised',
  () => 'New ransomware variant targeting exposed RDP services at scale',
  () => 'Supply chain attack vector detected in popular NPM package ecosystem',
  () => 'AI-powered phishing campaign bypassing MFA with 73% success rate',
  () => 'Critical VPN appliance flaw being mass-scanned across enterprise networks',
  () => 'Cryptomining botnet leveraging exposed Docker APIs — 200% growth this week',
  () => 'State-sponsored APT group targeting healthcare sector with novel persistence',
  () => 'Mass credential stuffing campaign leveraging recently breached database dumps',
  () => 'Exposed Kubernetes clusters being cryptojacked at alarming rate',
  () => 'Novel DNS hijacking campaign targeting SaaS login flows',
  () => 'OAuth token theft campaign exploiting misconfigured redirect URIs',
];

function selectTopThreats(raw: RawComponentData, rand: () => number): string[] {
  const shuffled = [...THREAT_POOL].sort(() => rand() - 0.5);
  // Prioritize data-driven threats that use raw values
  const dataDriven = shuffled.filter(t => {
    const str = t(raw);
    return str.includes('M exposed') || str.includes('K nodes') || str.includes('zero-day');
  });
  const generic = shuffled.filter(t => {
    const str = t(raw);
    return !str.includes('M exposed') && !str.includes('K nodes') && !str.includes('zero-day');
  });
  return [...dataDriven.slice(0, 3), ...generic.slice(0, 2)].map(t => t(raw));
}

// ── Recommendation Engine ──────────────────────────────────────────────

function generateRecommendation(level: FearLevel, topComponent: ComponentKey): string {
  const base: Record<FearLevel, string> = {
    CALM: 'Global threat landscape is stable. Maintain current security posture and continue routine monitoring.',
    ELEVATED: 'Threat activity is above baseline. Review recent access logs and ensure all service account credentials are rotated on schedule.',
    HIGH: 'Significant threats detected across multiple vectors. Prioritize credential rotation, audit exposed API keys, and review C2 blocklists.',
    SEVERE: 'Active campaigns with multiple attack vectors detected. Initiate incident response protocols, rotate all service account credentials immediately, and enable enhanced monitoring.',
    CRITICAL: 'Unprecedented threat levels. Activate full incident response, isolate critical infrastructure, and notify executive leadership. All non-essential external integrations should be suspended.',
  };

  const componentAdvice: Record<ComponentKey, string> = {
    nhi_exposure: ' Immediately audit all non-human identities and revoke any unused service accounts.',
    api_key_exposure: ' Run a full secret scan across all repositories and rotate any exposed credentials.',
    c2_activity: ' Update firewall rules and threat intelligence feeds to block active C2 infrastructure.',
    vibesec_distribution: ' Review AI application security posture and address apps scoring below the risk threshold.',
    zero_day_active: ' Patch all systems affected by known zero-days and deploy virtual patches where vendor fixes are unavailable.',
  };

  return base[level] + componentAdvice[topComponent];
}

// ── Main Fear Index Calculator ─────────────────────────────────────────

export function calculateFearIndex(date: Date = new Date()): FearIndexResult {
  const dateStr = date.toISOString().slice(0, 10);
  const seed = dateSeed(dateStr);
  const rand = seededRandom(seed);

  // Generate raw data
  const raw = generateRawComponentData(rand);
  const scores = normalizeComponentScores(raw);

  // Calculate yesterday for trend
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdaySeed = dateSeed(yesterday.toISOString().slice(0, 10));
  const yesterdayRand = seededRandom(yesterdaySeed);
  const yesterdayRaw = generateRawComponentData(yesterdayRand);
  const yesterdayScores = normalizeComponentScores(yesterdayRaw);

  // Weighted overall score
  let overallScore = 0;
  for (const [key, comp] of Object.entries(FEAR_COMPONENTS) as [ComponentKey, typeof FEAR_COMPONENTS[ComponentKey]][]) {
    overallScore += scores[key] * comp.weight;
  }
  overallScore = Math.round(overallScore * 10) / 10;
  overallScore = Math.max(0, Math.min(100, overallScore));

  // Yesterday overall
  let yesterdayOverall = 0;
  for (const [key, comp] of Object.entries(FEAR_COMPONENTS) as [ComponentKey, typeof FEAR_COMPONENTS[ComponentKey]][]) {
    yesterdayOverall += yesterdayScores[key] * comp.weight;
  }
  yesterdayOverall = Math.max(0, Math.min(100, yesterdayOverall));

  const { trend, change } = calculateTrend(overallScore, yesterdayOverall);
  const level = classifyLevel(overallScore);

  // Build component results
  const components: FearIndexResult['components'] = {} as FearIndexResult['components'];
  let topComponent: ComponentKey = 'nhi_exposure';
  let topComponentScore = 0;

  for (const [key, comp] of Object.entries(FEAR_COMPONENTS) as [ComponentKey, typeof FEAR_COMPONENTS[ComponentKey]][]) {
    const compTrend = calculateTrend(scores[key], yesterdayScores[key]);
    components[key] = {
      score: scores[key],
      value: formatComponentValue(key, raw),
      trend: compTrend.trend,
      description: comp.description,
    };
    if (scores[key] > topComponentScore) {
      topComponentScore = scores[key];
      topComponent = key;
    }
  }

  // Sector breakdown
  const sectorBreakdown = generateSectorScores(overallScore, rand);

  // Top threats
  const topThreats = selectTopThreats(raw, rand);

  // Recommendation
  const recommendation = generateRecommendation(level, topComponent);

  return {
    overallScore,
    level,
    trend,
    changeFromYesterday: change,
    components,
    sectorBreakdown,
    topThreats,
    recommendation,
  };
}

// ── Historical Data Generator ──────────────────────────────────────────

export function generateHistoricalData(days: number = 90): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const today = new Date();

  // Generate base parameters for the whole period
  // Base score: realistic starting point (35-50 range)
  const periodSeed = dateSeed(`period-${today.getFullYear()}-${today.getMonth()}`);
  const periodRand = seededRandom(periodSeed);
  let baseScore = 30 + periodRand() * 20;

  // Pre-generate spike events (2-5 per 90 days)
  const spikeDays: number[] = [];
  const spikeMagnitudes: number[] = [];
  const numSpikes = 2 + Math.floor(periodRand() * 4);
  for (let i = 0; i < numSpikes; i++) {
    spikeDays.push(Math.floor(periodRand() * (days - 5)) + 2);
    spikeMagnitudes.push(10 + periodRand() * 25);
  }

  // Event descriptions for spikes
  const spikeEvents = [
    'Major cloud credential leak discovered',
    'New zero-day in popular framework under active exploitation',
    'Large-scale ransomware campaign launched',
    'Critical supply chain compromise detected',
    'State-sponsored APT campaign targeting multiple sectors',
    'Mass API key exposure from CI/CD pipeline breach',
    'Novel C2 infrastructure deployment detected',
  'Critical VPN appliance vulnerability mass-exploited',
  ];

  let currentScore = baseScore;

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const daySeed = dateSeed(dateStr);
    const dayRand = seededRandom(daySeed);

    // Random walk with slight upward bias
    const walk = (dayRand() - 0.45) * 4; // slight upward bias (0.45 < 0.5)
    currentScore += walk;

    // Weekly pattern: weekends slightly lower
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentScore -= 1.5 + dayRand() * 2;
    }

    // Apply spikes
    const dayIndex = days - i;
    let spikeEvent: string | null = null;
    for (let s = 0; s < spikeDays.length; s++) {
      if (dayIndex === spikeDays[s]) {
        currentScore += spikeMagnitudes[s];
        spikeEvent = spikeEvents[s % spikeEvents.length];
      }
      // Spike decay over 3-5 days
      if (dayIndex > spikeDays[s] && dayIndex <= spikeDays[s] + 4) {
        const decayFactor = (dayIndex - spikeDays[s]) / 5;
        currentScore -= spikeMagnitudes[s] * decayFactor * 0.3;
      }
    }

    // Mean reversion toward base range
    const targetBase = 30 + periodRand() * 15;
    currentScore += (targetBase - currentScore) * 0.05;

    // Clamp
    currentScore = Math.max(5, Math.min(95, currentScore));

    const roundedScore = Math.round(currentScore * 10) / 10;

    // Generate component scores for this day
    const raw = generateRawComponentData(dayRand);
    const compScores = normalizeComponentScores(raw);

    data.push({
      date: dateStr,
      score: roundedScore,
      level: classifyLevel(roundedScore),
      components: compScores,
    });
  }

  return data;
}

// ── Sector Data Generator (standalone) ─────────────────────────────────

export function generateSectorData(
  baseScore: number = 45,
): Record<SectorKey, SectorResult> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const seed = dateSeed(`sectors-${dateStr}`);
  const rand = seededRandom(seed);
  return generateSectorScores(baseScore, rand);
}

// ── Moving Average Utility ─────────────────────────────────────────────

export function calculateMovingAverage(data: number[], window: number = 7): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      // Not enough data yet — use available
      const slice = data.slice(0, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    } else {
      const slice = data.slice(i - window + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / window);
    }
  }
  return result.map(v => Math.round(v * 10) / 10);
}

// ── RSS Feed Builder ───────────────────────────────────────────────────

export function buildRssFeed(current: FearIndexResult): string {
  const now = new Date().toUTCString();
  const pubDate = new Date(Date.now() - 86400000).toUTCString();
  const items = current.topThreats
    .map(
      (threat, i) => `    <item>
      <title>Threat Alert: ${escapeXml(threat.slice(0, 80))}</title>
      <description>${escapeXml(threat)} — Fear Index: ${current.overallScore}/100 (${current.level})</description>
      <link>https://reconpro.dev/fear-index</link>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">fear-index-${new Date().toISOString().slice(0, 10)}-${i}</guid>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ReconPro CISO Fear Index</title>
    <link>https://reconpro.dev/fear-index</link>
    <description>Global Security Risk Score — Updated Daily</description>
    <language>en-us</language>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://reconpro.dev/api/fear-index/feed" rel="self" type="application/rss+xml"/>
    <item>
      <title>Fear Index: ${current.overallScore}/100 — ${current.level}</title>
      <description>Today's global security risk score is ${current.overallScore}/100 (${current.level}). Trend: ${current.trend} (${current.changeFromYesterday > 0 ? '+' : ''}${current.changeFromYesterday} from yesterday). ${escapeXml(current.recommendation)}</description>
      <link>https://reconpro.dev/fear-index</link>
      <pubDate>${now}</pubDate>
      <guid isPermaLink="false">fear-index-${new Date().toISOString().slice(0, 10)}</guid>
    </item>
${items}
  </channel>
</rss>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
