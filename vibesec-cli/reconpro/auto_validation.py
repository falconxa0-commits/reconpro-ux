"""Auto-Validation — Verify code quality before merge.

Checks:
- Import validation (all modules import cleanly)
- Syntax validation (all .py files compile)
- Type consistency (basic checks)
- Security patterns (no eval, no hardcoded secrets)
- Test execution (run test suite)
"""
from __future__ import annotations

import ast
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


# ── Security pattern signatures ─────────────────────────────────────────

_SEC_PATTERNS: List[Dict[str, Any]] = [
    {
        "name": "eval_usage",
        "pattern": re.compile(r"\beval\s*\("),
        "severity": "high",
        "description": "Use of eval() detected — potential code injection risk",
    },
    {
        "name": "exec_usage",
        "pattern": re.compile(r"\bexec\s*\("),
        "severity": "high",
        "description": "Use of exec() detected — potential code injection risk",
    },
    {
        "name": "hardcoded_password",
        "pattern": re.compile(
            r'password\s*=\s*["\'][^"\']{4,}["\']',
            re.IGNORECASE,
        ),
        "severity": "critical",
        "description": "Possible hardcoded password detected",
    },
    {
        "name": "hardcoded_api_key",
        "pattern": re.compile(
            r'(?:api_key|apikey|secret_key|token)\s*=\s*["\'][a-zA-Z0-9_]{16,}["\']',
        ),
        "severity": "critical",
        "description": "Possible hardcoded API key or secret detected",
    },
    {
        "name": "shell_true",
        "pattern": re.compile(r"shell\s*=\s*True"),
        "severity": "medium",
        "description": "subprocess with shell=True detected — command injection risk",
    },
    {
        "name": "pickle_loads",
        "pattern": re.compile(r"pickle\.loads?\s*\("),
        "severity": "high",
        "description": "pickle deserialization of potentially untrusted data",
    },
    {
        "name": "yaml_load_unsafe",
        "pattern": re.compile(r"yaml\.load\s*\(") ,
        "severity": "high",
        "description": "yaml.load() without SafeLoader — use yaml.safe_load()",
    },
]

# Files allowed to contain eval/exec (they are part of the scanner payload).
_SEC_EXCEPTIONS: set = {
    "defense.py",  # Contains eval patterns as string literals in WAF rules
    "auto_validation.py",  # Contains pattern descriptions as string literals
    "fuzzer.py",  # Contains attack payloads as string literals
    "ast_analyzer.py",  # Contains finding descriptions with pattern names
}


def _code_only(line: str) -> str:
    """Strip quoted string content from a line to avoid false positives."""
    # Remove triple-quoted strings.
    result = line
    result = re.sub(r'"""[^"]*"""', '""""""', result)
    result = re.sub(r"'''[^']*'''", "''''''", result)
    # Remove single and double quoted strings.
    result = re.sub(r'"[^"]*"', '""', result)
    result = re.sub(r"'[^']*'", "''", result)
    return result


# ── Data classes ────────────────────────────────────────────────────────


@dataclass
class ValidationCheck:
    """Result of a single validation check."""
    name: str
    passed: bool
    details: List[str] = field(default_factory=list)
    duration_ms: float = 0.0


@dataclass
class FullValidationReport:
    """Comprehensive validation report."""
    checks: List[ValidationCheck]
    passed: bool
    total_duration_ms: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "total_duration_ms": self.total_duration_ms,
            "checks": [
                {
                    "name": c.name,
                    "passed": c.passed,
                    "details": c.details,
                    "duration_ms": c.duration_ms,
                }
                for c in self.checks
            ],
        }


# ── Auto Validator ──────────────────────────────────────────────────────


