import type { Metadata } from "next";
import {
  Shield,
  Lock,
  FileCheck,
  Bug,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Trust Center | ReconPro",
  description:
    "ReconPro trust center — security infrastructure, data protection, compliance, and responsible disclosure.",
};

const securityMeasures = [
  {
    icon: Lock,
    title: "TLS Encryption in Transit",
    description:
      "All data transmitted to and from ReconPro is encrypted using TLS 1.2+ with strong cipher suites. Our API endpoints enforce HTTPS exclusively. HTTP connections are automatically redirected and not served.",
    status: "Active",
  },
  {
    icon: Shield,
    title: "API Key Hashing (SHA-256)",
    description:
      "API keys are never stored in plaintext. Upon creation, keys are hashed using SHA-256 before being persisted to the database. Only the hashed value is stored; the original key is shown to the user once and cannot be recovered.",
    status: "Active",
  },
  {
    icon: Shield,
    title: "SSRF Protection",
    description:
      "Server-Side Request Forgery (SSRF) protections are implemented on all scan endpoints. Internal network ranges, link-local addresses, and cloud metadata endpoints are blocked at the network layer to prevent abuse of our scanning infrastructure.",
    status: "Active",
  },
  {
    icon: Lock,
    title: "Rate Limiting",
    description:
      "All API endpoints enforce per-key rate limits to prevent abuse and ensure fair resource allocation. Rate limit headers are included in responses. Exceeding limits returns HTTP 429 with a Retry-After header.",
    status: "Active",
  },
  {
    icon: Shield,
    title: "Input Validation & Sanitization",
    description:
      "All user inputs — including target URLs, domains, and scan parameters — are validated and sanitized before processing. Hostname patterns are enforced to prevent injection attacks and ensure scans target valid, external addresses.",
    status: "Active",
  },
  {
    icon: Lock,
    title: "Content Security Policy (CSP)",
    description:
      "Strict CSP headers are deployed to mitigate cross-site scripting (XSS) and injection attacks. Script sources are restricted, and inline script execution is controlled.",
    status: "Active",
  },
  {
    icon: Lock,
    title: "HTTP Strict Transport Security (HSTS)",
    description:
      "HSTS is enabled with a max-age directive to enforce HTTPS connections. Modern browsers are instructed to refuse all HTTP connections to ReconPro endpoints for the duration of the HSTS policy.",
    status: "Active",
  },
];

export default function TrustCenterPage() {
  return (
    <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-mono tracking-widest uppercase text-[#C9A96E] mb-4">
              Security
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Trust Center
            </h1>
            <p className="text-white/60 max-w-xl">
              Transparency about our security infrastructure, data protection
              practices, and how we keep ReconPro safe for everyone.
            </p>
          </header>

          <div className="space-y-16 text-[15px] leading-relaxed text-white/80">
            {/* Security Infrastructure */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-2">
                Security Infrastructure
              </h2>
              <p className="text-white/60 mb-6 text-sm">
                The following security controls are currently implemented in
                production. We believe in being honest about what we have and
                what we are still working on.
              </p>
              <div className="space-y-4">
                {securityMeasures.map((measure) => (
                  <div
                    key={measure.title}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <measure.icon className="h-5 w-5 text-[#4FADDB] shrink-0" />
                        <h3 className="text-sm font-semibold text-white">
                          {measure.title}
                        </h3>
                      </div>
                      <span className="shrink-0 text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {measure.status}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm pl-8">
                      {measure.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Protection */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-2">
                Data Protection
              </h2>
              <p className="text-white/60 mb-4 text-sm">
                How we handle and protect your data throughout its lifecycle.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-sm font-semibold text-[#C9A96E] mb-2">
                    Data at Rest
                  </h3>
                  <p className="text-white/60 text-sm">
                    Scan results and account data are stored in SQLite databases
                    with file-system level encryption on supported platforms. We
                    are actively working toward column-level encryption for
                    sensitive fields.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-sm font-semibold text-[#C9A96E] mb-2">
                    Data in Transit
                  </h3>
                  <p className="text-white/60 text-sm">
                    All API communication is encrypted with TLS 1.2+. Internal
                    service communication uses the same encryption standards.
                    Plain HTTP is not served on any endpoint.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-sm font-semibold text-[#C9A96E] mb-2">
                    Data Retention
                  </h3>
                  <p className="text-white/60 text-sm">
                    Scan results are retained for 90 days by default. Users can
                    manually purge data at any time. Deleted data is removed
                    from our systems within 24 hours.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-sm font-semibold text-[#C9A96E] mb-2">
                    Access Controls
                  </h3>
                  <p className="text-white/60 text-sm">
                    Database and infrastructure access is restricted to essential
                    personnel. All access is logged. We follow the principle of
                    least privilege for all systems.
                  </p>
                </div>
              </div>
            </section>

            {/* Compliance */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-2">
                Compliance
              </h2>
              <p className="text-white/60 mb-4 text-sm">
                Our current compliance posture and certifications.
              </p>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        SOC 2 Type II
                      </h3>
                      <p className="text-white/60 text-sm">
                        Not yet certified. Planned for 2026.
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Planned
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        GDPR
                      </h3>
                      <p className="text-white/60 text-sm">
                        We respect GDPR principles and honor data subject
                        requests. Full formal compliance is ongoing.
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#4FADDB]/10 text-[#4FADDB] border border-[#4FADDB]/20">
                      In Progress
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Responsible Disclosure */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-2">
                Responsible Disclosure
              </h2>
              <p className="text-white/60 mb-6 text-sm">
                If you discover a security vulnerability in ReconPro, we
                encourage you to report it responsibly.
              </p>
              <div className="rounded-xl border border-[#C9A96E]/20 bg-[#C9A96E]/[0.03] p-6">
                <div className="flex items-start gap-4">
                  <Bug className="h-5 w-5 text-[#C9A96E] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">
                      Reporting a Vulnerability
                    </h3>
                    <p className="text-white/60 text-sm mb-3">
                      Send reports to{" "}
                      <span className="text-[#C9A96E] font-medium">
                        security@reconpro.dev
                      </span>
                      . We ask that you:
                    </p>
                    <ul className="space-y-1.5 text-white/60 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#C9A96E] shrink-0" />
                        Provide sufficient detail to reproduce the issue
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#C9A96E] shrink-0" />
                        Avoid exploiting the vulnerability or accessing user data
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#C9A96E] shrink-0" />
                        Allow us reasonable time to respond and fix the issue
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#C9A96E] shrink-0" />
                        Do not disclose the issue publicly until it is resolved
                      </li>
                    </ul>
                    <p className="text-white/60 text-sm mt-3">
                      We acknowledge all reports within 48 hours and aim to resolve
                      critical issues within 72 hours. We recognize researchers in
                      our Hall of Fame who report qualifying vulnerabilities.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
    </div>
  );
}
