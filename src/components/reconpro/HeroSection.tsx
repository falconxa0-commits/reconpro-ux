"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { terminalDemo } from "@/data/content";
import { useInView, useCountUp } from "@/hooks/useInView";

const trustLogos = ["Cloudflare", "Stripe", "Vercel", "GitHub", "Fortinet"];

const heroStats = [
  { value: "10M+", sub: "Targets Scanned", num: 10, suffix: "M+" },
  { value: "500K+", sub: "Findings", num: 500, suffix: "K+" },
  { value: "99.9%", sub: "Uptime", num: 999, suffix: "" },
  { value: "150+", sub: "Modules", num: 150, suffix: "+" },
  { value: "< 5s", sub: "Avg Scan", num: 5, suffix: "s" },
  { value: "24/7", sub: "Monitoring", num: 24, suffix: "/7" },
];

export default function HeroSection() {
  const { ref, isInView } = useInView(0.05);
  const [visibleLines, setVisibleLines] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(window.location.origin + "/docs");
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

      {/* Green tint glow behind heading */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00ff88]/[0.02] rounded-full blur-[150px] pointer-events-none" aria-hidden="true" />

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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88]/40 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]/80" />
            </span>
            <span className="text-xs text-white/60 font-medium">
              Enterprise Attack Surface Intelligence
            </span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-center leading-[1.1] mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <span className="whitespace-nowrap">Attack Surface </span>
          <span
            className="whitespace-nowrap bg-gradient-to-r from-white via-white to-[#00ff88] bg-clip-text text-transparent"
          >
            Intelligence
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-center text-white/30 mb-8"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Platform
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-center text-base md:text-lg text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Enterprise-grade security reconnaissance. Discover vulnerabilities before attackers do.{" "}
          <span className="text-white/80">Autonomous.</span>{" "}
          <span className="text-white/80">Real-time.</span>{" "}
          <span className="text-white/80">Comprehensive.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
        >
          <Link
            href="/register"
            className="group flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.12)]"
          >
            Start Free Scan
            <ArrowRight width={16} height={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/#features"
            className="group flex items-center gap-2 px-6 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/70 text-sm font-medium hover:bg-white/[0.06] hover:text-white/90 hover:border-white/[0.12] transition-all duration-300"
          >
            <Play width={14} height={14} className="text-[#00ff88]" />
            View Demo
          </Link>
        </motion.div>

        {/* Trust Logos */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-16"
        >
          <p className="text-center text-xs text-white/30 mb-5 tracking-wider uppercase">
            Trusted by security teams at
          </p>
          <div className="relative overflow-hidden max-w-2xl mx-auto">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
            <div className="animate-marquee flex items-center gap-10 whitespace-nowrap">
              {[...trustLogos, ...trustLogos].map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="text-sm font-medium text-white/20 tracking-wide"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div ref={statsRef} className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-16">
          {heroStats.map((stat, i) => (
            <div
              key={stat.sub}
              className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-[#00ff88]/[0.15] transition-all duration-500 hover-glow"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <StatCounter
                value={stat.num}
                suffix={stat.suffix}
                active={statsVisible}
                isSmall={stat.sub === "Uptime" || stat.sub === "Avg Scan"}
              />
              <div className="text-[11px] text-white/50 mt-1 tracking-wide">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Terminal Demo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
          className="max-w-2xl mx-auto"
        >
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              boxShadow: "0 0 60px rgba(0, 255, 136, 0.06), 0 0 120px rgba(0, 255, 136, 0.03)",
            }}
          >
            {/* Animated gradient border */}
            <div
              className="absolute inset-0 rounded-2xl animate-shimmer"
              style={{
                background: "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(0,255,136,0.15), rgba(255,255,255,0.05))",
                backgroundSize: "200% 100%",
                padding: "1px",
              }}
              aria-hidden="true"
            />
            <div className="cli-showcase glass-premium relative">
              <div className="cli-titlebar">
                <div className="cli-dot cli-dot-red" />
                <div className="cli-dot cli-dot-yellow" />
                <div className="cli-dot cli-dot-green" />
                <span className="ml-3 text-[11px] text-white/50 font-mono">
                  reconpro — bash
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={copyUrl}
                    className={`copy-btn ${copied ? "copied" : ""}`}
                    aria-label="Copy URL"
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
              <div className="cli-body max-h-[280px] overflow-hidden">
                {terminalDemo.slice(0, visibleLines).map((line, i) => (
                  <TerminalLine key={i} line={line} />
                ))}
              </div>
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
  isSmall = false,
}: {
  value: number;
  suffix: string;
  active: boolean;
  isSmall?: boolean;
}) {
  const count = useCountUp(value, 2000, active);
  const formatted = count.toLocaleString();
  return (
    <div className="text-lg md:text-xl font-semibold text-white font-mono tracking-tight">
      {isSmall ? (
        <span>
          {suffix === "/7" ? "24/7" : `< ${formatted}s`}
        </span>
      ) : (
        <>
          {formatted}
          {suffix}
        </>
      )}
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
