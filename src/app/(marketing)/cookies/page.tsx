import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | ReconPro',
  description: 'ReconPro cookie policy — what cookies we use, why, and how to manage them.',
};

const dot = 'mt-1.5 h-1.5 w-1.5 rounded-full bg-[#00ff88] shrink-0';

const cookieTypes = [
  {
    name: 'reconpro_session',
    type: 'Essential',
    duration: 'Session',
    purpose: 'Maintains your authenticated session state. Required for accessing protected dashboard features and API interactions.',
  },
  {
    name: 'csrf_token',
    type: 'Essential',
    duration: 'Session',
    purpose: 'Prevents cross-site request forgery attacks on form submissions and API calls. Generated on each new session.',
  },
  {
    name: 'reconpro_analytics',
    type: 'Analytics',
    duration: '90 days',
    purpose: 'Collects anonymized usage metrics — page views, feature adoption, and error rates. Used solely for product improvement.',
  },
  {
    name: 'reconpro_prefs',
    type: 'Preferences',
    duration: '1 year',
    purpose: 'Stores your theme preference, sidebar state, and dashboard layout customizations across sessions.',
  },
  {
    name: 'reconpro_utm',
    type: 'Marketing',
    duration: '30 days',
    purpose: 'Tracks UTM campaign parameters to attribute signups to marketing channels. No personal data collected.',
  },
];

const typeBadge: Record<string, string> = {
  Essential: 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20',
  Analytics: 'bg-[#ffaa00]/10 text-[#ffaa00] border-[#ffaa00]/20',
  Preferences: 'bg-white/[0.04] text-white/50 border-white/[0.08]',
  Marketing: 'bg-white/[0.04] text-white/50 border-white/[0.08]',
};

export default function CookiePolicyPage() {
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
            Cookie Policy
          </h1>
          <p className="text-sm text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
            Last updated: June 2025
          </p>
        </header>

        <div className="space-y-12 text-[15px] leading-relaxed text-white/70" style={{ fontFamily: 'var(--font-body)' }}>
          {/* 1. What Are Cookies */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              1. What Are Cookies?
            </h2>
            <p className="mb-4">
              Cookies are small text files stored on your device by your web
              browser when you visit a website. They serve a variety of purposes:
              remembering your preferences, enabling core functionality,
              maintaining session state, and helping operators understand how
              their service is being used.
            </p>
            <p>
              Cookies can be &ldquo;persistent&rdquo; (stored until they expire or you
              manually delete them) or &ldquo;session&rdquo; cookies (automatically deleted
              when you close your browser window). ReconPro uses both types in
              limited, clearly defined ways described below.
            </p>
          </section>

          {/* 2. Types We Use */}
          <section className="panel overflow-hidden">
            <div className="p-6 sm:p-8 pb-0">
              <h2 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                2. Types of Cookies We Use
              </h2>
              <p className="text-sm text-white/50 mb-6">
                ReconPro uses a minimal, purpose-driven set of cookies. Each cookie
                is categorized below with its name, duration, and specific purpose.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider">Name</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider hidden md:table-cell">Duration</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#00ff88] uppercase tracking-wider">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {cookieTypes.map((cookie, i) => (
                    <tr key={cookie.name} className={`border-b border-white/[0.03] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                      <td className="px-6 py-4 font-mono text-xs text-[#00ff88]/80">{cookie.name}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${typeBadge[cookie.type]}`}>
                          {cookie.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/60 hidden md:table-cell">{cookie.duration}</td>
                      <td className="px-6 py-4 text-white/50">{cookie.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 sm:p-8 pt-6">
              <div className="rounded-xl bg-[#00ff88]/[0.03] border border-[#00ff88]/[0.08] p-5">
                <p className="text-sm text-[#00ff88]/70">
                  <span className="font-semibold text-[#00ff88]">Note:</span> Essential cookies
                  cannot be disabled without breaking core platform functionality.
                  Analytics and marketing cookies can be opted out through your
                  browser settings or our consent banner.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Managing Cookies */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              3. Managing Cookies
            </h2>
            <p className="mb-4">
              You retain full control over how cookies are handled by your browser.
              While blocking essential cookies will prevent ReconPro from
              functioning properly, you can manage non-essential cookies through
              the following methods:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                'Most browsers allow you to refuse or delete cookies through their privacy settings',
                'Private or incognito browsing modes do not persist cookies after the session ends',
                'Browser extensions such as uBlock Origin or Cookie AutoDelete provide granular cookie management',
                'You can clear all stored cookies for reconpro.dev specifically through your browser settings',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={dot} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 4. Contact */}
          <section className="panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              4. Contact Us
            </h2>
            <p className="text-white/50 text-sm mb-3">
              If you have questions about our use of cookies or this Cookie Policy,
              please contact us at:
            </p>
            <a
              href="mailto:privacy@reconpro.dev"
              className="text-[#00ff88] font-medium text-sm"
            >
              privacy@reconpro.dev
            </a>
            <p className="text-white/40 text-xs mt-4">
              We may update this Cookie Policy from time to time. Any changes
              will be posted on this page with an updated effective date. If we
              introduce non-essential cookies, we will provide clear notice
              before doing so.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
