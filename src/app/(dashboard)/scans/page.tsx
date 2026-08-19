"use client";

import { useState } from "react";
import { ScanInput } from "@/components/reconpro/scan-input";
import { ScanResults } from "@/components/reconpro/scan-results";
import { AlertCircle, Radar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";
import { useRouter } from "next/navigation";
import { useEffect, useState as useStateEffect } from "react";

export default function ScansPage() {
  const authHeaders = useAuthHeaders();
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [lastResult, setLastResult] = useState<null | {
    id: string;
    domain: string;
    status: string;
    riskScore: number;
    totalVulns: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    findings: Array<{
      id: string;
      title: string;
      severity: string;
      category: string;
      description?: string;
    }>;
  }>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [showHistory, setShowHistory] = useState(true);

  const handleScan = async (domain: string, scanType: string) => {
    setIsScanning(true);
    setScanError("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ domain, scanType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Scan failed with status ${res.status}`);
      }
      const data = await res.json();
      setLastResult({
        id: data.scan?.id || "scan-1",
        domain,
        status: "completed",
        riskScore: data.scan?.riskScore || 0,
        totalVulns: (data.scan?.findings || []).length,
        critical: (data.scan?.findings || []).filter((f: { severity?: string }) => f.severity === "critical").length,
        high: (data.scan?.findings || []).filter((f: { severity?: string }) => f.severity === "high").length,
        medium: (data.scan?.findings || []).filter((f: { severity?: string }) => f.severity === "medium").length,
        low: (data.scan?.findings || []).filter((f: { severity?: string }) => f.severity === "low").length,
        info: (data.scan?.findings || []).filter((f: { severity?: string }) => f.severity === "info").length,
        findings: (data.scan?.findings || []).map((f: { id?: string; title?: string; severity?: string; category?: string; description?: string }) => ({
          id: f.id || `f-${Math.random().toString(36).slice(2)}`,
          title: f.title || "Unknown Finding",
          severity: f.severity || "info",
          category: f.category || "general",
          description: f.description,
        })),
      });
      loadHistory();
    } catch (err: unknown) {
      console.error('Scan failed:', err);
      setScanError(err instanceof Error ? err.message : 'Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const loadHistory = () => {
    fetch('/api/scans/history', { headers: authHeaders })
      .then(r => r.json())
      .then(data => setHistory(data.scans || []))
      .catch(() => {});
  };

  useEffect(() => { loadHistory(); }, []);

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div>
      {/* Page Header */
      <div className="page-header">
        <div className="page-header-icon text-[#22c55e]">
          <Radar />
        </div>
        <div>
          <h1>Reconnaissance</h1>
          <p>Run scans against targets to discover security findings.</p>
        </div>
      </div>

      {/* Scan Input */
      <div className="max-w-2xl mb-8">
        <ScanInput onScan={handleScan} isScanning={isScanning} />
      </div>

      {/* Error */
      {scanError && (
        <div className="max-w-2xl mb-6 flex items-center gap-3 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/[0.04] px-4 py-3 text-sm text-[#fca5a5]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {scanError}
        </div>
      )}

      {/* Last Result */
      {lastResult && (
        <div className="mb-8">
          <div className="panel p-5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium text-white">{lastResult.domain}</h2>
                <p className="text-[12px] text-neutral-600 mt-0.5">{lastResult.findings.length} findings discovered</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono" style={{ color: lastResult.riskScore > 70 ? '#ef4444' : lastResult.riskScore > 40 ? '#eab308' : '#22c55e' }}>
                    {lastResult.riskScore}
                  </div>
                  <div className="text-[10px] text-neutral-700 uppercase tracking-wider">Risk Score</div>
                </div>
              </div>
            </div>
          </div>
          <ScanResults result={lastResult as never} />
        </div>
      )}

      {/* Scan History */
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.12em]">Scan History</span>
          <button onClick={() => setShowHistory(!showHistory)} className="text-[11px] text-neutral-700 hover:text-white transition-colors flex items-center gap-1">
            {showHistory ? 'Collapse' : 'Expand'} <ChevronRight className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </button>
        </div>
        {showHistory && (
          history.length === 0 ? (
            <div className="text-[12px] text-neutral-700 py-8 text-center">No scans recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 pr-4">Domain</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 pr-4">Type</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 pr-4">Risk</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 pr-4">Findings</th>
                    <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((scan: Record<string, unknown>) => (
                    <tr key={String(scan.id)} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer group" onClick={() => router.push('/findings')}>
                      <td className="py-3 pr-4 text-[12px] font-mono text-neutral-500 group-hover:text-neutral-300 transition-colors">{String(scan.domain)}</td>
                      <td className="py-3 pr-4"><span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-neutral-500 uppercase">{String(scan.scanType || 'full')}</span></td>
                      <td className="py-3 pr-4"><span className="text-[12px] font-mono font-semibold" style={{ color: Number(scan.riskScore) > 70 ? '#ef4444' : Number(scan.riskScore) > 40 ? '#eab308' : '#22c55e' }}>{String(scan.riskScore)}</span></td>
                      <td className="py-3 pr-4 text-[12px] text-neutral-600">{String(scan.totalVulns ?? 0)}</td>
                      <td className="py-3 text-[11px] text-neutral-700 font-mono">{timeAgo(String(scan.startedAt || scan.createdAt || ''))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}