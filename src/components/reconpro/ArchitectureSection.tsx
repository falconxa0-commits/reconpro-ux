"use client";

import { motion } from "framer-motion";
import { archLayers } from "@/data/content";
import { useInView } from "@/hooks/useInView";

const flowNodes = [
  { label: "Target Input", color: "#ffffff" },
  { label: "Scanner", color: "#44aaff" },
  { label: "Pipeline", color: "#00ff88" },
  { label: "Knowledge Graph", color: "#ffaa00" },
  { label: "Evidence", color: "#ff3355" },
  { label: "Report", color: "#00ff88" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
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

export default function ArchitectureSection() {
  const { ref, isInView } = useInView(0.05);

  return (
    <section
      id="architecture"
      ref={ref}
      className="relative w-full bg-black py-32 overflow-hidden"
    >
      {/* ── Ambient Background ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-[0.03]"
          style={{
            background:
              "radial-gradient(ellipse at center, #44aaff 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 h-[400px] w-[600px] rounded-full opacity-[0.02]"
          style={{
            background:
              "radial-gradient(ellipse at center, #ff3355 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20 text-center"
        >
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            System Architecture
          </h2>
          <p className="mt-4 text-lg text-white/40">
            Eight precision-engineered layers. Zero compromises.
          </p>
        </motion.div>

        {/* ── Two-Column Layout ── */}
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-12">
          {/* ── Left: Layer Pipeline ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="lg:col-span-7"
          >
            <div className="relative flex flex-col gap-0">
              {archLayers.map((layer, i) => (
                <div key={layer.id} className="relative">
                  {/* Connector line */}
                  {i > 0 && (
                    <div className="absolute -top-5 left-[7px] z-10 flex h-5 w-[2px] items-center justify-center">
                      <div
                        className="h-full w-full arch-flow-line"
                        style={{
                          background: `linear-gradient(to bottom, ${archLayers[i - 1].color}40, ${layer.color}40)`,
                        }}
                      />
                      {/* Animated pulse dot */}
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full arch-pulse-flow"
                        style={{
                          background: layer.color,
                          boxShadow: `0 0 6px ${layer.color}80`,
                          animationDelay: `${i * 0.3}s`,
                        }}
                      />
                    </div>
                  )}

                  {/* Layer card */}
                  <motion.div
                    variants={itemVariants}
                    className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                    style={{
                      "--layer-color": layer.color,
                    } as React.CSSProperties}
                  >
                    {/* Hover glow */}
                    <div
                      className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        boxShadow: `0 0 30px -5px ${layer.color}20, inset 0 0 30px -10px ${layer.color}08`,
                      }}
                    />

                    <div className="relative flex gap-4">
                      {/* Color indicator bar */}
                      <div
                        className="mt-1 h-4 w-1 flex-shrink-0 rounded-full transition-shadow duration-300 group-hover:shadow-[0_0_12px_var(--layer-color)]"
                        style={{ background: layer.color }}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-white">
                            {layer.name}
                          </h3>
                          <span
                            className="text-[10px] font-mono uppercase tracking-widest opacity-40"
                            style={{ color: layer.color }}
                          >
                            L{i + 1}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/40">
                          {layer.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {layer.components.map((comp) => (
                            <span
                              key={comp}
                              className="inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-xs text-white/50"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Spacing between cards */}
                  {i < archLayers.length - 1 && <div className="h-6" />}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Right: Data Flow Diagram (desktop only) ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:col-span-5 lg:block"
          >
            <div className="sticky top-32">
              <h3 className="mb-6 text-xs font-mono uppercase tracking-[0.2em] text-white/20">
                Data Flow
              </h3>

              <div className="relative flex flex-col items-center gap-0">
                {flowNodes.map((node, i) => (
                  <div key={node.label} className="relative flex w-full flex-col items-center">
                    {/* Connector arrow */}
                    {i > 0 && (
                      <div className="relative flex h-10 w-full items-center justify-center">
                        <div
                          className="h-full w-[1px] arch-flow-line"
                          style={{
                            background: `linear-gradient(to bottom, ${flowNodes[i - 1].color}30, ${node.color}30)`,
                          }}
                        />
                        <svg
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 arch-pulse-flow"
                          style={{
                            color: node.color,
                            animationDelay: `${i * 0.4}s`,
                          }}
                          width="8"
                          height="8"
                          viewBox="0 0 8 8"
                          fill="currentColor"
                        >
                          <path d="M4 8L0 3h8L4 8z" />
                        </svg>
                      </div>
                    )}

                    {/* Node pill */}
                    <div
                      className="group/node relative z-10 w-full max-w-[220px] cursor-default rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-3 text-center text-sm font-medium text-white/60 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.2] hover:text-white hover:bg-white/[0.05]"
                      style={{
                        "--node-color": node.color,
                      } as React.CSSProperties}
                    >
                      {/* Glow on hover */}
                      <div
                        className="pointer-events-none absolute -inset-px rounded-lg opacity-0 transition-opacity duration-500 group-hover/node:opacity-100"
                        style={{
                          boxShadow: `0 0 24px -4px ${node.color}30, 0 0 4px -1px ${node.color}50`,
                        }}
                      />
                      <span className="relative">{node.label}</span>
                    </div>

                    {/* Spacing */}
                    {i < flowNodes.length - 1 && <div className="h-2" />}
                  </div>
                ))}

                {/* Decorative side labels */}
                <div className="pointer-events-none absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[9px] font-mono uppercase tracking-widest text-white/[0.08]" aria-hidden="true">
                  <span>Input</span>
                  <span>Process</span>
                  <span>Output</span>
                </div>
                <div className="pointer-events-none absolute -right-8 top-0 bottom-0 flex flex-col justify-between text-[9px] font-mono uppercase tracking-widest text-white/[0.08]" aria-hidden="true">
                  <span>Ingest</span>
                  <span>Enrich</span>
                  <span>Deliver</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Inline Keyframes ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes arch-flow-line {
          0% { opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { opacity: 0.3; }
        }
        @keyframes arch-pulse-flow {
          0% { transform: translateX(-50%) translateY(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(-50%) translateY(20px); opacity: 0; }
        }
        #architecture .arch-flow-line { animation: arch-flow-line 3s ease-in-out infinite; }
        #architecture .arch-pulse-flow { animation: arch-pulse-flow 3s ease-in-out infinite; }
      `}} />
    </section>
  );
}
