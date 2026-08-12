# ReconPro v10.0.0 Public API Reference

All public classes and functions exported by the `reconpro` package.
Method signatures verified from source code.

---

## Core API

### `reconpro.scan()`

```python
# reconpro/scanner.py:113-213

def scan(
    target: str,
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
    timeout: int = 8,
    verify_tls: bool = True,
    rate_limit: float = 10.0,
) -> ReconProResult
```

Run a remote scan against a domain or URL.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `target` | `str` | | Domain or URL to scan. |
| `modules` | `Optional[List[str]]` | `None` | Module IDs to run. Defaults to `DEFAULT_MODULES`. |
| `all_modules` | `bool` | `False` | Run all 10 remote modules. |
| `timeout` | `int` | `8` | Per-request timeout in seconds. |
| `verify_tls` | `bool` | `True` | Verify TLS certificates. |
| `rate_limit` | `float` | `10.0` | Max requests per second. |

**Returns:** `ReconProResult`

---

### `reconpro.audit_scan()`

```python
# reconpro/scanner.py:216-284

def audit_scan(
    target: str = ".",
    modules: Optional[List[str]] = None,
    all_modules: bool = False,
) -> ReconProResult
```

Run a local machine or project audit.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `target` | `str` | `"."` | Directory to scan (for dev module) or `"localhost"`. |
| `modules` | `Optional[List[str]]` | `None` | Local module IDs (host, dev, doctor). |
| `all_modules` | `bool` | `False` | Run all 6 local modules. |

**Returns:** `ReconProResult`

---

### `reconpro.ReconProResult`

```python
# reconpro/scanner.py:65-92

@dataclass
class ReconProResult:
    target: str
    modules_run: List[str]
    findings: List[Dict[str, Any]]
    severity_counts: Dict[str, int]
    total_score: int
    grade: str
    badge_markdown: str
    vibesec_score: Optional[int] = None
    vibesec_grade: Optional[str] = None
    module_results: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]
```

Full result of a ReconPro scan.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `target` | `str` | Scanned target (host portion). |
| `modules_run` | `List[str]` | Module IDs that were executed. |
| `findings` | `List[Dict[str, Any]]` | Finding dicts (title, severity, category, etc.). |
| `severity_counts` | `Dict[str, int]` | Count per severity level. |
| `total_score` | `int` | 0–100. |
| `grade` | `str` | A+, A, B, C, D, or F. |
| `badge_markdown` | `str` | Markdown badge image URL. |
| `vibesec_score` | `Optional[int]` | VibeSec benchmark score (if run). |
| `vibesec_grade` | `Optional[str]` | VibeSec benchmark grade (if run). |
| `module_results` | `Dict[str, Dict[str, Any]]` | Per-module results and finding counts. |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `to_dict()` | `Dict[str, Any]` | Serialize to plain dict. |

---

### `reconpro.set_intelligence_hook()`

```python
# reconpro/scanner.py:100-110

def set_intelligence_hook(
    hook: Optional[Callable[["ReconProResult"], None]],
) -> Optional[Callable[["ReconProResult"], None]]
```

Set or clear the module-level intelligence hook. Returns the previous hook so it can be restored.

---

## Intelligence Pipeline

### `reconpro.intelligence_pipeline.IntelligencePipeline`

```python
# reconpro/intelligence_pipeline.py:60-315

class IntelligencePipeline:
    def __init__(
        self,
        memory_store: Optional[Any] = None,
        confidence_engine: Optional[Any] = None,
        target_intelligence: Optional[Any] = None,
        engineering_scorer: Optional[Any] = None,
    ) -> None
```

Central intelligence coordinator. Wires UnifiedMemoryStore, ConfidenceEngine, TargetIntelligence, and EngineeringScorer into the scan flow.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `memory_store` | `Optional[UnifiedMemoryStore]` | If None, lazily imported. |
| `confidence_engine` | `Optional[ConfidenceEngine]` | If None, created on init. |
| `target_intelligence` | `Optional[TargetIntelligence]` | If None, created on init. |
| `engineering_scorer` | `Optional[EngineeringScorer]` | If None, created on init. |

