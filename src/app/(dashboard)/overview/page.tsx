"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BentoDashboard } from "@/components/reconpro/bento-dashboard";
import { AlertCircle, RefreshCw } from "lucide-react";
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
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-16">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="border-zinc-700 text-white hover:bg-zinc-800">
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
