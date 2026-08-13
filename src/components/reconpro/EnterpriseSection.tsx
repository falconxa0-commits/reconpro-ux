"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView as useFramerInView } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Quote,
  ShieldCheck,
  Server,
  Headphones,
  Zap,
} from "lucide-react";
import {
  pricingPlans,
  testimonials,
  roadmap,
  integrations,
} from "@/data/content";

// ── Animation Variants ──────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ── Enterprise Features ─────────────────────────────────────

const enterpriseFeatures = [
  {
    title: "Priority Support",
    description: "4-hour SLA, dedicated engineering, custom training",
    icon: Headphones,
  },
  {
    title: "Compliance",
    description: "SOC2, HIPAA, PCI-DSS, ISO 27001 framework mappings",
    icon: ShieldCheck,
  },
  {
    title: "Infrastructure",
    description: "On-premise, SaaS, or hybrid. Your choice.",
    icon: Server,
  },
];

// ── Status Badge Config ─────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  shipped: {
    label: "Shipped",
    color: "#00ff88",
    bg: "rgba(0, 255, 136, 0.12)",
  },
  "in-progress": {
    label: "In Progress",
    color: "#ffaa00",
    bg: "rgba(255, 170, 0, 0.12)",
  },
  planned: {
    label: "Planned",
    color: "rgba(255, 255, 255, 0.45)",
    bg: "rgba(255, 255, 255, 0.06)",
  },
};

// ═══════════════════════════════════════════════════════════
// EnterpriseSection Component
// ═══════════════════════════════════════════════════════════

