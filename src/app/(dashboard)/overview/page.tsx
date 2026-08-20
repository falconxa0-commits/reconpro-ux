"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BentoDashboard } from "@/components/reconpro/bento-dashboard";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

export default function OverviewPage() {
  const router = useRouter();
  const authHeaders = useAuthHeaders();
  const [stats, setStats] = useState<null | {
    totalScans: number;
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    infoFindings: number;
    avgRiskScore: number;
    complianceScore?: number;
  }>(null);
  const [recentScans, setRecentScans] = useState<unknown[]>([]);
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    setError("");
    fetch("/api/scans", { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const scans = (data.scans || []).slice(0, 5);
        const counts = scans.reduce(
          (acc: { totalFindings: number; criticalFindings: number; highFindings: number; mediumFindings: number; lowFindings: number; infoFindings: number; totalScans: number; riskScores: number[] }, s: Record<string, unknown>) => {
            acc.totalScans += 1;
            const findings = (Array.isArray(s.findings) ? s.findings : []) as Array<{ severity?: string }>;
            acc.totalFindings += findings.length;
            acc.criticalFindings += findings.filter((f: { severity?: string }) => f.severity === "critical").length;
            acc.highFindings += findings.filter((f: { severity?: string }) => f.severity === "high").length;
            acc.mediumFindings += findings.filter((f: { severity?: string }) => f.severity === "medium").length;
            acc.lowFindings += findings.filter((f: { severity?: string }) => f.severity === "low").length;
            acc.infoFindings += findings.filter((f: { severity?: string }) => f.severity === "info").length;
            if (typeof s.riskScore === "number") acc.riskScores.push(s.riskScore);
            return acc;
          },
          { totalFindings: 0, criticalFindings: 0, highFindings: 0, mediumFindings: 0, lowFindings: 0, infoFindings: 0, totalScans: 0, riskScores: [] }
        );
        setStats({
          totalScans: counts.totalScans,
          totalFindings: counts.totalFindings,
          criticalFindings: counts.criticalFindings,
          highFindings: counts.highFindings,
          mediumFindings: counts.mediumFindings,
          lowFindings: counts.lowFindings,
          infoFindings: counts.infoFindings,
          avgRiskScore: counts.riskScores.length > 0 ? counts.riskScores.reduce((a: number, b: number) => a + b, 0) / counts.riskScores.length : 0,
          complianceScore: 0,
        });
        setRecentScans(scans);
      })
      .catch((err) => {
        console.error('Failed to load scan data:', err);
        setError('Failed to load data. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [authHeaders]);

  useEffect(() => {
    fetch('/api/compliance', { headers: authHeaders })
      .then(r => r.json())
      .then(data => {
        if (data.frameworks && data.frameworks.length > 0) {
          const avg = Math.round(data.frameworks.reduce((s: number, f: { score: number }) => s + f.score, 0) / data.frameworks.length);
          setComplianceScore(avg);
        }
      })
      .catch(() => {});
  }, [authHeaders]);

  useEffect(() => {
    setStats(prev => prev ? { ...prev, complianceScore: complianceScore ?? 0 } : null);
  }, [complianceScore]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-neutral-500"><LayoutDashboard /></div>
          <div><h1>Dashboard</h1><p>Security overview and recent reconnaissance activity.</p></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
          <div className="col-span-2 panel p-5"><div className="skeleton-pulse h-20 w-20 rounded-full mx-auto" /></div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-4"><div className="skeleton-pulse h-8 w-16 rounded mb-2" /><div className="skeleton-pulse h-3 w-20 rounded" /></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          <div className="lg:col-span-2 panel p-5"><div className="skeleton-pulse h-[220px] rounded-lg" /></div>
          <div className="flex flex-col gap-3">
            <div className="panel p-4 flex-1"><div className="skeleton-pulse h-full w-full rounded-full" /></div>
            <div className="panel p-4 flex-1"><div className="skeleton-pulse h-4 w-20 rounded mb-3" />{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-pulse h-3 w-full rounded mb-2" />)}</div>
          </div>
        </div>
        <div className="panel p-5"><div className="skeleton-pulse h-4 w-24 rounded mb-4" /><div className="skeleton-pulse h-10 w-full rounded mb-2" /><div className="skeleton-pulse h-10 w-full rounded" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#ff3355]"><LayoutDashboard /></div>
          <div><h1>Dashboard</h1><p>Security overview and recent reconnaissance activity.</p></div>
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

  return (
    <BentoDashboard
      stats={stats}
      recentScans={recentScans as never}
      onNavigate={(view: string) => {
        const pathMap: Record<string, string> = {
          surface: "/findings",
          threats: "/findings",
          scan: "/scans",
          history: "/scans",
          compliance: "/compliance",
          "unified-cli": "/scans",
          dashboard: "/overview",
        };
        const target = pathMap[view];
        if (target) router.push(target);
      }}
    />
  );
}