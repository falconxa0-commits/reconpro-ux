"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { EnterpriseSidebar } from "@/components/reconpro/sidebar";
import { BottomDock } from "@/components/reconpro/bottom-dock";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeView, setActiveView] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-black text-white">
      <EnterpriseSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto p-6 pb-20">
          {children}
        </main>

        <BottomDock
          activeView={activeView}
          onViewChange={setActiveView}
        />
      </div>
    </div>
  );
}
