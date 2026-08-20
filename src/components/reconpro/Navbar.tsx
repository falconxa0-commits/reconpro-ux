"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { navItems } from "@/data/content";
import { useActiveSection, useSmoothScroll } from "@/hooks/useInView";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sectionIds = [
    "features",
    "architecture",
    "modules",
    "cli",
    "docs",
    "benchmarks",
    "enterprise",
    "community",
  ];
  const active = useActiveSection(sectionIds);
  const scrollTo = useSmoothScroll();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const handleNav = useCallback(
    (href: string) => {
      if (href.startsWith("/") && !href.startsWith("/#")) {
        // Page route — navigate
        router.push(href);
      } else if (href.startsWith("/#")) {
        // Anchor on homepage — go home first then scroll
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
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.1] transition-all duration-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight text-white">
                ReconPro
              </span>
              <span className="text-[10px] font-mono text-white/60 bg-white/[0.04] px-1.5 py-0.5 rounded-md">
                v0.2.0
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
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg text-white/60 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-300"
                aria-label="Search (Ctrl+K)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <kbd className="hidden sm:inline-flex text-[9px] font-mono text-white/40 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]" aria-hidden="true">
                  Ctrl+K
                </kbd>
              </button>

              <a
                href="/about"
                aria-label="About ReconPro"
                className="hidden sm:flex items-center gap-2 text-[13px] font-medium text-white/50 hover:text-white/80 transition-colors duration-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <span>About</span>
              </a>

              <a
                href="/docs"
                aria-label="ReconPro documentation"
                className="hidden md:flex items-center gap-2 text-[13px] font-medium text-white/50 hover:text-white/80 transition-colors duration-300"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40" aria-hidden="true">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                <span>Docs</span>
              </a>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-300"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
        {/* TODO: Wire up search when backend search API is available */}
        <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="search-overlay"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            className="absolute top-full left-0 right-0 p-4 bg-black/90 backdrop-blur-xl border-b border-white/[0.04]"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search commands, modules, docs..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
                  aria-label="Search sections and commands"
                />
                <kbd className="text-[10px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.06]" aria-hidden="true">
                  ESC
                </kbd>
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
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
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
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const, delay: 0.05 }}
            className="absolute top-16 left-0 right-0 p-6 bg-black/95 border-b border-white/[0.04]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.03] rounded-xl transition-all duration-300"
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
              <a
                href="/about"
                aria-label="About ReconPro"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm text-white/60 bg-white/[0.03] rounded-xl border border-white/[0.06]"
              >
                About
              </a>
              <a
                href="/docs"
                aria-label="ReconPro documentation"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm text-black bg-white rounded-xl font-medium"
              >
                Docs
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
