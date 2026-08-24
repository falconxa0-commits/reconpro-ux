"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  BookOpen,
  Code2,
  Terminal,
  Puzzle,
  Shield,
  Layers,
  Search,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const categories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description:
      "Install ReconPro, configure your environment, and run your first scan in under five minutes.",
    docCount: 12,
    href: "/docs#getting-started",
  },
  {
    icon: Code2,
    title: "API Reference",
    description:
      "Complete REST API documentation with 35+ endpoints covering authentication, scanning, intelligence, and reporting.",
    docCount: 28,
    href: "/api-overview",
  },
  {
    icon: Terminal,
    title: "CLI Guide",
    description:
      "Full command-line interface reference. All commands, flags, output formats, and automation examples.",
    docCount: 18,
    href: "/docs#cli",
  },
  {
    icon: Puzzle,
    title: "Integrations",
    description:
      "Connect ReconPro with Slack, Jira, GitHub Actions, webhooks, and your existing CI/CD pipelines.",
    docCount: 15,
    href: "/docs#integrations",
  },
  {
    icon: Shield,
    title: "Security",
    description:
      "Security architecture, API key management, SSRF protection details, and vulnerability disclosure policy.",
    docCount: 9,
    href: "/security",
  },
  {
    icon: Layers,
    title: "Architecture",
    description:
      "System design, database schema, scanning pipeline internals, and how to write custom scanner modules.",
    docCount: 11,
    href: "/docs#architecture",
  },
];

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function DocsClient() {
  const { ref: cardsRef, isInView: cardsInView } = useInView(0.05);
  const [search, setSearch] = useState("");

  const filteredCategories = categories.filter(
    (cat) =>
      cat.title.toLowerCase().includes(search.toLowerCase()) ||
      cat.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pt-16 bg-black">
      {/* Header */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
            className="text-center"
          >
            <SectionBadge>
              <BookOpen width={12} height={12} className="text-[#00ff88]" />
              Documentation
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Everything you need to get started
            </h1>
            <p
              className="text-base text-white/50 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              From installation to advanced API usage, all documentation is
              maintained alongside the source code.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search Input */}
      <section className="relative pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documentation..."
              className="input-void w-full pl-11"
            />
          </div>
        </div>
      </section>

      {/* Category Cards */}
      <section ref={cardsRef} className="relative py-12 pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((cat, i) => (
              <motion.div
                key={cat.title}
                initial="hidden"
                animate={cardsInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i}
              >
                <Link href={cat.href} className="block">
                  <div className="panel p-6 hover-glow metallic-sheen group h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <cat.icon className="w-5 h-5 text-[#00ff88]" />
                      </div>
                      <span className="text-[10px] font-medium text-[#00ff88]/70 bg-[#00ff88]/[0.06] border border-[#00ff88]/[0.1] px-2 py-0.5 rounded-md">
                        {cat.docCount} docs
                      </span>
                    </div>
                    <h3
                      className="text-base font-semibold text-white mb-2"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {cat.title}
                    </h3>
                    <p
                      className="text-sm text-white/40 leading-relaxed mb-5"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {cat.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-white/30 group-hover:text-[#00ff88]/70 transition-colors duration-300">
                      <span style={{ fontFamily: "var(--font-body)" }}>Browse docs</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-16">
              <p
                className="text-sm text-white/30"
                style={{ fontFamily: "var(--font-body)" }}
              >
                No documentation categories match your search.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