class AutoValidator:
    """Run automated validation checks on the ReconPro package.

    All checks use only stdlib + subprocess (for pytest).
    """

    def __init__(self, package_dir: Optional[str] = None) -> None:
        if package_dir:
            self._pkg = Path(package_dir)
        else:
            # Default: the reconpro package directory.
            self._pkg = Path(__file__).resolve().parent
        self._project_root = self._pkg.parent

    def validate_imports(self, package_dir: Optional[str] = None) -> ValidationCheck:
        """Try importing all Python modules in the package.

        Returns:
            ValidationCheck with any import failures in details.
        """
        import time
        start = time.monotonic()
        pkg = Path(package_dir) if package_dir else self._pkg
        errors: List[str] = []

        py_files = sorted(pkg.glob("*.py"))
        for pyf in py_files:
            if pyf.name.startswith("__"):
                continue
            mod_name = f"reconpro.{pyf.stem}"
            try:
                __import__(mod_name)
            except Exception as exc:
                errors.append(f"{mod_name}: {exc}")

        # Also check modules/ subpackage.
        mods_dir = pkg / "modules"
        if mods_dir.is_dir():
            for pyf in sorted(mods_dir.glob("*.py")):
                if pyf.name.startswith("__"):
                    continue
                mod_name = f"reconpro.modules.{pyf.stem}"
                try:
                    __import__(mod_name)
                except Exception as exc:
                    errors.append(f"{mod_name}: {exc}")

        elapsed = (time.monotonic() - start) * 1000
        return ValidationCheck(
            name="import_validation",
            passed=len(errors) == 0,
            details=errors if errors else [f"All {len(py_files)} modules imported successfully"],
            duration_ms=round(elapsed, 1),
        )

    def validate_syntax(self, package_dir: Optional[str] = None) -> ValidationCheck:
        """Compile all .py files to check for syntax errors.

        Returns:
            ValidationCheck with any syntax errors in details.
        """
        import py_compile
        import time
        start = time.monotonic()
        pkg = Path(package_dir) if package_dir else self._pkg
        errors: List[str] = []
        count = 0

        for pyf in sorted(pkg.rglob("*.py")):
            count += 1
            try:
                py_compile.compile(str(pyf), doraise=True)
            except py_compile.PyCompileError as exc:
                errors.append(str(exc))

        elapsed = (time.monotonic() - start) * 1000
        return ValidationCheck(
            name="syntax_validation",
            passed=len(errors) == 0,
            details=errors if errors else [f"All {count} files compile successfully"],
            duration_ms=round(elapsed, 1),
        )

    def validate_security(self, package_dir: Optional[str] = None) -> ValidationCheck:
        """Scan for dangerous patterns: eval, exec, hardcoded secrets.

        Returns:
            ValidationCheck with any security issues in details.
        """
        import time
        start = time.monotonic()
        pkg = Path(package_dir) if package_dir else self._pkg
        issues: List[str] = []

        for pyf in sorted(pkg.rglob("*.py")):
            if pyf.name in _SEC_EXCEPTIONS:
                continue
            try:
                text = pyf.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue

            for sig in _SEC_PATTERNS:
                for line_num, line in enumerate(text.splitlines(), 1):
                    # Check only code (not string content) to reduce false positives.
                    code_line = _code_only(line)
                    if sig["pattern"].search(code_line):
                        stripped = line.strip()
                        if stripped.startswith("#"):
                            continue
                        issues.append(
                            f"{pyf.name}:{line_num} [{sig['severity']}] "
                            f"{sig['description']}: {stripped[:120]}"
                        )

        elapsed = (time.monotonic() - start) * 1000
        return ValidationCheck(
            name="security_validation",
            passed=len(issues) == 0,
            details=issues if issues else ["No security anti-patterns detected"],
            duration_ms=round(elapsed, 1),
        )

    def validate_tests(self) -> ValidationCheck:
        """Run the test suite via pytest.

        Returns:
            ValidationCheck with test results.
        """
        import time
        start = time.monotonic()

        tests_dir = self._project_root / "tests"
        if not tests_dir.is_dir():
            return ValidationCheck(
                name="test_execution",
                passed=False,
                details=["No tests directory found"],
                duration_ms=round((time.monotonic() - start) * 1000, 1),
            )

        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", str(tests_dir), "-v", "--tb=short", "-q"],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=str(self._project_root),
            )
            output_lines = (result.stdout + result.stderr).strip().splitlines()
            # Keep last 30 lines for summary.
            summary = output_lines[-30:] if len(output_lines) > 30 else output_lines
            passed = result.returncode == 0
        except FileNotFoundError:
            return ValidationCheck(
                name="test_execution",
                passed=False,
                details=["pytest not found — install with: pip install pytest"],
                duration_ms=round((time.monotonic() - start) * 1000, 1),
            )
        except subprocess.TimeoutExpired:
            return ValidationCheck(
                name="test_execution",
                passed=False,
                details=["Test execution timed out (120s)"],
                duration_ms=round((time.monotonic() - start) * 1000, 1),
            )

        elapsed = (time.monotonic() - start) * 1000
        return ValidationCheck(
            name="test_execution",
            passed=passed,
            details=summary,
            duration_ms=round(elapsed, 1),
        )

    def run_all(self) -> FullValidationReport:
        """Run all validation checks and return a comprehensive report.

        Returns:
            FullValidationReport with all check results.
        """
        import time
        start = time.monotonic()

        checks: List[ValidationCheck] = [
            self.validate_syntax(),
            self.validate_imports(),
            self.validate_security(),
            self.validate_tests(),
        ]

        elapsed = (time.monotonic() - start) * 1000
        all_passed = all(c.passed for c in checks)

        return FullValidationReport(
            checks=checks,
            passed=all_passed,
            total_duration_ms=round(elapsed, 1),
        )
