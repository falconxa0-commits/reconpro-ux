import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security | ReconPro",
  description:
    "Security measures implemented in ReconPro: CSP headers, HSTS, SSRF protection, rate limiting, API key authentication with SHA-256 hashing, and input validation.",
};

const measures = [
  {
    category: "HTTP Security Headers",
    items: [
      {
        name: "Content Security Policy (CSP)",
        detail:
          "Strict CSP headers restrict resource loading to trusted origins. Inline scripts are disallowed. The policy uses nonce-based overrides only where explicitly needed for framework operation.",
      },
      {
        name: "HTTP Strict Transport Security (HSTS)",
        detail:
          "All API endpoints return Strict-Transport-Security headers with a minimum 1-year max-age and includeSubDomains. This prevents protocol downgrade attacks.",
      },
      {
        name: "X-Content-Type-Options",
        detail:
          "Set to 'nosniff' on all responses to prevent MIME type sniffing by browsers.",
      },
      {
        name: "X-Frame-Options",
        detail:
          "Set to 'DENY' to prevent the dashboard from being embedded in iframes, mitigating clickjacking attacks.",
      },
    ],
  },
  {
    category: "API Security",
    items: [
      {
        name: "API Key Authentication",
        detail:
          "All API endpoints require authentication via the x-api-key header. Keys are stored as SHA-256 hashes in the database. Plaintext keys are never persisted and are only shown once at creation time.",
      },
      {
        name: "Rate Limiting",
        detail:
          "Per-key rate limiting is enforced on all endpoints. Default limits are configurable per plan tier. Rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset) are included in responses.",
      },
      {
        name: "SSRF Protection",
        detail:
          "Target URLs passed to scanning endpoints are validated against private IP ranges (RFC 1918), link-local addresses, and loopback interfaces. Scanning requests cannot be directed at internal infrastructure.",
      },
      {
        name: "Input Validation",
        detail:
          "All user inputs are validated and sanitized before processing. Domain names, IP addresses, and port ranges are checked against strict patterns. SQL injection is prevented through parameterized queries via Prisma ORM.",
      },
    ],
  },
  {
    category: "Infrastructure Security",
    items: [
      {
        name: "Dependency Management",
        detail:
          "Production dependencies are audited regularly with automated vulnerability scanning. The core scanning engine intentionally minimizes external dependencies to reduce the attack surface.",
      },
      {
        name: "Database Security",
        detail:
          "Prisma ORM is used exclusively for all database operations, preventing raw SQL injection. Database files are stored with restricted file permissions.",
      },
      {
        name: "Error Handling",
        detail:
          "Error messages returned to clients are generic and do not expose internal stack traces, file paths, or database schema details. Detailed errors are logged server-side only.",
      },
      {
        name: "CORS Configuration",
        detail:
          "Cross-Origin Resource Sharing is configured to allow only specific trusted origins. The Access-Control-Allow-Origin header is not set to wildcard in production.",
      },
    ],
  },
];

export default function SecurityPage() {
  return (
    <div className="pt-16">
      <section className="relative py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
              Security
            </h1>
            <p className="text-white/50 text-sm sm:text-base max-w-2xl leading-relaxed">
              A detailed description of the security measures implemented in
              ReconPro. This page documents what actually exists in the codebase,
              not aspirational features.
            </p>
          </div>

          {/* Security Measures */}
          <div className="space-y-12">
            {measures.map((group) => (
              <article key={group.category}>
                <h2 className="text-lg font-semibold text-white mb-6">
                  {group.category}
                </h2>
                <div className="space-y-4">
                  {group.items.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
                    >
                      <h3 className="text-sm font-medium text-white/80 mb-2">
                        {item.name}
                      </h3>
                      <p className="text-xs text-white/40 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* Responsible Disclosure */}
          <div className="mt-16 pt-12 border-t border-white/[0.04]">
            <h2 className="text-lg font-semibold text-white mb-4">
              Responsible Disclosure
            </h2>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              If you discover a security vulnerability in ReconPro, please report
              it responsibly by emailing security@reconpro.dev. We will
              acknowledge receipt within 48 hours and provide a timeline for
              remediation.
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              Please do not publicly disclose vulnerabilities before giving us
              an opportunity to address them. We believe in coordinated
              disclosure and will credit researchers who follow this process.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
