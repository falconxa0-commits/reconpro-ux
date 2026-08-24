"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Rocket, Sparkles } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.08,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

type ChangeType = "Feature" | "Fix" | "Improvement";

interface ChangelogEntry {
  version: string;
  date: string;
  isLatest: boolean;
  changes: { type: ChangeType; description: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "v0.2.0",
    date: "2 weeks ago",
    isLatest: true,
    changes: [
      { type: "Feature", description: "Complete dashboard with 8 routes, sidebar navigation, and command palette" },
      { type: "Feature", description: "API key authentication with middleware-based dashboard protection" },
      { type: "Feature", description: "Bento-grid overview with live stats, severity donut chart, and recent activity feed" },
      { type: "Improvement", description: "Refined rate limiting with per-endpoint configuration and HTTP 429 responses" },
      { type: "Fix", description: "Corrected CORS configuration for cross-origin API requests from dashboard" },
    ],
  },
  {
    version: "v0.1.5",
    date: "1 month ago",
    isLatest: false,
    changes: [
      { type: "Feature", description: "TCP port scanning with service fingerprinting and banner grabbing" },
      { type: "Feature", description: "SSL/TLS certificate analysis with chain validation and expiry tracking" },
      { type: "Improvement", description: "Enhanced SSRF protection with cloud metadata endpoint blocking" },
      { type: "Fix", description: "Fixed input validation bypass on edge-case domain patterns" },
    ],
  },
  {
    version: "v0.1.0",
    date: "2 months ago",
    isLatest: false,
    changes: [
      { type: "Feature", description: "DNS reconnaissance module with native Node.js dns/promises resolver" },
      { type: "Feature", description: "REST API framework with 35+ endpoints and API key auth (SHA-256 hashing)" },
      { type: "Feature", description: "Prisma ORM with SQLite, 17 database models, and migration system" },
      { type: "Improvement", description: "Strict CSP, HSTS, COOP/COEP/CORP security headers via middleware" },
    ],
  },
  {
    version: "v0.0.5",
    date: "3 months ago",
    isLatest: false,
    changes: [
      { type: "Feature", description: "Project inception — Next.js 16 with App Router and TypeScript 5" },
      { type: "Feature", description: "Tailwind CSS 4 with OLED-black design system and shadcn/ui components" },
      { type: "Feature", description: "Base UI component library with framer-motion animations" },
      { type: "Improvement", description: "Core architecture decisions, folder structure, and development tooling" },
      { type: "Fix", description: "Initial CI/CD pipeline configuration and linting rules" },
    ],
  },
];

const typeStyles: Record<ChangeType, string> = {
  Feature: "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20",
  Fix: "bg-[#ff3355]/10 text-[#ff3355] border-[#ff3355]/20",
  Improvement: "bg-[#ffaa00]/10 text-[#ffaa00] border-[#ffaa00]/20",
};

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function ChangelogClient() {
  const { ref: entriesRef, isInView: entriesInView } = useInView(0.05);

  return (
    <div className="pt-16 bg-black">
      {/* Header */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <SectionBadge>
              <Rocket width={12} height={12} className="text-[#00ff88]" />
              Releases
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Changelog
            </h1>
            <p
              className="text-base text-white/50 max-w-xl"
              style={{ fontFamily: "var(--font-body)" }}
            >
              A factual record of what has been built and shipped. Every
              entry reflects actual changes to the ReconPro codebase.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Entries */}
      <section ref={entriesRef} className="relative pb-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {changelog.map((entry, ei) => (
              <motion.article
                key={entry.version}
                initial="hidden"
                animate={entriesInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={ei}
                className={`panel p-6 sm:p-8 hover-glow ${
                  entry.isLatest
                    ? "border-[#00ff88]/[0.15] shadow-[0_0_30px_rgba(0,255,136,0.04)]"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                  <span
                    className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full border ${
                      entry.isLatest
                        ? "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20"
                        : "bg-white/[0.06] text-white/50 border-white/[0.08]"
                    }`}
                  >
                    {entry.version}
                  </span>
                  {entry.isLatest && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20">
                      <Sparkles className="w-3 h-3" />
                      Current
                    </span>
                  )}
                  <span className="text-xs text-white/30">{entry.date}</span>
                </div>

                <ul className="space-y-2.5">
                  {entry.changes.map((change, ci) => (
                    <li key={ci} className="flex items-start gap-3">
                      <span
                        className={`shrink-0 mt-0.5 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${typeStyles[change.type]}`}
                      >
                        {change.type}
                      </span>
                      <span
                        className="text-sm text-white/60"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {change.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
