# ReconPro v7–v9 Master Architecture Plan

> **Current State**: v6.0.0 — 28 files, ~12,200 lines, urllib-based sync HTTP, ThreadPoolExecutor concurrency, 27 CLI subcommands, rule-based agent with optional LLM, pure-Python fallback graph.

---

## Phase 1 — v7.0: Async Core & Evasion Engine

### 1.1 Asynchronous Engine Core
**Problem**: All HTTP goes through `urllib.request` (sync). Max throughput: ~100 req/s per thread. Blitz uses ThreadPoolExecutor (4-8 workers default). Can't scale to thousands of concurrent connections.

**Architecture**:
```
reconpro/
  async_http.py      (NEW — ~400 lines)
    - AsyncSession: wraps aiohttp ClientSession with connection pooling
    - AdaptiveLimiter: token-bucket that auto-tunes based on 429/timeout rates
    - RawSocket: optional raw SYN scanner using scapy (if installed)
    - Backward compat: sync wrapper so existing modules keep working

  engine.py          (NEW — ~300 lines) 
    - ScanEngine: replaces scan() in scanner.py
    - Manages async task queue, module execution, result aggregation
    - Runs modules concurrently (not sequentially like today)
    - Emits events: on_finding, on_module_start, on_module_complete
    - Progress callbacks for TUI integration
```

**Migration Strategy**:
- Add `aiohttp>=3.9` as optional dep (`pip install reconpro[async]`)
- Keep urllib as fallback for zero-dep mode
- Rewrite scanner.py to use engine.py internally
- Each module gets `async_run()` alongside existing `run()`
- Modules that don't have async versions get wrapped in `asyncio.to_thread()`

**Target**: 10,000+ concurrent connections, 50x throughput improvement

### 1.2 Low-Level Raw Packet Assembly
**Problem**: Port scanning uses urllib-based HTTP probes on top-20 ports. Can't do real SYN scans, UDP probes, or custom flag manipulation.

**Architecture**:
```
reconpro/
  raw_sockets.py     (NEW — ~350 lines)
    - SynScanner: raw TCP SYN scan (requires root/scapy)
    - UdpProber: custom UDP payload sender
    - ArpSpy: ARP table discovery on local network
    - TtlAnalyzer: TTL-based OS fingerprinting
    - Graceful fallback: if no scapy/root, falls back to connect() scan

  modules/
    portscan.py     (NEW — ~250 lines, replaces port checks in recon.py/host.py)
    - Full 65,535-port scan mode
    - Service version detection via banner grabbing
    - OS fingerprinting via TTL/probe responses
```

**Dependencies**: `scapy>=2.5` (optional, `[raw]` extra)

### 1.3 Adaptive Rate-Limiting Engine
**Problem**: Current `RateLimiter` in http.py is a simple token bucket (fixed rate). Doesn't adapt to target behavior.

**Architecture**:
```
reconpro/async_http.py  (extends existing)
  AdaptiveLimiter:
    - Tracks: response_time_ema, error_rate_ema, timeout_rate
    - On 429/503: multiply rate by 0.5, add jitter
    - On timeout: reduce concurrent connections by 25%
    - On fast responses (<200ms): increase rate by 10% (up to max)
    - Per-target rate tracking (separate limiter per domain)
    - Config: min_rps, max_rps, backoff_factor, recovery_time
```

### 1.4 Behavioral Footprint Shifting
**Problem**: Every request has identical structure — same headers, same timing, same TLS fingerprint. Easy to detect and block.

**Architecture**:
```
reconpro/
  evasion.py         (NEW — ~300 lines)
    - HeaderRotator: cycles through 50+ real browser UA strings
    - TlsFingerprint: randomizes TLS cipher suites, extensions order
    - TimingJitter: adds gaussian-distributed delays (mean=0, stddev=configurable)
    - PathCanonicalization: alternates between /path, /./path, /../ normalization
    - CookieJar: maintains per-target cookie state across requests
    - RefererChain: simulates realistic navigation patterns
    - ProfileManager: loads evasion profiles from ~/.reconpro/profiles/
```

### 1.5 Decentralized Proxy Routing
**Problem**: All scans originate from one IP. Large-scale audits need distributed origins.

