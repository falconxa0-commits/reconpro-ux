import type { Metadata } from "next";
import {
  Rocket,
  Zap,
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
    version: "1.0.0",
    date: "June 2025",
    title: "Security Hardening",
    description:
      "Major security audit and hardening pass across the entire platform. Authentication enforcement, SSRF protections, and input validation were significantly strengthened.",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
    changes: [
      {
        type: "security",
        description:
          "Implemented SSRF protection on all scan endpoints, blocking internal network ranges and cloud metadata IPs",
      },
      {
        type: "security",
        description:
          "Enforced authentication on all protected API routes; unauthenticated requests now return 401",
      },
      {
        type: "improved",
        description:
          "Strengthened input validation and hostname sanitization across all scan parameters",
      },
      {
        type: "added",
        description:
          "Deployed strict Content Security Policy headers to mitigate XSS and injection attacks",
      },
      {
        type: "added",
        description:
          "Enabled HTTP Strict Transport Security (HSTS) with long max-age directive",
      },
      {
        type: "improved",
        description:
          "Rate limiting enforced on all API endpoints with per-key tracking and 429 responses",
      },
    ],
  },
  {
    version: "9.0.0",
    date: "May 2025",
    title: "Reconnaissance Engine Completion",
    description:
      "Full completion of the reconnaissance and attack surface mapping engine. All major scan modules are operational with real-time streaming results.",
    icon: Rocket,
    iconColor: "text-[#4FADDB]",
    changes: [
      {
        type: "added",
        description:
          "Completed DNS reconnaissance module with subdomain enumeration, record lookups, and zone transfer detection",
      },
      {
        type: "added",
        description:
          "Port scanning engine with service fingerprinting and banner grabbing",
      },
      {
        type: "added",
        description:
          "SSL/TLS certificate analysis with transparency log checks and expiry monitoring",
      },
      {
        type: "added",
        description:
          "Real-time scan result streaming via WebSocket for live feedback during reconnaissance",
      },
      {
        type: "improved",
        description:
          "Scan results now include severity ratings and actionable remediation suggestions",
      },
      {
        type: "added",
        description:
          "Exposed asset mapping with automated subdomain and port discovery",
      },
    ],
  },
  {
    version: "8.0.0",
    date: "April 2025",
    title: "Initial API Framework",
    description:
      "Foundation of the ReconPro API platform. Core authentication, key management, and the basic API routing layer were established.",
    icon: Zap,
    iconColor: "text-[#C9A96E]",
    changes: [
      {
        type: "added",
        description:
          "API key generation and management with SHA-256 hashing for secure storage",
      },
      {
        type: "added",
        description:
          "Core API routing framework with JSON request/response handling",
      },
      {
        type: "added",
        description:
          "Initial authentication middleware for protected endpoints",
      },
      {
        type: "added",
        description:
          "Health check endpoint and basic system monitoring",
      },
      {
        type: "added",
        description:
          "SQLite database integration with Prisma ORM for data persistence",
      },
    ],
  },
];

function ShieldCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

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
