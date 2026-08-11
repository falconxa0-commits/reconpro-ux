"""Security Audit — Scan ReconPro codebase for security issues.

Checks:
- Hardcoded secrets (API keys, passwords, tokens)
- Unsafe logging (logging sensitive data)
- Insecure subprocess usage (shell=True)
- eval/exec usage
- Deserialization risks (pickle, yaml.load)
- Path traversal risks
- Resource exhaustion patterns
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class Severity(str, Enum):
    """Severity levels for security findings."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class SecurityFinding:
    """A single security audit finding."""
    file: str
    line: int
    severity: Severity
    category: str
    description: str
    evidence: str = ""

    def to_dict(self) -> Dict[str, object]:
        return {
            "file": self.file,
            "line": self.line,
            "severity": self.severity.value,
            "category": self.category,
            "description": self.description,
            "evidence": self.evidence,
        }


@dataclass
class SecurityAuditReport:
    """Aggregated result of a security audit."""
    files_scanned: int = 0
    total_findings: int = 0
    findings: List[SecurityFinding] = field(default_factory=list)
    severity_counts: Dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, object]:
        return {
            "files_scanned": self.files_scanned,
            "total_findings": self.total_findings,
            "findings": [f.to_dict() for f in self.findings],
            "severity_counts": self.severity_counts,
        }


# ── Pattern database ─────────────────────────────────────────────
# Each tuple: (category, severity, compiled_regex, description_template)

_AUDIT_PATTERNS: List[Tuple[str, Severity, re.Pattern[str], str]] = [
    # Hardcoded secrets
    ("hardcoded_secret", Severity.CRITICAL, re.compile(
        r'(?i)(?:password|passwd|pwd)\s*[=:"\']\s*["\']?(?![\s*x])[^"\'\s]{4,}'
    ), "Possible hardcoded password"),
    ("hardcoded_secret", Severity.CRITICAL, re.compile(
        r'(?i)(?:api[_-]?key|apikey|secret[_-]?key)\s*[=:"\']\s*["\']?[A-Za-z0-9_\-]{16,}'
    ), "Possible hardcoded API key"),
    ("hardcoded_secret", Severity.CRITICAL, re.compile(
        r'(?i)(?:bearer|token|auth[_-]?token)\s*[=:"\']\s*["\']?[A-Za-z0-9_\-\./]{20,}'
    ), "Possible hardcoded bearer/auth token"),
    ("hardcoded_secret", Severity.HIGH, re.compile(
        r'(?i)(?:aws_access_key|aws_secret)\s*[=:]\s*["\']?[A-Z0-9]{16,}'
    ), "Possible AWS credential"),

    # Unsafe eval/exec
    ("code_execution", Severity.HIGH, re.compile(
        r'\beval\s*\('
    ), "Use of eval() — potential code injection"),
    ("code_execution", Severity.HIGH, re.compile(
        r'\bexec\s*\('
    ), "Use of exec() — potential code injection"),

    # Insecure subprocess
    ("subprocess_safety", Severity.HIGH, re.compile(
        r'subprocess\.(?:call|run|Popen)\s*\([^)]*shell\s*=\s*True'
    ), "subprocess with shell=True — shell injection risk"),
    ("subprocess_safety", Severity.MEDIUM, re.compile(
        r'os\.(?:system|popen)\s*\('
    ), "Use of os.system/os.popen — prefer subprocess"),

    # Deserialization risks
    ("deserialization", Severity.HIGH, re.compile(
        r'pickle\.(?:load|loads)\s*\('
    ), "pickle deserialization — arbitrary code execution risk"),
    ("deserialization", Severity.MEDIUM, re.compile(
        r'yaml\.(?:load)\s*\((?!.*Loader)'
    ), "yaml.load without safe Loader — use yaml.safe_load"),

    # Unsafe logging
    ("unsafe_logging", Severity.MEDIUM, re.compile(
        r'logging\.(?:info|debug|warning|error)\s*\([^)]*(?:password|token|key|secret|credential)'
    ), "Logging may contain sensitive data"),
    ("unsafe_logging", Severity.LOW, re.compile(
        r'print\s*\([^)]*(?:password|token|key|secret|credential)'
    ), "Print statement may expose sensitive data"),

    # Path traversal
    ("path_traversal", Severity.MEDIUM, re.compile(
        r'open\s*\([^)]*(?:os\.path\.join|f["\']|\.format)'
    ), "File open with dynamic path — potential path traversal"),
    ("path_traversal", Severity.HIGH, re.compile(
        r'os\.(?:path\.join|chdir|mkdir)\s*\([^)]*(?:request|input|param|user|target)'
    ), "Path constructed from user input — path traversal risk"),

    # Resource exhaustion
    ("resource_exhaustion", Severity.LOW, re.compile(
        r'while\s*True\s*:'
    ), "Infinite while loop — potential resource exhaustion"),
    ("resource_exhaustion", Severity.MEDIUM, re.compile(
        r'read\(\s*\)\s*$'
    ), "read() without size limit — potential memory exhaustion"),

    # SSL/TLS issues
    ("tls_security", Severity.MEDIUM, re.compile(
        r'verify\s*=\s*False'
    ), "TLS verification disabled"),
    ("tls_security", Severity.HIGH, re.compile(
        r'_create_unverified_context'
    ), "Use of unverified SSL context"),
]