**Architecture**:
```
reconpro/
  proxy.py           (NEW — ~250 lines)
    - ProxyPool: manages list of proxies (HTTP/SOCKS5/rotate)
    - Sources: file input, ProxyList API, TOR circuit rotation
    - Health checking: async probe of all proxies, auto-removal of dead ones
    - RotatingStrategy: round-robin, random, least-connections, geo-distributed
    - Integration: AsyncSession accepts proxy_pool parameter

  modules/
    distributed.py   (NEW — ~200 lines)
    - Split target list across proxy origins
    - Aggregate results with origin metadata
    - Detect IP-based blocking by comparing results across proxies
```

---

## Phase 2 — v7.5: Unified Intelligence Layer

### 2.1 Unified Memory Graphs
**Problem**: knowledge_graph.py is only called from nexus_agent tool. Swarm agents can't share discoveries. Adversarial loop doesn't persist state between rounds.

**Architecture**:
```
reconpro/
  memory.py          (REWRITE knowledge_graph.py → ~600 lines)
    - UnifiedMemoryStore: single source of truth for all agents
    - Backends: JSON file (default), SQLite (optional), Redis (optional)
    - Sub-systems:
      - KnowledgeGraph: asset/vuln/relationship graph
      - FindingStore: time-series of all findings per target
      - AgentBlackboard: shared state for active swarm/adversarial runs
      - CredentialVault: encrypted storage for discovered credentials
    - Events: all writes emit to connected agents
    - Query language: graph traversal + temporal filters

  swarm.py           (MODIFY — connect to UnifiedMemoryStore)
  adversarial.py     (MODIFY — connect to UnifiedMemoryStore)
  nexus_agent.py     (MODIFY — connect to UnifiedMemoryStore)
```

### 2.2 Multi-Vector Attack-Path Chaining
**Problem**: Each finding is independent. A low-severity info leak + missing header + open redirect could chain into account takeover, but ReconPro doesn't see the connection.

**Architecture**:
```
reconpro/
  chain_engine.py    (NEW — ~500 lines)
    - AttackPathFinder: takes KnowledgeGraph, finds compound attack paths
    - ChainRules: 50+ predefined chain patterns:
      - Info leak + open redirect → credential phishing URL
      - Missing CSP + XSS payload → stored XSS
      - CORS wildcard + authenticated API → cross-origin data theft
      - Cloud metadata SSRF + IAM misconfig → full cloud takeover
      - JWT no-verify + weak signing key → token forgery
    - LLM-assisted chain discovery: send graph to LLM, ask "what compound paths exist?"
    - Scoring: chain severity = max(child severities) * 1.5 + path_length_bonus
    - Output: ChainReport with step-by-step attack narrative

  modules/
    chain_analysis.py (NEW — wraps chain_engine for scan integration)
```

### 2.3 Inter-Language AST Tracking (Taint Analysis)
**Problem**: Current ast_analyzer.py checks single files in isolation. Can't track `user_input = request.get("x")` flowing through 3 Python files into a SQL query.

**Architecture**:
```
reconpro/modules/
  ast_analyzer.py   (MAJOR REWRITE — ~1200 lines)
    - TaintTracker: inter-procedural, inter-file taint analysis
      - Phase 1: Build call graph (who calls whom)
      - Phase 2: Identify sources (user input, env vars, file reads, DB)
      - Phase 3: Propagate taint through assignments, function calls, returns
      - Phase 4: Check if tainted data reaches sinks (SQL, eval, exec, os.system)
    - Supported languages:
      - Python: real AST walking (already exists, upgrade to taint)
      - JavaScript/TypeScript: tree-sitter based (optional dep)
      - Go: tree-sitter based (optional dep)
    - Cross-language: if Python calls subprocess(["node", "x.js", user_input]) → track across boundary
    - Output: TaintReport with full data flow path: source → propagation → sink

  deps: tree-sitter>=0.21 (optional, `[ast-full]` extra)
```

### 2.4 Context-Aware Payload Fuzzing
**Problem**: gorgon.py uses 3 hardcoded injection payloads per category. Doesn't adapt to the target's framework.

**Architecture**:
```
reconpro/
  fuzzer.py          (NEW — ~600 lines)
    - TechDetector: enhanced version detection (X-Powered-By, headers, HTML, JS libs, meta generator)
    - PayloadDB: 2000+ payloads organized by:
      - Category (SQLi, XSS, SSTI, SSRF, path traversal, etc.)
      - Framework (Django, Flask, Express, Spring, Rails, Laravel, WordPress, etc.)
      - Encoding (plain, URL-encoded, double-encoded, Unicode, HTML entity)
      - WAF bypass (Space2Comment, case alternation, Unicode normalization)
    - FuzzSession: given a target + detected tech, select top-50 most relevant payloads
    - ResponseAnalyzer: classify responses (reflected, error-based, time-based, blind)
    - Integration: called by gorgon.py, auth.py, chain.py with target-specific payloads

  data/
    payloads/         (NEW directory — ~50KB of payload files)
      sqli.json, xss.json, ssti.json, ssrf.json, path_traversal.json
      waf_bypass.json, framework_specific.json
```

