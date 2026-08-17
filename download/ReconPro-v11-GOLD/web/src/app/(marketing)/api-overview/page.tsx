import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Overview | ReconPro",
  description:
    "ReconPro REST API overview. Base URL, authentication, and all endpoints grouped by category.",
};

// Each endpoint is verified against actual src/app/api/ route files
// "simulated" endpoints return PRNG-generated data, not real results

const endpointGroups = [
  {
    category: "Authentication",
    description: "User authentication and API key validation.",
    endpoints: [
      { method: "POST", path: "/api/auth/register", desc: "Create a new account with API key generation" },
      { method: "POST", path: "/api/auth/login", desc: "Email/password authentication" },
      { method: "POST", path: "/api/auth/forgot-password", desc: "Password reset request" },
      { method: "POST", path: "/api/v1/auth/validate", desc: "Validate an API key and retrieve org context" },
    ],
  },
  {
    category: "Scanning",
    description: "Initiate and manage reconnaissance scans. DNS, SSL, port, and HTTP scans use native Node.js APIs.",
    endpoints: [
      { method: "POST", path: "/api/scan", desc: "Execute a scan against a target domain (DNS/SSL/Port/HTTP)" },
      { method: "GET", path: "/api/scan/stream", desc: "Stream real scan progress via SSE with per-module results" },
      { method: "GET", path: "/api/scans", desc: "List recent scan history and results" },
      { method: "GET", path: "/api/scans/history", desc: "Paginated scan history with filters" },
      { method: "POST", path: "/api/vuln-scan", desc: "Run vulnerability assessment against a target" },
      { method: "POST", path: "/api/bot-hunter", desc: "Bot-hunting scan using TCP/DNS banner grabbing" },
    ],
  },
  {
    category: "Intelligence",
    description: "Threat intelligence derived from scan data.",
    endpoints: [
      { method: "GET", path: "/api/threats", desc: "Get aggregated threat intelligence from scan data" },
      { method: "GET", path: "/api/exposed-assets", desc: "Discovered exposed assets (simulated)" },
    ],
  },
  {
    category: "Dashboard & Audit",
    description: "Dashboard statistics and audit trail.",
    endpoints: [
      { method: "GET", path: "/api/dashboard", desc: "Aggregate dashboard statistics" },
      { method: "GET", path: "/api/executive", desc: "Executive dashboard data" },
      { method: "GET", path: "/api/audit", desc: "Unified audit log" },
    ],
  },
  {
    category: "Compliance",
    description: "Automated compliance framework assessments.",
    endpoints: [
      { method: "GET", path: "/api/compliance", desc: "Compliance scores across SOC 2, HIPAA, PCI-DSS, ISO 27001, NIST CSF, GDPR" },
    ],
  },
  {
    category: "Monitoring",
    description: "Scheduled scan policies and alert history.",
    endpoints: [
      { method: "GET", path: "/api/monitoring", desc: "List monitoring policies" },
      { method: "POST", path: "/api/monitoring", desc: "Create a monitoring policy" },
      { method: "POST", path: "/api/monitoring/execute", desc: "Execute due monitoring policies" },
      { method: "PATCH", path: "/api/monitoring", desc: "Update a monitoring policy" },
      { method: "DELETE", path: "/api/monitoring", desc: "Delete a monitoring policy" },
    ],
  },
  {
    category: "Organization",
    description: "Team and member management.",
    endpoints: [
      { method: "GET", path: "/api/members", desc: "List organization members" },
      { method: "POST", path: "/api/members", desc: "Create a new member" },
      { method: "PATCH", path: "/api/members", desc: "Update a member" },
      { method: "DELETE", path: "/api/members", desc: "Remove a member" },
      { method: "GET", path: "/api/teams", desc: "List organization teams" },
      { method: "POST", path: "/api/teams", desc: "Create a new team" },
      { method: "PATCH", path: "/api/teams", desc: "Update a team" },
      { method: "DELETE", path: "/api/teams", desc: "Delete a team" },
    ],
  },
  {
    category: "Integrations",
    description: "Third-party service integrations.",
    endpoints: [
      { method: "GET", path: "/api/integrations", desc: "List configured integrations" },
    ],
  },
  {
    category: "NHI (Non-Human Identity)",
    description: "Non-human identity discovery, assessment, and revocation.",
    endpoints: [
      { method: "GET", path: "/api/nhi", desc: "List tracked non-human identities" },
      { method: "POST", path: "/api/nhi/seed", desc: "Seed a new NHI for tracking" },
      { method: "POST", path: "/api/nhi/assess", desc: "Perform impact assessment before revocation" },
      { method: "GET", path: "/api/nhi/audit", desc: "NHI audit trail" },
      { method: "POST", path: "/api/nhi/revoke", desc: "Revoke a non-human identity" },
      { method: "POST", path: "/api/nhi/rollback", desc: "Rollback an NHI revocation" },
    ],
  },
  {
    category: "Genesis Attestation",
    description: "Cryptographic attestation and proof of assessment using Ed25519.",
    endpoints: [
      { method: "GET", path: "/api/genesis", desc: "List genesis attestation stamps" },
      { method: "POST", path: "/api/genesis", desc: "Create a new attestation stamp" },
      { method: "GET", path: "/api/genesis/verify/[stampId]", desc: "Verify a stamp signature" },
      { method: "GET", path: "/api/genesis/embed/[stampId]", desc: "Get embeddable badge HTML" },
      { method: "POST", path: "/api/genesis/revoke", desc: "Revoke a genesis stamp" },
    ],
  },
  {
    category: "Broadcast",
    description: "Security broadcast and alert system. Bulletins are fabricated for demo purposes.",
    endpoints: [
      { method: "GET", path: "/api/broadcast", desc: "List broadcasts" },
      { method: "POST", path: "/api/broadcast", desc: "Issue a broadcast" },
      { method: "GET", path: "/api/broadcast/active", desc: "Get currently active broadcast (simulated)" },
      { method: "GET", path: "/api/broadcast/verify/[id]", desc: "Verify broadcast signature" },
    ],
  },
  {
    category: "Community & Gamification",
    description: "Gamification and leaderboards.",
    endpoints: [
      { method: "GET", path: "/api/hall-of-fame", desc: "Hall of Fame entries (real micro-scan)" },
      { method: "POST", path: "/api/hall-of-fame", desc: "Submit a Hall of Fame entry" },
      { method: "GET", path: "/api/wall-of-shame", desc: "Exposed services ticker (simulated)" },
    ],
  },
  {
    category: "AI & Analysis",
    description: "AI-powered analysis engines. Several are simulated and return pattern-matched or PRNG-generated data.",
    endpoints: [
      { method: "GET", path: "/api/ai-advisor", desc: "Security knowledge base" },
      { method: "GET/POST", path: "/api/ai-leaderboard", desc: "AI model red team leaderboard (simulated)" },
      { method: "POST", path: "/api/model-redteam", desc: "Red team against an AI model (requires LLM API keys)" },
      { method: "POST", path: "/api/sandbox", desc: "Confused deputy sandbox (simulated)" },
      { method: "POST", path: "/api/cognitive-dread", desc: "Cognitive dread engine (simulated)" },
      { method: "GET", path: "/api/fear-index", desc: "CISO Fear Index value (simulated)" },
      { method: "GET", path: "/api/fear-index/feed", desc: "Fear Index RSS feed (simulated)" },
      { method: "GET", path: "/api/fear-index/history", desc: "Fear Index history (simulated)" },
    ],
  },
  {
    category: "Advanced Capabilities",
    description: "Advanced analysis engines.",
    endpoints: [
      { method: "POST", path: "/api/pqc-vault", desc: "Post-quantum cryptography analysis" },
      { method: "POST", path: "/api/cni-sentinel", desc: "Critical National Infrastructure sentinel" },
      { method: "POST", path: "/api/oblivion", desc: "Oblivion threat analysis (in-memory)" },
      { method: "GET", path: "/api/implosion", desc: "List breach impact simulations" },
      { method: "POST", path: "/api/implosion", desc: "Run a breach impact simulation" },
      { method: "DELETE", path: "/api/implosion", desc: "Delete a simulation" },
      { method: "POST", path: "/api/sovereign", desc: "Sovereign control actions (simulated)" },
    ],
  },
  {
    category: "Reports",
    description: "Generate scan reports in multiple formats.",
    endpoints: [
      { method: "GET", path: "/api/reports", desc: "Generate report (format: json/html/markdown)" },
    ],
  },
  {
    category: "System",
    description: "Local system scanning and health checks.",
    endpoints: [
      { method: "GET", path: "/api/system/health", desc: "System health check (uptime, memory, OS info)" },
      { method: "POST", path: "/api/system/scan", desc: "Run local system scanners (process, network, files, logs, registry)" },
    ],
  },
  {
    category: "Infrastructure",
    description: "System health.",
    endpoints: [
      { method: "GET", path: "/api/health", desc: "Health check with database connectivity" },
      { method: "GET", path: "/api", desc: "API root — service info" },
    ],
  },
];

