# ReconPro v10 — Architecture Guide

## System Overview

ReconPro v10 is an enterprise-grade security reconnaissance platform built entirely in
pure Python with zero external runtime dependencies. It operates as both a CLI tool
and an importable library, orchestrating 26+ scanning modules against remote targets
and local machines to produce scored, graded security assessments.

    ┌─────────────────────────────────────────────────────────────────┐
    │                        CLI Layer (cli.py)                       │
    │   argparse → Rich console → TUI (nexus) → Chat (chat)          │
    ├─────────────────────────────────────────────────────────────────┤
    │                    Scan Orchestration                            │
    │   ┌──────────────┐   ┌──────────────────┐                       │
    │   │ scanner.py   │   │   engine.py      │                       │
    │   │  (sync)      │   │  (async)         │                       │
    │   └──────┬───────┘   └────────┬─────────┘                       │
    │          └────────┬───────────┘                                  │
    │                   ▼                                              │
    │          ┌────────────────┐                                      │
    │          │  registry.py   │  Module Registry (single source)    │
    │          └───────┬────────┘                                      │
    │    ┌─────────────┼─────────────┐                                 │
    │    ▼             ▼             ▼                                 │
    │ ┌────────┐  ┌────────┐  ┌────────────┐                         │
    │ │modules/│  │plugins/│  │integrations│                         │
    │ └────────┘  └────────┘  └────────────┘                         │
    ├─────────────────────────────────────────────────────────────────┤
    │                    Shared Foundation                             │
    │  http_layer.py    utils.py    constants.py    security.py             │
    ├─────────────────────────────────────────────────────────────────┤
    │                    Observability                                 │
    │  observability.py  │  history.py  │  formats.py                │
    └─────────────────────────────────────────────────────────────────┘

## Design Principles

### Pure Python, Zero Dependencies
Every component of ReconPro uses only the Python standard library. The only
declared dependency is  for terminal rendering. This means the tool can
run on any system with Python 3.10+, including air-gapped networks, embedded
systems, and CI/CD runners with no internet access.

### Modular Architecture
Each scanning capability lives in its own file under . Modules are
registered in  and discovered at scan time through lazy imports.
This eliminates circular dependencies and keeps module loading fast.

### Convention over Configuration
ReconPro ships with sensible defaults: 8-second timeouts, 10 req/s rate
limiting, 16 KB body limits, and a 100-point scoring system with A+ to F letter
grades. No configuration file is required for basic operation.

### Progressive Disclosure
Simple targets () produce immediate results with the
default 20-module suite. Power users can select specific modules, adjust
rate limits, disable TLS verification, or run all modules via .

## Package Structure

    reconpro/
    ├── __init__.py              # Exports scan, ReconProResult, audit_scan
    ├── cli.py                   # CLI argument parsing and Rich terminal rendering
    ├── scanner.py               # Synchronous scan orchestration
    ├── engine.py                # Async/concurrent scan orchestration (ScanEngine)
    ├── registry.py              # Central module registry (single source of truth)
    ├── http_layer.py                  # http_probe(), Finding, RateLimiter
    ├── utils.py                 # Pure utility functions, no circular deps
    ├── constants.py             # Severities, grades, paths, defaults
    ├── security.py              # Sanitization, secret detection, safe parsing, audit
    ├── observability.py         # StructuredLogger, MetricsCollector, ScanTracer
    ├── plugins.py               # Plugin discovery from ~/.reconpro/plugins/
    ├── formats.py               # SARIF 2.1.0, JSON, Markdown, HTML export
    ├── history.py               # Scan history: save, list, diff, clear
    ├── reports.py               # HTML report generation
    ├── parallel.py              # Multi-target parallel scanning (blitz)
    ├── server.py                # REST API server
    ├── chat.py                  # Interactive REPL / chat interface
    ├── nexus_tui.py             # Visual terminal dashboard
    ├── scheduler.py             # Cron-like recurring scan scheduler
    ├── agent.py                 # Autonomous goal-driven scanning agent
    ├── subdomains.py            # Subdomain discovery (CT logs + DNS)
    ├── knowledge_graph.py       # Cross-scan knowledge correlation
    ├── modules/                 # 26 scanning modules (see Module Guide)
    ├── integrations/            # slack, jira, github, pagerduty, splunk, zai_stream
    ├── widgets/                 # TUI widget components
    ├── tests/                   # 17 test files covering all subsystems
    └── docs/                    # Documentation and ADRs

## Core Components

### HTTP Layer (http_layer.py)
The single HTTP abstraction used by every module.

- **http_probe(url, method, body, headers, timeout, verify_tls, limiter)** returns
  Dict[str, Any] with keys ok, status, reason, headers, body. Uses urllib.request
  with configurable TLS verification.
- **Finding** dataclass: title, severity, category, module, description, evidence,
  asset, points_deducted, remediation, dread_score. Has a to_dict() method.
- **RateLimiter(max_per_second=10.0)**: Thread-safe token-bucket. All HTTP traffic
  flows through this. Body reads are capped at 16,384 bytes.

### Scan Engine (scanner.py)
Synchronous orchestrator. The scan() function validates the target, creates
a dedicated RateLimiter, resolves the module list, iterates through modules
calling each runner with (target, base_url, timeout, verify_tls), aggregates
findings, computes score/grade, and returns a ReconProResult. The
audit_scan() function follows the same pattern for local modules.

