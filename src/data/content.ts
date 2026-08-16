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
  modules: 14,
  endpoints: 55,
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
  { label: "Scanner Modules", value: "14", sub: "DNS, SSL, Port, HTTP, Vuln, WHOIS, Subdomain, DirEnum, Email, Cert, Geo, Process, Network, File" },
  { label: "API Endpoints", value: "55", sub: "Full REST API" },
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
    title: "14 Scanner Modules",
    description:
      "DNS reconnaissance, SSL/TLS analysis, TCP port scanning, HTTP header inspection, vulnerability scanning, WHOIS lookup, subdomain discovery, directory enumeration, email intelligence, certificate analysis, geolocation mapping, process analysis, network interface scanning, and file system auditing — all running natively with Node.js built-in APIs.",
    icon: "scan",
    category: "Scanning",
    highlights: [
      "14 scanner modules (9 remote + 5 local)",
      "DNS record enumeration via dns/promises",
      "SSL/TLS certificate analysis via tls module",
      "TCP port scanning via net/tls",
      "HTTP security header inspection via fetch",
      "WHOIS lookup via RDAP protocol",
      "Subdomain discovery via DNS permutation + CT logs",
      "Directory enumeration via HTTP probing",
      "Email harvesting via MX + SMTP VRFY",
      "Certificate analysis via CT logs + TLS connection",
      "Geolocation via ip-api.com",
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
      "55 API endpoints with API key authentication (SHA-256 hashed), per-endpoint rate limiting, SSRF protection, and comprehensive security headers. Full CRUD for scans, members, teams, monitoring, compliance, and more.",
    icon: "terminal",
    category: "API",
    highlights: [
      "55 endpoints across 18 categories",
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
      "55 API endpoints with centralized protection middleware providing authentication, rate limiting, SSRF protection, and input validation.",
    components: [
      "55 route handlers",
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
      "Core scanning orchestration layer that manages 14 implemented scanner modules, coordinates execution, and normalizes results into structured findings via native Node.js APIs.",
    components: [
      "14 scanner modules (DNS/SSL/Port/HTTP/Vuln/WHOIS/Subdomain/DirEnum/Email/Cert/Geo/Process/Network/File/Log/Registry)",
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
  status: "implemented" | "planned" | "beta" | "experimental";
  icon: string;
  /** Whether this module has a working implementation in v0.2.0 */
  implemented: boolean;
}

export const scannerModules: ScannerModule[] = [
  // ── Implemented in v0.2.0 ──────────────────────────────────
  {
    name: "DNS Reconnaissance",
    type: "remote",
    description: "Comprehensive DNS enumeration, record extraction, and subdomain discovery through multiple resolution techniques.",
    capabilities: ["A/AAAA/MX/TXT/NS records", "DMARC policy detection", "SPF record analysis", "Subdomain enumeration via DNS"],
    implemented: true,
    status: "implemented",
    icon: "globe",
  },
  {
    name: "SSL/TLS Analyzer",
    type: "remote",
    description: "Certificate analysis, cipher suite evaluation, and protocol compliance checking against modern security standards.",
    capabilities: ["Certificate chain analysis", "Cipher suite grading", "Protocol compliance (TLS 1.3)", "HSTS verification"],
    implemented: true,
    status: "implemented",
    icon: "shield",
  },
  {
    name: "Port Scanner",
    type: "remote",
    description: "TCP port scanning with service fingerprinting, version detection, and banner grabbing using native Node.js APIs.",
    capabilities: ["Top 100 ports scan", "Service version detection", "Banner grabbing", "Open port identification"],
    implemented: true,
    status: "implemented",
    icon: "radio",
  },
  {
    name: "HTTP Header Analysis",
    type: "remote",
    description: "Security header evaluation, technology fingerprinting, and missing header detection for web applications.",
    capabilities: ["Security header audit", "Missing header alerts", "Technology detection", "Redirect chain analysis"],
    implemented: true,
    status: "implemented",
    icon: "file-code",
  },
  {
    name: "Vulnerability Scanner",
    type: "remote",
    description: "Automated vulnerability detection with CVE matching, version-based analysis, and known exploit correlation.",
    capabilities: ["TCP service probing", "TLS configuration analysis", "HTTP security testing", "Risk scoring"],
    implemented: true,
    status: "implemented",
    icon: "bug",
  },
  // ── Additional implemented modules ───────────────────────────
  {
    name: "WHOIS Intelligence",
    type: "remote",
    description: "Deep WHOIS data extraction via RDAP protocol with registrar analysis, registration timeline, and expiry monitoring.",
    capabilities: ["RDAP protocol lookup", "Registrar details", "Registration/expiry dates", "DNSSEC detection"],
    implemented: true,
    status: "implemented",
    icon: "search",
  },
  {
    name: "Subdomain Discovery",
    type: "remote",
    description: "Multi-source subdomain enumeration using DNS permutation, certificate transparency logs, and zone transfer attempts.",
    capabilities: ["DNS permutation (50 prefixes)", "Certificate transparency", "Zone transfer attempts", "IP resolution"],
    implemented: true,
    status: "implemented",
    icon: "network",
  },
  {
    name: "Directory Enumeration",
    type: "remote",
    description: "Intelligent web directory and file discovery with 80-path wordlist and response classification.",
    capabilities: ["80-path wordlist", "HEAD request probing", "Response classification", "Sensitive file detection"],
    implemented: true,
    status: "implemented",
    icon: "folder",
  },
  {
    name: "Email Intelligence",
    type: "remote",
    description: "Email harvesting, MX record verification, SMTP VRFY checking, and SPF/DMARC policy analysis.",
    capabilities: ["MX record lookup", "SMTP VRFY verification", "SPF/DMARC analysis", "Pattern-based generation"],
    implemented: true,
    status: "implemented",
    icon: "mail",
  },
  {
    name: "Certificate Analysis",
    type: "remote",
    description: "Comprehensive certificate analysis via CT logs, TLS connection inspection, and historical certificate tracking.",
    capabilities: ["CT log discovery", "TLS connection analysis", "Historical certificate tracking", "SAN sprawl detection"],
    implemented: true,
    status: "implemented",
    icon: "key",
  },
  {
    name: "Geolocation Mapping",
    type: "remote",
    description: "IP geolocation with ASN mapping, cloud provider detection, CDN identification, and infrastructure footprinting.",
    capabilities: ["IP geolocation", "ASN lookup", "Cloud provider detection", "CDN identification"],
    implemented: true,
    status: "implemented",
    icon: "map-pin",
  },
  {
    name: "File System Analyzer",
    type: "local",
    description: "Local file system scanning for sensitive data exposure, configuration analysis, and security posture assessment.",
    capabilities: ["Sensitive file detection", "Config file analysis", "Permission auditing", "Secret scanning"],
    implemented: true,
    status: "implemented",
    icon: "hard-drive",
  },
  {
    name: "Network Interface Scanner",
    type: "local",
    description: "Local network interface enumeration, DNS configuration analysis, and public IP detection.",
    capabilities: ["Interface enumeration", "DNS configuration", "Public IP detection", "CIDR computation"],
    implemented: true,
    status: "implemented",
    icon: "wifi",
  },
  {
    name: "Process Analyzer",
    type: "local",
    description: "Running process enumeration with security analysis, privilege auditing, and environment variable scanning.",
    capabilities: ["Process enumeration", "Root process detection", "Suspicious process scanning", "Environment audit"],
    implemented: true,
    status: "implemented",
    icon: "cpu",
  },
  {
    name: "Log Analyzer",
    type: "local",
    description: "Security log parsing, event correlation, brute-force detection, and threat indicator extraction from system logs.",
    capabilities: ["Log parsing engine", "Brute-force detection", "Event correlation", "IOC extraction"],
    implemented: true,
    status: "implemented",
    icon: "file-text",
  },
  {
    name: "Registry Scanner",
    type: "local",
    description: "System configuration inspection for ASLR, shadow file access, SSH hardening, and user account auditing.",
    capabilities: ["ASLR check", "Shadow file access test", "SSH configuration audit", "User account analysis"],
    implemented: true,
    status: "implemented",
    icon: "database",
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
    name: "GET /api/scans/history",
    description: "Retrieve paginated scan history with severity and domain filters.",
    category: "Scanning",
    example: "GET /api/scans/history?page=1&limit=20&severity=high",
    flags: ["page", "limit (max 100)", "severity", "domain"],
  },
  {
    name: "POST /api/v1/auth/validate",
    description: "Validate an API key and retrieve organization context.",
    category: "Authentication",
    example: '{ "api_key": "rp_live_..." }',
    flags: ["api_key (required)"],
  },
  {
    name: "POST /api/auth/register",
    description: "Create a new account with automatic API key generation.",
    category: "Authentication",
    example: '{ "name": "John Doe", "email": "john@example.com", "password": "..." }',
    flags: ["name (required)", "email (required)", "password (min 8 chars)"],
  },
  {
    name: "GET /api/reports",
    description: "Generate scan reports in JSON, HTML, or Markdown format.",
    category: "Reporting",
    example: "GET /api/reports?format=html&scanId=scan_id",
    flags: ["format (json/html/markdown)", "scanId (optional)"],
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
    name: "POST /api/system/scan",
    description: "Run local system scanners (process, network, file, logs, registry).",
    category: "System",
    example: '{ "scanners": ["process", "network"] }',
    flags: ["scanners (optional, defaults to all)"],
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
      "All 14 scanner modules",
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
      { title: "REST API with 55 endpoints", status: "shipped" },
      { title: "Dashboard with 8 dedicated routes", status: "shipped" },
      { title: "Compliance engine (6 frameworks)", status: "in-progress" },
      { title: "Monitoring policy scheduler", status: "in-progress" },
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
  { type: "muted", text: "[*] Loading 14 scanner modules...", delay: 150 },
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
    text: "[✓] Scan complete — 5 modules run | 23 findings | risk: 45/100",
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
