"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { navItems } from "@/data/content";
import { useActiveSection, useSmoothScroll } from "@/hooks/useInView";

// Platform-adaptive keyboard shortcut label
const useShortcutLabel = () => {
  const [label, setLabel] = useState("Ctrl+K");
  useEffect(() => {
    const isMac = navigator.platform?.toUpperCase().includes("MAC") ?? false;
    setLabel(isMac ? "\u2318K" : "Ctrl+K");
  }, []);
  return label;
};

export function Navbar() {
  const shortcutLabel = useShortcutLabel();
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
    "pricing",
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
      const id = href.replace("#", "");
      if (id) scrollTo(id);
      setMobileOpen(false);
    },
    [scrollTo]
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
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="ReconPro — scroll to top"
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
              <span className="text-[10px] font-mono text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded-md">
                v10.0.0
              </span>
            </button>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className={`relative px-3 py-1.5 text-[13px] rounded-lg transition-all duration-300 ${
                    active === item.href.replace("#", "")
                      ? "text-white bg-white/[0.06]"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
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
                className="flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-300"
                aria-label="Search (Ctrl+K)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <kbd className="hidden sm:inline-flex text-[9px] font-mono text-white/10 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]" aria-hidden="true">
                  {shortcutLabel}
                </kbd>
              </button>

              <a
                href="https://github.com/reconpro/reconpro"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Star ReconPro on GitHub — 18.7K stars"
                className="hidden sm:flex items-center gap-2 text-[13px] font-medium text-white/50 hover:text-white/80 transition-colors duration-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white/40" aria-hidden="true">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>Star</span>
                <span className="text-white/20">18.7K</span>
              </a>

              <a
                href="https://pypi.org/project/reconpro/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Install ReconPro from PyPI"
                className="hidden md:flex items-center gap-2 text-[13px] font-medium text-white/50 hover:text-white/80 transition-colors duration-300"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white/40" aria-hidden="true">
                  <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.13.35.2.36.27.36.35.35.45.32.56.28.69.21.82.14.97.05 1.11-.06 1.1-.16.97-.24.8-.32.65-.36.51-.4.39-.42.29-.42.21-.4.14-.36.09-.32.04-.24.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z" />
                </svg>
                <span>Install</span>
              </a>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-300"
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search commands, modules, docs..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/15"
                  aria-label="Search sections and commands"
                />
                <kbd className="text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.06]" aria-hidden="true">
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
                  className="flex items-center gap-3 px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/[0.03] rounded-xl transition-all duration-300"
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
                href="https://github.com/reconpro/reconpro"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ReconPro GitHub repository"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm text-white/50 bg-white/[0.03] rounded-xl border border-white/[0.06]"
              >
                GitHub
              </a>
              <a
                href="https://pypi.org/project/reconpro/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Install ReconPro from PyPI"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm text-black bg-white rounded-xl font-medium"
              >
                Install
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
