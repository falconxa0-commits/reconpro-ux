"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  Globe,
  Shield,
  Search,
  Lock,
  Network,
  Radio,
  Mail,
  FileText,
  type LucideIcon,
} from "lucide-react";

// ── Feature Data ──────────────────────────────────────────

interface FeatureCard {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  highlights: string[];
}

const featureCards: FeatureCard[] = [
  {
    title: "Attack Surface Mapping",
    description:
      "Discover and map every exposed asset across your organization. DNS records, subdomains, IP ranges, and cloud infrastructure in one unified view.",
    icon: Globe,
    accent: "#00ff88",
    highlights: ["Auto-discovery engine", "Asset correlation graph", "Cloud provider detection"],
  },
  {
    title: "Vulnerability Scanning",
    description:
      "Automated vulnerability detection with CVE matching, service fingerprinting, and risk scoring. Identify weaknesses before attackers do.",
    icon: Shield,
    accent: "#ff3355",
    highlights: ["CVE database matching", "Real-time risk scoring", "Exploit correlation"],
  },
  {
    title: "DNS Reconnaissance",
    description:
      "Deep DNS enumeration extracting A, AAAA, MX, TXT, NS, and CNAME records. Detect DMARC misconfigurations and SPF failures.",
    icon: Search,
    accent: "#44aaff",
    highlights: ["Full record enumeration", "DMARC/SPF analysis", "DNSSEC validation"],
  },
  {
    title: "SSL Analysis",
    description:
      "Certificate chain analysis, cipher suite grading, and TLS protocol compliance. Ensure every connection meets modern security standards.",
    icon: Lock,
    accent: "#ffaa00",
    highlights: ["TLS 1.3 compliance", "Cipher suite grading", "HSTS verification"],
  },
  {
    title: "Subdomain Enumeration",
    description:
      "Multi-source subdomain discovery using DNS permutation, certificate transparency logs, and zone transfer techniques.",
    icon: Network,
    accent: "#00ff88",
    highlights: ["50-prefix DNS permutation", "CT log discovery", "Zone transfer attempts"],
  },
  {
    title: "Port Scanning",
    description:
      "TCP port scanning with service version detection and banner grabbing. Identify open ports and running services using native Node.js APIs.",
    icon: Radio,
    accent: "#ff3355",
    highlights: ["Top 100 ports", "Service fingerprinting", "Banner grabbing"],
  },
  {
    title: "Email Harvesting",
    description:
      "Extract email addresses through MX record verification, SMTP VRFY checks, and pattern-based generation for your target domains.",
    icon: Mail,
    accent: "#44aaff",
    highlights: ["MX record lookup", "SMTP VRFY verification", "Pattern generation"],
  },
  {
    title: "WHOIS Intelligence",
    description:
      "Deep WHOIS data extraction via RDAP protocol. Track registrar details, registration timelines, and monitor domain expirations.",
    icon: FileText,
    accent: "#ffaa00",
    highlights: ["RDAP protocol lookup", "Expiry monitoring", "DNSSEC detection"],
  },
];

// ── Animation Variants ──────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

// ── Component ───────────────────────────────────────────────

export function FeaturesSection() {
  const { ref: sectionRef, isInView } = useInView(0.06);

  return (
    <section
      id="features"
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="relative bg-black px-4 py-24 sm:py-32 lg:px-8"
    >
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.015] blur-3xl" />
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
            Core Capabilities
          </span>
          <h2 className="text-gradient-void text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Reconnaissance Engine
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Eight precision-engineered scanner modules working in concert. From DNS
            records to SSL certificates, every layer of your attack surface is mapped,
            analyzed, and scored.
          </p>
        </motion.div>

        {/* ── Feature Grid ───────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {featureCards.map((feature) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className="panel glass-hover group relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm"
              >
                {/* Accent line at top */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${feature.accent}60, transparent)`,
                  }}
                  aria-hidden="true"
                />

                {/* Hover glow */}
                <div
                  className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    boxShadow: `0 0 40px -10px ${feature.accent}15, inset 0 0 40px -15px ${feature.accent}08`,
                  }}
                  aria-hidden="true"
                />

                {/* Icon */}
                <div
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] transition-colors duration-300 group-hover:border-white/[0.12]"
                >
                  <Icon
                    className="h-5 w-5 transition-colors duration-300"
                    style={{ color: `${feature.accent}80` }}
                    strokeWidth={1.5}
                  />
                </div>

                {/* Title */}
                <h3 className="text-sm font-medium leading-tight text-white">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                  {feature.description}
                </p>

                {/* Highlights */}
                <ul className="mt-auto pt-5 flex flex-col gap-1.5 border-t border-white/[0.04]">
                  {feature.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-xs text-white/40"
                    >
                      <span
                        className="h-1 w-1 shrink-0 rounded-full"
                        style={{ background: feature.accent }}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
