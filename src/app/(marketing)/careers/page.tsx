import type { Metadata } from "next";
import {
  Shield,
  Code2,
  Server,
  Mail,
  Github,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the ReconPro team — open roles and career opportunities in security engineering.",
};

interface Role {
  icon: React.ElementType;
  title: string;
  description: string;
  skills: string[];
}

const roles: Role[] = [
  {
    icon: Shield,
    title: "Security Engineer",
    description:
      "Build and maintain our reconnaissance engine, vulnerability scanners, and attack surface analysis tools. You will work on SSRF protection, rate limiting, input validation, and secure API design.",
    skills: [
      "Network security & penetration testing experience",
      "Proficiency in TypeScript, Go, or Rust",
      "Familiarity with OWASP Top 10 and common attack vectors",
      "Experience with DNS, TLS, HTTP protocol internals",
    ],
  },
  {
    icon: Code2,
    title: "Full-Stack Developer",
    description:
      "Build the ReconPro web platform — from the real-time dashboard and scan management UI to the API layer and database schema. You will own features end-to-end.",
    skills: [
      "Strong TypeScript and React/Next.js experience",
      "Experience with API design and RESTful services",
      "Familiarity with Tailwind CSS and modern UI frameworks",
      "Ability to work with SQLite and ORM tools (Prisma preferred)",
    ],
  },
  {
    icon: Server,
    title: "DevOps / Infrastructure Engineer",
    description:
      "Design and maintain our deployment infrastructure, CI/CD pipelines, and monitoring systems. You will ensure the platform is reliable, fast, and secure at the infrastructure level.",
    skills: [
      "Experience with containerization (Docker) and orchestration",
      "Familiarity with TLS configuration, HSTS, and CSP deployment",
      "Monitoring and alerting setup (Prometheus, Grafana, or similar)",
      "Understanding of network security at the infrastructure layer",
    ],
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-mono tracking-widest uppercase text-[#C9A96E] mb-4">
              Team
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Careers
            </h1>
            <p className="text-white/60 max-w-xl">
              We are building the next generation of security reconnaissance
              tools. If that excites you, we would love to hear from you.
            </p>
          </header>

          {/* Honest status */}
          <div className="mb-12 rounded-xl border border-[#C9A96E]/20 bg-[#C9A96E]/[0.03] p-6">
            <p className="text-sm text-[#C9A96E]/80 leading-relaxed">
              <span className="font-semibold text-[#C9A96E]">
                Current status:
              </span>{" "}
              We are not actively hiring right now. ReconPro is in its early
              stages — we are a small, focused team shipping as fast as we can.
              That said, we are always interested in exceptional security
              engineers and developers who want to build something meaningful.
            </p>
          </div>

          {/* Roles */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-6">
              Roles We Hire For
            </h2>
            <p className="text-white/60 text-sm mb-8">
              These are the types of roles we typically look for. When positions
              open up, they will be listed here with details on compensation,
              location, and application process.
            </p>

            <div className="space-y-6">
              {roles.map((role) => (
                <div
                  key={role.title}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="shrink-0 mt-1 rounded-lg bg-white/[0.05] p-2.5">
                      <role.icon className="h-5 w-5 text-[#4FADDB]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {role.title}
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed">
                        {role.description}
                      </p>
                    </div>
                  </div>

                  <div className="pl-14">
                    <p className="text-xs font-mono uppercase tracking-wider text-white/40 mb-3">
                      Ideal background
                    </p>
                    <ul className="space-y-2">
                      {role.skills.map((skill) => (
                        <li
                          key={skill}
                          className="flex items-start gap-2.5 text-sm text-white/60"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#C9A96E] shrink-0" />
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* What we offer */}
          <section className="mt-16">
            <h2 className="text-xl font-semibold text-white mb-6">
              What We Offer
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="text-sm font-semibold text-[#C9A96E] mb-2">
                  Remote-First
                </h3>
                <p className="text-white/60 text-sm">
                  Work from anywhere. We are a distributed team that
                  communicates asynchronously and respects deep work time.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="text-sm font-semibold text-[#C9A96E] mb-2">
                  Open Source
                </h3>
                <p className="text-white/60 text-sm">
                  Our codebase is MIT-licensed. Your contributions are visible,
                  and your work speaks for itself in the security community.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="text-sm font-semibold text-[#C9A96E] mb-2">
                  Security-Focused
                </h3>
                <p className="text-white/60 text-sm">
                  Work on real security problems — not ads, not analytics, not
                  dashboards for dashboards. Every feature has a security purpose.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="text-sm font-semibold text-[#C9A96E] mb-2">
                  Early Stage Impact
                </h3>
                <p className="text-white/60 text-sm">
                  Join early and shape the product, architecture, and culture.
                  Your decisions will have outsized impact on the direction of
                  the project.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="mt-16">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
              <h2 className="text-lg font-semibold text-white mb-3">
                Interested? Reach Out
              </h2>
              <p className="text-white/60 text-sm mb-6 max-w-md mx-auto">
                Send your resume, GitHub profile, or a brief note about what
                you would build. We read every message.
              </p>
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <a
                  href="mailto:careers@reconpro.dev"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#4FADDB] hover:text-[#4FADDB]/80 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  careers@reconpro.dev
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

    </div>
  );
}
