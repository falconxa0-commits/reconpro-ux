"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cliCommands } from "@/data/content";
import { useInView } from "@/hooks/useInView";

export default function CLISection() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { ref: cliRef, isInView } = useInView(0.05);

  const selectedCommand = cliCommands[selectedIndex] ?? cliCommands[0];

  return (
    <section
      id="cli"
      ref={cliRef}
      className="relative bg-black px-4 py-24 sm:py-32 lg:px-8"
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* ── Header ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-16 text-center sm:mb-20"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/60">
            Developer Experience
          </span>
          <h2 className="text-gradient-void text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            API Reference
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            {cliCommands.length} endpoints. Every operation. One unified REST interface.
            Authenticate, scan, report, and automate — all via clean API calls.
          </p>
        </motion.div>

        {/* ── Main Layout: Terminal + Command Cards ── */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
          {/* Left: Interactive Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            className="flex-shrink-0 lg:w-[55%]"
          >
            <div className="cli-showcase overflow-hidden rounded-2xl border border-white/[0.06] bg-black/80 backdrop-blur-xl">
              {/* Title Bar */}
              <div
                className="cli-titlebar flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3"
                aria-hidden="true"
              >
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs tracking-wide text-white/50">
                    reconpro — {selectedCommand.name}
                  </span>
                </div>
              </div>

              {/* Terminal Body */}
              <div
                className="cli-body min-h-[320px] p-5 font-mono text-sm leading-relaxed md:min-h-[400px]"
                role="region"
                aria-label={`Terminal output for ${selectedCommand.name}`}
                aria-live="polite"
              >
                <div className="space-y-1">
                  {selectedCommand.example
                    .split("\n")
                    .map((line, lineIdx) => {
                      const isPrompt = line.startsWith("$");
                      const isPlus = line.startsWith("[+]");
                      const isMinus = line.startsWith("[-]");
                      const isStar = line.startsWith("[*]");
                      const isInfo = line.startsWith("[i]");

                      if (isPrompt) {
                        const afterPrompt = line.slice(1).trimStart();
                        const cmdParts = afterPrompt.split(/\s+/);
                        const cmdName = cmdParts[0] || "";
                        const rest = cmdParts.slice(1);

                        return (
                          <div
                            key={lineIdx}
                            className="flex items-start leading-7"
                          >
                            <span className="mr-2 text-white/60 select-none">
                              $
                            </span>
                            <span className="text-white font-semibold">
                              {cmdName}
                            </span>
                            <span className="ml-2">
                              {rest.map((part, pi) => {
                                if (
                                  part.startsWith("--") ||
                                  part.startsWith("-")
                                ) {
                                  return (
                                    <span key={pi} className="text-[#44aaff]">
                                      {" "}
                                      {part}
                                    </span>
                                  );
                                }
                                return (
                                  <span key={pi} className="text-[#00ff88]">
                                    {" "}
                                    {part}
                                  </span>
                                );
                              })}
                            </span>
                            {lineIdx ===
                              selectedCommand.example
                                .split("\n")
                                .findIndex((l) => l.startsWith("$")) && (
                              <span className="ml-1 inline-block h-[18px] w-[8px] animate-pulse bg-white/70" />
                            )}
                          </div>
                        );
                      }

                      if (isPlus) {
                        return (
                          <div key={lineIdx} className="leading-7">
                            <span className="text-[#00ff88] select-none">
                              [+]{" "}
                            </span>
                            <span className="text-white/50">
                              {line.slice(4)}
                            </span>
                          </div>
                        );
                      }

                      if (isMinus) {
                        return (
                          <div key={lineIdx} className="leading-7">
                            <span className="text-[#ff4466] select-none">
                              [-]{" "}
                            </span>
                            <span className="text-white/50">
                              {line.slice(4)}
                            </span>
                          </div>
                        );
                      }

                      if (isStar) {
                        return (
                          <div key={lineIdx} className="leading-7">
                            <span className="text-[#ffaa00] select-none">
                              [*]{" "}
                            </span>
                            <span className="text-white/50">
                              {line.slice(4)}
                            </span>
                          </div>
                        );
                      }

                      if (isInfo) {
                        return (
                          <div key={lineIdx} className="leading-7">
                            <span className="text-[#44aaff] select-none">
                              [i]{" "}
                            </span>
                            <span className="text-white/50">
                              {line.slice(4)}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={lineIdx} className="leading-7 text-white/50">
                          {line || "\u00A0"}
                        </div>
                      );
                    })}
                </div>

                {/* Blinking Cursor */}
                <div className="mt-2 flex items-center">
                  <span className="text-white/60 select-none mr-2">$</span>
                  <span className="inline-block h-[18px] w-[8px] animate-pulse bg-white/70" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Scrollable Command Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
            className="flex-1 lg:max-h-[500px]"
          >
            <div
              className="space-y-1.5 overflow-y-auto pr-1 lg:max-h-[500px] lg:[scrollbar-width:thin] lg:[scrollbar-color:rgba(255,255,255,0.08)_transparent]"
              role="listbox"
              aria-label="API commands"
            >
              {cliCommands.map((cmd, index) => {
                const isActive = index === selectedIndex;

                return (
                  <button
                    key={cmd.name}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => setSelectedIndex(index)}
                    aria-label={`${cmd.name}: ${cmd.description}`}
                    className={`group w-full cursor-pointer rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
                      isActive
                        ? "border-white/[0.1] bg-white/[0.06]"
                        : "border-white/[0.04] bg-transparent hover:bg-white/[0.03] hover:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span
                          className={`font-mono text-sm ${
                            isActive
                              ? "text-white"
                              : "text-white/60 group-hover:text-white/80"
                          } transition-colors`}
                        >
                          {cmd.name}
                        </span>
                        <p
                          className={`mt-1 text-sm truncate ${
                            isActive
                              ? "text-white/60"
                              : "text-white/40 group-hover:text-white/60"
                          } transition-colors`}
                        >
                          {cmd.description}
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                          isActive
                            ? "bg-white/[0.06] text-white/60"
                            : "bg-white/[0.03] text-white/40 group-hover:text-white/60"
                        }`}
                      >
                        {cmd.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
