"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  Lock,
  Server,
  ShieldCheck,
  Monitor,
  FileCheck,
  AlertTriangle,
  Bug,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const sections = [
  {
    icon: Lock,
    title: "Encryption",
    description:
      "All data is encrypted both in transit and at rest. API endpoints enforce HTTPS exclusively with TLS 1.3 and strong cipher suites. Sensitive fields in the database are encrypted using AES-256. API keys are hashed with SHA-256 before storage and are shown only once at creation time.",
    badges: ["AES-256", "TLS 1.3", "SHA-256 Key Hashing"],
  },
  {
    icon: Server,
    title: "Infrastructure",
    description:
      "ReconPro is deployed on Vercel for the application layer and AWS for scanning infrastructure. All servers run hardened operating systems with automatic security patches. Network traffic is isolated, and scanning nodes operate in dedicated VPCs with strict egress rules.",
    badges: ["Vercel", "AWS", "Hardened OS", "VPC Isolation"],
  },
  {
    icon: ShieldCheck,
    title: "Access Control",
    description:
      "Role-based access control (RBAC) governs all resources with Admin, Editor, and Viewer roles. Multi-factor authentication (MFA) is available on all plans and required for Enterprise. SSO integration supports SAML 2.0 and OIDC for centralized identity management.",
    badges: ["RBAC", "MFA", "SAML 2.0", "OIDC"],
  },
  {
    icon: Monitor,
    title: "Monitoring & Alerting",
    description:
      "All systems are monitored 24/7 with automated health checks, uptime monitoring, and anomaly detection. Security events trigger immediate alerts to the on-call team. Application logs are retained for 90 days with real-time search and filtering capabilities.",
    badges: ["24/7 Monitoring", "Real-Time Alerts", "90-Day Log Retention"],
  },
  {
    icon: FileCheck,
    title: "Compliance",
    description:
      "ReconPro supports automated compliance assessments for SOC 2, ISO 27001, HIPAA, PCI-DSS, FedRAMP, NIST CSF, and GDPR. Our compliance framework maps security controls to each standard and generates audit-ready reports on demand.",
    badges: ["SOC 2", "ISO 27001", "HIPAA", "PCI-DSS", "FedRAMP", "GDPR"],
  },
  {
    icon: AlertTriangle,
    title: "Vulnerability Disclosure",
    description:
      "We maintain a responsible disclosure program for security researchers. Reports are acknowledged within 48 hours and critical issues are resolved within 72 hours. Researchers are credited in our Hall of Fame, and all findings follow coordinated disclosure timelines.",
    badges: ["48h Acknowledgment", "72h Critical Fix", "Coordinated Disclosure"],
  },
];

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function SecurityClient() {
  const { ref: sectionsRef, isInView: sectionsInView } = useInView(0.05);

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
              <ShieldCheck width={12} height={12} className="text-[#00ff88]" />
              Security
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Security practices
            </h1>
            <p
              className="text-base text-white/50 max-w-2xl leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              A detailed overview of the security measures implemented across
              encryption, infrastructure, access control, monitoring, compliance,
              and our vulnerability disclosure program.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 6 Security Practice Sections */}
      <section ref={sectionsRef} className="relative pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial="hidden"
                animate={sectionsInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i}
                className="panel p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-5 h-5 text-[#00ff88]" />
                  </div>
                  <h2
                    className="text-lg font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {section.title}
                  </h2>
                </div>
                <p
                  className="text-sm text-white/50 leading-relaxed mb-5"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {section.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {section.badges.map((badge) => (
                    <span
                      key={badge}
                      className="px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/60 font-mono"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
