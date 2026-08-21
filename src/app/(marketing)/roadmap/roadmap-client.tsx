"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Calendar, CheckCircle2, Clock, CircleDot } from "lucide-react";

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

type FeatureStatus = "Shipped" | "In Progress" | "Planned";

interface RoadmapFeature {
  name: string;
  status: FeatureStatus;
}

interface Quarter {
  label: string;
  features: RoadmapFeature[];
}

const quarters: Quarter[] = [
  {
    label: "Q1 2025",
    features: [
      { name: "Core scanning engine with DNS, port, and SSL modules", status: "Shipped" },
      { name: "REST API with 35+ endpoints and API key auth", status: "Shipped" },
      { name: "Prisma ORM setup with 17 database models", status: "Shipped" },
      { name: "Security hardening — CSP, HSTS, rate limiting, SSRF protection", status: "Shipped" },
    ],
  },
  {
    label: "Q2 2025",
    features: [
      { name: "Dashboard with 8 dedicated routes and sidebar navigation", status: "Shipped" },
      { name: "Command palette and real-time scan progress streaming", status: "Shipped" },
      { name: "Bento-grid overview with severity donut chart and live stats", status: "Shipped" },
      { name: "Team management and role-based access controls", status: "In Progress" },
    ],
  },
  {
    label: "Q3 2025",
    features: [
      { name: "Compliance reporting engine with PDF and CSV exports", status: "In Progress" },
      { name: "Webhook notification system for scan events", status: "In Progress" },
      { name: "Slack and Jira integrations for alert forwarding", status: "Planned" },
      { name: "Advanced scan scheduling with cron expressions", status: "Planned" },
    ],
  },
  {
    label: "Q4 2025",
    features: [
      { name: "Billing and subscription management with usage metering", status: "Planned" },
      { name: "SSO / SAML 2.0 integration for enterprise onboarding", status: "Planned" },
      { name: "Custom scanner module API and plugin SDK", status: "Planned" },
      { name: "SOC 2 Type II audit initiation", status: "Planned" },
    ],
  },
];

const statusConfig: Record<FeatureStatus, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  Shipped: {
    color: "text-[#00ff88]",
    bg: "bg-[#00ff88]/10",
    border: "border-[#00ff88]/20",
    icon: CheckCircle2,
  },
  "In Progress": {
    color: "text-[#ffaa00]",
    bg: "bg-[#ffaa00]/10",
    border: "border-[#ffaa00]/20",
    icon: Clock,
  },
  Planned: {
    color: "text-white/40",
    bg: "bg-white/[0.03]",
    border: "border-white/[0.06]",
    icon: CircleDot,
  },
};

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function RoadmapClient() {
  const { ref: timelineRef, isInView: timelineInView } = useInView(0.05);
  const { ref: noteRef, isInView: noteInView } = useInView(0.05);

  return (
    <div className="pt-16 bg-black">
      {/* Header */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <SectionBadge>
              <Calendar width={12} height={12} className="text-[#00ff88]" />
              Roadmap
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Product roadmap
            </h1>
            <p
              className="text-base text-white/50 max-w-2xl leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              An honest look at where ReconPro is and what we are building.
              No vaporware — everything listed here is real work in progress.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Legend */}
      <section className="pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-4">
            {(
              ["Shipped", "In Progress", "Planned"] as FeatureStatus[]
            ).map((status) => {
              const cfg = statusConfig[status];
              return (
                <div key={status} className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${status === "Shipped" ? "bg-[#00ff88]" : status === "In Progress" ? "bg-[#ffaa00]" : "bg-white/30"}`}
                  />
                  <span className="text-xs text-white/50">{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vertical Timeline */}
      <section ref={timelineRef} className="relative pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] sm:left-[23px] top-0 bottom-0 w-px bg-white/[0.06]" />

            <div className="space-y-12">
              {quarters.map((q, i) => (
                <motion.div
                  key={q.label}
                  initial="hidden"
                  animate={timelineInView ? "visible" : "hidden"}
                  variants={fadeUp}
                  custom={i}
                  className="relative pl-12 sm:pl-16"
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-[14px] sm:left-[18px] top-2 w-[12px] h-[12px] rounded-full border-2 ${
                      q.label === "Q1 2025"
                        ? "bg-[#00ff88] border-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.3)]"
                        : q.label === "Q2 2025"
                          ? "bg-[#00ff88]/60 border-[#00ff88]/60"
                          : "bg-white/[0.06] border-white/20"
                    }`}
                  />

                  <div className="panel p-6 sm:p-8">
                    <h3
                      className="text-lg font-semibold text-white mb-5"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {q.label}
                    </h3>

                    <ul className="space-y-3">
                      {q.features.map((feat) => {
                        const cfg = statusConfig[feat.status];
                        const StatusIcon = cfg.icon;
                        return (
                          <li
                            key={feat.name}
                            className="flex items-start gap-3 text-sm"
                          >
                            <StatusIcon
                              className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`}
                            />
                            <span
                              className="text-white/60 flex-1"
                              style={{ fontFamily: "var(--font-body)" }}
                            >
                              {feat.name}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 ${cfg.color} ${cfg.bg} ${cfg.border}`}
                            >
                              {feat.status}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Note */}
      <section ref={noteRef} className="relative py-12 pb-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={noteInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="panel p-6"
          >
            <p
              className="text-sm text-white/50 leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <span className="text-white font-medium">A note on timelines:</span>{" "}
              We are a small, focused team. We ship when things are ready, not
              on arbitrary deadlines. Planned items may shift in priority or
              scope based on user feedback and security requirements.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
