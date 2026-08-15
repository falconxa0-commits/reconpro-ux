// ═══════════════════════════════════════════════════════════════
// ReconPro — Complete Product Data Layer
// ═══════════════════════════════════════════════════════════════

export const product = {
  name: "ReconPro",
  tagline: "Attack Surface Intelligence Platform",
  version: "0.2.0",
  description:
    "Attack surface intelligence with real-time reconnaissance, threat detection, and compliance mapping.",
  docs: "/docs",
  license: "MIT",
  modules: 4,
  endpoints: 49,
} as const;

// ── Navigation ────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
  badge?: string;
}

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "Architecture", href: "/#architecture" },
  {
    label: "Modules",
    href: "/#modules",
    children: [
      { label: "Remote Scanners", href: "/#modules-remote" },
      { label: "Local Scanners", href: "/#modules-local" },
      { label: "Intelligence", href: "/#features" },
    ],
  },
  { label: "CLI", href: "/#cli" },
  { label: "Documentation", href: "/docs" },
  { label: "API", href: "/api-overview" },
  { label: "Enterprise", href: "/enterprise" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
];

// ── Hero Stats ────────────────────────────────────────────

export const heroStats = [
  { label: "Scanner Modules", value: "4", sub: "DNS, SSL, Port, HTTP" },
  { label: "API Endpoints", value: "49", sub: "Full REST API" },
  { label: "Dashboard", value: "8", sub: "Dedicated routes" },
  { label: "Security", value: "Active", sub: "Adversarial testing" },
  { label: "Framework", value: "Next.js 16", sub: "React 19 + TypeScript" },
  { label: "License", value: "MIT", sub: "Open source" },
];

// ── Features ───────────────────────────────────────────────

export interface Feature {
  title: string;
  description: string;
  icon: string;
  category: string;
  highlights?: string[];
}

export const features: Feature[] = [
  {
    title: "4 Scanner Modules",
    description:
      "DNS reconnaissance, SSL/TLS analysis, TCP port scanning, and HTTP header inspection — all running natively with Node.js built-in APIs and structured JSON output. No external dependencies required.",
    icon: "scan",
    category: "Scanning",
    highlights: [
      "DNS record enumeration via dns/promises",
      "SSL/TLS certificate analysis via tls module",
      "TCP port scanning via net/tls",
      "HTTP security header inspection via fetch",
    ],
  },
  {
    title: "Real-Time Scan Execution",
    description:
      "Launch scans from the web dashboard with domain input, scan type selection, and live results rendering. All scan data is persisted to SQLite via Prisma ORM.",
    icon: "terminal",
    category: "Dashboard",
    highlights: [
      "Dashboard scan input with type selection",
      "Real-time results with severity breakdown",
      "Scan history persisted to database",
      "Risk scoring per scan target",
    ],
  },
  {
    title: "Findings & Threat Intelligence",
    description:
      "Aggregate view of all findings across scans with severity filtering, radar map visualization, and asset-level correlation. Findings are extracted from real scan results.",
    icon: "shield",
    category: "Intelligence",
    highlights: [
      "Findings aggregated from all scans",
      "Severity-based filtering (Critical/High/Medium/Low/Info)",
      "Radar map visualization",
      "Asset-level grouping",
    ],
  },
  {
    title: "Compliance Reporting",
    description:
      "Automated compliance assessment across 6 frameworks: SOC 2, HIPAA, PCI-DSS, ISO 27001, NIST CSF, and GDPR. Control-level pass/fail evaluation with evidence linking.",
    icon: "file-text",
    category: "Compliance",
    highlights: [
      "6 compliance frameworks",
      "Control-level assessment",
      "Evidence linking to scan findings",
      "Overall compliance score calculation",
    ],
  },
  {
    title: "Team Management",
    description:
      "Multi-user team support with role-based access control. Create teams, invite members, assign roles (Admin, Security Lead, Analyst, Viewer), and manage permissions.",
    icon: "users",
    category: "Organization",
    highlights: [
      "Role-based access (5 roles)",
      "Team creation and management",
      "Member invitation via API",
      "Organization-scoped data isolation",
    ],
  },
  {
    title: "Monitoring Policies",
    description:
      "Schedule automated scan policies with configurable frequency (hourly, daily, weekly, monthly). Enable/disable policies and track last/next run times.",
    icon: "clock",
    category: "Automation",
    highlights: [
      "Configurable scan schedules",
      "Hourly/daily/weekly/monthly cadence",
      "Policy enable/disable toggles",
      "Target domain and scan type selection",
    ],
  },
  {
    title: "REST API",
    description:
      "49 API endpoints with API key authentication (SHA-256 hashed), per-endpoint rate limiting, SSRF protection, and comprehensive security headers. Full CRUD for scans, members, teams, monitoring, compliance, and more.",
    icon: "terminal",
    category: "API",
    highlights: [
      "49 endpoints across 17 categories",
      "SHA-256 API key authentication",
      "Per-endpoint rate limiting",
      "SSRF protection & input validation",
    ],
  },
  {
    title: "OLED Dashboard",
    description:
      "Full-featured dark-themed dashboard with bento-grid overview, dedicated routes for all major features, and responsive OLED-optimized design with glass morphism effects.",
    icon: "package",
    category: "UI",
    highlights: [
      "8 dedicated dashboard routes",
      "Bento-grid overview with live stats",
      "Sidebar + bottom dock navigation",
      "OLED-optimized dark theme",
    ],
  },
  {
    title: "Security Hardening",
    description:
      "Production-grade security with middleware auth guards, strict CSP/HSTS headers, SSRF protection, IP spoofing resistance, rate limiting, and X-Frame-Options denial across all routes.",
    icon: "shield-check",
    category: "Security",
    highlights: [
      "Cookie-based dashboard auth guard",
      "Strict Content Security Policy",
      "SSRF guard with private IP blocking",
      "Per-key rate limiting with retry-after",
    ],
  },
];

