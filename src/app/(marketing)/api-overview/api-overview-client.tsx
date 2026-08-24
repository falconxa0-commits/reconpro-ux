"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Code2, Key, Gauge, Terminal, Copy } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.08,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

const endpointGroups = [
  {
    category: "Auth",
    description: "User authentication, API key management, and session validation.",
    endpoints: [
      { method: "POST", path: "/api/auth/register", desc: "Create a new account with email and password" },
      { method: "POST", path: "/api/auth/login", desc: "Authenticate and receive a session token" },
      { method: "POST", path: "/api/v1/auth/validate", desc: "Validate an API key and return org details" },
    ],
  },
  {
    category: "Scans",
    description: "Initiate, manage, and stream reconnaissance scans against targets.",
    endpoints: [
      { method: "POST", path: "/api/scan", desc: "Execute a full reconnaissance scan on a target" },
      { method: "GET", path: "/api/scan/stream", desc: "Stream real-time scan progress via Server-Sent Events" },
      { method: "GET", path: "/api/scans", desc: "List recent scan history with pagination" },
    ],
  },
  {
    category: "Findings",
    description: "Query and manage discovered vulnerabilities and security findings.",
    endpoints: [
      { method: "GET", path: "/api/findings", desc: "List findings filtered by severity, type, and scan" },
      { method: "GET", path: "/api/findings/:id", desc: "Retrieve detailed finding with evidence and remediation" },
    ],
  },
  {
    category: "Monitoring",
    description: "Configure scheduled scan policies and continuous monitoring.",
    endpoints: [
      { method: "POST", path: "/api/monitoring", desc: "Create a new scheduled monitoring policy" },
      { method: "GET", path: "/api/monitoring", desc: "List all monitoring policies with status" },
      { method: "DELETE", path: "/api/monitoring/:id", desc: "Delete a monitoring policy by ID" },
    ],
  },
  {
    category: "Compliance",
    description: "Generate compliance reports and check framework adherence.",
    endpoints: [
      { method: "GET", path: "/api/compliance/report", desc: "Generate compliance report in JSON, HTML, or PDF" },
      { method: "GET", path: "/api/compliance/frameworks", desc: "List available compliance frameworks and statuses" },
    ],
  },
  {
    category: "Teams",
    description: "Manage organization members, teams, and role-based access.",
    endpoints: [
      { method: "GET", path: "/api/members", desc: "List all organization members and their roles" },
      { method: "POST", path: "/api/teams", desc: "Create a new team with assigned members" },
      { method: "GET", path: "/api/teams", desc: "List all teams in the organization" },
    ],
  },
];