# Extensions to scan
_PY_EXTENSIONS = {".py"}


class SecurityAuditor:
    """Scan Python codebases for common security vulnerabilities.

    Usage::

        auditor = SecurityAuditor()
        report = auditor.audit_codebase("/path/to/package")
        for f in report.findings:
            print(f"{f.file}:{f.line} [{f.severity.value}] {f.description}")
    """

    def __init__(self, extra_patterns: Optional[List[Tuple[str, str, str, str]]] = None) -> None:
        """Initialize the auditor.

        Args:
            extra_patterns: Optional list of (category, severity, regex, description)
                tuples to append to the built-in pattern database.
        """
        self._patterns: List[Tuple[str, Severity, re.Pattern[str], str]] = list(_AUDIT_PATTERNS)
        if extra_patterns:
            for cat, sev, regex, desc in extra_patterns:
                compiled = re.compile(regex)
                self._patterns.append((cat, Severity(sev), compiled, desc))

    def check_file(self, filepath: str) -> List[SecurityFinding]:
        """Check a single file for security issues.

        Args:
            filepath: Path to the Python file to scan.

        Returns:
            List of SecurityFinding objects for any issues found.
        """
        path = Path(filepath)
        if not path.is_file() or path.suffix not in _PY_EXTENSIONS:
            return []

        findings: List[SecurityFinding] = []
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            findings.append(SecurityFinding(
                file=str(path), line=0,
                severity=Severity.LOW,
                category="file_access",
                description=f"Cannot read file: {exc}",
            ))
            return findings

        lines = text.splitlines()
        for line_num, line in enumerate(lines, start=1):
            # Skip comments for some patterns to reduce noise
            stripped = line.strip()
            if stripped.startswith("#") and "hardcoded_secret" not in "_all_cats":
                # Still check hardcoded secrets even in comments
                for cat, sev, pattern, desc in self._patterns:
                    if cat == "hardcoded_secret" and pattern.search(line):
                        findings.append(SecurityFinding(
                            file=str(path), line=line_num,
                            severity=sev, category=cat,
                            description=desc,
                            evidence=line.strip()[:200],
                        ))
                continue

            for cat, sev, pattern, desc in self._patterns:
                if pattern.search(line):
                    findings.append(SecurityFinding(
                        file=str(path), line=line_num,
                        severity=sev, category=cat,
                        description=desc,
                        evidence=line.strip()[:200],
                    ))

        return findings

    def audit_codebase(self, package_dir: Optional[str] = None) -> SecurityAuditReport:
        """Scan an entire Python package directory for security issues.

        Args:
            package_dir: Root directory to scan. Defaults to the
                ``reconpro`` package directory.

        Returns:
            SecurityAuditReport with all findings aggregated.
        """
        if package_dir is None:
            package_dir = str(Path(__file__).resolve().parent)

        root = Path(package_dir)
        if not root.is_dir():
            return SecurityAuditReport()

        all_findings: List[SecurityFinding] = []
        files_scanned = 0

        for py_file in sorted(root.rglob("*.py")):
            # Skip test files, __pycache__, and vendor dirs
            rel = py_file.relative_to(root)
            parts = rel.parts
            if any(p.startswith("__pycache__") or p in (".git", "node_modules", "venv", ".venv") for p in parts):
                continue

            files_scanned += 1
            all_findings.extend(self.check_file(str(py_file)))

        # Compute severity counts
        sev_counts: Dict[str, int] = {}
        for f in all_findings:
            key = f.severity.value
            sev_counts[key] = sev_counts.get(key, 0) + 1

        return SecurityAuditReport(
            files_scanned=files_scanned,
            total_findings=len(all_findings),
            findings=all_findings,
            severity_counts=sev_counts,
        )
