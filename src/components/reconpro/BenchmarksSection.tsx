"use client";

import { motion } from "framer-motion";
import { benchmarks } from "@/data/content";
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
          <p className="text-white/40 text-sm max-w-lg mx-auto">
            Faster. Lighter. More efficient. Measurably superior.
          </p>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {[
            { value: "47s", label: "Full Scan (100 domains)", color: "#ffffff" },
            { value: "34MB", label: "Memory Footprint", color: "#00ff88" },
            { value: "12MB", label: "Install Size", color: "#44aaff" },
            { value: "16×", label: "Faster than alternatives", color: "#ffaa00" },
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

        {/* Comparison Table */}
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
                  <th scope="col" className="text-left px-6 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Benchmark
                  </th>
                  <th scope="col" className="text-left px-6 py-4 text-xs font-medium text-white uppercase tracking-wider">
                    ReconPro
                  </th>
                  <th scope="col" className="text-left px-6 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Nmap
                  </th>
                  <th scope="col" className="text-left px-6 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Nessus
                  </th>
                  <th scope="col" className="text-left px-6 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Edge
                  </th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((row, i) => (
                  <tr
                    key={row.name}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors duration-300"
                  >
                    <td className="px-6 py-4 text-white/50 font-medium">
                      {row.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-semibold font-mono">
                        {row.reconpro}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/40 font-mono">{row.nmap}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/40 font-mono">
                        {row.nessus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium badge-pass">
                        {row.improvement}
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
          Benchmarked on equivalent hardware. Results may vary. See our methodology for details.
        </motion.p>
      </div>
    </section>
  );
}
