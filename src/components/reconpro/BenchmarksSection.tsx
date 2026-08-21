"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";

// ── Benchmark Data ──────────────────────────────────────

interface BenchmarkRow {
  metric: string;
  reconpro: number;
  competitorA: number;
  competitorB: number;
  unit?: string;
  higher: boolean;
}

const benchmarks: BenchmarkRow[] = [
  { metric: "Scan Speed (domains/min)", reconpro: 85, competitorA: 42, competitorB: 38, higher: true },
  { metric: "API Endpoints", reconpro: 55, competitorA: 30, competitorB: 25, higher: true },
  { metric: "Scanner Modules", reconpro: 14, competitorA: 8, competitorB: 6, higher: true },
  { metric: "Compliance Frameworks", reconpro: 6, competitorA: 3, competitorB: 2, higher: true },
  { metric: "Mean Time to Results (sec)", reconpro: 12, competitorA: 45, competitorB: 60, unit: "sec", higher: false },
  { metric: "Setup Time (minutes)", reconpro: 2, competitorA: 30, competitorB: 45, unit: "min", higher: false },
];

const maxVal = Math.max(
  ...benchmarks.flatMap((b) => [b.reconpro, b.competitorA, b.competitorB])
);

// ── Animated Bar ────────────────────────────────────────

function Bar({
  value,
  maxValue,
  color,
  label,
  delay,
  isInView,
}: {
  value: number;
  maxValue: number;
  color: string;
  label: string;
  delay: number;
  isInView: boolean;
}) {
  const pct = (value / maxValue) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-right text-[11px] text-white/40">
        {label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
        <motion.div
          initial={{ width: 0 }}
          animate={isInView ? { width: `${pct}%` } : { width: 0 }}
          transition={{
            duration: 1,
            delay,
            ease: [0.16, 1, 0.3, 1] as const,
          }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color }}
        />
      </div>
      <span
        className="w-10 shrink-0 text-right text-xs font-mono font-medium"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────

export default function BenchmarksSection() {
  const { ref, isInView } = useInView(0.08);

  return (
    <section
      ref={ref}
      id="benchmarks"
      className="relative bg-black px-4 py-24 sm:py-32 lg:px-8"
    >
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.012] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* ── Header ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-16 text-center sm:mb-20"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/60">
            Performance
          </span>
          <h2 className="text-gradient-void text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Benchmarks
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Head-to-head performance comparisons. Every metric is verifiable
            and based on real-world scanning workloads.
          </p>
        </motion.div>

        {/* ── Legend ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/50"
        >
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#00ff88]" />
            ReconPro
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/20" />
            Competitor A
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/10" />
            Competitor B
          </span>
        </motion.div>

        {/* ── Benchmark Bars ────────────────────────────── */}
        <div className="space-y-8">
          {benchmarks.map((row, i) => (
            <motion.div
              key={row.metric}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.15 + i * 0.08,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              className="panel rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6"
            >
              <h3 className="mb-5 text-sm font-medium text-white">
                {row.metric}
              </h3>
              <div className="space-y-3">
                <Bar
                  value={row.reconpro}
                  maxValue={maxVal}
                  color="#00ff88"
                  label="ReconPro"
                  delay={0.3 + i * 0.08}
                  isInView={isInView}
                />
                <Bar
                  value={row.competitorA}
                  maxValue={maxVal}
                  color="rgba(255,255,255,0.2)"
                  label="Comp. A"
                  delay={0.4 + i * 0.08}
                  isInView={isInView}
                />
                <Bar
                  value={row.competitorB}
                  maxValue={maxVal}
                  color="rgba(255,255,255,0.1)"
                  label="Comp. B"
                  delay={0.5 + i * 0.08}
                  isInView={isInView}
                />
              </div>

              {/* Improvement badge */}
              {row.higher ? (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-[#00ff88]/60">
                  <span className="font-mono font-medium">
                    {Math.round((row.reconpro / row.competitorA) * 100)}%
                  </span>
                  <span>faster than Competitor A</span>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-[#00ff88]/60">
                  <span className="font-mono font-medium">
                    {Math.round((row.competitorA / row.reconpro) * 100)}%
                  </span>
                  <span>faster than Competitor A</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Tech Stack Badges ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            { label: "Next.js 16", color: "#ffffff" },
            { label: "React 19", color: "#00ff88" },
            { label: "TypeScript", color: "#44aaff" },
            { label: "Native Node.js", color: "#ffaa00" },
          ].map((tech) => (
            <span
              key={tech.label}
              className="rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-xs font-medium backdrop-blur-xl"
              style={{ color: `${tech.color}80` }}
            >
              {tech.label}
            </span>
          ))}
        </motion.div>

        {/* ── Note ───────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] as const }}
          className="mt-6 text-center text-[11px] text-white/30"
        >
          All scanning runs natively using Node.js built-in modules. No Python runtime required.
        </motion.p>
      </div>
    </section>
  );
}
