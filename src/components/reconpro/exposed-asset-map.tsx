'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Map, Filter, Play, Pause, RotateCcw, Clock, Layers, Radar,
  Shield, AlertTriangle, Database, Cloud, Code, Cpu, Copy, ExternalLink,
  Zap, Eye, Maximize2, RefreshCw, Activity, TrendingUp, BarChart3,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Asset {
  id: string;
  type: ExposureType;
  severity: Severity;
  lat: number;
  lng: number;
  city: string;
  country: string;
  timestamp: string;
  description: string;
}

type ExposureType = 'env_files' | 'open_databases' | 'exposed_llm_endpoints' | 'unprotected_apis' | 'cloud_misconfig';
type Severity = 'critical' | 'high' | 'medium' | 'low';

type FilterKey = 'all' | ExposureType;
type RegionKey = 'all' | 'na' | 'eu' | 'asia' | 'sa' | 'africa' | 'oceania';

interface ApiResponse {
  totalExposed: number;
  assetsByType: Record<ExposureType, number>;
  assetsByRegion: Record<string, number>;
  recentAssets: Asset[];
  timeSeries: { hour: string; count: number }[];
  stats: { detectedToday: number; detectedThisWeek: number; avgDaily: number; peakHour: number };
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ff2d55',
  high: '#ff9500',
  medium: '#ffcc00',
  low: '#5ac8fa',
};

const SEVERITY_GLOW: Record<Severity, string> = {
  critical: '0 0 8px #ff2d55, 0 0 16px #ff2d5580',
  high: '0 0 6px #ff9500, 0 0 12px #ff950060',
  medium: '0 0 4px #ffcc00, 0 0 8px #ffcc0040',
  low: '0 0 4px #5ac8fa, 0 0 8px #5ac8fa40',
};

const TYPE_CONFIG: { key: FilterKey; label: string; icon: typeof Database; color: string }[] = [
  { key: 'all', label: 'All', icon: Globe, color: '#e0e0e0' },
  { key: 'env_files', label: '.env Files', icon: Code, color: '#ff2d55' },
  { key: 'open_databases', label: 'Open DBs', icon: Database, color: '#ff9500' },
  { key: 'exposed_llm_endpoints', label: 'LLM Endpoints', icon: Cpu, color: '#bf5af2' },
  { key: 'unprotected_apis', label: 'APIs', icon: ExternalLink, color: '#30d158' },
  { key: 'cloud_misconfig', label: 'Cloud', icon: Cloud, color: '#5ac8fa' },
];

const REGIONS: { key: RegionKey; label: string; field: string }[] = [
  { key: 'all', label: 'Global', field: '' },
  { key: 'na', label: 'N. America', field: 'north_america' },
  { key: 'eu', label: 'Europe', field: 'europe' },
  { key: 'asia', label: 'Asia', field: 'asia' },
  { key: 'sa', label: 'S. America', field: 'south_america' },
  { key: 'africa', label: 'Africa', field: 'africa' },
  { key: 'oceania', label: 'Oceania', field: 'oceania' },
];

const MAP_WIDTH = 960;
const MAP_HEIGHT = 480;

