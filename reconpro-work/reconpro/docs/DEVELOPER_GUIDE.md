# ReconPro v10 -- Developer Guide

## Getting Started

### Prerequisites
- Python 3.10 or later (3.12+ recommended)
- No other runtime dependencies required
- `rich` package for terminal rendering (optional for library use)
- Internet access for remote scanning modules

### Installation

Install from PyPI::

    pip install reconpro

Or install from source::

    git clone https://github.com/reconpro-security/reconpro.git
    cd reconpro
    pip install -e .

ReconPro creates `~/.reconpro/` on first run for persistent data (scan history,
plugins, knowledge graph, and audit logs).

### First Scan

Run your first remote scan::

    reconpro example.com

This runs the default 20 remote modules and produces a scored, graded report.
For a local machine audit::

    reconpro audit

### Quick Tour

The CLI provides multiple interfaces for different workflows:

- `reconpro example.com` -- Standard remote scan
- `reconpro chat` -- Talk to ReconPro in natural language
- `reconpro nexus` -- Visual terminal dashboard with mouse support
- `reconpro blitz t1.com t2.com t3.com` -- Parallel multi-target scanning
- `reconpro agent "scan everything"` -- Autonomous goal-driven scanning
- `reconpro subdomains example.com` -- Subdomain discovery via CT logs
- `reconpro serve` -- Start the REST API server
- `reconpro report example.com -o report.html` -- Generate HTML report
- `reconpro history` -- View and diff past scans
- `reconpro plugin list` -- Manage custom plugins

## Creating a Custom Module

### Module Contract

Every remote scanning module must export a `run` function with this exact
signature (defined in `modules/__init__.py`)::

    from __future__ import annotations
    from ..http_layer import http_probe, Finding

    def run(target: str, base_url: str, timeout: int = 8, verify_tls: bool = True) -> list[Finding]:
        """Your module description.

        Args:
            target: The raw target string (e.g., "example.com").
            base_url: The normalized URL with scheme (e.g., "https://example.com").
            timeout: Per-request timeout in seconds.
            verify_tls: Whether to verify TLS certificates.

        Returns:
            List of Finding objects.
        """
        findings: list[Finding] = []
        resp = http_probe(f"{base_url}/", timeout=timeout, verify_tls=verify_tls)

        if resp["ok"]:
            if "X-Frame-Options" not in resp["headers"]:
                findings.append(Finding(
                    title="Missing X-Frame-Options Header",
                    severity="medium",
                    category="headers",
                    module="my_module",
                    description="The response does not include X-Frame-Options.",
                    evidence=f"Headers: {list(resp['headers'].keys())}",
                    asset=target,
                    points_deducted=5,
                    remediation="Add X-Frame-Options: DENY or SAMEORIGIN.",
                ))

        return findings

### Step-by-Step Tutorial

1. **Create the module file** at `modules/my_module.py`.
2. **Write the `run` function** following the contract above.
3. **Register in `modules/__init__.py`** -- add::

       from .my_module import run as run_my_module

4. **Register in `registry.py`** -- add an entry in `build_module_registry()`::

       "my_module": {"name": "MY MODULE", "runner": r["run_my_module"], "color": "cyan"},

5. **Add to `_get_runners()`** in `registry.py` if not already lazy-loaded.
6. **Test** your module: `reconpro example.com -m my_module`

### Best Practices

- **Use http_probe() exclusively** for HTTP requests -- never use `urllib` directly.
- **Return Finding objects**, not dicts. The scanner calls `f.to_dict()` during aggregation.
- **Set meaningful `points_deducted`** values. Critical findings typically deduct 15-25
  points, high findings 10-15, medium 5-10, low 2-5, info 0.
- **Keep modules focused** on a single concern. Each module should test one
  category of vulnerabilities.
- **Handle errors gracefully**. Wrap HTTP calls in try/except and return an empty
  list on failure. Never let a module crash the overall scan.
- **Import only from http_layer.py and constants.py** in your module. Importing from
  scanner.py, cli.py, or other modules creates circular dependencies.
- **Use severity constants** from `constants.py`: import `SEVERITY_LEVELS, VALID_SEVERITIES`.

### Testing Your Module

Write tests in `tests/test_my_module.py`::

    import unittest
    from reconpro.modules.my_module import run
    from reconpro.http_layer import Finding

    class TestMyModule(unittest.TestCase):
        def test_returns_findings(self):
            results = run("example.com", "https://example.com")
            self.assertIsInstance(results, list)
            for f in results:
                self.assertIsInstance(f, Finding)
                self.assertIn(f.severity, ["critical", "high", "medium", "low", "info"])

        def test_empty_on_invalid_target(self):
            results = run("", "")
            self.assertIsInstance(results, list)

    if __name__ == "__main__":
        unittest.main()

