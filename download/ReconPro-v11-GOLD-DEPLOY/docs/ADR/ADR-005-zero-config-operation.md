# ADR-005: Zero Configuration Required

## Status

Accepted

## Context

Security tools have a reputation for complex configuration. Nmap requires understanding of scan types, port specifications, and timing templates. ZAP requires proxy configuration and scan policies. Zeek requires scripts and network interface configuration.

ReconPro's target user is someone who types `reconpro example.com` and gets actionable results immediately. The design goal is:

> **A security professional should get useful output within 5 seconds of installing the tool, with zero configuration.**

### The Configuration Problem

Most security tools require configuration for:
- Which checks to run (scan profiles)
- Rate limits and timeouts
- Output format
- Authentication credentials
- Target scope
- Exclusions
- API keys for external services

Each configuration item is a potential point of failure and a barrier to adoption.

### Alternatives Considered

1. **YAML/JSON config file**: Industry standard for tooling (e.g., `.nuclei-config.yaml`, `zap.conf`). Rejected — requires file creation and path management.

2. **CLI flags only**: Every option is a command-line argument. Rejected — too many flags (27 modules × multiple options = combinatorial explosion).

3. **Interactive wizard**: Ask the user questions at runtime. Partially implemented (the `chat` power). Rejected as the default — interactive mode is slower than automatic defaults.

4. **Environment variables**: `RECONPRO_RATE_LIMIT=20 reconpro example.com`. Rejected — adds cognitive overhead and conflicts with the "just works" goal.

## Decision

### Default Everything

ReconPro ships with sensible defaults for every parameter:

| Parameter | Default | Rationale |
-----------|---------|-----------|
| Modules | `DEFAULT_MODULES` (20 modules) | Run all remote modules by default for maximum coverage |
| Timeout | 8 seconds | Balance between thoroughness and speed |
| Rate limit | 10 req/s | Safe for most targets, won't trigger WAFs |
| TLS verification | Enabled | Security best practice; `--no-tls-verify` to disable |
| Body limit | 16 KB | Sufficient for header/footer analysis, prevents memory issues |
| Max workers | 4 | Conservative default; respects system resources |
| User-Agent | `ReconPro/10.0 (Enterprise Security Scanner)` | Identifies the scanner; responsible disclosure |
| Severity levels | 5 (critical/high/medium/low/info) | Standard CVSS-aligned levels |
| Scoring | 100-point scale with letter grades | Universally understood (school grading) |
| Output directory | `~/.reconpro/scans/` | Standard XDG-like home directory |
| Plugin directory | `~/.reconpro/plugins/` | Discoverable but non-intrusive |

### Progressive Disclosure

The zero-config approach doesn't mean zero options. ReconPro uses progressive disclosure:

1. **Level 0 — No arguments**: `reconpro example.com` runs 20 default modules.
2. **Level 1 — Module selection**: `reconpro example.com -m recon auth chain` runs specific modules.
3. **Level 2 — Fine-tuning**: `reconpro example.com --timeout 15 --rate-limit 20` adjusts parameters.
3. **Level 3 — Advanced**: `reconpro agent "scan everything"` enables autonomous AI-driven scanning.
4. **Level 4 — Custom**: `reconpro plugin create my-module` extends the tool.

### Convention Over Configuration

- **Output format**: Determined by context. CLI gets Rich console output. `reconpro serve` gets JSON API. `reconpro report` gets HTML.
- **Scoring weights**: Built into module `points_deducted` values. No external scoring configuration.
- **Severity mapping**: Fixed in `constants.py`. CVSS mapping, SARIF level mapping, and color mapping are all predefined.
- **Rate limiting**: Global default of 10 req/s. Modules that need different rates (e.g., `dark_web_monitor` with paste site-specific limits) define their own within the module.

### No API Keys Required

Most reconnaissance tools require API keys for external services (Shodan, VirusTotal, Censys). ReconPro uses only:
- Public APIs that don't require authentication (abuse.ch ThreatFox, URLhaus)
- Standard web pages that can be scraped (paste sites)
- Certificate Transparency logs (public, no auth)
- Standard DNS resolution (no API key)

This means the tool produces results immediately without any account setup.

## Consequences

### Positive

- **Instant usability**: `pip install reconpro && reconpro target.com` works. No setup wizard, no config file creation, no API key registration.
- **Lower adoption barrier**: New users get value immediately. The 5-second-to-first-result goal is achievable.
- **Reproducible**: Default scans produce comparable results across different users and environments.
- **CI/CD friendly**: No config files needed in pipelines. Environment variables (if used) are optional.
- **Air-gap compatible**: Zero-config means zero external service dependencies.

### Negative

- **No per-target customization**: A user scanning a slow API endpoint gets the same 8-second timeout as one scanning a fast CDN. Workaround: `--timeout 30`.
- **No saved profiles**: Power users who frequently scan similar targets (e.g., "all our staging environments") must re-specify options each time. There is no `--profile staging` mechanism.
- **Default module set may be excessive**: Running 20 modules against a simple static website produces unnecessary traffic and findings noise. Users must learn to use `-m` to select modules.
- **No team configuration**: In team environments, there's no way to enforce organizational standards (e.g., "always run these modules, never run these ones") without wrapper scripts.
- **Hardcoded defaults are hard to change**: The defaults are in `constants.py` and `registry.py`. Changing a default requires a code change, not a config change.
- **No target-aware defaults**: The tool doesn't adjust behavior based on what it discovers. For example, detecting a WordPress site could automatically enable WordPress-specific checks, but it doesn't.

### Neutral

- **The `chat` power provides config-free customization**: Users can type "scan for C2 only" in natural language. This is an alternative to configuration files that leverages AI rather than YAML.
- **`serve` power exposes configuration via API**: The REST API server allows programmatic configuration, but this is a different usage model than CLI defaults.

## Validation

1. `reconpro example.com` produces findings with no prior setup.
2. No config file is created on first run.
3. No environment variables are required.
4. No API keys are required for the default module set.
5. `reconpro --help` shows options but all have sensible defaults.

## Related Decisions

- ADR-001: Pure Python Architecture (zero dependencies = zero config for dependencies)
- ADR-002: Centralized Module Registry (DEFAULT_MODULES provides the default scan profile)
- ADR-004: Universal Finding Dataclass (default points_deducted provides zero-config scoring)