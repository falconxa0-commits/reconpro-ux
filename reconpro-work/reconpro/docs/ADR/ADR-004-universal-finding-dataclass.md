# ADR-004: Universal Finding Dataclass

## Status

Accepted

## Context

ReconPro v10 has 27 modules, each producing security findings. Before the universal `Finding` dataclass, modules returned heterogeneous data structures:

- Some returned `dict` objects with varying keys
- Some returned `tuple` objects (finding, score, grade)
- Some printed directly to console
- Severity was sometimes a string, sometimes an integer

This created problems for the scan engine (`scanner.py`), which needed to:
1. Aggregate findings across all modules
2. Count severities consistently
3. Compute a single score/grade for the target
4. Serialize to JSON, HTML, and SARIF

### Alternatives Considered

1. **Structured dict with schema validation**: Every module returns a dict conforming to a JSON schema. Rejected — no runtime type checking in Python dicts, more verbose than dataclasses.

2. **Result classes per module**: Each module defines its own finding class. Rejected — prevents aggregation and requires `isinstance` checks throughout.

3. **Pydantic models**: Use Pydantic for validation. Rejected — external dependency (violates ADR-001).

4. **Named tuples**: Lightweight and immutable. Rejected — don't support default values cleanly and lack methods.

## Decision

Define a single `Finding` dataclass in `http_layer.py` (the shared layer) that ALL modules use:

```python
@dataclass
class Finding:
    title: str            # Human-readable finding title
    severity: str         # "critical" | "high" | "medium" | "low" | "info"
    category: str         # Finding category (e.g., "auth", "c2", "infrastructure")
    module: str           # Module ID that produced this finding
    description: str      # Detailed description of the finding
    evidence: str         # Raw evidence (headers, response snippets, patterns)
    asset: str            # Affected asset (URL, IP, domain)
    points_deducted: int = 0     # Score penalty (0-100 scale)
    remediation: str = ""        # Suggested fix
    dread_score: float = 0.0     # DREAD risk score (0.0-10.0)
```

### Design Rules

1. **All required fields are positional**: `title`, `severity`, `category`, `module`, `description`, `evidence`, `asset` must be provided. This forces module authors to include essential information.

2. **Optional fields have defaults**: `points_deducted`, `remediation`, and `dread_score` default to zero/empty. Modules that don't compute DREAD scores or remediation can omit them.

3. **Severity is a validated string**: Valid values are defined in `constants.py` as `VALID_SEVERITIES: frozenset = {"critical", "high", "medium", "low", "info"}`. The `validate_severity()` utility normalizes and validates.

4. **`to_dict()` method**: Every Finding can be serialized to a plain dict for JSON output. This is the only serialization method needed — HTML and SARIF generation happen at the report layer.

5. **Severity ordering**: Defined in `constants.py` as `SEVERITY_LEVELS = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}`. Lower numeric value = higher severity. Used for sorting and display.

6. **Scoring is additive**: Each Finding deducts points from a base score of 100. The `compute_score()` utility in `utils.py` sums all deductions and clamps to `[0, 100]`.

7. **Grading is derived from score**: Score maps to letter grades (A+ through F) via `GRADE_THRESHOLDS` in `constants.py`. Grades are NOT stored on Findings — they are computed at scan completion.

### The Exception: `vibesec` Module

The `vibesec` module returns a 4-tuple `(findings, score, grade, badge_markdown)` instead of just a list of Findings. This is handled as a special case in `scanner.py`. The `vibesec` score/grade are module-specific and coexist with the overall scan score/grade in `ReconProResult`.

## Consequences

### Positive

- **Uniform aggregation**: `scanner.py` can collect findings from any module and process them identically. No per-module special handling (except `vibesec`).
- **Type safety**: IDE autocompletion works for Finding fields. Typos in field names are caught at development time.
- **Consistent output**: Every finding has the same structure regardless of which module produced it. HTML reports, JSON output, and SARIF can be generated from a uniform data source.
- **Scoring is transparent**: `points_deducted` is explicit. Users can understand why a score is what it is.
- **Severity standardization**: The 5-level system (critical/high/medium/low/info) maps cleanly to CVSS qualitative ratings and SARIF levels.

### Negative

- **Rigid structure**: Not all findings fit neatly into the `title/description/evidence/asset` model. Some modules might want to include structured data (e.g., timing distributions, confidence intervals) that don't fit as strings.
- **No nested findings**: A finding cannot contain sub-findings. Complex analyses (like `quantum_fingerprint`'s 7-signal analysis) must produce multiple flat findings or compress results into a single `evidence` string.
- **DREAD is optional but expected**: Some modules compute DREAD scores, others don't. The `dread_score: float = 0.0` default means missing DREAD is indistinguishable from "no risk".
- **No Finding ID**: Findings have no unique identifier, making deduplication and cross-scan tracking difficult. Each scan produces new Finding objects with no link to previous scans.
- **No confidence field**: The `nation_state_attributor` and `quantum_fingerprint` modules produce probabilistic results, but there's no `confidence: float` field. Confidence is embedded in `description` or `evidence` as text.
- **Single asset per finding**: A finding affects exactly one `asset`. Bulk findings ("10 subdomains found") require 10 separate Finding objects or one Finding with a list in `evidence`.

### Neutral

- **The `to_dict()` method**: Using `dataclasses.asdict()` would be more concise, but the manual implementation ensures forward compatibility if fields are added or changed.

## Validation

1. Every module's `run_*` function returns `List[Finding]` (or `Tuple[List[Finding], int, str, str]` for vibesec).
2. `scanner.py` can aggregate findings from all modules without per-module type checks.
3. `findings[0].to_dict()` produces a plain dict serializable to JSON.
4. `compute_score(findings)` and `count_severities(findings)` work correctly regardless of which module produced the findings.

## Related Decisions

- ADR-001: Pure Python Architecture (dataclass is stdlib, no Pydantic)
- ADR-002: Centralized Module Registry (registry uses Finding type indirectly via runners)
- ADR-005: Zero-Config Operation (default points_deducted values provide reasonable scoring without configuration)