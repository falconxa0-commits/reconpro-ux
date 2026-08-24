"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Activity,
  Shield,
  Crosshair,
  PieChart as PieIcon,
  BarChart3,
  Bug,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalScans: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  infoFindings: number;
  avgRiskScore: number;
}

interface SeveritySlice {
  name: string;
  value: number;
  color: string;
}

interface CategorySlice {
  category: string;
  _count: { id: number };
}

interface Scan {
  id: string;
  startedAt: string;
  riskScore?: number;
  totalVulns?: number;
  findings?: Array<{ severity: string }>;
  target?: { domain: string };
  domain?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 180, damping: 22 } },
};
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

const CHART_TOOLTIP_STYLE = {
  background: "#0a0a0a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  fontSize: "11px",
  color: "#f0f0f0",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

const axisTickStyle = { fill: "#555555", fontSize: 11 };

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  icon: typeof TrendingUp;
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

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string | number }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="px-3 py-2 rounded-lg border border-white/10 bg-[#0a0a0a] shadow-2xl">
      {label !== undefined && <p className="text-[10px] text-neutral-600 mb-1 font-mono">{label}</p>}
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

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyTrends({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <TrendingUp className="w-7 h-7 text-neutral-600" />
      </div>
      <h2 className="text-lg font-medium text-white mb-2">No trend data yet</h2>
      <p className="text-sm text-neutral-600 max-w-md text-center leading-relaxed mb-8">
        Run a few scans to populate findings-over-time, severity distribution, and asset risk breakdowns. Analytics are computed from your real scan telemetry.
      </p>
      <Button variant="outline" size="sm" onClick={onRefresh} className="border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11">
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Refresh
      </Button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TrendsPage() {
  const authHeaders = useAuthHeaders();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [severity, setSeverity] = useState<SeveritySlice[]>([]);
  const [categories, setCategories] = useState<CategorySlice[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/dashboard", { headers: authHeaders }).then((r) => {
        if (!r.ok) throw new Error(`dashboard HTTP ${r.status}`);
        return r.json();
      }),
      fetch("/api/scans", { headers: authHeaders }).then((r) => {
        if (!r.ok) throw new Error(`scans HTTP ${r.status}`);
        return r.json();
      }),
    ])
      .then(([dash, scanData]) => {
        setStats(dash.stats || null);
        setSeverity(dash.severityBreakdown || []);
        setCategories((dash.categoryBreakdown || []).slice(0, 8));
        setScans(scanData.scans || []);
      })
      .catch(() => {
        setError("Failed to load trend analytics. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Findings over time (from scans) ─────────────────────────────────────
  const findingsOverTime = useMemo(() => {
    if (scans.length === 0) return [];
    const buckets: Record<string, { date: string; total: number; critical: number }> = {};
    scans.forEach((s) => {
      const d = new Date(s.startedAt);
      const key = d.toISOString().split("T")[0];
      if (!buckets[key]) buckets[key] = { date: key, total: 0, critical: 0 };
      const f = Array.isArray(s.findings) ? s.findings : [];
      buckets[key].total += f.length;
      buckets[key].critical += f.filter((x) => x.severity === "critical").length;
    });
    return Object.values(buckets)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b) => ({ ...b, label: formatDateShort(b.date) }));
  }, [scans]);

  // ── Top vulnerable assets ───────────────────────────────────────────────
  const topAssets = useMemo(() => {
    const rows = scans
      .map((s) => {
        const f = Array.isArray(s.findings) ? s.findings : [];
        const critical = f.filter((x) => x.severity === "critical").length;
        return {
          asset: s.target?.domain || s.domain || "Unknown",
          findings: f.length,
          risk: typeof s.riskScore === "number" ? s.riskScore : 0,
          critical,
        };
      })
      .filter((r) => r.findings > 0);
    // Dedupe by asset, keep highest
    const map = new Map<string, (typeof rows)[number]>();
    rows.forEach((r) => {
      const prev = map.get(r.asset);
      if (!prev || r.risk > prev.risk) map.set(r.asset, r);
    });
    return Array.from(map.values())
      .sort((a, b) => b.findings - a.findings)
      .slice(0, 6);
  }, [scans]);

  const hasData = (stats?.totalFindings ?? 0) > 0 || scans.length > 0;

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#44aaff]">
            <TrendingUp />
          </div>
          <div>
            <h1>Threat Trends</h1>
            <p>Analytics derived from your scan history and finding severity distribution.</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-5">
              <div className="skeleton-pulse h-4 w-32 rounded mb-4" />
              <div className="skeleton-pulse h-[240px] w-full rounded-lg" />
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
            <TrendingUp />
          </div>
          <div>
            <h1>Threat Trends</h1>
            <p>Analytics derived from your scan history and finding severity distribution.</p>
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

  if (!hasData) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#44aaff]">
            <TrendingUp />
          </div>
          <div>
            <h1>Threat Trends</h1>
            <p>Analytics derived from your scan history and finding severity distribution.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="ml-auto border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
            aria-label="Refresh trends"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
        <EmptyTrends onRefresh={loadData} />
      </div>
    );
  }

  const criticalPct = stats && stats.totalFindings > 0 ? Math.round((stats.criticalFindings / stats.totalFindings) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#44aaff]">
          <TrendingUp />
        </div>
        <div>
          <h1>Threat Trends</h1>
          <p>Analytics derived from your scan history and finding severity distribution.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="ml-auto border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
          aria-label="Refresh trends"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="ml-2 hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stat cards */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Findings" value={stats?.totalFindings ?? 0} sub="across all scans" color="#44aaff" icon={Bug} />
        <StatCard label="Critical" value={stats?.criticalFindings ?? 0} sub={`${criticalPct}% of total`} color="#ff3355" icon={Crosshair} />
        <StatCard label="Avg Risk Score" value={`${stats?.avgRiskScore ?? 0}`} sub="/ 100" color="#ff8800" icon={Activity} />
        <StatCard label="Total Scans" value={stats?.totalScans ?? 0} sub="runs" color="#00ff88" icon={Shield} />
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Findings over time */}
        <motion.div variants={fadeUp} className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#44aaff]" />
              <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">Findings Over Time</h2>
            </div>
            <span className="text-[10px] text-neutral-700 font-mono">{findingsOverTime.length} data points</span>
          </div>
          <div className="h-[260px]">
            {findingsOverTime.length < 2 ? (
              <div className="h-full flex items-center justify-center text-[12px] text-neutral-700">
                Not enough scan history for a trend chart yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={findingsOverTime} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#44aaff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#44aaff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCrit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff3355" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#ff3355" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={axisTickStyle} stroke="rgba(255,255,255,0.06)" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={axisTickStyle} stroke="rgba(255,255,255,0.06)" tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.12)" }} />
                  <Area type="monotone" dataKey="total" name="Findings" stroke="#44aaff" strokeWidth={2} fill="url(#gradTotal)" />
                  <Area type="monotone" dataKey="critical" name="Critical" stroke="#ff3355" strokeWidth={2} fill="url(#gradCrit)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Severity distribution donut */}
        <motion.div variants={fadeUp} className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#00ff88]" />
              <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">Severity Distribution</h2>
            </div>
            <span className="text-[10px] text-neutral-700 font-mono">{stats?.totalFindings ?? 0} findings</span>
          </div>
          <div className="h-[260px] flex items-center">
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severity.filter((s) => s.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="#0a0a0a"
                    strokeWidth={2}
                  >
                    {severity.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-[140px] space-y-1.5">
              {severity.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-[11px] text-neutral-500 flex-1">{s.name}</span>
                  <span className="text-[11px] font-mono text-neutral-300">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top vulnerable assets */}
        <motion.div variants={fadeUp} className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#ff8800]" />
              <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">Top Vulnerable Assets</h2>
            </div>
            <span className="text-[10px] text-neutral-700 font-mono">by finding count</span>
          </div>
          <div className="h-[260px]">
            {topAssets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[12px] text-neutral-700">No findings mapped to assets yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAssets} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={axisTickStyle} stroke="rgba(255,255,255,0.06)" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="asset"
                    tick={{ fill: "#666666", fontSize: 10 }}
                    stroke="rgba(255,255,255,0.06)"
                    tickLine={false}
                    axisLine={false}
                    width={110}
                    tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 15) + "…" : v)}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="findings" name="Findings" fill="#ff8800" radius={[0, 4, 4, 0]} barSize={16}>
                    {topAssets.map((a, i) => (
                      <Cell key={i} fill={a.critical > 0 ? "#ff3355" : "#ff8800"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Category breakdown */}
        <motion.div variants={fadeUp} className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-[#00ff88]" />
              <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">Category Breakdown</h2>
            </div>
            <span className="text-[10px] text-neutral-700 font-mono">{categories.length} categories</span>
          </div>
          <div className="h-[260px]">
            {categories.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[12px] text-neutral-700">No categories yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories.map((c) => ({ name: c.category, count: c._count.id }))} margin={{ top: 4, right: 16, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#666666", fontSize: 10 }}
                    stroke="rgba(255,255,255,0.06)"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => (v.length > 8 ? v.charAt(0).toUpperCase() : v)}
                    interval={0}
                  />
                  <YAxis tick={axisTickStyle} stroke="rgba(255,255,255,0.06)" tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="count" name="Findings" fill="#00ff88" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </motion.div>

      <p className="text-[10px] text-neutral-700 mt-4 text-center">
        All charts are computed client-side from your real scan telemetry — no synthetic trend data.
      </p>
    </div>
  );
}
