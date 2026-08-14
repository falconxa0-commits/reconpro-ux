"use client";

import { useEffect, useState } from "react";
import { RadarMap } from "@/components/reconpro/radar-map";

export default function FindingsPage() {
  const [findings, setFindings] = useState<Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    description?: string;
    asset: string;
  }>>([]);

  useEffect(() => {
    fetch("/api/scans")
      .then((r) => r.json())
      .then((data) => {
        const allFindings = (data.scans || []).flatMap((s: { findings?: Array<{ id: string; title: string; severity: string; category: string; description?: string; asset: string }> }) =>
          s.findings || []
        );
        setFindings(allFindings.length > 0 ? allFindings : []);
      })
      .catch(() => {});
  }, []);

  if (findings.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Findings</h1>
        <div className="text-white/40 text-sm">No findings yet. Run a scan to populate this view.</div>
      </div>
    );
  }

  return <RadarMap findings={findings} domain="dashboard" />;
}
