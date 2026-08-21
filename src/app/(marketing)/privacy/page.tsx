import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | ReconPro',
  description: 'ReconPro privacy policy — how we collect, use, store, and protect your data.',
};

const dot = 'mt-1.5 h-1.5 w-1.5 rounded-full bg-[#00ff88] shrink-0';

const dataWeCollect = [
  {
    category: 'Account Information',
    data: 'Email address, display name, organization name, and team role',
    purpose: 'Identity, authentication, and team management',
    legalBasis: 'Contract performance',
  },
  {
    category: 'API Keys',
    data: 'Hashed API key identifiers (SHA-256)',
    purpose: 'Programmatic API authentication and rate limiting',
    legalBasis: 'Contract performance',
  },
  {
    category: 'Scan Results',
    data: 'DNS records, port data, SSL certificates, vulnerability findings',
    purpose: 'Delivering reconnaissance results to your account',
    legalBasis: 'Contract performance',
  },
  {
    category: 'Usage Logs',
    data: 'API request counts, scan frequencies, feature usage patterns',
    purpose: 'Rate limiting, service improvement, and abuse detection',
    legalBasis: 'Legitimate interest',
  },
  {
    category: 'Support Communications',
    data: 'Email correspondence and support ticket contents',
    purpose: 'Resolving user inquiries and providing technical support',
    legalBasis: 'Contract performance',
  },
];

