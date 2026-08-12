# ReconPro v10.0.0 — The Security Reconnaissance Platform

> *Eleven Blades. One Target. One Verdict.*

ReconPro is an autonomous security operating system with 16 scanning modules, 11 intelligence subsystems, and 4 autonomous systems. It provides remote reconnaissance, local machine auditing, AI-powered intelligence analysis, multi-agent orchestration, and executive reporting — all from a single CLI.

**Version:** 10.0.0  
**License:** MIT  
**Python:** >= 3.8  
**Entry Point:** `reconpro`

---

## Features

### 16 Scanning Modules

**Remote Modules** (require a URL/domain target):

| Module | ID | Description |
|--------|----|-------------|
| RECON | `recon` | 13-category surface reconnaissance |
| AUTH BYPASS | `auth` | 15 auth bypass techniques |
| CHAIN HUNTER | `chain` | SSRF + redirect chain hunting |
| BOT HUNTER | `bot` | C2 / bot infrastructure detection |
| GORGON ULTRA | `gorgon` | 15-stage AI red team |
| OBLIVION | `oblivion` | 23-stage analytical dissolution (DREAD) |
| VIBESEC | `vibesec` | AI/vibe-coding vulnerability benchmark |
| NHI GRAPH | `nhi` | Non-Human Identity & blast-radius mapping |
| PEGASUS HUNTER | `pegasus` | Pegasus spyware indicator detection |
| CLOUD RECON | `cloud_recon` | Cloud infrastructure recon (AWS/Azure/GCP) |

**Local Modules** (scan the machine, not a URL):

| Module | ID | Description |
|--------|----|-------------|
| HOST AUDIT | `host` | Full laptop/machine security audit |
| DEV SEC | `dev` | Developer security scan (secrets, deps, git, docker) |
| DOCTOR | `doctor` | Security health check with fix commands |
| IAC AUDIT | `iac_audit` | Infrastructure-as-Code audit (Terraform/CF/Docker/K8s) |
| CONTAINER SECURITY | `container_sec` | Container escape analysis (Dockerfile + K8s) |
| TEAM | `team` | Team collaboration security audit |

### 11 Intelligence Subsystems

| Subsystem | Module | Purpose |
|-----------|--------|---------|
| Intelligence Pipeline | `intelligence` | Central coordinator enriching scan results |
| Confidence Engine | `confidence` | Finding confidence scoring (0.0–1.0) |
| Target Intelligence | `target-intel` | Target profiling and risk assessment |
| Engineering Score | `eng-score` | 8-dimension engineering metrics |
| Recommendation Engine | `recommend` | Prioritized fix recommendations |
| Learning System | `learning` | Scan history, module effectiveness, regressions |
| Decision Engine | `decision` | Autonomous scan orchestration decisions |
| Auto Validator | `validate` | Code quality validation (syntax, imports, security, tests) |
| Prompt Defense | `prompt-def` | Prompt injection defense (30 patterns) |
| Security Audit | `security-audit` | Codebase security scanning |
| CVE Radar | `cve` | CVE/NVD threat intelligence lookup |

### 4 Autonomous Systems

| System | Module | Purpose |
|--------|--------|---------|
| Autonomous Planner | `auto-plan` | Goal-driven execution planning |
| Agent Runtime | `agents` | Multi-agent orchestration (planner → recon → intel → correlation → reporting) |
| Evidence Correlation | `correlate` | Dedup, confidence boost, severity upgrade |
| Executive Intelligence | `executive` | Executive reports (risk matrix, attack timeline, remediation) |

### Powers

| Power | CLI Command | Description |
|-------|------------|-------------|
| Chat | `chat` | Interactive REPL — talk to ReconPro naturally |
| TUI | `tui` | Visual terminal dashboard |
| NEXUS | `nexus` | Agent TUI with mouse + keyboard + split-screen |
| Blitz | `blitz` | Parallel multi-target scanning |
| Agent | `agent` | Autonomous goal-driven scanning |
| Subdomains | `subdomains` | Subdomain discovery (CT logs + DNS) |
| Schedule | `schedule` | Cron-like recurring scans |
| Serve | `serve` | REST API server |
| Report | `report` | HTML report generation |
| History | `history` | Scan history with diff/comparison |
| Plugin | `plugin` | Custom module system |
| Screenshot | `screenshot` | Browser screenshots (Playwright) |

