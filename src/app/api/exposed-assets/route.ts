import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api-security';


// ═══════════════════════════════════════════════════════════════════════
// Exposed AI Asset Map API — Simulated Global Exposure Telemetry
// GET /api/exposed-assets?type=all&region=all
// ═══════════════════════════════════════════════════════════════════════

// ── Major cities with lat/lng ──────────────────────────────────────────
const CITIES: { city: string; country: string; lat: number; lng: number; region: Region }[] = [
  // North America
  { city: 'San Francisco', country: 'US', lat: 37.77, lng: -122.42, region: 'na' },
  { city: 'New York', country: 'US', lat: 40.71, lng: -74.01, region: 'na' },
  { city: 'Seattle', country: 'US', lat: 47.61, lng: -122.33, region: 'na' },
  { city: 'Austin', country: 'US', lat: 30.27, lng: -97.74, region: 'na' },
  { city: 'Boston', country: 'US', lat: 42.36, lng: -71.06, region: 'na' },
  { city: 'Chicago', country: 'US', lat: 41.88, lng: -87.63, region: 'na' },
  { city: 'Denver', country: 'US', lat: 39.74, lng: -104.99, region: 'na' },
  { city: 'Los Angeles', country: 'US', lat: 34.05, lng: -118.24, region: 'na' },
  { city: 'Washington DC', country: 'US', lat: 38.91, lng: -77.04, region: 'na' },
  { city: 'Atlanta', country: 'US', lat: 33.75, lng: -84.39, region: 'na' },
  { city: 'Miami', country: 'US', lat: 25.76, lng: -80.19, region: 'na' },
  { city: 'Dallas', country: 'US', lat: 32.78, lng: -96.80, region: 'na' },
  { city: 'Toronto', country: 'CA', lat: 43.65, lng: -79.38, region: 'na' },
  { city: 'Vancouver', country: 'CA', lat: 49.28, lng: -123.12, region: 'na' },
  { city: 'Mexico City', country: 'MX', lat: 19.43, lng: -99.13, region: 'na' },
  { city: 'Monterrey', country: 'MX', lat: 25.69, lng: -100.31, region: 'na' },
  // Europe
  { city: 'London', country: 'GB', lat: 51.51, lng: -0.13, region: 'eu' },
  { city: 'Berlin', country: 'DE', lat: 52.52, lng: 13.41, region: 'eu' },
  { city: 'Paris', country: 'FR', lat: 48.86, lng: 2.35, region: 'eu' },
  { city: 'Amsterdam', country: 'NL', lat: 52.37, lng: 4.90, region: 'eu' },
  { city: 'Dublin', country: 'IE', lat: 53.35, lng: -6.26, region: 'eu' },
  { city: 'Frankfurt', country: 'DE', lat: 50.11, lng: 8.68, region: 'eu' },
  { city: 'Stockholm', country: 'SE', lat: 59.33, lng: 18.07, region: 'eu' },
  { city: 'Zurich', country: 'CH', lat: 47.38, lng: 8.54, region: 'eu' },
  { city: 'Warsaw', country: 'PL', lat: 52.23, lng: 21.01, region: 'eu' },
  { city: 'Madrid', country: 'ES', lat: 40.42, lng: -3.70, region: 'eu' },
  { city: 'Milan', country: 'IT', lat: 45.46, lng: 9.19, region: 'eu' },
  { city: 'Munich', country: 'DE', lat: 48.14, lng: 11.58, region: 'eu' },
  // Asia
  { city: 'Tokyo', country: 'JP', lat: 35.68, lng: 139.69, region: 'asia' },
  { city: 'Singapore', country: 'SG', lat: 1.35, lng: 103.82, region: 'asia' },
  { city: 'Mumbai', country: 'IN', lat: 19.08, lng: 72.88, region: 'asia' },
  { city: 'Seoul', country: 'KR', lat: 37.57, lng: 126.98, region: 'asia' },
  { city: 'Shanghai', country: 'CN', lat: 31.23, lng: 121.47, region: 'asia' },
  { city: 'Beijing', country: 'CN', lat: 39.90, lng: 116.40, region: 'asia' },
  { city: 'Shenzhen', country: 'CN', lat: 22.54, lng: 114.06, region: 'asia' },
  { city: 'Bangalore', country: 'IN', lat: 12.97, lng: 77.59, region: 'asia' },
  { city: 'Taipei', country: 'TW', lat: 25.03, lng: 121.57, region: 'asia' },
  { city: 'Jakarta', country: 'ID', lat: -6.21, lng: 106.85, region: 'asia' },
  { city: 'Hong Kong', country: 'HK', lat: 22.32, lng: 114.17, region: 'asia' },
  { city: 'Tel Aviv', country: 'IL', lat: 32.09, lng: 34.78, region: 'asia' },
  { city: 'Dubai', country: 'AE', lat: 25.20, lng: 55.27, region: 'asia' },
  { city: 'Hanoi', country: 'VN', lat: 21.03, lng: 105.85, region: 'asia' },
  // South America
  { city: 'São Paulo', country: 'BR', lat: -23.55, lng: -46.63, region: 'sa' },
  { city: 'Buenos Aires', country: 'AR', lat: -34.60, lng: -58.38, region: 'sa' },
  { city: 'Bogotá', country: 'CO', lat: 4.71, lng: -74.07, region: 'sa' },
  { city: 'Santiago', country: 'CL', lat: -33.45, lng: -70.67, region: 'sa' },
  { city: 'Lima', country: 'PE', lat: -12.05, lng: -77.04, region: 'sa' },
  { city: 'Rio de Janeiro', country: 'BR', lat: -22.91, lng: -43.17, region: 'sa' },
  // Africa
  { city: 'Cape Town', country: 'ZA', lat: -33.93, lng: 18.42, region: 'africa' },
  { city: 'Lagos', country: 'NG', lat: 6.52, lng: 3.38, region: 'africa' },
  { city: 'Nairobi', country: 'KE', lat: -1.29, lng: 36.82, region: 'africa' },
  { city: 'Johannesburg', country: 'ZA', lat: -26.20, lng: 28.05, region: 'africa' },
  { city: 'Cairo', country: 'EG', lat: 30.04, lng: 31.24, region: 'africa' },
  { city: 'Casablanca', country: 'MA', lat: 33.57, lng: -7.59, region: 'africa' },
  // Oceania
  { city: 'Sydney', country: 'AU', lat: -33.87, lng: 151.21, region: 'oceania' },
  { city: 'Melbourne', country: 'AU', lat: -37.81, lng: 144.96, region: 'oceania' },
  { city: 'Auckland', country: 'NZ', lat: -36.85, lng: 174.76, region: 'oceania' },
];

