"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  RefreshCw,
  AlertCircle,
  Download,
  Trash2,
  Plus,
  X,
  FileCheck2,
  Loader2,
  ShieldAlert,
  Globe,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ScanRow {
  id: string;
  riskScore: number;
  totalVulns: number;
  criticalCount: number;
  startedAt: string;
  completedAt: string | null;
  scanType: string;
  status: string;
  target?: { domain: string; ip: string | null };
  findings?: Array<{ severity: string }>;
}

interface GeneratedReport {
  reportId: string;
  scanId: string;
  domain: string;
  type: string;
  riskScore: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  scanStartedAt: string;
  scanCompletedAt: string | null;
  generatedAt: string;
  status: "generating" | "ready" | "error";
  sizeBytes: number;
  payload: unknown;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 180, damping: 22 } },
};
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ff3355",
  high: "#ff8800",
  medium: "#d29922",
  low: "#00ff88",
  info: "#666666",
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const authHeaders = useAuthHeaders();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadScans = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/scans", { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setScans(data.scans || []))
      .catch(() => setError("Failed to load scans. Please try again."))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  // Open dialog → pre-select first scan
  useEffect(() => {
    if (dialogOpen && scans.length > 0 && !selectedScanId) {
      setSelectedScanId(scans[0].id);
    }
  }, [dialogOpen, scans, selectedScanId]);

  const eligibleScans = useMemo(() => scans.filter((s) => s.status === "completed" && (s.findings?.length ?? 0) >= 0), [scans]);

  const generateReport = useCallback(
    async (scanId: string) => {
      setGenerating(true);
      setGenError("");

      const scan = scans.find((s) => s.id === scanId);
      if (!scan) {
        setGenError("Selected scan not found.");
        setGenerating(false);
        return;
      }

      const reportId = `rpt_${scanId}`;
      // Optimistic entry — mark generating
      const optimistic: GeneratedReport = {
        reportId,
        scanId,
        domain: scan.target?.domain || "Unknown",
        type: "Security Assessment",
        riskScore: scan.riskScore,
        totalFindings: scan.totalVulns,
        criticalCount: scan.criticalCount,
        highCount: scan.findings?.filter((f) => f.severity === "high").length ?? 0,
        mediumCount: scan.findings?.filter((f) => f.severity === "medium").length ?? 0,
        lowCount: scan.findings?.filter((f) => f.severity === "low").length ?? 0,
        infoCount: scan.findings?.filter((f) => f.severity === "info").length ?? 0,
        scanStartedAt: scan.startedAt,
        scanCompletedAt: scan.completedAt,
        generatedAt: new Date().toISOString(),
        status: "generating",
        sizeBytes: 0,
        payload: null,
      };
      setReports((prev) => [optimistic, ...prev.filter((r) => r.reportId !== reportId)]);
      setDialogOpen(false);

      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ scanId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        const payloadStr = JSON.stringify(data, null, 2);
        const sizeBytes = new Blob([payloadStr]).size;

        setReports((prev) =>
          prev.map((r) =>
            r.reportId === reportId
              ? {
                  ...r,
                  status: "ready",
                  sizeBytes,
                  payload: data,
                  generatedAt: new Date().toISOString(),
                }
              : r
          )
        );
      } catch (err) {
        setReports((prev) => prev.map((r) => (r.reportId === reportId ? { ...r, status: "error" } : r)));
        setGenError(err instanceof Error ? err.message : "Failed to generate report.");
      } finally {
        setGenerating(false);
      }
    },
    [authHeaders, scans]
  );

  const downloadReport = useCallback(
    async (report: GeneratedReport) => {
      setDownloadingId(report.reportId);
      try {
        // Re-fetch the report JSON fresh from the API (ensures latest data + uses endpoint)
        const res = await fetch(`/api/reports?scanId=${encodeURIComponent(report.scanId)}`, { headers: authHeaders });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reconpro-report-${report.domain}-${fmtDate(report.scanStartedAt).replace(/, /g, "-")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        setGenError("Failed to download report.");
      } finally {
        setDownloadingId(null);
      }
    },
    [authHeaders]
  );

  const removeReport = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.reportId !== reportId));
  };

  const riskColor = (score: number) => (score >= 80 ? "#ff3355" : score >= 60 ? "#ff8800" : score >= 40 ? "#d29922" : "#00ff88");

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#44aaff]">
            <FileText />
          </div>
          <div>
            <h1>Reports</h1>
            <p>Generate and download structured security assessment reports from your scans.</p>
          </div>
        </div>
        <div className="panel">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.03]">
              <div className="skeleton-pulse h-9 w-9 rounded-lg" />
              <div className="skeleton-pulse h-4 w-40 rounded" />
              <div className="skeleton-pulse h-4 w-24 rounded ml-auto" />
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
            <FileText />
          </div>
          <div>
            <h1>Reports</h1>
            <p>Generate and download structured security assessment reports from your scans.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-6 py-16">
          <AlertCircle className="h-8 w-8 text-[#ff3355]/60" />
          <p className="text-sm text-[#ff8095]">{error}</p>
          <Button variant="outline" size="sm" onClick={loadScans} className="border-white/10 text-white hover:bg-white/[0.04] h-11">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#44aaff]">
          <FileText />
        </div>
        <div>
          <h1>Reports</h1>
          <p>Generate and download structured security assessment reports from your scans.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadScans}
            className="border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
            aria-label="Refresh scans"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={eligibleScans.length === 0}
            className="h-11 bg-[#00ff88] text-black hover:bg-[#00e67a] font-semibold hover:shadow-[0_0_20px_rgba(0,255,136,0.25)]"
            aria-label="Generate report"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            <span className="ml-2">Generate Report</span>
          </Button>
        </div>
      </div>

      {genError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-[#ff3355]/70 shrink-0" />
          <p className="text-[12px] text-[#ff8095] flex-1">{genError}</p>
          <button onClick={() => setGenError("")} className="text-[11px] text-neutral-400 hover:text-white transition-colors" aria-label="Dismiss error">
            Dismiss
          </button>
        </div>
      )}

      {/* Empty state */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
            <FileCheck2 className="w-7 h-7 text-neutral-600" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">No reports generated yet</h2>
          <p className="text-sm text-neutral-600 max-w-md text-center leading-relaxed mb-8">
            {eligibleScans.length === 0
              ? "Complete a scan first, then generate a structured security assessment report you can share with stakeholders."
              : "Generate a structured security assessment report from any completed scan. Reports include an executive summary, severity breakdown, findings, and prioritized recommendations."}
          </p>
          {eligibleScans.length > 0 && (
            <Button onClick={() => setDialogOpen(true)} className="h-11 bg-[#00ff88] text-black hover:bg-[#00e67a] font-semibold">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Generate your first report
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Report list — table */}
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Report</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden md:table-cell">Type</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden lg:table-cell">Period</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden md:table-cell">Findings</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Risk</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden lg:table-cell">Size</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Status</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <motion.tr
                      key={r.reportId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.05] flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-[#44aaff]" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[12px] font-mono text-neutral-300 block truncate">{r.reportId}</span>
                            <span className="text-[11px] text-neutral-600 flex items-center gap-1">
                              <Globe className="w-2.5 h-2.5" />
                              {r.domain}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-neutral-400">{r.type}</span>
                      </td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <div className="flex flex-col">
                          <span className="text-[12px] text-neutral-400">{fmtDate(r.scanStartedAt)}</span>
                          <span className="text-[10px] font-mono text-neutral-700">
                            {fmtTime(r.scanStartedAt)} → {r.scanCompletedAt ? fmtTime(r.scanCompletedAt) : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          {r.criticalCount > 0 && <span className="text-[11px] font-mono text-[#ff3355]">{r.criticalCount}C</span>}
                          {r.highCount > 0 && <span className="text-[11px] font-mono text-[#ff8800]">{r.highCount}H</span>}
                          {r.mediumCount > 0 && <span className="text-[11px] font-mono text-[#d29922]">{r.mediumCount}M</span>}
                          {r.lowCount > 0 && <span className="text-[11px] font-mono text-[#00ff88]">{r.lowCount}L</span>}
                          <span className="text-[11px] font-mono text-neutral-600 ml-1">· {r.totalFindings}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[13px] font-mono font-medium" style={{ color: riskColor(r.riskScore) }}>
                          {r.riskScore}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <span className="text-[11px] font-mono text-neutral-500">{r.sizeBytes > 0 ? fmtBytes(r.sizeBytes) : "—"}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.status === "generating" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-[#d29922]/25 bg-[#d29922]/[0.08] text-[#d29922]">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Generating
                          </span>
                        ) : r.status === "error" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-[#ff3355]/25 bg-[#ff3355]/[0.08] text-[#ff3355]">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-[#00ff88]/25 bg-[#00ff88]/[0.08] text-[#00ff88]">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Ready
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => downloadReport(r)}
                            disabled={r.status !== "ready" || downloadingId === r.reportId}
                            className="h-9 px-3 rounded-lg border border-white/[0.06] text-neutral-400 hover:text-white hover:border-white/[0.14] hover:bg-white/[0.04] transition-all inline-flex items-center gap-1.5 text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label={`Download report ${r.reportId}`}
                          >
                            {downloadingId === r.reportId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Download</span>
                          </button>
                          <button
                            onClick={() => removeReport(r.reportId)}
                            className="h-9 w-9 rounded-lg border border-white/[0.06] text-neutral-600 hover:text-[#ff3355] hover:border-[#ff3355]/20 hover:bg-[#ff3355]/[0.04] transition-all flex items-center justify-center"
                            aria-label={`Remove report ${r.reportId}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[10px] text-neutral-700 mt-4 text-center">
            {reports.length} report{reports.length === 1 ? "" : "s"} generated this session · Reports are produced on demand from your scan evidence via the /api/reports endpoint.
          </p>
        </>
      )}

      {/* ─── Generate Dialog ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {dialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Generate report dialog"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !generating && setDialogOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative panel p-6 w-full max-w-md"
              style={{ background: "#0a0a0a" }}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#00ff88]/[0.08] border border-[#00ff88]/[0.15] flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-[#00ff88]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-white tracking-tight">Generate Report</h2>
                    <p className="text-[11px] text-neutral-600">Security assessment from a completed scan</p>
                  </div>
                </div>
                <button
                  onClick={() => !generating && setDialogOpen(false)}
                  className="h-9 w-9 rounded-lg text-neutral-600 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {eligibleScans.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertCircle className="w-6 h-6 text-neutral-700" />
                  <p className="text-[13px] text-neutral-600 max-w-xs">No completed scans available to report. Run a scan first.</p>
                </div>
              ) : (
                <>
                  <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-600 mb-2 block">Select Scan</label>
                  <div className="relative">
                    <select
                      value={selectedScanId}
                      onChange={(e) => setSelectedScanId(e.target.value)}
                      disabled={generating}
                      className="w-full h-11 px-3 pr-10 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white outline-none focus:border-white/[0.15] cursor-pointer appearance-none disabled:opacity-60"
                      aria-label="Select scan for report"
                    >
                      {eligibleScans.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0a0a0a] text-white">
                          {s.target?.domain || "Unknown"} · {fmtDate(s.startedAt)} · risk {s.riskScore}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                  </div>

                  <div className="mt-4 panel p-3.5 bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <p className="text-[11px] text-neutral-600 mb-2.5 uppercase tracking-wider">Report will include</p>
                    <ul className="space-y-1.5 text-[12px] text-neutral-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-[#00ff88] shrink-0" /> Executive summary with risk level &amp; compliance score
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-[#00ff88] shrink-0" /> Full findings breakdown by severity
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-[#00ff88] shrink-0" /> Prioritized remediation recommendations
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-[#00ff88] shrink-0" /> Scan metadata &amp; platform version
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-2.5 mt-5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogOpen(false)}
                      disabled={generating}
                      className="flex-1 h-11 border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => selectedScanId && generateReport(selectedScanId)}
                      disabled={generating || !selectedScanId}
                      className="flex-1 h-11 bg-[#00ff88] text-black hover:bg-[#00e67a] font-semibold"
                    >
                      {generating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <FileCheck2 className="mr-2 h-3.5 w-3.5" />}
                      Generate
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
