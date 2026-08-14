"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { EnterpriseSidebar } from "@/components/reconpro/sidebar";
import { BottomDock } from "@/components/reconpro/bottom-dock";

const PATH_TO_VIEW: Record<string, string> = {
  "/overview": "dashboard",
  "/scans": "scan",
  "/findings": "radar",
  "/monitoring": "monitoring",
  "/teams": "team",
  "/integrations": "integrations",
  "/compliance": "compliance",
  "/settings": "settings",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const activeView = useMemo(() => {
    // Try exact match first, then prefix match
    if (PATH_TO_VIEW[pathname]) return PATH_TO_VIEW[pathname];
    const match = Object.keys(PATH_TO_VIEW).find((p) => pathname.startsWith(p));
    return match ? PATH_TO_VIEW[match] : "dashboard";
  }, [pathname]);

  return (
    <div className="min-h-screen flex bg-black text-white">
      <EnterpriseSidebar
        activeView={activeView}
        onViewChange={() => {}}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto p-6 pb-20">
          {children}
        </main>

        <BottomDock
          activeView={activeView}
          onViewChange={() => {}}
        />
      </div>
    </div>
  );
}
