"use client";

import { MonitoringPanel } from "@/components/reconpro/monitoring-panel";

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#555555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Monitoring</h1>
          <p className="text-sm text-[#555555]">Continuous security monitoring and scheduled scans.</p>
        </div>
      </div>
      <MonitoringPanel />
    </div>
  );
}