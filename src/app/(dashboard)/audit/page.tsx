"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText,
  RefreshCw,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  History,
  AlertTriangle,
  Bot,
  Hash,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  description: string;
  severity: string;
  timestamp: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "#ff3355", bg: "rgba(255,51,85,0.1)", border: "rgba(255,51,85,0.25)" },
  high: { color: "#ff8800", bg: "rgba(255,136,0,0.1)", border: "rgba(255,136,0,0.22)" },
  medium: { color: "#d29922", bg: "rgba(210,153,34,0.1)", border: "rgba(210,153,34,0.2)" },
  low: { color: "#00ff88", bg: "rgba(0,255,136,0.1)", border: "rgba(0,255,136,0.2)" },
  info: { color: "#666666", bg: "rgba(102,102,102,0.08)", border: "rgba(102,102,102,0.15)" },
};

const SEVERITY_FILTERS = ["all", "critical", "high", "medium", "low", "info"] as const;

const ACTION_META: Record<string, { label: string; color: string; icon: typeof History }> = {
  scan_completed: { label: "Scan Completed", color: "#44aaff", icon: History },
  threat_detected: { label: "Threat Detected", color: "#ff8800", icon: AlertTriangle },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 180, damping: 22 } },
};
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };

const ITEMS_PER_PAGE = 12;

function fmtTimestamp(iso: string): { date: string; time: string; relative: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  let relative: string;
  if (min < 1) relative = "just now";
  else if (min < 60) relative = `${min}m ago`;
  else if (hr < 24) relative = `${hr}h ago`;
  else relative = `${day}d ago`;
  return { date, time, relative };
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyAudit({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <ScrollText className="w-7 h-7 text-neutral-600" />
      </div>
      <h2 className="text-lg font-medium text-white mb-2">No audit entries yet</h2>
      <p className="text-sm text-neutral-600 max-w-md text-center leading-relaxed mb-8">
        Activity is recorded automatically as scans complete and threats are detected. Run a scan to populate your audit trail.
      </p>
      <Button variant="outline" size="sm" onClick={onRefresh} className="border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11">
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Refresh
      </Button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AuditPage() {
  const authHeaders = useAuthHeaders();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/audit", { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setLogs(data.logs || []))
      .catch(() => setError("Failed to load audit logs. Please try again."))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, sevFilter]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: logs.length };
    logs.forEach((l) => {
      counts[l.severity] = (counts[l.severity] || 0) + 1;
    });
    return counts;
  }, [logs]);

  const filtered = useMemo(() => {
    let rows = [...logs];
    if (sevFilter !== "all") rows = rows.filter((l) => l.severity === sevFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.resource.toLowerCase().includes(q) ||
          l.resourceId.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [logs, sevFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#44aaff]">
            <ScrollText />
          </div>
          <div>
            <h1>Audit Logs</h1>
            <p>Immutable activity trail — scans, threat detections, and platform events.</p>
          </div>
        </div>
        <div className="panel p-4 mb-4">
          <div className="skeleton-pulse h-9 w-full rounded-lg" />
        </div>
        <div className="panel">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.03]">
              <div className="skeleton-pulse h-4 w-32 rounded" />
              <div className="skeleton-pulse h-4 w-20 rounded" />
              <div className="skeleton-pulse h-4 w-48 rounded ml-auto" />
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
            <ScrollText />
          </div>
          <div>
            <h1>Audit Logs</h1>
            <p>Immutable activity trail — scans, threat detections, and platform events.</p>
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

  if (logs.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#44aaff]">
            <ScrollText />
          </div>
          <div>
            <h1>Audit Logs</h1>
            <p>Immutable activity trail — scans, threat detections, and platform events.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="ml-auto border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
            aria-label="Refresh audit logs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
        <EmptyAudit onRefresh={loadData} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#44aaff]">
          <ScrollText />
        </div>
        <div>
          <h1>Audit Logs</h1>
          <p>Immutable activity trail — scans, threat detections, and platform events.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="ml-auto border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
          aria-label="Refresh audit logs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="ml-2 hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="panel p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, description, or resource id…"
              className="w-full h-11 pl-10 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-neutral-700 outline-none focus:border-white/[0.15] transition-colors"
              aria-label="Search audit logs"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SEVERITY_FILTERS.map((sev) => {
              const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.info;
              const active = sevFilter === sev;
              const label = sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1);
              return (
                <button
                  key={sev}
                  onClick={() => setSevFilter(sev)}
                  className="flex items-center gap-2 px-3 h-9 rounded-lg text-[11px] font-medium transition-all border"
                  style={
                    active
                      ? sev === "all"
                        ? { background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }
                        : { background: cfg.bg, borderColor: cfg.border, color: cfg.color }
                      : { borderColor: "transparent", color: "#666" }
                  }
                >
                  {sev !== "all" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />}
                  {label}
                  <span className="text-[10px] font-mono text-neutral-700">({severityCounts[sev] || 0})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-neutral-600">
          Showing {paginated.length} of {filtered.length} entries
        </p>
      </div>

      {/* Timeline table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 w-[180px]">Timestamp</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Actor</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Action</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden md:table-cell">Target</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden lg:table-cell">Description</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Severity</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginated.length === 0 ? (
                  <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="w-7 h-7 text-neutral-700 mb-3" />
                        <p className="text-[13px] text-neutral-600">No entries match your filters</p>
                        <button
                          onClick={() => {
                            setSearch("");
                            setSevFilter("all");
                          }}
                          className="text-[12px] text-neutral-500 hover:text-white mt-2 transition-colors"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  paginated.map((entry) => {
                    const meta = ACTION_META[entry.action] || { label: entry.action, color: "#666666", icon: Hash };
                    const Icon = meta.icon;
                    const sev = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.info;
                    const ts = fmtTimestamp(entry.timestamp);
                    return (
                      <motion.tr
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-mono text-neutral-300">{ts.date}</span>
                            <span className="text-[10px] font-mono text-neutral-700">
                              {ts.time} · <span className="text-neutral-600">{ts.relative}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500">
                            <Bot className="w-3 h-3" />
                            system
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border"
                            style={{ color: meta.color, background: `${meta.color}14`, borderColor: `${meta.color}33` }}
                          >
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="text-[11px] text-neutral-500 uppercase tracking-wider">{entry.resource}</span>
                            <span className="text-[10px] font-mono text-neutral-700 truncate max-w-[180px]">{entry.resourceId}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          <span className="text-[12px] text-neutral-400 leading-snug block max-w-[340px] truncate">{entry.description}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap border"
                            style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sev.color }} />
                            {entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      <div className="flex items-center gap-2 mt-4">
        <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
        <p className="text-[10px] text-neutral-700">
          Audit entries are derived from real scan and threat records · actor IP and member attribution are recorded server-side per the AuditLog schema.
        </p>
      </div>
    </div>
  );
}
