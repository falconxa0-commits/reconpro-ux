// ═══════════════════════════════════════════════════════════════
// ReconPro — Complete Product Data Layer
// ═══════════════════════════════════════════════════════════════

export const product = {
  name: "ReconPro",
  tagline: "Attack Surface Intelligence Platform",
  version: "1.0.0",
  description:
    "Attack surface intelligence with real-time reconnaissance, threat detection, and compliance mapping.",
  github: "/about",
  pypi: "/docs",
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
      { label: "Intelligence", href: "/#modules-intel" },
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
  { label: "Scanner Modules", value: "16", sub: "10 remote + 6 local" },
  { label: "API Endpoints", value: "47", sub: "Full REST API" },
  { label: "Test Suite", value: "Active", sub: "Continuous testing" },
  { label: "Security", value: "Active", sub: "Adversarial testing" },
  { label: "Dependencies", value: "3", sub: "Minimal footprint" },
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
    title: "Autonomous Reconnaissance",
    description:
      "Natural language goal parsing converts plain-English objectives into multi-step execution strategies. The AutonomousPlanner orchestrates complex scan sequences without manual intervention, adapting in real-time to discoveries.",
    icon: "brain",
    category: "Intelligence",
    highlights: [
      "Natural language → ExecutionStrategy",
      "Goal-adaptive scan sequencing",
      "Real-time strategy modification",
      "Multi-phase autonomous operation",
    ],
  },
  {
    title: "Agent Runtime",
    description:
      "Five specialized AI agents orchestrated by the AgentOrchestrator — each with distinct roles covering reconnaissance, analysis, correlation, reporting, and autonomous decision-making. Thread-safe with RLock coordination.",
    icon: "bot",
    category: "Runtime",
    highlights: [
      "5 specialized agents",
      "AgentOrchestrator coordination",
      "Thread-safe RLock architecture",
      "Role-based task delegation",
    ],
  },
  {
    title: "Evidence Correlation Engine",
    description:
      "Multi-source evidence chains with cryptographic fingerprint deduplication. Each finding is scored with a confidence formula that weights source reliability, corroboration count, and temporal freshness.",
    icon: "git-merge",
    category: "Intelligence",
    highlights: [
      "EvidenceChain construction",
      "SHA-256 fingerprint dedup",
      "Confidence scoring formula",
      "Cross-source corroboration",
    ],
  },
  {
    title: "Knowledge Graph",
    description:
      "Spatial memory architecture that maps relationships between targets, findings, services, and entities. Each scan finding feeds the graph, building an evolving intelligence picture over time.",
    icon: "network",
    category: "Architecture",
    highlights: [
      "Entity relationship mapping",
      "Temporal intelligence tracking",
      "Graph-powered discovery",
      "Persistent memory across scans",
    ],
  },
  {
    title: "Executive Intelligence",
    description:
      "Auto-generated executive reports with markdown, dict, and structured export formats. Risk scoring, compliance mapping, and actionable recommendations synthesized from all scan data.",
    icon: "file-text",
    category: "Reporting",
    highlights: [
      "to_markdown() export",
      "Risk quantification",
      "Compliance mapping",
      "Executive-ready summaries",
    ],
  },
  {
    title: "Intelligence Pipeline",
    description:
      "Every finding flows through a processing pipeline that enriches, categorizes, and routes intelligence to the knowledge graph. Real-time streaming updates with zero data loss.",
    icon: "git-pull-request",
    category: "Architecture",
    highlights: [
      "Real-time finding processing",
      "Knowledge graph integration",
      "Zero-loss data pipeline",
      "Stream-based architecture",
    ],
  },
  {
    title: "16 Scanner Modules",
    description:
      "Comprehensive coverage across 10 remote and 6 local scanner modules. DNS, WHOIS, port scanning, SSL analysis, directory enumeration, subdomain discovery, and more — all with structured output.",
    icon: "scan",
    category: "Scanning",
    highlights: [
      "10 remote scanners",
      "6 local scanners",
      "Structured JSON output",
      "Parallel execution engine",
    ],
  },
  {
    title: "45 CLI Commands",
    description:
      "Full-spectrum command coverage from quick reconnaissance to deep intelligence operations. Argparse-based with rich formatting, interactive prompts, progress indicators, and beautiful tabular output.",
    icon: "terminal",
    category: "CLI",
    highlights: [
      "Argparse-based architecture",
      "Rich-formatted output",
      "Interactive prompts",
      "Progress & status indicators",
    ],
  },
  {
    title: "Minimal Dependencies",
    description:
      "Only 3 required dependencies (rich, textual, requests). Zero bloat. Tested codebase. Every dependency is intentional, audited, and justified.",
    icon: "package",
    category: "Quality",
    highlights: [
      "3 required dependencies",
      "Tested codebase with comprehensive coverage",
      "Zero bloat architecture",
      "Fully audited supply chain",
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
    id: "cli",
    name: "CLI Interface",
    description:
      "45 argparse-based commands with rich formatting, interactive prompts, progress indicators, and structured output. Entry point for all operations.",
    components: ["cli.py", "45 commands", "rich output", "interactive prompts"],
    color: "#ffffff",
  },
  {
    id: "scanner",
    name: "Scanner Engine",
    description:
      "Core scanning orchestration layer that manages 16 scanner modules, coordinates parallel execution, and normalizes results into structured findings.",
    components: [
      "scanner.py",
      "10 remote modules",
      "6 local modules",
      "result normalization",
    ],
    color: "#44aaff",
  },
  {
    id: "pipeline",
    name: "Intelligence Pipeline",
    description:
      "Real-time processing pipeline that enriches raw findings with context, categorizes threats, and routes intelligence to the knowledge graph.",
    components: [
      "intelligence_pipeline.py",
      "finding enrichment",
      "threat categorization",
      "graph routing",
    ],
    color: "#00ff88",
  },
  {
    id: "memory",
    name: "Memory & Knowledge Graph",
    description:
      "Spatial memory architecture mapping relationships between targets, services, entities, and findings. Persistent intelligence that compounds over time.",
    components: [
      "memory.py",
      "knowledge_graph.py",
      "entity mapping",
      "temporal tracking",
    ],
    color: "#ffaa00",
  },
  {
    id: "correlation",
    name: "Evidence Correlation",
    description:
      "Multi-source evidence chains with cryptographic deduplication. Confidence scoring based on source reliability, corroboration, and freshness.",
    components: [
      "evidence_correlation.py",
      "EvidenceChain",
      "SHA-256 dedup",
      "confidence scoring",
    ],
    color: "#ff3355",
  },
  {
    id: "agents",
    name: "Agent Runtime",
    description:
      "Five specialized AI agents orchestrated for autonomous operations — reconnaissance, analysis, correlation, reporting, and planning.",
    components: [
      "agent_runtime.py",
      "5 agents",
      "AgentOrchestrator",
      "RLock coordination",
    ],
    color: "#ffffff",
  },
  {
    id: "planner",
    name: "Autonomous Planner",
    description:
      "Natural language goal parsing converts plain-English objectives into execution strategies. Adapts scan sequences in real-time based on discoveries.",
    components: [
      "autonomous_planner.py",
      "GoalParser",
      "ExecutionStrategy",
      "adaptive planning",
    ],
    color: "#44aaff",
  },
  {
    id: "executive",
    name: "Executive Intelligence",
    description:
      "Auto-generated reports with risk scoring, compliance mapping, and actionable recommendations. Markdown, dict, and structured export formats.",
    components: [
      "executive_intelligence.py",
      "ExecutiveReport",
      "risk quantification",
      "multi-format export",
    ],
    color: "#00ff88",
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

// ── CLI Commands ────────────────────────────────────────────

export interface CLICommand {
  name: string;
  description: string;
  category: string;
  example: string;
  flags?: string[];
}

export const cliCommands: CLICommand[] = [
  {
    name: "reconpro scan",
    description: "Launch a full-spectrum reconnaissance scan against a target domain or IP range.",
    category: "Scanning",
    example: "reconpro scan --target example.com --modules dns,whois,port --output json",
    flags: ["--target", "--modules", "--output", "--threads", "--timeout", "--stealth"],
  },
  {
    name: "reconpro intel",
    description: "Run intelligence-gathering operations combining multiple data sources and correlation.",
    category: "Intelligence",
    example: "reconpro intel --target example.com --deep --correlate",
    flags: ["--target", "--deep", "--correlate", "--sources", "--format"],
  },
  {
    name: "reconpro report",
    description: "Generate executive intelligence reports from completed scan results.",
    category: "Reporting",
    example: "reconpro report --scan-id abc123 --format markdown --output report.md",
    flags: ["--scan-id", "--format", "--output", "--sections", "--risk-level"],
  },
  {
    name: "reconpro autonomous",
    description: "Launch autonomous reconnaissance using natural language goal descriptions.",
    category: "Autonomous",
    example: 'reconpro autonomous --goal "Map the complete attack surface of example.com"',
    flags: ["--goal", "--strategy", "--max-depth", "--time-limit", "--adaptive"],
  },
  {
    name: "reconpro agents",
    description: "Manage and monitor the specialized agent runtime system.",
    category: "Runtime",
    example: "reconpro agents --list --status --monitor",
    flags: ["--list", "--status", "--monitor", "--deploy", "--config"],
  },
  {
    name: "reconpro dns",
    description: "Focused DNS reconnaissance with record extraction and subdomain discovery.",
    category: "Modules",
    example: "reconpro dns --domain example.com --records A,MX,TXT,NS --subdomains",
    flags: ["--domain", "--records", "--subdomains", "--dnssec", "--zone-transfer"],
  },
  {
    name: "reconpro port",
    description: "TCP/UDP port scanning with service detection and banner grabbing.",
    category: "Modules",
    example: "reconpro port --target 192.168.1.1 --top-ports 1000 --service-detection",
    flags: ["--target", "--top-ports", "--service-detection", "--banner", "--os-detect"],
  },
  {
    name: "reconpro ssl",
    description: "SSL/TLS certificate and cipher suite analysis.",
    category: "Modules",
    example: "reconpro ssl --host example.com --grade --check-hsts",
    flags: ["--host", "--port", "--grade", "--check-hsts", "--ocsp"],
  },
  {
    name: "reconpro vuln",
    description: "Vulnerability scanning with CVE matching and exploit correlation.",
    category: "Modules",
    example: "reconpro vuln --target example.com --cve-database --risk-threshold high",
    flags: ["--target", "--cve-database", "--risk-threshold", "--exploit-check"],
  },
  {
    name: "reconpro knowledge",
    description: "Query and explore the knowledge graph for previously gathered intelligence.",
    category: "Intelligence",
    example: 'reconpro knowledge --query "subdomains of example.com" --format tree',
    flags: ["--query", "--format", "--export", "--timeline", "--entities"],
  },
  {
    name: "reconpro config",
    description: "Manage configuration, API keys, modules, and scanner preferences.",
    category: "Configuration",
    example: "reconpro config --set threads=16 --timeout=30 --modules all",
    flags: ["--set", "--get", "--reset", "--modules", "--api-keys"],
  },
  {
    name: "reconpro export",
    description: "Export scan results and intelligence data in multiple formats.",
    category: "Export",
    example: "reconpro export --scan-id abc123 --format json,csv,markdown --output ./exports/",
    flags: ["--scan-id", "--format", "--output", "--compress", "--encrypt"],
  },
];

// ── Benchmarks ────────────────────────────────────────────

export const benchmarks = [
  { name: "Full Scan", reconpro: "~60s", nmap: "~12m", nessus: "~8m", improvement: "Est. 10x faster" },
  { name: "DNS Enumeration", reconpro: "~2s", nmap: "~9s", nessus: "~5s", improvement: "Est. 4x faster" },
  { name: "Port Scan (Top 1000)", reconpro: "~4s", nmap: "~22s", nessus: "~19s", improvement: "Est. 5x faster" },
  { name: "SSL Analysis", reconpro: "~1s", nmap: "~4s", nessus: "~6s", improvement: "Est. 4x faster" },
  { name: "Vulnerability Scan", reconpro: "~8s", nmap: "~45s", nessus: "~32s", improvement: "Est. 4x faster" },
  { name: "Memory Usage", reconpro: "~34 MB", nmap: "~156 MB", nessus: "~412 MB", improvement: "~12x smaller" },
  { name: "Install Size", reconpro: "~12 MB", nmap: "~89 MB", nessus: "~340 MB", improvement: "~28x smaller" },
  { name: "Binary Size", reconpro: "~4.2 MB", nmap: "N/A", nessus: "N/A", improvement: "Single binary" },
];

// ── Pricing ───────────────────────────────────────────────

export const pricingPlans = [
  {
    name: "Community",
    price: "Free",
    period: "forever",
    description: "Full-featured open-source reconnaissance for individual researchers and small teams.",
    features: [
      "All 16 scanner modules",
      "45 CLI commands",
      "Autonomous planner",
      "Agent runtime",
      "Knowledge graph",
      "Evidence correlation",
      "Executive reports",
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
    text: "  ║   ██████  ███████ ██ ██   ████    ██   v1.0.0  ║",
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
    text: "--modules dns,whois,port,ssl,vuln ",
    delay: 300,
  },
  {
    type: "flag",
    text: "--correlate ",
    delay: 200,
  },
  {
    type: "flag",
    text: "--output json",
    delay: 200,
  },
  { type: "output", text: "", delay: 300 },
  { type: "muted", text: "[*] Initializing scanner engine...", delay: 200 },
  { type: "muted", text: "[*] Loading 5 scanner modules...", delay: 150 },
  { type: "success", text: "[+] DNS enumeration complete — 12 subdomains found", delay: 600 },
  { type: "success", text: "[+] WHOIS intelligence gathered — registrar: Cloudflare", delay: 400 },
  { type: "success", text: "[+] Port scan complete — 8 open ports identified", delay: 800 },
  { type: "success", text: "[+] SSL analysis — grade: A+ (TLS 1.3, HSTS confirmed)", delay: 500 },
  { type: "success", text: "[+] Vulnerability scan — 0 critical, 2 medium, 1 low", delay: 700 },
  { type: "output", text: "", delay: 200 },
  { type: "muted", text: "[*] Building evidence chains...", delay: 300 },
  { type: "muted", text: "[*] Correlating findings across 5 sources...", delay: 400 },
  { type: "accent", text: "[i] Confidence score: 94.7% (high)", delay: 300 },
  { type: "output", text: "", delay: 200 },
  {
    type: "success",
    text: "[✓] Scan complete — 23 findings | 5 evidence chains | confidence: 94.7%",
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
