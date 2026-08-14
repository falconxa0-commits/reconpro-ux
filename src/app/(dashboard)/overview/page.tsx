"use client";

import { useEffect, useState } from "react";
import { BentoDashboard } from "@/components/reconpro/bento-dashboard";

export default function OverviewPage() {
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

  useEffect(() => {
    fetch("/api/scans")
      .then((r) => r.json())
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
      .catch(() => {});
  }, []);

  return (
    <BentoDashboard
      stats={stats}
      recentScans={recentScans as never}
      onNavigate={() => {}}
    />
  );
}
