# ReconPro v10 -- Security Model

## Threat Model

### What ReconPro Protects Against

ReconPro is an offensive security tool. Its security defenses protect the
**operator** and the **host system** from targets and untrusted inputs:

- **Command injection via target strings**: Shell metacharacters (`;|\`$&><`) in
  target arguments are stripped by `sanitize_target()` before processing.
- **Path traversal in file operations**: File paths are sanitized by
  `sanitize_path()` which filters `.` and `..` components, decodes percent
  encoding, and limits length to 4096 characters.
- **Resource exhaustion**: HTTP body reads capped at 16,384 bytes
  (`DEFAULT_BODY_LIMIT`), request timeouts default to 8 seconds, and
  token-bucket rate limiting prevents flooding (default 10 req/s).
- **XML bomb attacks**: `safe_xml_parse()` blocks entity declarations.
- **Log injection (CRLF)**: `sanitize_log()` removes carriage returns and
  newlines from log text.
- **Secret leakage**: `detect_secrets_in_text()` identifies AWS keys, GitHub
  tokens, private keys, database connection strings, and JWTs.
- **Plugin compromise**: Plugins are loaded into isolated namespaces and
  return values are validated against required keys.

### What It Does NOT Protect Against

- **Target-side attacks against the operator**: ReconPro makes real HTTP
  requests to potentially malicious targets. Use a VPN, isolated network,
  or disposable environment.
- **Supply chain attacks**: If installed from a compromised package index,
  all bets are off. Verify hashes or install from trusted source.
- **Memory side-channel attacks**: ReconPro does not defend against CPU-level
  side channels.
- **Target DoS**: A malicious target could serve slow responses, but
  per-request timeouts (8s) limit exposure.

### Assumptions

- The operator has legitimate authorization to scan the target.
- The Python runtime is not compromised.
- The `~/.reconpro/` directory is owned and writable by the operator.
- Network time is roughly accurate (used for audit timestamps).

## Security Architecture

### Input Validation

All user input flows through the security layer before processing:

1. **`validate_target(target)`** in `utils.py` -- checks for empty strings,
   shell metacharacters (`;|\`$&><`), and hostname length (max 253 chars).
   Returns `(is_valid, error_message)`. Flags private IPs as `"LOCAL"`.

2. **`sanitize_target(target)`** in `security.py` -- removes null bytes,
   control characters (except space/tab), shell metacharacters, and
   collapses excessive whitespace.

3. **`sanitize_path(path)`** in `security.py` -- prevents path traversal
   by decoding percent-encoding, filtering `.` and `..` components, and
   limiting total path length to 4096 characters.

4. **`sanitize_filename(name)`** in `security.py` -- strips directory
   components, allows only `[a-zA-Z0-9._-]`, prevents hidden files,
   limits to 255 characters.

5. **`sanitize_html(text)`** in `security.py` -- escapes HTML entities
   using `html.escape()` to prevent XSS in rendered reports.

6. **`sanitize_shell(text)`** in `security.py` -- wraps shell metacharacters
   in single quotes to prevent command injection.

### Safe Parsing

Three hardened parsers in `security.py`:

- **`safe_json_parse(text)`** -- limits to 1 MB (`_MAX_JSON_SIZE`), 20
  nesting levels (`_MAX_JSON_DEPTH`), 10,000 keys (`_MAX_JSON_KEYS`).
  Returns `(parsed_dict, error)` tuple.
- **`safe_url_parse(url)`** -- whitelists only `http`/`https` schemes
  (`_ALLOWED_SCHEMES`), enforces 2048-char max (`_MAX_URL_LENGTH`),
  requires a hostname. Returns `(components, error)` tuple.
- **`safe_xml_parse(text)`** -- blocks entity declarations to prevent
  XML bombs. Limits input to 1 MB. Returns `(root_tag, error)`.

### Plugin Isolation

Plugins are loaded from `~/.reconpro/plugins/` using `importlib.util`.
Each gets its own module namespace (`reconpro_plugin_{id}`). Return values
are validated against required keys: `title`, `severity`, `category`,
`module`, `description`, `evidence`, `asset`. Files starting with `_`
are skipped (except `_hooks.json`).

### Credential Handling

- `detect_secrets_in_text()` identifies secrets by type and location but
  does not log the actual secret values.
- No credentials are stored in configuration files.
- Audit logs rotate at 10 MB with 5 backups, limiting disk exposure.

### Network Boundaries

