import type { Metadata } from "next";
import { MarketingLayout } from "@/components/shared/MarketingLayout";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation | ReconPro",
  description:
    "ReconPro documentation. Getting started guides, API reference for 47 endpoints, 16 scanner modules, and CLI command reference.",
};

const sections = [
  {
    title: "Getting Started",
    description:
      "Install ReconPro and run your first scan. Covers installation methods, configuration, and basic usage patterns.",
    links: [
      { label: "Installation", href: "#" },
      { label: "Quick Start Guide", href: "#" },
      { label: "Configuration", href: "#" },
      { label: "First Scan Walkthrough", href: "#" },
      { label: "Authentication Setup", href: "#" },
    ],
  },
  {
    title: "API Reference",
    description:
      "Complete reference for all 47 REST API endpoints organized by category.",
    links: [
      {
        label: "Scanning Endpoints (12)",
        href: "/api-overview",
      },
      {
        label: "Intelligence Endpoints (8)",
        href: "/api-overview",
      },
      {
        label: "Organization Endpoints (7)",
        href: "/api-overview",
      },
      { label: "NHI Endpoints (5)", href: "/api-overview" },
      {
        label: "Genesis Endpoints (6)",
        href: "/api-overview",
      },
      {
        label: "Authentication Endpoints (4)",
        href: "/api-overview",
      },
      { label: "Utility Endpoints (5)", href: "/api-overview" },
    ],
  },
  {
    title: "Scanner Modules",
    description:
      "Documentation for the 16 built-in scanner modules. Each module page covers capabilities, parameters, and output formats.",
    links: [
      { label: "DNS Recon", href: "#" },
      { label: "SSL/TLS Analysis", href: "#" },
      { label: "Port Scanner", href: "#" },
      { label: "WHOIS / RDAP", href: "#" },
      { label: "HTTP Header Analysis", href: "#" },
      { label: "Subdomain Enum", href: "#" },
      { label: "Reverse DNS", href: "#" },
      { label: "ASN Lookup", href: "#" },
      { label: "Technology Detection", href: "#" },
      { label: "Email Harvest", href: "#" },
      { label: "Certificate Transparency", href: "#" },
      { label: "DNS Zone Transfer", href: "#" },
      { label: "Robots.txt Parser", href: "#" },
      { label: "Favicon Hash", href: "#" },
      { label: "WAF Detection", href: "#" },
      { label: "CDN Detection", href: "#" },
    ],
  },
  {
    title: "CLI Commands",
    description:
      "Full command-line interface reference. All commands, flags, and usage examples.",
    links: [
      { label: "reconpro scan", href: "#" },
      { label: "reconpro dns", href: "#" },
      { label: "reconpro ssl", href: "#" },
      { label: "reconpro ports", href: "#" },
      { label: "reconpro whois", href: "#" },
      { label: "reconpro headers", href: "#" },
      { label: "reconpro subdomains", href: "#" },
      { label: "reconpro enum", href: "#" },
    ],
  },
];

export default function DocsPage() {
  return (
    <MarketingLayout>
      <section className="relative py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
              Documentation
            </h1>
            <p className="text-white/50 text-sm sm:text-base max-w-2xl leading-relaxed">
              Everything you need to use ReconPro effectively. From installation
              to advanced API usage, all documentation is maintained alongside the
              source code.
            </p>
          </div>

          {/* Quick Reference */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 mb-12">
            <h2 className="text-sm font-medium text-white/60 mb-3">
              Quick Reference
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-white/30 mb-1">Install</p>
                <code className="text-xs font-mono text-white/70 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.06]">
                  pip install reconpro
                </code>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Scan a Domain</p>
                <code className="text-xs font-mono text-white/70 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.06]">
                  reconpro scan example.com
                </code>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">API Base URL</p>
                <code className="text-xs font-mono text-white/70 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.06]">
                  /api/v1/...
                </code>
              </div>
            </div>
          </div>

          {/* Documentation Sections */}
          <div className="space-y-12">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8"
              >
                <h2 className="text-lg font-semibold text-white mb-2">
                  {section.title}
                </h2>
                <p className="text-xs text-white/40 leading-relaxed mb-6">
                  {section.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {section.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors duration-300 py-1.5"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white/20 flex-shrink-0"
                        aria-hidden="true"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                      {link.label}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* Note */}
          <div className="mt-16 pt-8 border-t border-white/[0.04]">
            <p className="text-xs text-white/30 leading-relaxed">
              Documentation is versioned alongside releases. The current docs
              correspond to v10.0.0. For older versions, see the release tags on
              GitHub. Some linked pages above are placeholders for documentation
              that is being written.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
