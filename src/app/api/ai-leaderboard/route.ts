// STATUS: SIMULATED — Uses hardcoded SIMULATED_DATA; no real LLM red-team results unless database contains actual scan data
import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';


// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface CategoryScores {
  promptInjection: number;
  dataExtraction: number;
  jailbreak: number;
  hallucination: number;
  bias: number;
  harmfulContent: number;
  privacyLeak: number;
}

interface LeaderboardEntry {
  name: string;
  provider: string;
  fragilityScore: number;
  grade: string;
  lastTested: string;
  testsPassed: number;
  testsFailed: number;
  alignmentBreaks: number;
  dataExtractionSuccesses: number;
  trendDirection: 'up' | 'down' | 'stable';
  categoryScores: CategoryScores;
}

// ══════════════════════════════════════════════════════════════════════════════
// SIMULATED DATA — 8 frontier models with realistic vulnerability profiles
// ══════════════════════════════════════════════════════════════════════════════

const SIMULATED_MODELS: LeaderboardEntry[] = [
  {
    name: 'GPT-4o',
    provider: 'OpenAI',
    fragilityScore: 42,
    grade: 'B+',
    lastTested: '2025-01-15T08:30:00Z',
    testsPassed: 347,
    testsFailed: 53,
    alignmentBreaks: 12,
    dataExtractionSuccesses: 8,
    trendDirection: 'down',
    categoryScores: { promptInjection: 35, dataExtraction: 28, jailbreak: 52, hallucination: 58, bias: 40, harmfulContent: 30, privacyLeak: 22 },
  },
  {
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    fragilityScore: 31,
    grade: 'A-',
    lastTested: '2025-01-15T09:15:00Z',
    testsPassed: 372,
    testsFailed: 28,
    alignmentBreaks: 6,
    dataExtractionSuccesses: 4,
    trendDirection: 'stable',
    categoryScores: { promptInjection: 22, dataExtraction: 18, jailbreak: 38, hallucination: 42, bias: 25, harmfulContent: 20, privacyLeak: 15 },
  },
  {
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    fragilityScore: 48,
    grade: 'B',
    lastTested: '2025-01-14T14:00:00Z',
    testsPassed: 331,
    testsFailed: 69,
    alignmentBreaks: 15,
    dataExtractionSuccesses: 11,
    trendDirection: 'up',
    categoryScores: { promptInjection: 45, dataExtraction: 40, jailbreak: 55, hallucination: 62, bias: 48, harmfulContent: 42, privacyLeak: 35 },
  },
  {
    name: 'Llama 3.1 405B',
    provider: 'Meta',
    fragilityScore: 56,
    grade: 'C+',
    lastTested: '2025-01-15T06:45:00Z',
    testsPassed: 298,
    testsFailed: 102,
    alignmentBreaks: 24,
    dataExtractionSuccesses: 18,
    trendDirection: 'up',
    categoryScores: { promptInjection: 52, dataExtraction: 48, jailbreak: 65, hallucination: 68, bias: 55, harmfulContent: 50, privacyLeak: 42 },
  },
  {
    name: 'Mistral Large 2',
    provider: 'Mistral AI',
    fragilityScore: 51,
    grade: 'B-',
    lastTested: '2025-01-14T18:20:00Z',
    testsPassed: 318,
    testsFailed: 82,
    alignmentBreaks: 19,
    dataExtractionSuccesses: 14,
    trendDirection: 'stable',
    categoryScores: { promptInjection: 48, dataExtraction: 42, jailbreak: 58, hallucination: 55, bias: 52, harmfulContent: 48, privacyLeak: 38 },
  },
  {
    name: 'Command R+',
    provider: 'Cohere',
    fragilityScore: 63,
    grade: 'C',
    lastTested: '2025-01-14T22:10:00Z',
    testsPassed: 275,
    testsFailed: 125,
    alignmentBreaks: 28,
    dataExtractionSuccesses: 22,
    trendDirection: 'up',
    categoryScores: { promptInjection: 60, dataExtraction: 55, jailbreak: 72, hallucination: 70, bias: 58, harmfulContent: 62, privacyLeak: 50 },
  },
  {
    name: 'Qwen 2.5 72B',
    provider: 'Alibaba',
    fragilityScore: 58,
    grade: 'C',
    lastTested: '2025-01-15T04:30:00Z',
    testsPassed: 290,
    testsFailed: 110,
    alignmentBreaks: 22,
    dataExtractionSuccesses: 16,
    trendDirection: 'stable',
    categoryScores: { promptInjection: 55, dataExtraction: 50, jailbreak: 68, hallucination: 65, bias: 60, harmfulContent: 55, privacyLeak: 45 },
  },
  {
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    fragilityScore: 67,
    grade: 'C-',
    lastTested: '2025-01-15T02:00:00Z',
    testsPassed: 260,
    testsFailed: 140,
    alignmentBreaks: 32,
    dataExtractionSuccesses: 25,
    trendDirection: 'up',
    categoryScores: { promptInjection: 65, dataExtraction: 62, jailbreak: 75, hallucination: 72, bias: 65, harmfulContent: 68, privacyLeak: 55 },
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const GRADE_ORDER: Record<string, number> = {
  'A+': 1, 'A': 2, 'A-': 3, 'B+': 4, 'B': 5, 'B-': 6,
  'C+': 7, 'C': 8, 'C-': 9, 'D+': 10, 'D': 11, 'D-': 12,
  'F': 13,
};

function fragilityToGrade(score: number): string {
  if (score <= 15) return 'A+';
  if (score <= 25) return 'A';
  if (score <= 35) return 'A-';
  if (score <= 42) return 'B+';
  if (score <= 50) return 'B';
  if (score <= 57) return 'B-';
  if (score <= 62) return 'C+';
  if (score <= 68) return 'C';
  if (score <= 75) return 'C-';
  if (score <= 82) return 'D+';
  if (score <= 90) return 'D';
  return 'F';
}

function sortModels(models: LeaderboardEntry[], sort: string, direction: string): LeaderboardEntry[] {
  const dir = direction === 'asc' ? 1 : -1;
  const sorted = [...models];
  switch (sort) {
    case 'fragility':
      sorted.sort((a, b) => (b.fragilityScore - a.fragilityScore) * dir);
      break;
    case 'grade':
      sorted.sort((a, b) => ((GRADE_ORDER[a.grade] ?? 99) - (GRADE_ORDER[b.grade] ?? 99)) * dir);
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name) * dir);
      break;
    default:
      // Default: sort by fragility descending (most vulnerable first)
      sorted.sort((a, b) => b.fragilityScore - a.fragilityScore);
  }
  return sorted;
}

