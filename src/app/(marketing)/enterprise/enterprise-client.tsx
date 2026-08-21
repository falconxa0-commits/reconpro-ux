"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  Building2,
  Cloud,
  Server,
  GitBranch,
  Shield,
  Lock,
  Users,
  ArrowRight,
  FileCheck,
  Activity,
} from "lucide-react";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const features = [
  {
    icon: Users,
    title: "Unlimited Team Members",
    description:
      "No caps on team size. Role-based access control with Admin, Editor, and Viewer roles for fine-grained permissions.",
  },
  {
    icon: Lock,
    title: "SSO / SAML 2.0 / OIDC",
    description:
      "Integrate with your existing identity provider. Full support for Okta, Azure AD, OneLogin, and Google Workspace.",
  },
  {
    icon: Shield,
    title: "Audit Logging",
    description:
      "Immutable audit logs record all API requests, scan operations, and configuration changes with 365-day retention.",
  },
  {
    icon: Building2,
    title: "Custom Scanner Modules",
    description:
      "Work with our engineering team to build custom scanner modules tailored to your specific infrastructure and threat model.",
  },
  {
    icon: Server,
    title: "Dedicated Infrastructure",
    description:
      "Isolated scanning infrastructure with dedicated IPs, custom rate limits, and guaranteed resource allocation.",
  },
  {
    icon: Activity,
    title: "24/7 Priority Support",
    description:
      "Dedicated account manager with 4-hour SLA for critical issues. Direct access to the engineering team via Slack.",
  },
];

const deployments = [
  {
    icon: Cloud,
    title: "Cloud",
    description:
      "Managed hosting on our infrastructure. Zero operational overhead with automatic updates, scaling, and 99.9% uptime SLA.",
    badge: "Most Popular",
  },
  {
    icon: Server,
    title: "On-Premise",
    description:
      "Deploy within your own data center or VPC. Full control over data residency, network isolation, and air-gapped environments.",
    badge: "Air-Gapped Available",
  },
  {
    icon: GitBranch,
    title: "Hybrid",
    description:
      "Cloud management plane with on-premise scanning nodes. Best of both worlds for regulated industries with data sovereignty requirements.",
    badge: null,
  },
];

const compliance = ["SOC 2", "ISO 27001", "HIPAA", "FedRAMP", "PCI-DSS"];

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function EnterpriseClient() {
  const { ref: featRef, isInView: featInView } = useInView(0.05);
  const { ref: depRef, isInView: depInView } = useInView(0.05);
  const { ref: compRef, isInView: compInView } = useInView(0.05);
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
              <Building2 width={12} height={12} className="text-[#00ff88]" />
              Enterprise
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Enterprise-grade security intelligence
            </h1>
            <p
              className="text-base text-white/50 max-w-2xl leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Dedicated infrastructure, compliance frameworks, SSO integration,
              and direct engineering support. Built for security teams that need
              production-grade reliability.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid — 6 Cards */}
      <section ref={featRef} className="relative py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={featInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Features</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              What you get
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial="hidden"
                animate={featInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i + 1}
                className="panel p-6 hover-glow metallic-sheen"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
                  <feat.icon className="w-5 h-5 text-[#00ff88]" />
                </div>
                <h3
                  className="text-base font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {feat.title}
                </h3>
                <p
                  className="text-sm text-white/50 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {feat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Deployment Options — Cloud / On-Prem / Hybrid */}
      <section ref={depRef} className="relative py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={depInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Deployment</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Flexible deployment options
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {deployments.map((dep, i) => (
              <motion.div
                key={dep.title}
                initial="hidden"
                animate={depInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i + 1}
                className="panel p-6 hover-glow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <dep.icon className="w-5 h-5 text-[#00ff88]" />
                  </div>
                  {dep.badge && (
                    <span className="text-[10px] font-medium text-[#00ff88]/80 bg-[#00ff88]/[0.06] border border-[#00ff88]/[0.1] px-2 py-0.5 rounded-md">
                      {dep.badge}
                    </span>
                  )}
                </div>
                <h3
                  className="text-base font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {dep.title}
                </h3>
                <p
                  className="text-sm text-white/50 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {dep.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Badges — SOC2, ISO27001, HIPAA, FedRAMP, PCI-DSS */}
      <section ref={compRef} className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={compInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>
              <FileCheck width={12} height={12} className="text-[#00ff88]" />
              Compliance
            </SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Compliance frameworks
            </h2>
            <p
              className="text-sm text-white/40 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Automated compliance assessments across major industry frameworks.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={compInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={1}
            className="flex flex-wrap justify-center gap-3"
          >
            {compliance.map((c) => (
              <span
                key={c}
                className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white/70 font-medium"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {c}
              </span>
            ))}
          </motion.div>
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
              Ready to get started?
            </h2>
            <p
              className="text-sm text-white/50 max-w-md mx-auto mb-8 leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Contact our team for a custom demo, pricing discussion, or proof
              of concept.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-all duration-300"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Contact Sales
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
