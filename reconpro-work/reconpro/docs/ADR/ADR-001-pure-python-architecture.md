# ADR-001: Pure Python Architecture (No External Dependencies)

## Status

Accepted

## Context

ReconPro v10 is a security reconnaissance platform with 27 scanning modules. The core architectural decision was to use **only the Python standard library** — no `requests`, no `scapy`, no `aiohttp`, no `beautifulsoup4`. Every HTTP request goes through `urllib.request`, every DNS lookup through `socket.getaddrinfo`, every TLS connection through `ssl`.

This decision was driven by several factors:

1. **Deployment simplicity** — Enterprise security teams operate in locked-down environments where `pip install` is restricted or requires security review. A zero-dependency tool can be copied to any air-gapped system with Python 3.8+.

2. **Reproducibility** — External dependencies introduce version conflicts, supply chain risks, and breakage when upstream packages change. The Log4Shell incident demonstrated that transitive dependencies are attack vectors.

3. **Legal/compliance** — Some enterprise environments prohibit open-source packages that haven't been through legal review. A stdlib-only tool avoids this entirely.

4. **Forensic reliability** — When used in incident response, the tool must produce consistent results. External library updates can silently change behavior (e.g., different TLS cipher ordering, different HTTP header handling).

### Alternatives Considered

- **`requests` library**: The de facto standard for HTTP in Python. Would simplify HTTP code significantly. Rejected due to dependency requirement and larger attack surface.
- **`scapy`**: Would enable raw socket access for true OS fingerprinting and packet crafting. Rejected due to requiring `libpcap`/`npcap` and root privileges.
- **`httpx`**: Modern async HTTP client. Rejected for same reasons as `requests`.
- **`aiohttp`**: Async HTTP would enable parallel scanning. Rejected due to dependency and complexity requirements.

## Decision

All ReconPro modules MUST use only Python standard library imports. The approved modules are:

- `urllib.request` / `urllib.error` / `urllib.parse` — HTTP requests
- `socket` — DNS resolution, connection handling
- `ssl` — TLS configuration
- `http.client` — Low-level HTTP connections (used in quantum_fingerprint)
- `time` / `datetime` — Timing analysis
- `json` / `re` / `math` / `statistics` — Data processing
- `hashlib` / `base64` / `struct` — Cryptographic primitives
- `dataclasses` / `typing` — Type safety
- `threading` — Thread-safe rate limiting
- `pathlib` — File system operations
- `email.utils` — Date header parsing

The `http.py` module serves as the centralized HTTP layer. All modules delegate through `http_probe()` to ensure consistent behavior (rate limiting, TLS verification, User-Agent, body truncation).

## Consequences

### Positive

- **Works everywhere**: Any system with Python 3.8+ runs ReconPro. No compilation, no native dependencies, no virtual environment setup. Copy the directory and run.
- **No supply chain risk**: Zero transitive dependencies mean zero supply chain attack surface. The tool IS its dependency tree.
- **Forensic consistency**: `urllib.request` behavior is tied to the Python version, which changes infrequently and predictably. Findings are reproducible across runs.
- **Air-gap capable**: Can operate on completely disconnected networks. No CDN or package registry access needed at runtime.
- **Small footprint**: The entire tool is a single directory of Python files. No `node_modules`-style bloat.
- **Easy auditing**: Security teams can audit the entire codebase without tracing through third-party packages.

### Negative

- **No raw socket access**: Cannot perform SYN scans, ARP requests, ICMP probes, or packet capture. This is the most significant limitation — it prevents network-layer reconnaissance entirely.
- **Slower than C-based tools**: `urllib.request` is 10-100x slower than C-based HTTP libraries (libcurl) for high-throughput scanning. ReconPro's default rate limit of 10 req/s is partly a consequence.
- **No async I/O**: The stdlib's `asyncio` is available but `urllib.request` is blocking. True parallel scanning requires threading (which Python's GIL limits) or `asyncio` with `aiohttp` (which is an external dependency).
- **Limited protocol support**: Only HTTP/HTTPS is supported. No DNS protocol queries (beyond `getaddrinfo`), no TCP handshake analysis, no TLS fingerprinting (beyond what `ssl` exposes).
- **More verbose code**: Without `requests`, every HTTP interaction requires manual header management, error handling, and response parsing. The `http_probe()` abstraction mitigates this but adds a maintenance burden.
- **Missing ecosystem features**: No integration with Burp Suite, no ZAP proxy support, no CI/CD GitHub Actions (without writing them from scratch).

### Neutral

- **`rich` library exception**: The CLI interface uses `rich` for terminal output. This is technically an external dependency but is treated as a presentation-layer concern that doesn't affect scanning logic. Modules remain stdlib-only.
- **Playwright exception**: The `screenshot` power uses Playwright for browser screenshots. This is an optional, explicitly-invoked capability outside the core scanning modules.

## Validation

This decision is validated by:
1. Every module file imports only from `..http`, `..utils`, `..constants`, and stdlib modules.
2. No `requirements.txt` or `pyproject.toml` dependencies exist for core scanning.
3. The tool runs in a fresh Python 3.8 environment with zero installation steps.

## Related Decisions

- ADR-003: HTTP Timing-Based Fingerprinting (consequence of no raw sockets)
- ADR-005: Zero-Config Operation (enabled by zero dependencies)