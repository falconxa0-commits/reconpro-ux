'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, Shield, ShieldAlert, Target, Clock, Activity,
  AlertTriangle, BarChart3, GitBranch, Layers, Cpu, Eye,
  Crosshair, Play, RotateCcw, ArrowRight, CheckCircle,
  XCircle, AlertOctagon, TrendingDown, TrendingUp, Gauge,
  Flame, Skull, Radio,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

interface ModelInfo {
  id: string; name: string; provider: string;
  contextWindow: number; safetyFeatures: string[];
}

interface AttackTypeInfo {
  name: string; category: string; difficulty: string; description: string;
}

interface AttackResult {
  attackKey: string; name: string; category: string; difficulty: string;
  status: 'PASS' | 'BYPASSED' | 'PARTIAL'; severity: string;
  timeMs: number; responseSnippet: string; timestamp: string;
}

interface TimelineEntry {
  step: number; attackKey: string; name: string;
  status: string; latencyMs: number; startedAt: string; completedAt: string;
}

interface DefenseRec {
  title: string; description: string; priority: string;
  blocksPercent: number; category: string;
}

interface ScanResult {
  success: boolean; scanId: string; modelId: string; modelName: string;
  provider: string; intensity: string; timestamp: string;
  attacksRun: number;
  metrics: {
    coherence: number; coherenceBaseline: number; coherenceDelta: number;
    safetyViolations: number; avgLatencyMs: number; baselineLatencyMs: number;
    latencyDegradationPct: number; tokenEfficiency: number;
  };
  categoryScores: Record<string, number>;
  results: AttackResult[];
  summary: { passed: number; bypassed: number; partial: number; total: number; overallScore: number };
  defenses: DefenseRec[];
  totalBlocksPercent: number;
  timeline: TimelineEntry[];
}

interface LeaderboardEntry {
  modelId: string; modelName: string; provider: string;
  overallScore: number; coherence: number; safetyViolations: number;
  avgLatencyMs: number; tokenEfficiency: number;
  passed: number; bypassed: number; partial: number;
  categoryScores: Record<string, number>;
  dreadRating: string;
}

// ══════════════════════════════════════════════════════════════════
// THEME CONSTANTS
// ══════════════════════════════════════════════════════════════════

const CYAN = '#06b6d4';
const MAGENTA = '#d946ef';
const NEON_GREEN = '#44aaff';
const DANGER_RED = '#ff3355';
const WARN_YELLOW = '#ffaa00';
const BG_DARK = '#000000';
const BG_CARD = '#0f1119';
const BG_CARD_HOVER = '#141825';
const BORDER_DIM = 'rgba(6, 182, 212, 0.15)';

const STATUS_COLORS: Record<string, string> = {
  PASS: '#22c55e', BYPASSED: '#ff3355', PARTIAL: '#ffaa00',
};

const CATEGORY_COLORS: Record<string, string> = {
  injection: '#06b6d4', jailbreak: '#d946ef', stress: '#ff8844',
  extraction: '#ff3355', advanced: '#888888',
};

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: '#00cc66', Anthropic: '#d946ef', Google: '#3b82f6',
  Meta: '#06b6d4', Mistral: '#ff8844', DeepSeek: '#64748b',
  Alibaba: '#ffaa00', Cohere: '#888888',
};

const TABS = [
  { id: 'config', label: 'Configure', icon: Target },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'results', label: 'Attack Results', icon: Crosshair },
  { id: 'comparison', label: 'Comparison', icon: Layers },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'defenses', label: 'Defenses', icon: Shield },
  { id: 'partner', label: 'Partnership', icon: Zap },
];

const CATEGORY_GROUPS = [
  { key: 'injection', label: 'Injection', color: CATEGORY_COLORS.injection },
  { key: 'jailbreak', label: 'Jailbreak', color: CATEGORY_COLORS.jailbreak },
  { key: 'stress', label: 'Stress', color: CATEGORY_COLORS.stress },
  { key: 'extraction', label: 'Extraction', color: CATEGORY_COLORS.extraction },
  { key: 'advanced', label: 'Advanced', color: CATEGORY_COLORS.advanced },
];

// ══════════════════════════════════════════════════════════════════
// SVG GAUGE COMPONENT
// ══════════════════════════════════════════════════════════════════

