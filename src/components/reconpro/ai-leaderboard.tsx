'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import {
  Skull, ShieldAlert, TrendingUp, TrendingDown, Minus,
  RefreshCw, AlertTriangle, Database, Eye, Zap,
  ChevronDown, Copy, ExternalLink,
  Shield, Sword, Target, Brain, Lock,
  FileWarning, Scale, Fingerprint, Activity,
  Share2, Info, Radio, Ghost, Flame,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface LeaderboardStats {
  totalModelsTested: number;
  totalTestsRun: number;
  totalAlignmentBreaks: number;
  totalDataExtractions: number;
  avgFragilityScore: number;
}

interface LeaderboardResponse {
  success: boolean;
  isSimulated: boolean;
  generatedAt: string;
  engine: string;
  stats: LeaderboardStats;
  models: LeaderboardEntry[];
}

type SortField = 'fragility' | 'grade' | 'name';
type SortDirection = 'asc' | 'desc';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const GRADE_COLORS: Record<string, string> = {
  'A+': '#00ff88', A: '#22c55e', 'A-': '#4ade80',
  'B+': '#3b82f6', B: '#6366f1', 'B-': '#818cf8',
  'C+': '#eab308', C: '#f97316', 'C-': '#fb923c',
  'D+': '#ef4444', D: '#dc2626', 'D-': '#b91c1c',
  F: '#991b1b',
};

const GRADE_BG: Record<string, string> = {
  'A+': 'bg-[#00ff88]/15 border-[#00ff88]/30 text-[#00ff88]',
  A: 'bg-[#22c55e]/15 border-[#22c55e]/30 text-[#22c55e]',
  'A-': 'bg-[#4ade80]/15 border-[#4ade80]/30 text-[#4ade80]',
  'B+': 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#3b82f6]',
  B: 'bg-[#6366f1]/15 border-[#6366f1]/30 text-[#6366f1]',
  'B-': 'bg-[#818cf8]/15 border-[#818cf8]/30 text-[#818cf8]',
  'C+': 'bg-[#eab308]/15 border-[#eab308]/30 text-[#eab308]',
  C: 'bg-[#f97316]/15 border-[#f97316]/30 text-[#f97316]',
  'C-': 'bg-[#fb923c]/15 border-[#fb923c]/30 text-[#fb923c]',
  'D+': 'bg-[#ef4444]/15 border-[#ef4444]/30 text-[#ef4444]',
  D: 'bg-[#dc2626]/15 border-[#dc2626]/30 text-[#dc2626]',
  'D-': 'bg-[#b91c1c]/15 border-[#b91c1c]/30 text-[#b91c1c]',
  F: 'bg-[#991b1b]/15 border-[#991b1b]/30 text-[#991b1b]',
};

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  promptInjection: { label: 'Prompt Injection', icon: FileWarning, color: '#ef4444' },
  dataExtraction: { label: 'Data Extraction', icon: Database, color: '#f97316' },
  jailbreak: { label: 'Jailbreak', icon: ShieldAlert, color: '#dc2626' },
  hallucination: { label: 'Hallucination', icon: Brain, color: '#a855f7' },
  bias: { label: 'Bias', icon: Scale, color: '#eab308' },
  harmfulContent: { label: 'Harmful Content', icon: Skull, color: '#ef4444' },
  privacyLeak: { label: 'Privacy Leak', icon: Lock, color: '#06b6d4' },
};

const CATEGORY_KEYS = Object.keys(CATEGORY_META) as (keyof CategoryScores)[];

// ══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════════════════════════

