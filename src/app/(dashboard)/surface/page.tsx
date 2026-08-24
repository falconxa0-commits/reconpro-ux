"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  RefreshCw,
  AlertCircle,
  Search,
  Server,
  Database,
  FileCode2,
  Webhook,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

// ─── Types ──────────────────────────────────────────────────────────────────

type ExposureType = "env_files" | "open_databases" | "exposed_llm_endpoints" | "unprotected_apis" | "cloud_misconfig";

interface ExposedAsset {
  id: string;
  type: ExposureType;
  severity: "critical" | "high" | "medium" | "low";
  lat: number;
  lng: number;
  city: string;
  country: string;
  region: string;
  timestamp: string;
  description: string;
}

interface SurfaceStats {
  detectedToday: number;
  detectedThisWeek: number;
  avgDaily: number;
  peakHour: number;
}

interface SurfaceData {
  totalExposed: number;
  assetsByType: Record<ExposureType, number>;
  assetsByRegion: Record<string, number>;
  recentAssets: ExposedAsset[];
  timeSeries: Array<{ hour: string; count: number }>;
  stats: SurfaceStats;
  simulated: boolean;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: "#ff3355", bg: "rgba(255,51,85,0.1)" },
  high: { color: "#ff8800", bg: "rgba(255,136,0,0.1)" },
  medium: { color: "#d29922", bg: "rgba(210,153,34,0.1)" },
  low: { color: "#00ff88", bg: "rgba(0,255,136,0.1)" },
};

const TYPE_CONFIG: Record<ExposureType, { label: string; color: string; icon: typeof Server }> = {
  env_files: { label: "Env Files", color: "#ff3355", icon: FileCode2 },
  open_databases: { label: "Open DBs", color: "#ff8800", icon: Database },
  exposed_llm_endpoints: { label: "LLM Endpoints", color: "#44aaff", icon: Webhook },
  unprotected_apis: { label: "Unprotected APIs", color: "#d29922", icon: Server },
  cloud_misconfig: { label: "Cloud Misconfig", color: "#00ff88", icon: Cloud },
};

const REGION_LABEL: Record<string, string> = {
  north_america: "N. America",
  europe: "Europe",
  asia: "Asia",
  south_america: "S. America",
  africa: "Africa",
  oceania: "Oceania",
  // Asset.region enum uses short codes
  na: "N. America",
  eu: "Europe",
  sa: "S. America",
};

const ITEMS_PER_PAGE = 10;

const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 180, damping: 22 } },
};
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

const axisTickStyle = { fill: "#555555", fontSize: 11 };

