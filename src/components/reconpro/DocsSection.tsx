"use client";

import { useState } from "react";
import { BookOpen, Layers, Terminal, Network, Code, CheckCircle, Copy } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const docs = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description:
      "Installation, configuration, first scan, quick start guide",
  },
  {
    icon: Layers,
    title: "Core Concepts",
    description:
      "Scanner modules, intelligence pipeline, knowledge graph, evidence correlation",
  },
  {
    icon: Terminal,
    title: "CLI Reference",
    description:
      "Complete command documentation, flags, output formats, examples",
  },
  {
    icon: Network,
    title: "Architecture",
    description:
      "System design, data flow, agent runtime, autonomous planner",
  },
  {
    icon: Code,
    title: "API & Plugins",
    description:
      "Plugin SDK, module development, API reference, integrations",
  },
  {
    icon: CheckCircle,
    title: "Best Practices",
    description:
      "Scan strategies, performance tuning, compliance mapping, reporting",
  },
];

const codeBlock = `# Install
pip install reconpro

# Quick scan
reconpro scan --target example.com

# Full intelligence
reconpro intel --target example.com --deep --correlate

# Autonomous mode
reconpro autonomous --goal "Map the complete attack surface"`;

function highlightSyntax(code: string) {
  // Escape HTML entities first to prevent XSS
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return code
    .split("\n")
    .map((line) => {
      let highlighted = escapeHtml(line);

      // Comments
      if (highlighted.startsWith("#")) {
        return `<span class="text-white/30">${highlighted}</span>`;
      }

      // Commands (pip, reconpro)
      highlighted = highlighted.replace(
        /^(pip\s+install|reconpro)\b/,
        '<span class="text-emerald-400/80">$1</span>'
      );

      // Flags
      highlighted = highlighted.replace(
        /(\s)(--[\w-]+)/g,
        '$1<span class="text-sky-400/70">$2</span>'
      );

      // Strings in quotes (after HTML escaping, quotes are &quot;)
      highlighted = highlighted.replace(
        /(&quot;[^&]*&quot;)/g,
        '<span class="text-amber-300/60">$1</span>'
      );

      // Values (example.com)
      highlighted = highlighted.replace(
        /(\s)(\S+\.\S+)/g,
        '$1<span class="text-white/60">$2</span>'
      );

      return highlighted;
    })
    .join("\n");
}

export default function DocsSection() {
  const { ref: sectionRef, isInView } = useInView(0.1);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeBlock);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback – no-op
    }
  };

  return (
    <section
      id="docs"
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="relative w-full bg-black px-4 py-32 sm:px-6 lg:px-8"
    >
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center" aria-hidden="true">
        <div className="h-[600px] w-[800px] rounded-full bg-white/[0.02] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="mb-16 text-center">
          <h2
            className={`
              text-4xl font-semibold tracking-tight text-white sm:text-5xl
              transition-all duration-700
              ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
            `}
          >
            Documentation
          </h2>
          <p
            className={`
              mt-5 max-w-xl mx-auto text-sm text-white/40 transition-all delay-100 duration-700
              ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
            `}
          >
            Everything you need. Professionally written. Always current.
          </p>
        </div>

        {/* ── Code Block ──────────────────────────────────── */}
        <div
          className={`
            cli-showcase relative mb-20 overflow-hidden rounded-2xl border border-white/[0.06]
            bg-white/[0.03] backdrop-blur-xl
            transition-all delay-150 duration-700
            ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
          `}
        >
          {/* Window chrome */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-white/30 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white/60"
              aria-label="Copy code"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed">
            <code
              className="text-white/70"
              dangerouslySetInnerHTML={{
                __html: highlightSyntax(codeBlock),
              }}
            />
          </pre>
        </div>

        {/* ── Category Grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`
                  bento-tile glass-hover group relative overflow-hidden rounded-2xl
                  border border-white/[0.06] bg-white/[0.02] p-6
                  transition-all duration-700
                  ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                `}
                style={{ transitionDelay: `${250 + i * 80}ms` }}
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent" />
                </div>

                <Icon className="mb-4 h-5 w-5 text-white/20" strokeWidth={1.5} />
                <h3 className="text-sm font-medium text-white">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/40">
                  {item.description}
                </p>
                <span className="mt-4 inline-block text-xs text-white/50 transition-colors duration-200 group-hover:text-white/50">
                  Explore &rarr;
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export { DocsSection };
