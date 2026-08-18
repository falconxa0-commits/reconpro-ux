"use client";

import { IntegrationHub } from "@/components/reconpro/integration-hub";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#555555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Integrations</h1>
          <p className="text-sm text-[#555555]">Connect external tools and services.</p>
        </div>
      </div>
      <IntegrationHub />
    </div>
  );
}