**Methods:**

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `process_result` | `(result: ReconProResult) -> IntelligenceReport` | `IntelligenceReport` | Full pipeline: persist → graph → confidence → target intel → engineering → save. |
| `__call__` | `(event: ScanEvent) -> None` | `None` | ScanEngine-compatible event callback. Triggers on SCAN_COMPLETE. |
| `get_target_profile` | `(target: str) -> Dict[str, Any]` | `dict` | Intelligence profile from memory + graph. |
| `last_report` | *(property)* | `Optional[IntelligenceReport]` | Most recently produced report. |

**Properties (lazy accessors):**

| Property | Type | Description |
|----------|------|-------------|
| `memory` | `UnifiedMemoryStore` | Returns or creates the memory store. |
| `confidence` | `ConfidenceEngine` | Returns or creates the confidence engine. |
| `target_analyzer` | `TargetIntelligence` | Returns or creates the target intelligence. |
| `scorer` | `EngineeringScorer` | Returns or creates the engineering scorer. |

---

### `reconpro.intelligence_pipeline.IntelligenceReport`

```python
# reconpro/intelligence_pipeline.py:29-54

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

    def to_dict(self) -> Dict[str, Any]
```

---

## Confidence Engine

### `reconpro.confidence_engine.ConfidenceEngine`

```python
# reconpro/confidence_engine.py:54-311

class ConfidenceEngine:
    def __init__(self) -> None
```

Score finding confidence based on multi-factor evidence analysis (0.0–1.0).

**Scoring Factors:**
- Evidence specificity (0.0–0.30): URLs, code snippets, headers, length.
- Severity consistency (0.0–0.20): Does evidence length match claimed severity?
- Reproducibility (0.0–0.25): Was this finding seen in previous scans?
- Has remediation (+0.05).
- CVE references (0.0–0.10): 1 CVE → 0.4, 2 → 0.7, 3+ → 1.0.
- Evidence length bonus (0.0–0.10).

**Methods:**

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `score_finding` | `(finding: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> float` | `float` | Score a single finding. Context keys: `previous_findings`, `module_count`. |
| `score_findings` | `(findings: List[Dict[str, Any]], context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]` | `List[Dict]` | Batch-score. Each dict gets a `"confidence"` key. |
| `corroborate` | `(findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]` | `List[Dict]` | Group by fingerprint, boost +0.15 per additional source (cap +0.45). Adds `"corroboration_count"`. |

---

## Target Intelligence

### `reconpro.target_intelligence.TargetIntelligence`

```python
# reconpro/target_intelligence.py:171-455

class TargetIntelligence:
    def analyze(
        self,
        target: str,
        findings: List[Dict[str, Any]],
        profile: Any = None,
    ) -> TargetIntelReport
```

Transform raw findings into actionable intelligence.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | `str` | Scanned target. |
| `findings` | `List[Dict[str, Any]]` | Finding dicts. |
| `profile` | `Any` | Optional TechProfile from profiler. |

**Returns:** `TargetIntelReport`

**Classification:** Findings are mapped to 6 intelligence categories: `infra`, `app`, `data`, `network`, `auth`, `crypto`.

---

### `reconpro.target_intelligence.TargetIntelReport`

```python
# reconpro/target_intelligence.py:133-168

@dataclass
class TargetIntelReport:
    target: str
    technology_stack: List[str]
    vendor: Optional[str]
    app_type: str
    risk_assessment: Dict[str, CategoryRisk]
    overall_risk: float
    confidence: float
    attack_surface: List[str]
    business_impact: str
    suggested_next_actions: List[str]
    finding_count: int
    critical_count: int
    high_count: int

    def to_dict(self) -> Dict[str, Any]
```

---

## Engineering Score

### `reconpro.engineering_score.EngineeringScorer`

