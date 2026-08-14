"use client";

import { useEffect, useState } from "react";
import { RadarMap } from "@/components/reconpro/radar-map";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FindingsPage() {
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

  const loadData = () => {
    setLoading(true);
    setError("");
    fetch("/api/scans")
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
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Findings</h1>
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Findings</h1>
        <div className="text-white/40 text-sm">Loading findings...</div>
      </div>
    );
  }

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
