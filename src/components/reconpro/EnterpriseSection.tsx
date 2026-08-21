"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  ShieldCheck,
  Headphones,
  Server,
  Zap,
  Check,
  ArrowRight,
  Quote,
  Building2,
  Lock,
  Award,
} from "lucide-react";

// ── Trust Logos (text-based) ─────────────────────────────

const trustLogos = [
  "Fortune 500",
  "SOC 2 Type II",
  "FedRAMP Authorized",
  "ISO 27001",
  "HIPAA Compliant",
  "PCI-DSS Level 1",
];

// ── Customer Stories ─────────────────────────────────────

const customerStories = [
  {
    quote:
      "ReconPro cut our vulnerability remediation time by 60%. The attack surface mapping alone justified the investment within the first quarter.",
    author: "Sarah Chen",
    role: "VP of Security",
    company: "Global Financial Services",
  },
  {
    quote:
      "We replaced three separate tools with ReconPro. The unified intelligence pipeline and real-time scanning gave us visibility we never had before.",
    author: "Marcus Webb",
    role: "CISO",
    company: "HealthTech Corp",
  },
  {
    quote:
      "The enterprise support team is exceptional. Custom scanner modules, on-premise deployment, and 4-hour SLA — they deliver on every promise.",
    author: "Priya Sharma",
    role: "Director of InfoSec",
    company: "CloudScale Inc.",
  },
];

// ── Enterprise Capabilities ──────────────────────────────

const enterpriseCapabilities = [
  {
    icon: ShieldCheck,
    title: "Compliance Ready",
    description: "SOC 2, HIPAA, PCI-DSS, ISO 27001, NIST CSF, and GDPR framework mappings with automated evidence linking.",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "4-hour SLA, dedicated engineering liaison, custom training programs, and quarterly business reviews.",
  },
  {
    icon: Server,
    title: "Flexible Deployment",
    description: "On-premise, SaaS, or hybrid. Deploy behind your firewall with full data sovereignty.",
  },
  {
    icon: Zap,
    title: "Advanced Automation",
    description: "Scheduled monitoring policies, CI/CD integration, webhook alerts, and automated reporting.",
  },
  {
    icon: Lock,
    title: "SSO & Access Control",
    description: "SAML/SSO integration, role-based access control with 5 granular permission levels, and audit logging.",
  },
  {
    icon: Award,
    title: "Custom Modules",
    description: "Build and deploy custom scanner modules tailored to your unique infrastructure and compliance needs.",
  },
];

// ── Animation Variants ──────────────────────────────────────

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

// ── Component ───────────────────────────────────────────────

export function EnterpriseSection() {
  const { ref: sectionRef, isInView } = useInView(0.05);

  return (
    <section
      id="enterprise"
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="relative bg-black px-4 py-24 sm:py-32 lg:px-8"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-white/[0.012] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* ── Header ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-16 text-center sm:mb-20"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/60">
            Enterprise
          </span>
          <h2 className="text-gradient-void text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Built for Security Teams at Scale
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            From Fortune 500 security operations to high-growth startups,
            ReconPro delivers enterprise-grade reconnaissance with the flexibility
            your organization demands.
          </p>
        </motion.div>

        {/* ── Trust Logos Marquee ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-20 overflow-hidden"
        >
          <p className="mb-6 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
            Trusted by organizations with the highest security standards
          </p>
          <div className="relative">
            {/* Fade edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-black to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-black to-transparent" />
            <div className="flex animate-marquee items-center gap-12 whitespace-nowrap">
              {[...trustLogos, ...trustLogos].map((logo, i) => (
                <div
                  key={`${logo}-${i}`}
                  className="flex items-center gap-2.5 text-white/25"
                >
                  <Building2 className="h-4 w-4" strokeWidth={1.5} />
                  <span className="text-sm font-medium tracking-wide">
                    {logo}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Customer Stories ──────────────────────────── */}
        <div className="mb-20">
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
            className="mb-10 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/40"
          >
            What Security Leaders Say
          </motion.h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            {customerStories.map((story) => (
              <motion.div
                key={story.author}
                variants={itemVariants}
                className="panel glass-hover group relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <Quote
                  className="mb-4 h-5 w-5 text-white/[0.08]"
                  strokeWidth={1.5}
                />
                <p className="flex-1 text-sm leading-relaxed text-white/60">
                  &ldquo;{story.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-white/[0.04] pt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-white/60">
                    {story.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      {story.author}
                    </p>
                    <p className="text-xs text-white/40">
                      {story.role}, {story.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ── Enterprise Capabilities Grid ──────────────── */}
        <div className="mb-20">
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
            className="mb-10 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/40"
          >
            Enterprise Capabilities
          </motion.h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {enterpriseCapabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <motion.div
                  key={cap.title}
                  variants={itemVariants}
                  className="panel glass-hover group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] transition-colors duration-300 group-hover:border-white/[0.12]">
                    <Icon
                      className="h-5 w-5 text-white/40 transition-colors duration-300 group-hover:text-[#00ff88]/80"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h4 className="text-sm font-medium text-white">
                    {cap.title}
                  </h4>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                    {cap.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* ── CTA Section ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center sm:p-12"
        >
          {/* Subtle inner glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(0,255,136,0.03) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative">
            <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Ready to Secure Your Attack Surface?
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-neutral-500">
              Get a personalized demo, discuss your security requirements,
              and see how ReconPro fits into your security operations.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="/enterprise"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-200 hover:bg-white/90"
              >
                Contact Sales
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-medium text-white/80 transition-all duration-200 hover:border-white/[0.2] hover:text-white"
              >
                View Pricing
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/30">
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" strokeWidth={2} />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" strokeWidth={2} />
                14-day free trial
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" strokeWidth={2} />
                Cancel anytime
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
