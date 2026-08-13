"use client";

import { product } from "@/data/content";
import { useInView, useSmoothScroll } from "@/hooks/useInView";

export function Footer() {
  const scrollTo = useSmoothScroll();
  const { ref: ctaRef, isInView: ctaInView } = useInView(0.1);

  const columns = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Architecture", href: "#architecture" },
        { label: "Scanner Modules", href: "#modules" },
        { label: "CLI Commands", href: "#cli" },
        { label: "Performance", href: "#benchmarks" },
        { label: "Pricing", href: "#pricing" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#docs" },
        { label: "Tutorials", href: "#community" },
        { label: "API Reference", href: "#docs" },
        { label: "Examples", href: "#docs" },
        { label: "Changelog", href: "#community" },
        { label: "Roadmap", href: "#pricing" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Enterprise", href: "#enterprise" },
        { label: "Blog", href: "#community" },
        { label: "Careers", href: "#community" },
        { label: "Contact", href: "#community" },
        { label: "Press", href: "#community" },
        { label: "Partners", href: "#enterprise" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        { label: "Security", href: "#" },
        { label: "Responsible Disclosure", href: "#" },
        { label: "License (MIT)", href: "#" },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-white/[0.03] bg-black" aria-label="Site footer">
      {/* Top CTA Section */}
      <div ref={ctaRef as React.RefObject<HTMLDivElement>} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h2 className={`typography-section-heading text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4 transition-all duration-700 ${ctaInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <span className="text-gradient-void">Ready to see your attack surface?</span>
          </h2>
          <p className={`text-white/60 text-sm max-w-xl mx-auto mb-8 leading-relaxed transition-all delay-100 duration-700 ${ctaInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            Install ReconPro in seconds. Three dependencies. Zero bloat.
            Full-spectrum reconnaissance from day one.
          </p>
          <div className="flex items-center justify-center gap-3">
            <code className="text-sm text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-3 font-mono">
              pip install reconpro
            </code>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

      {/* Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">ReconPro</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed mb-4">
              Attack surface intelligence for the modern security team.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://github.com/reconpro/reconpro" target="_blank" rel="noopener noreferrer" aria-label="ReconPro GitHub" className="text-white/50 hover:text-white/80 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" aria-label="Twitter" className="text-white/50 hover:text-white/80 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
              <a href="#" aria-label="Discord" className="text-white/50 hover:text-white/80 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z"/></svg>
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => {
                        if (link.href && link.href !== "#") {
                          const id = link.href.replace("#", "");
                          if (id) scrollTo(id);
                        }
                      }}
                      className="text-xs text-white/50 hover:text-white/80 transition-colors duration-300"
                      aria-label={`Navigate to ${link.label}`}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[11px] text-white/50">
          &copy; {new Date().getFullYear()} ReconPro. Open source under MIT License.
        </p>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-white/50">
            {product.version} · {product.loc} LOC · {product.tests} tests
          </span>
          <span className="text-white/40">·</span>
          <span className="text-[11px] text-white/50">Built with precision</span>
        </div>
      </div>
    </footer>
  );
}
