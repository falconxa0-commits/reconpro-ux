# ReconPro v10 -- Performance Guide

## Benchmark Results

ReconPro v10 is optimized for speed on standard hardware. Key metrics from
the test suite (`tests/test_performance.py`) and real-world usage:

| Metric | Value | Notes |
|---|---|---|
| Cold start (import) | <100ms | Lazy module loading via registry |
| Module discovery | <5ms | 26 modules in registry |
| Rate limiter overhead | ~50ns | When disabled; ~1us when active |
| HTTP probe (success) | ~200ms-2s | Depends on target latency |
| HTTP probe (timeout) | 8s (configurable) | DEFAULT_TIMEOUT |
| Full 20-module scan | 30s-120s | Depends on target and network |
| Single module scan | 1s-10s | Depends on module complexity |
| Memory per scan | <50MB | Body capped at 16KB per request |

## Performance Characteristics

### Startup Time

ReconPro uses lazy imports for all module runners. The `_get_runners()`
function in `registry.py` loads `modules/__init__.py` only on first access,
meaning CLI startup is near-instant for help text and argument parsing.
Module code is only loaded when actually needed for a scan.

The import chain is: `__init__.py` -> `scanner.py` (imports registry, http,
utils) -> `registry.py` (defines dicts, does NOT import modules until called).

### Scan Speed

Scan speed is primarily determined by:

1. **Network latency** to the target (dominates for remote modules)
2. **Rate limiting** -- default 10 req/s, adjustable via `rate_limit` parameter
3. **Module count** -- each module makes multiple HTTP probes
4. **Per-request timeout** -- default 8s, adjustable via `timeout` parameter

The recon module is typically the slowest (25 categories, many HTTP probes).
Lightweight modules like honeypot_dance or covert_channel may complete
in a single probe.

### Memory Usage

Memory is bounded by design:

- HTTP response bodies are capped at `DEFAULT_BODY_LIMIT` (16,384 bytes)
- Findings are small dataclasses (~200 bytes each)
- The `MetricsCollector` stores histogram values in-memory but is bounded
  by the number of observations
- No in-memory caching of past scan results (stored on disk in `~/.reconpro/scans/`)

A typical 20-module scan stays under 50MB RSS. The recon module with
its 25 categories may temporarily spike higher due to multiple concurrent
response buffers, but these are garbage-collected after each probe.

### CPU Utilization

ReconPro is I/O-bound, not CPU-bound. CPU is used for:

- JSON parsing of API responses (small payloads due to body limit)
- Regex matching in secret detection and pattern analysis
- Shannon entropy calculation in `utils.entropy()`
- TLS handshake (handled by ssl stdlib)

CPU usage is typically <5% during network-wait phases and may spike
to 20-30% during active processing phases.

## Optimization Tips

### Rate Limiting

The default rate limit of 10 req/s is conservative for most targets.
Adjust based on your needs:

```python
# Aggressive (risk of WAF block)
result = scan("example.com", rate_limit=50.0)

# Stealthy (slow but less detectable)
result = scan("example.com", rate_limit=2.0)

# Burst-friendly (for short scans)
result = scan("example.com", rate_limit=20.0, timeout=5)
```

### Parallel Scanning

Use `reconpro blitz` for multi-target scanning. The async engine in
`engine.py` (`ScanEngine`) provides bounded concurrency:

```python
from reconpro.engine import ScanEngine, concurrent_scan

# Concurrent multi-target scan
results = concurrent_scan(
    targets=["t1.com", "t2.com", "t3.com"],
    max_workers=4,
    timeout=8,
)
```

The `DEFAULT_MAX_WORKERS` constant is 4. Increase for more targets but
be mindful of rate limits.

### Module Selection

Running only the modules you need is the single biggest performance
improvement:

```bash
# Fast: just recon and auth
reconpro example.com -m recon,auth

# Moderate: core security modules
reconpro example.com -m recon,auth,chain,bot,gorgon

# Full: all default modules
reconpro example.com

# Everything including non-default
reconpro example.com --all
```

The three non-default remote modules (`cloud_recon`, `team`, `nhi`) are
excluded from default scans for performance reasons. Add them explicitly
if needed.

### Network Conditions

- **High latency targets**: Increase `timeout` from 8 to 15-30 seconds
- **Rate-limited targets**: Decrease `rate_limit` to 2-5 req/s
- **Unreliable connections**: Lower `timeout` and rely on the fail-open model
- **Local network targets**: Can safely increase `rate_limit` to 50+ req/s

## Scaling

### Single Target

A single target scan with default modules completes in 30-120 seconds.
The bottleneck is network I/O, not computation.

### Multi-Target Blitz

`reconpro blitz` uses the async engine for parallel target processing.
With `max_workers=4`, scanning 10 targets takes roughly 2.5x the single-
target time (parallelism overhead + rate limiting across shared limiter).

### Large Organizations

For continuous scanning of large attack surfaces:

1. Use `reconpro schedule` for cron-like recurring scans
2. Split targets across multiple `reconpro blitz` invocations
3. Export to SARIF for centralized tracking in GitHub/GitLab
4. Use `reconpro serve` for API-driven on-demand scans
5. Integrate findings via webhooks to Slack, Jira, or PagerDuty
6. Monitor scan performance via `ScanTracer` receipts and `MetricsCollector` snapshots
