"use client";

import { CompliancePanel } from "@/components/reconpro/compliance-panel";

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#555555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Compliance</h1>
          <p className="text-sm text-[#555555]">Track compliance across security frameworks.</p>
        </div>
      </div>
      <CompliancePanel />
    </div>
  );
}