const yourRights = [
  {
    right: 'Access',
    description: 'Request a complete copy of all personal data we hold about you',
  },
  {
    right: 'Correction',
    description: 'Update or correct any inaccurate or incomplete personal data',
  },
  {
    right: 'Deletion',
    description: 'Request permanent deletion of your account and all associated data',
  },
  {
    right: 'Portability',
    description: 'Receive your data in a structured, machine-readable format (JSON or CSV)',
  },
  {
    right: 'Objection',
    description: 'Object to processing of your data for specific purposes, including marketing',
  },
  {
    right: 'Restriction',
    description: 'Request restriction of processing in certain circumstances',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="pt-16 bg-black">
      <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
        {/* Header */}
        <header className="mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
            Legal
          </span>
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mt-6 mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
            Last updated: June 2025
          </p>
        </header>

        <div className="space-y-12 text-[15px] leading-relaxed text-white/70" style={{ fontFamily: 'var(--font-body)' }}>
          {/* 1. Introduction */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              1. Introduction
            </h2>
            <p className="mb-4">
              ReconPro, Inc. (&ldquo;ReconPro,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting your
              privacy. This Privacy Policy explains what personal data we collect,
              how we use it, who we share it with, and what rights you have over
              it.
            </p>
            <p>
              By using the ReconPro platform, you agree to the data practices
              described in this policy. If you do not agree, please discontinue
              use of the Service and contact us to request data deletion.
            </p>
          </section>

          {/* 2. Data We Collect */}
          <section className="panel overflow-hidden">
            <div className="p-6 sm:p-8 pb-0">
              <h2 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                2. Data We Collect
              </h2>
              <p className="text-sm text-white/50 mb-6">
                We collect the minimum data necessary to provide our reconnaissance and
                security intelligence platform. We do not require real names or
                personal identity documents.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider">Category</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider">Data Collected</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider hidden md:table-cell">Purpose</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider hidden lg:table-cell">Legal Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {dataWeCollect.map((row, i) => (
                    <tr key={row.category} className={`border-b border-white/[0.03] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                      <td className="px-6 py-4 font-medium text-white/80 whitespace-nowrap">{row.category}</td>
                      <td className="px-6 py-4 text-white/50">{row.data}</td>
                      <td className="px-6 py-4 text-white/50 hidden md:table-cell">{row.purpose}</td>
                      <td className="px-6 py-4 text-white/40 hidden lg:table-cell">{row.legalBasis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. How We Use Data */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              3. How We Use Your Data
            </h2>
            <p className="mb-4">
              Your data is used exclusively for operating and improving the ReconPro
              platform. We will never sell, rent, or share your personal data
              with third parties for marketing purposes.
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                'Providing, maintaining, and improving our reconnaissance services',
                'Authenticating users and enforcing API rate limits',
                'Processing scan requests and delivering results',
                'Detecting and preventing abuse, fraud, or unauthorized scanning activity',
                'Communicating service updates, security advisories, and support responses',
                'Complying with legal obligations when required by applicable law',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={dot} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 4. Data Sharing */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              4. Data Sharing
            </h2>
            <p className="mb-4">
              ReconPro integrates with external services as part of its
              reconnaissance capabilities (DNS resolvers, certificate transparency
              logs, etc.). These integrations transmit only the data necessary to
              complete the requested scan or lookup.
            </p>
            <p className="mb-4">
              We do not share your account credentials, API keys, or personal
              data with any third party. We will disclose data only when:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                'Required by applicable law, regulation, or legal process',
                'Necessary to protect the security of our platform and users',
                'You have given explicit prior consent for a specific purpose',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={dot} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 5. Data Storage & Security */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              5. Data Storage & Security
            </h2>
            <p className="mb-4">
              All data is stored in encrypted databases with access controls
              restricted to essential engineering personnel. Our infrastructure
              enforces TLS 1.2+ for all data in transit, API keys are hashed with
              SHA-256 before storage, and we maintain strict security headers
              (CSP, HSTS, COOP, COEP, CORP) across all services.
            </p>
            <p>
              We conduct regular dependency vulnerability scans and code reviews.
              No plain-text secrets are stored. Access to production systems
              requires multi-factor authentication and is logged and audited.
            </p>
          </section>

          {/* 6. Your Rights */}
          <section className="panel overflow-hidden">
            <div className="p-6 sm:p-8 pb-0">
              <h2 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                6. Your Rights
              </h2>
              <p className="text-sm text-white/50 mb-6">
                Depending on your jurisdiction (particularly under GDPR), you have
                the following rights regarding your personal data. To exercise any
                right, contact us at the address below. We respond within 30 days.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider w-32">Right</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {yourRights.map((row, i) => (
                    <tr key={row.right} className={`border-b border-white/[0.03] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                      <td className="px-6 py-3.5 font-medium text-[#00ff88]/80 whitespace-nowrap">{row.right}</td>
                      <td className="px-6 py-3.5 text-white/50">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. Data Retention */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              7. Data Retention
            </h2>
            <p className="mb-4">
              Scan results are retained for 90 days by default, after which they
              are automatically purged from our systems. Account data is retained
              for the duration of your active subscription.
            </p>
            <p>
              Upon account termination, all personal data and scan results are
              deleted within 30 days, unless retention is required by applicable
              law or for legitimate security purposes (e.g., investigating abuse).
            </p>
          </section>

          {/* 8. Children's Privacy */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              8. Children&rsquo;s Privacy
            </h2>
            <p>
              ReconPro is not directed at individuals under the age of 16. We do
              not knowingly collect personal data from children. If we become
              aware that we have collected data from a child under 16, we will
              take immediate steps to delete that information. If you believe a
              child has provided us with personal data, please contact us.
            </p>
          </section>

          {/* 9. Changes to Policy */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              9. Changes to This Policy
            </h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. Material changes
              will be communicated via email to registered users and posted on
              this page with an updated effective date.
            </p>
            <p>
              We encourage you to review this policy periodically. Continued use
              of the Service after changes are posted constitutes acceptance of
              the updated policy.
            </p>
          </section>

          {/* 10. Contact Us */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              10. Contact Us
            </h2>
            <p className="text-white/50 text-sm mb-3">
              For privacy-related inquiries, data access requests, or to exercise
              any of your rights:
            </p>
            <a
              href="mailto:privacy@reconpro.dev"
              className="text-[#00ff88] font-medium text-sm"
            >
              privacy@reconpro.dev
            </a>
            <p className="text-white/40 text-xs mt-3">
              We acknowledge all privacy requests within 5 business days and
              aim to fulfill them within 30 calendar days.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
