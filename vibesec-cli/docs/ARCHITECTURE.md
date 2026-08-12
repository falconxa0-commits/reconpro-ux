# ReconPro v10.0.0 Architecture Guide

---

## System Overview

ReconPro is structured as six interconnected layers, each with a single responsibility. Data flows from raw HTTP probes through intelligence enrichment to executive reports.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Layer (cli.py)                      │
│                    45 commands via argparse                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     Scanner Layer                                │
│  scanner.py  │  engine.py  │  modules/*.py  │  http.py         │
│              16 modules │  Finding │  ReconProResult              │
└──────────────────────────┬──────────────────────────────────────┘
                           │  ReconProResult
┌──────────────────────────▼──────────────────────────────────────┐
│                  Intelligence Layer                              │
│  intelligence_pipeline.py │  confidence_engine.py              │
│  target_intelligence.py    │  engineering_score.py              │
│  recommendation_engine.py  │  learning_system.py                │
│  decision_engine.py        │  auto_validation.py               │
└──────────────────────────┬──────────────────────────────────────┘
                           │  IntelligenceReport
┌──────────────────────────▼──────────────────────────────────────┐
│                  Autonomous Layer                               │
│  autonomous_planner.py  │  agent_runtime.py                    │
│  ExecutionStrategy       │  AgentOrchestrator                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │  AutonomousScanReport
┌──────────────────────────▼──────────────────────────────────────┐
│                  Evidence Layer                                 │
│  evidence_correlation.py  │  executive_intelligence.py          │
│  EvidenceChain            │  ExecutiveReport                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │  ExecutiveReport
┌──────────────────────────▼──────────────────────────────────────┐
│                   Memory Layer                                   │
│  memory.py (UnifiedMemoryStore)                                 │
│  ├── SecurityKnowledgeGraph   (networkx or fallback DiGraph)   │
│  ├── FindingStore             (per-target time-series on disk)   │
│  ├── AgentBlackboard          (session-scoped in-memory)        │
│  └── CredentialVault          (obfuscated JSON on disk)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scanner Pipeline

### Flow: target → modules → findings → result

```
scan(target, modules, ...) → ReconProResult
```

1. **Target Resolution** (`scanner.py:138-139`): The target string is normalized — if it lacks a scheme, `https://` is prepended. The host is extracted by stripping scheme and path.

2. **Module Selection** (`scanner.py:141-146`):
   - If `all_modules=True`: all 10 remote modules from `MODULE_REGISTRY`.
   - If `modules` is a list: only those present in `MODULE_REGISTRY`.
   - Otherwise: `DEFAULT_MODULES` = `["recon", "vibesec", "auth", "chain", "oblivion", "gorgon", "bot", "pegasus"]`.

3. **Module Execution** (`scanner.py:154-177`): Each module's `runner` function is called with the signature `runner(target, base_url, timeout=8, verify_tls=True)` and returns a `List[Finding]`. The `vibesec` module is special-cased — it returns a 4-tuple `(findings, score, grade, badge_md)`.

4. **Score Calculation** (`scanner.py:180-184`): Total deductions are summed from `Finding.points_deducted`. Score = `max(0, min(100, 100 - deductions))`. If no findings, score = 100.

5. **Grading** (`http.py:138-152`): Score maps to grades: A+ (90+), A (80+), B (65+), C (50+), D (35+), F (<35).

6. **Result Assembly** (`scanner.py:193-204`): A `ReconProResult` dataclass is returned with `target`, `modules_run`, `findings`, `severity_counts`, `total_score`, `grade`, `badge_markdown`, and optional `vibesec_score`/`vibesec_grade`.

7. **Intelligence Hook** (`scanner.py:207-211`): If `_intelligence_hook` is set, it is called with the result. Errors in the hook are silently caught — intelligence never breaks the scan.

### Module Registry

Two registries in `scanner.py`:

- **`MODULE_REGISTRY`** (10 remote modules): `recon`, `auth`, `chain`, `bot`, `gorgon`, `oblivion`, `vibesec`, `nhi`, `pegasus`, `cloud_recon`. Each entry has `name`, `runner`, and `color`. The `vibesec` runner is `None` (special-cased in scan logic).

- **`LOCAL_MODULES`** (6 local modules): `host`, `dev`, `doctor`, `iac_audit`, `container_sec`, `team`. Each entry has `name`, `runner`, and `color`. The `iac_audit` and `container_sec` runners are wrapper adapters that extract the `Finding` list from their 4-tuple return values.

### The `Finding` Dataclass

Defined in `http.py:108-133`:

```python
@dataclass
class Finding:
    title: str
    severity: str          # critical, high, medium, low, info
    category: str
    module: str
    description: str
    evidence: str
    asset: str
    points_deducted: int = 0
    remediation: str = ""
    dread_score: float = 0.0
```

### Audit Scan

`audit_scan(target=".", modules=None, all_modules=False)` in `scanner.py:216-284` follows the same pipeline but uses `LOCAL_MODULES` instead of `MODULE_REGISTRY`. Default modules: `["host", "dev", "doctor", "iac_audit", "container_sec"]`.

---

## Intelligence Pipeline

### Flow: result → memory → confidence → target_intel → engineering

The `IntelligencePipeline` (`intelligence_pipeline.py`) is the central coordinator. It is wired into the scanner via `_intelligence_hook` by default (set at module import time in `scanner.py:291-297`).

```python
pipeline = IntelligencePipeline()  # auto-created with lazy components
set_intelligence_hook(pipeline.process_result)
```

### Processing Steps (`process_result`, lines 164-262)

1. **Persist to Memory** — `memory.add_scan_result(scan_dict)` stores the full scan in the `FindingStore`.

2. **Feed Knowledge Graph** — `memory.add_finding_from_scan(finding)` for each finding creates nodes (target, vulnerability, technology) and edges (has_finding, uses_tech, etc.) in the `SecurityKnowledgeGraph`.

3. **Score Confidence** — `confidence.score_findings(findings)` assigns 0.0–1.0 confidence to each finding, then `confidence.corroborate(scored)` groups by fingerprint and boosts confidence by +0.15 per additional source (capped at +0.45).

4. **Target Intelligence** — `target_analyzer.analyze(target, findings)` classifies findings into 6 intelligence categories (infra, app, data, network, auth, crypto), computes per-category risk, extracts technology stack, and generates prioritized next actions.

5. **Engineering Score** — `scorer.score(target, findings, result)` scores 8 dimensions (architecture, security, reliability, maintainability, complexity, performance, testing, documentation) with weighted average and generates a letter grade.

6. **Gather Stats** — `memory.graph_stats()` and `memory.stats()` for reporting.

7. **Persist to Disk** — `memory.save()` writes graph, findings, vault, and blackboard to `~/.reconpro/memory/`.

### IntelligenceReport

```python
@dataclass
class IntelligenceReport:
    target: str
    timestamp: str
    findings_count: int
    confidence_scores: List[Dict[str, Any]]
    target_intel: Optional[Dict[str, Any]]
    engineering_report: Optional[Dict[str, Any]]
    graph_stats: Optional[Dict[str, Any]]
    memory_stats: Optional[Dict[str, Any]]
    processing_time_ms: float
```

---

## Agent Runtime

### Flow: orchestrator → agents → messages → results

The `AgentOrchestrator` (`agent_runtime.py:625-871`) manages a sequential pipeline of specialized agents:

```
PlannerAgent → ReconAgent → IntelligenceAgent → CorrelationAgent → ReportingAgent
```

### Execution (`run_goal`, lines 699-830)

1. **Instantiation** — For each `(role_name, agent_cls)` in the pipeline, an agent is created, given an `AgentContext` (agent_id, role, target, memory_ref), and registered with the orchestrator.

2. **Shared State** — A dict flows through the pipeline carrying: `goal`, `target`, `findings`, `agent_results`, `execution_plan`, `correlated_findings`, `confidence_profile`.

3. **Sequential Execution** — Each agent's `execute(task)` is called with the shared state dict. Results are type-checked: `PlannerAgent` populates `execution_plan`, `ReconAgent` appends to `findings`, `IntelligenceAgent` updates `confidence_profile`, `CorrelationAgent` populates `correlated_findings`.

4. **Error Isolation** — If an agent crashes, it produces a synthetic `AgentResult` with a single low-severity "agent error" finding. The pipeline continues.

5. **Report Assembly** — An `AutonomousScanReport` aggregates all results.

### Agent Base Class

```python
class AgentBase(ABC):
    def __init__(self, role: str, agent_id: Optional[str] = None) -> None
    def initialize(self, context: AgentContext) -> None
    def set_send_fn(self, fn: Callable) -> None
    @abstractmethod
    def execute(self, task: Dict[str, Any]) -> AgentResult
    def receive(self, message: AgentMessage) -> None
    def send(self, recipient, msg_type, payload, ...) -> None
    def get_status(self) -> str
```

### Message Protocol

```python
@dataclass
class AgentMessage:
    sender: str
    recipient: str           # agent_id or "broadcast"
    msg_type: str            # task_request, result, status_update, error, coordination
    payload: Dict[str, Any]
    timestamp: float
    correlation_id: str
    in_reply_to: Optional[str]
```

---

## Evidence Correlation

### Flow: findings → fingerprint → chains → confidence boost

The `EvidenceCorrelator` (`evidence_correlation.py`) takes raw findings and produces `CorrelationResult` with `EvidenceChain` objects.

### Pipeline (`correlate`, lines 195-271)

1. **Sanitize** — Filter out non-dict and empty-title entries.

2. **Group by Fingerprint** — SHA-256 of `title|category|target` (truncated to 16 hex chars). Two findings match when they share title, category, and target.

3. **Build Chains** — For each fingerprint group, the finding with the longest evidence+description text becomes the `primary_finding`. Others become `corroborating_findings`. Evidence types are inferred from keywords (sql_injection, xss, rce, ssrf, etc.) and module names.

4. **Confidence Boost** — `confidence = base + 0.1 * (N - 1)` where N is the total findings in the chain (including primary). Capped at 1.0. The base confidence comes from `ConfidenceEngine.score_finding()` if available, else from the finding's existing `confidence` field, else 0.5.

5. **Severity Upgrade** — If 3+ distinct modules confirm a `medium` finding, it is upgraded to `high`.

6. **Attack Path Linking** — Chains sharing the same base domain are linked into an ordered attack path. Cross-references are added when one chain's evidence mentions another chain's target.

### EvidenceChain

```python
@dataclass
class EvidenceChain:
    chain_id: str
    primary_finding: Dict[str, Any]
    corroborating_findings: List[Dict[str, Any]]
    confidence: float             # 0.0–1.0
    evidence_types: List[str]
    source_modules: List[str]
    attack_path: Optional[List[str]]
    severity: str
```

---

## Module Registry

### Remote vs Local

Modules are split into two registries based on whether they require a network target:

- **Remote** (`MODULE_REGISTRY`): Designed for domains/URLs. Runners accept `(target, base_url, timeout, verify_tls)` and return `List[Finding]`.
- **Local** (`LOCAL_MODULES`): Designed for the machine. Same signature but target is typically a file path or `"localhost"`.

### Default Modules

```python
DEFAULT_MODULES = ["recon", "vibesec", "auth", "chain", "oblivion", "gorgon", "bot", "pegasus"]
DEFAULT_LOCAL_MODULES = ["host", "dev", "doctor", "iac_audit", "container_sec"]
```

The `--all` flag runs all 10 remote modules. `audit` without flags runs the 5 default local modules.

---

## Memory System

### UnifiedMemoryStore

`memory.py` provides `UnifiedMemoryStore` — a single class that wraps four sub-systems behind a thread-safe (`threading.RLock`) unified API:

#### 1. Knowledge Graph

Delegated to `SecurityKnowledgeGraph` (`knowledge_graph.py`). Stores nodes (target, vulnerability, technology, CVE, subdomain, endpoint, port, asset) and typed edges (has_finding, has_vulnerability, uses_tech, has_cve, subdomain_of, exposed_port, hosts_endpoint, related_to).

Supports:
- `get_attack_surface(target)` — Returns vulnerabilities grouped by category.
- `get_blast_radius(asset)` — BFS traversal from a node to find all reachable vulnerabilities.
- `find_chains(target)` — Multi-hop vulnerability chains with severity sorting.
- `stats()` — Node/edge counts, severity distribution.
- `save()`/`load()` — JSON persistence to `~/.reconpro/memory/graph.json`.

The graph uses `networkx.DiGraph` when available, falling back to a built-in `_FallbackDiGraph` that provides the same API.

#### 2. Finding Store

Per-target time-series on disk at `~/.reconpro/memory/findings/<target_hash>.json`. Each entry is a finding dict with an appended `_timestamp` field.

Key methods:
- `save_finding(target, finding_dict)` — Append a finding.
- `get_findings(target, severity=None, limit=100, since=None)` — Query with filters.
- `get_latest_findings(target, limit=50)` — Most recent findings.
- `finding_count(target, severity=None)` — Count with optional severity filter.
- `trend(target, days=30)` — Daily finding counts for trend analysis.

#### 3. Agent Blackboard

Session-scoped in-memory key-value store. Used by swarm/adversarial modes for inter-agent communication.

- `bb_set(agent_id, key, value)` — Store a value.
- `bb_get(key)` — Retrieve a value.
- `bb_get_all(agent_id=None)` — Get all entries, optionally filtered by agent.
- `bb_clear()` — Clear all entries.

#### 4. Credential Vault

Obfuscated storage for discovered credentials at `~/.reconpro/memory/vault.json`. Credentials are XOR-obfuscated with a machine-specific key derived from hostname, platform, and username.

- `vault_store(source, credential_type, value)` — Store a credential.
- `vault_get_all(source=None)` — Retrieve all (optionally filtered by source).
- `vault_search(query)` — Search credentials.
- `vault_purge()` — Delete all vault data.

### Singleton Access

```python
from reconpro.memory import get_memory

mem = get_memory()  # Returns singleton UnifiedMemoryStore
```

---

## Async Scan Engine

`engine.py` provides `ScanEngine` — an async orchestrator that runs modules concurrently with bounded parallelism.

### Event System

```python
@dataclass
class ScanEvent:
    type: str               # SCAN_START, MODULE_START, FINDING, MODULE_COMPLETE, SCAN_COMPLETE
    module_id: Optional[str]
    target: Optional[str]
    finding: Optional[Finding]
    result: Optional[ReconProResult]
    timestamp: float
    metadata: Dict[str, Any]
```

### Usage

```python
from reconpro.engine import ScanEngine, EventCollector

engine = ScanEngine(event_callback=pipeline)  # IntelligencePipeline is callable
collector = EventCollector()
result = await engine.run("example.com")
print(collector.timeline())
```

The `ScanEngine.run()` method accepts the same arguments as `scanner.scan()` and returns the same `ReconProResult` type. It also provides `concurrent_scan()` for scanning multiple targets in parallel.

---

## Data Flow Summary

```
User runs: reconpro scan example.com
    │
    ▼
CLI (cli.py) parses args, calls scanner.scan()
    │
    ▼
Scanner iterates MODULE_REGISTRY, calls each runner
    │  Each runner returns List[Finding]
    ▼
ReconProResult assembled (score, grade, badge)
    │
    ▼
IntelligencePipeline.process_result() [auto-hooked]
    │  ├─ UnifiedMemoryStore.add_scan_result()
    │  ├─ SecurityKnowledgeGraph updated
    │  ├─ ConfidenceEngine.score_findings() + corroborate()
    │  ├─ TargetIntelligence.analyze()
    │  ├─ EngineeringScorer.score()
    │  └─ UnifiedMemoryStore.save()
    ▼
Result displayed in terminal (Rich)
    │
    ▼
(Optional) History saved, report generated
```
