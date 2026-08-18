"use client";

import { TeamManagement } from "@/components/reconpro/team-management";

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#555555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Team</h1>
          <p className="text-sm text-[#555555]">Manage team members, roles, and permissions.</p>
        </div>
      </div>
      <TeamManagement />
    </div>
  );
}