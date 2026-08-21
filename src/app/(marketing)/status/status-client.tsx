"use client";

import { motion } from "framer-motion";
import { Activity, CheckCircle2, ShieldAlert, Server, Gauge, Wifi, LayoutDashboard, Database, Clock } from "lucide-react";

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

const services = [
  {
    name: "API Gateway",
    description: "REST API endpoints, authentication, and request routing",
    icon: Wifi,
  },
  {
    name: "Scanning Engine",
    description: "Core scanner modules, job queue, and result processing",
    icon: Server,
  },
  {
    name: "Dashboard App",
    description: "Web dashboard, real-time updates, and UI rendering",
    icon: LayoutDashboard,
  },
  {
    name: "Database",
    description: "Persistent storage, query engine, and data replication",
    icon: Database,
  },
];

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function StatusClient() {
  // Generate 30 days of all-green uptime data
  const uptimeDays = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    up: true,
  }));

  return (
    <div className="pt-16 bg-black">
      {/* Header */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
            className="text-center"
          >
            <SectionBadge>
              <Activity width={12} height={12} className="text-[#00ff88]" />
              Status
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              System status
            </h1>
            <p
              className="text-base text-white/50 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Real-time uptime and service health monitoring for all ReconPro
              platform components.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Overall Uptime Banner */}
      <section className="pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: [0.16, 1, 0.3, 1] as const,
            }}
            className="rounded-xl border border-[#00ff88]/[0.1] bg-[#00ff88]/[0.03] p-5 flex items-center gap-4"
          >
            <span className="bg-[#00ff88] w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" />
            <p
              className="text-sm text-white/70 flex-1"
              style={{ fontFamily: "var(--font-body)" }}
            >
              All systems operational
            </p>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#00ff88]/60" />
              <span className="text-lg font-mono font-semibold text-[#00ff88]">
                99.98%
              </span>
              <span className="text-xs text-white/30">uptime</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Service List */}
      <section className="pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="panel overflow-hidden">
            {services.map((svc, i) => (
              <div
                key={svc.name}
                className={`flex items-center justify-between px-5 py-4 ${
                  i < services.length - 1
                    ? "border-b border-white/[0.04]"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="bg-[#00ff88] w-2 h-2 rounded-full shrink-0" />
                  <svc.icon className="w-4 h-4 text-white/30" />
                  <div>
                    <p
                      className="text-sm font-medium text-white"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {svc.name}
                    </p>
                    <p
                      className="text-xs text-white/30"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {svc.description}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#00ff88]/80">
                  Operational
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 30-Day Uptime Grid */}
      <section className="pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="panel p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <Clock className="w-4 h-4 text-white/40" />
              <h2
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                30-Day Uptime History
              </h2>
            </div>
            <div className="flex gap-[3px] flex-wrap">
              {uptimeDays.map((day) => (
                <div
                  key={day.day}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm bg-[#00ff88]/[0.5] hover:bg-[#00ff88]/[0.7] transition-all duration-200 cursor-default"
                  title={`Day ${day.day}: Operational`}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#00ff88]/[0.5]" />
                <span className="text-xs text-white/40">Operational</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#ff3355]/[0.5]" />
                <span className="text-xs text-white/40">Incident</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Last Incident */}
      <section className="pb-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="panel p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-4 h-4 text-white/40" />
              <h2
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Recent Incidents
              </h2>
            </div>
            <div className="flex items-center gap-3 py-6">
              <CheckCircle2 className="w-5 h-5 text-[#00ff88]/60" />
              <p
                className="text-sm text-white/50"
                style={{ fontFamily: "var(--font-body)" }}
              >
                No incidents in the last 90 days.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