```python
# reconpro/engineering_score.py:106-291

class EngineeringScorer:
    def __init__(self) -> None

    def score(
        self,
        target: str,
        findings: List[Dict[str, Any]],
        result: Optional[Any] = None,
    ) -> EngineeringReport
```

Calculate post-scan engineering metrics across 8 dimensions.

**Dimensions and Weights:**

| Dimension | Weight |
|-----------|--------|
| architecture | 0.15 |
| security | 0.20 |
| reliability | 0.15 |
| maintainability | 0.12 |
| complexity | 0.10 |
| performance | 0.10 |
| testing | 0.10 |
| documentation | 0.08 |

**Returns:** `EngineeringReport`

---

### `reconpro.engineering_score.EngineeringReport`

```python
# reconpro/engineering_score.py:84-103

@dataclass
class EngineeringReport:
    target: str
    overall_score: float
    dimensions: Dict[str, DimensionScore]
    total_findings: int = 0
    grade: str = "F"

    def to_dict(self) -> Dict[str, Any]
```

---

## Recommendation Engine

### `reconpro.recommendation_engine.RecommendationEngine`

```python
# reconpro/recommendation_engine.py:312-517

class RecommendationEngine:
    def __init__(self) -> None

    def recommend(
        self, findings: List[Dict[str, Any]], target: str = ""
    ) -> RecommendationReport

    def quick_wins(
        self, findings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]

    def impact_analysis(
        self, finding: Dict[str, Any]
    ) -> Dict[str, Any]
```

Generate prioritized fix recommendations.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `recommend(findings, target)` | `RecommendationReport` | Full report with quick wins, long-term fixes, and category summaries. |
| `quick_wins(findings)` | `List[Dict]` | Low-effort, high-severity fixes (one per category). |
| `impact_analysis(finding)` | `Dict` | Blast radius, risk if unfixed/fixed, downstream assets, urgency. |

---

### `reconpro.recommendation_engine.RecommendationReport`

```python
# reconpro/recommendation_engine.py:273-306

@dataclass
class RecommendationReport:
    target: str
    total_findings: int
    quick_wins: List[Dict[str, Any]]
    long_term_fixes: List[Dict[str, Any]]
    all_recommendations: List[RemediationItem]
    category_summary: Dict[str, Dict[str, Any]]
    estimated_total_hours: float
    overall_risk_reduction: float

    def to_dict(self) -> Dict[str, Any]
```

---

## Learning System

### `reconpro.learning_system.LearningSystem`

```python
# reconpro/learning_system.py:37-364

class LearningSystem:
    def __init__(self, learning_file: Optional[Path] = None) -> None

    def record_scan(self, result_dict: Dict[str, Any]) -> None

    def get_target_history(self, target: str) -> Dict[str, Any]

    def suggest_modules(self, target: str) -> List[str]

    def detect_regressions(
        self, target: str, current_findings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]

    def get_scan_effectiveness(self) -> Dict[str, Any]
```

Persist and query scan learning data. Thread-safe via `threading.RLock`. Stores state in `~/.reconpro/memory/learning.json`.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `record_scan(result_dict)` | `None` | Record scan outcome: target, findings, modules, errors, score. |
| `get_target_history(target)` | `Dict` | Scan count, latest score, all scores, modules used, error summary. |
| `suggest_modules(target)` | `List[str]` | Module suggestions based on target patterns and history. Caps at 20. |
| `detect_regressions(target, current_findings)` | `List[Dict]` | New finding categories vs. previous scans. |
| `get_scan_effectiveness()` | `Dict` | Module rankings by avg_findings, error summary, top error modules. |

---

## Decision Engine

### `reconpro.decision_engine.DecisionEngine`

```python
# reconpro/decision_engine.py:96-334

class DecisionEngine:
    def __init__(self, learning_data: Optional[Dict[str, Any]] = None) -> None

    def plan_scan(
        self,
        target: str,
        available_modules: List[str],
        learning_data: Optional[Dict[str, Any]] = None,
    ) -> ScanPlan

    def should_retry(self, module_id: str, error: str, attempt: int) -> bool

    def should_throttle(self, error_rate: float) -> bool

    def optimize_order(
        self,
        modules: List[str],
        target: str,
        effectiveness: Optional[Dict[str, Any]] = None,
    ) -> List[str]
```

