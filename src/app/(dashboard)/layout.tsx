"use client";

import { useState, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { EnterpriseSidebar } from "@/components/reconpro/sidebar";
import { BottomDock } from "@/components/reconpro/bottom-dock";

const VIEW_TO_PATH: Record<string, string> = {
  dashboard: "/overview",
  scan: "/scans",
  history: "/scans",
  radar: "/findings",
  surface: "/findings",
  threats: "/findings",
  advisor: "/overview",
  trends: "/overview",
  monitoring: "/monitoring",
  team: "/teams",
  integrations: "/integrations",
  compliance: "/compliance",
  settings: "/settings",
  "unified-cli": "/scans",
};

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
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const activeView = useMemo(() => {
    if (PATH_TO_VIEW[pathname]) return PATH_TO_VIEW[pathname];
    const match = Object.keys(PATH_TO_VIEW).find((p) => pathname.startsWith(p));
    return match ? PATH_TO_VIEW[match] : "dashboard";
  }, [pathname]);

  const handleViewChange = useCallback(
    (viewId: string) => {
      const targetPath = VIEW_TO_PATH[viewId];
      if (targetPath) {
        router.push(targetPath);
      }
    },
    [router]
  );

  return (
    <div className="min-h-screen flex bg-black text-white">
      <EnterpriseSidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto">
          <div className="px-6 py-6 pb-24 max-w-[1440px] mx-auto w-full">
            {children}
          </div>
        </main>

        <BottomDock
          activeView={activeView}
          onViewChange={handleViewChange}
        />
      </div>
    </div>
  );
}