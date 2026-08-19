"use client";

import { MonitoringPanel } from "@/components/reconpro/monitoring-panel";
import { Activity } from "lucide-react";

export default function MonitoringPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#22c55e]"><Activity /></div>
        <div>
          <h1>Monitoring</h1>
          <p>Continuous security monitoring and scheduled scan policies.</p>
        </div>
      </div>
      <MonitoringPanel />
    </div>
  );
}