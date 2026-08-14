import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ReconPro",
  description:
    "ReconPro privacy policy — how we collect, use, store, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-mono tracking-widest uppercase text-[#C9A96E] mb-4">
              Legal
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-white/60 text-sm">
              Last updated: June 2025
            </p>
          </header>

          {/* Sections */}
          <div className="space-y-12 text-[15px] leading-relaxed text-white/80">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                1. Information We Collect
              </h2>
              <p className="mb-4">
                ReconPro collects the minimum information necessary to provide
                our reconnaissance and security intelligence platform. We are
                committed to data minimization and transparency.
              </p>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#C9A96E] mb-1">
                    Account Information
                  </h3>
                  <p className="text-white/60 text-sm">
                    Email address, display name, and team affiliation provided
                    during registration. We do not require real names or
                    personal identity information.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#C9A96E] mb-1">
                    API Keys
                  </h3>
                  <p className="text-white/60 text-sm">
                    Your API keys are hashed using SHA-256 before storage. We
                    never store raw API key values and cannot retrieve them after
                    creation.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#C9A96E] mb-1">
                    Scan Results &amp; Reconnaissance Data
                  </h3>
                  <p className="text-white/60 text-sm">
                    Scan outputs, DNS records, port scan results, certificate
                    data, and other reconnaissance findings associated with your
                    account. This data is scoped to targets you initiate scans
                    against.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#C9A96E] mb-1">
                    Usage Data
                  </h3>
                  <p className="text-white/60 text-sm">
                    We log API request counts, scan frequencies, and feature
                    usage patterns for rate limiting and service improvement. We
                    do not track individual page views or user behavior analytics
                    on the platform.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                2. How We Use Information
              </h2>
              <p className="mb-4">
                Your data is used exclusively for operating and improving the
                ReconPro platform. We will never sell, rent, or share your
                personal data with third parties for marketing or advertising
                purposes.
              </p>
              <ul className="space-y-2 list-none pl-0">
                {[
                  "Providing, maintaining, and improving our reconnaissance services",
                  "Authenticating users and enforcing API rate limits",
                  "Processing scan requests and returning results",
                  "Detecting and preventing abuse or unauthorized scanning activity",
                  "Communicating service updates and security advisories",
                  "Complying with legal obligations when required by law",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#4FADDB] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                3. Data Storage &amp; Retention
              </h2>
              <p className="mb-4">
                All data is stored in encrypted databases with access controls
                restricted to essential engineering personnel. Scan results are
                retained for 90 days by default, after which they are
                automatically purged. Account data is retained for the
                duration of your active subscription and deleted within 30 days
                of account termination, unless retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                4. API Key Security
              </h2>
              <p className="mb-4">
                API keys are the primary authentication mechanism for programmatic
                access to ReconPro. We implement the following security measures
                for key management:
              </p>
              <ul className="space-y-2 list-none pl-0">
                {[
                  "Keys are hashed with SHA-256 at creation — the raw value is displayed once and never stored",
                  "Rate limiting enforced on all API endpoints to prevent abuse",
                  "Automatic key rotation recommended every 90 days",
                  "Keys can be revoked immediately from the dashboard at any time",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#4FADDB] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                5. Third-Party Services
              </h2>
              <p className="mb-4">
                ReconPro integrates with external services as part of its
                reconnaissance capabilities (DNS resolvers, certificate
                transparency logs, etc.). These integrations transmit only the
                data necessary to complete the requested scan or lookup. We do
                not share your account credentials or API keys with any third
                party.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                6. Your Rights
              </h2>
              <p className="mb-4">
                You have the right to access, correct, export, and delete your
                personal data. To exercise any of these rights, contact us at
                the email address below. We will respond to all requests within
                30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                7. Contact
              </h2>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-white/60 text-sm mb-2">
                  For privacy-related inquiries or data requests:
                </p>
                <p className="text-white font-medium">
                  privacy@reconpro.dev
                </p>
              </div>
            </section>
          </div>
        </div>
    </div>
  );
}