// ══════════════════════════════════════════════════════════════════════════════
// Aggregate stats from the leaderboard
// ══════════════════════════════════════════════════════════════════════════════

function computeStats(models: LeaderboardEntry[]) {
  const totalTests = models.reduce((s, m) => s + m.testsPassed + m.testsFailed, 0);
  const totalBreaks = models.reduce((s, m) => s + m.alignmentBreaks, 0);
  const totalExtractions = models.reduce((s, m) => s + m.dataExtractionSuccesses, 0);
  const avgFragility = Math.round(models.reduce((s, m) => s + m.fragilityScore, 0) / models.length);
  const mostVulnerable = [...models].sort((a, b) => b.fragilityScore - a.fragilityScore)[0];
  const leastVulnerable = [...models].sort((a, b) => a.fragilityScore - b.fragilityScore)[0];
  const categoryAvgs: Record<string, number> = {};
  const catKeys = Object.keys(models[0].categoryScores) as (keyof CategoryScores)[];
  for (const key of catKeys) {
    categoryAvgs[key] = Math.round(models.reduce((s, m) => s + m.categoryScores[key], 0) / models.length);
  }
  return {
    totalModelsTested: models.length,
    totalTestsRun: totalTests,
    totalAlignmentBreaks: totalBreaks,
    totalDataExtractions: totalExtractions,
    avgFragilityScore: avgFragility,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/ai-leaderboard
// ══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'fragility';
    const direction = searchParams.get('direction') || 'desc';

    // ── Try to get real data from DB ──
    // If a ModelRedTeam table exists with results, use those.
    // For now, we use simulated data since no real LLM API keys are configured.
    let models: LeaderboardEntry[];
    let isSimulated = true;

    try {
      // Attempt to query real data — if table doesn't exist or is empty, fall back
      const results = await (db as any).modelRedTeamResult?.findMany?.({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      if (results && results.length > 0) {
        // Group by model name, take latest per model
        const latest: Record<string, any> = {};
        for (const r of results) {
          if (!latest[r.modelName] || new Date(r.createdAt) > new Date(latest[r.modelName].createdAt)) {
            latest[r.modelName] = r;
          }
        }
        models = Object.values(latest).map((r: any) => ({
          name: r.modelName,
          provider: r.provider || 'Unknown',
          fragilityScore: r.fragilityScore ?? 0,
          grade: r.grade || fragilityToGrade(r.fragilityScore ?? 0),
          lastTested: r.createdAt,
          testsPassed: r.testsPassed ?? 0,
          testsFailed: r.testsFailed ?? 0,
          alignmentBreaks: r.alignmentBreaks ?? 0,
          dataExtractionSuccesses: r.dataExtractionSuccesses ?? 0,
          trendDirection: r.trendDirection || 'stable',
          categoryScores: r.categoryScores ? JSON.parse(r.categoryScores) : {
            promptInjection: 0, dataExtraction: 0, jailbreak: 0,
            hallucination: 0, bias: 0, harmfulContent: 0, privacyLeak: 0,
          },
        }));
        isSimulated = false;
      } else {
        models = SIMULATED_MODELS;
      }
    } catch {
      // Table doesn't exist or query failed — use simulated data
      models = SIMULATED_MODELS;
    }

    const sorted = sortModels(models, sort, direction);
    const stats = computeStats(models);

    return NextResponse.json({
      success: true,
      isSimulated,
      simulated: true,
      generatedAt: new Date().toISOString(),
      engine: 'GORGON/OBLIVION v3.0',
      stats,
      models: sorted,
    });
  } catch (error) {
    console.error('[AI Leaderboard] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard data' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/ai-leaderboard — Trigger a new scan cycle
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const jobId = `GORGON-SCAN-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Check if GORGON API keys are configured
    const hasRealKeys = !!(
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_AI_API_KEY
    );

    // In a real deployment, this would enqueue a background job to GORGON/OBLIVION.
    // For now, we record the scan request and return a pending job.
    try {
      await (db as any).scanJob?.create?.({
        data: {
          id: jobId,
          type: 'AI_REDTREAM',
          status: hasRealKeys ? 'pending' : 'demo_pending',
          engine: 'GORGON/OBLIVION v3.0',
          targetModels: SIMULATED_MODELS.map(m => m.name),
          createdAt: new Date(),
        },
      });
    } catch {
      // Table might not exist — that's fine for demo mode
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: hasRealKeys ? 'pending' : 'demo_pending',
      simulated: true,
      message: hasRealKeys
        ? `Scan cycle initiated. ${SIMULATED_MODELS.length} models queued for red-teaming.`
        : `Demo mode: No LLM API keys detected. Simulated results will be generated.`,
      engine: 'GORGON/OBLIVION v3.0',
      modelsQueued: SIMULATED_MODELS.length,
      estimatedDuration: hasRealKeys ? '~15-30 minutes' : '~3 seconds',
      queuedAt: new Date().toISOString(),
    }, { status: 202 });
  } catch (error) {
    console.error('[AI Leaderboard] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate scan cycle' },
      { status: 500 },
    );
  }
}
