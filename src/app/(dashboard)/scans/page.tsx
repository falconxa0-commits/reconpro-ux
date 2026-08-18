"use client";

import { useState } from "react";
import { ScanInput } from "@/components/reconpro/scan-input";
import { ScanResults } from "@/components/reconpro/scan-results";
import { AlertCircle, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

export default function ScansPage() {
  const authHeaders = useAuthHeaders();
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
        headers: { "Content-Type": "application/json", ...authHeaders },
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
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Radar className="w-4 h-4 text-[#00ff88]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Reconnaissance</h1>
            <p className="text-sm text-[#555555]">Run scans against targets to discover security findings.</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        <ScanInput onScan={handleScan} isScanning={isScanning} />
      </div>

      {scanError && (
        <div className="max-w-2xl flex items-center gap-3 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-3 text-sm text-[#ff3355]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {scanError}
        </div>
      )}

      {lastResult && (
        <div className="mt-4">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <h2 className="text-lg font-medium text-white">{lastResult.domain}</h2>
              <p className="text-sm text-[#555555]">
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