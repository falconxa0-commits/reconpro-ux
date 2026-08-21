"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  LayoutDashboard,
  Search,
  Terminal,
  FileText,
  Settings,
  BookOpen,
  DollarSign,
  History,
  Plus,
  X,
} from "lucide-react";
import { navItems } from "@/data/content";
import { useActiveSection, useSmoothScroll } from "@/hooks/useInView";

const searchItems = [
  {
    icon: LayoutDashboard,
    label: "Overview",
    description: "Dashboard overview and scan summary",
    href: "/overview",
    shortcut: "G O",
  },
  {
    icon: Plus,
    label: "New Scan",
    description: "Start a new reconnaissance scan",
    href: "/scans",
    shortcut: "G N",
  },
  {
    icon: Terminal,
    label: "Findings",
    description: "View all scan findings and vulnerabilities",
    href: "/findings",
    shortcut: "G F",
  },
  {
    icon: Settings,
    label: "Settings",
    description: "Account, API keys, and configuration",
    href: "/settings",
    shortcut: "G S",
  },
  {
    icon: BookOpen,
    label: "API Docs",
    description: "REST API documentation and endpoints",
    href: "/api-overview",
    shortcut: "G A",
  },
  {
    icon: FileText,
    label: "CLI Reference",
    description: "Command-line interface documentation",
    href: "/#cli",
    shortcut: "G C",
  },
  {
    icon: DollarSign,
    label: "Pricing",
    description: "Plans, pricing, and enterprise options",
    href: "/pricing",
    shortcut: "G P",
  },
  {
    icon: History,
    label: "Changelog",
    description: "Product updates and release history",
    href: "/changelog",
    shortcut: "G H",
  },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sectionIds = [
    "features",
    "architecture",
    "modules",
    "cli",
    "docs",
    "benchmarks",
    "enterprise",
    "community",
    "pricing",
    "faq",
  ];
  const active = useActiveSection(sectionIds);
  const scrollTo = useSmoothScroll();

  const filteredSearch = useMemo(
    () =>
      searchItems.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  useEffect(() => {
    setSearchActiveIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  const handleNav = useCallback(
    (href: string) => {
      if (href.startsWith("/") && !href.startsWith("/#")) {
        router.push(href);
      } else if (href.startsWith("/#")) {
        if (pathname !== "/") {
          router.push(href);
        } else {
          const id = href.replace("/#", "");
          if (id) scrollTo(id);
        }
      } else {
        const id = href.replace("#", "");
        if (id) scrollTo(id);
      }
      setMobileOpen(false);
    },
    [scrollTo, router, pathname]
  );

  const handleSearchSelect = useCallback(
    (item: (typeof searchItems)[0]) => {
      handleNav(item.href);
      setSearchOpen(false);
      setSearchQuery("");
    },
    [handleNav]
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchActiveIndex((i) =>
        Math.min(i + 1, filteredSearch.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filteredSearch[searchActiveIndex]) {
      e.preventDefault();
      handleSearchSelect(filteredSearch[searchActiveIndex]);
    } else if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-700 ${
          scrolled
            ? "bg-black/70 backdrop-blur-xl border-b border-white/[0.04]"
            : "bg-transparent"
        }`}
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => router.push("/")}
              aria-label="ReconPro — go to home"
              className="flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:bg-[#00ff88]/[0.08] group-hover:border-[#00ff88]/[0.15] transition-all duration-300">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00ff88"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span
                className="text-sm font-semibold tracking-tight text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                ReconPro
              </span>
            </button>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className={`relative px-3 py-1.5 text-[13px] rounded-lg transition-all duration-300 ${
                    active === item.href.replace(/[\/#]/g, "") || pathname === item.href
                      ? "text-white bg-white/[0.06]"
                      : "text-white/60 hover:text-white/80 hover:bg-white/[0.03]"
                  }`}
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {item.label}
                  {item.badge && (
                    <span className="ml-1.5 text-[9px] font-semibold bg-white text-black px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setSearchQuery("");
                }}
                className="flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg text-white/60 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-300"
                aria-label="Search (Ctrl+K)"
              >
                <Search
                  width={16}
                  height={16}
                  className="text-white/40"
                  aria-hidden="true"
                />
                <kbd
                  className="hidden sm:inline-flex text-[9px] font-mono text-white/40 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]"
                  aria-hidden="true"
                >
                  Ctrl+K
                </kbd>
              </button>

              {/* Get Started CTA — Desktop */}
              <Link
                href="/register"
                className="hidden lg:flex items-center h-8 px-4 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-all duration-300"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Get Started
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-300"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <X width={16} height={16} />
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search Overlay */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              key="search-overlay"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: 0.2,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              className="absolute top-full left-0 right-0 p-4 bg-black/95 backdrop-blur-xl border-b border-white/[0.06]"
            >
              <div className="max-w-2xl mx-auto">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] mb-3">
                  <Search
                    width={16}
                    height={16}
                    className="text-white/40 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search pages, actions, docs..."
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                    style={{ fontFamily: "var(--font-body)" }}
                    aria-label="Search sections and commands"
                  />
                  <kbd
                    className="text-[10px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.06] flex-shrink-0 font-mono"
                    aria-hidden="true"
                  >
                    ESC
                  </kbd>
                </div>

                {/* Search Results */}
                <div className="max-h-[320px] overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  {filteredSearch.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Search
                        width={24}
                        height={24}
                        className="mx-auto mb-3 text-white/15"
                      />
                      <p
                        className="text-sm text-white/40"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        No results for &ldquo;{searchQuery}&rdquo;
                      </p>
                      <p
                        className="text-xs text-white/25 mt-1"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        Try searching for a different term.
                      </p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredSearch.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => handleSearchSelect(item)}
                            onMouseEnter={() => setSearchActiveIndex(i)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ${
                              i === searchActiveIndex
                                ? "bg-white/[0.06]"
                                : "hover:bg-white/[0.03]"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                i === searchActiveIndex
                                  ? "bg-[#00ff88]/[0.1]"
                                  : "bg-white/[0.04]"
                              }`}
                            >
                              <Icon
                                width={14}
                                height={14}
                                className={
                                  i === searchActiveIndex
                                    ? "text-[#00ff88]"
                                    : "text-white/50"
                                }
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${
                                  i === searchActiveIndex
                                    ? "text-white"
                                    : "text-white/70"
                                }`}
                                style={{ fontFamily: "var(--font-body)" }}
                              >
                                {item.label}
                              </p>
                              <p
                                className="text-[11px] text-white/30 truncate"
                                style={{ fontFamily: "var(--font-body)" }}
                              >
                                {item.description}
                              </p>
                            </div>
                            <div className="flex-shrink-0 hidden sm:flex items-center gap-1">
                              <kbd className="text-[9px] font-mono text-white/20 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]">
                                {item.shortcut}
                              </kbd>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer hints */}
                <div className="flex items-center gap-4 mt-2 px-1" aria-hidden="true">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: [0.16, 1, 0.3, 1] as const,
            }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xl lg:hidden"
            onClick={() => setMobileOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{
                duration: 0.25,
                ease: [0.16, 1, 0.3, 1] as const,
                delay: 0.05,
              }}
              className="absolute top-16 left-0 right-0 p-6 bg-black/95 border-b border-white/[0.04]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleNav(item.href)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.03] rounded-xl transition-all duration-300 text-left"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {item.label}
                    {item.badge && (
                      <span className="text-[9px] font-semibold bg-white text-black px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/[0.04] flex gap-3">
                <Link
                  href="/login"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm text-white/70 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:bg-white/[0.06] hover:text-white transition-all duration-300"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm text-black bg-white rounded-xl font-semibold hover:bg-white/90 transition-all duration-300"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
