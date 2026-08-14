"use client";

import { useState } from "react";
import { ScanInput } from "@/components/reconpro/scan-input";
import { ScanResults } from "@/components/reconpro/scan-results";
import { AlertCircle } from "lucide-react";

export default function ScansPage() {
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

  const handleScan = async (domain: string, scanType: string) => {
    setIsScanning(true);
    setScanError("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, scanType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Scan failed with status ${res.status}`);
      }
      const data = await res.json();
      setLastResult({
        id: data.id || "scan-1",
        domain,
        status: "completed",
        riskScore: data.riskScore || 0,
        totalVulns: (data.findings || []).length,
        critical: (data.findings || []).filter((f: { severity?: string }) => f.severity === "critical").length,
        high: (data.findings || []).filter((f: { severity?: string }) => f.severity === "high").length,
        medium: (data.findings || []).filter((f: { severity?: string }) => f.severity === "medium").length,
        low: (data.findings || []).filter((f: { severity?: string }) => f.severity === "low").length,
        info: (data.findings || []).filter((f: { severity?: string }) => f.severity === "info").length,
        findings: (data.findings || []).map((f: { id?: string; title?: string; severity?: string; category?: string; description?: string }) => ({
          id: f.id || `f-${Math.random().toString(36).slice(2)}`,
          title: f.title || "Unknown Finding",
          severity: f.severity || "info",
          category: f.category || "general",
          description: f.description,
        })),
      });
    } catch (err: unknown) {
      console.error('Scan failed:', err);
      setScanError(err instanceof Error ? err.message : 'Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Scans</h1>
      <p className="text-white/40 text-sm">Run reconnaissance scans against targets.</p>

      <div className="max-w-2xl">
        <ScanInput onScan={handleScan} isScanning={isScanning} />
      </div>

      {scanError && (
        <div className="max-w-2xl flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {scanError}
        </div>
      )}

      {lastResult && (
        <div className="mt-8">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{lastResult.domain}</h2>
              <p className="text-sm text-white/40">
                {lastResult.findings.length} findings across {lastResult.totalVulns} categories
              </p>
            </div>
          </div>
          <ScanResults result={lastResult as never} />
        </div>
      )}
    </div>
  );
}