### 2.5 Agent Tool Customization (Plugin SDK)
**Problem**: Nexus agent has 18 hardcoded tools. Users can't add custom tools without editing source.

**Architecture**:
```
reconpro/
  tool_sdk.py        (NEW — ~300 lines)
    - @tool decorator: registers a function as an agent tool
    - ToolSpec: name, description, parameters (JSON Schema), examples
    - ToolRegistry (extend existing): loads from:
      1. Built-in tools (existing 18)
      2. Plugin tools (~/.reconpro/tools/*.py)
      3. External CLI wrappers (configured in tools.yaml)
    - External CLI integration:
      ```yaml
      # ~/.reconpro/tools.yaml
      tools:
        - name: nuclei
          description: "Run Nuclei template scanner"
          command: "nuclei -target {target} -json"
          parser: "json"  # how to parse output into Findings
        - name: ffuf
          description: "Fuzz directories with ffuf"
          command: "ffuf -u {target}/FUZZ -w {wordlist} -fc 404"
          parser: "regex:.*(?P<url>https?://\S+)"
      ```
    - LLM tool selection: agent sees all available tools, picks based on goal
```

---

## Phase 3 — v8.0: Autonomous Defense & Advanced Scanning

### 3.1 Autonomous Defense Generation
**Problem**: adversarial.py generates text remediation suggestions. Doesn't produce deployable fixes.

**Architecture**:
```
reconpro/
  defense.py         (NEW — ~500 lines)
    - PatchGenerator: for each finding, generates:
      - WAF rules (ModSecurity SecRule, AWS WAF JSON, Cloudflare rules)
      - Code patches (diff format, applicable with `patch` command)
      - Infrastructure fixes ( Terraform/CloudFormation changes, K8s manifests)
      - Nginx/Apache config snippets
      - CI/CD pipeline additions (pre-commit hooks, GitHub Actions)
    - DefenseBundle: collection of all patches for a scan, with:
      - apply.sh: one-click apply all fixes
      - rollback.sh: revert all changes
      - verification_scan: re-scan command to confirm fixes worked
    - LLM-enhanced: if API key available, generate context-aware patches
    - Rule-based fallback: 30+ patch templates for common categories
```

### 3.2 Infrastructure-as-Code (IaC) Auditing
**Problem**: No cloud/infra scanning. Terraform misconfigs, overly permissive IAM roles, exposed S3 buckets go undetected.

**Architecture**:
```
reconpro/modules/
  iac_audit.py      (NEW — ~600 lines)
    - TerraformParser: parses .tf and .tfstate files (HCL format)
    - CloudFormationParser: parses YAML/JSON templates
    - DockerfileParser: parses Dockerfiles for security issues
    - K8sManifestParser: parses Kubernetes YAML manifests
    - Checks (100+ rules):
      - S3 bucket policies (public access, encryption, versioning)
      - IAM policies (admin access, wildcard actions, no MFA)
      - Security groups (0.0.0.0/0 ingress, open high ports)
      - K8s (privileged containers, hostPID, mount sensitive paths, no network policy)
      - Docker (running as root, no healthcheck, stale base images, secrets in ENV)
      - TLS configuration (expired certs, weak ciphers, no HSTS)
    - Output: Finding per misconfig with exact file:line reference

  modules/
    cloud_recon.py   (NEW — ~400 lines)
    - AWS metadata SSRF (enhanced from nhi.py)
    - Azure IMDS probing
    - GCP metadata probing
    - Cloud asset discovery (S3 buckets, Azure blobs, GCP storage)
    - DNS record enumeration for cloud services
```

### 3.3 Dynamic API Blueprint Reconstruction
**Problem**: recon.py checks a hardcoded list of ~30 common API paths. Doesn't discover custom/undocumented endpoints.