// Simplified continent SVG paths (equirectangular projection)
const CONTINENT_PATHS = [
  // North America
  'M90,50 L120,45 L160,48 L200,55 L230,70 L245,85 L250,100 L255,115 L240,130 L230,140 L220,148 L215,160 L200,170 L190,175 L180,180 L170,190 L155,195 L145,190 L135,185 L125,178 L115,170 L108,158 L100,145 L95,130 L85,115 L80,100 L82,85 L85,70 L90,50Z',
  // Central America
  'M170,190 L180,195 L190,200 L195,210 L200,218 L195,225 L188,228 L180,225 L172,218 L168,210 L165,200 L170,190Z',
  // South America
  'M200,228 L210,230 L220,238 L228,250 L232,265 L235,280 L238,295 L240,310 L238,325 L235,340 L230,355 L222,368 L215,378 L205,385 L195,388 L188,382 L182,372 L178,358 L175,342 L173,325 L172,310 L174,295 L176,280 L178,265 L182,250 L188,238 L195,230 L200,228Z',
  // Europe
  'M455,60 L470,55 L485,58 L500,55 L515,58 L530,62 L540,68 L545,78 L542,88 L535,95 L525,100 L515,105 L505,108 L495,110 L485,112 L475,110 L465,105 L458,98 L452,88 L450,78 L452,68 L455,60Z',
  // Africa
  'M465,125 L478,120 L490,122 L505,125 L518,128 L528,135 L535,148 L538,162 L540,178 L538,195 L535,210 L530,228 L522,245 L512,260 L500,272 L488,280 L475,282 L462,278 L452,268 L445,255 L440,238 L438,220 L438,200 L440,180 L442,162 L445,148 L450,138 L458,130 L465,125Z',
  // Asia (mainland)
  'M540,40 L560,35 L585,38 L610,42 L635,48 L660,52 L685,55 L710,58 L730,62 L745,70 L755,82 L758,95 L755,110 L748,122 L740,135 L730,148 L718,158 L705,165 L690,170 L675,175 L660,178 L645,180 L630,178 L618,172 L608,165 L598,158 L590,148 L582,138 L575,128 L568,118 L562,108 L558,98 L555,85 L552,72 L540,60 L540,40Z',
  // India
  'M640,145 L652,148 L662,155 L668,168 L670,182 L665,195 L658,208 L648,218 L638,222 L630,215 L625,205 L622,192 L625,178 L628,165 L632,155 L640,145Z',
  // Southeast Asia / Indonesia
  'M700,180 L712,178 L725,182 L735,188 L745,195 L752,205 L755,215 L750,222 L742,225 L730,222 L718,218 L708,212 L700,205 L695,195 L698,185 L700,180Z',
  // Japan
  'M780,78 L788,75 L795,80 L798,90 L795,100 L788,108 L782,112 L778,108 L775,98 L776,88 L780,78Z',
  // Australia
  'M770,295 L785,290 L800,288 L815,290 L830,295 L840,305 L845,318 L842,332 L835,345 L825,355 L812,360 L798,362 L785,358 L775,348 L768,335 L765,320 L766,308 L770,295Z',
  // Greenland
  'M310,28 L330,22 L350,25 L365,32 L370,42 L365,52 L355,58 L340,60 L325,58 L315,50 L310,40 L310,28Z',
];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function latLngToXY(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return { x, y };
}