export default function ApiOverviewPage() {
  const totalEndpoints = endpointGroups.reduce((acc, g) => acc + g.endpoints.length, 0);

  return (
    <div className="pt-16">
      <section className="relative py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
              API Overview
            </h1>
            <p className="text-white/50 text-sm sm:text-base max-w-2xl leading-relaxed">
              ReconPro provides <span className="text-white/80">{totalEndpoints} API endpoints</span>{" "}
              across {endpointGroups.length} categories. Endpoints requiring authentication use
              the <code className="text-xs bg-white/[0.03] px-1.5 py-0.5 rounded">x-api-key</code>{" "}
              header. Simulated endpoints are marked in their descriptions.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 mb-12">
            <h2 className="text-sm font-semibold text-white mb-4">Authentication</h2>
            <p className="text-xs text-white/40 mb-4">
              API key authentication uses SHA-256 hashing. Keys are validated against the database
              and checked for active status and expiration.
            </p>
            <code className="block text-xs font-mono text-white/60 bg-white/[0.03] px-4 py-3 rounded-lg border border-white/[0.06] overflow-x-auto">
              <span className="text-white/30">POST /api/v1/auth/validate</span>{"\n"}
              <span className="text-white/50">Body:</span>{" "}
              <span className="text-white/40">{"{ \"api_key\": \"rp_live_...\" }"}</span>
            </code>
          </div>

          <div className="space-y-10">
            {endpointGroups.map((group) => (
              <article key={group.category}>
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-semibold text-white">{group.category}</h2>
                    <span className="text-[10px] font-mono text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-md">
                      {group.endpoints.length} endpoints
                    </span>
                  </div>
                  <p className="text-xs text-white/40">{group.description}</p>
                </div>
                <div className="rounded-xl border border-white/[0.04] overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        <th className="px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider w-16">
                          Method
                        </th>
                        <th className="px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">
                          Endpoint
                        </th>
                        <th className="px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider hidden sm:table-cell">
                          Description
                        </th>
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
                              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                                ep.method === "GET" || ep.method === "GET/POST"
                                  ? "text-emerald-400/70 bg-emerald-400/10"
                                  : ep.method === "POST"
                                    ? "text-amber-400/70 bg-amber-400/10"
                                    : ep.method === "PATCH"
                                    ? "text-blue-400/70 bg-blue-400/10"
                                    : "text-red-400/70 bg-red-400/10"
                              }`}
                            >
                              {ep.method}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="text-xs font-mono text-white/60">{ep.path}</code>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-white/40 hidden sm:table-cell">
                            {ep.desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Rate Limits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-white/30 mb-1">General</p>
                <p className="text-sm font-mono text-white/70">Per-endpoint (varies)</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Scan Operations</p>
                <p className="text-sm font-mono text-white/70">3 requests / 60s</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Auth Validation</p>
                <p className="text-sm font-mono text-white/70">30 requests / 60s</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
