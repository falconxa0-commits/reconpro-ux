"use client";

import { TeamManagement } from "@/components/reconpro/team-management";
import { Users } from "lucide-react";

export default function TeamsPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#a3a3a3]"><Users /></div>
        <div>
          <h1>Team</h1>
          <p>Manage team members, roles, and permissions.</p>
        </div>
      </div>
      <TeamManagement />
    </div>
  );
}