function useAnimatedCounter(target: number, duration: number = 2000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const startVal = value;
    const diff = target - startVal;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

// ── Counter Overlay ────────────────────────────────────────────────────
function CounterOverlay({
  totalWeek,
  totalToday,
}: {
  totalWeek: number;
  totalToday: number;
}) {
  const animWeek = useAnimatedCounter(totalWeek, 2500);
  const animToday = useAnimatedCounter(totalToday, 2000);

  return (
    <div className="relative z-10 flex flex-col items-center gap-1 pb-3">
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative">
          <Radar className="absolute -left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 animate-pulse" />
          <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white tabular-nums">
            {formatNumber(animWeek)}
          </span>
        </div>
      </motion.div>
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
        Exposed Assets Detected This Week
      </p>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs sm:text-sm text-gray-400">
          <span className="font-bold text-orange-400 tabular-nums">{formatNumber(animToday)}</span>{' '}
          new in the last 24 hours
        </span>
      </div>
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────
function FilterBar({
  activeFilter,
  onFilterChange,
  assetsByType,
}: {
  activeFilter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  assetsByType: Record<ExposureType, number>;
}) {
  const total = Object.values(assetsByType).reduce((s, v) => s + v, 0);
  const counts: Record<FilterKey, number> = { all: total, ...assetsByType };

  return (
    <div className="flex flex-wrap gap-1.5">
      {TYPE_CONFIG.map(cfg => {
        const Icon = cfg.icon;
        const isActive = activeFilter === cfg.key;
        const count = counts[cfg.key] || 0;
        return (
          <button
            key={cfg.key}
            onClick={() => onFilterChange(cfg.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 border ${
              isActive
                ? 'bg-white/10 border-white/30 text-white shadow-lg'
                : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'
            }`}
          >
            <Icon className="w-3 h-3" style={{ color: isActive ? cfg.color : undefined }} />
            <span>{cfg.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums ${
                isActive ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-gray-600'
              }`}
            >
              {formatNumber(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── 24-Hour Timeline ───────────────────────────────────────────────────
function Timeline({ timeSeries }: { timeSeries: { hour: string; count: number }[] }) {
  const maxCount = Math.max(...timeSeries.map(t => t.count), 1);
  const currentHour = new Date().getHours();

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-3 h-3 text-gray-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          24-Hour Detection Timeline
        </span>
      </div>
      <div className="flex items-end gap-[2px] h-10">
        {timeSeries.map((t, i) => {
          const hour = parseInt(t.hour);
          const isNow = i === timeSeries.length - 1;
          const ratio = t.count / maxCount;
          const color = ratio > 0.8 ? '#ff2d55' : ratio > 0.6 ? '#ff9500' : ratio > 0.35 ? '#ffcc00' : '#30d158';
          return (
            <div key={t.hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div
                className={`w-full rounded-t-sm transition-all duration-300 ${isNow ? 'ring-1 ring-white/50' : ''}`}
                style={{
                  height: `${Math.max(ratio * 32, 2)}px`,
                  backgroundColor: color,
                  opacity: isNow ? 1 : 0.7,
                }}
              />
              <span className="text-[6px] text-gray-600 tabular-nums hidden group-hover:block absolute -bottom-3">
                {t.count}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-gray-600 tabular-nums">{timeSeries[0]?.hour}</span>
        <span className="text-[8px] text-gray-600 tabular-nums">Now</span>
      </div>
    </div>
  );
}

// ── Region Breakdown ───────────────────────────────────────────────────
function RegionBreakdown({
  assetsByRegion,
  activeRegion,
  onRegionChange,
}: {
  assetsByRegion: Record<string, number>;
  activeRegion: RegionKey;
  onRegionChange: (r: RegionKey) => void;
}) {
  const maxRegion = Math.max(...Object.values(assetsByRegion), 1);
  const total = Object.values(assetsByRegion).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Map className="w-3 h-3 text-gray-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Region Breakdown
        </span>
      </div>
      {REGIONS.filter(r => r.key !== 'all').map(reg => {
        const count = assetsByRegion[reg.field] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const barWidth = (count / maxRegion) * 100;
        const isActive = activeRegion === reg.key;
        return (
          <button
            key={reg.key}
            onClick={() => onRegionChange(isActive ? 'all' : reg.key)}
            className={`w-full text-left group transition-all duration-200 ${
              isActive ? 'bg-white/[0.06] rounded px-1.5 py-1 -mx-1.5' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                }`}
              >
                {reg.label}
              </span>
              <span className="text-[10px] text-gray-600 tabular-nums">
                {formatNumber(count)}{' '}
                <span className="text-gray-700">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: isActive ? '#5ac8fa' : '#333',
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Type Breakdown ─────────────────────────────────────────────────────
function TypeBreakdown({ assetsByType }: { assetsByType: Record<ExposureType, number> }) {
  const total = Object.values(assetsByType).reduce((s, v) => s + v, 0);
  const maxType = Math.max(...Object.values(assetsByType), 1);

  const typeLabels: Record<ExposureType, { label: string; color: string; icon: typeof Database }> = {
    env_files: { label: '.env Files', color: '#ff2d55', icon: Code },
    open_databases: { label: 'Open Databases', color: '#ff9500', icon: Database },
    exposed_llm_endpoints: { label: 'LLM Endpoints', color: '#bf5af2', icon: Cpu },
    unprotected_apis: { label: 'Unprotected APIs', color: '#30d158', icon: ExternalLink },
    cloud_misconfig: { label: 'Cloud Misconfigs', color: '#5ac8fa', icon: Cloud },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Layers className="w-3 h-3 text-gray-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Exposure Types
        </span>
      </div>
      {(Object.entries(assetsByType) as [ExposureType, number][]).map(([type, count]) => {
        const cfg = typeLabels[type];
        const Icon = cfg.icon;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const barWidth = (count / maxType) * 100;
        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                <span className="text-[10px] font-medium text-gray-400">{cfg.label}</span>
              </div>
              <span className="text-[10px] text-gray-600 tabular-nums">
                {formatNumber(count)}{' '}
                <span className="text-gray-700">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${barWidth}%`, backgroundColor: cfg.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────
function AssetTooltip({
  asset,
  x,
  y,
}: {
  asset: Asset;
  x: number;
  y: number;
}) {
  const typeLabels: Record<ExposureType, string> = {
    env_files: '.env File Exposure',
    open_databases: 'Open Database',
    exposed_llm_endpoints: 'Exposed LLM Endpoint',
    unprotected_apis: 'Unprotected API',
    cloud_misconfig: 'Cloud Misconfiguration',
  };

  const timeAgo = Math.round(
    (Date.now() - new Date(asset.timestamp).getTime()) / 3600000
  );

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: x + 12,
        top: y - 10,
      }}
    >
      <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-2xl max-w-[240px]">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: SEVERITY_COLORS[asset.severity] }}
          />
          <span className="text-[10px] font-bold uppercase text-white">
            {asset.severity}
          </span>
          <span className="text-[9px] text-gray-500">•</span>
          <span className="text-[10px] text-gray-400">{timeAgo}h ago</span>
        </div>
        <p className="text-[11px] font-semibold text-gray-200">
          {asset.city}, {asset.country}
        </p>
        <p className="text-[10px] text-gray-500 mb-1">
          {typeLabels[asset.type]}
        </p>
        <p className="text-[9px] text-gray-500 leading-tight">
          {asset.description}
        </p>
      </div>
    </div>
  );
}

// ── Time-Lapse Controls ────────────────────────────────────────────────
function TimeLapseControls({
  enabled,
  onToggle,
  playing,
  onPlayPause,
  onReset,
  speed,
  onSpeedChange,
  currentIndex,
  totalCount,
  currentTime,
}: {
  enabled: boolean;
  onToggle: () => void;
  playing: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  currentIndex: number;
  totalCount: number;
  currentTime: string;
}) {
  const speeds = [1, 2, 5, 10];

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all border ${
          enabled
            ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
            : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-400'
        }`}
      >
        <Activity className="w-3 h-3" />
        Time-Lapse
      </button>
      {enabled && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-1.5 overflow-hidden"
          >
            <button onClick={onPlayPause} className="p-1 rounded hover:bg-white/10 text-gray-400">
              {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button onClick={onReset} className="p-1 rounded hover:bg-white/10 text-gray-400">
              <RotateCcw className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-0.5 ml-1">
              {speeds.map(s => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums ${
                    speed === s
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <span className="text-[9px] text-gray-600 tabular-nums ml-1">
              {currentIndex}/{totalCount}
            </span>
            <span className="text-[9px] text-gray-500 tabular-nums">
              {currentTime}
            </span>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Embed Widget Preview ───────────────────────────────────────────────
function EmbedWidget({ totalWeek }: { totalWeek: number }) {
  const [copied, setCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const embedCode = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/exposed-assets/widget" width="600" height="400" frameborder="0" title="ReconPro Exposed Assets"></iframe>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Maximize2 className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Embed Widget
          </span>
        </div>
        <button
          onClick={() => setShowEmbed(!showEmbed)}
          className="text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          {showEmbed ? 'Hide' : 'Show'}
        </button>
      </div>
      {showEmbed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-gray-500">Preview</span>
              <span className="text-[8px] text-gray-700">600×400</span>
            </div>
            <div className="bg-[#0a0a1a] rounded p-3 border border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-400" />
                  <span className="text-[8px] text-gray-400 font-semibold">ReconPro</span>
                </div>
                <span className="text-[8px] text-gray-600">LIVE</span>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-white tabular-nums">
                  {formatNumber(totalWeek)}
                </p>
                <p className="text-[7px] text-red-400 uppercase tracking-wider">Exposed Assets</p>
              </div>
              <div className="mt-2 flex justify-center gap-[1px]">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-sm"
                    style={{
                      height: `${4 + Math.random() * 10}px`,
                      backgroundColor: i > 16 ? '#ff2d55' : '#30d158',
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-all"
          >
            <Copy className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] font-medium text-gray-400">
              {copied ? 'Copied!' : 'Copy Embed Code'}
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function ExposedAssetMapPanel() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [activeRegion, setActiveRegion] = useState<RegionKey>('all');
  const [hoveredAsset, setHoveredAsset] = useState<Asset | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Time-lapse state
  const [timeLapse, setTimeLapse] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tlIndex, setTlIndex] = useState(0);

  const refreshRef = useRef<NodeJS.Timeout | null>(null);
  const playRef = useRef<NodeJS.Timeout | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // ── Fetch data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('type', activeFilter);
      if (activeRegion !== 'all') params.set('region', activeRegion);
      const res = await fetch(`/api/exposed-assets?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch exposed assets:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, activeRegion]);

  useEffect(() => {
    fetchData();
    refreshRef.current = setInterval(fetchData, 10000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [fetchData]);

  // ── Time-lapse playback ──────────────────────────────────────────────
  const assets = data?.recentAssets || [];
  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [assets]
  );

  useEffect(() => {
    if (!timeLapse || !playing || sortedAssets.length === 0) {
      if (playRef.current) clearInterval(playRef.current);
      return;
    }
    const interval = Math.max(1000 / speed, 50);
    playRef.current = setInterval(() => {
      setTlIndex(prev => {
        if (prev >= sortedAssets.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, interval);
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [timeLapse, playing, speed, sortedAssets.length]);

  const visibleAssets = timeLapse ? sortedAssets.slice(0, tlIndex + 1) : assets;

  // ── Map mouse handler ────────────────────────────────────────────────
  const handleMapMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  // ── Stats cards ──────────────────────────────────────────────────────
  const statsCards = data
    ? [
        { label: 'Today', value: data.stats.detectedToday, icon: Zap },
        { label: 'Avg/Day', value: data.stats.avgDaily, icon: TrendingUp },
        { label: 'Peak Hour', value: data.stats.peakHour, icon: BarChart3 },
      ]
    : [];

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full min-h-[700px] bg-[#06060f] rounded-xl border border-white/[0.06] overflow-hidden flex flex-col">
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(6,6,15,0.8) 100%)',
        }}
      />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 px-4 pt-4 pb-2 flex flex-col gap-3 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <Radar className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Exposed AI Asset Map
              </h2>
              <p className="text-[10px] text-gray-600">
                Real-time anonymized scan telemetry • Auto-refreshes every 10s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-gray-500">LIVE</span>
            </div>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Eye className="w-3.5 h-3.5 text-gray-600" />
          </div>
        </div>

        {/* Counter Overlay */}
        {data && <CounterOverlay totalWeek={data.totalExposed} totalToday={data.stats.detectedToday} />}

        {/* Filter Bar + Time Lapse + Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            assetsByType={data?.assetsByType || { env_files: 0, open_databases: 0, exposed_llm_endpoints: 0, unprotected_apis: 0, cloud_misconfig: 0 }}
          />
          <TimeLapseControls
            enabled={timeLapse}
            onToggle={() => { setTimeLapse(!timeLapse); setTlIndex(0); setPlaying(false); }}
            playing={playing}
            onPlayPause={() => setPlaying(!playing)}
            onReset={() => { setTlIndex(0); setPlaying(false); }}
            speed={speed}
            onSpeedChange={setSpeed}
            currentIndex={tlIndex + 1}
            totalCount={sortedAssets.length}
            currentTime={
              sortedAssets[tlIndex]
                ? new Date(sortedAssets[tlIndex].timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'
            }
          />
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* ── MAP AREA ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={mapContainerRef}
            className="relative flex-1 overflow-hidden"
            onMouseMove={handleMapMouseMove}
            onMouseLeave={() => setHoveredAsset(null)}
          >
            {loading && !data ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                  <span className="text-[10px] text-gray-600">Scanning global exposure surface...</span>
                </div>
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1a1a3e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Background */}
                <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#06060f" />
                <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#mapGlow)" />

                {/* Grid lines */}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
                  <line
                    key={`grid-lat-${i}`}
                    x1={0} y1={(i / 12) * MAP_HEIGHT}
                    x2={MAP_WIDTH} y2={(i / 12) * MAP_HEIGHT}
                    stroke="rgba(255,255,255,0.02)"
                    strokeWidth={0.5}
                  />
                ))}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(i => (
                  <line
                    key={`grid-lng-${i}`}
                    x1={(i / 24) * MAP_WIDTH} y1={0}
                    x2={(i / 24) * MAP_WIDTH} y2={MAP_HEIGHT}
                    stroke="rgba(255,255,255,0.02)"
                    strokeWidth={0.5}
                  />
                ))}

                {/* Continents */}
                {CONTINENT_PATHS.map((path, i) => (
                  <path
                    key={i}
                    d={path}
                    fill="rgba(255,255,255,0.02)"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.8}
                  />
                ))}

                {/* Asset dots */}
                <AnimatePresence>
                  {visibleAssets.map((asset, i) => {
                    const { x, y } = latLngToXY(asset.lat, asset.lng);
                    const isNew = timeLapse && i === tlIndex;
                    const isHovered = hoveredAsset?.id === asset.id;
                    const radius = isHovered ? 5 : asset.severity === 'critical' ? 4 : asset.severity === 'high' ? 3.5 : 3;

                    return (
                      <motion.circle
                        key={asset.id}
                        cx={x}
                        cy={y}
                        r={radius}
                        fill={SEVERITY_COLORS[asset.severity]}
                        filter="url(#glow)"
                        initial={isNew ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 0.8 }}
                        animate={{
                          scale: isHovered ? 1.8 : 1,
                          opacity: isHovered ? 1 : 0.8,
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{
                          type: 'spring' as const,
                          stiffness: 300,
                          damping: 20,
                          ...(isNew ? { duration: 0.4 } : {}),
                        }}
                        style={{
                          cursor: 'pointer',
                          filter: isHovered
                            ? SEVERITY_GLOW[asset.severity]
                            : undefined,
                        }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          setHoveredAsset(asset);
                        }}
                        onMouseLeave={() => setHoveredAsset(null)}
                      />
                    );
                  })}
                </AnimatePresence>

                {/* Hovered asset pulse ring */}
                {hoveredAsset && (() => {
                  const { x, y } = latLngToXY(hoveredAsset.lat, hoveredAsset.lng);
                  return (
                    <motion.circle
                      cx={x} cy={y} r={8}
                      fill="none"
                      stroke={SEVERITY_COLORS[hoveredAsset.severity]}
                      strokeWidth={1}
                      initial={{ scale: 0.5, opacity: 0.8 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  );
                })()}
              </svg>
            )}

            {/* Tooltip */}
            {hoveredAsset && (
              <AssetTooltip asset={hoveredAsset} x={mousePos.x} y={mousePos.y} />
            )}

            {/* Severity legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-white/[0.06]">
              {(['critical', 'high', 'medium', 'low'] as Severity[]).map(sev => (
                <div key={sev} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLORS[sev] }}
                  />
                  <span className="text-[8px] text-gray-500 capitalize">{sev}</span>
                </div>
              ))}
            </div>

            {/* Stats cards bottom-right */}
            <div className="absolute bottom-3 right-3 flex gap-2">
              {statsCards.map(card => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 border border-white/[0.06]"
                  >
                    <Icon className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] font-bold text-white tabular-nums">
                      {formatNumber(card.value)}
                    </span>
                    <span className="text-[8px] text-gray-600">{card.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── TIMELINE BAR ────────────────────────────────────────── */}
          <div className="px-4 py-3 border-t border-white/[0.04] bg-[#06060f]/80">
            {data && <Timeline timeSeries={data.timeSeries} />}
          </div>
        </div>

        {/* ── SIDE PANEL ────────────────────────────────────────────── */}
        <div className="w-[240px] border-l border-white/[0.04] bg-[#06060f]/60 backdrop-blur-sm overflow-y-auto p-3 space-y-5 hidden lg:block">
          <RegionBreakdown
            assetsByRegion={data?.assetsByRegion || {}}
            activeRegion={activeRegion}
            onRegionChange={setActiveRegion}
          />

          <div className="border-t border-white/[0.04]" />

          <TypeBreakdown
            assetsByType={data?.assetsByType || { env_files: 0, open_databases: 0, exposed_llm_endpoints: 0, unprotected_apis: 0, cloud_misconfig: 0 }}
          />

          <div className="border-t border-white/[0.04]" />

          {data && <EmbedWidget totalWeek={data.totalExposed} />}
        </div>
      </div>
    </div>
  );
}