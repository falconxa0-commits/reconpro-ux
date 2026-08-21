"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const faqItems = [
  {
    question: "What is ReconPro?",
    answer:
      "ReconPro is an enterprise attack surface intelligence platform that automates security reconnaissance. It provides 14+ scanner modules for DNS, SSL/TLS, port scanning, HTTP analysis, vulnerability detection, and more — all accessible via a web dashboard and REST API.",
  },
  {
    question: "How does the free Community plan work?",
    answer:
      "The Community plan is free forever and includes all 14 scanner modules, full REST API access, the dashboard with 8 dedicated routes, compliance reporting, and team management. It's fully open source under the MIT license.",
  },
  {
    question: "What scan types are supported?",
    answer:
      "ReconPro supports DNS reconnaissance, SSL/TLS analysis, TCP port scanning, HTTP header inspection, vulnerability scanning, WHOIS lookup, subdomain discovery, directory enumeration, email intelligence, certificate analysis, geolocation mapping, process analysis, network interface scanning, file system auditing, log analysis, and system registry inspection.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. ReconPro uses SHA-256 hashed API keys, per-endpoint rate limiting, SSRF protection, strict CSP/HSTS headers, and input validation across all routes. Enterprise plans add SSO/SAML, dedicated infrastructure, and audit logging.",
  },
  {
    question: "Can I self-host ReconPro?",
    answer:
      "Yes. The Community edition is fully open source and can be self-hosted. Enterprise plans also offer on-premise deployment with dedicated infrastructure, custom configurations, and professional support.",
  },
  {
    question: "What compliance frameworks are supported?",
    answer:
      "ReconPro provides automated compliance assessment across 6 frameworks: SOC 2, HIPAA, PCI-DSS, ISO 27001, NIST CSF, and GDPR. Each control is evaluated with pass/fail results linked to scan evidence.",
  },
  {
    question: "How does the API rate limiting work?",
    answer:
      "The Community plan includes standard rate limits. Pro plans offer 10K requests per minute. Enterprise plans have unlimited API access. Rate limiting is per-endpoint with retry-after headers.",
  },
  {
    question: "Do you offer a free trial for paid plans?",
    answer:
      "Yes. The Pro plan includes a 14-day free trial with full access to all Pro features. No credit card required to start.",
  },
];

export function FAQSection() {
  const { ref, isInView } = useInView(0.05);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      ref={ref}
      id="faq"
      className="relative py-24 bg-black"
      aria-label="Frequently asked questions"
    >
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium mb-6">
            <HelpCircle width={12} height={12} className="text-[#00ff88]" />
            FAQ
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Frequently asked questions
          </h2>
          <p
            className="text-base text-white/50 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Everything you need to know about ReconPro.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-2">
          {faqItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.05 * i,
                  ease: [0.16, 1, 0.3, 1] as const,
                }}
              >
                <button
                  onClick={() => toggle(i)}
                  className={`w-full flex items-center justify-between text-left px-5 py-4 rounded-xl border transition-all duration-300 ${
                    isOpen
                      ? "bg-white/[0.03] border-[#00ff88]/[0.15]"
                      : "bg-white/[0.01] border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]"
                  }`}
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-sm font-medium pr-4 transition-colors duration-300 ${
                      isOpen ? "text-white" : "text-white/70"
                    }`}
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {item.question}
                  </span>
                  <ChevronDown
                    width={16}
                    height={16}
                    className={`flex-shrink-0 transition-all duration-300 ${
                      isOpen
                        ? "rotate-180 text-[#00ff88]"
                        : "text-white/30"
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1] as const,
                      }}
                      className="overflow-hidden"
                    >
                      <p
                        className="px-5 pb-4 pt-1 text-sm text-white/50 leading-relaxed"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