// ── Architecture ───────────────────────────────────────────

export interface ArchLayer {
  id: string;
  name: string;
  description: string;
  components: string[];
  color: string;
}

export const archLayers: ArchLayer[] = [
  {
    id: "web",
    name: "Next.js 16 App Router",
    description:
      "React 19 application with TypeScript strict mode, Tailwind CSS 4, Framer Motion animations, and shadcn/ui components. Three route groups: marketing, auth, and dashboard.",
    components: [
      "App Router (3 route groups)",
      "Server + Client Components",
      "Framer Motion animations",
      "shadcn/ui component library",
    ],
    color: "#ffffff",
  },
  {
    id: "api",
    name: "REST API Layer",
    description:
      "49 API endpoints with centralized protection middleware providing authentication, rate limiting, SSRF protection, and input validation.",
    components: [
      "49 route handlers",
      "withProtection() middleware",
      "SHA-256 API key auth",
      "Per-endpoint rate limiting",
    ],
    color: "#44aaff",
  },
  {
    id: "scanner",
    name: "Scanner Engine",
    description:
      "Core scanning orchestration layer that manages 4 implemented scanner modules, coordinates execution, and normalizes results into structured findings via native Node.js APIs.",
    components: [
      "4 scanner modules (DNS/SSL/Port/HTTP)",
      "Native Node.js APIs",
      "Result normalization",
      "Prisma ORM persistence",
    ],
    color: "#00ff88",
  },
  {
    id: "database",
    name: "Data Layer",
    description:
      "SQLite database managed by Prisma ORM with 17 models covering organizations, API keys, scans, findings, members, teams, monitoring policies, compliance, and audit trails.",
    components: [
      "SQLite embedded database",
      "Prisma 6.11.1 ORM",
      "17 database models",
      "Audit logging",
    ],
    color: "#ffaa00",
  },
  {
    id: "security",
    name: "Security Layer",
    description:
      "Multi-layered security: middleware auth guards, strict CSP/HSTS, SSRF protection with private IP blocking, IP spoofing resistance, and per-key rate limiting.",
    components: [
      "Next.js middleware guards",
      "Security headers (CSP/HSTS/X-Frame)",
      "SSRF guard with DNS validation",
      "Rate limiting with retry-after",
    ],
    color: "#ff3355",
  },
  {
    id: "dashboard",
    name: "Dashboard UI",
    description:
      "OLED-optimized dark dashboard with 8 dedicated routes, bento-grid overview, sidebar and bottom dock navigation, and real-time data visualization.",
    components: [
      "8 dashboard routes",
      "Bento-grid overview",
      "Sidebar + bottom dock",
      "Real-time scan execution",
    ],
    color: "#ffffff",
  },
];