function useAnimatedNumber(target: number, duration: number = 1.5) {
  const [display, setDisplay] = useState(0);
  const motionVal = useMotionValue(0);
  const prevTarget = useRef(-1);

  useEffect(() => {
    if (prevTarget.current === target) return;
    prevTarget.current = target;
    const controls = animate(motionVal, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, duration, motionVal]);

  return display;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function TrendArrow({ direction }: { direction: string }) {
  if (direction === 'up') return <TrendingUp className="w-3.5 h-3.5 text-[#ef4444]" />;
  if (direction === 'down') return <TrendingDown className="w-3.5 h-3.5 text-[#00ff88]" />;
  return <Minus className="w-3.5 h-3.5 text-[#6b7280]" />;
}

function FragilityGauge({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 30 ? '#eab308' : '#00ff88';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={36} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <motion.circle
          cx="40" cy="40" r={36} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          initial={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset: circumference }}
          animate={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-[7px] text-muted-foreground uppercase tracking-wider">fragile</span>
      </div>
    </div>
  );
}

function CategoryBar({ value }: { value: number }) {
  const pct = Math.min((value / 100) * 100, 100);
  const color = value >= 70 ? '#ef4444' : value >= 50 ? '#f97316' : value >= 30 ? '#eab308' : '#22c55e';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
      <span className="text-[11px] font-mono w-7 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

function ModelRow({ model, rank, isExpanded, onToggle }: {
  model: LeaderboardEntry; rank: number; isExpanded: boolean; onToggle: () => void;
}) {
  const gradeBg = GRADE_BG[model.grade] || 'bg-gray-500/15 border-gray-500/30 text-gray-500';
  const totalTests = model.testsPassed + model.testsFailed;
  const failRate = totalTests > 0 ? Math.round((model.testsFailed / totalTests) * 100) : 0;

  return (
    <motion.div
      layout
      className="cyber-card rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.04 }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
      >
        <div className="w-8 text-center flex-shrink-0">
          <span className={cn(
            'text-lg font-bold font-mono',
            rank === 1 ? 'text-[#ef4444]' : rank === 2 ? 'text-[#f97316]' : rank === 3 ? 'text-[#eab308]' : 'text-muted-foreground',
          )}>#{rank}</span>
        </div>
        <FragilityGauge score={model.fragilityScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[#e6edf3] truncate">{model.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)]">{model.provider}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span>{totalTests} tests</span>
            <span className="text-[rgba(255,255,255,0.1)]">|</span>
            <span className="text-[#ef4444]">{failRate}% fail</span>
            <span className="text-[rgba(255,255,255,0.1)]">|</span>
            <span>{model.alignmentBreaks} breaks</span>
            <span className="text-[rgba(255,255,255,0.1)]">|</span>
            <span>{model.dataExtractionSuccesses} extractions</span>
          </div>
        </div>
        <div className={cn('px-3 py-1.5 rounded-lg border text-sm font-bold font-mono flex-shrink-0', gradeBg)}>
          {model.grade}
        </div>
        <div className="flex items-center gap-1 w-14 justify-center flex-shrink-0">
          <TrendArrow direction={model.trendDirection} />
          <span className="text-[10px] text-muted-foreground capitalize hidden sm:inline">{model.trendDirection}</span>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-2 border-t border-[rgba(255,255,255,0.04)]">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">Vulnerability Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                {CATEGORY_KEYS.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const Icon = meta.icon;
                  return (
                    <div key={cat} className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
                      <span className="text-[11px] text-muted-foreground w-28 flex-shrink-0">{meta.label}</span>
                      <div className="flex-1"><CategoryBar value={model.categoryScores[cat]} /></div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)] flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground">Passed:</span>
                  <span className="text-[#00ff88] font-mono font-bold">{model.testsPassed}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="text-[#ef4444] font-mono font-bold">{model.testsFailed}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground">Last tested:</span>
                  <span className="text-[#e6edf3] font-mono">{new Date(model.lastTested).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RADAR CHART (SVG)
// ══════════════════════════════════════════════════════════════════════════════

function VulnerabilityRadar({ scores, size = 240 }: { scores: CategoryScores; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 44;
  const keys = CATEGORY_KEYS;
  const n = keys.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const toPoint = (i: number, value: number) => {
    const angle = startAngle + i * angleStep;
    const dist = (value / 100) * r;
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      {[25, 50, 75, 100].map((level) => {
        const pts = keys.map((_, i) => { const p = toPoint(i, level); return `${p.x},${p.y}`; }).join(' ');
        return <polygon key={level} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {keys.map((_, i) => {
        const p = toPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
      })}
      <motion.polygon
        points={keys.map((key, i) => { const p = toPoint(i, scores[key]); return `${p.x},${p.y}`; }).join(' ')}
        fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="2"
        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }} style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {keys.map((key, i) => {
        const meta = CATEGORY_META[key];
        const angle = startAngle + i * angleStep;
        const labelR = r + 24;
        return (
          <text key={key} x={cx + Math.cos(angle) * labelR} y={cy + Math.sin(angle) * labelR}
            textAnchor="middle" dominantBaseline="middle"
            fill={meta.color} fontSize="8" fontFamily="monospace" fontWeight="600">
            {meta.label.split(' ')[0]}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r="2" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function AILeaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortField>('fragility');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ai-leaderboard?sort=${sort}&direction=${direction}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [sort, direction]);

  useEffect(() => { void fetchLeaderboard(); }, [fetchLeaderboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch('/api/ai-leaderboard', { method: 'POST' });
      const json = await res.json();
      setRefreshResult(json);
      setTimeout(() => { void fetchLeaderboard(); }, 2000);
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const avgScore = useAnimatedNumber(data?.stats.avgFragilityScore ?? 0);
  const totalBreaks = useAnimatedNumber(data?.stats.totalAlignmentBreaks ?? 0);
  const totalExtractions = useAnimatedNumber(data?.stats.totalDataExtractions ?? 0);
  const totalTests = useAnimatedNumber(data?.stats.totalTestsRun ?? 0);

  const sortedModels = useMemo(() => {
    if (!data?.models) return [];
    const models = [...data.models];
    const GO: Record<string, number> = { 'A+': 1, A: 2, 'A-': 3, 'B+': 4, B: 5, 'B-': 6, 'C+': 7, C: 8, 'C-': 9, 'D+': 10, D: 11, 'D-': 12, F: 13 };
    const dir = direction === 'asc' ? 1 : -1;
    if (sort === 'fragility') models.sort((a, b) => (b.fragilityScore - a.fragilityScore) * dir);
    else if (sort === 'grade') models.sort((a, b) => ((GO[a.grade] ?? 99) - (GO[b.grade] ?? 99)) * dir);
    else models.sort((a, b) => a.name.localeCompare(b.name) * dir);
    return models;
  }, [data?.models, sort, direction]);

  const handleShare = () => {
    const text = `⚔️ HALL OF BROKEN MODELS\n\nAI Fragility Index: ${avgScore}/100\n${data?.stats.totalAlignmentBreaks} alignment breaks across ${data?.models.length} models\n\nMost fragile: ${sortedModels[0]?.name} (${sortedModels[0]?.fragilityScore})\nMost robust: ${sortedModels[sortedModels.length - 1]?.name} (${sortedModels[sortedModels.length - 1]?.fragilityScore})\n\n#AI #RedTeaming #AISafety @ReconPro`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const avgCategoryScores = useMemo((): CategoryScores | null => {
    if (!data?.models.length) return null;
    const sums = { promptInjection: 0, dataExtraction: 0, jailbreak: 0, hallucination: 0, bias: 0, harmfulContent: 0, privacyLeak: 0 };
    for (const m of data.models) { for (const k of CATEGORY_KEYS) { sums[k] += m.categoryScores[k]; } }
    const n = data.models.length;
    return { promptInjection: Math.round(sums.promptInjection / n), dataExtraction: Math.round(sums.dataExtraction / n), jailbreak: Math.round(sums.jailbreak / n), hallucination: Math.round(sums.hallucination / n), bias: Math.round(sums.bias / n), harmfulContent: Math.round(sums.harmfulContent / n), privacyLeak: Math.round(sums.privacyLeak / n) };
  }, [data?.models]);

  // ── Loading state ──
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <Ghost className="w-10 h-10 text-[#00ff88]" />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#e6edf3]">Initializing GORGON Scan Engine...</p>
              <p className="text-xs text-muted-foreground mt-1">Probing AI model defenses</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ HERO SECTION — AI FRAGILITY INDEX ═══ */}
      <div className="relative overflow-hidden rounded-2xl border border-[rgba(239,68,68,0.15)] bg-gradient-to-br from-[#0a0a0a] via-[#0d0d12] to-[#0a0a0a]">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />

        <div className="relative px-6 py-8 sm:px-10 sm:py-12">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 mb-3">
                <div className="px-2.5 py-1 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]">
                  <span className="text-[10px] font-bold font-mono text-[#ef4444] tracking-wider">GORGON/OBLIVION v3.0</span>
                </div>
                {data?.isSimulated && (
                  <div className="px-2.5 py-1 rounded-lg bg-[rgba(234,179,8,0.1)] border border-[rgba(234,179,8,0.2)]">
                    <span className="text-[10px] font-bold font-mono text-[#eab308] tracking-wider">DEMO MODE</span>
                  </div>
                )}
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
                Hall of <span className="text-[#ef4444]" style={{ textShadow: '0 0 30px rgba(239,68,68,0.3)' }}>Broken</span> Models
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
                Live, uncensored AI vulnerability scoreboard. Every frontier model stress-tested with {data?.stats.totalTestsRun ?? 0}+ adversarial probes across 7 attack categories.
              </motion.p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-[#e6edf3] hover:border-[rgba(0,255,136,0.2)] transition-colors"
              >
                <Share2 className="w-4 h-4" />
                {copied ? 'Copied!' : 'Share'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-sm text-[#ef4444] hover:bg-[rgba(239,68,68,0.15)] transition-colors disabled:opacity-50"
              >
                <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
                {refreshing ? 'Scanning...' : 'New Scan'}
              </motion.button>
            </div>
          </div>

          {/* Giant animated fragility counter */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="relative">
              <motion.div
                className="absolute -inset-8 rounded-full"
                animate={{ boxShadow: [
                  '0 0 60px rgba(239,68,68,0.1), 0 0 120px rgba(239,68,68,0.05)',
                  '0 0 80px rgba(239,68,68,0.15), 0 0 160px rgba(239,68,68,0.08)',
                  '0 0 60px rgba(239,68,68,0.1), 0 0 120px rgba(239,68,68,0.05)',
                ] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="text-center">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">AI Fragility Index</div>
                <div className="text-7xl sm:text-8xl font-black font-mono" style={{
                  color: avgScore >= 60 ? '#ef4444' : avgScore >= 40 ? '#f97316' : '#eab308',
                  textShadow: `0 0 40px ${avgScore >= 60 ? 'rgba(239,68,68,0.3)' : avgScore >= 40 ? 'rgba(249,115,22,0.3)' : 'rgba(234,179,8,0.3)'}`,
                }}>
                  {avgScore}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">out of 100 — industry average</div>
              </div>
            </div>
          </motion.div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Tests', value: totalTests, icon: Target, color: '#00ff88' },
              { label: 'Alignment Breaks', value: totalBreaks, icon: ShieldAlert, color: '#ef4444' },
              { label: 'Data Extractions', value: totalExtractions, icon: Database, color: '#f97316' },
              { label: 'Models Tested', value: data?.stats.totalModelsTested ?? 0, icon: Brain, color: '#a855f7' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value.toLocaleString()}</div>
              </motion.div>
            ))}
          </div>

          {/* Refresh result toast */}
          <AnimatePresence>
            {refreshResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mt-4 px-4 py-3 rounded-xl bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.15)] flex items-center gap-3"
              >
                <Radio className="w-4 h-4 text-[#eab308] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#eab308]">Scan Cycle Initiated</div>
                  <div className="text-[11px] text-muted-foreground">Job: {refreshResult.jobId} — {refreshResult.message}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ MIDDLE SECTION — Radar + Category Breakdown ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar chart */}
        <div className="cyber-card rounded-xl p-5 flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">Average Vulnerability Profile</h3>
          {avgCategoryScores ? (
            <VulnerabilityRadar scores={avgCategoryScores} size={240} />
          ) : (
            <div className="text-xs text-muted-foreground py-8">No data</div>
          )}
        </div>

        {/* Category averages bar chart */}
        <div className="lg:col-span-2 cyber-card rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-5">Category Averages (All Models)</h3>
          <div className="space-y-3">
            {CATEGORY_KEYS.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const val = avgCategoryScores?.[cat] ?? 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}15` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground w-32 flex-shrink-0">{meta.label}</span>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${meta.color}66, ${meta.color})` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${val}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold w-8 text-right" style={{ color: meta.color }}>{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ SORT CONTROLS + LEADERBOARD ═══ */}
      <div className="space-y-3">
        {/* Sort bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sword className="w-4 h-4 text-[#ef4444]" />
            <span className="text-sm font-semibold text-[#e6edf3]">Leaderboard</span>
            <span className="text-[10px] text-muted-foreground font-mono">({sortedModels.length} models)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sort:</span>
            {(['fragility', 'grade', 'name'] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => { if (sort === field) setDirection(d => d === 'asc' ? 'desc' : 'asc'); else setSort(field); }}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors',
                  sort === field
                    ? 'bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88]'
                    : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-muted-foreground hover:text-[#e6edf3]',
                )}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {sort === field && (direction === 'asc' ? ' ↑' : ' ↓')}
              </button>
            ))}
          </div>
        </div>

        {/* Model rows */}
        <div className="space-y-2">
          {sortedModels.map((model, i) => (
            <ModelRow
              key={model.name}
              model={model}
              rank={i + 1}
              isExpanded={expandedModel === model.name}
              onToggle={() => setExpandedModel(prev => prev === model.name ? null : model.name)}
            />
          ))}
        </div>
      </div>

      {/* ═══ BOTTOM — Provider Comparison ═══ */}
      <div className="cyber-card rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">Provider Fragility Comparison</h3>
        <div className="space-y-3">
          {(() => {
            const byProvider: Record<string, { total: number; count: number; names: string[] }> = {};
            for (const m of (data?.models ?? [])) {
              if (!byProvider[m.provider]) byProvider[m.provider] = { total: 0, count: 0, names: [] };
              byProvider[m.provider].total += m.fragilityScore;
              byProvider[m.provider].count += 1;
              byProvider[m.provider].names.push(m.name);
            }
            return Object.entries(byProvider)
              .map(([provider, d]) => ({ provider, avg: Math.round(d.total / d.count), models: d.names }))
              .sort((a, b) => b.avg - a.avg)
              .map(({ provider, avg, models }) => {
                const color = avg >= 60 ? '#ef4444' : avg >= 45 ? '#f97316' : '#00ff88';
                return (
                  <div key={provider} className="flex items-center gap-4">
                    <span className="text-sm text-[#e6edf3] w-24 flex-shrink-0 font-medium">{provider}</span>
                    <div className="flex-1 h-4 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full flex items-center px-2"
                        style={{ background: `linear-gradient(90deg, ${color}44, ${color})` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${avg}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      >
                        <span className="text-[10px] font-mono font-bold text-white drop-shadow-sm">{avg}</span>
                      </motion.div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono w-32 text-right truncate">{models.join(', ')}</span>
                  </div>
                );
              });
          })()}
        </div>
      </div>

      {/* ═══ FOOTER — Methodology note ═══ */}
      <div className="rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#06b6d4] flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-[#e6edf3]">Methodology:</span> Each model is tested with {data?.stats.totalTestsRun ? Math.round((data?.stats.totalTestsRun) / (data?.models.length || 1)) : 400}+ adversarial prompts across 7 categories:
          prompt injection, data extraction, jailbreak, hallucination, bias, harmful content generation, and privacy leakage.
          Fragility Score (0-100) represents the percentage of tests that successfully broke the model's safety guardrails.
          {data?.isSimulated && ' Currently running in DEMO MODE with simulated data. Connect LLM API keys for real red-teaming results.'}
        </div>
      </div>
    </div>
  );
}
