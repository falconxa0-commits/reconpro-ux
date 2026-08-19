"use client";

import { CompliancePanel } from "@/components/reconpro/compliance-panel";
import { ShieldCheck } from "lucide-react";

export default function CompliancePage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#a3a3a3]"><ShieldCheck /></div>
        <div>
          <h1>Compliance</h1>
          <p>Track compliance across security frameworks.</p>
        </div>
      </div>
      <CompliancePanel />
    </div>
  );
}