// ── Scanner Modules ────────────────────────────────────────

export interface ScannerModule {
  name: string;
  type: "remote" | "local";
  description: string;
  capabilities: string[];
  status: "stable" | "beta" | "experimental";
  icon: string;
}

export const scannerModules: ScannerModule[] = [
  {
    name: "DNS Reconnaissance",
    type: "remote",
    description: "Comprehensive DNS enumeration, record extraction, and subdomain discovery through multiple resolution techniques.",
    capabilities: ["A/AAAA/MX/TXT/NS/SOA records", "Subdomain brute-force", "DNSSEC validation", "Zone transfer attempts"],
    status: "stable",
    icon: "globe",
  },
  {
    name: "WHOIS Intelligence",
    type: "remote",
    description: "Deep WHOIS data extraction with registrar analysis, registration timeline, and contact correlation.",
    capabilities: ["Registrar details", "Registration dates", "Name server history", "Contact correlation"],
    status: "stable",
    icon: "search",
  },
  {
    name: "Port Scanner",
    type: "remote",
    description: "TCP/UDP port scanning with service fingerprinting, version detection, and banner grabbing.",
    capabilities: ["Top 100/1000/Full ports", "Service version detection", "Banner grabbing", "OS fingerprinting"],
    status: "stable",
    icon: "radio",
  },
  {
    name: "SSL/TLS Analyzer",
    type: "remote",
    description: "Certificate analysis, cipher suite evaluation, and protocol compliance checking against modern security standards.",
    capabilities: ["Certificate chain analysis", "Cipher suite grading", "Protocol compliance (TLS 1.3)", "HSTS/OCSP verification"],
    status: "stable",
    icon: "shield",
  },
  {
    name: "Directory Enumeration",
    type: "remote",
    description: "Intelligent web directory and file discovery with custom wordlists, extensions, and recursive scanning.",
    capabilities: ["Custom wordlist support", "Extension fuzzing", "Recursive scanning", "Response analysis"],
    status: "stable",
    icon: "folder",
  },
  {
    name: "Subdomain Discovery",
    type: "remote",
    description: "Multi-source subdomain enumeration using DNS, certificates, search engines, and passive reconnaissance.",
    capabilities: ["Certificate transparency", "Search engine passive", "DNS permutation", "Brute-force discovery"],
    status: "stable",
    icon: "network",
  },
  {
    name: "HTTP Header Analysis",
    type: "remote",
    description: "Security header evaluation, technology fingerprinting, and missing header detection for web applications.",
    capabilities: ["Security header audit", "Tech stack detection", "Missing header alerts", "CSP analysis"],
    status: "stable",
    icon: "file-code",
  },
  {
    name: "Vulnerability Scanner",
    type: "remote",
    description: "Automated vulnerability detection with CVE matching, version-based analysis, and known exploit correlation.",
    capabilities: ["CVE database matching", "Version-based detection", "Exploit correlation", "Risk scoring"],
    status: "stable",
    icon: "bug",
  },
  {
    name: "Geolocation Mapping",
    type: "remote",
    description: "IP geolocation with ASN mapping, network topology visualization, and infrastructure footprinting.",
    capabilities: ["IP geolocation", "ASN lookup", "Network mapping", "Infrastructure analysis"],
    status: "stable",
    icon: "map-pin",
  },
  {
    name: "Email Intelligence",
    type: "remote",
    description: "Email harvesting, verification, and breach correlation for social engineering risk assessment.",
    capabilities: ["Email harvesting", "SMTP verification", "Breach database check", "Pattern analysis"],
    status: "stable",
    icon: "mail",
  },
  {
    name: "File System Analyzer",
    type: "local",
    description: "Local file system scanning for sensitive data exposure, configuration analysis, and security posture assessment.",
    capabilities: ["Sensitive file detection", "Config file analysis", "Permission auditing", "Secret scanning"],
    status: "stable",
    icon: "hard-drive",
  },
  {
    name: "Network Interface Scanner",
    type: "local",
    description: "Local network interface enumeration, ARP table analysis, and network topology discovery.",
    capabilities: ["Interface enumeration", "ARP table analysis", "Network mapping", "MAC vendor lookup"],
    status: "stable",
    icon: "wifi",
  },
  {
    name: "Process Analyzer",
    type: "local",
    description: "Running process enumeration with security analysis, privilege auditing, and anomaly detection.",
    capabilities: ["Process enumeration", "Privilege auditing", "Anomaly detection", "Resource monitoring"],
    status: "beta",
    icon: "cpu",
  },
  {
    name: "Log Analyzer",
    type: "local",
    description: "Security log parsing, event correlation, and threat indicator extraction from system and application logs.",
    capabilities: ["Log parsing engine", "Event correlation", "IOC extraction", "Timeline reconstruction"],
    status: "beta",
    icon: "file-text",
  },
  {
    name: "Registry Scanner",
    type: "local",
    description: "System registry inspection for security misconfigurations, persistence mechanisms, and policy compliance.",
    capabilities: ["Registry inspection", "Persistence detection", "Policy compliance", "Misconfiguration audit"],
    status: "beta",
    icon: "database",
  },
  {
    name: "Certificate Store",
    type: "local",
    description: "Local certificate store analysis, trust chain validation, and expired certificate detection.",
    capabilities: ["Store enumeration", "Trust chain validation", "Expiry monitoring", "Anomaly detection"],
    status: "experimental",
    icon: "key",
  },
];