Autonomous scan orchestration decisions.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `plan_scan(target, available_modules, learning_data)` | `ScanPlan` | Create optimized scan plan. |
| `should_retry(module_id, error, attempt)` | `bool` | True if error is retryable and attempt < 3. |
| `should_throttle(error_rate)` | `bool` | True if error_rate >= 0.3. |
| `optimize_order(modules, target, effectiveness)` | `List[str]` | Sort by target-type hints, effectiveness, and speed. |

---

### `reconpro.decision_engine.ScanPlan`

```python
# reconpro/decision_engine.py:68-90

@dataclass
class ScanPlan:
    target: str
    target_type: str                 # "ip", "domain", "url", "localhost", "cloud"
    modules_to_run: List[str]
    order: List[str]
    skip_reasons: Dict[str, str]
    estimated_time: float
    retry_modules: Dict[str, int]     # module -> max retries
    throttle_flags: List[str]

    def to_dict(self) -> Dict[str, Any]
```

---

## Autonomous Planner

### `reconpro.autonomous_planner.AutonomousPlanner`

```python
# reconpro/autonomous_planner.py:331-721

class AutonomousPlanner:
    def __init__(self) -> None

    def plan(self, goal: str, context: Optional[Dict[str, Any]] = None) -> ExecutionStrategy

    def replan(
        self,
        strategy: ExecutionStrategy,
        results: Dict[str, Any],
    ) -> ExecutionStrategy

    def estimate_resources(self, strategy: ExecutionStrategy) -> ResourceEstimate

    def validate_strategy(self, strategy: ExecutionStrategy) -> List[str]
```

Convert natural language goals into phased execution strategies.

**Goal Types:** `recon`, `audit`, `compliance`, `attack_surface`, `full_assessment`, `cloud_audit`, `code_review`.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `plan(goal, context)` | `ExecutionStrategy` | Create strategy from natural language. |
| `replan(strategy, results)` | `ExecutionStrategy` | Adjust strategy based on partial results. |
| `estimate_resources(strategy)` | `ResourceEstimate` | CPU, RAM, network, time estimates. |
| `validate_strategy(strategy)` | `List[str]` | List of validation issues (empty = valid). |

---

### `reconpro.autonomous_planner.ExecutionStrategy`

```python
# reconpro/autonomous_planner.py:167-195

@dataclass
class ExecutionStrategy:
    goal_type: str
    target: str
    phases: List[ExecutionPhase]
    total_estimated_time: float
    required_modules: List[str]
    dependencies: Dict[str, List[str]]
    confidence_threshold: float = 0.7
    parallel_groups: List[List[str]] = field(default_factory=list)
    rollback_plan: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]
```

---

### `reconpro.autonomous_planner.ExecutionPhase`

```python
# reconpro/autonomous_planner.py:121-145

@dataclass
class ExecutionPhase:
    name: str
    module_group: List[str]
    parallel: bool = True
    timeout: float = 120.0
    retry_count: int = 1
    depends_on: List[str] = field(default_factory=list)
    success_criteria: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]
```

---

### `reconpro.autonomous_planner.GoalParser`

```python
# reconpro/autonomous_planner.py:201-325

class GoalParser:
    def parse(self, goal: str) -> Dict[str, Any]
```

Parse natural language into `{target, goal_type, constraints, raw_goal}`.

---

## Agent Runtime

### `reconpro.agent_runtime.AgentOrchestrator`

```python
# reconpro/agent_runtime.py:625-871

class AgentOrchestrator:
    def __init__(
        self,
        pipeline: Optional[List[Tuple[str, type]]] = None,
        memory_ref: Optional[Any] = None,
    ) -> None

    def register(self, agent: AgentBase) -> None

    def broadcast(self, message_type: str, payload: Dict[str, Any]) -> None

    def get_agent_status(self) -> Dict[str, str]

    def run_goal(self, goal: str, target: str) -> Dict[str, Any]
```