**Architecture**:
```
reconpro/
  api_discovery.py   (NEW — ~500 lines)
    - JsEndpointExtractor: parses JS bundles to find API URLs
      - Regex: /api/v[0-9]+/, fetch(), axios.get(), fetchJson()
      - Source map parsing (if .map files available)
      - Webpack chunk analysis
    - GraphQLSchemaExtractor: introspection query, schema dumps
    - GRPCReflection: gRPC server reflection to enumerate services/methods
    - OpenAPISpecParser: parse /swagger.json, /openapi.yaml, /docs
    - LinkCrawler: follow all links, forms, and JS-discovered URLs
    - ParameterFuzzer: for each endpoint, fuzz query/body/header params
    - AuthMatrix: test each endpoint with no auth, valid auth, invalid auth, cross-user auth
    - Output: APIBlueprint with endpoints, methods, params, auth requirements
```

### 3.4 Granular Secret Entropy Scoring
**Problem**: dev.py uses 13 regex patterns. High false-positive rate — matches random strings that aren't secrets.

**Architecture**:
```
reconpro/
  entropy.py         (NEW — ~200 lines)
    - ShannonEntropy: calculates entropy of a string
    - SecretClassifier: ML-inspired scoring:
      - High entropy (>4.0) + known prefix (AKIA, ghp_, gsk_, xoxb-, etc.) → CRITICAL
      - High entropy + assignment context (API_KEY=, password=, token=) → HIGH
      - High entropy + no context → MEDIUM (likely false positive)
      - Low entropy + known pattern (password123) → HIGH
      - Format validation: AWS keys (20+40 chars, specific regex), GitHub tokens (36 hex), JWT structure
    - ContextAnalysis: checks surrounding code for:
      - Variable names (contains: key, secret, token, password, cred, auth)
      - File names (.env, credentials, config, secrets)
      - Adjacent comments (TODO: remove, FIXME, temporary)
    - Integration: replaces _check_hardcoded_secrets() in dev.py and _scan_for_tokens() in nhi.py
```

### 3.5 Container Sandbox Escape Analysis
**Problem**: dev.py has basic Docker Compose checks. Doesn't analyze Dockerfiles, K8s manifests, or evaluate escape vectors.

**Architecture**:
```
reconpro/modules/
  container_sec.py   (NEW — ~500 lines)
    - DockerfileAnalyzer:
      - Runs as root (USER root / no USER directive)
      - Secrets in ENV/ARG/COPY
      - No .dockerignore (sensitive files copied in)
      - Stale/vulnerable base images (checks CVE database)
      - COPY --from= pulling untrusted stages
    - K8sAnalyzer:
      - Privileged containers (securityContext.privileged: true)
      - hostPID, hostNetwork, hostIPC
      - Mounting sensitive host paths (/var/run/docker.sock, /, /etc)
      - No resource limits (CPU/memory)
      - No network policy (default allow-all)
      - Service account token auto-mount
      - Image pull policy: Always vs IfNotPresent
    - EscapeVectorEvaluator:
      - Combines findings to assess escape likelihood
      - privileged + hostPID + docker.sock mount → CRITICAL (container escape)
      - No network policy + exposed service → HIGH (lateral movement)
```

---

## Phase 4 — v8.5: CI/CD & Collaborative Operations

### 4.1 Native VCS Webhook Listeners
**Problem**: server.py is a basic HTTP server. No webhook support.

**Architecture**:
```
reconpro/
  webhooks.py        (NEW — ~400 lines)
    - GitHubWebhookHandler: handles push, pull_request events
    - GitLabWebhookHandler: handles merge_request, push events
    - EventRouter: maps events to scan actions:
      - pull_request.opened → scan changed files with ast_analyzer + dev
      - push to main → full project scan + diff with previous
      - push to any branch → incremental scan of changed files
    - Secret validation: HMAC-SHA256 signature verification
    - Queuing: async task queue for concurrent webhook processing
    - Status reporting: post scan results back as PR comments / commit statuses

  server.py          (MODIFY — add webhook routes)
    POST /webhook/github
    POST /webhook/gitlab
    GET /webhook/config  (list active webhook configs)
```

### 4.2 Dynamic Delta Reporting
**Problem**: history.py has basic diff (new/fixed/persistent findings). Doesn't map findings to specific commits or show code-level changes.

**Architecture**:
```
reconpro/
  delta.py           (NEW — ~350 lines)
    - DeltaReporter: compares two scan results with:
      - Git integration: map findings to the commit that introduced them
      - Blame analysis: git blame on the vulnerable file:line
      - Author attribution: who introduced the vulnerability
      - Time tracking: how long each finding has existed
      - Trend analysis: severity/count trends over N scans
      - Risk velocity: new critical findings per week
    - DeltaReport formats:
      - Markdown (PR comment friendly)
      - JSON (machine readable)
      - SARIF (GitHub Code Scanning compatible)
      - HTML (standalone report)
```

