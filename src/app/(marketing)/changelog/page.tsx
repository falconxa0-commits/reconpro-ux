import type { Metadata } from "next";
import {
  Rocket,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog | ReconPro",
  description:
    "ReconPro changelog — version history, feature releases, and security updates.",
};

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  changes: {
    type: "added" | "improved" | "fixed" | "security";
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "0.2.0",
    date: "August 2025",
    title: "Dashboard & Navigation",
    description:
      "Complete dashboard experience with 8 dedicated routes, sidebar navigation, bottom dock, and command palette. Full routing with auth guards.",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
    changes: [
      {
        type: "added",
        description:
          "Dashboard with 8 routes: overview, scans, findings, monitoring, compliance, teams, integrations, settings",
      },
      {
        type: "added",
        description:
          "Sidebar navigation with 4 sections, collapsible design, and active state indicators",
      },
      {
        type: "added",
        description:
          "Bottom dock with primary and secondary navigation items",
      },
      {
        type: "added",
        description:
          "API key authentication with dashboard auth guards and redirect flow",
      },
      {
        type: "added",
        description:
          "Loading and error states for all dashboard routes",
      },
      {
        type: "security",
        description:
          "Middleware-based dashboard protection with cookie-based auth checking",
      },
      {
        type: "improved",
        description:
          "Bento-grid overview with live stats, activity feed, and severity donut chart",
      },
    ],
  },
  {
    version: "0.1.0",
    date: "July 2025",
    title: "Scanning Engine & API",
    description:
      "Initial release with real reconnaissance scanning (DNS, SSL, port, HTTP), REST API framework, and security hardening.",
    icon: Rocket,
    iconColor: "text-[#4FADDB]",
    changes: [
      {
        type: "added",
        description:
          "DNS reconnaissance with record enumeration using native Node.js dns/promises",
      },
      {
        type: "added",
        description:
          "SSL/TLS certificate analysis with chain validation and expiry monitoring",
      },
      {
        type: "added",
        description:
          "TCP port scanning with service fingerprinting",
      },
      {
        type: "added",
        description:
          "HTTP header analysis and technology detection",
      },
      {
        type: "added",
        description:
          "REST API with 35+ endpoints, API key auth (SHA-256), and rate limiting",
      },
      {
        type: "added",
        description:
          "Prisma ORM with SQLite for data persistence, 17 database models",
      },
      {
        type: "security",
        description:
          "SSRF protection blocking internal networks, cloud metadata, and private IPs",
      },
      {
        type: "security",
        description:
          "Strict CSP, HSTS, COOP/COEP/CORP security headers via middleware",
      },
    ],
  },
];

const typeColors: Record<string, string> = {
  added: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  improved: "bg-[#4FADDB]/10 text-[#4FADDB] border-[#4FADDB]/20",
  fixed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  security: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ChangelogPage() {
  return (
    <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-mono tracking-widest uppercase text-[#C9A96E] mb-4">
              Releases
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Changelog
            </h1>
            <p className="text-white/60 max-w-xl">
              A factual record of what has been built and shipped. Every entry
              here reflects actual changes to the ReconPro codebase.
            </p>
          </header>

          {/* Changelog entries */}
          <div className="space-y-12">
            {changelog.map((entry) => (
              <article
                key={entry.version}
                className="relative rounded-xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="shrink-0 mt-1">
                    <entry.icon className={`h-6 w-6 ${entry.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-lg font-bold text-white">
                        {entry.title}
                      </span>
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
                        v{entry.version}
                      </span>
                      <span className="text-xs text-white/40">{entry.date}</span>
                    </div>
                    <p className="text-white/60 text-sm">
                      {entry.description}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5 mt-6">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className={`shrink-0 mt-1 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${typeColors[change.type]}`}
                      >
                        {change.type}
                      </span>
                      <span className="text-white/70 text-sm">
                        {change.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
    </div>
  );
}