In-process multi-agent orchestrator. Default pipeline: Planner → Recon → Intelligence → Correlation → Reporting.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `register(agent)` | `None` | Register an agent and wire message routing. |
| `broadcast(message_type, payload)` | `None` | Send a message to all registered agents. |
| `get_agent_status()` | `Dict[str, str]` | Mapping of agent_id → status. |
| `run_goal(goal, target)` | `Dict[str, Any]` | Execute full pipeline, return AutonomousScanReport as dict. |

---

### `reconpro.agent_runtime.AgentBase`

```python
# reconpro/agent_runtime.py:146-231

class AgentBase(ABC):
    def __init__(self, role: str, agent_id: Optional[str] = None) -> None

    def initialize(self, context: AgentContext) -> None

    def set_send_fn(self, fn: Callable) -> None

    @abstractmethod
    def execute(self, task: Dict[str, Any]) -> AgentResult

    def receive(self, message: AgentMessage) -> None

    def send(
        self, recipient: str, msg_type: str, payload: Dict[str, Any],
        correlation_id: Optional[str] = None, in_reply_to: Optional[str] = None,
    ) -> None

    def get_status(self) -> str
```

Abstract base class for all agents. Subclasses must implement `execute()`. The base provides messaging infrastructure and error-safe execution.

---

### `reconpro.agent_runtime.AgentMessage`

```python
# reconpro/agent_runtime.py:55-71

@dataclass
class AgentMessage:
    sender: str
    recipient: str               # agent_id or "broadcast"
    msg_type: str                # task_request, result, status_update, error, coordination
    payload: Dict[str, Any]
    timestamp: float
    correlation_id: str
    in_reply_to: Optional[str]
```

---

### `reconpro.agent_runtime.AgentResult`

```python
# reconpro/agent_runtime.py:86-105

@dataclass
class AgentResult:
    agent_id: str
    role: str
    findings: List[Dict[str, Any]] = field(default_factory=list)
    confidence: float = 0.0
    processing_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]
```

---

### `reconpro.agent_runtime.AgentRole`

```python
# reconpro/agent_runtime.py:42-52

class AgentRole(str, Enum):
    PLANNER = "planner"
    RECON = "recon"
    INTELLIGENCE = "intelligence"
    CORRELATION = "correlation"
    VERIFICATION = "verification"
    REPORTING = "reporting"
    LEARNING = "learning"
    DEFENSE = "defense"
```

---

## Evidence Correlation

### `reconpro.evidence_correlation.EvidenceCorrelator`

```python
# reconpro/evidence_correlation.py:175-505

class EvidenceCorrelator:
    def __init__(self) -> None

    def correlate(
        self,
        findings: List[Dict[str, Any]],
        scan_context: Optional[Dict[str, Any]] = None,
    ) -> CorrelationResult
```

Merge, deduplicate, and corroborate findings from multiple modules.

**Method:** `correlate(findings, scan_context)` → `CorrelationResult`

Pipeline: sanitize → group by fingerprint → build chains → link attack paths → detect severity upgrades → compute statistics.

---

### `reconpro.evidence_correlation.EvidenceChain`

```python
# reconpro/evidence_correlation.py:102-137

@dataclass
class EvidenceChain:
    chain_id: str = ""
    primary_finding: Dict[str, Any] = field(default_factory=dict)
    corroborating_findings: List[Dict[str, Any]] = field(default_factory=list)
    confidence: float = 0.5
    evidence_types: List[str] = field(default_factory=list)
    source_modules: List[str] = field(default_factory=list)
    attack_path: Optional[List[str]] = None
    severity: str = "info"

    def to_dict(self) -> Dict[str, Any]
```

---

### `reconpro.evidence_correlation.CorrelationResult`

