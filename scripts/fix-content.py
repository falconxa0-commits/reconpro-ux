#!/usr/bin/env python3
"""Fix content.ts — content honesty pass."""

path = "/home/z/my-project/src/data/content.ts"

with open(path, "r") as f:
    content = f.read()

# 1. Fix product object — remove Python claims, fake module counts
old_product = """export const product = {
  name: "ReconPro",
  tagline: "Attack Surface Intelligence Platform",
  version: "0.2.0",
  description:
    "Attack surface intelligence with real-time reconnaissance, threat detection, and compliance mapping.",
  docs: "/docs",
  license: "MIT",
  python: "3.10+",
  deps: 3,
  loc: "N/A",
  modules: 16,
  commands: 45,
  tests: "N/A",
  downloads: "Open Source",
  stars: "Open Source",
  contributors: "N/A",
} as const;"""

new_product = """export const product = {
  name: "ReconPro",
  tagline: "Attack Surface Intelligence Platform",
  version: "0.2.0",
  description:
    "Attack surface intelligence with real-time reconnaissance, threat detection, and compliance mapping.",
  docs: "/docs",
  license: "MIT",
  modules: 4,
  endpoints: 35,
} as const;"""

content = content.replace(old_product, new_product)

# 2. Fix broken #modules-intel anchor
content = content.replace(
    '{ label: "Intelligence", href: "/#modules-intel" },',
    '{ label: "Intelligence", href: "/#features" },'
)

# 3. Fix heroStats
old_hero = """export const heroStats = [
  { label: "Scanner Modules", value: "16", sub: "10 remote + 6 local" },
  { label: "API Endpoints", value: "47", sub: "Full REST API" },
  { label: "Test Suite", value: "Active", sub: "Continuous testing" },
  { label: "Security", value: "Active", sub: "Adversarial testing" },
  { label: "Dependencies", value: "3", sub: "Minimal footprint" },
  { label: "License", value: "MIT", sub: "Open source" },
];"""

new_hero = """export const heroStats = [
  { label: "Scanner Modules", value: "4", sub: "DNS, SSL, Port, HTTP" },
  { label: "API Endpoints", value: "35", sub: "Full REST API" },
  { label: "Test Suite", value: "Active", sub: "22 test files" },
  { label: "Security", value: "Active", sub: "Adversarial testing" },
  { label: "Framework", value: "Next.js 16", sub: "React 19 + TypeScript" },
  { label: "License", value: "MIT", sub: "Open source" },
];"""

content = content.replace(old_hero, new_hero)

# 4. Fix features — remove fabricated AI agent/autonomous claims
# Replace "16 Scanner Modules" feature
content = content.replace(
    'title: "16 Scanner Modules",',
    'title: "4 Scanner Modules",'
)
content = content.replace(
    '"Comprehensive coverage across 10 remote and 6 local scanner modules. DNS, WHOIS, port scanning, SSL analysis, directory enumeration, subdomain discovery, and more — all with structured output."',
    '"DNS reconnaissance, SSL/TLS analysis, port scanning, and HTTP header inspection — all running natively with Node.js APIs and structured JSON output."'
)
content = content.replace(
    '"10 remote scanners",\n      "6 local scanners",\n      "Structured JSON output",\n      "Parallel execution engine",',
    '"DNS record enumeration",\n      "SSL/TLS certificate analysis",\n      "TCP port scanning",\n      "HTTP header inspection",'
)

# Replace "45 CLI Commands" feature
content = content.replace(
    '"45 CLI Commands",',
    '"REST API",'
)
content = content.replace(
    '"Full-spectrum command coverage from quick reconnaissance to deep intelligence operations. Argparse-based with rich formatting, interactive prompts, progress indicators, and beautiful tabular output."',
    '"35 API endpoints with API key authentication (SHA-256 hashed), rate limiting, SSRF protection, and comprehensive security headers. Full CRUD for teams, members, monitoring, and compliance."'
)
content = content.replace(
    '"Argparse-based architecture",\n      "Rich-formatted output",\n      "Interactive prompts",\n      "Progress & status indicators",',
    '"35 endpoints across 17 categories",\n      "SHA-256 API key authentication",\n      "Per-key rate limiting",\n      "SSRF protection & input validation",'
)

# Replace "Minimal Dependencies" feature
content = content.replace(
    '"Minimal Dependencies",',
    '"Web Dashboard",'
)
content = content.replace(
    '"Only 3 required dependencies (rich, textual, requests). Zero bloat. Tested codebase. Every dependency is intentional, audited, and justified."',
    '"Full-featured dark-themed dashboard with real-time scan execution, findings visualization, compliance reporting, team management, and monitoring policies."'
)
content = content.replace(
    '"3 required dependencies",\n      "Tested codebase with comprehensive coverage",\n      "Zero bloat architecture",\n      "Fully audited supply chain",',
    '"8 dedicated dashboard routes",\n      "Real-time scan execution",\n      "Bento-grid overview with live stats",\n      "OLED-optimized dark theme",'
)

