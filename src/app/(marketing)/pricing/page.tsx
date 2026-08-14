import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | ReconPro",
  description:
    "ReconPro pricing plans. Open-source free tier with full scanning modules, Pro plan with API access and higher limits, and Enterprise with dedicated support.",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Full-featured open-source tool. No API limits for local use.",
    highlighted: false,
    capabilities: [
      "All 16 scanner modules",
      "DNS reconnaissance (A, AAAA, MX, TXT, NS, CNAME, SOA, SRV)",
      "SSL/TLS certificate analysis with chain validation",
      "Port scanning (top 100, top 1000, custom ranges)",
      "WHOIS lookup and RDAP queries",
      "HTTP header analysis and technology detection",
      "Subdomain enumeration via multiple resolvers",
      "Reverse DNS and ASN lookup",
      "CLI with full command suite",
      "JSON and CSV export formats",
      "Community support via GitHub Issues",
    ],
    cta: "pip install reconpro",
    ctaLabel: "Install Now",
    note: "No credit card. No account required. Open source under MIT License.",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description:
      "Cloud API access with higher rate limits and persistent scan history.",
    highlighted: true,
    capabilities: [
      "Everything in Free, plus:",
      "REST API access (47 endpoints)",
      "5,000 API requests/day",
      "Persistent scan history (90-day retention)",
      "Team collaboration (up to 5 members)",
      "Scheduled recurring scans",
      "Webhook notifications for scan completion",
      "API key authentication with SHA-256 hashing",
      "Priority processing queue",
      "Email support with 24-hour SLA",
    ],
    cta: "/contact",
    ctaLabel: "Start Pro Trial",
    note: "14-day free trial. No credit card to start.",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "Dedicated infrastructure, compliance features, and direct engineering support.",
    highlighted: false,
    capabilities: [
      "Everything in Pro, plus:",
      "Unlimited API requests",
      "Dedicated scanning infrastructure",
      "Custom rate limits and throttling policies",
      "SSO via SAML 2.0 and OIDC",
      "Audit logging with immutable records",
      "SOC 2 Type II compliance reporting",
      "HIPAA and PCI-DSS assessment support",
      "Custom scanner module development",
      "SLA-backed uptime guarantee (99.95%)",
      "Dedicated account manager",
      "Private Slack channel with engineering team",
    ],
    cta: "/enterprise",
    ctaLabel: "Contact Sales",
    note: "Volume pricing available. Non-profit and academic discounts.",
  },
];

export default function PricingPage() {
  return (
    <div className="pt-16">
      <section className="relative py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16 sm:mb-20">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
              Pricing
            </h1>
            <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              ReconPro is open source and free for local use. Pay only when you
              need managed infrastructure, cloud API access, or enterprise
              compliance features.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col ${
                  tier.highlighted
                    ? "border-white/20 bg-white/[0.04]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-white text-black px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-white mb-1">
                    {tier.name}
                  </h2>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-semibold text-white">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-sm text-white/40">{tier.period}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {tier.capabilities.map((cap) => (
                    <li
                      key={cap}
                      className="flex items-start gap-3 text-sm text-white/60"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white/30 mt-0.5 flex-shrink-0"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {cap}
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.cta}
                  className={`block text-center text-sm font-medium py-3 rounded-xl transition-all duration-300 ${
                    tier.highlighted
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]"
                  }`}
                >
                  {tier.ctaLabel}
                </a>
                <p className="text-[11px] text-white/30 text-center mt-3">
                  {tier.note}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom note */}
          <div className="mt-16 text-center">
            <p className="text-xs text-white/30 max-w-lg mx-auto leading-relaxed">
              All plans include access to the complete open-source codebase on
              GitHub. The Pro and Enterprise plans add managed cloud
              infrastructure and support. You are never locked in.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