```python
# reconpro/evidence_correlation.py:140-167

@dataclass
class CorrelationResult:
    chains: List[EvidenceChain] = field(default_factory=list)
    deduplicated_count: int = 0
    confidence_boosted: int = 0
    severity_upgrades: List[Dict[str, Any]] = field(default_factory=list)
    processing_time_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]
```

---

## Executive Intelligence

### `reconpro.executive_intelligence.ExecutiveIntelligence`

```python
# reconpro/executive_intelligence.py:126-524

class ExecutiveIntelligence:
    def generate(
        self,
        scan_result: Any,
        intelligence_report: Optional[Any] = None,
        correlation_result: Optional[Any] = None,
    ) -> ExecutiveReport
```

Transform technical scan data into executive-level reports.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `scan_result` | `ReconProResult` or `dict` | Scan result. |
| `intelligence_report` | `IntelligenceReport` or `dict` or `None` | Optional enriched intelligence. |
| `correlation_result` | `CorrelationResult` or `dict` or `None` | Optional evidence chains. |

**Returns:** `ExecutiveReport`

---

### `reconpro.executive_intelligence.ExecutiveReport`

```python
# reconpro/executive_intelligence.py:94-120

@dataclass
class ExecutiveReport:
    target: str
    timestamp: str
    scan_summary: Dict[str, Any]
    executive_summary: str
    risk_matrix: List[Dict[str, Any]]
    attack_timeline: List[Dict[str, Any]]
    top_findings: List[Dict[str, Any]]
    remediation_plan: List[Dict[str, Any]]
    engineering_report: Dict[str, Any]
    evidence_chains: List[Dict[str, Any]]
    machine_json: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]
    def to_markdown(self) -> str
```

---

## Memory

### `reconpro.memory.UnifiedMemoryStore`

```python
# reconpro/memory.py:50-920

class UnifiedMemoryStore:
    def __init__(self) -> None

    # Knowledge Graph
    def add_target(self, target: str, **attrs: Any) -> None
    def add_vulnerability(self, name: str, target: str, severity: str = "info", **attrs: Any) -> None
    def add_asset(self, label: str, **attrs: Any) -> None
    def add_cve(self, cve_id: str, target: str, **attrs: Any) -> None
    def add_endpoint(self, url: str, target: str, **attrs: Any) -> None
    def add_technology(self, name: str, **attrs: Any) -> None
    def add_relation(self, src: str, dst: str, etype: str, **attrs: Any) -> None
    def get_attack_surface(self, target: str) -> Dict[str, List[Dict[str, Any]]]
    def get_blast_radius(self, node: str) -> List[Dict[str, Any]]
    def find_chains(self, target: str, max_depth: int = 5) -> List[List[Dict[str, Any]]]
    def shortest_path(self, src: str, dst: str) -> Optional[List[Dict[str, Any]]]
    def graph_stats(self) -> Dict[str, Any]
    def graph(self) -> KnowledgeGraph

    # Finding Store
    def save_finding(self, target: str, finding_dict: Dict[str, Any]) -> None
    def get_findings(self, target: str, severity: Optional[str] = None, limit: int = 100, since: Optional[float] = None) -> List[Dict[str, Any]]
    def get_latest_findings(self, target: str, limit: int = 50) -> List[Dict[str, Any]]
    def finding_count(self, target: str, severity: Optional[str] = None) -> int
    def trend(self, target: str, days: int = 30) -> List[Dict[str, Any]]

    # Agent Blackboard
    def bb_set(self, agent_id: str, key: str, value: Any) -> None
    def bb_get(self, key: str) -> Optional[Any]
    def bb_get_all(self, agent_id: Optional[str] = None) -> Dict[str, Any]
    def bb_clear(self) -> None

    # Credential Vault
    def vault_store(self, source: str, credential_type: str, value: str) -> None
    def vault_get_all(self, source: Optional[str] = None) -> List[Dict[str, str]]
    def vault_search(self, query: str) -> List[Dict[str, str]]
    def vault_purge(self) -> None

    # Scan-level
    def add_scan_result(self, scan_dict: Dict[str, Any]) -> None
    def add_finding_from_scan(self, finding: Dict[str, Any]) -> None
    def export_all(self) -> Dict[str, Any]
    def clear_all(self) -> None
    def save(self) -> None
    def load(self) -> None
    def stats(self) -> Dict[str, Any]
```