# 5. Fix terminal demo version
content = content.replace("v1.0.0", "v0.2.0")

# 6. Replace benchmarks with empty array (unsourced claims)
content = content.replace(
    """export const benchmarks = [
  { name: "Full Scan", reconpro: "~60s", nmap: "~12m", nessus: "~8m", improvement: "Est. 10x faster" },
  { name: "DNS Enumeration", reconpro: "~2s", nmap: "~9s", nessus: "~5s", improvement: "Est. 4x faster" },
  { name: "Port Scan (Top 1000)", reconpro: "~4s", nmap: "~22s", nessus: "~19s", improvement: "Est. 5x faster" },
  { name: "SSL Analysis", reconpro: "~1s", nmap: "~4s", nessus: "~6s", improvement: "Est. 4x faster" },
  { name: "Vulnerability Scan", reconpro: "~8s", nmap: "~45s", nessus: "~32s", improvement: "Est. 4x faster" },
  { name: "Memory Usage", reconpro: "~34 MB", nmap: "~156 MB", nessus: "~412 MB", improvement: "~12x smaller" },
  { name: "Install Size", reconpro: "~12 MB", nmap: "~89 MB", nessus: "~340 MB", improvement: "~28x smaller" },
  { name: "Binary Size", reconpro: "~4.2 MB", nmap: "N/A", nessus: "N/A", improvement: "Single binary" },
];""",
    "export const benchmarks: { name: string; reconpro: string; nmap: string; nessus: string; improvement: string }[] = [];"
)

# 7. Fix pricing plans
content = content.replace(
    '"All 16 scanner modules",',
    '"All 4 scanner modules",'
)
content = content.replace(
    '"45 CLI commands",',
    '"REST API access",'
)
content = content.replace(
    '"Autonomous planner",',
    '"Dashboard with 8 routes",'
)
content = content.replace(
    '"Agent runtime",',
    '"Compliance reporting",'
)
content = content.replace(
    '"Knowledge graph",',
    '"Team management",'
)
content = content.replace(
    '"Evidence correlation",',
    '"Monitoring policies",'
)
content = content.replace(
    '"Executive reports",',
    '"Security hardening",'
)

# 8. Fix roadmap — remove v1.0.0 shipped claim
old_roadmap = """export const roadmap: RoadmapItem[] = [
  {
    quarter: "Q3 2026",
    items: [
      { title: "ReconPro v1.0.0 GA Release", status: "shipped" },
      { title: "Autonomous Planner v2", status: "shipped" },
      { title: "Agent Runtime v3", status: "shipped" },
      { title: "Knowledge Graph v2", status: "in-progress" },
      { title: "Plugin SDK Alpha", status: "in-progress" },
    ],
  },
  {
    quarter: "Q4 2026",
    items: [
      { title: "Web Dashboard", status: "planned" },
      { title: "Real-time Collaboration", status: "planned" },
      { title: "Custom Module Marketplace", status: "planned" },
      { title: "CI/CD Integration Pack", status: "planned" },
    ],
  },
  {
    quarter: "Q1 2027",
    items: [
      { title: "API Gateway", status: "planned" },
      { title: "Multi-tenant Architecture", status: "planned" },
      { title: "ML-powered Threat Scoring", status: "planned" },
      { title: "Compliance Auto-Remediation", status: "planned" },
    ],
  },
];"""

new_roadmap = """export const roadmap: RoadmapItem[] = [
  {
    quarter: "v0.2.0 (Current)",
    items: [
      { title: "Web Dashboard with 8 routes", status: "shipped" },
      { title: "REST API with 35 endpoints", status: "shipped" },
      { title: "DNS/SSL/Port/HTTP scanning", status: "shipped" },
      { title: "API key authentication (SHA-256)", status: "shipped" },
      { title: "Prisma ORM with SQLite", status: "shipped" },
    ],
  },
  {
    quarter: "v0.3.0 (Planned)",
    items: [
      { title: "Email/password authentication", status: "planned" },
      { title: "Self-service registration", status: "planned" },
      { title: "API key generation from dashboard", status: "planned" },
      { title: "Two-factor authentication", status: "planned" },
    ],
  },
  {
    quarter: "v1.0.0 (Planned)",
    items: [
      { title: "Billing and subscription management", status: "planned" },
      { title: "SSO via SAML 2.0 and OIDC", status: "planned" },
      { title: "SOC 2 Type II certification", status: "planned" },
      { title: "Additional scanner modules", status: "planned" },
    ],
  },
];"""

content = content.replace(old_roadmap, new_roadmap)

with open(path, "w") as f:
    f.write(content)

print("content.ts fixed successfully")
