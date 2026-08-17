# ReconPro v10 -- API Reference

## Public API

### reconpro.scan()

Run a remote security scan against a target domain or URL.

```python
from reconpro import scan

result = scan(
    target: str,
    modules: list[str] | None = None,
    all_modules: bool = False,
    timeout: int = 8,
    verify_tls: bool = True,
    rate_limit: float = 10.0,
) -> ReconProResult
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| target | str | required | Domain or URL to scan |
| modules | list[str] or None | None | Module IDs to run. None = DEFAULT_MODULES |
| all_modules | bool | False | Run all 23 remote modules |
| timeout | int | 8 | Per-request HTTP timeout in seconds |
| verify_tls | bool | True | Verify TLS certificates |
| rate_limit | float | 10.0 | Max HTTP requests per second |

**Raises:** `ValueError` if target is invalid.

### reconpro.audit_scan()

Run a local machine or project audit.

```python
from reconpro import audit_scan

result = audit_scan(
    target: str = ".",
    modules: list[str] | None = None,
    all_modules: bool = False,
) -> ReconProResult
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| target | str | "." | Directory path or "localhost" |
| modules | list[str] or None | None | Local module IDs (host, dev, doctor) |
| all_modules | bool | False | Run all 3 local modules |

### reconpro.ReconProResult

Dataclass containing the complete scan result.

**Fields:**

| Field | Type | Description |
|---|---|---|
| target | str | Scanned target (hostname) |
| modules_run | list[str] | IDs of modules that were executed |
| findings | list[dict] | All findings as dicts |
| severity_counts | dict[str, int] | Counts per severity level |
| total_score | int | Security score 0-100 |
| grade | str | Letter grade (A+, A, B, C, D, F) |
| badge_markdown | str | GitHub-style badge markdown |
| vibesec_score | int or None | VibeSec module score (if run) |
| vibesec_grade | str or None | VibeSec module grade (if run) |
| module_results | dict[str, dict] | Per-module detailed results |

**Methods:**

- `to_dict() -> dict[str, Any]` -- Serializes the result to a dictionary.

## HTTP Layer

### http_probe()

```python
from reconpro.http_layer import http_probe

result: dict[str, Any] = http_probe(
    url: str,
    method: str = "GET",
    body: bytes | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 8,
    verify_tls: bool = True,
    limiter: RateLimiter | None = None,
)
```

**Returns dict with keys:** `ok` (bool), `status` (int), `reason` (str),
`headers` (dict), `body` (str, max 16384 chars).

On HTTP errors, returns the error response with `ok=False`.
On connection errors, returns `ok=False, status=0`.

### Finding

```python
from reconpro.http_layer import Finding

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

    def to_dict() -> dict[str, Any]: ...
```

### RateLimiter

```python
from reconpro.http_layer import RateLimiter

limiter = RateLimiter(max_per_second: float = 10.0)
limiter.acquire()  # Blocks until a token is available
```

Thread-safe token-bucket implementation using `threading.Lock` and
`time.monotonic()`. Each `scan()` call creates its own limiter instance.

## Utilities

### extract_host()

```python
from reconpro.utils import extract_host

host: str = extract_host(target: str) -> str
```

Strips scheme and path from a target string.

- `"https://example.com/path"` -> `"example.com"`
- `"http://example.com:8080/"` -> `"example.com:8080"`
- `"example.com"` -> `"example.com"`

### normalize_base_url()

```python
from reconpro.utils import normalize_base_url

url: str = normalize_base_url(target: str) -> str
```

Ensures the target has an `https://` prefix.

- `"example.com"` -> `"https://example.com"`
- `"http://example.com"` -> `"http://example.com"`

### validate_target()

```python
from reconpro.utils import validate_target

is_valid: bool, reason: str = validate_target(target: str) -> tuple[bool, str]
```

Checks for empty input, shell metacharacters, hostname length (max 253),
and flags private IPs with `reason="LOCAL"`.

### compute_score()

```python
from reconpro.utils import compute_score

score: int = compute_score(findings: list, max_score: int = 100) -> int
```

Deducts `points_deducted` from each finding. Returns 0 if no findings (no
findings = perfect score). Clamped to `[MIN_SCORE, max_score]`.

### count_severities()

```python
from reconpro.utils import count_severities

counts: dict[str, int] = count_severities(findings: list) -> dict[str, int]
```

Returns dict like `{"critical": 2, "high": 5, "medium": 12, "low": 3, "info": 8}`.
Accepts both Finding objects and dicts with a `severity` key.