### `reconpro.memory.get_memory()`

```python
# reconpro/memory.py:920

def get_memory() -> UnifiedMemoryStore
```

Returns a module-level singleton `UnifiedMemoryStore`.

---

## Knowledge Graph

### `reconpro.knowledge_graph.SecurityKnowledgeGraph`

```python
# reconpro/knowledge_graph.py:181-760

class SecurityKnowledgeGraph:
    def __init__(self) -> None

    def add_scan_result(self, result_dict: Dict[str, Any]) -> None
    def add_finding(self, finding_dict: Dict[str, Any]) -> None
    def add_cve(self, cve_id: str, target: str, **attrs: Any) -> None
    def add_subdomain(self, domain: str, parent: str) -> None
    def get_attack_surface(self, target: str) -> Dict[str, List[Dict[str, Any]]]
    def get_blast_radius(self, asset: str) -> List[Dict[str, Any]]
    def find_chains(self, target: str) -> List[List[Dict[str, Any]]]
    def get_vulnerable_assets(self) -> List[Dict[str, Any]]
    def correlate(self) -> List[Dict[str, Any]]
    def to_cypher(self) -> str
    def stats(self) -> Dict[str, Any]
    def save(self, path: Optional[str] = None) -> str
    def load(self, path: Optional[str] = None) -> None
```

Uses `networkx.DiGraph` when available, otherwise a built-in `_FallbackDiGraph` with the same API. Persists to `~/.reconpro/memory/graph.json`.

**Node Types:** `target`, `vulnerability`, `technology`, `cve`, `subdomain`, `endpoint`, `port`, `asset`.

**Edge Types:** `has_finding`, `has_vulnerability`, `uses_tech`, `has_cve`, `subdomain_of`, `exposed_port`, `hosts_endpoint`, `related_to`.

---

## Prompt Defense

### `reconpro.prompt_defense.PromptDefense`

```python
# reconpro/prompt_defense.py:226-331

class PromptDefense:
    def __init__(self, sensitivity: str = "medium") -> None

    def sanitize_input(self, text: str) -> SanitizationResult

    def validate_response(self, response: str) -> ResponseValidationResult
```

Detect and mitigate prompt injection attacks.

**Sensitivity Levels:** `low` (trigger at 2+ matches), `medium` (trigger at 1+), `high` (includes low-severity patterns).

**Pattern Categories (input):** role_manipulation, instruction_override, data_exfiltration, system_extraction, delimiter_attack, encoding_bypass, payload_injection.

**Pattern Categories (response):** prompt_leak, system_prompt_echo, safety_filter_bypass_admission, structured_data_leak.

---

### `reconpro.prompt_defense.SanitizationResult`

```python
@dataclass
class SanitizationResult:
    cleaned: str
    threat_level: ThreatLevel
    matched_patterns: List[str] = field(default_factory=list)
    is_safe: bool = True

    def to_dict(self) -> Dict[str, object]
```

---

### `reconpro.prompt_defense.ThreatLevel`

```python
class ThreatLevel(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
```

---

## Security Audit

### `reconpro.security_audit.SecurityAuditor`

```python
# reconpro/security_audit.py:149-267

class SecurityAuditor:
    def __init__(self, extra_patterns: Optional[List[Tuple[str, str, str, str]]] = None) -> None

    def check_file(self, filepath: str) -> List[SecurityFinding]

    def audit_codebase(self, package_dir: Optional[str] = None) -> SecurityAuditReport
```

Scan Python codebases for security vulnerabilities.

**Check Categories:** hardcoded_secret, unsafe_subprocess, eval_exec, unsafe_deserialization, path_traversal, resource_exhaustion, unsafe_logging.

---

### `reconpro.security_audit.SecurityAuditReport`

