import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Overview | ReconPro",
  description:
    "ReconPro REST API overview. Base URL, authentication, and all 47 endpoints grouped by category: Scanning, Intelligence, Organization, NHI, Genesis, and more.",
};

const endpointGroups = [
  {
    category: "Scanning",
    description: "Initiate and manage reconnaissance scans.",
    endpoints: [
      { method: "POST", path: "/api/v1/scans", desc: "Create a new scan" },
      { method: "GET", path: "/api/v1/scans", desc: "List all scans" },
      { method: "GET", path: "/api/v1/scans/:id", desc: "Get scan details" },
      { method: "DELETE", path: "/api/v1/scans/:id", desc: "Delete a scan" },
      { method: "POST", path: "/api/v1/scans/:id/cancel", desc: "Cancel running scan" },
      { method: "GET", path: "/api/v1/scans/:id/results", desc: "Get scan results" },
      { method: "GET", path: "/api/v1/scans/:id/events", desc: "Scan event stream" },
      { method: "POST", path: "/api/v1/scans/bulk", desc: "Create bulk scan" },
      { method: "GET", path: "/api/v1/scans/:id/export", desc: "Export scan results" },
      { method: "POST", path: "/api/v1/scans/:id/compare", desc: "Compare scan results" },
      { method: "GET", path: "/api/v1/scans/history", desc: "Scan history" },
      { method: "POST", path: "/api/v1/scans/schedule", desc: "Schedule recurring scan" },
    ],
  },
  {
    category: "Intelligence",
    description: "Domain and IP intelligence gathering.",
    endpoints: [
      { method: "GET", path: "/api/v1/intel/dns/:domain", desc: "DNS lookup (all record types)" },
      { method: "GET", path: "/api/v1/intel/whois/:domain", desc: "WHOIS lookup" },
      { method: "GET", path: "/api/v1/intel/rdap/:domain", desc: "RDAP lookup" },
      { method: "GET", path: "/api/v1/intel/ssl/:domain", desc: "SSL certificate details" },
      { method: "GET", path: "/api/v1/intel/reverse/:ip", desc: "Reverse DNS lookup" },
      { method: "GET", path: "/api/v1/intel/asn/:ip", desc: "ASN and BGP lookup" },
      { method: "GET", path: "/api/v1/intel/headers/:url", desc: "HTTP header analysis" },
      { method: "GET", path: "/api/v1/intel/tech/:url", desc: "Technology detection" },
    ],
  },
  {
    category: "Organization",
    description: "Subdomains, related domains, and organizational asset discovery.",
    endpoints: [
      { method: "GET", path: "/api/v1/org/subdomains/:domain", desc: "Enumerate subdomains" },
      { method: "GET", path: "/api/v1/org/related/:domain", desc: "Related domains" },
      { method: "GET", path: "/api/v1/org/emails/:domain", desc: "Harvest email addresses" },
      { method: "GET", path: "/api/v1/org/social/:domain", desc: "Social media profiles" },
      { method: "GET", path: "/api/v1/org/services/:domain", desc: "Discovered services" },
      { method: "GET", path: "/api/v1/org/certificates/:domain", desc: "Certificate transparency" },
      { method: "GET", path: "/api/v1/org/dnssec/:domain", desc: "DNSSEC validation" },
    ],
  },
  {
    category: "NHI",
    description: "Network Host Intelligence for IP-based analysis.",
    endpoints: [
      { method: "GET", path: "/api/v1/nhi/ports/:target", desc: "Port scan" },
      { method: "GET", path: "/api/v1/nhi/services/:ip", desc: "Service detection" },
      { method: "GET", path: "/api/v1/nhi/banners/:ip/:port", desc: "Banner grabbing" },
      { method: "GET", path: "/api/v1/nhi/geolocate/:ip", desc: "IP geolocation" },
      { method: "GET", path: "/api/v1/nhi/traceroute/:target", desc: "Traceroute" },
    ],
  },
  {
    category: "Genesis",
    description: "Framework initialization and system management.",
    endpoints: [
      { method: "GET", path: "/api/v1/genesis/status", desc: "System status" },
      { method: "GET", path: "/api/v1/genesis/modules", desc: "List scanner modules" },
      { method: "POST", path: "/api/v1/genesis/modules/:id/config", desc: "Configure module" },
      { method: "GET", path: "/api/v1/genesis/health", desc: "Health check" },
      { method: "GET", path: "/api/v1/genesis/metrics", desc: "System metrics" },
      { method: "GET", path: "/api/v1/genesis/version", desc: "Version info" },
    ],
  },
  {
    category: "Authentication",
    description: "API key management and user authentication.",
    endpoints: [
      { method: "POST", path: "/api/v1/auth/keys", desc: "Create API key" },
      { method: "GET", path: "/api/v1/auth/keys", desc: "List API keys" },
      { method: "DELETE", path: "/api/v1/auth/keys/:id", desc: "Revoke API key" },
      { method: "POST", path: "/api/v1/auth/keys/:id/rotate", desc: "Rotate API key" },
    ],
  },
  {
    category: "Utility",
    description: "Utility endpoints for export, validation, and configuration.",
    endpoints: [
      { method: "GET", path: "/api/v1/utils/validate/:type", desc: "Validate input (domain, IP, etc)" },
      { method: "GET", path: "/api/v1/utils/export/:format", desc: "Export data in format" },
      { method: "GET", path: "/api/v1/utils/webhooks", desc: "List webhooks" },
      { method: "POST", path: "/api/v1/utils/webhooks", desc: "Create webhook" },
      { method: "DELETE", path: "/api/v1/utils/webhooks/:id", desc: "Delete webhook" },
    ],
  },
];

