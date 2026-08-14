"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { heroStats, terminalDemo } from "@/data/content";
import { useInView, useCountUp } from "@/hooks/useInView";

export default function HeroSection() {
  const { ref, isInView } = useInView(0.05);
  const [visibleLines, setVisibleLines] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const copyInstall = useCallback(() => {
    navigator.clipboard.writeText("pip install reconpro");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => {
    if (!isInView) return;
    const timers: NodeJS.Timeout[] = [];
    let cumulative = 0;
    terminalDemo.forEach((line, i) => {
      cumulative += line.delay;
      timers.push(
        setTimeout(() => setVisibleLines((v) => Math.max(v, i + 1)), cumulative)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsVisible(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="hero"
      aria-label="ReconPro hero — Attack Surface Intelligence Platform"
      className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden pt-16"
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Radial ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-white/[0.015] rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/40 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white/60" />
            </span>
            <span className="text-xs text-white/60 font-medium">
              Now Available
            </span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-center leading-[1.1] mb-6"
        >
          <span className="text-gradient-void">Attack Surface</span>
          <br />
          <span className="text-gradient-void">Intelligence Platform</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-center text-base md:text-lg text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Billion-dollar grade reconnaissance. Autonomous. Intelligent. Minimal.
          <br className="hidden md:block" />
          Three dependencies. Zero compromises.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
        >
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.9] text-black font-medium text-sm hover:bg-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] metallic-sheen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-black/60">
              <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.13.35.2.36.27.36.35.35.45.32.56.28.69.21.82.14.97.05 1.11-.06 1.1-.16.97-.24.8-.32.65-.36.51-.4.39-.42.29-.42.21-.4.14-.36.09-.32.04-.24.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
            </svg>
            <code className="font-mono text-sm">pip install reconpro</code>
            <button
              onClick={copyInstall}
              className={`ml-1 p-1 rounded-md transition-all duration-300 hover:bg-black/10 ${copied ? "text-green-500" : "text-black/30"}`}
              aria-label="Copy install command"
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </button>
          </div>
          <a
            href="/about"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 text-sm font-medium hover:bg-white/[0.06] hover:text-white/80 transition-all duration-300"
          >
            View on GitHub
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        </motion.div>

        {/* Stats */}
        <div ref={statsRef} className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-16">
          {heroStats.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-500 metallic-sheen hover-glow"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <StatCounter
                value={parseInt(stat.value.replace(/[^0-9]/g, ""))}
                suffix={stat.value.replace(/[0-9]/g, "")}
                active={statsVisible}
              />
              <div className="text-[11px] text-white/60 mt-1 tracking-wide">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Terminal Demo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
          className="max-w-3xl mx-auto"
        >
          <div className="cli-showcase glass-premium">
            <div className="cli-titlebar">
              <div className="cli-dot cli-dot-red" />
              <div className="cli-dot cli-dot-yellow" />
              <div className="cli-dot cli-dot-green" />
              <span className="ml-3 text-[11px] text-white/50 font-mono">
                reconpro — bash
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={copyInstall}
                  className={`copy-btn ${copied ? "copied" : ""}`}
                  aria-label="Copy command"
                >
                  {copied ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="cli-body max-h-[320px] overflow-hidden">
              {terminalDemo.slice(0, visibleLines).map((line, i) => (
                <TerminalLine key={i} line={line} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatCounter({
  value,
  suffix,
  active,
}: {
  value: number;
  suffix: string;
  active: boolean;
}) {
  const count = useCountUp(value, 2000, active);
  const formatted = count.toLocaleString();
  return (
    <div className="text-xl md:text-2xl font-semibold text-white font-mono tracking-tight">
      {formatted}
      {suffix}
    </div>
  );
}

function TerminalLine({
  line,
}: {
  line: { type: string; text: string };
}) {
  const colorClass: Record<string, string> = {
    banner: "cli-banner",
    prompt: "cli-prompt",
    command: "cli-command",
    flag: "cli-flag",
    string: "cli-string",
    output: "cli-output",
    accent: "cli-accent",
    error: "cli-error",
    success: "cli-success",
    muted: "cli-muted",
  };

  if (line.type === "cursor") {
    return <span className="cli-cursor" />;
  }

  return (
    <div className={colorClass[line.type] || "cli-output"}>
      {line.text || "\u00A0"}
    </div>
  );
}
