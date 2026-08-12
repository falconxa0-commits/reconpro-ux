# ReconPro Security Policy

---

## Plugin Sandbox Architecture

ReconPro's plugin system (`plugins.py`) executes user-supplied Python code in a restricted sandbox. Plugins are loaded from `~/.reconpro/plugins/` and must define a `run(target, base_url, **kwargs)` function that returns a list of `Finding` objects.

### Execution Model

Plugins execute in a dedicated thread with a timeout (default: 30 seconds). The sandbox is applied via a restricted globals dict.

### Restricted Builtins

The following builtins are **blocked** from plugin execution:

```python
_BLOCKED_BUILTINS = {
    "eval", "exec", "open", "__import__", "compile",
    "breakpoint", "exit", "quit", "globals", "locals",
}
```

- **`eval` / `exec`**: Prevents arbitrary code execution.
- **`open`**: Prevents file system access.
- **`__import__`**: Replaced with a restricted import function.
- **`compile`**: Prevents dynamic code compilation.
- **`breakpoint` / `exit` / `quit`**: Prevents debug escapes.
- **`globals` / `locals`**: Prevents scope manipulation.

### Import Restrictions

A custom `__import__` function replaces the builtin. Only modules in the allowlist can be imported:

```python
_ALLOWED_IMPORTS = {
    "reconpro.http", "urllib.request", "urllib.error",
    "urllib.parse", "json", "re", "ssl", "hashlib",
    "base64", "socket", "struct", "time", "datetime",
    "collections", "itertools", "functools", "math",
    "string", "copy", "enum", "typing", "dataclasses",
}
```

Attempting to import any other module raises `PluginSecurityError`.

### Resource Limits

- **Max findings per plugin**: 200 (output is truncated beyond this).
- **Timeout**: 30 seconds per plugin execution (raises `TimeoutError` on expiry).
- **Thread isolation**: Each plugin runs in its own `ThreadPoolExecutor` thread.

### Error Handling

- `PluginSecurityError`: Raised and caught when a plugin violates the sandbox. Produces a high-severity finding.
- `TimeoutError`: Caught and produces a low-severity finding.
- All other exceptions are caught and produce info-level findings.

### Security Error Class

```python
class PluginSecurityError(Exception):
    """Raised when a plugin violates the security sandbox."""
```

---

## Prompt Injection Defense

ReconPro's AI-powered features (chat, agent, z.ai integration) are protected by `PromptDefense` (`prompt_defense.py`). The system uses regex-based pattern matching to detect and block injection attempts.

### Architecture

Two-stage defense:

1. **Input Sanitization** (`sanitize_input`): Applied to all user-provided text before it reaches any AI/LLM system.
2. **Response Validation** (`validate_response`): Applied to AI-generated output to detect prompt leakage or manipulation.

### Sensitivity Levels

| Level | Trigger Threshold | LOW Patterns Included |
|-------|-------------------|----------------------|
| `low` | 2+ pattern matches | No |
| `medium` (default) | 1+ pattern match | No |
| `high` | 1+ pattern match | Yes |

Any `HIGH` or `CRITICAL` match immediately blocks input regardless of threshold.

### Input Pattern Categories

| Category | Description | Example Patterns |
|----------|-------------|------------------|
| `role_manipulation` | Attempts to change the AI's role | `"ignore previous instructions"`, `"you are now a ..."`, `"pretend you are"` |
| `instruction_override` | Attempts to override system behavior | `"new instructions"`, `"override"`, `"disregard all rules"`, `"system prompt"` |
| `data_exfiltration` | Attempts to extract sensitive data | `"print your"`, `"reveal"`, `"show me the"`, `"what are your instructions"` |
| `system_extraction` | Attempts to extract the system prompt | `"repeat your instructions"`, `"output your prompt"`, `"first message"` |
| `delimiter_attack` | Attempts to break context boundaries | `"---END---"`, `"<end>"`, `"[END]"` |
| `encoding_bypass` | Attempts to bypass filters via encoding | `"base64"`, `"URL-encode"`, `"unicode escape"` |
| `payload_injection` | Direct payload injection attempts | `"developer mode"`, `"DAN mode"`, `"jailbreak"` | 

### Response Validation Patterns

| Pattern | Threat Level | Description |
|---------|-------------|-------------|
| `prompt_leak` | MEDIUM | AI reveals its instructions ("I am designed to...") |
| `system_prompt_echo` | HIGH | AI echoes the full system prompt |
| `safety_filter_bypass_admission` | MEDIUM | AI admits it can now bypass restrictions |
| `structured_data_leak` | HIGH | Long structured data in responses (potential key/secret leakage) |

### Usage