```python
@dataclass
class SecurityAuditReport:
    files_scanned: int = 0
    total_findings: int = 0
    findings: List[SecurityFinding] = field(default_factory=list)
    severity_counts: Dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, object]
```

---

## Plugin System

### `reconpro.plugins.discover_plugins()`

```python
# reconpro/plugins.py:204-241

def discover_plugins() -> Dict[str, Dict[str, Any]]
```

Discover all plugins in `~/.reconpro/plugins/`. Returns dict mapping plugin_id to `{name, runner, path, description}`.

---

### `reconpro.plugins.run_plugin()`

```python
# reconpro/plugins.py:244-303

def run_plugin(
    plugin_id: str,
    target: str,
    base_url: str = "",
    timeout: int = 8,
    verify_tls: bool = True,
) -> List[Finding]
```

Run a specific plugin with sandboxed execution.

---

### `reconpro.plugins.create_plugin_template()`

```python
# reconpro/plugins.py:315

def create_plugin_template(name: str) -> str
```

Return a plugin template source code string.

---

### `reconpro.plugins.PluginSecurityError`

```python
class PluginSecurityError(Exception):
    """Raised when a plugin violates the security sandbox."""
```

---

## Auto Validation

### `reconpro.auto_validation.AutoValidator`

```python
# reconpro/auto_validation.py:134-310

class AutoValidator:
    def __init__(self, package_dir: Optional[str] = None) -> None

    def validate_imports(self, package_dir: Optional[str] = None) -> ValidationCheck

    def validate_syntax(self, package_dir: Optional[str] = None) -> ValidationCheck

    def validate_security(self, package_dir: Optional[str] = None) -> ValidationCheck

    def validate_tests(self) -> ValidationCheck

    def run_all(self) -> FullValidationReport
```

---

## Async Engine

### `reconpro.engine.ScanEngine`

```python
# reconpro/engine.py:150-698

class ScanEngine:
    def __init__(
        self,
        event_callback: Optional[Callable] = None,
        max_concurrency: int = 5,
    ) -> None

    async def run(
        self,
        target: str,
        modules: Optional[List[str]] = None,
        all_modules: bool = False,
        timeout: int = 8,
        verify_tls: bool = True,
        rate_limit: float = 10.0,
    ) -> ReconProResult

    def scan_one(
        self,
        target: str,
        modules: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> ReconProResult
```

Async scan orchestrator. Drop-in replacement for `scanner.scan()` with concurrent module execution and event-driven architecture.

### `reconpro.engine.ScanEvent`

```python
@dataclass
class ScanEvent:
    type: str                   # SCAN_START, MODULE_START, FINDING, MODULE_COMPLETE, SCAN_COMPLETE
    module_id: Optional[str]
    target: Optional[str]
    finding: Optional[Finding]
    result: Optional[ReconProResult]
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)
```

### `reconpro.engine.concurrent_scan()`

```python
async def concurrent_scan(
    targets: List[str],
    max_workers: int = 4,
    **kwargs: Any,
) -> Dict[str, ReconProResult]
```

Scan multiple targets in parallel. Returns dict mapping target → ReconProResult.

---

## HTTP Utilities

### `reconpro.http.Finding`

```python
# reconpro/http.py:108-133

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

    def to_dict(self) -> Dict[str, Any]
```

### `reconpro.http.RateLimiter`

```python
# reconpro/http.py:19-45

class RateLimiter:
    def __init__(self, max_per_second: float = 10.0) -> None
```

Token-bucket rate limiter. The global `default_limiter` is used by `scanner.scan()`.

### `reconpro.http.compute_grade()`

```python
# reconpro/http.py:148-152

def compute_grade(score: int) -> str
```

Map numeric score to letter grade: A+ (90+), A (80+), B (65+), C (50+), D (35+), F (<35).

### `reconpro.http.badge_markdown()`

```python
# reconpro/http.py:155-165

def badge_markdown(host: str, grade: str) -> str
```

Generate a shields.io markdown badge URL for the given host and grade.