---

## Installation

```bash
pip install reconpro
```

### Optional Extras

```bash
# Async HTTP support
pip install reconpro[async]

# Browser screenshots (Playwright)
pip install reconpro[browser]

# LLM integration (OpenAI, Anthropic)
pip install reconpro[llm]

# Knowledge graph (networkx)
pip install reconpro[graph]

# Raw packet capture (scapy)
pip install reconpro[raw]

# Shodan intelligence
pip install reconpro[intel]

# Collaboration (websockets)
pip install reconpro[collab]

# Integrations (Jira, Slack)
pip install reconpro[integrations]

# Everything
pip install reconpro[full]
```

### Core Dependencies

- `rich >= 13.0.0` — terminal rendering
- `textual >= 0.40.0` — TUI framework
- `requests >= 2.28.0` — HTTP client

---

## Quick Start

```bash
# Remote scan (default modules)
reconpro example.com

# Quick VibeSec benchmark
reconpro vibesec example.com

# Scan your machine
reconpro audit

# Developer project scan
reconpro dev ./my-project

# Health check with fix commands
reconpro doctor

# Talk to it
reconpro chat

# Visual dashboard
reconpro tui

# Parallel multi-target scan
reconpro blitz t1.com t2.com t3.com -w 8

# Autonomous agent
reconpro agent "fully scan example.com and find subdomains"

# Subdomain discovery
reconpro subdomains example.com

# AI analysis (zero config)
reconpro zai example.com
```

---

## CLI Commands (45 total)

### Scanning (6)

| Command | Description |
|---------|-------------|
| `scan` | Full remote scan |
| `vibesec` | Quick VibeSec benchmark |
| `audit` | Full machine audit (ports, firewall, SSH, Docker, env, files) |
| `dev` | Developer project scan (secrets, deps, git, docker) |
| `doctor` | Health check with fix commands |
| `list` | List available modules |

### Local Analysis (2)

| Command | Description |
|---------|-------------|
| `ports` | Show open ports and risky services |
| `secrets` | Find secrets in env vars and codebase |

### Interfaces (3)

| Command | Description |
|---------|-------------|
| `nexus` | Launch NEXUS — agent TUI (mouse + keyboard + split-screen) |
| `chat` | Interactive chat mode — talk to ReconPro |
| `tui` | Visual terminal dashboard |

### Multi-Target & Autonomous (2)

| Command | Description |
|---------|-------------|
| `blitz` | Parallel multi-target scan |
| `agent` | Autonomous agent — give it a goal |

### Discovery & Intel (3)

| Command | Description |
|---------|-------------|
| `subdomains` | Discover subdomains |
| `cve` | CVE/NVD threat intelligence lookup |
| `passive` | Passive DNS + historical intel (VirusTotal, Wayback) |

### Infrastructure (2)

| Command | Description |
|---------|-------------|
| `schedule` | Schedule recurring scans |
| `serve` | Start REST API server (default port 7890) |

### Reporting & History (5)

| Command | Description |
|---------|-------------|
| `report` | Generate HTML report from last scan |
| `history` | View scan history |
| `diff` | Compare two scan results |
| `export` | Export last scan to SARIF/MD/JSON/HTML |
| `benchmark` | Score tracking + competitive leaderboard |

### Code Analysis (2)

| Command | Description |
|---------|-------------|
| `ast` | AST code analysis (Python/JS/TS vulnerability patterns) |
| `iac` | Infrastructure-as-Code audit (Terraform/CF/Docker/K8s) |

### Cloud & Container (2)

| Command | Description |
|---------|-------------|
| `container` | Container escape analysis (Dockerfile + K8s) |
| `cloud-recon` | Cloud infrastructure recon (AWS/Azure/GCP metadata + assets) |

### Offensive (3)

| Command | Description |
|---------|-------------|
| `swarm` | Swarm attack: SCOUT→HACKER→CODER→GUARDIAN |
| `adversarial` | Adversarial self-play: hacker vs coder loop |
| `fuzzer` | Context-aware payload fuzzing |

### Advanced (5)

