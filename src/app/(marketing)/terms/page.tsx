import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | ReconPro',
  description: 'ReconPro terms of service — licensing, usage terms, restrictions, and liability.',
};

const dot = 'mt-1.5 h-1.5 w-1.5 rounded-full bg-[#00ff88] shrink-0';
const redDot = 'mt-1.5 h-1.5 w-1.5 rounded-full bg-[#ff3355] shrink-0';

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
            Last updated: June 2025
          </p>
        </header>

        <div className="space-y-8 text-[15px] leading-relaxed text-white/70" style={{ fontFamily: 'var(--font-body)' }}>
          {/* 1. Acceptance */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              1. Acceptance of Terms
            </h2>
            <p className="mb-4">
              By accessing or using ReconPro (the &ldquo;Service&rdquo;), you agree to be bound
              by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree with any
              part of these Terms, you must not use the Service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and
              ReconPro, Inc. Your use of the Service also constitutes acceptance
              of our Privacy Policy and Cookie Policy, which are incorporated
              herein by reference.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              2. Description of Service
            </h2>
            <p className="mb-4">
              ReconPro is a reconnaissance and security intelligence platform
              that provides automated scanning, vulnerability assessment, and
              compliance monitoring. The Service includes:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                'DNS reconnaissance and record analysis',
                'TCP port scanning with service fingerprinting',
                'SSL/TLS certificate analysis and chain validation',
                'Vulnerability assessment and finding management',
                'Compliance reporting and monitoring policies',
                'REST API for programmatic access',
                'Web dashboard for managing scans, findings, and teams',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={dot} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 3. User Accounts */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              3. User Accounts
            </h2>
            <p className="mb-4">
              To use the Service, you must create an account. You are responsible
              for maintaining the confidentiality of your credentials. You agree to:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                'Provide accurate and complete registration information',
                'Maintain the security of your password and API keys',
                'Notify us immediately of any unauthorized access to your account',
                'Not share account credentials or API keys with third parties',
                'Accept responsibility for all activities conducted under your account',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={dot} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 4. Acceptable Use */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              4. Acceptable Use
            </h2>
            <p className="mb-4">
              You agree to use the Service only for lawful purposes in compliance
              with all applicable laws. You must:
            </p>
            <ul className="space-y-2 list-none pl-0 mb-4">
              {[
                'Authenticate all API requests with a valid API key',
                'Respect published rate limits and backoff protocols',
                'Use the Service only for targets you are authorized to assess',
                'Report any discovered vulnerabilities responsibly',
                'Comply with all applicable local, state, national, and international laws',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={dot} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="font-medium text-white/80 mb-3">You are prohibited from:</p>
            <div className="space-y-2">
              {[
                'Scanning any target without explicit authorization from the owner',
                'Using the Service to conduct attacks, exploitation, or disruption',
                'Circumventing rate limits, authentication, or access controls',
                'Using the Service for any illegal purpose or to violate rights of others',
                'Automating access in a way that degrades service availability',
                'Reselling access to the API without prior written authorization',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className={redDot} />
                  <span className="text-[#ff3355]/80 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Intellectual Property */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              5. Intellectual Property
            </h2>
            <p className="mb-4">
              The ReconPro open-source codebase is released under the{" "}
              <span className="text-[#00ff88] font-medium">MIT License</span>. You are
              free to use, copy, modify, merge, publish, distribute, sublicense, and/or
              sell copies, provided the copyright and permission notices are included.
            </p>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 mb-4">
              <p className="text-white/50 text-sm">
                THE SOFTWARE IS PROVIDED &ldquo;AS IS&rdquo;, WITHOUT WARRANTY OF ANY KIND, EXPRESS
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
              </p>
            </div>
            <p>
              The hosted Service, managed infrastructure, branding, documentation,
              and premium features remain the intellectual property of
              ReconPro, Inc. and are subject to these Terms.
            </p>
          </section>

          {/* 6. Limitation of Liability */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              6. Limitation of Liability
            </h2>
            <p className="mb-4">
              To the maximum extent permitted by applicable law, ReconPro and its
              contributors shall not be liable for any direct, indirect, incidental,
              special, consequential, or exemplary damages, including:
            </p>
            <ul className="space-y-2 list-none pl-0 mb-4">
              {[
                'Loss of profits, data, business opportunities, or goodwill',
                'Business interruption or failure to realize expected savings',
                'Loss or corruption of data or information',
                'Any unauthorized access to or alteration of your data',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={dot} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              The Service is provided for informational and defensive security
              purposes only. Users bear full responsibility for ensuring their
              use complies with all applicable laws and target authorization
              requirements.
            </p>
          </section>

          {/* 7. Termination */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              7. Termination
            </h2>
            <p className="mb-4">
              We may suspend or terminate your access at any time, with or
              without cause, including for violations of these Terms.
              Upon termination:
            </p>
            <ul className="space-y-2 list-none pl-0 mb-4">
              {[
                'Your right to access the Service ceases immediately',
                'Account data is removed per our Privacy Policy retention schedule',
                'Surviving provisions remain in effect (intellectual property, liability)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={dot} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              You may terminate your account at any time by contacting us or
              deleting it through the dashboard settings.
            </p>
          </section>

          {/* 8. Governing Law */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              8. Governing Law
            </h2>
            <p className="mb-4">
              These Terms shall be governed by and construed in accordance with
              the laws of the State of Delaware, United States, without regard to
              its conflict of law provisions.
            </p>
            <p>
              Any disputes arising under or related to these Terms shall be
              resolved in the state or federal courts located in Delaware.
              You consent to the personal jurisdiction of such courts.
            </p>
          </section>

          {/* 9. Changes to Terms */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              9. Changes to These Terms
            </h2>
            <p className="mb-4">
              We reserve the right to update or modify these Terms at any time.
              Material changes will be communicated via email to registered users
              and posted on this page with an updated effective date.
            </p>
            <p>
              Continued use of the Service after changes are posted constitutes
              acceptance of the modified Terms. We encourage you to review these
              Terms periodically.
            </p>
          </section>

          {/* 10. Contact */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              10. Contact
            </h2>
            <p className="text-white/50 text-sm mb-3">
              For questions about these Terms of Service:
            </p>
            <a
              href="mailto:legal@reconpro.dev"
              className="text-[#00ff88] font-medium text-sm"
            >
              legal@reconpro.dev
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