const methodColor: Record<string, string> = {
  GET: "text-[#00ff88]/70 bg-[#00ff88]/10",
  POST: "text-[#ffaa00]/70 bg-[#ffaa00]/10",
  DELETE: "text-[#ff3355]/70 bg-[#ff3355]/10",
};

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Copy className="w-3.5 h-3.5 text-white/20" />
      </div>
      <pre className="text-xs font-mono text-white/60 bg-white/[0.02] px-4 py-3 rounded-lg border border-white/[0.06] overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiOverviewClient() {
  const { ref: authRef, isInView: authInView } = useInView(0.05);
  const { ref: endpointsRef, isInView: endpointsInView } = useInView(0.05);
  const { ref: rateRef, isInView: rateInView } = useInView(0.05);

  const totalEndpoints = endpointGroups.reduce(
    (acc, g) => acc + g.endpoints.length,
    0
  );

  return (
    <div className="pt-16 bg-black">
      {/* Header */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <SectionBadge>
              <Code2 width={12} height={12} className="text-[#00ff88]" />
              API
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              API Overview
            </h1>
            <p
              className="text-base text-white/50 max-w-2xl leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              ReconPro provides{" "}
              <span className="text-white/80 font-semibold">
                {totalEndpoints} API endpoints
              </span>{" "}
              across {endpointGroups.length} categories. All endpoints require
              authentication via the{" "}
              <code className="text-xs bg-white/[0.03] px-1.5 py-0.5 rounded">
                x-api-key
              </code>{" "}
              header or a valid session token.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Authentication & Quick Start */}
      <section ref={authRef} className="relative pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <motion.div
            initial="hidden"
            animate={authInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="panel p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-4 h-4 text-[#00ff88]" />
              <h2
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Authentication
              </h2>
            </div>
            <p
              className="text-xs text-white/40 mb-4"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Two authentication methods are supported. API keys are the
              recommended approach for programmatic access. Session tokens are
              used by the dashboard.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs font-semibold text-white/70 mb-2">API Key (Recommended)</p>
                <p className="text-xs text-white/40">
                  Pass your key in the <code className="text-[#00ff88]/70 bg-[#00ff88]/10 px-1 rounded">x-api-key</code> header.
                  Keys are hashed with SHA-256 before storage and shown only once at creation.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs font-semibold text-white/70 mb-2">Session Token</p>
                <p className="text-xs text-white/40">
                  Obtain a token via <code className="text-[#00ff88]/70 bg-[#00ff88]/10 px-1 rounded">POST /api/auth/login</code>.
                  Sessions are stored as HTTP-only cookies with SameSite=Strict.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={authInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={1}
            className="panel p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Terminal className="w-4 h-4 text-[#00ff88]" />
              <h2
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Quick Start
              </h2>
            </div>
            <p
              className="text-xs text-white/40 mb-4"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Run your first scan in under a minute. Replace the API key with
              your own.
            </p>
            <CodeBlock
              language="bash"
              code={`# Set your API key
export RECONPRO_API_KEY="rp_live_your_key_here"

# Run a full reconnaissance scan
curl -X POST https://api.reconpro.dev/api/scan \
  -H "x-api-key: $RECONPRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target": "example.com", "modules": ["dns", "ports", "ssl"]}'

# Stream results in real time
curl -N https://api.reconpro.dev/api/scan/stream?scanId=scan_abc123 \
  -H "x-api-key: $RECONPRO_API_KEY"`}
            />
          </motion.div>
        </div>
      </section>

      {/* Endpoint Categories */}
      <section ref={endpointsRef} className="relative py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {endpointGroups.map((group, gi) => (
              <motion.div
                key={group.category}
                initial="hidden"
                animate={endpointsInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={gi}
              >
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <h2
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {group.category}
                    </h2>
                    <span className="text-[10px] font-mono text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-md">
                      {group.endpoints.length} endpoints
                    </span>
                  </div>
                  <p
                    className="text-xs text-white/40"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {group.description}
                  </p>
                </div>
                <div className="panel overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider w-16">Method</th>
                          <th className="px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">Endpoint</th>
                          <th className="px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider hidden sm:table-cell">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.endpoints.map((ep) => (
                          <tr
                            key={ep.method + ep.path}
                            className="border-b border-white/[0.02] last:border-0"
                          >
                            <td className="px-4 py-2.5">
                              <span
                                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${methodColor[ep.method] || "text-white/50 bg-white/[0.04]"}`}
                              >
                                {ep.method}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <code className="text-xs font-mono text-white/60">
                                {ep.path}
                              </code>
                            </td>
                            <td
                              className="px-4 py-2.5 text-xs text-white/40 hidden sm:table-cell"
                              style={{ fontFamily: "var(--font-body)" }}
                            >
                              {ep.desc}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section ref={rateRef} className="relative py-12 pb-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={rateInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="panel p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Gauge className="w-4 h-4 text-[#00ff88]" />
              <h2
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Rate Limits
              </h2>
            </div>
            <p className="text-xs text-white/40 mb-5" style={{ fontFamily: "var(--font-body)" }}>
              All endpoints enforce per-API-key rate limits. Exceeding the limit
              returns HTTP 429 with a Retry-After header. Limits may vary by
              subscription tier.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Terminal className="w-3 h-3 text-white/30" />
                  <p className="text-xs text-white/30">General Endpoints</p>
                </div>
                <p className="text-sm font-mono text-white/70">60 req / 60s</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Terminal className="w-3 h-3 text-white/30" />
                  <p className="text-xs text-white/30">Scan Operations</p>
                </div>
                <p className="text-sm font-mono text-white/70">3 req / 60s</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Terminal className="w-3 h-3 text-white/30" />
                  <p className="text-xs text-white/30">Auth Validation</p>
                </div>
                <p className="text-sm font-mono text-white/70">30 req / 60s</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