// ── Types & enums ──────────────────────────────────────────────────────
type Region = 'na' | 'eu' | 'asia' | 'sa' | 'africa' | 'oceania';
type ExposureType = 'env_files' | 'open_databases' | 'exposed_llm_endpoints' | 'unprotected_apis' | 'cloud_misconfig';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const REGION_MAP: Record<Region, string> = {
  na: 'north_america',
  eu: 'europe',
  asia: 'asia',
  sa: 'south_america',
  africa: 'africa',
  oceania: 'oceania',
};

const TYPE_WEIGHTS: { type: ExposureType; weight: number }[] = [
  { type: 'env_files', weight: 30 },
  { type: 'open_databases', weight: 25 },
  { type: 'exposed_llm_endpoints', weight: 15 },
  { type: 'unprotected_apis', weight: 20 },
  { type: 'cloud_misconfig', weight: 10 },
];

const SEVERITY_WEIGHTS: { severity: Severity; weight: number }[] = [
  { severity: 'critical', weight: 10 },
  { severity: 'high', weight: 25 },
  { severity: 'medium', weight: 35 },
  { severity: 'low', weight: 30 },
];

const DESCRIPTIONS: Record<ExposureType, string[]> = {
  env_files: [
    'Exposed .env file with AWS credentials on public GitHub repo',
    '.env.backup containing OPENAI_API_KEY found on S3 bucket',
    'Docker .env file leaked via npm package tarball',
    'Git history contains .env with database password',
    '.env.local committed to public fork of Next.js app',
    'CI/CD pipeline artifact exposing environment variables',
  ],
  open_databases: [
    'MongoDB instance with 2.3M records accessible without auth',
    'PostgreSQL database exposed on default port 5432',
    'Elasticsearch cluster leaking indexed AI training data',
    'Redis instance with session tokens on public IP',
    'MySQL database with customer PII accessible via internet',
    'Cassandra cluster with no authentication required',
  ],
  exposed_llm_endpoints: [
    'OpenAI-compatible API endpoint with no rate limiting',
    'LangChain server exposing prompt injection surface',
    'HuggingFace inference endpoint with unauthenticated access',
    'Custom LLM API leaking model weights via /v1/models',
    'Vector database API returning raw embeddings without auth',
    'RAG pipeline endpoint exposing source document retrieval',
  ],
  unprotected_apis: [
    'REST API with no authentication returning sensitive data',
    'GraphQL endpoint enabling full schema introspection',
    'Swagger UI exposed on production endpoint',
    'API key in URL query parameter (referer leakage risk)',
    'gRPC reflection enabled on production service',
    'WebSocket endpoint broadcasting events without auth',
  ],
  cloud_misconfig: [
    'S3 bucket with public read access containing ML models',
    'GCP storage bucket with allUsers permission',
    'Azure Blob container with anonymous access enabled',
    'CloudFront distribution with origin access not configured',
    'Kubernetes etcd exposed via misconfigured service',
    'Terraform state file with secrets in public S3',
  ],
};