function GaugeRing({ value, max, color, size = 100, strokeWidth = 6, label, unit }: {
  value: number; max: number; color: string; size?: number; strokeWidth?: number;
  label: string; unit?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circ * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: 'easeOut' as const }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold" style={{ color }}>{value}{unit}</span>
      </div>
      <span className="text-xs text-gray-400 mt-1">{label}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SVG RADAR CHART
// ══════════════════════════════════════════════════════════════════

function RadarChart({ models, highlightId, onHighlight }: {
  models: LeaderboardEntry[]; highlightId: string | null; onHighlight: (id: string | null) => void;
}) {
  const axes = ['injection', 'jailbreak', 'stress', 'extraction', 'advanced'];
  const cx = 200, cy = 200, R = 160;
  const n = axes.length;

  function getPoint(idx: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const r = (value / 100) * R;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function polyPoints(scores: Record<string, number>): string {
    return axes.map((a, i) => { const [x, y] = getPoint(i, scores[a] ?? 0); return `${x},${y}`; }).join(' ');
  }

  return (
    <div className="relative">
      <svg viewBox="0 0 400 400" className="w-full max-w-lg mx-auto">
        {/* Grid rings */}
        {[20, 40, 60, 80, 100].map(v => {
          const pts = axes.map((_, i) => { const [x, y] = getPoint(i, v); return `${x},${y}`; }).join(' ');
          return <polygon key={v} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
        })}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const [x, y] = getPoint(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
        })}
        {/* Axis labels */}
        {axes.map((a, i) => {
          const [x, y] = getPoint(i, 118);
          return (
            <text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fill="#9ca3af" fontSize="11" fontWeight="600">
              {a.toUpperCase()}
            </text>
          );
        })}
        {/* Model polygons */}
        {models.map(m => {
          const col = PROVIDER_COLORS[m.provider] || '#06b6d4';
          const isHighlighted = !highlightId || highlightId === m.modelId;
          return (
            <g key={m.modelId} style={{ cursor: 'pointer', opacity: isHighlighted ? 1 : 0.2, transition: 'opacity 0.3s' }}
              onClick={() => onHighlight(highlightId === m.modelId ? null : m.modelId)}>
              <polygon points={polyPoints(m.categoryScores)} fill={`${col}18`} stroke={col} strokeWidth={2} />
              {axes.map((a, i) => {
                const [x, y] = getPoint(i, m.categoryScores[a] ?? 0);
                return <circle key={a} cx={x} cy={y} r={3} fill={col} />;
              })}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {models.map(m => (
          <button key={m.modelId} onClick={() => onHighlight(highlightId === m.modelId ? null : m.modelId)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${
              highlightId === m.modelId ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
            }`}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PROVIDER_COLORS[m.provider] || CYAN }} />
            <span className="text-gray-300">{m.modelName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export function CognitiveDreadPanel() {
  const [activeTab, setActiveTab] = useState('config');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [attackTypes, setAttackTypes] = useState<Record<string, AttackTypeInfo>>({});
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedAttacks, setSelectedAttacks] = useState<Set<string>>(new Set());
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'aggressive'>('moderate');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [highlightModel, setHighlightModel] = useState<string | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [timelineStep, setTimelineStep] = useState(-1);
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerMsg, setPartnerMsg] = useState('');

  // Fetch models & attack types on mount
  useEffect(() => {
    fetch('/api/cognitive-dread?action=models')
      .then(r => r.json()).then(d => {
        setModels(d.models || []);
        setAttackTypes(d.attackTypes || {});
        setSelectedAttacks(new Set(Object.keys(d.attackTypes || {})));
      });
  }, []);

  const runScan = useCallback(async (modelId?: string) => {
    const target = modelId || selectedModel;
    if (!target || selectedAttacks.size === 0) return;
    setScanning(true);
    setScanResult(null);
    setActiveTab('dashboard');
    try {
      const res = await fetch('/api/cognitive-dread?action=scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: target, attackTypes: [...selectedAttacks], intensity }),
      });
      const data = await res.json();
      if (data.success) setScanResult(data);
    } finally { setScanning(false); }
  }, [selectedModel, selectedAttacks, intensity]);

  const loadLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    setActiveTab('comparison');
    try {
      const res = await fetch('/api/cognitive-dread?action=leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } finally { setLoadingLeaderboard(false); }
  }, []);

  const toggleAttack = (key: string) => {
    setSelectedAttacks(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const selectAllAttacks = () => setSelectedAttacks(new Set(Object.keys(attackTypes)));
  const clearAllAttacks = () => setSelectedAttacks(new Set());

  // Auto-advance timeline
  useEffect(() => {
    if (activeTab !== 'timeline' || !scanResult || timelineStep >= scanResult.timeline.length - 1) return;
    if (timelineStep < 0) { setTimelineStep(0); return; }
    const timer = setTimeout(() => setTimelineStep(s => s + 1), 600);
    return () => clearTimeout(timer);
  }, [activeTab, timelineStep, scanResult]);

  const statusIcon = (s: string) => {
    if (s === 'PASS') return <CheckCircle size={14} className="text-green-400" />;
    if (s === 'BYPASSED') return <XCircle size={14} className="text-rose-400" />;
    return <AlertOctagon size={14} className="text-yellow-400" />;
  };

  const diffBadge = (d: string) => {
    const c: Record<string, string> = { easy: 'bg-green-900/40 text-green-400', medium: 'bg-yellow-900/40 text-yellow-400', hard: 'bg-orange-900/40 text-orange-400', expert: 'bg-red-900/40 text-red-400' };
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${c[d] || c.medium}`}>{d}</span>;
  };

  const dreadRatingColor = (r: string) => {
    if (r === 'FORTRESS') return '#22c55e';
    if (r === 'RESILIENT') return '#06b6d4';
    if (r === 'VULNERABLE') return '#ff8844';
    return '#ff3355';
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen" style={{ background: BG_DARK }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="border-b" style={{ borderColor: BORDER_DIM, background: 'linear-gradient(135deg, rgba(6,182,212,0.05), rgba(217,70,239,0.05))' }}>
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center gap-4">
          <div className="relative">
            <Brain size={32} style={{ color: CYAN }} className="animate-pulse" />
            <Radio size={14} style={{ color: MAGENTA }} className="absolute -top-1 -right-1 animate-ping" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span style={{ color: CYAN }}>COGNITIVE</span>{' '}
              <span style={{ color: MAGENTA }}>DREAD</span>{' '}
              <span className="text-gray-500 font-normal text-sm ml-2">Omni-Model Stress Framework</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">The evolution of GORGON/OBLIVION — Systematic cognitive alignment suppression testing</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1 border-b pt-3" style={{ borderColor: BORDER_DIM }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
                  active ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`} style={active ? { color: CYAN } : {}}>
                <Icon size={13} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">

          {/* ═══════════════ CONFIG TAB ════════════════════════════ */}
          {activeTab === 'config' && (
            <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Model Selector */}
                <div className="lg:col-span-1 rounded-lg border p-5" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Cpu size={14} style={{ color: CYAN }} />Target Model</h3>
                  <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                    className="w-full rounded-md px-3 py-2.5 text-sm border focus:outline-none focus:ring-1"
                    style={{ background: '#0c0e17', borderColor: BORDER_DIM, color: '#e5e7eb' }}>
                    <option value="">Select a model…</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.provider} ({(m.contextWindow / 1000).toFixed(0)}K ctx)
                      </option>
                    ))}
                  </select>
                  {selectedModel && (() => {
                    const m = models.find(x => x.id === selectedModel);
                    if (!m) return null;
                    return (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: PROVIDER_COLORS[m.provider] || CYAN }} />
                          <span className="text-xs font-medium" style={{ color: PROVIDER_COLORS[m.provider] }}>{m.provider}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Context: {m.contextWindow.toLocaleString()} tokens</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.safetyFeatures.map(f => (
                            <span key={f} className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-900/20 text-cyan-400 border border-cyan-800/30">{f}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Attack Types */}
                <div className="lg:col-span-2 rounded-lg border p-5" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Crosshair size={14} style={{ color: MAGENTA }} />Attack Vectors</h3>
                    <div className="flex gap-2">
                      <button onClick={selectAllAttacks} className="text-[10px] px-2 py-1 rounded bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50">Select All</button>
                      <button onClick={clearAllAttacks} className="text-[10px] px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50">Clear</button>
                    </div>
                  </div>
                  {CATEGORY_GROUPS.map(g => (
                    <div key={g.key} className="mb-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: g.color }}>{g.label}</span>
                        <span className="text-[10px] text-gray-600">
                          ({Object.entries(attackTypes).filter(([_, v]) => v.category === g.key).length})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-3">
                        {Object.entries(attackTypes).filter(([_, v]) => v.category === g.key).map(([key, atk]) => (
                          <label key={key} className={`flex items-start gap-2 px-2.5 py-2 rounded cursor-pointer border transition-all ${
                            selectedAttacks.has(key) ? 'border-cyan-700/50 bg-cyan-950/20' : 'border-transparent hover:bg-white/[0.02]'
                          }`}>
                            <input type="checkbox" checked={selectedAttacks.has(key)} onChange={() => toggleAttack(key)}
                              className="mt-0.5 rounded border-gray-600 bg-transparent accent-cyan-500" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-gray-200">{atk.name}</span>
                                {diffBadge(atk.difficulty)}
                              </div>
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{atk.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Intensity + Launch */}
              <div className="mt-6 rounded-lg border p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
                style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                <div className="flex items-center gap-4">
                  <Flame size={18} style={{ color: intensity === 'aggressive' ? DANGER_RED : intensity === 'moderate' ? WARN_YELLOW : NEON_GREEN }} />
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Intensity Level</p>
                    <div className="flex gap-2">
                      {(['light', 'moderate', 'aggressive'] as const).map(l => (
                        <button key={l} onClick={() => setIntensity(l)}
                          className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                            intensity === l ? 'ring-1 ring-offset-1 ring-offset-[#000000]' : 'text-gray-500 hover:text-gray-300'
                          }`}
                          style={intensity === l ? {
                            background: l === 'light' ? 'rgba(34,211,238,0.15)' : l === 'moderate' ? 'rgba(250,204,21,0.15)' : 'rgba(244,63,94,0.15)',
                            color: l === 'light' ? NEON_GREEN : l === 'moderate' ? WARN_YELLOW : DANGER_RED,

                          } : {}}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={loadLeaderboard}
                    className="px-4 py-2.5 rounded-lg text-xs font-bold border transition-all hover:bg-white/5 flex items-center gap-2"
                    style={{ borderColor: BORDER_DIM, color: MAGENTA }}>
                    <Layers size={14} />COMPARE ALL MODELS
                  </button>
                  <button onClick={() => runScan()} disabled={scanning || !selectedModel || selectedAttacks.size === 0}
                    className="px-6 py-2.5 rounded-lg text-xs font-bold text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 relative overflow-hidden"
                    style={{
                      background: scanning
                        ? 'linear-gradient(90deg, #06b6d4, #d946ef, #06b6d4)'
                        : 'linear-gradient(135deg, #06b6d4, #d946ef)',
                      backgroundSize: scanning ? '200% 100%' : '100% 100%',
                      animation: scanning ? 'shimmer 1.5s linear infinite' : 'none',
                    }}>
                    {scanning ? <><RotateCcw size={14} className="animate-spin" />SCANNING…</> : <><Play size={14} />LAUNCH STRESS TEST</>}
                  </button>
                </div>
              </div>
              <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
            </motion.div>
          )}

          {/* ═══════════════ DASHBOARD TAB ═════════════════════════ */}
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {scanning && !scanResult && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="relative">
                    <Skull size={48} style={{ color: MAGENTA }} className="animate-pulse" />
                    <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(217,70,239,0.2)' }} />
                  </div>
                  <p className="text-sm text-gray-400 animate-pulse">Initiating cognitive stress sequence…</p>
                </div>
              )}
              {scanResult && (
                <>
                  {/* Scan header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-white">{scanResult.modelName}</h2>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{ background: `${PROVIDER_COLORS[scanResult.provider] || CYAN}20`, color: PROVIDER_COLORS[scanResult.provider] || CYAN }}>
                          {scanResult.provider}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 text-gray-400">{scanResult.intensity}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Scan {scanResult.scanId} — {scanResult.attacksRun} attacks — {new Date(scanResult.timestamp).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setActiveTab('results')} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
                      View Details <ArrowRight size={12} />
                    </button>
                  </div>

                  {/* 4 Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Coherence */}
                    <div className="rounded-lg border p-4 flex flex-col items-center" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                      <div className="relative">
                        <GaugeRing value={scanResult.metrics.coherence} max={100}
                          color={scanResult.metrics.coherence >= 80 ? '#22c55e' : scanResult.metrics.coherence >= 50 ? '#ffaa00' : '#ff3355'}
                          label="Coherence" />
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {scanResult.metrics.coherenceDelta >= 0
                          ? <TrendingUp size={12} className="text-green-400" />
                          : <TrendingDown size={12} className="text-red-400" />}
                        <span className={`text-[10px] ${scanResult.metrics.coherenceDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {scanResult.metrics.coherenceDelta >= 0 ? '+' : ''}{scanResult.metrics.coherenceDelta} vs baseline ({scanResult.metrics.coherenceBaseline})
                        </span>
                      </div>
                    </div>
                    {/* Safety Violations */}
                    <div className="rounded-lg border p-4 flex flex-col items-center" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                      <div className="relative">
                        <GaugeRing value={scanResult.metrics.safetyViolations} max={scanResult.attacksRun}
                          color={scanResult.metrics.safetyViolations === 0 ? '#22c55e' : scanResult.metrics.safetyViolations <= 3 ? '#ffaa00' : '#ff3355'}
                          label="Violations" />
                      </div>
                      <span className="text-[10px] text-gray-500 mt-2">of {scanResult.attacksRun} attacks bypassed</span>
                    </div>
                    {/* Latency */}
                    <div className="rounded-lg border p-4 flex flex-col items-center" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                      <div className="relative">
                        <GaugeRing value={scanResult.metrics.avgLatencyMs} max={3000}
                          color={scanResult.metrics.latencyDegradationPct > 100 ? '#ff3355' : scanResult.metrics.latencyDegradationPct > 50 ? '#ffaa00' : '#06b6d4'}
                          label="Avg Latency" unit="ms" />
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {scanResult.metrics.latencyDegradationPct > 0
                          ? <TrendingUp size={12} className="text-red-400" />
                          : <TrendingDown size={12} className="text-green-400" />}
                        <span className={`text-[10px] ${scanResult.metrics.latencyDegradationPct > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {scanResult.metrics.latencyDegradationPct > 0 ? '+' : ''}{scanResult.metrics.latencyDegradationPct}% degradation
                        </span>
                      </div>
                    </div>
                    {/* Token Efficiency */}
                    <div className="rounded-lg border p-4 flex flex-col items-center" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                      <div className="relative">
                        <GaugeRing value={scanResult.metrics.tokenEfficiency} max={100}
                          color={scanResult.metrics.tokenEfficiency >= 80 ? '#22c55e' : scanResult.metrics.tokenEfficiency >= 50 ? '#ffaa00' : '#ff3355'}
                          label="Token Efficiency" unit="%" />
                      </div>
                      <span className="text-[10px] text-gray-500 mt-2">meaningful tokens vs total</span>
                    </div>
                  </div>

                  {/* Summary bar */}
                  <div className="rounded-lg border p-4 flex flex-wrap items-center gap-6" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-400" />
                      <span className="text-sm text-gray-300"><span className="font-bold text-green-400">{scanResult.summary.passed}</span> Passed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="text-rose-400" />
                      <span className="text-sm text-gray-300"><span className="font-bold text-rose-400">{scanResult.summary.bypassed}</span> Bypassed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertOctagon size={16} className="text-yellow-400" />
                      <span className="text-sm text-gray-300"><span className="font-bold text-yellow-400">{scanResult.summary.partial}</span> Partial</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Activity size={14} className="text-gray-500" />
                      <span className="text-sm font-bold" style={{ color: scanResult.summary.overallScore >= 80 ? '#22c55e' : scanResult.summary.overallScore >= 50 ? '#ffaa00' : '#ff3355' }}>
                        {scanResult.summary.overallScore}% Overall
                      </span>
                    </div>
                  </div>
                </>
              )}
              {!scanning && !scanResult && (
                <div className="text-center py-20 text-gray-500 text-sm">Run a stress test to see metrics</div>
              )}
            </motion.div>
          )}

          {/* ═══════════════ RESULTS TAB ═══════════════════════════ */}
          {activeTab === 'results' && scanResult && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-lg border overflow-hidden" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: BORDER_DIM }}>
                        <th className="text-left px-4 py-3 text-gray-400 font-semibold">Attack</th>
                        <th className="text-left px-3 py-3 text-gray-400 font-semibold">Category</th>
                        <th className="text-left px-3 py-3 text-gray-400 font-semibold">Difficulty</th>
                        <th className="text-center px-3 py-3 text-gray-400 font-semibold">Result</th>
                        <th className="text-center px-3 py-3 text-gray-400 font-semibold">Severity</th>
                        <th className="text-right px-3 py-3 text-gray-400 font-semibold">Time</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-semibold">Response Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.results.map(r => (
                        <Fragment key={r.attackKey}>
                          <tr className="border-b cursor-pointer hover:bg-white/[0.02] transition-colors"
                            style={{ borderColor: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${STATUS_COLORS[r.status]}` }}
                            onClick={() => setExpandedRow(expandedRow === r.attackKey ? null : r.attackKey)}>
                            <td className="px-4 py-3 text-gray-200 font-medium">{r.name}</td>
                            <td className="px-3 py-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                                style={{ background: `${CATEGORY_COLORS[r.category] || CYAN}20`, color: CATEGORY_COLORS[r.category] || CYAN }}>
                                {r.category}
                              </span>
                            </td>
                            <td className="px-3 py-3">{diffBadge(r.difficulty)}</td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 font-bold" style={{ color: STATUS_COLORS[r.status] }}>
                                {statusIcon(r.status)} {r.status}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-[10px] font-bold uppercase ${
                                r.severity === 'critical' ? 'text-red-400' : r.severity === 'high' ? 'text-orange-400' : r.severity === 'medium' ? 'text-yellow-400' : 'text-gray-500'
                              }`}>{r.severity}</span>
                            </td>
                            <td className="px-3 py-3 text-right text-gray-400 font-mono">{r.timeMs}ms</td>
                            <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.responseSnippet}</td>
                          </tr>
                          <tr key={`${r.attackKey}-exp`}>
                            <td colSpan={7} className="p-0">
                              <AnimatePresence>
                                {expandedRow === r.attackKey && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden">
                                    <div className="px-6 py-4 bg-black/30 text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
                                      {r.responseSnippet}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ COMPARISON TAB ════════════════════════ */}
          {activeTab === 'comparison' && (
            <motion.div key="comparison" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loadingLeaderboard && (
                <div className="text-center py-20 text-gray-500 text-sm animate-pulse">Generating multi-model comparison…</div>
              )}
              {!loadingLeaderboard && leaderboard.length > 0 && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Radar Chart */}
                    <div className="rounded-lg border p-5" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Eye size={14} style={{ color: CYAN }} />Category Resistance Profile</h3>
                      <RadarChart models={leaderboard} highlightId={highlightModel} onHighlight={setHighlightModel} />
                    </div>
                    {/* Leaderboard Table */}
                    <div className="rounded-lg border overflow-hidden" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                      <div className="px-4 py-3 border-b" style={{ borderColor: BORDER_DIM }}>
                        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><BarChart3 size={14} style={{ color: MAGENTA }} />Model Leaderboard</h3>
                      </div>
                      <div className="overflow-y-auto max-h-[500px]">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0" style={{ background: BG_CARD }}>
                            <tr className="border-b" style={{ borderColor: BORDER_DIM }}>
                              <th className="text-left px-4 py-2 text-gray-400 font-semibold">#</th>
                              <th className="text-left px-3 py-2 text-gray-400 font-semibold">Model</th>
                              <th className="text-center px-3 py-2 text-gray-400 font-semibold">Score</th>
                              <th className="text-center px-3 py-2 text-gray-400 font-semibold">Rating</th>
                              <th className="text-center px-3 py-2 text-gray-400 font-semibold">P/B/P</th>
                              <th className="text-right px-3 py-2 text-gray-400 font-semibold">Coherence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaderboard.map((m, i) => (
                              <tr key={m.modelId} className="border-b cursor-pointer hover:bg-white/[0.02] transition-colors"
                                style={{ borderColor: 'rgba(255,255,255,0.04)', opacity: !highlightModel || highlightModel === m.modelId ? 1 : 0.3 }}
                                onClick={() => setHighlightModel(highlightModel === m.modelId ? null : m.modelId)}>
                                <td className="px-4 py-2.5 text-gray-500 font-mono">{i + 1}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: PROVIDER_COLORS[m.provider] || CYAN }} />
                                    <span className="text-gray-200 font-medium">{m.modelName}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold" style={{ color: m.overallScore >= 80 ? '#22c55e' : m.overallScore >= 50 ? '#ffaa00' : '#ff3355' }}>{m.overallScore}%</td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className="font-bold text-[10px] uppercase" style={{ color: dreadRatingColor(m.dreadRating) }}>{m.dreadRating}</span>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono text-gray-400">
                                  <span className="text-green-400">{m.passed}</span>{'/' + ''}<span className="text-rose-400">{m.bypassed}</span>{'/' + ''}<span className="text-yellow-400">{m.partial}</span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-gray-400">{m.coherence}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ═══════════════ TIMELINE TAB ══════════════════════════ */}
          {activeTab === 'timeline' && scanResult && (
            <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-lg border p-5 mb-4" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Clock size={14} style={{ color: CYAN }} />Attack Sequence Timeline</h3>
                <div className="flex items-end gap-2 h-48 overflow-x-auto pb-4 px-2">
                  {scanResult.timeline.map((t, i) => {
                    const maxLat = Math.max(...scanResult.timeline.map(x => x.latencyMs), 1);
                    const barH = Math.max(20, (t.latencyMs / maxLat) * 160);
                    const active = i <= timelineStep;
                    const current = i === timelineStep;
                    return (
                      <div key={t.step} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 80 }}>
                        <span className="text-[10px] font-mono text-gray-500">{t.latencyMs}ms</span>
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: active ? barH : 4 }}
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                          className={`w-10 rounded-t-sm ${current ? 'ring-1 ring-white/30' : ''}`}
                          style={{
                            background: active
                              ? t.status === 'PASS' ? '#22c55e40' : t.status === 'BYPASSED' ? '#ff335540' : '#ffaa0040'
                              : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${active ? STATUS_COLORS[t.status] || '#333' : 'transparent'}`,
                          }}
                        />
                        <div className={`w-3 h-3 rounded-full border-2 ${current ? 'animate-pulse' : ''}`}
                          style={{
                            borderColor: active ? STATUS_COLORS[t.status] || '#555' : '#333',
                            background: active ? STATUS_COLORS[t.status] || '#555' : 'transparent',
                          }} />
                        <span className="text-[9px] text-gray-500 text-center leading-tight max-w-[75px] truncate" title={t.name}>{t.name}</span>
                        <span className="text-[9px] text-gray-600">#{t.step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Current attack detail */}
              {timelineStep >= 0 && timelineStep < scanResult.results.length && (
                <motion.div key={timelineStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg border p-4" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                  <div className="flex items-center gap-3 mb-2">
                    {statusIcon(scanResult.results[timelineStep].status)}
                    <span className="text-sm font-bold text-gray-200">{scanResult.results[timelineStep].name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{ background: `${CATEGORY_COLORS[scanResult.results[timelineStep].category] || CYAN}20`, color: CATEGORY_COLORS[scanResult.results[timelineStep].category] || CYAN }}>
                      {scanResult.results[timelineStep].category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono leading-relaxed">{scanResult.results[timelineStep].responseSnippet}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══════════════ DEFENSES TAB ══════════════════════════ */}
          {activeTab === 'defenses' && scanResult && (
            <motion.div key="defenses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Summary banner */}
              <div className="rounded-lg border p-5 mb-6" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(217,70,239,0.08))', borderColor: BORDER_DIM }}>
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert size={20} style={{ color: MAGENTA }} />
                  <h3 className="text-sm font-bold text-white">Defense Recommendations for {scanResult.modelName}</h3>
                </div>
                <p className="text-xs text-gray-400">
                  Implement these <span className="font-bold text-cyan-400">{scanResult.defenses.length} defenses</span> to block{' '}
                  <span className="font-bold" style={{ color: scanResult.totalBlocksPercent >= 90 ? '#22c55e' : scanResult.totalBlocksPercent >= 70 ? '#ffaa00' : '#ff3355' }}>
                    {scanResult.totalBlocksPercent}% of attacks
                  </span>
                </p>
              </div>
              {/* Defense cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scanResult.defenses.map((d, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="rounded-lg border p-4" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield size={14} style={{ color: CATEGORY_COLORS[d.category] || CYAN }} />
                        <span className="text-sm font-semibold text-gray-200">{d.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        d.priority === 'critical' ? 'bg-red-900/40 text-red-400' : d.priority === 'high' ? 'bg-orange-900/40 text-orange-400' : 'bg-yellow-900/40 text-yellow-400'
                      }`}>{d.priority}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">{d.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${d.blocksPercent}%` }}
                          transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                          style={{ background: d.blocksPercent >= 80 ? '#22c55e' : d.blocksPercent >= 60 ? '#ffaa00' : '#ff3355' }} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">blocks {d.blocksPercent}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══════════════ PARTNERSHIP TAB ═══════════════════════ */}
          {activeTab === 'partner' && (
            <motion.div key="partner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="max-w-2xl mx-auto">
                <div className="rounded-lg border p-8 text-center" style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.06), rgba(217,70,239,0.06), transparent)', borderColor: BORDER_DIM }}>
                  <Skull size={40} style={{ color: MAGENTA }} className="mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-white mb-2">Test YOUR Model Before Release</h2>
                  <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                    The Cognitive Dread Engine is available as a partnership API for AI labs, enterprises, and
                    security teams who need to validate their model&apos;s alignment resistance before deployment.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                      { icon: Brain, label: '10 Attack Categories', desc: 'Systematic coverage of every known vector' },
                      { icon: GitBranch, label: 'CI/CD Integration', desc: 'Automated testing in your deployment pipeline' },
                      { icon: BarChart3, label: 'Comparative Analytics', desc: 'Benchmark against all major models' },
                    ].map((f, i) => (
                      <div key={i} className="rounded-lg border p-4" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                        <f.icon size={20} style={{ color: CYAN }} className="mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-200">{f.label}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                  {/* Contact form shell */}
                  <div className="rounded-lg border p-6 text-left" style={{ background: BG_CARD, borderColor: BORDER_DIM }}>
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Request Partnership Access</h3>
                    <div className="space-y-3">
                      <input type="text" placeholder="Your Name" value={partnerName} onChange={e => setPartnerName(e.target.value)}
                        className="w-full rounded-md px-3 py-2.5 text-sm border focus:outline-none focus:ring-1"
                        style={{ background: '#0c0e17', borderColor: BORDER_DIM, color: '#e5e7eb' }} />
                      <input type="email" placeholder="Email" value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)}
                        className="w-full rounded-md px-3 py-2.5 text-sm border focus:outline-none focus:ring-1"
                        style={{ background: '#0c0e17', borderColor: BORDER_DIM, color: '#e5e7eb' }} />
                      <textarea placeholder="Tell us about your model and testing needs…" value={partnerMsg} onChange={e => setPartnerMsg(e.target.value)} rows={3}
                        className="w-full rounded-md px-3 py-2.5 text-sm border focus:outline-none focus:ring-1 resize-none"
                        style={{ background: '#0c0e17', borderColor: BORDER_DIM, color: '#e5e7eb' }} />
                      <button className="w-full py-2.5 rounded-lg text-xs font-bold text-black transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #d946ef)' }}>
                        <span className="flex items-center justify-center gap-2"><Zap size={14} />Request Access</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Fallback for tabs without data */}
          {(activeTab === 'results' || activeTab === 'timeline' || activeTab === 'defenses') && !scanResult && (
            <div className="text-center py-20 text-gray-500 text-sm">
              {activeTab === 'results' && 'No scan results yet. Run a stress test first.'}
              {activeTab === 'timeline' && 'No timeline data. Run a stress test first.'}
              {activeTab === 'defenses' && 'No defense data. Run a stress test first.'}
            </div>
          )}
          {activeTab === 'comparison' && !loadingLeaderboard && leaderboard.length === 0 && (
            <div className="text-center py-20 text-gray-500 text-sm">Click &quot;Compare All Models&quot; to generate the leaderboard</div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
