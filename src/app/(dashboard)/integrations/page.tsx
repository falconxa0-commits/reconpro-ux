"use client";

import { IntegrationHub } from "@/components/reconpro/integration-hub";
import { Puzzle } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#eab308]"><Puzzle /></div>
        <div>
          <h1>Integrations</h1>
          <p>Connect external tools and services.</p>
        </div>
      </div>
      <IntegrationHub />
    </div>
  );
}