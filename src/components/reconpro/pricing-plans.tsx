'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Minus,
  Zap,
  Shield,
  Building2,
  Sparkles,
  Crown,
  Lock,
  Globe,
  Users,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  BadgeCheck,
  Clock,
  Server,
  Code2,
  MessageSquare,
  Headphones,
  Palette,
  HardDrive,
  Infinity,
  ShieldAlert,
  Radar,
  Scan,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PricingPlansProps {
  onNavigate?: (view: string) => void;
}

interface PlanFeature {
  text: string;
  included: boolean | string;
  icon?: React.ReactNode;
}

interface Plan {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  annualMonthly: number | null;
  description: string;
  features: PlanFeature[];
  cta: string;
  ctaStyle: 'outlined' | 'solid' | 'gradient' | 'outline-gradient';
  highlighted?: boolean;
  recommended?: boolean;
  icon: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plans Data
// ─────────────────────────────────────────────────────────────────────────────

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'STARTER',
    badge: 'FREE',
    badgeColor: 'text-[#e6edf3]',
    badgeBg: 'bg-white/10',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthly: 0,
    description: 'Perfect for individuals and small projects getting started with attack surface management.',
    features: [
      { text: '5 scans/month', included: true, icon: <Scan className="w-3.5 h-3.5" /> },
      { text: '3 targets', included: true, icon: <Globe className="w-3.5 h-3.5" /> },
      { text: 'Basic DNS + Port scanning', included: true, icon: <Radar className="w-3.5 h-3.5" /> },
      { text: 'Email reports', included: true, icon: <MessageSquare className="w-3.5 h-3.5" /> },
      { text: 'Community support', included: true, icon: <Headphones className="w-3.5 h-3.5" /> },
      { text: '7-day data retention', included: '7 days', icon: <Clock className="w-3.5 h-3.5" /> },
      { text: 'AI-powered remediation', included: false },
      { text: 'API access', included: false },
      { text: 'Integrations', included: false },
    ],
    cta: 'Get Started',
    ctaStyle: 'outlined',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'professional',
    name: 'PROFESSIONAL',
    badge: 'POPULAR',
    badgeColor: 'text-[#0a0d14]',
    badgeBg: 'bg-[#00ff88]',
    monthlyPrice: 299,
    annualPrice: 239,
    annualMonthly: 239,
    description: 'For growing security teams that need comprehensive scanning and AI-driven insights.',
    features: [
      { text: 'Unlimited scans', included: true, icon: <Scan className="w-3.5 h-3.5" /> },
      { text: '50 targets', included: '50', icon: <Globe className="w-3.5 h-3.5" /> },
      { text: 'All 13 scan categories', included: true, icon: <Radar className="w-3.5 h-3.5" /> },
      { text: 'AI-powered remediation', included: true, icon: <Sparkles className="w-3.5 h-3.5" /> },
      { text: 'Slack + Email alerts', included: true, icon: <MessageSquare className="w-3.5 h-3.5" /> },
      { text: '90-day data retention', included: '90 days', icon: <Clock className="w-3.5 h-3.5" /> },
      { text: 'API access', included: '10K calls', icon: <Code2 className="w-3.5 h-3.5" /> },
      { text: 'Integrations', included: true },
      { text: 'Team management', included: false },
      { text: 'SSO/SAML', included: false },
    ],
    cta: 'Start Free Trial',
    ctaStyle: 'solid',
    recommended: true,
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE',
    badge: 'ENTERPRISE',
    badgeColor: 'text-[#06b6d4]',
    badgeBg: 'bg-[#06b6d4]/15',
    monthlyPrice: 999,
    annualPrice: 799,
    annualMonthly: 799,
    description: 'Full-spectrum attack surface management for organizations with complex security needs.',
    features: [
      { text: 'Unlimited scans + targets', included: true, icon: <Scan className="w-3.5 h-3.5" /> },
      { text: 'All 13 categories + compliance', included: true, icon: <Radar className="w-3.5 h-3.5" /> },
      { text: 'SOC2/HIPAA/PCI-DSS frameworks', included: true, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
      { text: 'Team management', included: '25 members', icon: <Users className="w-3.5 h-3.5" /> },
      { text: 'SSO/SAML', included: true, icon: <Lock className="w-3.5 h-3.5" /> },
      { text: 'Slack, Jira, Splunk, PagerDuty', included: true, icon: <Server className="w-3.5 h-3.5" /> },
      { text: 'Continuous monitoring', included: true, icon: <ShieldAlert className="w-3.5 h-3.5" /> },
      { text: '1-year data retention', included: '1 year', icon: <Clock className="w-3.5 h-3.5" /> },
      { text: 'API access', included: '100K calls', icon: <Code2 className="w-3.5 h-3.5" /> },
      { text: 'Dedicated support', included: true, icon: <Headphones className="w-3.5 h-3.5" /> },
      { text: 'White-label branding', included: false },
      { text: 'On-premise deployment', included: false },
    ],
    cta: 'Contact Sales',
    ctaStyle: 'gradient',
    highlighted: true,
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    id: 'custom',
    name: 'CUSTOM',
    badge: 'WHITE LABEL',
    badgeColor: 'text-[#0a0d14]',
    badgeBg: 'bg-gradient-to-r from-[#00ff88] to-[#06b6d4]',
    monthlyPrice: null,
    annualPrice: null,
    annualMonthly: null,
    description: 'Tailored solutions for managed security providers and large-scale enterprise deployments.',
    features: [
      { text: 'Everything in Enterprise', included: true, icon: <Crown className="w-3.5 h-3.5" /> },
      { text: 'Unlimited team members', included: true, icon: <Users className="w-3.5 h-3.5" /> },
      { text: 'Custom scan categories', included: true, icon: <Scan className="w-3.5 h-3.5" /> },
      { text: 'White-label branding', included: true, icon: <Palette className="w-3.5 h-3.5" /> },
      { text: 'On-premise deployment', included: true, icon: <HardDrive className="w-3.5 h-3.5" /> },
      { text: 'Custom integrations', included: true, icon: <Code2 className="w-3.5 h-3.5" /> },
      { text: 'Unlimited API', included: true, icon: <Infinity className="w-3.5 h-3.5" /> },
      { text: 'Unlimited retention', included: true, icon: <Clock className="w-3.5 h-3.5" /> },
      { text: '24/7 dedicated CSM', included: true, icon: <Headphones className="w-3.5 h-3.5" /> },
      { text: 'SLA guarantee (99.99%)', included: true, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    ],
    cta: 'Talk to Us',
    ctaStyle: 'outline-gradient',
    icon: <Crown className="w-5 h-5" />,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Feature Comparison Data
// ─────────────────────────────────────────────────────────────────────────────

const comparisonFeatures = [
  { label: 'Scans / month', starter: '5', pro: 'Unlimited', enterprise: 'Unlimited', custom: 'Unlimited' },
  { label: 'Targets', starter: '3', pro: '50', enterprise: 'Unlimited', custom: 'Unlimited' },
  { label: 'Scan Categories', starter: '2', pro: '13', enterprise: '13 + Compliance', custom: 'Custom' },
  { label: 'Compliance Frameworks', starter: false, pro: false, enterprise: 'SOC2, HIPAA, PCI-DSS', custom: 'Custom' },
  { label: 'Team Members', starter: false, pro: false, enterprise: '25', custom: 'Unlimited' },
  { label: 'SSO / SAML', starter: false, pro: false, enterprise: true, custom: true },
  { label: 'Integrations', starter: false, pro: 'Slack + Email', enterprise: 'All (Slack, Jira, Splunk, PagerDuty)', custom: 'Custom' },
  { label: 'API Calls', starter: false, pro: '10K/mo', enterprise: '100K/mo', custom: 'Unlimited' },
  { label: 'Data Retention', starter: '7 days', pro: '90 days', enterprise: '1 year', custom: 'Unlimited' },
  { label: 'Support', starter: 'Community', pro: 'Email + Chat', enterprise: 'Dedicated', custom: '24/7 CSM' },
  { label: 'White-Label', starter: false, pro: false, enterprise: false, custom: true },
  { label: 'On-Premise', starter: false, pro: false, enterprise: false, custom: true },
  { label: 'SLA', starter: false, pro: false, enterprise: '99.9%', custom: '99.99%' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Trust logos and badges
// ─────────────────────────────────────────────────────────────────────────────

const trustLogos = [
  { name: 'Nexus Corp', initials: 'NC' },
  { name: 'Quantum Shield', initials: 'QS' },
  { name: 'CipherTech', initials: 'CT' },
  { name: 'DataFort', initials: 'DF' },
  { name: 'SentinelAI', initials: 'SA' },
  { name: 'CyberVault', initials: 'CV' },
];

const trustBadges = [
  { label: 'SOC 2 Certified', icon: <BadgeCheck className="w-4 h-4" /> },
  { label: '256-bit Encryption', icon: <Lock className="w-4 h-4" /> },
  { label: 'GDPR Compliant', icon: <ShieldCheck className="w-4 h-4" /> },
  { label: '99.99% Uptime SLA', icon: <Clock className="w-4 h-4" /> },
];

// ─────────────────────────────────────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Cell renderer for comparison table
// ─────────────────────────────────────────────────────────────────────────────

function ComparisonCell({ value }: { value: boolean | string | false }) {
  if (value === false) {
    return <Minus className="w-4 h-4 text-white/20 mx-auto" />;
  }
  if (typeof value === 'string') {
    return <span className="text-sm text-[#e6edf3]">{value}</span>;
  }
  return <Check className="w-4 h-4 text-[#00ff88] mx-auto" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Card CTA Button
// ─────────────────────────────────────────────────────────────────────────────

function CTAButton({ style, label, onClick }: { style: Plan['ctaStyle']; label: string; onClick?: () => void }) {
  switch (style) {
    case 'outlined':
      return (
        <button
          onClick={onClick}
          className="w-full py-3 px-6 rounded-xl text-sm font-semibold border border-[#00ff88]/40 text-[#00ff88]
                     hover:bg-[#00ff88]/10 hover:border-[#00ff88]/60 transition-all duration-300"
        >
          {label}
        </button>
      );
    case 'solid':
      return (
        <button
          onClick={onClick}
          className="w-full py-3 px-6 rounded-xl text-sm font-bold bg-[#00ff88] text-[#0a0d14]
                     hover:bg-[#00ff88]/90 hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] transition-all duration-300"
        >
          {label}
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      );
    case 'gradient':
      return (
        <button
          onClick={onClick}
          className="w-full py-3 px-6 rounded-xl text-sm font-bold
                     bg-gradient-to-r from-[#00ff88] to-[#06b6d4] text-[#0a0d14]
                     hover:shadow-[0_0_30px_rgba(0,255,136,0.3),0_0_30px_rgba(6,182,212,0.3)]
                     transition-all duration-300"
        >
          {label}
        </button>
      );
    case 'outline-gradient':
      return (
        <button
          onClick={onClick}
          className="w-full py-3 px-6 rounded-xl text-sm font-bold
                     border border-transparent bg-clip-padding
                     bg-gradient-to-r from-[#00ff88] to-[#06b6d4] text-transparent
                     [background-image:linear-gradient(#0a0d14,#0a0d14),linear-gradient(135deg,#00ff88,#06b6d4)]
                     [background-origin:border-box]
                     [background-clip:padding-box,border-box]
                     [border:2px_solid_transparent]
                     hover:brightness-110 transition-all duration-300"
        >
          {label}
        </button>
      );
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function PricingPlans({ onNavigate }: PricingPlansProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const handleCTA = (planId: string) => {
    if (planId === 'starter') {
      onNavigate?.('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-[#e6edf3]">
      {/* ──────────────────────── Header Section ──────────────────────── */}
      <section className="relative pt-20 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(0,255,136,0.08)_0%,transparent_70%)]" />

        <motion.div
          className="relative max-w-5xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Eyebrow */}
          <motion.div variants={itemVariants} className="mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/5 text-[#00ff88] text-xs font-medium tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Simple, transparent pricing
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] via-[#00ff88] to-[#06b6d4]">
              Choose Your Defense Strategy
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Enterprise attack surface management pricing. Start free, scale as you grow.
            <span className="text-[#00ff88]/80 font-medium"> No credit card required.</span>
          </motion.p>

          {/* Billing Toggle */}
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 mb-4">
            <span className={`text-sm font-medium transition-colors duration-300 ${!isAnnual ? 'text-[#e6edf3]' : 'text-white/40'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/40 focus:ring-offset-2 focus:ring-offset-[#0a0d14]"
              style={{ backgroundColor: isAnnual ? '#00ff88' : 'rgba(255,255,255,0.1)' }}
              aria-checked={isAnnual}
              role="switch"
            >
              <motion.div
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg"
                animate={{ left: isAnnual ? '30px' : '4px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-medium transition-colors duration-300 ${isAnnual ? 'text-[#e6edf3]' : 'text-white/40'}`}>
              Annual
            </span>
            <AnimatePresence>
              {isAnnual && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#00ff88] text-[#0a0d14] text-xs font-bold tracking-wide"
                >
                  Save 20%
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Currency note */}
          <motion.p variants={itemVariants} className="text-xs text-white/30 mb-2">
            Currency: USD ($)
          </motion.p>
        </motion.div>
      </section>

      {/* ──────────────────────── Plan Cards ──────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-5"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                variants={itemVariants}
                className={`relative group rounded-2xl p-[1px] transition-all duration-500 hover:scale-[1.02] ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-[#06b6d4]/60 via-[#06b6d4]/20 to-transparent hover:shadow-[0_0_60px_rgba(6,182,212,0.15)]'
                    : plan.recommended
                    ? 'bg-gradient-to-b from-[#00ff88]/50 via-[#00ff88]/15 to-transparent'
                    : 'bg-white/[0.06] hover:bg-white/10'
                }`}
              >
                {/* Recommended ribbon */}
                {plan.recommended && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="px-4 py-1 bg-[#00ff88] text-[#0a0d14] text-[10px] font-extrabold tracking-[0.2em] rounded-b-lg">
                      RECOMMENDED
                    </div>
                  </div>
                )}

                <div
                  className={`relative h-full rounded-2xl p-6 flex flex-col backdrop-blur-sm ${
                    plan.highlighted
                      ? 'bg-[#0d1220]/95 shadow-[0_0_40px_rgba(6,182,212,0.08)]'
                      : 'bg-[#0d1220]/80'
                  }`}
                  style={{
                    boxShadow: plan.highlighted
                      ? '0 0 40px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.05)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Header */}
                  <div className="mb-6">
                    {/* Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-[0.15em] ${plan.badgeBg} ${plan.badgeColor}`}>
                        {plan.badge}
                      </span>
                    </div>

                    {/* Plan name + icon */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${plan.badgeBg}`}>
                        {plan.icon}
                      </div>
                      <h3 className="text-lg font-bold text-[#e6edf3] tracking-wide">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1 mb-3">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={isAnnual ? 'annual' : 'monthly'}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {plan.monthlyPrice !== null ? (
                            <>
                              <span className="text-3xl sm:text-4xl font-extrabold text-white">
                                ${(isAnnual ? plan.annualPrice : plan.monthlyPrice)}
                              </span>
                              <span className="text-sm text-white/40 ml-1">/month</span>
                              {isAnnual && plan.monthlyPrice !== 0 && plan.annualPrice !== plan.monthlyPrice && (
                                <div className="mt-1">
                                  <span className="text-xs text-white/30 line-through">
                                    ${plan.monthlyPrice}/mo
                                  </span>
                                  <span className="text-xs text-[#00ff88] ml-1">
                                    billed annually
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#00ff88] to-[#06b6d4]">
                              Custom
                            </span>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-white/40 leading-relaxed">{plan.description}</p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-2.5 mb-6">
                    {plan.features.map((feature, fIndex) => (
                      <div key={fIndex} className="flex items-start gap-2.5">
                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          feature.included === false
                            ? 'bg-white/[0.03]'
                            : 'bg-[#00ff88]/10'
                        }`}>
                          {feature.included === false ? (
                            <Minus className="w-3 h-3 text-white/15" />
                          ) : (
                            <Check className="w-3 h-3 text-[#00ff88]" />
                          )}
                        </div>
                        <span className={`text-sm leading-snug ${
                          feature.included === false ? 'text-white/25' : 'text-[#e6edf3]/80'
                        }`}>
                          {feature.text}
                          {typeof feature.included === 'string' && feature.included !== 'true' && (
                            <span className="text-[#06b6d4] font-medium ml-1">({feature.included})</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="mt-auto">
                    <CTAButton style={plan.ctaStyle} label={plan.cta} onClick={() => handleCTA(plan.id)} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────── Feature Comparison Table ──────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Toggle comparison table */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] to-[#00ff88]">
                  Compare Plans in Detail
                </span>
              </h2>
              <p className="text-white/40 text-sm">Every feature, side by side. Find the perfect fit for your team.</p>
            </motion.div>

            <motion.div variants={itemVariants} className="relative rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0d1220]/60 backdrop-blur-sm">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  {/* Header Row */}
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left p-4 text-xs font-semibold text-white/40 uppercase tracking-wider w-[200px]">
                        Feature
                      </th>
                      <th className="p-4 text-center">
                        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Starter</div>
                        <div className="text-lg font-bold text-white/60 mt-1">$0</div>
                      </th>
                      <th className="p-4 text-center bg-[#00ff88]/[0.03]">
                        <div className="text-xs font-semibold text-[#00ff88] uppercase tracking-wider">Professional</div>
                        <div className="text-lg font-bold text-[#00ff88] mt-1">
                          ${isAnnual ? '239' : '299'}
                        </div>
                      </th>
                      <th className="p-4 text-center bg-[#06b6d4]/[0.03]">
                        <div className="text-xs font-semibold text-[#06b6d4] uppercase tracking-wider">Enterprise</div>
                        <div className="text-lg font-bold text-[#06b6d4] mt-1">
                          ${isAnnual ? '799' : '999'}
                        </div>
                      </th>
                      <th className="p-4 text-center bg-gradient-to-r from-[#00ff88]/[0.02] to-[#06b6d4]/[0.02]">
                        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">Custom</div>
                        <div className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00ff88] to-[#06b6d4] mt-1">
                          Custom
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feature, idx) => (
                      <motion.tr
                        key={idx}
                        className="border-b border-white/[0.03] group hover:bg-white/[0.02] transition-colors duration-200"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.03, duration: 0.3 }}
                      >
                        <td className="p-4 text-sm text-[#e6edf3]/80 font-medium group-hover:text-[#00ff88] transition-colors duration-200">
                          {feature.label}
                        </td>
                        <td className="p-4 text-center">
                          <ComparisonCell value={feature.starter} />
                        </td>
                        <td className="p-4 text-center bg-[#00ff88]/[0.015]">
                          <ComparisonCell value={feature.pro} />
                        </td>
                        <td className="p-4 text-center bg-[#06b6d4]/[0.015]">
                          <ComparisonCell value={feature.enterprise} />
                        </td>
                        <td className="p-4 text-center bg-gradient-to-r from-[#00ff88]/[0.01] to-[#06b6d4]/[0.01]">
                          <ComparisonCell value={feature.custom} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────── Trust Section ──────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={containerVariants}
          >
            {/* Company Logos */}
            <motion.div variants={itemVariants} className="text-center mb-10">
              <p className="text-sm text-white/30 uppercase tracking-widest font-medium mb-8">
                Trusted by security teams at
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 lg:gap-14">
                {trustLogos.map((logo, idx) => (
                  <motion.div
                    key={logo.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]
                               hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 cursor-default"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88]/20 to-[#06b6d4]/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#00ff88] tracking-wider">{logo.initials}</span>
                    </div>
                    <span className="text-sm font-semibold text-white/40 group-hover:text-white/60 transition-colors duration-300 hidden sm:inline">
                      {logo.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={itemVariants}>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {trustBadges.map((badge, idx) => (
                  <motion.div
                    key={badge.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]
                               hover:border-[#00ff88]/20 hover:bg-[#00ff88]/[0.03] transition-all duration-300"
                  >
                    <div className="text-[#00ff88]/70">{badge.icon}</div>
                    <span className="text-xs font-medium text-white/50">{badge.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────── Enterprise CTA ──────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/10 via-[#06b6d4]/5 to-[#0a0d14]" />
            <div className="absolute inset-0 bg-[#0d1220]/60" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_top_right,rgba(0,255,136,0.08)_0%,transparent_70%)]" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.08)_0%,transparent_70%)]" />

            {/* Border */}
            <div className="absolute inset-0 rounded-3xl border border-white/[0.06]" />
            <div className="absolute inset-0 rounded-3xl border border-[#00ff88]/[0.08]" />

            <div className="relative p-8 sm:p-12 lg:p-16 text-center">
              {/* Icon */}
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00ff88]/20 to-[#06b6d4]/20 border border-[#00ff88]/20 mb-6"
                whileHover={{ scale: 1.05, rotate: 3 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Building2 className="w-7 h-7 text-[#00ff88]" />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-white">
                Need something bigger?
              </h2>
              <p className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto mb-8 leading-relaxed">
                Our team builds custom solutions for Fortune 500 security operations. 
                <span className="text-white/60"> From bespoke integrations to dedicated on-premise deployments, we have you covered.</span>
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate?.('dashboard')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold
                             bg-gradient-to-r from-[#00ff88] to-[#06b6d4] text-[#0a0d14]
                             hover:shadow-[0_0_40px_rgba(0,255,136,0.3),0_0_40px_rgba(6,182,212,0.2)]
                             transition-shadow duration-300"
                >
                  Schedule a Demo
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold
                             border border-white/10 text-white/60 hover:border-white/20 hover:text-white/80
                             transition-all duration-300"
                >
                  <MessageSquare className="w-4 h-4" />
                  Talk to Sales
                </motion.button>
              </div>

              {/* Micro stats */}
              <div className="flex items-center justify-center gap-8 mt-10 pt-8 border-t border-white/[0.06]">
                {[
                  { value: '500+', label: 'Enterprise clients' },
                  { value: '99.99%', label: 'Uptime guarantee' },
                  { value: '< 5min', label: 'Avg response time' },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-lg font-bold text-[#00ff88]">{stat.value}</div>
                    <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