- `is_private_ip(ip)` in `utils.py` identifies RFC 1918 addresses,
  loopback, and link-local ranges.
- `validate_target()` flags private IP targets with a `"LOCAL"` status.
- All HTTP traffic flows through `RateLimiter` with configurable
  `max_per_second` (default 10.0).

## Security Features

### sanitize_target

Located in `security.py`. Strips null bytes, control characters, and shell
metacharacters. Collapses whitespace. This is the first line of defense for
any user-supplied target string.

### sanitize_path

Located in `security.py`. Prevents directory traversal by:
1. Removing null bytes
2. Decoding percent-encoded characters via `urllib.parse.unquote()`
3. Replacing backslashes with forward slashes
4. Filtering out `.` and `..` path components
5. Limiting total length to 4096 characters

### Secret Detection

Located in `security.py`. `detect_secrets_in_text(text)` scans for 10
secret patterns using pre-compiled regex:

| Pattern Type | Regex | Severity |
|---|---|---|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | high |
| GitHub Token | `ghp_[A-Za-z0-9]{36}` | high |
| GitHub Fine-Grained | `github_pat_[A-Za-z0-9_]{22,}` | high |
| Generic API Key | `api_key|apikey|key|token|secret|password` | medium |
| RSA Private Key | `-----BEGIN RSA PRIVATE KEY-----` | critical |
| EC Private Key | `-----BEGIN EC PRIVATE KEY-----` | critical |
| Generic Private Key | `-----BEGIN PRIVATE KEY-----` | critical |
| Password in URL | `https://user:pass@host` | high |
| DB Connection String | `mongodb|mysql|postgres|redis://` | high |
| JWT Token | `eyJ...eyJ...[A-Za-z0-9_-]` | medium |

Returns list of dicts with keys: `type`, `match`, `line`, `offset`, `confidence`.

### Audit Logging

The `SecurityAuditLogger` class in `security.py` provides structured audit
logging to `~/.reconpro/audit.log` with:
- JSON format with ISO 8601 timestamps
- Three levels: INFO, WARN, ALERT
- Event types: SCAN_START, FINDING, PLUGIN_LOAD, etc.
- Rotating file handler: 10 MB max, 5 backups
- CRLF sanitization on all log entries

### Supply Chain Verification

`compute_file_hash(filepath, algorithm="sha256")` in `security.py` computes
SHA-256 (or SHA-512, MD5, SHA-1) hashes of files in 64 KB chunks. Used for
verifying plugin integrity and detecting tampering.

## Hardening Guide

### For Operators

1. Run in an isolated VM or container when scanning untrusted targets.
2. Use `--verify-tls` (default) unless testing TLS configurations.
3. Keep rate limits conservative (default 10 req/s) to avoid WAF blocks.
4. Review `~/.reconpro/audit.log` regularly for suspicious activity.
5. Do not install untrusted plugins in `~/.reconpro/plugins/`.
6. Use `RECONPRO_HOME` environment variable to control data location.

### For Developers

1. Always use `http_probe()` instead of raw `urllib` for HTTP requests.
2. Use `sanitize_target()`, `sanitize_path()`, and `sanitize_html()` for
   all user-supplied input.
3. Use `safe_json_parse()`, `safe_url_parse()`, `safe_xml_parse()` instead
   of their stdlib equivalents.
4. Never log or store detected secrets -- only log their type and location.
5. Set `points_deducted` proportionally to finding severity.
6. Follow the module contract exactly -- return `list[Finding]`.

### For Enterprise Deployment

1. Pin ReconPro version in requirements.txt for reproducible scans.
2. Set up `~/.reconpro/` with restricted permissions (700).
3. Configure audit log forwarding to SIEM (Splunk integration available).
4. Use SARIF export for CI/CD integration with GitHub Code Scanning.
5. Schedule recurring scans via `reconpro schedule`.
6. Review plugin code before deployment to `~/.reconpro/plugins/`.

## Known Limitations

- Plugin code runs in-process with full Python access -- there is no sandbox.
  Malicious plugins can execute arbitrary code.
- The `verify_tls=False` option disables certificate verification entirely;
  this is necessary for testing but should not be used in production.
- Local audit modules (host, dev, doctor) access the filesystem directly;
  they should only be run on systems you own.
- The secret detection regex patterns may produce false positives on strings
  that happen to match key patterns (e.g., high-entropy identifiers).
- XML parsing uses `xml.etree.ElementTree` which, while hardened against
  entity bombs, may still have edge cases not covered by `safe_xml_parse()`.