| Command | Description |
|---------|-------------|
| `screenshot` | Take browser screenshot (needs: `pip install reconpro[browser]`) |
| `open` | Open URL in browser |
| `plugin` | Plugin management (list, create, run) |
| `profile` | Target fingerprinting + auto scan plan |
| `netmap` | Network topology + trust mapping + lateral paths |

### Intelligence (8)

| Command | Description |
|---------|-------------|
| `intelligence` | Intelligence analysis: confidence, target profile, engineering score, recommendations |
| `score` | Engineering score: architecture, security, reliability, performance dimensions |
| `recommend` | Prioritized fix recommendations from last scan |
| `learn` | Learning system: scan history, module effectiveness, regressions |
| `plan` | AI scan plan: optimal modules, order, and strategy for a target |
| `validate` | Validate ReconPro code: syntax, imports, security, tests |
| `prompt-check` | Test prompt injection defense on input text |
| `audit-code` | Security audit: hardcoded secrets, eval/exec, unsafe patterns |

### Autonomous Systems (4)

| Command | Description |
|---------|-------------|
| `auto-plan` | Autonomous planner: convert goal to execution strategy |
| `agents` | Run autonomous multi-agent pipeline against a target |
| `correlate` | Evidence correlation: merge, deduplicate, boost confidence |
| `executive` | Executive intelligence report: summary, risk matrix, remediation |

### AI Integration (3)

| Command | Description |
|---------|-------------|
| `zai` | z.ai live stream AI analysis — zero config, no API keys needed |
| `graph` | Knowledge graph: attack surface, blast radius, chains |
| `graph-visual` | Interactive D3.js knowledge graph visualization |

### Compliance & Defense (3)

| Command | Description |
|---------|-------------|
| `compliance` | Compliance mapping (SOC2/ISO/PCI/HIPAA/GDPR/CIS) |
| `defense` | Generate deployable fixes (WAF rules, patches, IaC fixes) |
| `delta` | Dynamic delta report (compare scans with git blame) |

---

## Architecture

ReconPro v10 follows a layered architecture:

1. **Scanner Layer** — `scanner.py`, `engine.py`, `modules/` — Runs scan modules against targets, producing `Finding` objects aggregated into `ReconProResult`.

2. **Intelligence Layer** — `intelligence_pipeline.py`, `confidence_engine.py`, `target_intelligence.py`, `engineering_score.py`, `recommendation_engine.py` — Enriches raw findings with confidence scores, target profiles, engineering metrics, and fix recommendations.

3. **Autonomous Layer** — `autonomous_planner.py`, `decision_engine.py`, `agent_runtime.py` — Converts natural language goals into phased execution strategies and orchestrates multi-agent pipelines.

4. **Evidence Layer** — `evidence_correlation.py`, `executive_intelligence.py` — Corroborates findings across modules, boosts confidence, detects severity upgrades, and produces executive-level reports.

5. **Memory Layer** — `memory.py`, `knowledge_graph.py` — Persistent knowledge graph, time-series finding store, agent blackboard, and credential vault.

6. **Security Layer** — `prompt_defense.py`, `security_audit.py`, `plugins.py` — Prompt injection defense (30 patterns), codebase security auditing, and sandboxed plugin execution.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full architecture guide.

---

## Configuration

ReconPro uses `~/.reconpro/` for persistent state:

``n```
~/.reconpro/
├── memory/
│   ├── findings/          # Per-target time-series findings (JSON)
│   ├── vault.json         # Obfuscated credential vault
│   ├── learning.json      # Learning system state
│   └── graph.json         # Knowledge graph persistence
├── plugins/               # Custom scanning modules
├── history/               # Scan history
└── config.json            # User configuration (optional)
```

### Rate Limiting

The default rate limit is 10 requests/second. Configure per-scan:

```bash
reconpro example.com --rate-limit 5.0
```

### TLS Verification

Skip TLS verification for self-signed certificates:

```bash
reconpro example.com -k
```

---

## Intelligence Systems

Every scan automatically flows through the Intelligence Pipeline (when available):

1. **Persist** findings to `UnifiedMemoryStore`
2. **Update** `SecurityKnowledgeGraph` with new nodes and edges
3. **Score** finding confidence via `ConfidenceEngine` (0.0–1.0)
4. **Corroborate** findings across modules (confidence boost +0.15 per source)
5. **Profile** the target via `TargetIntelligence` (tech stack, risk assessment, attack surface)
6. **Score** engineering dimensions (architecture, security, reliability, maintainability, complexity, performance, testing, documentation)
7. **Recommend** prioritized fixes with effort estimates and risk reduction impact
8. **Save** all state to disk

