"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  ScanSearch,
  ShieldCheck,
  Terminal,
  FileText,
  Settings,
  BookOpen,
  Copy,
  Play,
  HelpCircle,
  MessageSquare,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { useSmoothScroll } from "@/hooks/useInView";

interface PaletteItem {
  id: string;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  description?: string;
  group: "navigation" | "actions" | "help";
  href?: string;
  section?: string;
  action?: string;
}

const paletteItems: PaletteItem[] = [
  // Navigation
  {
    id: "nav-home",
    icon: LayoutDashboard,
    label: "Go to Home",
    shortcut: "G H",
    description: "Back to homepage",
    group: "navigation",
    href: "/",
  },
  {
    id: "nav-features",
    icon: ShieldCheck,
    label: "Features",
    shortcut: "G F",
    description: "Platform features and capabilities",
    group: "navigation",
    section: "features",
  },
  {
    id: "nav-architecture",
    icon: FileText,
    label: "Architecture",
    description: "System architecture overview",
    group: "navigation",
    section: "architecture",
  },
  {
    id: "nav-modules",
    icon: ScanSearch,
    label: "Scanner Modules",
    description: "16 scanner modules",
    group: "navigation",
    section: "modules",
  },
  {
    id: "nav-cli",
    icon: Terminal,
    label: "CLI Reference",
    description: "Command-line interface docs",
    group: "navigation",
    section: "cli",
  },
  {
    id: "nav-docs",
    icon: BookOpen,
    label: "Documentation",
    description: "Full API documentation",
    group: "navigation",
    href: "/docs",
  },
  {
    id: "nav-pricing",
    icon: FileText,
    label: "Pricing",
    description: "Plans and enterprise pricing",
    group: "navigation",
    href: "/pricing",
  },
  {
    id: "nav-api",
    icon: Terminal,
    label: "API Overview",
    description: "REST API reference",
    group: "navigation",
    href: "/api-overview",
  },
  // Actions
  {
    id: "action-new-scan",
    icon: ScanSearch,
    label: "Start New Scan",
    shortcut: "⌘ N",
    description: "Launch a scan against a target",
    group: "actions",
    href: "/scans",
  },
  {
    id: "action-copy-install",
    icon: Copy,
    label: "Copy Install Command",
    description: "Copy the installation command to clipboard",
    group: "actions",
    action: "copy-install",
  },
  {
    id: "action-view-demo",
    icon: Play,
    label: "View Demo",
    description: "Watch the platform demo",
    group: "actions",
    section: "hero",
  },
  {
    id: "action-settings",
    icon: Settings,
    label: "Settings",
    description: "Account and configuration",
    group: "actions",
    href: "/settings",
  },
  // Help
  {
    id: "help-docs",
    icon: BookOpen,
    label: "Read Documentation",
    description: "Browse the full docs",
    group: "help",
    href: "/docs",
  },
  {
    id: "help-changelog",
    icon: FileText,
    label: "Changelog",
    description: "Release notes and updates",
    group: "help",
    href: "/changelog",
  },
  {
    id: "help-status",
    icon: ShieldCheck,
    label: "System Status",
    description: "Check system health and uptime",
    group: "help",
    href: "/status",
  },
  {
    id: "help-contact",
    icon: MessageSquare,
    label: "Contact Support",
    description: "Get help from the team",
    group: "help",
    href: "/contact",
  },
];

const groupLabels: Record<string, string> = {
  navigation: "Navigation",
  actions: "Actions",
  help: "Help",
};