// ── API Quick Reference ─────────────────────────────────────

export interface CLICommand {
  name: string;
  description: string;
  category: string;
  example: string;
  flags?: string[];
}

export const cliCommands: CLICommand[] = [
  {
    name: "POST /api/scan",
    description: "Execute a reconnaissance scan against a target domain.",
    category: "Scanning",
    example: '{ "domain": "example.com", "scanType": "full" }',
    flags: ["domain (required)", "scanType (dns/ssl/port/http/full)"],
  },
  {
    name: "GET /api/scans",
    description: "Retrieve scan history with results, findings, and risk scores.",
    category: "Scanning",
    example: "GET /api/scans",
    flags: [],
  },
  {
    name: "POST /api/v1/auth/validate",
    description: "Validate an API key and retrieve organization context.",
    category: "Authentication",
    example: '{ "api_key": "rp_live_..." }',
    flags: ["api_key (required)"],
  },
  {
    name: "GET /api/compliance",
    description: "Retrieve compliance scores across all configured frameworks.",
    category: "Compliance",
    example: "GET /api/compliance",
    flags: [],
  },
  {
    name: "GET /api/members",
    description: "List organization members with roles and team memberships.",
    category: "Organization",
    example: "GET /api/members",
    flags: [],
  },
  {
    name: "GET /api/monitoring",
    description: "List monitoring policies with schedule and run status.",
    category: "Automation",
    example: "GET /api/monitoring",
    flags: [],
  },
  {
    name: "GET /api/health",
    description: "System health check with database connectivity and version.",
    category: "Infrastructure",
    example: "GET /api/health",
    flags: [],
  },
];

// ── Benchmarks ────────────────────────────────────────────

export const benchmarks: { name: string; reconpro: string; nmap: string; nessus: string; improvement: string }[] = [];

// ── Pricing ───────────────────────────────────────────────

