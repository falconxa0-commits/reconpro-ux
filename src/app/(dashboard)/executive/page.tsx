"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Crown,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  DollarSign,
  Scale,
  Building2,
  Clock,
  Percent,
  Users,
  ShieldCheck,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExecOverview {
  totalScans: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  infoFindings: number;
  avgRiskScore: number;
  complianceScore: number | null;
  mttd: string | null;
  mttr: string | null;
}

interface ComplianceEntry {
  score: number | null;
  status: string | null;
  controlsPassed: number | null;
  controlsTotal: number | null;
}

interface RiskTrendPoint {
  date: string;
  score: number;
}

interface ImplosionResult {
  dataBreachCost: number;
  detectionCost: number;
  containmentCost: number;
  lostBusinessCost: number;
  postBreachCost: number;
  regulatoryFines: number;
  reputationalDamage: number;
  customerChurnRate: number;
  estimatedCustomersLost: number;
  stockImpactPct: number;
  estimatedMarketCapLoss: number;
  operationalDowntime: number;
  revenuePerHour: number;
  downtimeRevenueLoss: number;
  insurancePremiumIncrease: number;
  currentAnnualPremium: number;
  newAnnualPremium: number;
  scanBasedAdjustments?: {
    vulnerabilityMultiplier: number;
    findingsUsed: number;
    criticalCount: number;
    highCount: number;
  };
  narrative: string[];
  totalEstimatedImpact: number;
  recoveryTimeline: string;
}

interface IndustryComparison {
  industry: string;
  companyTotal: number;
  industryAvg: number;
  delta: number;
  deltaPct: number;
}

interface ExecData {
  overview: ExecOverview;
  topAssets: Array<{ id: string; riskScore: number; totalVulns: number; target?: { domain: string } }>;
  riskTrend: RiskTrendPoint[];
  compliance: Record<string, ComplianceEntry>;
  recentActivity: Array<{ type: string; description: string; timestamp: string; severity: string }>;
}

const INDUSTRIES: { value: string; label: string }[] = [
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Financial Services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "government", label: "Government" },
  { value: "education", label: "Education" },
];

const SCENARIOS: { value: string; label: string; description: string; color: string }[] = [
  { value: "minimal", label: "Minimal", description: "Contained, low-spread incident", color: "#00ff88" },
  { value: "moderate", label: "Moderate", description: "Realistic mid-severity breach", color: "#44aaff" },
  { value: "severe", label: "Severe", description: "Major exposure + data exfiltration", color: "#ff8800" },
  { value: "catastrophic", label: "Catastrophic", description: "Full-blast public breach event", color: "#ff3355" },
];

const FRAMEWORK_LABELS: Record<string, string> = {
  soc2: "SOC 2 Type II",
  hipaa: "HIPAA",
  pci_dss: "PCI-DSS",
  iso27001: "ISO 27001",
  nist: "NIST CSF",
  gdpr: "GDPR",
};

const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 180, damping: 22 } },
};
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

const axisTickStyle = { fill: "#555555", fontSize: 11 };

function fmtUSD(millions: number): string {
  if (millions >= 1000) return `$${(millions / 1000).toFixed(2)}B`;
  if (millions >= 1) return `$${millions.toFixed(2)}M`;
  return `$${(millions * 1000).toFixed(0)}K`;
}

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

// ─── Big Number Card ──────────────────────────────────────────────────────────

function BigCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: typeof Crown;
  emphasis?: boolean;
}) {
  return (
    <motion.div variants={fadeUp} className={`panel p-5 ${emphasis ? "stat-card" : ""}`} style={emphasis ? { borderLeftWidth: 2, borderLeftColor: color } : undefined}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-600">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.8} />
      </div>
      <div className="text-[32px] font-semibold text-white tabular-nums tracking-tight leading-none" style={{ fontFamily: "var(--font-heading)" }}>
        {value}
      </div>
      {sub && <p className="text-[11px] text-neutral-600 mt-2 leading-snug">{sub}</p>}
    </motion.div>
  );
}

function CostCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: typeof DollarSign;
}) {
  return (
    <motion.div variants={fadeUp} className="panel p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] text-neutral-500">{label}</span>
        <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.8} />
      </div>
      <div className="text-[20px] font-semibold text-white tabular-nums tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
        {value}
      </div>
    </motion.div>
  );
}

function complianceStatusColor(status: string | null): string {
  if (status === "pass") return "#00ff88";
  if (status === "fail") return "#ff3355";
  if (status === "warn") return "#d29922";
  return "#666666";
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ExecutivePage() {
  const router = useRouter();
  const authHeaders = useAuthHeaders();
  const [execData, setExecData] = useState<ExecData | null>(null);
  const [execError, setExecError] = useState("");
  const [loadingExec, setLoadingExec] = useState(true);

  const [industry, setIndustry] = useState("technology");
  const [scenario, setScenario] = useState("moderate");
  const [sim, setSim] = useState<{ result: ImplosionResult; comparison: IndustryComparison } | null>(null);
  const [simLoading, setSimLoading] = useState(true);
  const [simError, setSimError] = useState("");

  const loadExec = useCallback(() => {
    setLoadingExec(true);
    setExecError("");
    fetch("/api/executive", { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: ExecData) => setExecData(d))
      .catch(() => setExecError("Failed to load executive overview. Please try again."))
      .finally(() => setLoadingExec(false));
  }, [authHeaders]);

  const runSimulation = useCallback(
    (ind: string, sev: string) => {
      setSimLoading(true);
      setSimError("");
      fetch("/api/implosion", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ industry: ind, severityPreset: sev }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((d: { result: ImplosionResult; comparison: IndustryComparison }) => setSim(d))
        .catch(() => setSimError("Failed to run breach simulation. Please try again."))
        .finally(() => setSimLoading(false));
    },
    [authHeaders]
  );

  useEffect(() => {
    loadExec();
  }, [loadExec]);

  useEffect(() => {
    runSimulation(industry, scenario);
  }, [industry, scenario, runSimulation]);

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loadingExec) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#d29922]">
            <Crown />
          </div>
          <div>
            <h1>Executive Center</h1>
            <p>Board-ready risk briefings, breach-cost simulation, and compliance posture — in plain language.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-5 space-y-2">
              <div className="skeleton-pulse h-3 w-20 rounded" />
              <div className="skeleton-pulse h-9 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="panel p-5 mb-4">
          <div className="skeleton-pulse h-9 w-full rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-4 space-y-2">
              <div className="skeleton-pulse h-3 w-16 rounded" />
              <div className="skeleton-pulse h-6 w-20 rounded" />
            </div>
          ))}
        </div>
        <div className="panel p-5">
          <div className="skeleton-pulse h-4 w-32 rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-pulse h-3 w-full rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────
  if (execError) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#ff3355]">
            <Crown />
          </div>
          <div>
            <h1>Executive Center</h1>
            <p>Board-ready risk briefings, breach-cost simulation, and compliance posture — in plain language.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-6 py-16">
          <AlertCircle className="h-8 w-8 text-[#ff3355]/60" />
          <p className="text-sm text-[#ff8095]">{execError}</p>
          <Button variant="outline" size="sm" onClick={loadExec} className="border-white/10 text-white hover:bg-white/[0.04] h-11">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const overview = execData?.overview;
  const riskColor = (overview?.avgRiskScore ?? 0) >= 70 ? "#ff3355" : (overview?.avgRiskScore ?? 0) >= 40 ? "#ff8800" : "#00ff88";

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#d29922]">
          <Crown />
        </div>
        <div>
          <h1>Executive Center</h1>
          <p>Board-ready risk briefings, breach-cost simulation, and compliance posture — in plain language.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/reports")}
            className="border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
            aria-label="Generate board report"
          >
            <FileText className="mr-2 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Generate Report</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadExec}
            className="border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
            aria-label="Refresh executive overview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Big number cards */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <BigCard
          label="Projected Breach Cost"
          value={simLoading ? "—" : fmtUSD(sim?.result.totalEstimatedImpact ?? 0)}
          sub={sim ? `Recovery: ${sim.result.recoveryTimeline}` : "Running simulation…"}
          color="#ff3355"
          icon={DollarSign}
          emphasis
        />
        <BigCard
          label="Aggregate Risk Score"
          value={`${overview?.avgRiskScore ?? 0}`}
          sub="out of 100 · across all scans"
          color={riskColor}
          icon={TrendingDown}
          emphasis
        />
        <BigCard
          label="Mean Time To Detect"
          value={overview?.mttd || "—"}
          sub="from scan start to completion"
          color="#44aaff"
          icon={Clock}
        />
        <BigCard
          label="Mean Time To Remediate"
          value={overview?.mttr || "—"}
          sub="avg age of open findings"
          color="#d29922"
          icon={Clock}
        />
      </motion.div>

      {/* Scenario selector */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel p-5 mb-4">
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-shrink-0">
            <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-600 mb-2 block">Industry Profile</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="h-11 w-full lg:w-56 px-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white outline-none focus:border-white/[0.15] cursor-pointer appearance-none"
              aria-label="Industry profile"
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value} className="bg-[#0a0a0a] text-white">
                  {i.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-600 mb-2 block">Breach Scenario</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {SCENARIOS.map((s) => {
                const active = scenario === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => setScenario(s.value)}
                    title={s.description}
                    className="flex flex-col items-start px-3.5 h-11 rounded-lg border transition-all justify-center"
                    style={
                      active
                        ? { background: `${s.color}14`, borderColor: `${s.color}40` }
                        : { borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }
                    }
                  >
                    <span className="text-[12px] font-medium" style={{ color: active ? s.color : "#888" }}>
                      {s.label}
                    </span>
                    <span className="text-[9px] text-neutral-700 hidden md:inline">{s.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-shrink-0">
            <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-600 mb-2 block">Run</label>
            <div className="flex items-center h-11 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              {simLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-[#44aaff] animate-spin" />
                  <span className="ml-2 text-[12px] text-neutral-500">Simulating…</span>
                </>
              ) : sim ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                  <span className="ml-2 text-[12px] text-[#00ff88]">Computed</span>
                </>
              ) : (
                <span className="text-[12px] text-[#ff3355]">Error</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {simError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-[#ff3355]/70 shrink-0" />
          <p className="text-[12px] text-[#ff8095] flex-1">{simError}</p>
          <button onClick={() => runSimulation(industry, scenario)} className="text-[11px] text-neutral-400 hover:text-white transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Cost breakdown */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <CostCard label="Direct Breach Cost" value={simLoading ? "—" : fmtUSD(sim?.result.dataBreachCost ?? 0)} color="#ff3355" icon={DollarSign} />
        <CostCard label="Regulatory Fines" value={simLoading ? "—" : fmtUSD(sim?.result.regulatoryFines ?? 0)} color="#ff8800" icon={Scale} />
        <CostCard label="Reputational Damage" value={simLoading ? "—" : fmtUSD(sim?.result.reputationalDamage ?? 0)} color="#d29922" icon={Building2} />
        <CostCard label="Operational Downtime" value={simLoading ? "—" : fmtUSD(sim?.result.operationalDowntime ?? 0)} color="#44aaff" icon={Clock} />
        <CostCard label="Insurance Premium ↑" value={simLoading ? "—" : fmtUSD(sim?.result.insurancePremiumIncrease ?? 0)} color="#ff3355" icon={Percent} />
        <CostCard label="Stock Impact" value={simLoading ? "—" : `${(sim?.result.stockImpactPct ?? 0).toFixed(1)}%`} color="#ff8800" icon={TrendingDown} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        {/* Risk narrative */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-[#d29922]" />
            <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">Board Narrative</h2>
            <span className="text-[10px] text-neutral-700 font-mono ml-auto">{industry} · {scenario}</span>
          </div>
          {simLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-pulse h-3 w-full rounded" />
              ))}
            </div>
          ) : sim ? (
            <div className="space-y-3.5">
              {sim.result.narrative.map((para, i) => (
                <p key={i} className="text-[13px] text-neutral-300 leading-relaxed">
                  {para}
                </p>
              ))}
              <div className="flex items-center gap-4 pt-3 mt-2 border-t border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#ff8800]" />
                  <span className="text-[11px] text-neutral-500">Customer churn</span>
                  <span className="text-[12px] font-mono text-white">{(sim.result.customerChurnRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#ff3355]" />
                  <span className="text-[11px] text-neutral-500">Market cap loss</span>
                  <span className="text-[12px] font-mono text-white">{fmtUSD(sim.result.estimatedMarketCapLoss)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-neutral-600">No simulation available.</p>
          )}
        </motion.div>

        {/* Industry comparison */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-[#00ff88]" />
            <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">Industry Benchmark</h2>
          </div>
          {simLoading || !sim ? (
            <div className="space-y-3">
              <div className="skeleton-pulse h-4 w-full rounded" />
              <div className="skeleton-pulse h-4 w-3/4 rounded" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-neutral-600 mb-1">Your projected impact</p>
                <p className="text-[22px] font-semibold text-white tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
                  {fmtUSD(sim.comparison.companyTotal)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-600 mb-1">{INDUSTRIES.find((i) => i.value === sim.comparison.industry)?.label || sim.comparison.industry} industry average</p>
                <p className="text-[22px] font-semibold text-neutral-400 tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
                  {fmtUSD(sim.comparison.industryAvg)}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05]">
                {sim.comparison.deltaPct >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-[#ff3355]" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-[#00ff88]" />
                )}
                <span className="text-[13px] font-medium" style={{ color: sim.comparison.deltaPct >= 0 ? "#ff3355" : "#00ff88" }}>
                  {sim.comparison.deltaPct >= 0 ? "+" : ""}
                  {sim.comparison.deltaPct.toFixed(1)}%
                </span>
                <span className="text-[11px] text-neutral-600">vs industry</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Risk trend */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-[#44aaff]" />
            <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">Risk Score Trend</h2>
            <span className="text-[10px] text-neutral-700 font-mono ml-auto">from your scans</span>
          </div>
          <div className="h-[200px]">
            {(execData?.riskTrend.length ?? 0) < 2 ? (
              <div className="h-full flex items-center justify-center text-[12px] text-neutral-700">Not enough scan history to plot a trend.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={execData?.riskTrend} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff8800" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#ff8800" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={axisTickStyle} stroke="rgba(255,255,255,0.06)" tickLine={false} axisLine={false} minTickGap={24} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={axisTickStyle} stroke="rgba(255,255,255,0.06)" tickLine={false} axisLine={false} domain={[0, 100]} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.12)" }} />
                  <Area type="monotone" dataKey="score" name="Risk Score" stroke="#ff8800" strokeWidth={2} fill="url(#gradRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Compliance snapshot */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-[#00ff88]" />
            <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight">Compliance Posture</h2>
          </div>
          <div className="space-y-2.5">
            {Object.entries(execData?.compliance || {}).map(([key, c]) => {
              const color = complianceStatusColor(c.status);
              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    <span className="text-[12px] text-neutral-400 truncate">{FRAMEWORK_LABELS[key] || key}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.controlsTotal !== null && (
                      <span className="text-[10px] font-mono text-neutral-700">
                        {c.controlsPassed ?? 0}/{c.controlsTotal}
                      </span>
                    )}
                    <span className="text-[12px] font-mono font-medium" style={{ color }}>
                      {c.score !== null ? `${c.score}` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
