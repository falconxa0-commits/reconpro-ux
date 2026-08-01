'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, TrendingUp, TrendingDown, Shield, AlertTriangle, Zap, Cloud,
  Building2, Heart, Server, ShoppingCart, GraduationCap, Radio, Mail,
  Rss, Copy, ExternalLink, ChevronRight, ChevronDown, Eye,
  Key, Bot, Gauge, BarChart3,
} from 'lucide-react';
import {
  type FearIndexResult,
  type FearLevel,
  type TrendDirection,
  type HistoricalDataPoint,
  type ComponentKey,
  type SectorKey,
  LEVEL_COLORS,
  FEAR_COMPONENTS,
  classifyLevel,
  calculateMovingAverage,
} from '@/lib/fear-index-engine';

// ── Types ─────────────────────────────────────────────────────────────

interface SparklineData {
  date: string;
  score: number;
}

// ── Constants ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENT_ICONS: Record<ComponentKey, any> = {
  nhi_exposure: Bot,
  api_key_exposure: Key,
  c2_activity: Radio,
  vibesec_distribution: Gauge,
  zero_day_active: Zap,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTOR_ICONS: Record<SectorKey, any> = {
  fintech: Building2,
  healthcare: Heart,
  saas: Cloud,
  government: Shield,
  ecommerce: ShoppingCart,
  education: GraduationCap,
};

const SECTOR_LABELS: Record<SectorKey, string> = {
  fintech: 'FinTech',
  healthcare: 'Healthcare',
  saas: 'SaaS',
  government: 'Government',
  ecommerce: 'E-Commerce',
  education: 'Education',
};

// ── Trend Arrow Component ─────────────────────────────────────────────

function TrendArrow({ trend, change, size = 16 }: { trend: TrendDirection; change: number; size?: number }) {
  const color = trend === 'rising' ? '#ef4444' : trend === 'falling' ? '#22c55e' : '#6b7280';
  if (trend === 'rising') return <TrendingUp size={size} style={{ color }} />;
  if (trend === 'falling') return <TrendingDown size={size} style={{ color }} />;
  return <Activity size={size} style={{ color }} />;
}

// ── Fear Gauge (SVG Arc) ───────────────────────────────────────────────

