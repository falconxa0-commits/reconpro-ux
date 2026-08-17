import type { Metadata } from "next";
import {
  CheckCircle2,
  Loader2,
  Lightbulb,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Roadmap | ReconPro",
  description:
    "ReconPro product roadmap — completed, in-progress, and planned features.",
};

interface RoadmapItem {
  title: string;
  description: string;
}

interface RoadmapCategory {
  label: string;
  status: "completed" | "in-progress" | "planned";
  icon: React.ElementType;
  accentColor: string;
  badgeText: string;
  badgeClass: string;
  items: RoadmapItem[];
}

const categories: RoadmapCategory[] = [
  {
    label: "Completed",
    status: "completed",
    icon: CheckCircle2,
    accentColor: "text-emerald-400",
    badgeText: "Shipped",
    badgeClass:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    items: [
      {
        title: "Reconnaissance Engine",
        description:
          "Full attack surface mapping with DNS enumeration, port scanning, SSL certificate analysis, and service fingerprinting. Real-time streaming results via WebSocket.",
      },
      {
        title: "API Framework",
        description:
          "RESTful API with JSON request/response handling, API key authentication (SHA-256 hashed), and Prisma ORM for SQLite data persistence.",
      },
      {
        title: "Security Hardening",
        description:
          "SSRF protection, enforced authentication, strict CSP and HSTS headers, input validation and sanitization, and per-key rate limiting across all endpoints.",
      },
      {
        title: "Vulnerability Scanning",
        description:
          "Automated vulnerability assessment with severity ratings and actionable remediation suggestions.",
      },
      {
        title: "Exposed Asset Mapping",
        description:
          "Automated discovery and visualization of exposed subdomains, open ports, and digital footprint.",
      },
      {
        title: "Team Management",
        description:
          "Multi-user team support with role-based access and shared project visibility.",
      },
    ],
  },
  {
    label: "In Progress",
    status: "in-progress",
    icon: Loader2,
    accentColor: "text-[#4FADDB]",
    badgeText: "Building",
    badgeClass:
      "bg-[#4FADDB]/10 text-[#4FADDB] border-[#4FADDB]/20",
    items: [
      {
        title: "Dashboard Routing & Navigation",
        description:
          "Building out the dashboard experience with dedicated routes for scan history, vulnerability reports, and team management views.",
      },
      {
        title: "Documentation Site",
        description:
          "Writing comprehensive API documentation with examples, authentication guides, and integration tutorials.",
      },
      {
        title: "Compliance Reporting",
        description:
          "Automated compliance checks and report generation for common frameworks. Early integration stage.",
      },
    ],
  },
  {
    label: "Planned",
    status: "planned",
    icon: Lightbulb,
    accentColor: "text-[#C9A96E]",
    badgeText: "Planned",
    badgeClass:
      "bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/20",
    items: [
      {
        title: "Billing & Subscription Management",
        description:
          "Usage-based billing with Stripe integration, tier management, and invoice generation. Currently all features are free during early access.",
      },
      {
        title: "Community Features",
        description:
          "Shared threat intelligence, community-contributed scan templates, and a public Hall of Fame for security researchers.",
      },
      {
        title: "Mobile Application",
        description:
          "Native mobile app for iOS and Android with push notifications for critical findings and on-the-go scan monitoring.",
      },
      {
        title: "CI/CD Integration",
        description:
          "GitHub Actions, GitLab CI, and Jenkins plugins for automated reconnaissance in development pipelines.",
      },
      {
        title: "SOC 2 Type II Certification",
        description:
          "Working toward formal certification. Currently implementing the required controls and preparing for the audit process.",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-mono tracking-widest uppercase text-[#C9A96E] mb-4">
              Product
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Roadmap
            </h1>
            <p className="text-white/60 max-w-xl">
              An honest look at where ReconPro is, what we are building right
              now, and what is planned for the future. No vaporware — everything
              listed here is real work we are doing or intend to do.
            </p>
          </header>

          {/* Disclaimer */}
          <div className="mb-12 rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-white/60">
              <span className="text-white font-medium">A note on timelines:</span>{" "}
              We are a small, focused team. We ship when things are ready, not on
              arbitrary deadlines. Planned items may change in priority or scope
              based on user feedback and security requirements.
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-12">
            {categories.map((category) => (
              <section key={category.label}>
                <div className="flex items-center gap-3 mb-6">
                  <category.icon
                    className={`h-5 w-5 ${category.accentColor}`}
                  />
                  <h2 className="text-xl font-semibold text-white">
                    {category.label}
                  </h2>
                  <span
                    className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border ${category.badgeClass}`}
                  >
                    {category.badgeText}
                  </span>
                </div>

                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
                    >
                      <h3 className="text-sm font-semibold text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
    </div>
  );
}