### 4.3 Bi-Directional Jira & Slack Synchronization
**Problem**: No external integration. Findings stay in the terminal.

**Architecture**:
```
reconpro/
  integrations/
    __init__.py
    jira.py           (NEW — ~300 lines)
      - JiraClient: create/update/search issues
      - Auto-create: critical/high findings → Jira tickets
      - Fields: summary, description, severity, component, labels, attachments
      - Sync: re-scan → update ticket status (fixed if finding gone)
      - Config: ~/.reconpro/integrations/jira.yaml

    slack.py          (NEW — ~200 lines)
      - SlackClient: post messages to channels
      - Real-time alerts: critical findings → immediate Slack notification
      - Daily/weekly digest: summary of all new findings
      - Interactive: Slash commands (/reconpro scan, /reconpro status)
      - Config: ~/.reconpro/integrations/slack.yaml

    github.py         (NEW — ~250 lines)
      - GitHubClient: create issues, post PR comments, commit statuses
      - Auto-file: findings as GitHub issues with labels
      - PR comments: scan results as PR review comments
      - Code Scanning: upload SARIF to GitHub Code Scanning API
      - Config: ~/.reconpro/integrations/github.yaml (PAT token)

  deps: jira>=3.0, slack-sdk>=3.0 (optional, `[integrations]` extra)
```

### 4.4 Interactive Knowledge Graph UI (Browser-Based)
**Problem**: knowledge_graph.py outputs text stats to terminal. No visual interaction.

**Architecture**:
```
reconpro/
  graph_ui.py        (NEW — ~600 lines)
    - Generates a self-contained HTML file with:
      - D3.js force-directed graph visualization
      - Nodes: color-coded by type (target=blue, vuln=red, asset=green)
      - Edges: labeled by relationship type
      - Click node: shows details panel (findings, CVEs, remediation)
      - Click edge: shows relationship description
      - Search bar: filter nodes by type/severity/name
      - Path finder: click two nodes → highlights all paths between them
      - Blast radius: click a node → highlights all reachable vulnerabilities
    - Served via: `reconpro graph --action visual` opens browser
    - Also: embedded in HTML reports as an interactive section
    - No server needed — pure client-side D3.js in a single HTML file
```

### 4.5 Air-Gapped Deployment Packages
**Problem**: Requires pip + network for install. Can't run in isolated environments.

**Architecture**:
```
build/
  bundle.py         (NEW — ~200 lines)
    - Creates a single-file executable using PyInstaller:
      - `python build/bundle.py --output reconpro.bin`
      - Bundles: all Python deps, all modules, all payload data
      - Strips: textual, openai, anthropic, networkx (not needed for core)
      - Result: ~15MB standalone binary, zero external deps
    - Also creates: 
      - ZIP bundle: reconpro-portable.zip (Python + all code, no pip needed)
      - Docker image: multi-stage build, ~50MB final image

  Dockerfile          (NEW)
    FROM python:3.12-slim AS builder
    COPY . /app
    RUN pip install . && strip unnecessary deps
    FROM python:3.12-slim
    COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/
    COPY --from=builder /app/reconpro /app/reconpro
    ENTRYPOINT ["python", "-m", "reconpro.cli"]
```

---

## Phase 5 — v9.0: Next-Gen Features (My Additions)

### 5.1 Live Traffic Interception & Replay
**Why**: Most recon tools only see the current snapshot. Real attacks exploit timing — intercepting live traffic reveals runtime secrets, session tokens, and API patterns that static analysis misses.

**Architecture**:
```
reconpro/
  mitm.py            (NEW — ~500 lines)
    - ProxyInterceptor: MITM proxy that logs all HTTP/HTTPS traffic
    - Based on mitmproxy library (optional dep)
    - Auto-discovers: API endpoints, auth tokens, session cookies, hidden params
    - TrafficReplay: replay requests with modifications (auth removal, param tampering)
    - SessionHijackTest: replay session tokens from different origins
    - Integration: `reconpro intercept --port 8080` starts proxy, then `reconpro analyze-traffic`
```

### 5.2 Passive DNS & Historical Intel
**Why**: Current subdomain discovery is active (CT logs + DNS brute). Passive DNS databases contain years of historical records that reveal deprecated subdomains still pointing to old infrastructure.

