import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | ReconPro",
  description:
    "ReconPro cookie policy — what cookies we use, why, and how to manage them.",
};

export default function CookiePolicyPage() {
  return (
    <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-mono tracking-widest uppercase text-[#C9A96E] mb-4">
              Legal
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Cookie Policy
            </h1>
            <p className="text-white/60 text-sm">
              Last updated: June 2025
            </p>
          </header>

          {/* Sections */}
          <div className="space-y-12 text-[15px] leading-relaxed text-white/80">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                1. What Are Cookies?
              </h2>
              <p className="mb-4">
                Cookies are small pieces of data stored on your device by your
                web browser. They are widely used to make websites work more
                efficiently and to provide information to site operators. Cookies
                can be &quot;persistent&quot; (stored until they expire or you delete them)
                or &quot;session&quot; (deleted when you close your browser).
              </p>
              <p>
                Cookies serve various purposes: remembering your preferences,
                enabling core functionality, and helping operators understand how
                their site is being used. Different types of cookies are
                categorized by their purpose and origin.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                2. Cookies We Use
              </h2>
              <p className="mb-6">
                We believe in being straightforward about our data practices.
                Currently, ReconPro uses a minimal set of cookies — only what is
                strictly necessary for the platform to function.
              </p>

              {/* Cookie table */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-6 py-4 text-[#C9A96E] font-semibold">
                        Cookie
                      </th>
                      <th className="text-left px-6 py-4 text-[#C9A96E] font-semibold">
                        Type
                      </th>
                      <th className="text-left px-6 py-4 text-[#C9A96E] font-semibold hidden md:table-cell">
                        Duration
                      </th>
                      <th className="text-left px-6 py-4 text-[#C9A96E] font-semibold">
                        Purpose
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="px-6 py-4 font-mono text-xs text-[#4FADDB]">
                        reconpro_session
                      </td>
                      <td className="px-6 py-4 text-white/60">Essential</td>
                      <td className="px-6 py-4 text-white/60 hidden md:table-cell">
                        Session
                      </td>
                      <td className="px-6 py-4 text-white/60">
                        Maintains your authenticated session. Required for
                        accessing protected features and API dashboard.
                      </td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-6 py-4 font-mono text-xs text-[#4FADDB]">
                        csrf_token
                      </td>
                      <td className="px-6 py-4 text-white/60">Essential</td>
                      <td className="px-6 py-4 text-white/60 hidden md:table-cell">
                        Session
                      </td>
                      <td className="px-6 py-4 text-white/60">
                        Prevents cross-site request forgery attacks on form
                        submissions and API calls.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Honest disclaimer */}
              <div className="mt-6 rounded-xl border border-[#4FADDB]/20 bg-[#4FADDB]/[0.03] p-6">
                <p className="text-sm text-[#4FADDB]/80">
                  <span className="font-semibold">Honest note:</span> We do not
                  currently use any analytics cookies, advertising cookies, or
                  third-party tracking pixels. We have deliberately chosen not to
                  integrate Google Analytics, Mixpanel, Hotjar, or similar
                  tracking services. If this changes in the future, we will
                  update this policy and seek your consent before activating any
                  non-essential cookies.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">
                3. Managing Cookies
              </h2>
              <p className="mb-4">
                Since we only use essential cookies, blocking them will prevent
                ReconPro from functioning properly — you will not be able to log
                in or use protected features. However, you retain full control
                over your browser settings:
              </p>
              <ul className="space-y-2 list-none pl-0">
                {[
                  "Most browsers allow you to refuse or delete cookies through their settings",
                  "You can configure your browser to alert you when a cookie is being set",
                  "Private browsing or incognito modes typically do not persist cookies after the session ends",
                  "Browser extensions such as uBlock Origin or Privacy Badger can provide additional cookie management",
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
                4. Changes to This Policy
              </h2>
              <p className="mb-4">
                We may update this Cookie Policy from time to time to reflect
                changes in our practices or for other operational, legal, or
                regulatory reasons. Any changes will be posted on this page
                with an updated effective date.
              </p>
              <p>
                If we introduce any non-essential cookies, we will update this
                page and provide clear notice before doing so. We encourage you
                to review this policy periodically to stay informed about how we
                use cookies.
              </p>
            </section>
          </div>
        </div>
    </div>
  );
}