const groupOrder = ["navigation", "actions", "help"];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const scrollTo = useSmoothScroll();

  const handleToggle = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleToggle(!open);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        handleToggle(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleToggle]);

  const execute = useCallback(
    (item: PaletteItem) => {
      if (item.href) {
        if (item.href.startsWith("/#") && pathname === "/") {
          const id = item.href.replace("/#", "");
          if (id) scrollTo(id);
        } else {
          router.push(item.href);
        }
      } else if (item.section) {
        scrollTo(item.section);
      } else if (item.action === "copy-install") {
        navigator.clipboard.writeText("npm install -g reconpro");
      }
      handleToggle(false);
    },
    [scrollTo, router, pathname, handleToggle]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
          onClick={() => handleToggle(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            key="cmdk-box"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            className="w-full max-w-[560px] mx-4 rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_0_80px_rgba(0,0,0,0.8),0_0_40px_rgba(0,255,136,0.04)]"
            style={{ backgroundColor: "rgba(10,10,10,0.98)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              className="[&_[cmdk-input]]:text-sm [&_[cmdk-input]]:text-white [&_[cmdk-input]]:placeholder:text-white/30 [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:outline-none [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-white/40 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2.5 [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:text-sm [&_[cmdk-item]]:text-white/70 [&_[cmdk-item]]:flex [&_[cmdk-item]]:items-center [&_[cmdk-item]]:gap-3 [&_[cmdk-item]]:cursor-pointer [&_[cmdk-item]]:data-[selected=true]:bg-white/[0.06] [&_[cmdk-item]]:data-[selected=true]:text-white"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white/30 flex-shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <Command.Input
                  placeholder="Type a command or search..."
                  autoFocus
                />
                <kbd
                  className="text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.06] flex-shrink-0 font-mono"
                  aria-hidden="true"
                >
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[340px] overflow-y-auto py-2">
                <Command.Empty className="py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <HelpCircle
                      width={28}
                      height={28}
                      className="text-white/10"
                    />
                    <p
                      className="text-sm text-white/40"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      No results found
                    </p>
                    <p
                      className="text-xs text-white/20"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Try a different search term.
                    </p>
                  </div>
                </Command.Empty>

                {groupOrder.map((group) => {
                  const items = paletteItems.filter(
                    (item) => item.group === group
                  );
                  if (items.length === 0) return null;
                  return (
                    <Command.Group
                      key={group}
                      heading={groupLabels[group]}
                    >
                      {items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Command.Item
                            key={item.id}
                            value={item.label}
                            onSelect={() => execute(item)}
                          >
                            <div className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                              <Icon
                                width={14}
                                height={14}
                                className="text-white/40"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span
                                style={{ fontFamily: "var(--font-body)" }}
                              >
                                {item.label}
                              </span>
                              {item.description && (
                                <span
                                  className="block text-[11px] text-white/25 truncate"
                                  style={{ fontFamily: "var(--font-body)" }}
                                >
                                  {item.description}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.shortcut && (
                                <kbd className="text-[10px] font-mono text-white/15 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.05]">
                                  {item.shortcut}
                                </kbd>
                              )}
                              {item.href?.startsWith("http") && (
                                <ExternalLink
                                  width={12}
                                  height={12}
                                  className="text-white/20"
                                />
                              )}
                            </div>
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  );
                })}
              </Command.List>
            </Command>

            {/* Footer hints */}
            <div
              className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.04]"
              aria-hidden="true"
            >
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-white/25 flex items-center gap-1">
                  <kbd className="font-mono bg-white/[0.03] px-1 py-0.5 rounded border border-white/[0.04] text-[9px]">
                    ↑↓
                  </kbd>{" "}
                  navigate
                </span>
                <span className="text-[10px] text-white/25 flex items-center gap-1">
                  <kbd className="font-mono bg-white/[0.03] px-1 py-0.5 rounded border border-white/[0.04] text-[9px]">
                    ↵
                  </kbd>{" "}
                  select
                </span>
                <span className="text-[10px] text-white/25 flex items-center gap-1">
                  <kbd className="font-mono bg-white/[0.03] px-1 py-0.5 rounded border border-white/[0.04] text-[9px]">
                    esc
                  </kbd>{" "}
                  close
                </span>
              </div>
              <span className="text-[10px] text-white/15">ReconPro</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
