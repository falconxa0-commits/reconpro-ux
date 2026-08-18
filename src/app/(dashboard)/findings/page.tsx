"use client";

import { useEffect, useState, useCallback } from "react";
import { RadarMap } from "@/components/reconpro/radar-map";
import { AlertCircle, RefreshCw, ShieldCheck, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

export default function FindingsPage() {
  const authHeaders = useAuthHeaders();
  const router = useRouter();
  const [findings, setFindings] = useState<Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    description?: string;
    asset: string;
  }>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/scans", { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const allFindings = (data.scans || []).flatMap((s: { findings?: Array<{ id: string; title: string; severity: string; category: string; description?: string; asset: string }> }) =>
          s.findings || []
        );
        setFindings(allFindings.length > 0 ? allFindings : []);
      })
      .catch((err) => {
        console.error('Failed to load findings:', err);
        setError('Failed to load findings. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Map className="w-4 h-4 text-[#ff3355]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Findings</h1>
            <p className="text-sm text-[#555555]">Security findings from your reconnaissance scans.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-6 py-16">
          <AlertCircle className="h-8 w-8 text-[#ff3355]/60" />
          <p className="text-sm text-[#ff3355]/80">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="border-white/10 text-white hover:bg-white/[0.04]">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Map className="w-4 h-4 text-[#555555]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Findings</h1>
            <p className="text-sm text-[#555555]">Security findings from your reconnaissance scans.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 py-12">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <span className="text-sm text-[#555555]">Loading findings...</span>
        </div>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Map className="w-4 h-4 text-[#555555]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Findings</h1>
            <p className="text-sm text-[#555555]">Security findings from your reconnaissance scans.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
            <ShieldCheck className="w-7 h-7 text-[#555555]" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">No findings yet</h2>
          <p className="text-sm text-[#555555] max-w-sm text-center leading-relaxed mb-6">
            Run a scan to discover security vulnerabilities, misconfigurations, and exposure points.
          </p>
          <button
            onClick={() => router.push('/scans')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
          >
            Run a Scan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Map className="w-4 h-4 text-[#555555]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Findings</h1>
          <p className="text-sm text-[#555555]">Security findings from your reconnaissance scans.</p>
        </div>
      </div>
      <RadarMap findings={findings} domain="dashboard" />
    </div>
  );
}