### Learning System

The `LearningSystem` persists to `~/.reconpro/memory/learning.json` and:

- Records every scan outcome (modules, findings, scores, errors)
- Tracks per-module effectiveness (runs, findings, avg_findings)
- Detects regressions (new finding categories on previously-clean targets)
- Suggests optimal modules based on target patterns and history

---

## Autonomous Systems

### Agent Runtime

The `AgentOrchestrator` runs a 5-stage pipeline:

```
Planner → Recon → Intelligence → Correlation → Reporting
```

Each stage is a specialized agent (`AgentBase` subclass) that:
- Receives shared context via `AgentContext`
- Communicates via typed `AgentMessage` objects
- Produces structured `AgentResult` output
- Degrades gracefully on import errors (never crashes the runtime)

### Autonomous Planner

The `AutonomousPlanner` converts natural language goals into `ExecutionStrategy` objects:

```python
from reconpro.autonomous_planner import AutonomousPlanner

planner = AutonomousPlanner()
strategy = planner.plan("Assess attack surface for example.com")
print(strategy.to_dict())
```

Supported goal types: `recon`, `audit`, `compliance`, `attack_surface`, `full_assessment`, `cloud_audit`, `code_review`.

---

## Development

### Project Structure

```
reconpro/
├── __init__.py              # Public API: scan, audit_scan, ReconProResult
├── cli.py                   # 45 CLI commands (argparse)
├── scanner.py               # Module registry, scan(), audit_scan()
├── engine.py                # Async ScanEngine with event callbacks
├── http.py                  # Finding, RateLimiter, http_probe
├── memory.py                # UnifiedMemoryStore (graph + findings + blackboard + vault)
├── knowledge_graph.py       # SecurityKnowledgeGraph (networkx or fallback)
├── intelligence_pipeline.py # IntelligencePipeline, IntelligenceReport
├── confidence_engine.py     # ConfidenceEngine
├── target_intelligence.py   # TargetIntelligence, TargetIntelReport
├── engineering_score.py     # EngineeringScorer, EngineeringReport
├── recommendation_engine.py # RecommendationEngine, RecommendationReport
├── learning_system.py       # LearningSystem
├── decision_engine.py       # DecisionEngine, ScanPlan
├── autonomous_planner.py    # AutonomousPlanner, ExecutionStrategy, GoalParser
├── agent_runtime.py         # AgentOrchestrator, AgentBase, AgentMessage, AgentResult
├── evidence_correlation.py  # EvidenceCorrelator, EvidenceChain, CorrelationResult
├── executive_intelligence.py # ExecutiveIntelligence, ExecutiveReport
├── prompt_defense.py        # PromptDefense, ThreatLevel, SanitizationResult
├── security_audit.py        # SecurityAuditor, SecurityAuditReport
├── plugins.py               # Sandboxed plugin system
├── modules/                 # 16 scanning modules
│   ├── recon.py, auth.py, chain.py, bot.py
│   ├── gorgon.py, oblivion.py, vibesec.py, nhi.py
│   ├── pegasus.py, cloud_recon.py
│   ├── host.py, dev.py, doctor.py
│   ├── iac_audit.py, container_sec.py, team.py
│   └── ast_analyzer.py
├── integrations/            # External integrations
│   ├── slack.py, jira.py, splunk.py, pagerduty.py
│   └── zai_stream.py
└── widgets/                 # TUI widgets
    ├── score_gauge.py, sparkline.py, toast.py
    └── command_completer.py, hint_bar.py, velocity_meter.py
```

### Running Tests

```bash
python -m pytest tests/
```

### Public API

```python
import reconpro

# Remote scan
result = reconpro.scan("example.com", modules=["recon", "auth"], timeout=10)
print(result.grade, result.total_score, len(result.findings))

# Local audit
audit = reconpro.audit_scan("/path/to/project")
print(audit.to_dict())
```

See [API_REFERENCE.md](API_REFERENCE.md) for the complete public API.

---

## License

MIT — see [LICENSE](../LICENSE) for details.
