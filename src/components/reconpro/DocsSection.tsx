"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Terminal,
  Network,
  Code,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";

// ── Getting Started Steps ─────────────────────────────

const gettingStartedSteps = [
  {
    step: 1,
    title: "Install ReconPro",
    description: "Clone the repository and install dependencies with a single command.",
    code: "git clone https://github.com/reconpro/reconpro.git && cd reconpro && bun install",
  },
  {
    step: 2,
    title: "Configure Your API Key",
    description: "Generate a secure API key from the dashboard for authenticated access.",
    code: "curl -X POST /api/auth/register -d '{\"email\": \"you@company.com\", \"password\": \"...\"}'",
  },
  {
    step: 3,
    title: "Launch Your First Scan",
    description: "Execute a full reconnaissance scan against any target domain.",
    code: "curl -X POST /api/scan -H 'x-api-key: rp_live_...' -d '{\"domain\": \"example.com\", \"scanType\": \"full\"}'",
  },
  {
    step: 4,
    title: "Review Findings & Reports",
    description: "Access structured results with severity ratings and compliance mappings.",
    code: "curl /api/reports?format=json -H 'x-api-key: rp_live_...'",
  },
];

// ── Documentation Categories ──────────────────────────

const docCategories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Installation, configuration, first scan, and quick start guide.",
    href: "/docs",
  },
  {
    icon: Network,
    title: "Architecture",
    description: "System design, data flow, scanner engine, and module architecture.",
    href: "/docs",
  },
  {
    icon: Terminal,
    title: "API Reference",
    description: "Complete REST API documentation with 55 endpoints and examples.",
    href: "/api-overview",
  },
  {
    icon: Code,
    title: "Plugin Development",
    description: "Build custom scanner modules using the plugin SDK and APIs.",
    href: "/docs",
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    description: "SOC 2, HIPAA, PCI-DSS, ISO 27001, NIST CSF, and GDPR mappings.",
    href: "/docs",
  },
  {
    icon: BarChart3,
    title: "Best Practices",
    description: "Scan strategies, performance tuning, and reporting workflows.",
    href: "/docs",
  },
];

// ── Syntax Highlighting ───────────────────────────────

function highlightSyntax(code: string) {
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  return code
    .split("\n")
    .map((line) => {
      let highlighted = escapeHtml(line);
      if (highlighted.startsWith("#")) {
        return `<span class="text-white/40">${highlighted}</span>`;
      }
      highlighted = highlighted.replace(
        /^(curl)\b/,
        '<span class="text-[#00ff88]/80">$1</span>'
      );
      highlighted = highlighted.replace(
        /(\s)(--[\w-]+)/g,
        '$1<span class="text-[#44aaff]/70">$2</span>'
      );
      highlighted = highlighted.replace(
        /(&quot;[^&]*&quot;)/g,
        '<span class="text-amber-300/60">$1</span>'
      );
      return highlighted;
    })
    .join("\n");
}

// ── Animation Variants ─────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ── Component ───────────────────────────────────────────

export default function DocsSection() {
  const { ref: sectionRef, isInView } = useInView(0.06);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // no-op
    }
  };

  return (
    <section
      id="docs"
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
            Documentation
          </span>
          <h2 className="text-gradient-void text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Get Started in Minutes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Four steps from zero to full reconnaissance. Professionally written
            documentation with real examples and copy-paste commands.
          </p>
        </motion.div>

        {/* ── Getting Started Steps ───────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mb-20 space-y-4"
        >
          {gettingStartedSteps.map((step) => (
            <motion.div
              key={step.step}
              variants={itemVariants}
              className="panel group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:gap-6">
                {/* Step Number */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <span className="text-sm font-semibold text-white/60">
                    {step.step}
                  </span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">
                    {step.description}
                  </p>
                </div>

                {/* Code block */}
                <div className="relative w-full overflow-hidden rounded-xl border border-white/[0.04] bg-white/[0.02] sm:w-auto sm:flex-1">
                  <div className="flex items-center justify-between border-b border-white/[0.04] px-3 py-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                      Terminal
                    </span>
                    <button
                      onClick={() => handleCopy(step.code, step.step)}
                      className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60"
                      aria-label="Copy command"
                    >
                      {copiedIndex === step.step ? (
                        <Check className="h-3 w-3 text-[#00ff88]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedIndex === step.step ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
                    <code
                      className="text-white/60"
                      dangerouslySetInnerHTML={{
                        __html: highlightSyntax(step.code),
                      }}
                    />
                  </pre>
                </div>
              </div>

              {/* Connector line to next step */}
              {step.step < gettingStartedSteps.length && (
                <div
                  className="absolute bottom-0 left-[34px] hidden h-4 w-px bg-gradient-to-b from-white/[0.06] to-transparent sm:block"
                  aria-hidden="true"
                />
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* ── Documentation Categories ────────────────────── */}
        <motion.h3
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-8 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/40"
        >
          Explore the Docs
        </motion.h3>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {docCategories.map((item) => {
            const Icon = item.icon;
            return (
              <motion.a
                key={item.title}
                href={item.href}
                variants={itemVariants}
                className="panel glass-hover group relative flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] transition-colors duration-300 group-hover:border-white/[0.12]">
                  <Icon
                    className="h-5 w-5 text-white/40 transition-colors duration-300 group-hover:text-[#00ff88]/80"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/15 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/40" strokeWidth={1.5} />
              </motion.a>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export { DocsSection };