// ── Seeded random (deterministic per request minute) ───────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function weightedPick<T extends { weight: number }>(items: T[], rand: () => number): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ── Generate assets ────────────────────────────────────────────────────
interface Asset {
  id: string;
  type: ExposureType;
  severity: Severity;
  lat: number;
  lng: number;
  city: string;
  country: string;
  region: Region;
  timestamp: string;
  description: string;
}

function generateAssets(
  typeFilter: string,
  regionFilter: string,
  count: number,
): Asset[] {
  const seed = Math.floor(Date.now() / 60000); // changes every minute
  const rand = seededRandom(seed);

  let cities = CITIES;
  if (regionFilter !== 'all') {
    cities = CITIES.filter(c => c.region === regionFilter);
  }
  if (cities.length === 0) cities = CITIES;

  const assets: Asset[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const city = cities[Math.floor(rand() * cities.length)];
    const typePick = weightedPick(TYPE_WEIGHTS, rand);
    const sevPick = weightedPick(SEVERITY_WEIGHTS, rand);
    const descs = DESCRIPTIONS[typePick.type];
    const desc = descs[Math.floor(rand() * descs.length)];

    // Time-based: more assets during business hours (8-20 UTC)
    const hoursAgo = Math.floor(rand() * 168); // up to 7 days
    const hourOfDay = ((now - hoursAgo * 3600000) / 3600000) % 24;
    const businessBoost = (hourOfDay >= 8 && hourOfDay <= 20) ? 0.7 : 0.3;
    if (rand() > businessBoost && i > count * 0.3) continue;

    if (typeFilter !== 'all' && typePick.type !== typeFilter) {
      // Re-roll to match filter
      const filtered = TYPE_WEIGHTS.find(t => t.type === typeFilter);
      if (filtered) {
        const d = DESCRIPTIONS[filtered.type];
        assets.push(generateSingleAsset(city, filtered.type, sevPick, d[Math.floor(rand() * d.length)], now, hoursAgo, rand, i));
        continue;
      }
    }

    assets.push(generateSingleAsset(city, typePick.type, sevPick, desc, now, hoursAgo, rand, i));
  }

  return assets;
}

