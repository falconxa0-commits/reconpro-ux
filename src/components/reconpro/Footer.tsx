"use client";

import Link from "next/link";
import { product } from "@/data/content";
import { useInView, useSmoothScroll } from "@/hooks/useInView";

export function Footer() {
  const scrollTo = useSmoothScroll();
  const { ref: ctaRef, isInView: ctaInView } = useInView(0.1);

  const columns = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/#features" },
        { label: "Architecture", href: "/#architecture" },
        { label: "Scanner Modules", href: "/#modules" },
        { label: "CLI Commands", href: "/#cli" },
        { label: "Pricing", href: "/pricing" },
        { label: "Enterprise", href: "/enterprise" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "API Reference", href: "/api-overview" },
        { label: "Changelog", href: "/changelog" },
        { label: "Roadmap", href: "/roadmap" },
        { label: "Status", href: "/status" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "/contact" },
        { label: "Security", href: "/security" },
        { label: "Trust Center", href: "/trust" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Cookie Policy", href: "/cookies" },
        { label: "License (MIT)", href: "https://opensource.org/licenses/MIT", external: true },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-white/[0.03] bg-black" aria-label="Site footer">
      {/* Top CTA Section */}
      <div ref={ctaRef as React.RefObject<HTMLDivElement>} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h2 className={`typography-section-heading text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4 transition-all duration-700 ${ctaInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <span className="text-gradient-void">Start scanning in seconds.</span>
          </h2>
          <p className={`text-white/60 text-sm max-w-xl mx-auto mb-8 leading-relaxed transition-all delay-100 duration-700 ${ctaInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            Sign in with your API key, select a target, and launch your first scan.
            Real-time results, no external dependencies.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/register"
              className="text-sm text-white bg-white/[0.9] font-medium px-5 py-3 rounded-xl hover:bg-white transition-all duration-300"
            >
              Get Started
            </Link>
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
              <span className="text-xs text-white/50">Open Source (MIT)</span>
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
                    {link.href.startsWith("/") && !link.href.startsWith("/#") && !(link as any).external ? (
                      <Link href={link.href} className="text-xs text-white/50 hover:text-white/80 transition-colors duration-300" aria-label={`Navigate to ${link.label}`}>
                        {link.label}
                      </Link>
                    ) : (link as any).external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 hover:text-white/80 transition-colors duration-300" aria-label={`Open ${link.label} in new tab`}>
                        {link.label}
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          if (link.href && link.href !== "#") {
                            const id = link.href.replace("/#", "");
                            if (id) scrollTo(id);
                          }
                        }}
                        className="text-xs text-white/50 hover:text-white/80 transition-colors duration-300"
                        aria-label={`Navigate to ${link.label}`}
                      >
                        {link.label}
                      </button>
                    )}
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
            {product.version} · Open Source · MIT License
          </span>
        </div>
      </div>
    </footer>
  );
}