**Architecture**:
```
reconpro/
  passive_intel.py   (NEW — ~300 lines)
    - PassiveDNS: queries VirusTotal, SecurityTrails, Shodan APIs for historical DNS
    - WaybackMachine: fetches archived versions of target pages
    - CertificateTransparency: enhanced CT log search with historical cert analysis
    - DeprecationDetector: finds subdomains with stale DNS (pointing to decommissioned IPs)
    - TechHistory: tracks technology changes over time (WordPress → Laravel migration = exposed wp-admin)
    - Integration: `reconpro passive example.com`

  deps: shodan>=1.25 (optional, `[intel]` extra)
```

### 5.3 Real-Time Collaboration (Multi-Operator)
**Why**: Security audits are team efforts. Multiple pentesters should see each other's findings in real-time.

**Architecture**:
```
reconpro/
  collab.py          (NEW — ~400 lines)
    - CollabServer: WebSocket server built on server.py
    - Operators connect: `reconpro collab --join ws://team-server:7890`
    - Shared state: all operators see live findings feed
    - Operator identity: each operator has a name/color
    - Finding claims: "I'm investigating this" → locks finding to operator
    - Chat: built-in operator chat alongside findings
    - Session recording: full audit trail of who found what, when
    - Integration: `reconpro serve --collab` enables collaboration mode

  deps: websockets>=12.0 (optional, `[collab]` extra)
```

### 5.4 Automated Compliance Mapping
**Why**: Organizations need to map findings to compliance frameworks (SOC2, ISO27001, PCI-DSS, HIPAA, GDPR). Currently manual.

**Architecture**:
```
reconpro/
  compliance.py      (NEW — ~400 lines)
    - ComplianceMapper: maps each finding category to compliance controls
    - Built-in frameworks:
      - SOC2: CC6.1 (logical access), CC6.3 (encryption), CC7.1 (detection)
      - ISO27001: A.8 (cryptography), A.9 (access control), A.12 (operations)
      - PCI-DSS: Req 1 (network security), Req 6 (secure development), Req 8 (cryptography)
      - HIPAA: §164.312 (access controls), §164.312(e) (transmission security)
      - GDPR: Art. 25 (data protection by design), Art. 32 (security of processing)
      - CIS Benchmarks: mapping to specific CIS controls
    - ComplianceReport: percentage compliance per framework, gaps, evidence
    - Output: `reconpro compliance --framework soc2,pci-dss target.com`
    - Integration: findings automatically tagged with applicable compliance controls

  data/
    compliance/
      soc2.yaml, iso27001.yaml, pci-dss.yaml, hipaa.yaml, gdpr.yaml, cis.yaml
```

### 5.5 Smart Recon Profiler (Target Fingerprinting)
**Why**: Currently every target gets the same scan. A WordPress site needs different tests than a React SPA or a Java Spring API.

**Architecture**:
```
reconpro/
  profiler.py        (NEW — ~350 lines)
    - TargetProfiler: runs a 30-second rapid assessment to classify the target
    - Classification:
      - Technology stack (language, framework, server, CDN, WAF)
      - Application type (SPA, SSR, API-only, static site, microservices)
      - Authentication model (none, session, JWT, OAuth, API key, mTLS)
      - Infrastructure (cloud provider, region, load balancer, caching)
      - Security posture estimate (based on headers, CSP, HSTS, etc.)
    - AutoPlan: given the profile, selects optimal module combination:
      - WordPress → recon + auth + vibesec + bot + nhi (skip gorgon SQLi)
      - React SPA → recon + chain + api_discovery + vibesec
      - Java API → recon + auth + chain + gorgon + nhi + cve_enrichment
    - Integration: `scan()` calls profiler first, then runs selected modules
    - Saves profiles: ~/.reconpro/profiles/{target}.json for faster re-scans
```

### 5.6 AI-Powered Report Writer
**Why**: Current reports are data-dense but lack narrative. Security auditors need executive summaries and risk narratives.

**Architecture**:
```
reconpro/
  report_writer.py    (NEW — ~300 lines)
    - ExecutiveSummaryGenerator:
      - If LLM available: generates natural language risk narrative
      - If no LLM: template-based summary with dynamic fill-in
      - Sections: Overview, Key Risks, Attack Surface, Recommendations, Compliance Impact
    - Audience modes:
      - Executive: 1-page summary, business risk language, no jargon
      - Technical: full findings with code references, CVE links, proof of concept
      - Compliance: framework-mapped with control gaps
      - Developer: actionable fix PRs with exact code changes
    - Output: `reconpro report --audience executive --format pdf`
