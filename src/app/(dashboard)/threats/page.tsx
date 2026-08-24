"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  Radio,
  Clock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ThreatAlert {
  id: string;
  title: string;
  severity: string;
  source: string;
  description: string;
  ioc: string | null;
  createdAt: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "#ff3355", bg: "rgba(255,51,85,0.1)", border: "rgba(255,51,85,0.25)" },
  high: { color: "#ff8800", bg: "rgba(255,136,0,0.1)", border: "rgba(255,136,0,0.22)" },
  medium: { color: "#d29922", bg: "rgba(210,153,34,0.1)", border: "rgba(210,153,34,0.2)" },
  low: { color: "#00ff88", bg: "rgba(0,255,136,0.1)", border: "rgba(0,255,136,0.2)" },
  info: { color: "#666666", bg: "rgba(102,102,102,0.08)", border: "rgba(102,102,102,0.15)" },
};

const SEVERITY_FILTERS = ["all", "critical", "high", "medium", "low", "info"] as const;

const SOURCE_COLOR: Record<string, string> = {
  "CVE Feed": "#ff3355",
  "CISA KEV": "#ff3355",
  "Scan Analysis": "#44aaff",
  "Threat Intel": "#ff8800",
  "AppSec Monitor": "#ff8800",
  "Cloud Security": "#ff8800",
  "CDN Security Monitor": "#d29922",
  "npm Security": "#d29922",
  "WordPress Security": "#d29922",
  "PhishTank": "#d29922",
  "Brand Protection": "#d29922",
  "Honeypot Network": "#00ff88",
};

const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 180, damping: 22 } },
};
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };

// ─── Severity Badge ──────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLOR[source] || "#666666";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border"
      style={{ color, background: `${color}14`, borderColor: `${color}33` }}
    >
      <Radio className="w-2.5 h-2.5" />
      {source}
    </span>
  );
}

