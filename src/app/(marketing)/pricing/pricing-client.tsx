"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Check, Zap, ArrowRight, Shield, HelpCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const plans = [
  {
    name: "Free",
    price: "$0",
    annualPrice: "$0",
    period: "/mo",
    description:
      "Full-featured open-source reconnaissance for individual researchers and small teams.",
    features: [
      "All 14 scanner modules",
      "REST API access (35+ endpoints)",
      "Dashboard with 8 routes",
      "Compliance framework evaluation",
      "Team management (up to 5)",
      "Monitoring policies",
      "Community support via GitHub",
      "MIT license — self-host anytime",
    ],
    cta: "Get Started",
    ctaHref: "/docs",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    annualPrice: "$39",
    period: "/mo",
    description:
      "For growing security teams that need priority support, advanced automation, and higher limits.",
    features: [
      "Everything in Free, plus:",
      "Priority support (24h SLA)",
      "10,000 API requests/day",
      "90-day scan history retention",
      "Team collaboration (up to 10)",
      "Scheduled recurring scans",
      "Webhook notifications",
      "Export reports (JSON, HTML, Markdown)",
      "Slack / Jira integration",
      "Audit logging",
    ],
    cta: "Start Free Trial",
    ctaHref: "/docs",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    annualPrice: "Custom",
    period: "",
    description:
      "Production-grade deployment with dedicated infrastructure, compliance features, and direct engineering support.",
    features: [
      "Everything in Pro, plus:",
      "Unlimited API requests",
      "Dedicated scanning infrastructure",
      "SSO via SAML 2.0 / OIDC",
      "SOC 2 Type II compliance reporting",
      "Custom scanner module development",
      "Unlimited team members",
      "On-premise deployment option",
      "SLA guarantee: 99.9%",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    highlighted: false,
  },
];

const comparisonFeatures = [
  { feature: "Scanner modules", free: "All 14", pro: "All 14", enterprise: "All 14 + Custom" },
  { feature: "API requests/day", free: "500", pro: "10,000", enterprise: "Unlimited" },
  { feature: "Scan history retention", free: "7 days", pro: "90 days", enterprise: "Unlimited" },
  { feature: "Team members", free: "5", pro: "10", enterprise: "Unlimited" },
  { feature: "Scheduled scans", free: false, pro: true, enterprise: true },
  { feature: "Webhook notifications", free: false, pro: true, enterprise: true },
  { feature: "Audit logging", free: false, pro: true, enterprise: true },
  { feature: "SSO / SAML", free: false, pro: false, enterprise: true },
  { feature: "On-premise deployment", free: "Self-host", pro: false, enterprise: true },
  { feature: "SLA guarantee", free: "None", pro: "99.5%", enterprise: "99.9%" },
  { feature: "Support", free: "Community", pro: "24h SLA", enterprise: "4h SLA + Account Manager" },
];

const faqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. You can upgrade or downgrade at any time. When upgrading, you will be prorated for the remainder of your billing cycle. Downgrades take effect at the start of the next billing period.",
  },
  {
    q: "Is the open-source version really free forever?",
    a: "Yes. The core ReconPro platform is MIT-licensed and always free. You can self-host it, modify it, and use it commercially without any licensing fees. The paid plans add managed cloud infrastructure and support.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, American Express) and can set up invoicing for Enterprise plans. Wire transfer is available for annual Enterprise contracts.",
  },
  {
    q: "Do you offer discounts for startups or non-profits?",
    a: "Yes. We offer 50% off the Pro plan for verified non-profit organizations and qualifying early-stage startups. Contact us at security@reconpro.dev for details.",
  },
  {
    q: "What happens when I exceed my API request limit?",
    a: "You will receive an HTTP 429 response with a Retry-After header. On the Pro plan you can request a temporary limit increase. Enterprise plans have no hard limits.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

function CheckCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-[#00ff88] mx-auto" />;
  if (value === false) return <span className="text-white/20 mx-auto">—</span>;
  return <span className="text-sm text-white/60 text-center">{value}</span>;
}

export default function PricingClient() {
  const { ref: cardsRef, isInView: cardsInView } = useInView(0.05);
  const { ref: compareRef, isInView: compareInView } = useInView(0.05);
  const { ref: faqRef, isInView: faqInView } = useInView(0.05);
  const [annual, setAnnual] = useState(false);

  return (
    <div className="pt-16 bg-black">
      {/* Header */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
            className="text-center"
          >
            <SectionBadge>
              <Zap width={12} height={12} className="text-[#00ff88]" />
              Pricing
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Simple, transparent pricing
            </h1>
            <p
              className="text-base text-white/50 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Start free, scale when ready. No hidden fees. No surprises.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span
                className={`text-sm transition-colors duration-300 ${!annual ? "text-white" : "text-white/40"}`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                Monthly
              </span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${annual ? "bg-[#00ff88]/30" : "bg-white/[0.1]"}`}
                aria-label="Toggle annual billing"
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${annual ? "left-[22px] bg-[#00ff88]" : "left-0.5 bg-white/60"}`}
                />
              </button>
              <span
                className={`text-sm transition-colors duration-300 ${annual ? "text-white" : "text-white/40"}`}
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
        </div>
      </section>

      {/* Pricing Cards */}
      <section ref={cardsRef} className="relative pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial="hidden"
                animate={cardsInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i}
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
                    {annual ? plan.annualPrice : plan.price}
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
                  href={plan.ctaHref}
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
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        width={14}
                        height={14}
                        className={`flex-shrink-0 mt-0.5 ${plan.highlighted ? "text-[#00ff88]" : "text-white/30"}`}
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

          {/* Money-back badge */}
          <motion.div
            initial="hidden"
            animate={cardsInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={3}
            className="flex items-center justify-center gap-2 mt-8"
          >
            <Shield className="w-4 h-4 text-[#00ff88]" />
            <span
              className="text-sm text-white/40"
              style={{ fontFamily: "var(--font-body)" }}
            >
              30-day money-back guarantee on all paid plans
            </span>
          </motion.div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section ref={compareRef} className="relative py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={compareInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Compare</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Feature comparison
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={compareInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={1}
            className="panel overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-6 py-4 text-xs font-medium text-white/30 uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-white/30 uppercase tracking-wider text-center">
                      Free
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-[#00ff88]/70 uppercase tracking-wider text-center">
                      Pro
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-white/30 uppercase tracking-wider text-center">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-white/[0.03] ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}
                    >
                      <td
                        className="px-6 py-3.5 text-sm text-white/70"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {row.feature}
                      </td>
                      <td className="px-6 py-3.5">
                        <CheckCell value={row.free} />
                      </td>
                      <td className="px-6 py-3.5">
                        <CheckCell value={row.pro} />
                      </td>
                      <td className="px-6 py-3.5">
                        <CheckCell value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section ref={faqRef} className="relative py-20 pb-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={faqInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>
              <HelpCircle width={12} height={12} className="text-[#00ff88]" />
              FAQ
            </SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Frequently asked questions
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={faqInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={1}
            className="panel p-2 sm:p-3"
          >
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border-white/[0.04] px-2"
                >
                  <AccordionTrigger className="text-sm font-medium text-white/80 hover:text-white hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/50 leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