// ─── Badges ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ExposureType }) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return <span className="text-[12px] text-neutral-600">{type}</span>;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap border"
      style={{ color: cfg.color, background: `${cfg.color}14`, borderColor: `${cfg.color}33` }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] || { color: "#666666", bg: "rgba(102,102,102,0.08)" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string | number }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="px-3 py-2 rounded-lg border border-white/10 bg-[#0a0a0a] shadow-2xl">
      {label !== undefined && <p className="text-[10px] text-neutral-600 mb-1 font-mono">{label} UTC</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-neutral-400">{p.name}</span>
          <span className="text-white font-mono font-medium ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: typeof Globe;
}) {
  return (
    <motion.div variants={fadeUp} className="panel p-4 stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-600">{label}</span>
        <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.8} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] font-semibold text-white tabular-nums tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          {value}
        </span>
        {sub && <span className="text-[11px] text-neutral-600">{sub}</span>}
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SurfacePage() {
  const authHeaders = useAuthHeaders();
  const [data, setData] = useState<SurfaceData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sevFilter, setSevFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/exposed-assets", { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: SurfaceData) => setData(d))
      .catch(() => {
        setError("Failed to load attack surface telemetry. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, sevFilter, regionFilter]);

  const filteredAssets = useMemo(() => {
    if (!data) return [];
    let rows = [...data.recentAssets];
    if (typeFilter !== "all") rows = rows.filter((a) => a.type === typeFilter);
    if (sevFilter !== "all") rows = rows.filter((a) => a.severity === sevFilter);
    if (regionFilter !== "all") rows = rows.filter((a) => a.region === regionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.country.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data, typeFilter, sevFilter, regionFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / ITEMS_PER_PAGE));
  const paginated = filteredAssets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Top regions sorted
  const topRegions = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.assetsByRegion)
      .map(([k, v]) => ({ key: k, label: REGION_LABEL[k] || k, value: v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data]);

  const maxRegion = topRegions[0]?.value || 1;

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#44aaff]">
            <Globe />
          </div>
          <div>
            <h1>Attack Surface</h1>
            <p>Global exposure telemetry — exposed assets, services, and misconfigurations detected worldwide.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-4 space-y-2">
              <div className="skeleton-pulse h-3 w-16 rounded" />
              <div className="skeleton-pulse h-8 w-20 rounded" />
            </div>
          ))}
        </div>
        <div className="panel p-4 mb-4">
          <div className="skeleton-pulse h-9 w-full rounded-lg" />
        </div>
        <div className="panel">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.03]">
              <div className="skeleton-pulse h-4 w-24 rounded" />
              <div className="skeleton-pulse h-4 w-20 rounded" />
              <div className="skeleton-pulse h-4 w-16 rounded" />
              <div className="skeleton-pulse h-4 w-40 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#ff3355]">
            <Globe />
          </div>
          <div>
            <h1>Attack Surface</h1>
            <p>Global exposure telemetry — exposed assets, services, and misconfigurations detected worldwide.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-6 py-16">
          <AlertCircle className="h-8 w-8 text-[#ff3355]/60" />
          <p className="text-sm text-[#ff8095]">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="border-white/10 text-white hover:bg-white/[0.04] h-11">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#44aaff]">
          <Globe />
        </div>
        <div>
          <h1>Attack Surface</h1>
          <p>Global exposure telemetry — exposed assets, services, and misconfigurations detected worldwide.</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {data.simulated && (
            <span className="text-[10px] text-neutral-700 font-mono hidden sm:inline px-2 py-1 rounded border border-white/[0.06]">
              Simulated telemetry
            </span>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00ff88]/[0.06] border border-[#00ff88]/[0.15]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ff88]" />
            </span>
            <span className="text-[10px] font-medium text-[#00ff88] uppercase tracking-wider">Live</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
            aria-label="Refresh attack surface"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Exposed" value={data.totalExposed.toLocaleString()} sub="this week" color="#ff3355" icon={Activity} />
        <StatCard label="Detected Today" value={data.stats.detectedToday.toLocaleString()} color="#ff8800" icon={Globe} />
        <StatCard label="Avg Daily" value={data.stats.avgDaily.toLocaleString()} color="#44aaff" icon={Server} />
        <StatCard label="Peak Hour" value={`${String(data.stats.peakHour).padStart(2, "0")}:00`} sub="UTC" color="#00ff88" icon={Activity} />
      </motion.div>

      {/* 24h chart + regions */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <motion.div variants={fadeUp} className="panel p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#44aaff]" />
            <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">Detections · Last 24h</h2>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeSeries} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#44aaff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#44aaff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={axisTickStyle} stroke="rgba(255,255,255,0.06)" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={axisTickStyle} stroke="rgba(255,255,255,0.06)" tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.12)" }} />
                <Area type="monotone" dataKey="count" name="Detections" stroke="#44aaff" strokeWidth={2} fill="url(#gradExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[#00ff88]" />
            <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">By Region</h2>
          </div>
          <div className="space-y-2.5">
            {topRegions.map((r) => (
              <div key={r.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-neutral-400">{r.label}</span>
                  <span className="text-[11px] font-mono text-neutral-500">{r.value.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.value / maxRegion) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #00ff88, #44aaff)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Toolbar */}
      <div className="panel p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by asset id, city, country, or description…"
              className="w-full h-11 pl-10 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-neutral-700 outline-none focus:border-white/[0.15] transition-colors"
              aria-label="Search assets"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 h-9 rounded-lg text-[11px] font-medium transition-all border ${
                typeFilter === "all" ? "bg-white/[0.08] border-white/[0.15] text-white" : "border-transparent text-neutral-600 hover:text-neutral-400 hover:bg-white/[0.03]"
              }`}
            >
              All Types
            </button>
            {(Object.keys(TYPE_CONFIG) as ExposureType[]).map((t) => {
              const cfg = TYPE_CONFIG[t];
              const Icon = cfg.icon;
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(active ? "all" : t)}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-[11px] font-medium transition-all border ${
                    active ? "bg-white/[0.08] border-white/[0.15] text-white" : "border-transparent text-neutral-600 hover:text-neutral-400 hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSevFilter("all")}
              className={`px-3 h-9 rounded-lg text-[11px] font-medium transition-all border ${
                sevFilter === "all" ? "bg-white/[0.08] border-white/[0.15] text-white" : "border-transparent text-neutral-600 hover:text-neutral-400 hover:bg-white/[0.03]"
              }`}
            >
              All
            </button>
            {["critical", "high", "medium", "low"].map((s) => {
              const cfg = SEVERITY_CONFIG[s];
              const active = sevFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setSevFilter(active ? "all" : s)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[11px] font-medium transition-all border"
                  style={
                    active
                      ? { background: cfg.bg, borderColor: `${cfg.color}40`, color: cfg.color }
                      : { borderColor: "transparent", color: "#666" }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-neutral-600">
          Showing {paginated.length} of {filteredAssets.length} assets
          {data.simulated && <span className="ml-2 text-neutral-700">· Simulated telemetry</span>}
        </p>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Asset ID</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Type</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Severity</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden md:table-cell">Location</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden lg:table-cell">Description</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Detected</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Globe className="w-7 h-7 text-neutral-700 mb-3" />
                      <p className="text-[13px] text-neutral-600">No assets match your filters</p>
                      <button
                        onClick={() => {
                          setSearch("");
                          setTypeFilter("all");
                          setSevFilter("all");
                          setRegionFilter("all");
                        }}
                        className="text-[12px] text-neutral-500 hover:text-white mt-2 transition-colors"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono text-neutral-400">{a.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <TypeBadge type={a.type} />
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={a.severity} />
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-neutral-300">{a.city}</span>
                        <span className="text-[10px] font-mono text-neutral-700">
                          {a.country} · {REGION_LABEL[a.region] || a.region}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-[12px] text-neutral-500 leading-snug block max-w-[320px] truncate">{a.description}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono text-neutral-500">{timeAgo(a.timestamp)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-neutral-700">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 w-9 rounded-lg border border-white/[0.06] text-neutral-600 hover:text-white hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-9 w-9 rounded-lg text-[12px] font-medium transition-all ${
                      page === p ? "bg-white/[0.1] text-white border border-white/[0.15]" : "text-neutral-600 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-9 w-9 rounded-lg border border-white/[0.06] text-neutral-600 hover:text-white hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
