'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Shield, ShieldAlert, Globe, Clock, Filter, Search,
  Volume2, VolumeX, Radio, Rss, Copy, ExternalLink, TrendingUp, Zap,
  Eye, Bell, BellOff, ChevronRight, Tag, MapPin, Database, Key,
  CloudOff, Lock, Bot, FileWarning, Link, ShieldOff, Bug, ServerCrash,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Industry = 'fintech' | 'healthcare' | 'saas' | 'government' | 'ecommerce' | 'education' | 'energy' | 'defense';
type FindingType =
  | 'exposed_database' | 'env_file_leak' | 'api_key_exposure' | 'open_s3_bucket'
  | 'unauthenticated_admin' | 'exposed_llm_endpoint' | 'cloud_misconfiguration'
  | 'credential_dump' | 'vulnerable_dependency' | 'ssl_misconfiguration';

interface Incident {
  id: string;
  timestamp: string;
  severity: Severity;
  industry: Industry;
  findingType: FindingType;
  anonymizedDescription: string;
  assetType: string;
  region: string;
  verifiable: boolean;
}

interface Stats {
  totalToday: number;
  totalWeek: number;
  criticalThisWeek: number;
  byIndustry: Record<string, number>;
  byType: Record<string, number>;
}

type SortMode = 'newest' | 'oldest' | 'severity';

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const SEV: Record<Severity, { label: string; badge: string; text: string; border: string; glow: string; ticker: string }> = {
  critical: { label: 'CRITICAL', badge: 'bg-red-600', text: 'text-red-400', border: 'border-red-500', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]', ticker: 'bg-red-500/30 text-red-300' },
  high:     { label: 'HIGH',     badge: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/50', glow: '', ticker: 'bg-orange-500/20 text-orange-300' },
  medium:   { label: 'MEDIUM',   badge: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: '', ticker: 'bg-yellow-500/15 text-yellow-300' },
  low:      { label: 'LOW',      badge: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', glow: '', ticker: 'bg-blue-500/10 text-blue-300' },
};

const INDUSTRIES: { key: Industry; label: string; icon: typeof Shield }[] = [
  { key: 'fintech', label: 'FinTech', icon: Shield },
  { key: 'healthcare', label: 'Healthcare', icon: AlertTriangle },
  { key: 'saas', label: 'SaaS', icon: CloudOff },
  { key: 'government', label: 'Government', icon: ShieldAlert },
  { key: 'ecommerce', label: 'E-Commerce', icon: Tag },
  { key: 'education', label: 'Education', icon: Eye },
  { key: 'energy', label: 'Energy', icon: Zap },
  { key: 'defense', label: 'Defense', icon: Shield },
];

const FT_CFG: Record<string, { label: string; icon: typeof Shield }> = {
  exposed_database:      { label: 'Exposed Database', icon: Database },
  env_file_leak:         { label: 'Env File Leak', icon: FileWarning },
  api_key_exposure:      { label: 'API Key Exposure', icon: Key },
  open_s3_bucket:        { label: 'Open S3 Bucket', icon: CloudOff },
  unauthenticated_admin: { label: 'Unauth Admin', icon: ShieldOff },
  exposed_llm_endpoint:  { label: 'Exposed LLM', icon: Bot },
  cloud_misconfiguration:{ label: 'Cloud Misconfig', icon: CloudOff },
  credential_dump:       { label: 'Credential Dump', icon: Key },
  vulnerable_dependency: { label: 'Vuln Dependency', icon: Bug },
  ssl_misconfiguration:  { label: 'SSL Misconfig', icon: Link },
};

const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' });
}
function timeAgo(ts: string) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtNum(n: number) { return n.toLocaleString('en-US'); }

function playSiren(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.25);
}

// ═══════════════════════════════════════════════════════════════════════
// Animated Counter
// ═══════════════════════════════════════════════════════════════════════