```python
from reconpro.prompt_defense import PromptDefense, ThreatLevel

defense = PromptDefense(sensitivity="high")
result = defense.sanitize_input(user_text)

if not result.is_safe:
    print(f"Blocked: {result.matched_patterns}")
    print(f"Threat level: {result.threat_level}")

# Validate AI responses
response_check = defense.validate_response(ai_output)
if not response_check.is_safe:
    print(f"Response issues: {response_check.issues}")
```

### Result Types

```python
@dataclass
class SanitizationResult:
    cleaned: str
    threat_level: ThreatLevel
    matched_patterns: List[str]
    is_safe: bool

@dataclass
class ResponseValidationResult:
    is_safe: bool
    issues: List[str]
    threat_level: ThreatLevel
```

---

## Security Audit Capabilities

ReconPro includes a built-in codebase security auditor (`security_audit.py`) that scans Python code for common vulnerabilities.

### Check Categories

| Category | Severity | Description |
|----------|----------|-------------|
| `hardcoded_secret` | CRITICAL / HIGH | API keys, passwords, tokens in source code |
| `unsafe_subprocess` | HIGH | `shell=True` in subprocess calls |
| `eval_exec` | CRITICAL | Use of `eval()` or `exec()` |
| `unsafe_deserialization` | HIGH | `pickle.loads()`, `yaml.load()` (non-safe) |
| `path_traversal` | MEDIUM | Unsanitized file path operations |
| `resource_exhaustion` | LOW | Unlimited loops, unbounded reads |
| `unsafe_logging` | MEDIUM | Logging sensitive data |

### API Usage

```python
from reconpro.security_audit import SecurityAuditor

auditor = SecurityAuditor()
report = auditor.audit_codebase("/path/to/package")

print(f"Files scanned: {report.files_scanned}")
print(f"Total findings: {report.total_findings}")
print(f"Severity counts: {report.severity_counts}")

for finding in report.findings:
    print(f"{finding.file}:{finding.line} [{finding.severity.value}] {finding.description}")
```

### Custom Patterns

```python
# Add custom audit patterns as (category, severity, regex, description) tuples
auditor = SecurityAuditor(extra_patterns=[
    ("custom_check", "high", r"DANGEROUS_PATTERN", "Custom dangerous pattern detected"),
])
```

### CLI Usage

```bash
# Audit current directory
reconpro audit-code

# Audit specific path with severity filter
reconpro audit-code --path ./src --severity high
```

### Auto Validation

The `AutoValidator` (`auto_validation.py`) provides a comprehensive validation pipeline:

```python
from reconpro.auto_validation import AutoValidator

validator = AutoValidator()
report = validator.run_all()

# Or run individual checks
syntax_check = validator.validate_syntax()
import_check = validator.validate_imports()
security_check = validator.validate_security()
test_check = validator.validate_tests()
```

---

## Credential Vault Security

Discovered credentials are stored in an obfuscated vault at `~/.reconpro/memory/vault.json`.

### Obfuscation

The vault uses XOR obfuscation with a machine-specific key derived from:
- Hostname
- Platform
- Username
- Fixed salt (`"reconpro_vault_v1"`)

The key is a SHA-256 hash (32 bytes) of these concatenated values.

### Important Limitations

- **This is obfuscation, not encryption.** The vault protects against casual inspection but not against a determined attacker with access to the filesystem and the `memory.py` source code.
- Vault data should be treated as sensitive. Use `vault_purge()` to delete all vault data when no longer needed.
- Never commit `~/.reconpro/` to version control.

---

## Responsible Disclosure

### Reporting Security Issues

If you discover a security vulnerability in ReconPro, please report it responsibly.

1. **Do not** open a public issue.
2. Email your findings to `security@reconpro.io`.
3. Include: vulnerability description, affected component, reproduction steps, potential impact, and suggested fix.
4. Allow reasonable time (minimum 90 days) for the fix before public disclosure.

### Scope

Security issues in scope:
- Plugin sandbox escapes
- Prompt injection bypasses in `PromptDefense`
- Credential vault weaknesses
- Unsafe deserialization in any module
- Information disclosure in scan results or reports
- Denial-of-service via crafted inputs

### Out of Scope

- Vulnerabilities in scanned third-party targets (report to the target's owner)
- Issues in plugin code written by users (user's responsibility)
- Theoretical concerns without a demonstrated exploit

### Fix Timeline

| Severity | Response Time | Fix Timeline |
|----------|--------------|--------------|
| Critical | 24 hours | 7 days |
| High | 72 hours | 14 days |
| Medium | 1 week | 30 days |
| Low | 2 weeks | Next release |

---

*This document is based on the actual security mechanisms implemented in ReconPro v10.0.0 source code.*
