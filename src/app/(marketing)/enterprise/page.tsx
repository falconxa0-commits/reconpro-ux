import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enterprise | ReconPro",
  description:
    "ReconPro enterprise features: team management, audit logging, compliance frameworks, and dedicated infrastructure support.",
};

const existing = [
  {
    name: "Team Management",
    description:
      "Multi-user support with role-based access control. Teams can have up to 5 members on the Pro plan or unlimited on Enterprise. Roles include Admin, Editor, and Viewer.",
    status: "available",
  },
  {
    name: "Audit Logging",
    description:
      "Immutable audit logs record all API requests, scan operations, and configuration changes. Logs include timestamp, user identity, action performed, and target scope.",
    status: "available",
  },
  {
    name: "API Key Management",
    description:
      "Organizations can create and manage multiple API keys with individual rate limits and expiration dates. Keys are hashed with SHA-256 before storage.",
    status: "available",
  },
  {
    name: "Scheduled Scans",
    description:
      "Recurring scan jobs can be configured on daily, weekly, or custom intervals. Results are stored and can be compared across scan periods.",
    status: "available",
  },
  {
    name: "Webhook Notifications",
    description:
      "Scan completion and alert events can be forwarded to external webhooks for integration with SIEM platforms, Slack, PagerDuty, or custom tooling.",
    status: "available",
  },
];

const inProgress = [
  {
    name: "SOC 2 Type II Compliance",
    description:
      "SOC 2 Type II audit is planned. The security controls documented in the Security page form the foundation, but a formal audit has not been completed.",
    status: "planned",
  },
  {
    name: "HIPAA Support",
    description:
      "BAA (Business Associate Agreement) templates and HIPAA-compliant data handling procedures are being developed. Not yet available for healthcare environments.",
    status: "planned",
  },
  {
    name: "PCI-DSS Assessment",
    description:
      "PCI-DSS scanning capabilities exist in the port scanning and SSL modules, but a formal PCI-DSS compliance assessment report has not been implemented.",
    status: "planned",
  },
  {
    name: "SSO / SAML 2.0 Integration",
    description:
      "SAML 2.0 and OpenID Connect single sign-on integration is in development. Currently, authentication is limited to email/password and API keys.",
    status: "in-progress",
  },
  {
    name: "Dedicated Infrastructure",
    description:
      "Isolated scanning infrastructure with dedicated IPs and custom rate limits is available for Enterprise customers but requires manual provisioning.",
    status: "available",
  },
];

export default function EnterprisePage() {
  return (
    <div className="pt-16">
      <section className="relative py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
              Enterprise
            </h1>
            <p className="text-white/50 text-sm sm:text-base max-w-2xl leading-relaxed">
              Enterprise features for security teams that need collaboration,
              compliance, and dedicated infrastructure. This page is transparent
              about what exists today and what is still being built.
            </p>
          </div>

          {/* Available Features */}
          <article className="mb-16">
            <h2 className="text-lg font-semibold text-white mb-2">
              Available Now
            </h2>
            <p className="text-xs text-white/40 mb-6">
              These features are fully implemented and available in the current
              release.
            </p>
            <div className="space-y-4">
              {existing.map((feature) => (
                <div
                  key={feature.name}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-sm font-medium text-white/80">
                      {feature.name}
                    </h3>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/80 bg-emerald-400/10 px-2 py-0.5 rounded-md flex-shrink-0">
                      Available
                    </span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          {/* Planned Features */}
          <article className="mb-16">
            <h2 className="text-lg font-semibold text-white mb-2">
              In Progress / Planned
            </h2>
            <p className="text-xs text-white/40 mb-6">
              These features are under development or planned for upcoming
              releases. No firm timelines are provided because we prefer to ship
              when ready rather than miss deadlines.
            </p>
            <div className="space-y-4">
              {inProgress.map((feature) => (
                <div
                  key={feature.name}
                  className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-sm font-medium text-white/60">
                      {feature.name}
                    </h3>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md flex-shrink-0 ${
                        feature.status === "in-progress"
                          ? "text-amber-400/80 bg-amber-400/10"
                          : "text-white/30 bg-white/[0.04]"
                      }`}
                    >
                      {feature.status === "in-progress"
                        ? "In Progress"
                        : "Planned"}
                    </span>
                  </div>
                  <p className="text-xs text-white/30 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          {/* Contact */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-2">
              Get in Touch
            </h2>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              For enterprise pricing, dedicated infrastructure, or compliance
              requirements, contact us directly.
            </p>
            <a
              href="mailto:security@reconpro.dev"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors duration-300"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/40"
                aria-hidden="true"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              security@reconpro.dev
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
