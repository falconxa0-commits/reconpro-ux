"use client";

import { motion } from "framer-motion";
import { useInView, useCountUp } from "@/hooks/useInView";
import {
  Star,
  GitFork,
  Users,
  MessageCircle,
  ExternalLink,
  Shield,
  Unlock,
  Package,
  GitPullRequest,
  Eye,
  BookOpen,
  Code,
  type LucideIcon,
} from "lucide-react";

// ── Community Stats ─────────────────────────────────────

const communityStats = [
  { label: "GitHub Stars", value: 12800, icon: Star, suffix: "", format: true },
  { label: "Forks", value: 1840, icon: GitFork, suffix: "", format: true },
  { label: "Contributors", value: 147, icon: Users, suffix: "", format: true },
  { label: "Discord Members", value: 3200, icon: MessageCircle, suffix: "+", format: true },
];

// ── Community Links ─────────────────────────────────────

const communityLinks = [
  {
    label: "GitHub",
    href: "#",
    icon: Code,
    description: "Source code, issues, and pull requests",
    accent: "#ffffff",
  },
  {
    label: "Discord",
    href: "#",
    icon: MessageCircle,
    description: "Real-time discussions and community support",
    accent: "#5865F2",
  },
  {
    label: "Documentation",
    href: "/docs",
    icon: BookOpen,
    description: "Guides, API reference, and tutorials",
    accent: "#00ff88",
  },
];

// ── Open Source Badges ───────────────────────────────────

const badges = [
  { icon: Shield, label: "MIT Licensed" },
  { icon: Unlock, label: "No Vendor Lock-in" },
  { icon: Package, label: "Zero Dependencies" },
  { icon: GitPullRequest, label: "Active Development" },
  { icon: Eye, label: "Transparent Development" },
];

// ── Animation Variants ──────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ── Stat Card ───────────────────────────────────────────

function StatCard({
  stat,
  index,
  isInView,
}: {
  stat: (typeof communityStats)[number];
  index: number;
  isInView: boolean;
}) {
  const Icon = stat.icon;
  const count = useCountUp(stat.value, 2000, isInView);

  const formatted = stat.format
    ? count >= 1000
      ? `${(count / 1000).toFixed(1)}k`
      : `${count}`
    : `${count}`;

  return (
    <motion.div
      variants={itemVariants}
      className="panel glass-hover group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center"
    >
      <Icon
        className="mx-auto mb-3 h-5 w-5 text-white/30 transition-colors duration-300 group-hover:text-[#00ff88]/60"
        strokeWidth={1.5}
      />
      <div className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {formatted}
        {stat.suffix}
      </div>
      <p className="mt-1 text-xs text-white/40">{stat.label}</p>
    </motion.div>
  );
}

// ── Component ───────────────────────────────────────────

function CommunitySectionInner() {
  const { ref: sectionRef, isInView } = useInView(0.06);

  return (
    <section
      id="community"
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="relative w-full bg-black px-4 py-24 sm:py-32 lg:px-8"
    >
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 flex items-start justify-center"
        aria-hidden="true"
      >
        <div className="h-[600px] w-[800px] rounded-full bg-white/[0.015] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* ── Header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-16 text-center sm:mb-20"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/60">
            Community
          </span>
          <h2 className="text-gradient-void text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Open Source, Open Community
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            ReconPro is built in the open. Join thousands of security researchers,
            developers, and teams who contribute to and depend on the project.
          </p>
        </motion.div>

        {/* ── Stats Grid ──────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {communityStats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} isInView={isInView} />
          ))}
        </motion.div>

        {/* ── Community Links ─────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mb-16 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {communityLinks.map((link) => {
            const Icon = link.icon;
            return (
              <motion.a
                key={link.label}
                href={link.href}
                variants={itemVariants}
                className="panel glass-hover group relative flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] transition-colors duration-300 group-hover:border-white/[0.12]">
                  <Icon
                    className="h-5 w-5 transition-colors duration-300"
                    style={{ color: `${link.accent}80` }}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-white">{link.label}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">
                    {link.description}
                  </p>
                </div>
                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-hover:text-white/50" strokeWidth={1.5} />
              </motion.a>
            );
          })}
        </motion.div>

        {/* ── Open Source Badges ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <span
                key={badge.label}
                className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-xs font-medium text-white/50 backdrop-blur-xl"
              >
                <Icon className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
                {badge.label}
              </span>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export default CommunitySectionInner;
export { CommunitySectionInner as CommunitySection };