### Module Registry (registry.py)
Single source of truth for all modules. Four canonical lists:
MODULE_REGISTRY (23 remote modules), LOCAL_MODULES (3 local modules),
ALL_MODULES (combined), DEFAULT_MODULES (20 default remote).
Runners are lazy-loaded via _get_runners() to avoid circular imports.

### Shared Utilities (utils.py)
Pure functions with no state. Key exports: extract_host(),
normalize_base_url(), validate_target(), compute_score(),
count_severities(), sort_findings_by_severity(), entropy(),
compute_grade(), badge_markdown(), is_private_ip(), url_join().

### Constants (constants.py)
Canonical definitions: SEVERITY_LEVELS (critical=0 through info=4),
GRADE_THRESHOLDS (A+ at 90 through F at 0), DEFAULT_TIMEOUT (8),
DEFAULT_RATE_LIMIT (10.0), DEFAULT_BODY_LIMIT (16384), USER_AGENT,
DREAD_SCORE_MAP, SARIF_LEVEL_MAP, and all file paths (RECONPRO_HOME,
SCAN_HISTORY_DIR, PLUGIN_DIR, MEMORY_DIR).

### CLI (cli.py)
Built on argparse with Rich console rendering. Supports subcommands:
scan (default), audit, blitz, chat, nexus, agent, subdomains, serve,
report, history, plugin, screenshot, swarm, adversarial, schedule.

## Module System

### Module Contract
Every remote scanning module exports a run() function with this signature:

    def run(target: str, base_url: str, timeout: int = 8, verify_tls: bool = True) -> list[Finding]:

The vibesec module is special — it returns a 4-tuple:

    def run(target, base_url, timeout=8, verify_tls=True) -> tuple[list[Finding], int, str, str]:
    # returns (findings, score, grade, badge_markdown)

Modules use http_probe() from http_layer.py for all HTTP requests and return
Finding dataclasses. Modules must never import from scanner.py or cli.py
to avoid circular dependencies.

### Module Registration
Modules are registered in registry.py via build_module_registry() (remote)
or build_local_modules() (local). Each entry is a dict with keys name (display),
runner (callable), and color (Rich terminal color name).

### Module Lifecycle
1. **Discovery**: registry.py defines all modules at import time
2. **Lazy loading**: _get_runners() imports modules/__init__.py on first access
3. **Selection**: scan() resolves module list from defaults or user flags
4. **Execution**: Each runner is called synchronously (scanner) or concurrently (engine)
5. **Aggregation**: Findings are collected, scored, and graded

## Data Flow

    User Input (domain/URL)
           │
           ▼
      validate_target()          ← utils.py
           │
           ▼
      normalize_base_url()       ← utils.py
      extract_host()             ← utils.py
           │
           ▼
      Module Runner Loop
      ┌──────────────────┐
      │ http_probe() xN  │ ← http_layer.py (rate-limited)
      │ → Findings[]     │
      └────────┬─────────┘
               │
               ▼
      compute_score()           ← utils.py (points deducted)
      compute_grade()           ← utils.py (A+ to F mapping)
      count_severities()        ← utils.py
               │
               ▼
      ReconProResult            ← scanner.py
      (target, findings, score, grade, module_results)
               │
               ▼
      CLI Render / Export
      (Rich table, SARIF, JSON, HTML, Markdown)

## Configuration

### Defaults (constants.py)

| Constant | Value | Description |
|---|---|---|
| DEFAULT_TIMEOUT | 8 seconds | Per-request HTTP timeout |
| DEFAULT_RATE_LIMIT | 10.0 req/s | Token-bucket rate limiter |
| DEFAULT_BODY_LIMIT | 16384 bytes | Max response body read |
| DEFAULT_MAX_WORKERS | 4 | Default async worker count |
| MAX_SCORE | 100 | Maximum security score |

### File Paths

| Path | Constant | Purpose |
|---|---|---|
| ~/.reconpro/ | RECONPRO_HOME | All persistent data |
| ~/.reconpro/scans/ | SCAN_HISTORY_DIR | Saved scan results |
| ~/.reconpro/plugins/ | PLUGIN_DIR | Custom plugin modules |
| ~/.reconpro/memory/ | MEMORY_DIR | Knowledge graph storage |
| ~/.reconpro/audit.log | (security.py) | Audit log (10 MB, 5 rotations) |

## Error Handling Strategy

ReconPro uses a defensive, fail-open approach: individual module failures
never crash the overall scan. The http_probe() function catches all exceptions
and returns {ok: False, status: 0, reason: str(e), headers: {}, body: }.
Modules are expected to handle their own errors gracefully and return an empty
list of findings on failure rather than raising exceptions.

## Extensibility

### Plugin System (plugins.py)
Custom modules are Python files placed in ~/.reconpro/plugins/. Each must
export a run(target, base_url, **kwargs) function returning a list of Findings.
Plugins can also define NAME and DESCRIPTION module-level attributes.
Plugins are discovered at scan time via discover_plugins().

### Hook System
Plugins can register hooks via ~/.reconpro/plugins/_hooks.json to intercept
events at scan_start, module_complete, finding, and scan_end lifecycle points.

### Custom Modules
For first-class modules, add a file to modules/, create a run_* function,
register it in registry.py, and re-export from modules/__init__.py. This ensures
the module appears in --all scans and the module registry.