export default function ApiOverviewPage() {
  const totalEndpoints = endpointGroups.reduce(
    (acc, g) => acc + g.endpoints.length,
    0
  );

  return (
    <div className="pt-16">
      <section className="relative py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
              API Overview
            </h1>
            <p className="text-white/50 text-sm sm:text-base max-w-2xl leading-relaxed">
              ReconPro provides a RESTful API with{" "}
              <span className="text-white/80">{totalEndpoints} endpoints</span>{" "}
              across 7 categories. All endpoints require authentication.
            </p>
          </div>

          {/* Authentication */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 mb-12">
            <h2 className="text-sm font-semibold text-white mb-4">
              Authentication
            </h2>
            <p className="text-xs text-white/40 mb-4">
              All API requests require an API key passed in the request header.
              Keys are created via the dashboard or the authentication endpoints.
            </p>
            <code className="block text-xs font-mono text-white/60 bg-white/[0.03] px-4 py-3 rounded-lg border border-white/[0.06] overflow-x-auto">
              <span className="text-white/30">GET /api/v1/scans</span>{" "}
              <span className="text-white/40">HTTP/1.1</span>
              {"\n"}
              <span className="text-white/50">Host:</span>{" "}
              <span className="text-white/40">api.reconpro.dev</span>
              {"\n"}
              <span className="text-white/50">x-api-key:</span>{" "}
              <span className="text-white/40">rp_live_abc123...</span>
              {"\n"}
              <span className="text-white/50">Content-Type:</span>{" "}
              <span className="text-white/40">application/json</span>
            </code>
          </div>

          {/* Endpoint Groups */}
          <div className="space-y-10">
            {endpointGroups.map((group) => (
              <article key={group.category}>
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-semibold text-white">
                      {group.category}
                    </h2>
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
                                ep.method === "GET"
                                  ? "text-emerald-400/70 bg-emerald-400/10"
                                  : ep.method === "POST"
                                  ? "text-amber-400/70 bg-amber-400/10"
                                  : "text-red-400/70 bg-red-400/10"
                              }`}
                            >
                              {ep.method}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="text-xs font-mono text-white/60">
                              {ep.path}
                            </code>
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

          {/* Rate Limits */}
          <div className="mt-16 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="text-sm font-semibold text-white mb-4">
              Rate Limits
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-white/30 mb-1">Free (Local)</p>
                <p className="text-sm font-mono text-white/70">
                  Unlimited (local)
                </p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Pro</p>
                <p className="text-sm font-mono text-white/70">
                  5,000 req/day
                </p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Enterprise</p>
                <p className="text-sm font-mono text-white/70">
                  Custom (unlimited)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