function AnimCounter({ target, dur = 1200 }: { target: number; dur?: number }) {
  const [v, setV] = useState(0);
  const prev = useRef(target);
  useEffect(() => {
    const s = prev.current; prev.current = target;
    const t0 = performance.now();
    (function tick(now: number) {
      const p = Math.min((now - t0) / dur, 1);
      setV(Math.round(s + (target - s) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }, [target, dur]);
  return <span>{fmtNum(v)}</span>;
}

// ═══════════════════════════════════════════════════════════════════════
// Sparkline
// ═══════════════════════════════════════════════════════════════════════

function Sparkline({ data, color = '#ef4444', w = 120, h = 32 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const mx = Math.max(...data, 1), mn = Math.min(...data, 0), rng = mx - mn || 1, step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - mn) / rng) * (h - 4) - 2}`).join(' ');
  const gid = `spk-${color.replace('#','')}`;
  return (
    <svg width={w} height={h} className="inline-block">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Ticker Bar
// ═══════════════════════════════════════════════════════════════════════

function TickerBar({ incidents, criticalCount, soundOn, onToggleSound }: {
  incidents: Incident[]; criticalCount: number; soundOn: boolean; onToggleSound: () => void;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-red-900/50 backdrop-blur-sm">
      {incidents.some(i => i.severity === 'critical') && (
        <div className="absolute inset-0 pointer-events-none animate-pulse bg-red-500/5" />
      )}
      <div className="flex items-center h-10 overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <button onClick={onToggleSound} className="flex-shrink-0 flex items-center gap-1.5 px-3 h-full border-r border-white/10 hover:bg-white/5 transition-colors text-neutral-400 hover:text-white text-xs">
          {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span className="hidden sm:inline">{soundOn ? 'SOUND ON' : 'MUTED'}</span>
        </button>
        <div className="flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee" style={{
            animationDuration: `${Math.max(incidents.length * 4, 30)}s`,
            animationPlayState: paused ? 'paused' : 'running',
            animationTimingFunction: 'linear', animationIterationCount: 'infinite',
          }}>
            {[...incidents, ...incidents].map((inc, idx) => {
              const c = SEV[inc.severity];
              return (
                <span key={`${inc.id}-${idx}`} className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-mono border-r border-white/10 ${c.ticker}`}>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.badge} text-white`}>{c.label}</span>
                  <span className="text-neutral-500">[{fmtTime(inc.timestamp)}]</span>
                  <span className="max-w-md truncate">{inc.anonymizedDescription}</span>
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 px-4 h-full border-l border-red-900/50 bg-red-500/10">
          <AlertTriangle size={14} className="text-red-400 animate-pulse" />
          <span className="text-red-400 font-mono text-xs font-bold"><AnimCounter target={criticalCount} /> critical this week</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Stats Dashboard
// ═══════════════════════════════════════════════════════════════════════

function StatsDash({ stats }: { stats: Stats }) {
  const topInd = useMemo(() => {
    const e = Object.entries(stats.byIndustry).sort(([,a],[,b]) => (b as number) - (a as number));
    return INDUSTRIES.find(i => i.key === e[0]?.[0])?.label ?? '—';
  }, [stats.byIndustry]);
  const topFt = useMemo(() => {
    const e = Object.entries(stats.byType).sort(([,a],[,b]) => (b as number) - (a as number));
    return FT_CFG[e[0]?.[0]]?.label ?? '—';
  }, [stats.byType]);
  const trend = useMemo(() => {
    const t = stats.totalWeek || 1;
    return [0.6, 0.75, 0.85, 0.9, 0.95, 1.0, stats.totalToday / t * 7].map(v => Math.round(v * t / 7));
  }, [stats]);
  const cards = [
    { label: 'Total Today', value: stats.totalToday, icon: Rss, color: '#3b82f6', sd: trend },
    { label: 'Critical This Week', value: stats.criticalThisWeek, icon: ShieldAlert, color: '#ef4444', sd: trend },
    { label: 'Most Affected Industry', value: topInd, icon: Globe, color: '#f59e0b', isText: true, sd: null },
    { label: 'Top Finding Type', value: topFt, icon: Zap, color: '#a855f7', isText: true, sd: null },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => {
        const Ic = c.icon;
        return (
          <div key={c.label} className="relative bg-neutral-900/80 border border-white/5 rounded-xl p-4 overflow-hidden group hover:border-white/10 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 opacity-5"><Ic size={96} style={{ color: c.color }} /></div>
            <div className="flex items-center gap-2 mb-2">
              <Ic size={16} style={{ color: c.color }} />
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">{c.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <div className={c.isText ? 'text-lg font-semibold text-white' : 'text-2xl font-bold text-white font-mono'}>
                {c.isText ? String(c.value) : <AnimCounter target={c.value as number} />}
              </div>
              {c.sd && <Sparkline data={c.sd} color={c.color} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Industry Heat Map
// ═══════════════════════════════════════════════════════════════════════

function HeatMap({ stats, selected, onSelect }: { stats: Stats; selected: Industry | null; onSelect: (i: Industry | null) => void }) {
  const mx = Math.max(...Object.values(stats.byIndustry), 1);
  const colors = [
    'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    'from-yellow-500/15 to-yellow-500/5 border-yellow-500/30',
    'from-orange-500/15 to-orange-500/10 border-orange-500/30',
    'from-orange-500/25 to-orange-500/10 border-orange-500/40',
    'from-red-500/20 to-red-500/5 border-red-500/40',
    'from-red-500/30 to-red-500/10 border-red-500/50',
    'from-red-500/40 to-red-500/15 border-red-500/60',
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {INDUSTRIES.map(ind => {
        const cnt = (stats.byIndustry[ind.key] as number) || 0;
        const intensity = Math.round((cnt / mx) * (colors.length - 1));
        const sel = selected === ind.key;
        const Ic = ind.icon;
        return (
          <button key={ind.key} onClick={() => onSelect(sel ? null : ind.key)}
            className={`relative bg-gradient-to-br ${colors[intensity]} border rounded-lg p-3 text-left transition-all hover:scale-[1.02] ${sel ? 'ring-2 ring-white/30 scale-[1.02]' : 'hover:border-white/20'}`}>
            <div className="flex items-center gap-2 mb-1"><Ic size={14} className="text-neutral-400" /><span className="text-xs font-medium text-neutral-300">{ind.label}</span></div>
            <div className="text-lg font-bold text-white font-mono">{fmtNum(cnt)}</div>
            <div className="text-[10px] text-neutral-500">incidents this week</div>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Incident Card
// ═══════════════════════════════════════════════════════════════════════

function IncCard({ inc, isNew }: { inc: Incident; isNew: boolean }) {
  const c = SEV[inc.severity];
  const ft = FT_CFG[inc.findingType];
  const FtIc = ft.icon;
  const crit = inc.severity === 'critical';
  const indL = INDUSTRIES.find(i => i.key === inc.industry)?.label ?? inc.industry;
  return (
    <motion.div layout initial={isNew ? { opacity: 0, y: -20, scale: 0.98 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`relative group bg-neutral-900/70 border rounded-lg p-4 transition-all hover:bg-neutral-900 border-l-2 ${c.border} ${crit ? c.glow : ''}`}>
      {isNew && (<div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /><span className="text-[10px] text-red-400 font-medium">NEW</span></div>)}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg ${crit ? 'bg-red-500/20' : 'bg-white/5'}`}>
          <FtIc size={16} className={c.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.badge} text-white uppercase`}>{c.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">{ft.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">{indL}</span>
          </div>
          <p className="text-sm text-neutral-200 leading-relaxed mb-2">{inc.anonymizedDescription}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(inc.timestamp)}</span>
            <span className="flex items-center gap-1"><MapPin size={11} />{inc.region}</span>
            <span className="flex items-center gap-1"><ServerCrash size={11} />{inc.assetType}</span>
            {inc.verifiable && <span className="flex items-center gap-1 text-emerald-500/70"><Eye size={11} />Verifiable</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Filter Bar
// ═══════════════════════════════════════════════════════════════════════

function Filters({ sevF, setSevF, indF, setIndF, ftF, setFtF, q, setQ, sort, setSort }: {
  sevF: Severity | null; setSevF: (s: Severity | null) => void;
  indF: Industry | null; setIndF: (i: Industry | null) => void;
  ftF: FindingType | null; setFtF: (f: FindingType | null) => void;
  q: string; setQ: (s: string) => void; sort: SortMode; setSort: (s: SortMode) => void;
}) {
  const btns: { k: Severity | null; l: string }[] = [{ k: null, l: 'All' }, { k: 'critical', l: 'Critical' }, { k: 'high', l: 'High' }, { k: 'medium', l: 'Medium' }, { k: 'low', l: 'Low' }];
  const selCls = 'bg-white/10 text-white border border-white/20';
  const defCls = 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5';
  return (
    <div className="flex flex-col lg:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input type="text" placeholder="Search incidents..." value={q} onChange={e => setQ(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-neutral-900/80 border border-white/10 rounded-lg text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10" />
      </div>
      <div className="flex items-center gap-1.5">
        <Filter size={14} className="text-neutral-500 mr-1" />
        {btns.map(b => (
          <button key={b.k ?? 'all'} onClick={() => setSevF(b.k)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sevF === b.k ? selCls : defCls}`}>{b.l}</button>
        ))}
      </div>
      <select value={indF ?? ''} onChange={e => setIndF(e.target.value as Industry | null || null)}
        className="px-3 py-2 bg-neutral-900/80 border border-white/10 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-white/20 appearance-none cursor-pointer">
        <option value="">All Industries</option>
        {INDUSTRIES.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
      </select>
      <select value={ftF ?? ''} onChange={e => setFtF(e.target.value as FindingType | null || null)}
        className="px-3 py-2 bg-neutral-900/80 border border-white/10 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-white/20 appearance-none cursor-pointer">
        <option value="">All Finding Types</option>
        {Object.entries(FT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <select value={sort} onChange={e => setSort(e.target.value as SortMode)}
        className="px-3 py-2 bg-neutral-900/80 border border-white/10 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-white/20 appearance-none cursor-pointer">
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="severity">By Severity</option>
      </select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Embed Widget
// ═══════════════════════════════════════════════════════════════════════

function EmbedWidget({ incidents }: { incidents: Incident[] }) {
  const [copied, setCopied] = useState(false);
  const code = `<div id="reconpro-ticker" style="position:fixed;bottom:0;left:0;right:0;background:#000;color:#fff;font-family:monospace;font-size:12px;padding:8px 16px;overflow:hidden;white-space:nowrap;border-top:1px solid #333;z-index:99999;"><div style="display:inline-block;animation:ticker ${Math.max(incidents.length * 3, 30)}s linear infinite;">${incidents.slice(0, 5).map(i => `${SEV[i.severity].label}: ${i.anonymizedDescription.slice(0, 80)}`).join('  \u25CF  ')}  \u25CF  ${incidents.slice(0, 5).map(i => `${SEV[i.severity].label}: ${i.anonymizedDescription.slice(0, 80)}`).join('  \u25CF  ')}</div><span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);color:#666;font-size:10px;">Powered by ReconPro</span><style>@keyframes ticker{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}}</style></div>`;

  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><ExternalLink size={14} className="text-neutral-400" /><span className="text-sm font-medium text-neutral-300">Embeddable Widget</span></div>
        <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs text-neutral-300 transition-all">
          {copied ? <span className="text-emerald-400">✓ Copied!</span> : <><Copy size={12} /> Copy Embed Code</>}
        </button>
      </div>
      <div className="relative bg-black rounded-lg p-2 overflow-hidden border border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="px-1 py-0.5 bg-red-600 text-white rounded">CRIT</span>
          <span className="text-red-300 truncate">Exposed MongoDB at Fortune 500 financial institution...</span>
          <span className="text-neutral-600">●</span>
          <span className="px-1 py-0.5 bg-orange-500 text-white rounded">HIGH</span>
          <span className="text-orange-300 truncate">API key leaked in public repo at US SaaS company...</span>
          <span className="text-neutral-600">●</span>
          <span className="px-1 py-0.5 bg-yellow-500 text-white rounded">MED</span>
          <span className="text-yellow-300 truncate">.env file exposed at European healthcare provider...</span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-700 text-[9px]">Powered by ReconPro</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main Panel
// ═══════════════════════════════════════════════════════════════════════

export function WallOfShamePanel() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sevF, setSevF] = useState<Severity | null>(null);
  const [indF, setIndF] = useState<Industry | null>(null);
  const [ftF, setFtF] = useState<FindingType | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [soundOn, setSoundOn] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<AudioContext | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = new URLSearchParams({ limit: '100' });
        if (sevF) p.set('severity', sevF);
        if (indF) p.set('industry', indF);
        const res = await fetch(`/api/wall-of-shame?${p}`);
        const data = await res.json();
        if (cancelled) return;
        setIncidents(data.incidents);
        setStats(data.stats);
        setLoading(false);
        seenRef.current = new Set(data.incidents.map((i: Incident) => i.id));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [sevF, indF]);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const p = new URLSearchParams({ limit: '100' });
        if (sevF) p.set('severity', sevF);
        if (indF) p.set('industry', indF);
        const res = await fetch(`/api/wall-of-shame?${p}`);
        const data = await res.json();
        if (data.incidents.length > 0) {
          const newOnes = data.incidents.filter((i: Incident) => !seenRef.current.has(i.id));
          if (newOnes.length > 0) {
            setNewIds(prev => { const ns = new Set(prev); for (const n of newOnes) ns.add(n.id); return ns; });
            if (soundOnRef.current && newOnes.some((i: Incident) => i.severity === 'critical')) {
              if (!audioRef.current) audioRef.current = new AudioContext();
              playSiren(audioRef.current);
            }
            const fadeIds = newOnes.map(n => n.id);
            setTimeout(() => setNewIds(prev => { const nx = new Set(prev); for (const id of fadeIds) nx.delete(id); return nx; }), 5000);
            for (const n of newOnes) seenRef.current.add(n.id);
            setIncidents(prev => [...newOnes, ...prev].slice(0, 200));
          }
          setStats(data.stats);
        }
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(iv);
  }, [sevF, indF]);

  const toggleSound = useCallback(() => { setSoundOn(p => !p); if (!audioRef.current) audioRef.current = new AudioContext(); }, []);

  const filtered = useMemo(() => {
    let r = [...incidents];
    if (ftF) r = r.filter(i => i.findingType === ftF);
    if (q) { const ql = q.toLowerCase(); r = r.filter(i => i.anonymizedDescription.toLowerCase().includes(ql) || i.industry.includes(ql) || i.findingType.includes(ql) || i.region.toLowerCase().includes(ql)); }
    if (sort === 'newest') r.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    else if (sort === 'oldest') r.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    else if (sort === 'severity') r.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
    return r;
  }, [incidents, ftF, q, sort]);

  const tickerInc = useMemo(() => incidents.filter(i => ['critical', 'high'].includes(i.severity)).slice(0, 20), [incidents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-neutral-400 text-sm font-mono">Loading Wall of Shame...</span></div>
      </div>
    );
  }

  return (
    <div className="relative pb-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20">
            <Radio size={20} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Wall of Shame
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-red-400 font-mono font-medium">LIVE</span>
              </span>
            </h2>
            <p className="text-xs text-neutral-500">Anonymized high-risk findings from global attack surface reconnaissance</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && <StatsDash stats={stats} />}

      {/* Heat Map */}
      {stats && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-neutral-400" />
            <span className="text-sm font-medium text-neutral-300">Industry Heat Map</span>
            {indF && (
              <button onClick={() => setIndF(null)} className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white transition-colors ml-2">Clear filter <ChevronRight size={10} /></button>
            )}
          </div>
          <HeatMap stats={stats} selected={indF} onSelect={setIndF} />
        </div>
      )}

      {/* Filters */}
      <div className="mt-6">
        <Filters sevF={sevF} setSevF={setSevF} indF={indF} setIndF={setIndF} ftF={ftF} setFtF={setFtF} q={q} setQ={setQ} sort={sort} setSort={setSort} />
      </div>

      {/* Count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-neutral-500">Showing {filtered.length} of {incidents.length} incidents</span>
        <span className="flex items-center gap-1 text-xs text-neutral-600"><Rss size={11} /> Auto-refreshes every 15s</span>
      </div>

      {/* Feed */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map(inc => <IncCard key={inc.id} inc={inc} isNew={newIds.has(inc.id)} />)
          ) : (
            <div className="text-center py-12 text-neutral-600 text-sm">No incidents match your filters</div>
          )}
        </AnimatePresence>
      </div>

      {/* Embed */}
      <div className="mt-8"><EmbedWidget incidents={incidents} /></div>

      {/* Ticker */}
      {stats && <TickerBar incidents={tickerInc} criticalCount={stats.criticalThisWeek} soundOn={soundOn} onToggleSound={toggleSound} />}
    </div>
  );
}