```

### 5.7 Zero-Trust Network Mapper
**Why**: host.py checks the local machine. Doesn't map the network topology or find lateral movement paths.

**Architecture**:
```
reconpro/
  netmap.py          (NEW — ~400 lines)
    - NetworkDiscovery: ARP scan, ping sweep, mDNS discovery
    - ServiceFingerprinting: probe open ports, identify services and versions
    - TrustRelationshipMapper:
      - SSH key trust chains (who can SSH into whom)
      - Docker network topology (container-to-container communication)
      - K8s network policies (actual vs declared)
      - Active Directory trust relationships (if on Windows domain)
    - LateralPathFinder: given a compromised host, find all reachable hosts
    - SegmentationChecker: verify network segmentation between zones
    - Visual output: network graph with trust relationships
    - Integration: `reconpro netmap --subnet 192.168.1.0/24`
```

### 5.8 Scheduled Competitive Benchmarking
**Why**: Security posture degrades over time. Teams need continuous scoring against their own history and industry peers.

**Architecture**:
```
reconpro/
  benchmark.py       (NEW — ~300 lines)
    - ScoreTracker: time-series of security scores per target
    - BenchmarkRunner: scheduled scans that track score trends
    - Comparisons:
      - Self: score today vs last week vs last month
      - Team: score of project A vs project B vs team average
      - Industry: anonymous aggregate scores from opt-in telemetry
    - Alerts: score drops below threshold → notification
    - Leaderboard: `reconpro benchmark --team --period 30d`
    - Integration with scheduler.py for automated periodic benchmarking