Run with: `python -m pytest tests/test_my_module.py -v`

## Plugin Development

### Plugin Interface

Plugins are simpler than first-class modules -- they live in `~/.reconpro/plugins/`
and are auto-discovered at scan time. A plugin is any `.py` file that exports
a `run` function::

    # ~/.reconpro/plugins/custom_check.py
    from reconpro.http_layer import Finding

    NAME = "CUSTOM CHECK"
    DESCRIPTION = "My custom security check"

    def run(target: str, base_url: str = "", timeout: int = 8, verify_tls: bool = True) -> list[Finding]:
        findings: list[Finding] = []
        # ... your logic ...
        return findings

### Hook System

Create `~/.reconpro/plugins/_hooks.json` to register lifecycle hooks::

    {
      "scan_start": ["my_plugin"],
      "module_complete": ["my_plugin"],
      "finding": ["my_plugin"],
      "scan_end": ["my_plugin"]
    }

### Plugin Template

A minimal plugin::

    from reconpro.http_layer import Finding, http_probe

    NAME = "YOUR PLUGIN"
    DESCRIPTION = "Description of what this plugin checks"

    def run(target: str, base_url: str = "", timeout: int = 8, verify_tls: bool = True) -> list[Finding]:
        findings: list[Finding] = []
        if not base_url:
            base_url = f"https://{target}"
        resp = http_probe(f"{base_url}/", timeout=timeout, verify_tls=verify_tls)
        if not resp["ok"]:
            return findings
        # Your analysis here
        return findings

## Integration

### Using as a Library

::

    from reconpro import scan, ReconProResult

    result: ReconProResult = scan("example.com")
    print(f"Score: {result.total_score}/100 ({result.grade})")
    print(f"Findings: {len(result.findings)}")
    for finding in result.findings:
        print(f"  [{finding['severity'].upper()}] {finding['title']}")

### Programmatic Scans

::

    from reconpro import scan

    # Run specific modules
    result = scan(
        target="example.com",
        modules=["recon", "auth", "chain"],
        timeout=15,
        verify_tls=True,
        rate_limit=5.0,
    )

    # Run local audit
    from reconpro import audit_scan
    result = audit_scan(target=".", modules=["dev"])

### Custom Output Formats

::

    from reconpro import scan
    from reconpro.formats import export_sarif, export_json, export_markdown, export_html

    result = scan("example.com")
    data = result.to_dict()

    export_json(data, "output/results.json")
    export_sarif(data, "output/results.sarif")
    export_markdown(data, "output/results.md")
    export_html(data, "output/results.html")

## Testing

### Running Tests

The test suite lives in `tests/` and uses `unittest` (stdlib)::

    # Run all tests
    python -m pytest tests/ -v

    # Run specific test file
    python -m pytest tests/test_scanner.py -v

    # Run with unittest
    python -m unittest discover tests/ -v

### Writing Tests

Follow the existing patterns in `tests/`. Key test files:

- `test_scanner.py` -- Scan orchestration tests
- `test_http_probe.py` -- HTTP layer tests
- `test_utils.py` -- Utility function tests
- `test_security.py` -- Security hardening tests
- `test_plugins.py` -- Plugin system tests
- `test_observability.py` -- Logging, metrics, tracing tests
- `test_constants.py` -- Constant validation tests
- `test_registry.py` -- Module registry tests
- `test_finding.py` -- Finding dataclass tests
- `test_formats.py` -- Export format tests
- `test_integration.py` -- End-to-end integration tests

### Test Patterns

1. **Isolation**: Tests should not require network access. Mock `http_probe` for
   module tests.
2. **Property-based**: `test_property.py` uses property-based testing for
   invariants (e.g., scores always 0-100, severities always valid).
3. **Regression**: `test_security_regression.py` ensures sanitization functions
   handle known attack vectors.

## Contributing

### Code Style
- Python 3.10+ features (match statements, type unions with `|`)
- `from __future__ import annotations` at the top of every file
- Type hints on all public functions
- Docstrings on all public classes and functions
- Maximum line length: 100 characters
- Import ordering: stdlib, third-party, local

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run `python -m pytest tests/ -v` and ensure all tests pass
5. Update documentation if adding modules or changing public API
6. Submit the pull request with a clear description

### Release Process

1. Update `__version__` in both `__init__.py` and `constants.py`
2. Update the CLI banner in `cli.py`
3. Run the full test suite
4. Build the wheel: `python -m build`
5. Publish to PyPI: `twine upload dist/*`
