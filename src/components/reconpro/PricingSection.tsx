"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Zap, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const plans = [
  {
    name: "Community",
    price: "Free",
    period: "forever",
    description:
      "Full-featured open-source reconnaissance for individual researchers and small teams.",
    features: [
      "All 14 scanner modules",
      "REST API access",
      "Dashboard with 8 routes",
      "Compliance reporting",
      "Team management",
      "Monitoring policies",
      "Community support",
      "MIT license",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description:
      "For growing security teams that need priority support and advanced automation.",
    features: [
      "Everything in Community",
      "Priority support (24h SLA)",
      "Advanced scheduling",
      "Custom scan policies",
      "Export reports (PDF, CSV)",
      "API rate limits: 10K/min",
      "Team collaboration (up to 10)",
      "Email notifications",
      "Slack / Jira integration",
      "Audit logging",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "Production-grade deployment with dedicated support, SLA guarantees, and custom integrations.",
    features: [
      "Everything in Pro",
      "Priority support (4h SLA)",
      "SSO / SAML integration",
      "Compliance frameworks",
      "Custom scanner modules",
      "Dedicated infrastructure",
      "Unlimited team members",
      "API rate limits: unlimited",
      "On-premise deployment",
      "Custom training & onboarding",
      "SLA guarantee: 99.9%",
    ],
    cta: "Contact Sales",
    highlighted: true,
  },
];

export function PricingSection() {
  const { ref, isInView } = useInView(0.05);
  const [annual, setAnnual] = useState(false);

  return (
    <section
      ref={ref}
      id="pricing"
      className="relative py-24 bg-black"
      aria-label="Pricing plans"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium mb-6">
            <Zap width={12} height={12} className="text-[#00ff88]" />
            Pricing
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Simple, transparent pricing
          </h2>
          <p
            className="text-base text-white/50 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Start free, scale when ready. No hidden fees. No surprises.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span
              className={`text-sm transition-colors duration-300 ${
                !annual ? "text-white" : "text-white/40"
              }`}
              style={{ fontFamily: "var(--font-body)" }}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                annual ? "bg-[#00ff88]/30" : "bg-white/[0.1]"
              }`}
              aria-label="Toggle annual billing"
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
                  annual
                    ? "left-[22px] bg-[#00ff88]"
                    : "left-0.5 bg-white/60"
                }`}
              />
            </button>
            <span
              className={`text-sm transition-colors duration-300 ${
                annual ? "text-white" : "text-white/40"
              }`}
              style={{ fontFamily: "var(--font-body)" }}
            >
              Annual
              {annual && (
                <span className="ml-1.5 text-[10px] font-semibold bg-[#00ff88]/[0.15] text-[#00ff88] px-1.5 py-0.5 rounded-full">
                  Save 20%
                </span>
              )}
            </span>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.7,
                delay: 0.1 + i * 0.1,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              className={`relative rounded-2xl p-6 border transition-all duration-500 ${
                plan.highlighted
                  ? "bg-white/[0.03] border-[#00ff88]/[0.2] shadow-[0_0_60px_rgba(0,255,136,0.05)]"
                  : "bg-white/[0.015] border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#00ff88] text-black text-[10px] font-bold tracking-wide">
                  RECOMMENDED
                </div>
              )}

              <div className="mb-5">
                <h3
                  className="text-sm font-semibold text-white/90 mb-1"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {plan.name}
                </h3>
                <p
                  className="text-xs text-white/40 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span
                  className="text-3xl font-bold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {plan.price === "Custom"
                    ? plan.price
                    : annual && plan.name === "Pro"
                      ? "$39"
                      : plan.price}
                </span>
                {plan.period && (
                  <span
                    className="text-sm text-white/40 ml-1"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {plan.period}
                  </span>
                )}
              </div>

              <Link
                href={plan.name === "Enterprise" ? "/contact" : "/register"}
                className={`w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all duration-300 mb-6 ${
                  plan.highlighted
                    ? "bg-[#00ff88] text-black hover:bg-[#00ff88]/90"
                    : "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]"
                }`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {plan.cta}
                <ArrowRight width={14} height={14} />
              </Link>

              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <Check
                      width={14}
                      height={14}
                      className={`flex-shrink-0 mt-0.5 ${
                        plan.highlighted ? "text-[#00ff88]" : "text-white/30"
                      }`}
                    />
                    <span
                      className="text-white/60"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
