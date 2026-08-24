"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  Shield,
  Code2,
  Palette,
  Server,
  MapPin,
  Briefcase,
  Globe,
  Heart,
  BookOpen,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

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

const positions = [
  {
    icon: Server,
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Remote",
    description:
      "Build and scale our core scanning engine, real-time data pipeline, and REST API layer powering thousands of security assessments daily.",
    requirements: [
      "5+ years building production backend services in TypeScript, Go, or Rust",
      "Experience with distributed systems, message queues, and streaming architectures",
      "Strong understanding of networking protocols (DNS, TCP/IP, TLS) and security fundamentals",
      "Track record of shipping high-availability systems with comprehensive observability",
    ],
  },
  {
    icon: Shield,
    title: "Security Researcher",
    department: "Security",
    location: "Remote",
    description:
      "Discover and catalog vulnerabilities across web applications, APIs, and cloud infrastructure. Contribute to our scanner module ecosystem and threat intelligence feeds.",
    requirements: [
      "Proven experience in offensive security — bug bounties, pentesting, or CTF competition",
      "Deep knowledge of OWASP Top 10, CVE databases, and common vulnerability classes",
      "Ability to write reliable PoC exploits and produce clear, actionable vulnerability reports",
      "Familiarity with reverse engineering, binary analysis, or protocol fuzzing is a plus",
    ],
  },
  {
    icon: Palette,
    title: "Product Designer",
    department: "Design",
    location: "SF / Remote",
    description:
      "Design the dashboard experience, data visualizations, scan result interfaces, and reporting workflows for our security platform. OLED-optimized dark theme specialist.",
    requirements: [
      "4+ years of product design experience, ideally in developer tools or cybersecurity",
      "Strong portfolio showing complex data-dense interfaces and information architecture",
      "Proficiency in Figma with interaction prototyping and design system thinking",
      "Experience designing for dark-mode-first or OLED-optimized UIs is strongly preferred",
    ],
  },
  {
    icon: Code2,
    title: "DevOps Engineer",
    department: "Infrastructure",
    location: "Remote",
    description:
      "Design and maintain deployment infrastructure, CI/CD pipelines, container orchestration, and monitoring systems ensuring reliability at the infrastructure layer.",
    requirements: [
      "4+ years in infrastructure/DevOps/SRE roles with production Kubernetes environments",
      "Expert-level experience with Terraform, Docker, and modern CI/CD tooling (GitHub Actions, ArgoCD)",
      "Strong observability background — Prometheus, Grafana, structured logging, and alerting design",
      "Security-first mindset: hardening, secret management, network policies, and compliance automation",
    ],
  },
];

const benefits = [
  {
    icon: Globe,
    title: "Remote-First",
    description:
      "Work from anywhere in the world. Async communication by default with dedicated deep-work time blocks. No office requirements.",
  },
  {
    icon: Heart,
    title: "Health & Wellness",
    description:
      "Comprehensive health, dental, and vision insurance for you and dependents. $500/month wellness stipend for gym, therapy, or equipment.",
  },
  {
    icon: BookOpen,
    title: "Learning Budget",
    description:
      "$2,000/year per employee for conferences, courses, books, and certifications. Dedicated learning time each quarter.",
  },
  {
    icon: TrendingUp,
    title: "Equity",
    description:
      "Meaningful equity stake in an early-stage security company. You own what you build. Four-year vesting with a one-year cliff.",
  },
];

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function CareersClient() {
  const { ref: posRef, isInView: posInView } = useInView(0.05);
  const { ref: benefitRef, isInView: benefitInView } = useInView(0.05);
  const { ref: ctaRef, isInView: ctaInView } = useInView(0.05);

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
              <Briefcase width={12} height={12} className="text-[#00ff88]" />
              Careers
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Open positions
            </h1>
            <p
              className="text-base text-white/50 max-w-xl"
              style={{ fontFamily: "var(--font-body)" }}
            >
              We are building the next generation of security reconnaissance
              tools. Join our team and ship meaningful work that protects
              organizations at scale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Positions */}
      <section ref={posRef} className="relative pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-5">
            {positions.map((pos, i) => (
              <motion.div
                key={pos.title}
                initial="hidden"
                animate={posInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i}
                className="panel p-6 sm:p-8 hover-glow metallic-sheen"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                    <pos.icon className="w-5 h-5 text-[#00ff88]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-lg font-semibold text-white mb-1"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {pos.title}
                    </h3>
                    <p
                      className="text-sm text-white/50 leading-relaxed mb-3"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {pos.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs text-white/40 bg-white/[0.02] border border-white/[0.04] px-2.5 py-1 rounded-md">
                        <MapPin className="w-3 h-3" />
                        {pos.location}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-white/40 bg-white/[0.02] border border-white/[0.04] px-2.5 py-1 rounded-md">
                        <Briefcase className="w-3 h-3" />
                        {pos.department}
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 pl-14 mb-5">
                  {pos.requirements.map((req) => (
                    <li
                      key={req}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#00ff88]/50 shrink-0" />
                      <span
                        className="text-white/60"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {req}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="pl-14">
                  <button
                    disabled
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.06] text-white/70 text-sm cursor-not-allowed border border-white/[0.06] opacity-60"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Apply
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <span className="ml-3 text-xs text-white/30">
                    positions@reconpro.dev
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section ref={benefitRef} className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={benefitInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Benefits</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              What we offer
            </h2>
            <p
              className="text-sm text-white/50 max-w-lg mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              We believe great security work requires a great work
              environment. Here is what every team member gets.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial="hidden"
                animate={benefitInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i + 1}
                className="panel p-6 hover-glow"
              >
                <div className="w-9 h-9 rounded-lg bg-[#00ff88]/[0.06] border border-[#00ff88]/[0.12] flex items-center justify-center mb-4">
                  <benefit.icon className="w-4 h-4 text-[#00ff88]" />
                </div>
                <h3
                  className="text-sm font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {benefit.title}
                </h3>
                <p
                  className="text-sm text-white/50 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="relative py-20 pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={ctaInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="panel p-8 sm:p-12 text-center"
          >
            <h2
              className="text-2xl sm:text-3xl font-semibold text-white mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Don&apos;t see your role?
            </h2>
            <p
              className="text-sm text-white/50 max-w-md mx-auto mb-8 leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              We are always interested in exceptional people. Send your resume,
              GitHub profile, or a brief note about what you would build.
            </p>
            <a
              href="mailto:careers@reconpro.dev"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-all duration-300"
              style={{ fontFamily: "var(--font-body)" }}
            >
              positions@reconpro.dev
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
