"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";

export default function BenchmarksSection() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section
      ref={ref}
      id="benchmarks"
      className="relative bg-black px-4 py-32 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl mb-4">
            <span className="text-gradient-void">Performance</span>
          </h2>
          <p className="text-white/60 text-sm max-w-lg mx-auto">
            Built for speed and efficiency with modern tooling.
          </p>
        </motion.div>

        {/* Key Metrics — real, verifiable facts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {[
            { value: "Next.js 16", label: "Framework", color: "#ffffff" },
            { value: "React 19", label: "UI Runtime", color: "#00ff88" },
            { value: "TypeScript", label: "Type Safety", color: "#44aaff" },
            { value: "SQLite", label: "Embedded DB", color: "#ffaa00" },
          ].map((metric) => (
            <div
              key={metric.label}
              className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
            >
              <div
                className="text-3xl md:text-4xl font-semibold font-mono tracking-tight mb-2"
                style={{ color: metric.color }}
              >
                {metric.value}
              </div>
              <div className="text-xs text-white/50">{metric.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Capabilities Table — real scanner capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
          className="rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.01]"
        >
          <div className="overflow-x-auto">
            <table className="table-void w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th scope="col" className="text-left px-6 py-4 text-xs font-medium text-white/60 uppercase tracking-wider">
                    Module
                  </th>
                  <th scope="col" className="text-left px-6 py-4 text-xs font-medium text-white uppercase tracking-wider">
                    Technology
                  </th>
                  <th scope="col" className="text-left px-6 py-4 text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "DNS Reconnaissance", tech: "Node.js dns/promises", status: "Stable" },
                  { name: "SSL/TLS Analysis", tech: "Node.js tls module", status: "Stable" },
                  { name: "Port Scanning", tech: "Node.js net/tls", status: "Stable" },
                  { name: "HTTP Header Inspection", tech: "Node.js fetch API", status: "Stable" },
                  { name: "Vulnerability Scanning", tech: "Native TCP/DNS probes", status: "Stable" },
                  { name: "Bot Detection", tech: "Native TCP/DNS banner grab", status: "Stable" },
                ].map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors duration-300"
                  >
                    <td className="px-6 py-4 text-white/50 font-medium">
                      {row.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/60 font-mono text-xs">
                        {row.tech}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-center text-[11px] text-white/50 mt-6"
        >
          All scanning runs natively using Node.js built-in modules. No Python runtime required.
        </motion.p>
      </div>
    </section>
  );
}
