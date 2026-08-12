"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Brain,
  Bot,
  GitMerge,
  Network,
  FileText,
  GitPullRequest,
  Scan,
  Terminal,
  Package,
  type LucideIcon,
  Check,
} from "lucide-react";
import { features } from "@/data/content";

// ── Icon Mapping ───────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  brain: Brain,
  bot: Bot,
  "git-merge": GitMerge,
  network: Network,
  "file-text": FileText,
  "git-pull-request": GitPullRequest,
  scan: Scan,
  terminal: Terminal,
  package: Package,
};

// ── Animation Variants ──────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// ── Component ───────────────────────────────────────────────

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.08 });

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative min-h-screen bg-black px-4 py-32 sm:px-6 lg:px-8"
    >
      {/* Subtle radial glow behind the grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.015] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* ── Header ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20 text-center"
        >
          <h2 className="text-gradient-void text-4xl font-semibold tracking-tight sm:text-5xl">
            Intelligence Architecture
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm text-white/40">
            Every component designed for precision. Every interaction
            intentional.
          </p>
        </motion.div>

        {/* ── Feature Grid ───────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const Icon = iconMap[feature.icon] ?? Brain;

            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className="glass-hover bento-tile group relative flex flex-col border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-colors duration-300"
              >
                {/* ── Top row: icon + category badge ──── */}
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
                    <Icon className="h-5 w-5 text-white/40" strokeWidth={1.5} />
                  </div>
                  <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
                    {feature.category}
                  </span>
                </div>

                {/* ── Title ──────────────────────────────── */}
                <h3 className="text-white font-medium leading-tight">
                  {feature.title}
                </h3>

                {/* ── Description ───────────────────────── */}
                <p className="mt-2 text-sm leading-relaxed text-white/40">
                  {feature.description}
                </p>

                {/* ── Highlights ────────────────────────── */}
                {feature.highlights && feature.highlights.length > 0 && (
                  <ul className="mt-5 flex flex-col gap-1.5 border-t border-white/[0.04] pt-4">
                    {feature.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-xs text-white/20"
                      >
                        <Check className="h-3 w-3 shrink-0 text-white/15" strokeWidth={2} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