function IocCell({ ioc }: { ioc: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!ioc) return <span className="text-[12px] text-neutral-700">—</span>;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ioc);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="flex items-center gap-2 max-w-[260px]">
      <code className="text-[11px] font-mono text-neutral-300 truncate flex-1 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.05]">
        {ioc}
      </code>
      <button
        onClick={copy}
        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-white/[0.06] text-neutral-600 hover:text-white hover:bg-white/[0.05] transition-all"
        aria-label={`Copy IOC ${ioc}`}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyThreats({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <ShieldCheck className="w-7 h-7 text-neutral-600" />
      </div>
      <h2 className="text-lg font-medium text-white mb-2">No active threats</h2>
      <p className="text-sm text-neutral-600 max-w-md text-center leading-relaxed mb-8">
        Threat intelligence is derived from your scan evidence — run a reconnaissance scan to surface CVE matches, exposure patterns, and exploitation campaigns relevant to your assets.
      </p>
      <Button variant="outline" size="sm" onClick={onRefresh} className="border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11">
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Re-check
      </Button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ThreatsPage() {
  const authHeaders = useAuthHeaders();
  const [threats, setThreats] = useState<ThreatAlert[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/threats", { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setThreats(data.threats || []);
        setLastUpdated(new Date());
      })
      .catch(() => {
        setError("Failed to load threat intelligence. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: threats.length };
    threats.forEach((t) => {
      counts[t.severity] = (counts[t.severity] || 0) + 1;
    });
    return counts;
  }, [threats]);

  const filteredThreats = useMemo(() => {
    const sorted = [...threats].sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const sd = (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
      if (sd !== 0) return sd;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    if (filter === "all") return sorted;
    return sorted.filter((t) => t.severity === filter);
  }, [threats, filter]);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#ff8800]">
            <AlertTriangle />
          </div>
          <div>
            <h1>Threat Intelligence</h1>
            <p>Real-time CVE and exploitation signals correlated with your attack surface.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {SEVERITY_FILTERS.map((s) => (
            <div key={s} className="skeleton-pulse h-9 w-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="skeleton-pulse h-5 w-20 rounded" />
                <div className="skeleton-pulse h-5 w-24 rounded" />
              </div>
              <div className="skeleton-pulse h-4 w-3/4 rounded" />
              <div className="skeleton-pulse h-12 w-full rounded" />
              <div className="skeleton-pulse h-6 w-40 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#ff3355]">
            <AlertTriangle />
          </div>
          <div>
            <h1>Threat Intelligence</h1>
            <p>Real-time CVE and exploitation signals correlated with your attack surface.</p>
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

  // ─── Main ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#ff8800]">
          <AlertTriangle />
        </div>
        <div>
          <h1>Threat Intelligence</h1>
          <p>Real-time CVE and exploitation signals correlated with your attack surface.</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
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
            aria-label="Refresh threats"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {threats.length === 0 ? (
        <EmptyThreats onRefresh={loadData} />
      ) : (
        <>
          {/* Severity filter chips */}
          <div className="panel p-3 mb-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {SEVERITY_FILTERS.map((sev) => {
                const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.info;
                const active = filter === sev;
                const label = sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1);
                return (
                  <button
                    key={sev}
                    onClick={() => setFilter(sev)}
                    className={`flex items-center gap-2 px-3 h-9 rounded-lg text-[11px] font-medium transition-all border ${
                      active ? "bg-white/[0.08] border-white/[0.15] text-white" : "border-transparent text-neutral-600 hover:text-neutral-400 hover:bg-white/[0.03]"
                    }`}
                  >
                    {sev !== "all" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />}
                    {label}
                    <span className="text-[10px] font-mono text-neutral-700">({severityCounts[sev] || 0})</span>
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-neutral-700 font-mono pr-1">
                <Clock className="w-3 h-3" />
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}` : ""}
              </div>
            </div>
          </div>

          {/* Threat cards */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredThreats.length === 0 ? (
                <motion.div
                  key="empty-filter"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="md:col-span-2 panel py-16 flex flex-col items-center"
                >
                  <AlertCircle className="w-7 h-7 text-neutral-700 mb-3" />
                  <p className="text-[13px] text-neutral-600">No threats at this severity level</p>
                  <button onClick={() => setFilter("all")} className="text-[12px] text-neutral-500 hover:text-white mt-2 transition-colors">
                    Show all threats
                  </button>
                </motion.div>
              ) : (
                filteredThreats.map((t) => {
                  const cfg = SEVERITY_CONFIG[t.severity] || SEVERITY_CONFIG.info;
                  return (
                    <motion.article
                      key={t.id}
                      variants={fadeUp}
                      layout
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="panel p-5 group"
                      style={{ borderLeftWidth: 2, borderLeftColor: cfg.color }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <SeverityBadge severity={t.severity} />
                        <SourceBadge source={t.source} />
                      </div>
                      <h3 className="text-[14px] font-medium text-white mb-2 leading-snug group-hover:text-[#f0f0f0] transition-colors">
                        {t.title}
                      </h3>
                      <p className="text-[12px] text-neutral-500 leading-relaxed mb-3 line-clamp-3">{t.description}</p>

                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-3 h-3 text-neutral-700 shrink-0" />
                          <span className="text-[10px] text-neutral-700 font-mono shrink-0">IOC</span>
                          <span className="text-[11px] font-mono text-neutral-500 truncate">{t.ioc || "—"}</span>
                        </div>
                        <span className="text-[10px] text-neutral-700 font-mono shrink-0">{timeAgo(t.createdAt)}</span>
                      </div>

                      {t.ioc && (
                        <div className="mt-3">
                          <IocCell ioc={t.ioc} />
                        </div>
                      )}
                    </motion.article>
                  );
                })
              )}
            </AnimatePresence>
          </motion.div>

          <p className="text-[10px] text-neutral-700 mt-4 text-center">
            Showing {filteredThreats.length} of {threats.length} threats · Intelligence is derived from your scan evidence — no fabricated feeds.
          </p>
        </>
      )}
    </div>
  );
}