function FearGauge({ score, level }: { score: number; level: FearLevel }) {
  const color = LEVEL_COLORS[level];
  const isCritical = level === 'CRITICAL' || level === 'SEVERE';
  const size = 280;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // 270 degrees = 3/4 of full circle
  const cx = size / 2;
  const cy = size / 2 + 20;

  // 270-degree arc: from 135° to 405° (in standard math angles)
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;
  const scoreAngle = startAngle + (score / 100) * totalAngle;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function describeArc(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  // Background arc path
  const bgPath = describeArc(startAngle, endAngle);
  // Score arc path
  const scorePath = score > 0 ? describeArc(startAngle, scoreAngle) : '';
  // Needle position
  const needlePos = polarToCartesian(scoreAngle);

  // Tick marks
  const ticks = [0, 20, 40, 60, 80, 100];
  const tickMarks = ticks.map(t => {
    const angle = startAngle + (t / 100) * totalAngle;
    const inner = polarToCartesian(angle);
    const outer = polarToCartesian(angle);
    const ix = cx + (radius - 15) * Math.cos((angle * Math.PI) / 180);
    const iy = cy + (radius - 15) * Math.sin((angle * Math.PI) / 180);
    const ox = cx + (radius + 8) * Math.cos((angle * Math.PI) / 180);
    const oy = cy + (radius + 8) * Math.sin((angle * Math.PI) / 180);
    return { label: t, ix, iy, ox, oy };
  });

  return (
    <div className="relative flex flex-col items-center">
      {isCritical && (
        <div className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
        />
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="#1f2937" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Score arc */}
        <motion.path
          d={scorePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
        {/* Tick marks */}
        {tickMarks.map((tick) => (
          <g key={tick.label}>
            <line x1={tick.ix} y1={tick.iy} x2={tick.ox} y2={tick.oy} stroke="#4b5563" strokeWidth={1.5} />
            <text
              x={cx + (radius + 22) * Math.cos(((startAngle + (tick.label / 100) * totalAngle) * Math.PI) / 180)}
              y={cy + (radius + 22) * Math.sin(((startAngle + (tick.label / 100) * totalAngle) * Math.PI) / 180)}
              textAnchor="middle" dominantBaseline="middle"
              fill="#6b7280" fontSize={11}
            >
              {tick.label}
            </text>
          </g>
        ))}
        {/* Needle dot */}
        <motion.circle
          cx={needlePos.x} cy={needlePos.y} r={6}
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      {/* Center score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 30 }}>
        <motion.span
          className="font-mono font-black tabular-nums"
          style={{ color, fontSize: 72, lineHeight: 1, textShadow: `0 0 40px ${color}44` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
        >
          {score.toFixed(1)}
        </motion.span>
        <span className="text-xs text-gray-500 mt-1 uppercase tracking-[0.3em]">out of 100</span>
      </div>
    </div>
  );
}

// ── Sparkline (pure SVG) ──────────────────────────────────────────────

function Sparkline({ data, color = '#60a5fa', width = 120, height = 32 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── 90-Day Trend Chart (pure SVG) ─────────────────────────────────────

function TrendChart({ data }: { data: HistoricalDataPoint[] }) {
  const width = 900;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scores = data.map(d => d.score);
  const movingAvg = calculateMovingAverage(scores, 7);
  const minScore = 0;
  const maxScore = 100;

  function xScale(i: number) { return padding.left + (i / (data.length - 1)) * chartW; }
  function yScale(v: number) { return padding.top + chartH - ((v - minScore) / (maxScore - minScore)) * chartH; }

  // Level zone backgrounds
  const zones = [
    { from: 0, to: 20, color: '#22c55e08' },
    { from: 20, to: 40, color: '#eab30808' },
    { from: 40, to: 60, color: '#f9731608' },
    { from: 60, to: 80, color: '#ef444408' },
    { from: 80, to: 100, color: '#7f1d1d08' },
  ];

  // Line path
  const linePoints = data.map((d, i) => `${xScale(i)},${yScale(d.score)}`).join(' ');
  // Area path
  const areaPath = `M ${xScale(0)},${yScale(minScore)} ` +
    data.map((d, i) => `L ${xScale(i)},${yScale(d.score)}`).join(' ') +
    ` L ${xScale(data.length - 1)},${yScale(minScore)} Z`;

  // Moving average path
  const maPoints = movingAvg.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');

  // Find spike points (score > 15 above 7-day MA)
  const spikes: number[] = [];
  for (let i = 7; i < data.length; i++) {
    if (data[i].score - movingAvg[i] > 15) spikes.push(i);
  }

  // Date labels (every ~15 days)
  const dateLabels: { x: number; label: string }[] = [];
  const step = Math.max(1, Math.floor(data.length / 6));
  for (let i = 0; i < data.length; i += step) {
    const d = new Date(data[i].date);
    dateLabels.push({ x: xScale(i), label: `${d.getMonth() + 1}/${d.getDate()}` });
  }

  const [hoveredSpike, setHoveredSpike] = useState<number | null>(null);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minWidth: 600 }}>
        {/* Zone backgrounds */}
        {zones.map(z => (
          <rect
            key={z.to}
            x={padding.left} y={yScale(z.to)} width={chartW} height={yScale(z.from) - yScale(z.to)}
            fill={z.color}
          />
        ))}
        {/* Grid lines */}
        {[0, 20, 40, 60, 80, 100].map(v => (
          <line key={v} x1={padding.left} y1={yScale(v)} x2={width - padding.right} y2={yScale(v)} stroke="#374151" strokeWidth={0.5} strokeDasharray="4 4" />
        ))}
        {/* Y-axis labels */}
        {[0, 20, 40, 60, 80, 100].map(v => (
          <text key={v} x={padding.left - 8} y={yScale(v) + 4} textAnchor="end" fill="#6b7280" fontSize={11}>{v}</text>
        ))}
        {/* Date labels */}
        {dateLabels.map((d, i) => (
          <text key={i} x={d.x} y={height - 8} textAnchor="middle" fill="#6b7280" fontSize={10}>{d.label}</text>
        ))}
        {/* Area fill */}
        <path d={areaPath} fill="url(#fearGradient)" opacity={0.3} />
        <defs>
          <linearGradient id="fearGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Score line */}
        <motion.polyline
          points={linePoints} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: 'easeOut' }}
        />
        {/* Moving average */}
        <motion.polyline
          points={maPoints} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" strokeLinejoin="round" opacity={0.7}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
        />
        {/* Spike markers */}
        {spikes.map(i => (
          <g key={i}
            onMouseEnter={() => setHoveredSpike(i)} onMouseLeave={() => setHoveredSpike(null)}
            className="cursor-pointer"
          >
            <circle cx={xScale(i)} cy={yScale(data[i].score)} r={5} fill="#ef4444" stroke="#1f2937" strokeWidth={2} />
            <line x1={xScale(i)} y1={yScale(data[i].score)} x2={xScale(i)} y2={yScale(0)} stroke="#ef444444" strokeWidth={1} strokeDasharray="3 3" />
          </g>
        ))}
        {/* Spike tooltip */}
        {hoveredSpike !== null && (
          <g>
            <rect
              x={Math.min(xScale(hoveredSpike) - 60, width - 170)}
              y={yScale(data[hoveredSpike].score) - 50}
              width={160} height={36} rx={6} fill="#1f2937" stroke="#374151" strokeWidth={1}
            />
            <text
              x={Math.min(xScale(hoveredSpike) - 52, width - 162)}
              y={yScale(data[hoveredSpike].score) - 28}
              fill="#f8fafc" fontSize={11}
            >
              {data[hoveredSpike].date}: {data[hoveredSpike].score.toFixed(1)} — {data[hoveredSpike].level}
            </text>
          </g>
        )}
        {/* Legend */}
        <line x1={width - 180} y1={12} x2={width - 160} y2={12} stroke="#60a5fa" strokeWidth={2} />
        <text x={width - 155} y={16} fill="#9ca3af" fontSize={10}>Daily Score</text>
        <line x1={width - 90} y1={12} x2={width - 70} y2={12} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" />
        <text x={width - 65} y={16} fill="#9ca3af" fontSize={10}>7-day MA</text>
      </svg>
    </div>
  );
}

// ── Component Card ─────────────────────────────────────────────────────

function ComponentCard({
  key_name, data, sparklineData, index,
}: {
  key_name: ComponentKey;
  data: FearIndexResult['components'][ComponentKey];
  sparklineData: number[];
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = COMPONENT_ICONS[key_name];
  const color = LEVEL_COLORS[classifyLevel(data.score)];
  const barWidth = data.score;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
      className={`rounded-xl border p-4 cursor-pointer transition-all duration-300 hover:border-gray-600 ${
        classifyLevel(data.score) === 'CRITICAL' ? 'bg-red-950/20 border-red-800/40' :
        classifyLevel(data.score) === 'SEVERE' ? 'bg-red-950/10 border-red-900/30' :
        'bg-gray-900/50 border-gray-800/50'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={18} style={{ color }} />
          <span className="text-sm font-semibold text-gray-200 leading-tight">{FEAR_COMPONENTS[key_name].label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendArrow trend={data.trend} change={data.score} size={14} />
          <span className="font-mono text-sm font-bold" style={{ color }}>{data.score.toFixed(1)}</span>
        </div>
      </div>
      {/* Score bar */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${barWidth}%` }} transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{data.value}</span>
        {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-400 mb-2">{data.description}</p>
              <div className="bg-gray-800/50 rounded-lg p-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">7-Day Trend</span>
                <div className="mt-1">
                  <Sparkline data={sparklineData} color={color} width={200} height={28} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
// ── Sector Card ────────────────────────────────────────────────────────

function SectorCard({ key_name, data, index }: { key_name: SectorKey; data: { score: number; level: FearLevel }; index: number }) {
  const Icon = SECTOR_ICONS[key_name];
  const color = LEVEL_COLORS[data.level];
  const opacity = 0.1 + (data.score / 100) * 0.4;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.08 * index, duration: 0.4 }}
      className="rounded-xl border p-4 text-center transition-all duration-300 hover:scale-105"
      style={{
        backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
        borderColor: `${color}44`,
      }}
    >
      <Icon size={20} className="mx-auto mb-2" style={{ color }} />
      <div className="text-xs font-medium text-gray-400 mb-1">{SECTOR_LABELS[key_name]}</div>
      <div className="font-mono text-xl font-bold" style={{ color }}>{data.score}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color }}>{data.level}</div>
    </motion.div>
  );
}