export const pricingPlans = [
  {
    name: "Community",
    price: "Free",
    period: "forever",
    description: "Full-featured open-source reconnaissance for individual researchers and small teams.",
    features: [
      "All 4 scanner modules",
      "REST API access",
      "Dashboard with 8 routes",
      "Compliance reporting",
      "Team management",
      "Monitoring policies",
      "Security hardening",
      "Community support",
      "MIT license",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "annual",
    description: "Production-grade deployment with priority support, SLA guarantees, and advanced capabilities.",
    features: [
      "Everything in Community",
      "Priority support (4h SLA)",
      "SSO / SAML integration",
      "Audit logging",
      "Compliance frameworks",
      "Custom scanner modules",
      "Dedicated infrastructure",
      "Team management",
      "API rate limits: unlimited",
      "On-premise deployment",
      "Custom training",
      "SLA guarantee: 99.9%",
    ],
    cta: "Contact Sales",
    highlighted: true,
  },
];

// ── Roadmap ─────────────────────────────────────────────────

export interface RoadmapItem {
  quarter: string;
  items: { title: string; status: "shipped" | "in-progress" | "planned" }[];
}

export const roadmap: RoadmapItem[] = [
  {
    quarter: "Q3 2026",
    items: [
      { title: "ReconPro v0.2.0 GA Release", status: "shipped" },
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
];

// ── Testimonials / Social Proof ───────────────────────────

export const testimonials: { quote: string; author: string; role: string; company: string }[] = [];

// ── Integrations ──────────────────────────────────────────

export const integrations = [
  { name: "GitHub", description: "Repository scanning, dependency analysis, and CODEOWNERS enforcement." },
  { name: "GitLab", description: "Pipeline integration for automated security scanning on every merge request." },
  { name: "Jenkins", description: "Plugin for continuous attack surface monitoring in CI/CD pipelines." },
  { name: "Slack", description: "Real-time alerts, scan summaries, and threat notifications in channels." },
  { name: "Jira", description: "Automatic ticket creation for discovered vulnerabilities with severity mapping." },
  { name: "Splunk", description: "Forward intelligence data to SIEM for correlation with existing security events." },
  { name: "Elastic", description: "Index scan results in Elasticsearch for powerful search and visualization." },
  { name: "Vault", description: "Secure credential management for authenticated scan operations." },
];

// ── Terminal Demo Lines ───────────────────────────────────

export const terminalDemo = [
  { type: "output", text: "", delay: 0 },
  {
    type: "banner",
    text: "  ╔══════════════════════════════════════════════════╗",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ║                                                  ║",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ║   ██████  ███████ ██ ███    ██ ████████         ║",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ║  ██    ██ ██      ██ ████   ██    ██            ║",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ║  ██    ██ ███████ ██ ██ ██  ██    ██            ║",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ║  ██    ██      ██ ██ ██  ██ ██    ██            ║",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ║   ██████  ███████ ██ ██   ████    ██   v0.2.0  ║",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ║                                                  ║",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ║   Attack Surface Intelligence Platform         ║",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ║                                                  ║",
    delay: 100,
  },
  {
    type: "banner",
    text: "  ╚══════════════════════════════════════════════════╝",
    delay: 100,
  },
  { type: "output", text: "", delay: 200 },
  {
    type: "prompt",
    text: "$ reconpro scan ",
    delay: 400,
  },
  {
    type: "flag",
    text: "--target example.com ",
    delay: 300,
  },
  {
    type: "flag",
    text: "--modules dns,ssl,port,http ",
    delay: 300,
  },
  {
    type: "flag",
    text: "--output json",
    delay: 200,
  },
  { type: "output", text: "", delay: 300 },
  { type: "muted", text: "[*] Initializing scanner engine...", delay: 200 },
  { type: "muted", text: "[*] Loading 4 scanner modules...", delay: 150 },
  { type: "success", text: "[+] DNS enumeration complete — 12 subdomains found", delay: 600 },
  { type: "success", text: "[+] SSL analysis — grade: A+ (TLS 1.3, HSTS confirmed)", delay: 500 },
  { type: "success", text: "[+] Port scan complete — 8 open ports identified", delay: 800 },
  { type: "success", text: "[+] HTTP headers — 4 misconfigurations detected", delay: 500 },
  { type: "output", text: "", delay: 200 },
  { type: "muted", text: "[*] Saving results to database...", delay: 300 },
  { type: "accent", text: "[i] Risk score: 45/100", delay: 300 },
  { type: "output", text: "", delay: 200 },
  {
    type: "success",
    text: "[✓] Scan complete — 4 modules run | 23 findings | risk: 45/100",
    delay: 300,
  },
  { type: "output", text: "", delay: 100 },
  { type: "muted", text: "[*] Report saved to: ./reports/example_com_20260813.json", delay: 300 },
  {
    type: "prompt",
    text: "$ ",
    delay: 500,
  },
];