```

---

## Implementation Priority Matrix

| Priority | Feature | Effort | Impact | Phase |
|----------|---------|--------|--------|-------|
| P0 | Async Engine Core | High | Critical | v7.0 |
| P0 | Evasion Engine | Medium | High | v7.0 |
| P0 | IaC Auditing | Medium | Critical | v8.0 |
| P0 | CI/CD Webhooks | Medium | Critical | v8.5 |
| P1 | Adaptive Rate Limiter | Low | Medium | v7.0 |
| P1 | Unified Memory | High | Critical | v7.5 |
| P1 | Attack-Path Chaining | High | Critical | v7.5 |
| P1 | API Discovery | High | High | v8.0 |
| P1 | Compliance Mapping | Medium | High | v9.0 |
| P1 | Profiler/AutoPlan | Medium | High | v9.0 |
| P2 | Raw Packet Assembly | High | Medium | v7.0 |
| P2 | Proxy Routing | Medium | Medium | v7.0 |
| P2 | Inter-Language AST | Very High | High | v7.5 |
| P2 | Payload Fuzzing | Medium | High | v7.5 |
| P2 | Agent Tool SDK | Medium | High | v7.5 |
| P2 | Defense Generation | High | High | v8.0 |
| P2 | Secret Entropy | Low | Medium | v8.0 |
| P2 | Container Security | Medium | High | v8.0 |
| P2 | Delta Reporting | Medium | High | v8.5 |
| P2 | Jira/Slack/GitHub | Medium | High | v8.5 |
| P2 | Graph UI | Medium | High | v8.5 |
| P2 | Air-Gapped Binary | Medium | Medium | v8.5 |
| P3 | Traffic Interception | High | Medium | v9.0 |
| P3 | Passive Intel | Medium | Medium | v9.0 |
| P3 | Collaboration | High | Medium | v9.0 |
| P3 | AI Report Writer | Medium | Medium | v9.0 |
| P3 | Network Mapper | High | Medium | v9.0 |
| P3 | Benchmarking | Low | Medium | v9.0 |

---

## New File Structure (v9.0 final)

```
reconpro/
  __init__.py           (existing)
  cli.py                (existing, 27→40+ subcommands)
  http.py               (existing, kept for sync fallback)
  async_http.py         (NEW — async HTTP + adaptive limiter)
  engine.py             (NEW — async scan orchestration)
  scanner.py            (existing, rewritten to use engine.py)
  evasion.py            (NEW — behavioral fingerprint shifting)
  proxy.py              (NEW — proxy pool management)
  raw_sockets.py        (NEW — raw packet assembly)
  memory.py             (REWRITE of knowledge_graph.py — unified memory)
  knowledge_graph.py    (existing, delegates to memory.py)
  chain_engine.py       (NEW — multi-vector attack path chaining)
  fuzzer.py             (NEW — context-aware payload fuzzing)
  tool_sdk.py           (NEW — agent tool plugin system)
  defense.py            (NEW — autonomous defense/patch generation)
  api_discovery.py      (NEW — dynamic API blueprint reconstruction)
  entropy.py            (NEW — secret entropy scoring)
  profiler.py           (NEW — target fingerprinting + auto-plan)
  report_writer.py      (NEW — AI-powered report narratives)
  mitm.py               (NEW — traffic interception & replay)
  passive_intel.py      (NEW — passive DNS & historical intel)
  collab.py             (NEW — real-time multi-operator collaboration)
  compliance.py         (NEW — compliance framework mapping)
  netmap.py             (NEW — zero-trust network mapper)
  benchmark.py          (NEW — competitive benchmarking)
  webhooks.py           (NEW — VCS webhook listeners)
  delta.py              (NEW — dynamic delta reporting)
  graph_ui.py           (NEW — interactive D3.js knowledge graph)
  
  integrations/
    __init__.py
    jira.py             (NEW — Jira ticket sync)
    slack.py            (NEW — Slack notifications)
    github.py           (NEW — GitHub issues/PR/Code Scanning)
  
  modules/
    __init__.py          (existing)
    recon.py             (existing, enhanced)
    auth.py              (existing, enhanced with fuzzer.py)
    chain.py             (existing, enhanced)
    bot.py               (existing)
    gorgon.py            (existing, rewritten to use fuzzer.py)
    oblivion.py          (existing, enhanced)
    vibesec.py           (existing)
    nhi.py               (existing, enhanced)
    host.py              (existing)
    dev.py               (existing, rewritten to use entropy.py)
    doctor.py            (existing)
    ast_analyzer.py      (existing, MAJOR REWRITE — taint tracking)
    iac_audit.py         (NEW — Terraform/CF/Docker/K8s auditing)
    container_sec.py     (NEW — container escape analysis)
    cloud_recon.py       (NEW — cloud infrastructure recon)
    portscan.py          (NEW — full port scanning)
    distributed.py       (NEW — distributed proxy scanning)
    
  data/
    payloads/            (NEW — organized payload databases)
    compliance/          (NEW — framework rule YAML files)
  
  chat.py               (existing)
  tui_app.py            (existing)
  nexus_tui.py          (existing, enhanced)
  nexus_agent.py        (existing, enhanced with tool_sdk.py)
  agent.py              (existing)
  swarm.py              (existing, enhanced with memory.py)
  adversarial.py        (existing, enhanced with defense.py)
  parallel.py           (existing, rewritten for async)
  subdomains.py         (existing, enhanced with passive_intel.py)
  scheduler.py          (existing)
  server.py             (existing, enhanced with webhooks + collab)
  reports.py            (existing)
  formats.py            (existing)
  history.py            (existing)
  plugins.py            (existing)
  browser_mod.py        (existing)
  cve_radar.py          (existing)
```

---

## Dependency Strategy

```toml
# pyproject.toml optional deps
[project.optional-dependencies]
async      = ["aiohttp>=3.9"]
browser    = ["playwright>=1.40.0"]
llm        = ["openai>=1.0.0", "anthropic>=0.18.0"]
graph      = ["networkx>=3.0"]
raw        = ["scapy>=2.5"]
intel      = ["shodan>=1.25"]
collab     = ["websockets>=12.0"]
integrations = ["jira>=3.0", "slack-sdk>=3.0"]
full       = ["aiohttp>=3.9", "playwright>=1.40.0", "openai>=1.0.0",
             "anthropic>=0.18.0", "networkx>=3.0", "scapy>=2.5",
             "shodan>=1.25", "websockets>=12.0", "jira>=3.0", "slack-sdk>=3.0"]
```

Core deps remain: `rich>=13.0.0`, `requests>=2.28.0` (requests actually isn't used — can drop to zero).

---

## Estimated Line Counts by Version

| Version | New Lines | Total Lines | New Files |
|---------|-----------|-------------|-----------|
| v6.0.0 (current) | — | ~12,200 | 28 |
| v7.0 | +3,500 | ~15,700 | 33 |
| v7.5 | +4,500 | ~20,200 | 38 |
| v8.0 | +5,000 | ~25,200 | 43 |
| v8.5 | +4,000 | ~29,200 | 48 |
| v9.0 | +4,500 | ~33,700 | 55 |

**Final v9.0: ~33,700 lines across 55 files.**