export function EnterpriseSection() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const enterpriseRef = useRef<HTMLElement>(null);
  const pricingRef = useRef<HTMLElement>(null);
  const roadmapRef = useRef<HTMLElement>(null);

  const enterpriseInView = useFramerInView(enterpriseRef, {
    once: true,
    margin: "-80px",
  });
  const pricingInView = useFramerInView(pricingRef, {
    once: true,
    margin: "-80px",
  });
  const roadmapInView = useFramerInView(roadmapRef, {
    once: true,
    margin: "-80px",
  });

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };
  const prevTestimonial = () => {
    setActiveTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  const community = pricingPlans[0];
  const enterprise = pricingPlans[1];

  return (
    <>
      {/* ══════════════════════════════════════════════════════ */}
      {/* ENTERPRISE SECTION                                   */}
      {/* ══════════════════════════════════════════════════════ */}
      <section
        id="enterprise"
        ref={enterpriseRef}
        className="relative w-full px-4 py-32 sm:px-6 lg:px-8 overflow-hidden"
        style={{ background: "#000000" }}
      >
        {/* Subtle top-edge glow */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.03) 70%, transparent)",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div
            className="space-y-24"
            variants={containerVariants}
            initial="hidden"
            animate={enterpriseInView ? "visible" : "hidden"}
          >
            {/* ── Header ──────────────────────────────────────── */}
            <motion.div
              className="text-center mb-16"
              variants={itemVariants}
            >
              <span
                className="inline-block text-[10px] font-semibold tracking-[0.25em] uppercase mb-4 px-3 py-1 rounded-full"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Enterprise
              </span>
              <h2
                className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4"
              >
                Enterprise
              </h2>
              <p className="text-sm max-w-xl mx-auto leading-relaxed text-white/40"
              >
                Production-grade security. Enterprise-grade support.
              </p>
            </motion.div>

            {/* ── Feature Columns ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {enterpriseFeatures.map((feat) => {
                const Icon = feat.icon;
                return (
                  <motion.div
                    key={feat.title}
                    variants={itemVariants}
                    className="group relative rounded-xl p-6 transition-colors duration-300"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      backdropFilter: "blur(24px)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.06)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.03)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.06)";
                    }}
                  >
                    <div
                      className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-4"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <Icon
                        size={20}
                        strokeWidth={1.5}
                        style={{ color: "rgba(255,255,255,0.7)" }}
                      />
                    </div>
                    <h3
                      className="text-sm font-medium text-white mb-2 tracking-tight"
                    >
                      {feat.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {feat.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Integration Pills ────────────────────────────── */}
            <motion.div variants={itemVariants} className="text-center">
              <p
                className="text-xs font-medium tracking-[0.2em] uppercase mb-6"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Integrations
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {integrations.map((integration) => (
                  <span
                    key={integration.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/60 transition-all duration-300 hover:text-white/90"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    {integration.name}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* ── Testimonial Carousel ─────────────────────────── */}
            <motion.div variants={itemVariants} className="relative">
              <div
                className="relative rounded-2xl p-10 sm:p-14 overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(24px)",
                }}
              >
                <Quote
                  size={40}
                  className="absolute top-8 left-8 opacity-[0.06]"
                  style={{ color: "#ffffff" }}
                  aria-hidden="true"
                />

                <div className="relative min-h-[160px] flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTestimonial}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1] as const,
                      }}
                      className="text-center"
                    >
                      <p
                        className="text-lg sm:text-xl leading-relaxed text-white/70 mb-8 max-w-3xl mx-auto italic"
                      >
                        &ldquo;{testimonials[activeTestimonial].quote}&rdquo;
                      </p>
                      <div>
                        <p className="text-white font-semibold text-base">
                          {testimonials[activeTestimonial].author}
                        </p>
                        <p
                          className="text-sm mt-1"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          {testimonials[activeTestimonial].role},{" "}
                          {testimonials[activeTestimonial].company}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={prevTestimonial}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-200"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    aria-label="Previous testimonial"
                  >
                    <ChevronLeft
                      size={16}
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    />
                  </button>

                  {/* Dots */}
                  <div className="flex items-center gap-2">
                    {testimonials.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTestimonial(i)}
                        className="rounded-full transition-all duration-300"
                        style={{
                          width: i === activeTestimonial ? 24 : 6,
                          height: 6,
                          background:
                            i === activeTestimonial
                              ? "rgba(255,255,255,0.7)"
                              : "rgba(255,255,255,0.15)",
                        }}
                        aria-label={`Go to testimonial ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextTestimonial}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-200"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    aria-label="Next testimonial"
                  >
                    <ChevronRight
                      size={16}
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* PRICING SECTION                                      */}
      {/* ══════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        ref={pricingRef}
        className="relative w-full px-4 py-32 sm:px-6 lg:px-8 overflow-hidden"
        style={{ background: "#000000" }}
        aria-label="Pricing plans"
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.03) 70%, transparent)",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div
            className="space-y-16"
            variants={containerVariants}
            initial="hidden"
            animate={pricingInView ? "visible" : "hidden"}
          >
            <motion.div
              className="text-center mb-16"
              variants={itemVariants}
            >
              <span
                className="inline-block text-[10px] font-semibold tracking-[0.25em] uppercase mb-4 px-3 py-1 rounded-full"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Pricing
              </span>
              <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
                Simple Pricing
              </h2>
              <p className="text-sm max-w-xl mx-auto leading-relaxed text-white/40">
                Free for everyone. Enterprise when you need it.
              </p>
            </motion.div>

            {/* ── Pricing Cards ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Community Card */}
              <motion.div
                variants={itemVariants}
                className="relative rounded-2xl p-8 sm:p-10 flex flex-col"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(24px)",
                }}
              >
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {community.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span
                      className="text-4xl font-bold text-white tracking-tight"
                    >
                      {community.price}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {community.period}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {community.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-10 flex-1">
                  {community.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      />
                      <span
                        className="leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300"
                  aria-label={`${community.cta} — ${community.name} plan`}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.06)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.25)";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.15)";
                    e.currentTarget.style.color =
                      "rgba(255,255,255,0.7)";
                  }}
                >
                  {community.cta}
                </button>
              </motion.div>

              {/* Enterprise Card */}
              <motion.div
                variants={itemVariants}
                className="relative rounded-2xl p-8 sm:p-10 flex flex-col"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow:
                    "0 0 60px -12px rgba(255,255,255,0.1), 0 0 120px -24px rgba(255,255,255,0.05)",
                  backdropFilter: "blur(24px)",
                }}
              >
                {/* Popular badge */}
                <div
                  className="absolute -top-3 left-8 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                  }}
                >
                  Popular
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {enterprise.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span
                      className="text-4xl font-bold text-white tracking-tight"
                    >
                      {enterprise.price}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {enterprise.period}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {enterprise.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-10 flex-1">
                  {enterprise.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0"
                        style={{ color: "#ffffff" }}
                      />
                      <span
                        className="leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300"
                  aria-label={`${enterprise.cta} — ${enterprise.name} plan`}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #ffffff",
                    color: "#000000",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.9)";
                    e.currentTarget.style.boxShadow =
                      "0 0 24px rgba(255,255,255,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {enterprise.cta}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ROADMAP SECTION                                      */}
      {/* ══════════════════════════════════════════════════════ */}
      <section
        id="roadmap"
        ref={roadmapRef}
        className="relative w-full px-4 py-32 sm:px-6 lg:px-8 overflow-hidden"
        style={{ background: "#000000" }}
        aria-label="Product roadmap"
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.03) 70%, transparent)",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6">
          <motion.div
            className="space-y-16"
            variants={containerVariants}
            initial="hidden"
            animate={roadmapInView ? "visible" : "hidden"}
          >
            <motion.div
              className="text-center mb-16"
              variants={itemVariants}
            >
              <span
                className="inline-block text-[10px] font-semibold tracking-[0.25em] uppercase mb-4 px-3 py-1 rounded-full"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Roadmap
              </span>
              <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
                Roadmap
              </h2>
              <p className="text-sm max-w-xl mx-auto leading-relaxed text-white/40">
                What's coming next.
              </p>
            </motion.div>

            {/* ── Timeline ──────────────────────────────────────── */}
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-[19px] top-2 bottom-2 w-px"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
                }}
              />

              <div className="space-y-12">
                {roadmap.map((quarter, qi) => (
                  <motion.div
                    key={quarter.quarter}
                    variants={itemVariants}
                    className="relative pl-14"
                  >
                    {/* Timeline dot */}
                    <div
                      className="absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: "#000000",
                        border: "2px solid rgba(255,255,255,0.15)",
                        zIndex: 2,
                      }}
                    >
                      <Zap
                        size={14}
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      />
                    </div>

                    {/* Quarter label */}
                    <h3
                      className="text-sm font-medium text-white mb-4 tracking-tight"
                    >
                      {quarter.quarter}
                    </h3>

                    {/* Items */}
                    <div className="space-y-3">
                      {quarter.items.map((item) => {
                        const status = statusConfig[item.status];
                        return (
                          <div
                            key={item.title}
                            className="flex items-center justify-between gap-4 py-2.5 px-4 rounded-xl transition-colors duration-200"
                            style={{
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.04)",
                            }}
                          >
                            <span
                              className="text-sm text-white/60"
                            >
                              {item.title}
                            </span>
                            <span
                              className="shrink-0 text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full"
                              style={{
                                color: status.color,
                                background: status.bg,
                                border: `1px solid ${status.color}20`,
                              }}
                            >
                              {status.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

export default EnterpriseSection;