function generateSingleAsset(
  city: { city: string; country: string; lat: number; lng: number; region: Region },
  type: ExposureType,
  sevPick: { severity: Severity },
  desc: string,
  now: number,
  hoursAgo: number,
  rand: () => number,
  i: number,
): Asset {
  return {
    id: `EXP-${String(now).slice(-6)}-${String(i).padStart(4, '0')}`,
    type,
    severity: sevPick.severity,
    lat: city.lat + (rand() - 0.5) * 2,
    lng: city.lng + (rand() - 0.5) * 2,
    city: city.city,
    country: city.country,
    region: city.region,
    timestamp: new Date(now - hoursAgo * 3600000 + Math.floor(rand() * 3600000)).toISOString(),
    description: desc,
  };
}

// ── 24h time series ────────────────────────────────────────────────────
function generateTimeSeries(rand: () => number) {
  const currentHour = new Date().getHours();
  const series: { hour: string; count: number }[] = [];
  for (let h = 23; h >= 0; h--) {
    const hour = (currentHour - h + 24) % 24;
    const label = `${String(hour).padStart(2, '0')}:00`;
    // Business hours get more detections
    const isBusiness = hour >= 8 && hour <= 20;
    const base = isBusiness ? 18 : 8;
    const variance = Math.floor(rand() * 14);
    series.push({ hour: label, count: base + variance });
  }
  return series;
}

// ── Stats ──────────────────────────────────────────────────────────────
function generateStats(timeSeries: { hour: string; count: number }[]) {
  const detectedToday = timeSeries.slice(-24).reduce((s, t) => s + t.count, 0);
  const detectedThisWeek = detectedToday * 6.7; // simulated
  const avgDaily = Math.round(detectedThisWeek / 7);
  let peakHour = 0;
  let peakCount = 0;
  for (const t of timeSeries) {
    if (t.count > peakCount) {
      peakCount = t.count;
      peakHour = parseInt(t.hour);
    }
  }
  return { detectedToday, detectedThisWeek: Math.round(detectedThisWeek), avgDaily, peakHour };
}

// ═══════════════════════════════════════════════════════════════════════
// GET handler
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { searchParams } = request.nextUrl;
  const typeFilter = searchParams.get('type') || 'all';
  const regionFilter = searchParams.get('region') || 'all';

  const seed = Math.floor(Date.now() / 60000);
  const rand = seededRandom(seed + 42);

  const assets = generateAssets(typeFilter, regionFilter, 250);

  // Compute breakdowns from the assets we actually generated
  const assetsByType: Record<ExposureType, number> = {
    env_files: 0,
    open_databases: 0,
    exposed_llm_endpoints: 0,
    unprotected_apis: 0,
    cloud_misconfig: 0,
  };
  const assetsByRegion: Record<string, number> = {
    north_america: 0,
    europe: 0,
    asia: 0,
    south_america: 0,
    africa: 0,
    oceania: 0,
  };

  for (const a of assets) {
    assetsByType[a.type]++;
    assetsByRegion[REGION_MAP[a.region]]++;
  }

  // Scale totals to be realistic (assets generated are a sample)
  const totalExposed = Object.values(assetsByType).reduce((s, v) => s + v, 0);
  const scale = 12847 / Math.max(totalExposed, 1); // target ~12847 this week

  for (const k of Object.keys(assetsByType) as ExposureType[]) {
    assetsByType[k] = Math.round(assetsByType[k] * scale);
  }
  for (const k of Object.keys(assetsByRegion)) {
    assetsByRegion[k] = Math.round(assetsByRegion[k] * scale);
  }

  const timeSeries = generateTimeSeries(rand);
  const stats = generateStats(timeSeries);

  // Return only recent 50 assets in the response (full list too large)
  const recentAssets = assets.slice(0, 50);

  return NextResponse.json({
    totalExposed: 12847,
    assetsByType,
    assetsByRegion,
    recentAssets,
    timeSeries,
    stats,
  });
}
