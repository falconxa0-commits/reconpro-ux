import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "ReconPro terms of service — licensing, API usage terms, restrictions, and liability.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-mono tracking-widest uppercase text-[#C9A96E] mb-4">
              Legal
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-white/60 text-sm">
              Last updated: June 2025
            </p>
          </header>

          {/* Sections */}
          <div className="space-y-12 text-[15px] leading-relaxed text-white/80">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="mb-4">
                By accessing or using ReconPro (the &quot;Service&quot;), you agree to be
                bound by these Terms of Service (&quot;Terms&quot;). If you do not agree with
                any part of these Terms, you must not use the Service. These Terms
                apply to all users of the Service, including free-tier and paid
                subscribers.
              </p>
              <p>
                We reserve the right to modify these Terms at any time. Continued
                use of the Service after changes are posted constitutes acceptance
                of the revised Terms. We will notify users of material changes via
                email or a prominent notice on the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                2. License
              </h2>
              <p className="mb-4">
                The ReconPro source code is released under the{" "}
                <span className="text-[#4FADDB] font-medium">
                  MIT License
                </span>
                . You are free to use, copy, modify, merge, publish, distribute,
                sublicense, and/or sell copies of the software, subject to the
                following conditions:
              </p>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
                <p className="text-white/60 text-sm">
                  The above copyright notice and this permission notice shall be
                  included in all copies or substantial portions of the Software.
                </p>
                <p className="text-white/60 text-sm">
                  THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND,
                  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
                  NONINFRINGEMENT.
                </p>
              </div>
              <p className="mt-4">
                This license applies to the open-source codebase. The hosted
                Service, including managed infrastructure, hosted API endpoints,
                and premium features, is subject to these Terms and any applicable
                subscription agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                3. API Usage
              </h2>
              <p className="mb-4">
                The ReconPro API is provided for legitimate security
                reconnaissance and attack surface management purposes. By using
                the API, you agree to:
              </p>
              <ul className="space-y-2 list-none pl-0">
                {[
                  "Authenticate all requests with a valid API key",
                  "Respect published rate limits and backoff protocols",
                  "Use the API only for targets you are authorized to assess",
                  "Maintain the confidentiality of your API keys",
                  "Report any discovered vulnerabilities in our platform responsibly",
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
                4. Restrictions
              </h2>
              <p className="mb-4">
                You are prohibited from:
              </p>
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-6 space-y-3">
                {[
                  "Scanning, probing, or testing any target without explicit authorization from the target owner",
                  "Using the Service to conduct attacks, exploitation, or any offensive action against systems you do not own or have written permission to test",
                  "Circumventing rate limits, authentication mechanisms, or access controls",
                  "Using the Service for any purpose that violates applicable law, including computer fraud and abuse statutes",
                  "Automating access in a manner that degrades service availability for other users",
                  "Reverse engineering, decompiling, or disassembling any part of the hosted Service",
                  "Reselling access to the API or redistributing scan results without authorization",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    <span className="text-red-200/80 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                5. Liability
              </h2>
              <p className="mb-4">
                To the maximum extent permitted by applicable law, ReconPro and
                its contributors shall not be liable for any direct, indirect,
                incidental, special, consequential, or exemplary damages arising
                from your use of the Service. This includes, but is not limited to,
                damages for loss of profits, goodwill, data, or other intangible
                losses.
              </p>
              <p>
                The Service is provided for informational and defensive security
                purposes only. Users bear full responsibility for ensuring their
                use complies with all applicable laws and regulations in their
                jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                6. Termination
              </h2>
              <p className="mb-4">
                We may suspend or terminate your access to the Service at any
                time, with or without cause, including but not limited to
                violations of these Terms. Upon termination, your right to use
                the Service ceases immediately. Sections 4, 5, and 7 survive
                termination.
              </p>
              <p>
                You may terminate your account at any time by contacting us or
                deleting your account through the dashboard. Upon deletion, your
                data will be removed in accordance with our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                7. Changes to These Terms
              </h2>
              <p>
                We reserve the right to update or modify these Terms at any time.
                Material changes will be communicated via email to registered
                users and posted on this page with an updated effective date.
                Your continued use of the Service following any changes
                constitutes acceptance of the new Terms.
              </p>
            </section>
          </div>
        </div>
      </main>

    </div>
  );
}