// ── Threat Feed ────────────────────────────────────────────────────────

function ThreatFeed({ threats }: { threats: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % threats.length);
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [threats.length]);

  const severityIcons = [AlertTriangle, Zap, Shield, Activity, Radio];
  const severityColors = ['#ef4444', '#f97316', '#eab308', '#60a5fa', '#a78bfa'];

  return (
    <div className="space-y-2">
      <AnimatePresence mode="wait">
        {threats.map((threat, i) => (
          <motion.div
            key={`${i}-${activeIndex === i ? 'active' : 'inactive'}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: activeIndex === i ? 1 : 0.4, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
              activeIndex === i ? 'bg-gray-800/50 border-gray-700' : 'border-transparent'
            }`}
            onMouseEnter={() => { if (intervalRef.current) clearInterval(intervalRef.current); }}
            onMouseLeave={() => {
              intervalRef.current = setInterval(() => {
                setActiveIndex(prev => (prev + 1) % threats.length);
              }, 5000);
            }}
          >
            <div className="mt-0.5 shrink-0">
              {(() => { const C = severityIcons[i % severityIcons.length]; return <C size={16} style={{ color: severityColors[i % severityColors.length] }} />; })()}
            </div>
            <p className={`text-sm leading-relaxed ${activeIndex === i ? 'text-gray-200' : 'text-gray-500'}`}>{threat}</p>
            <span className="text-[10px] text-gray-600 whitespace-nowrap ml-auto shrink-0">
              {new Date(Date.now() - i * 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="flex justify-center gap-1.5 pt-2">
        {threats.map((_, i) => (
          <button key={i} onClick={() => setActiveIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${activeIndex === i ? 'bg-white w-4' : 'bg-gray-600'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Embeddable Widget Preview ──────────────────────────────────────────

function WidgetPreview({ score, level }: { score: number; level: FearLevel }) {
  const color = LEVEL_COLORS[level];
  const [copied, setCopied] = useState(false);

  const widgetHtml = `<div style="font-family:system-ui;background:#0a0a0a;border:1px solid #333;border-radius:8px;padding:16px 20px;color:#fff;display:inline-flex;align-items:center;gap:12px">
  <div style="width:48px;height:48px;border-radius:50%;border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:${color}">${score.toFixed(0)}</div>
  <div><div style="font-size:12px;color:#888">Global Security Weather</div><div style="font-weight:700;color:${color}">${level}</div></div>
</div>`;

  const embedCode = `<script src="https://reconpro.dev/widget/fear-index.js" async></script>`;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-300">Embeddable Widget Preview</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { navigator.clipboard.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
        >
          {copied ? <span className="text-green-400">Copied!</span> : <><Copy size={12} /> Copy Embed Code</>}
        </motion.button>
      </div>
      {/* Widget preview */}
      <div className="bg-[#0a0a0a] rounded-lg p-4 flex items-center justify-center border border-gray-800">
        <div dangerouslySetInnerHTML={{ __html: widgetHtml }} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ExternalLink size={12} className="text-gray-500" />
        <span className="text-[11px] text-gray-500">Embed on your security dashboard, status page, or internal wiki</span>
      </div>
    </div>
  );
}

// ── Newsletter Signup ──────────────────────────────────────────────────

function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setEmail('');
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Mail size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-300">Daily Security Briefing</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">Daily security briefing delivered at 6 AM UTC. Fear Index, top threats, and sector analysis.</p>
      {submitted ? (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-green-400">
          <Shield size={14} /> Subscribed! Check your inbox for confirmation.
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="ciso@company.com"
            className="flex-1 bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <motion.button
            whileTap={{ scale: 0.95 }} type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors whitespace-nowrap"
          >
            Subscribe
          </motion.button>
        </form>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — FearIndexPanel
// ═══════════════════════════════════════════════════════════════════════

export function FearIndexPanel() {
  const [current, setCurrent] = useState<FearIndexResult | null>(null);
  const [history, setHistory] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [currentRes, historyRes] = await Promise.all([
        fetch('/api/fear-index'),
        fetch('/api/fear-index/history?days=90'),
      ]);
      if (!currentRes.ok || !historyRes.ok) throw new Error('Failed to fetch fear index data');
      const currentData = await currentRes.json();
      const historyData = await historyRes.json();
      setCurrent(currentData);
      setHistory(historyData.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Calculating global threat landscape...</span>
        </div>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle size={32} className="mx-auto mb-2 text-yellow-500" />
          <p className="text-sm text-gray-400">Failed to load Fear Index: {error}</p>
        </div>
      </div>
    );
  }

  const color = LEVEL_COLORS[current.level];
  const isCritical = current.level === 'CRITICAL' || current.level === 'SEVERE';

  // Component sparkline data (last 7 days from history)
  const sparklineDataMap: Record<ComponentKey, number[]> = {} as Record<ComponentKey, number[]>;
  for (const key of Object.keys(FEAR_COMPONENTS) as ComponentKey[]) {
    sparklineDataMap[key] = history.slice(-7).map(d => d.components[key]);
  }

  return (
    <div className="space-y-6">
      {/* ── A. HERO — THE FEAR GAUGE ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
        className={`rounded-2xl border p-6 md:p-8 ${
          isCritical ? 'bg-red-950/20 border-red-800/40' : 'bg-gray-900/60 border-gray-800/50'
        }`}
        style={isCritical ? { boxShadow: `0 0 60px ${color}15, inset 0 0 60px ${color}08` } : undefined}
      >
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Gauge */}
          <div className="shrink-0">
            <FearGauge score={current.overallScore} level={current.level} />
          </div>
          {/* Info panel */}
          <div className="flex-1 space-y-4 text-center lg:text-left">
            <div>
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-1">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">Global Security Weather</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
                >{current.level}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mt-1">
                CISO Fear Index
              </h2>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-4">
              <div className="flex items-center gap-2">
                <TrendArrow trend={current.trend} change={current.changeFromYesterday} size={20} />
                <span className="text-lg font-semibold" style={{ color }}>
                  {current.changeFromYesterday > 0 ? '+' : ''}{current.changeFromYesterday} points
                </span>
                <span className="text-sm text-gray-500">from yesterday</span>
              </div>
            </div>

            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
              <p className="text-sm text-gray-300 leading-relaxed">{current.recommendation}</p>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-3">
              <a href="/api/fear-index/feed" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
              >
                <Rss size={12} /> RSS Feed
              </a>
              <span className="text-[11px] text-gray-600">Updated daily at 00:00 UTC</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── B. COMPONENT BREAKDOWN ────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Risk Components</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(Object.keys(FEAR_COMPONENTS) as ComponentKey[]).map((key, i) => (
            <ComponentCard
              key={key} key_name={key}
              data={current.components[key]}
              sparklineData={sparklineDataMap[key]}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* ── C + D: SECTORS + THREATS (side by side on desktop) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* C. SECTOR HEAT MAP */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Server size={18} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Sector Heat Map</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.keys(SECTOR_ICONS) as SectorKey[]).map((key, i) => (
              <SectorCard key={key} key_name={key} data={current.sectorBreakdown[key]} index={i} />
            ))}
          </div>
        </div>

        {/* D. THREAT FEED */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Top Threats</h3>
            <span className="text-[10px] text-gray-600 ml-auto">Auto-rotates every 5s</span>
          </div>
          <ThreatFeed threats={current.topThreats} />
        </div>
      </div>

      {/* ── E. 90-DAY TREND CHART ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">90-Day Trend</h3>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <TrendChart data={history} />
        </div>
      </div>

      {/* ── F + G: WIDGET PREVIEW + NEWSLETTER ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WidgetPreview score={current.overallScore} level={current.level} />
        <NewsletterSignup />
      </div>
    </div>
  );
}
