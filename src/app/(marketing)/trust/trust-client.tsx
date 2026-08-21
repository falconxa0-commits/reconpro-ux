"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  Shield,
  Lock,
  FileCheck,
  Bug,
  Award,
  Eye,
  Fingerprint,
  Scan,
  Network,
  KeyRound,
  ServerCog,
  CloudOff,
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

const certifications = [
  {
    name: "SOC 2 Type II",
    description: "Service Organization Control — security, availability, and confidentiality controls.",
    status: "In Progress",
    statusClass: "bg-[#ffaa00]/10 text-[#ffaa00] border-[#ffaa00]/20",
  },
  {
    name: "ISO 27001",
    description: "International standard for information security management systems.",
    status: "Planned",
    statusClass: "bg-white/[0.04] text-white/50 border-white/[0.08]",
  },
  {
    name: "HIPAA",
    description: "Health Insurance Portability and Accountability Act — protected health data handling.",
    status: "Planned",
    statusClass: "bg-white/[0.04] text-white/50 border-white/[0.08]",
  },
  {
    name: "FedRAMP",
    description: "Federal Risk and Authorization Management Program — U.S. government cloud authorization.",
    status: "Planned",
    statusClass: "bg-white/[0.04] text-white/50 border-white/[0.08]",
  },
  {
    name: "PCI-DSS",
    description: "Payment Card Industry Data Security Standard — cardholder data protection.",
    status: "Planned",
    statusClass: "bg-white/[0.04] text-white/50 border-white/[0.08]",
  },
  {
    name: "GDPR",
    description: "General Data Protection Regulation — EU data privacy and individual rights.",
    status: "In Progress",
    statusClass: "bg-[#ffaa00]/10 text-[#ffaa00] border-[#ffaa00]/20",
  },
];

const securityControls = [
  {
    icon: Lock,
    title: "TLS Encryption",
    desc: "TLS 1.2+ with strong cipher suites enforced on all endpoints. Plain HTTP is never served.",
  },
  {
    icon: KeyRound,
    title: "API Key Hashing",
    desc: "All API keys are hashed with SHA-256 before storage. Raw key values are never persisted and cannot be recovered.",
  },
  {
    icon: CloudOff,
    title: "SSRF Protection",
    desc: "Private IPs, link-local ranges, and cloud metadata endpoints (169.254.169.254) are blocked at the network layer.",
  },
  {
    icon: Fingerprint,
    title: "Rate Limiting",
    desc: "Per-API-key rate limits on all endpoints. HTTP 429 responses with Retry-After headers on excess.",
  },
  {
    icon: Eye,
    title: "Input Validation",
    desc: "Strict pattern matching for domains, IP addresses, and port ranges. All user input is sanitized.",
  },
  {
    icon: Shield,
    title: "Security Headers",
    desc: "Strict Content Security Policy, HSTS with 1-year max-age, COOP, COEP, and CORP headers via middleware.",
  },
  {
    icon: Scan,
    title: "Dependency Scanning",
    desc: "Automated vulnerability scanning of all dependencies on every pull request using npm audit.",
  },
  {
    icon: Network,
    title: "Network Isolation",
    desc: "Scanning infrastructure is isolated from production data. Scan targets are validated and rate-limited.",
  },
];

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function TrustClient() {
  const { ref: certRef, isInView: certInView } = useInView(0.05);
  const { ref: ctrlRef, isInView: ctrlInView } = useInView(0.05);
  const { ref: auditRef, isInView: auditInView } = useInView(0.05);
  const { ref: discRef, isInView: discInView } = useInView(0.05);

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
              <Award width={12} height={12} className="text-[#00ff88]" />
              Trust Center
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Trust Center
            </h1>
            <p
              className="text-base text-white/50 max-w-2xl leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Transparency about our security infrastructure, data protection
              practices, compliance posture, and audit readiness.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Compliance Certifications */}
      <section ref={certRef} className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={certInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Compliance</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Certifications & Frameworks
            </h2>
            <p
              className="text-sm text-white/50 max-w-lg mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Our roadmap to enterprise-grade compliance. Currently pursuing
              SOC 2 and GDPR, with additional frameworks planned.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifications.map((cert, i) => (
              <motion.div
                key={cert.name}
                initial="hidden"
                animate={certInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i + 1}
                className="panel p-6 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-white/40" />
                    <h3
                      className="text-base font-semibold text-white"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {cert.name}
                    </h3>
                  </div>
                </div>
                <p
                  className="text-xs text-white/40 leading-relaxed flex-1"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {cert.description}
                </p>
                <span
                  className={`self-start text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border ${cert.statusClass}`}
                >
                  {cert.status}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Controls */}
      <section ref={ctrlRef} className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={ctrlInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Security Controls</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Active Security Measures
            </h2>
            <p
              className="text-sm text-white/50 max-w-lg mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              A summary of the technical controls deployed across the ReconPro
              platform to protect your data and infrastructure.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {securityControls.map((ctrl, i) => (
              <motion.div
                key={ctrl.title}
                initial="hidden"
                animate={ctrlInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i + 1}
                className="panel p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <ctrl.icon className="w-4 h-4 text-[#00ff88]" />
                  </div>
                  <div>
                    <h3
                      className="text-sm font-semibold text-white mb-1"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {ctrl.title}
                    </h3>
                    <p
                      className="text-xs text-white/40 leading-relaxed"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {ctrl.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Audit Reports */}
      <section ref={auditRef} className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={auditInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Audits</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Audit Reports
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={auditInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={1}
            className="panel p-8 sm:p-12 text-center"
          >
            <FileCheck className="w-10 h-10 text-white/20 mx-auto mb-4" />
            <p
              className="text-sm text-white/50 mb-2"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Audit reports will be published here as they become available.
            </p>
            <p
              className="text-xs text-white/30"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Our first SOC 2 Type II audit is scheduled for Q4 2025. Monthly
              dependency vulnerability scans are currently active.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section ref={discRef} className="relative py-20 pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={discInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="panel p-6 sm:p-8 border-[#ff3355]/[0.1]"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#ff3355]/[0.06] border border-[#ff3355]/[0.12] flex items-center justify-center shrink-0">
                <Bug className="w-5 h-5 text-[#ff3355]" />
              </div>
              <div>
                <h2
                  className="text-lg font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Responsible Disclosure
                </h2>
                <p
                  className="text-sm text-white/50 mb-4 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Report vulnerabilities to{" "}
                  <span className="text-[#ff3355] font-medium">
                    security@reconpro.dev
                  </span>
                  . We ask that you:
                </p>
                <ul className="space-y-1.5 text-sm text-white/50">
                  {[
                    "Provide sufficient detail to reproduce the issue",
                    "Avoid exploiting the vulnerability or accessing user data",
                    "Allow us reasonable time to respond and fix",
                    "Do not disclose publicly until resolved",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#ff3355] shrink-0" />
                      <span style={{ fontFamily: "var(--font-body)" }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <p
                  className="text-sm text-white/40 mt-4"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  We acknowledge all reports within 48 hours and aim to resolve
                  critical issues within 72 hours.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
