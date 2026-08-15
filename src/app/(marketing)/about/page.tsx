import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | ReconPro",
  description:
    "ReconPro is an open-source attack surface intelligence platform built with modern technology. Learn about our mission, technology stack, and commitment to transparency.",
};

export default function AboutPage() {
  return (
    <div className="pt-16">
      <section className="relative py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
              About ReconPro
            </h1>
            <p className="text-white/50 text-sm sm:text-base max-w-2xl leading-relaxed">
              An open-source attack surface intelligence platform that provides
              security teams with the tools to discover, map, and understand
              their external infrastructure.
            </p>
          </div>

          {/* Mission */}
          <article className="mb-16">
            <h2 className="text-xl font-semibold text-white mb-4">Mission</h2>
            <div className="space-y-4 text-sm text-white/60 leading-relaxed">
              <p>
                ReconPro exists because security teams deserve better tools.
                Most reconnaissance frameworks are either abandoned open-source
                projects with hundreds of dependencies, or expensive SaaS
                platforms that lock you into proprietary data formats.
              </p>
              <p>
                Our goal is straightforward: build a reconnaissance tool that is
                fast, dependency-light, and honest about what it does. No
                marketing fluff, no inflated vulnerability counts, no claims
                about features that do not exist.
              </p>
              <p>
                The project is open source under the MIT License. You can audit
                every line of code, self-host the entire platform, and modify it
                to fit your workflow. There are no feature gates on the core
                scanning modules.
              </p>
            </div>
          </article>

          {/* Technology */}
          <article className="mb-16">
            <h2 className="text-xl font-semibold text-white mb-4">
              Technology
            </h2>
            <p className="text-sm text-white/50 leading-relaxed mb-6">
              ReconPro is built with a modern stack that prioritizes performance
              and developer experience.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  name: "Next.js 16 / React 19",
                  desc: "Full-stack framework with App Router, server components, and streaming SSR.",
                },
                {
                  name: "Next.js 16 / TypeScript",
                  desc: "Web dashboard and API layer with type-safe server routes.",
                },
                {
                  name: "Node.js Native Scanning",
                  desc: "DNS resolution, SSL/TLS analysis, port scanning, and HTTP header inspection using native Node.js APIs.",
                },
                {
                  name: "Prisma ORM",
                  desc: "Type-safe database layer with SQLite for embedded deployments.",
                },
                {
                  name: "Framer Motion",
                  desc: "Production-grade animation library for dashboard transitions and micro-interactions.",
                },
                {
                  name: "Tailwind CSS 4",
                  desc: "Utility-first styling with OLED-optimized dark theme.",
                },
                {
                  name: "shadcn/ui",
                  desc: "Accessible, composable UI component library built on Radix primitives.",
                },
              ].map((tech) => (
                <div
                  key={tech.name}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <h3 className="text-sm font-medium text-white mb-1">
                    {tech.name}
                  </h3>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {tech.desc}
                  </p>
                </div>
              ))}
            </div>
          </article>

          {/* Open Source */}
          <article className="mb-16">
            <h2 className="text-xl font-semibold text-white mb-4">
              Open Source
            </h2>
            <div className="space-y-4 text-sm text-white/60 leading-relaxed">
              <p>
                ReconPro is MIT licensed. The full source code is available on
                GitHub. There are no telemetry trackers, no phone-home
                mechanisms, and no data collection. The tool does exactly what
                the documentation says it does.
              </p>
              <p>
                Contributions are welcome. Whether it is a bug fix, a new
                scanner module, documentation improvements, or performance
                optimizations, the project benefits from community involvement.
                All contributions follow a standard pull request review process.
              </p>
              <p>
                The platform provides real-time reconnaissance, vulnerability
                scanning, threat detection, and compliance mapping. The version
                number reflects actual releases, not marketing inflation.
              </p>
            </div>
          </article>

          {/* Version Info */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="text-sm font-medium text-white/60 mb-4">
              Current Release
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-white/30 mb-1">Version</p>
                <p className="text-sm font-mono text-white">v0.2.0</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">API Endpoints</p>
                <p className="text-sm font-mono text-white">35</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Scanner Modules</p>
                <p className="text-sm font-mono text-white">4</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">License</p>
                <p className="text-sm font-mono text-white">MIT</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