### sort_findings_by_severity()

```python
from reconpro.utils import sort_findings_by_severity

sorted_list: list = sort_findings_by_severity(
    findings: list,
    reverse: bool = False,
) -> list
```

Stable sort. Default: critical first (`reverse=False`). Set `reverse=True`
for info first.

## Security

### sanitize_target()

```python
from reconpro.security import sanitize_target

clean: str = sanitize_target(target: str) -> str
```

Strips null bytes, control chars, shell metacharacters. Collapses whitespace.
Returns empty string for falsy input.

### detect_secrets_in_text()

```python
from reconpro.security import detect_secrets_in_text

findings: list[dict] = detect_secrets_in_text(text: str) -> list[dict]
```

Returns list of dicts with keys: `type`, `match`, `line`, `offset`, `confidence`.
Detects AWS keys, GitHub tokens, private keys, DB strings, JWTs, and more.

### SecurityAuditLogger

```python
from reconpro.security import SecurityAuditLogger

logger = SecurityAuditLogger(
    log_dir: str | None = None,   # Defaults to ~/.reconpro/
    module_name: str = "security",
)

logger.info(event_type: str, target: str = "", details: dict | None = None)
logger.warn(event_type: str, target: str = "", details: dict | None = None)
logger.alert(event_type: str, target: str = "", details: dict | None = None)
logger.close()
```

Writes JSON-formatted audit entries to `~/.reconpro/audit.log`.
Rotates at 10 MB with 5 backups.

## Observability

### StructuredLogger

```python
from reconpro.observability import StructuredLogger

log = StructuredLogger(
    module: str = "root",
    enabled: bool = True,
    min_level: str = "DEBUG",
    output_file: str | None = None,
)

log.set_trace_context(trace_id: str | None, target: str | None = None)
log.debug(event: str, **kwargs)
log.info(event: str, **kwargs)
log.warning(event: str, **kwargs)
log.error(event: str, **kwargs)
log.critical(event: str, **kwargs)
log.log_exception(event: str, exc: BaseException | None = None)
log.child(module: str) -> StructuredLogger
log.close()
```

Outputs JSON lines with fields: `ts`, `level`, `module`, `event`, plus
optional `trace_id`, `target`, and arbitrary kwargs. Thread-safe.

### MetricsCollector

```python
from reconpro.observability import MetricsCollector

metrics = MetricsCollector(enabled: bool = True)

metrics.counter_increment(name: str, amount: float = 1)
metrics.gauge_set(name: str, value: float)
metrics.gauge_increment(name: str, amount: float = 1)
metrics.histogram_observe(name: str, value: float)
metrics.timer_start(name: str) -> str
metrics.timer_stop(name: str) -> float | None
metrics.timer_context(name: str) -> TimerContext  # context manager
snapshot: dict = metrics.get_snapshot()
metrics.reset()
```

Thread-safe. O(1) operations. Disabled metrics cost ~50ns per call.
Snapshot includes histogram percentiles (p50, p95, p99).

### ScanTracer

```python
from reconpro.observability import ScanTracer

tracer = ScanTracer(target: str, enabled: bool = True)

tracer.start_scan()
tracer.start_module(module_id: str)
tracer.end_module(module_id: str, findings: int = 0, status: str = "ok", error: str | None = None)
tracer.add_error(message: str)
tracer.set_module_detail(module_id: str, key: str, value: Any)
receipt: dict = tracer.end_scan(score: int | None = None)
tracer.get_receipt() -> dict  # Without ending scan
tracer.reset()
```

Produces an execution receipt with per-module timing, finding counts,
and error details.

## Module Registry

```python
from reconpro.registry import (
    MODULE_REGISTRY,      # dict[str, dict[str, Any]]
    LOCAL_MODULES,       # dict[str, dict[str, Any]]
    ALL_MODULES,         # list[str]
    DEFAULT_MODULES,     # list[str]  (20 modules)
    DEFAULT_LOCAL_MODULES,  # list[str]  (host, dev, doctor)
    get_module_runner,   # (module_id: str) -> Callable | None
    is_local_module,     # (module_id: str) -> bool
    is_remote_module,    # (module_id: str) -> bool
)
```

## Formats (Export)

```python
from reconpro.formats import export_sarif, export_json, export_markdown, export_html

data = result.to_dict()

export_json(data, output_path: str) -> str    # Returns output path
export_sarif(data, output_path: str) -> str   # SARIF 2.1.0 for GitHub
export_markdown(data, output_path: str) -> str
export_html(data, output_path: str) -> str
```
