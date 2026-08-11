"""Production-grade tests for reconpro.security_audit."""

import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import List, Tuple

from reconpro.security_audit import (
    SecurityAuditor,
    SecurityAuditReport,
    SecurityFinding,
    Severity,
    _AUDIT_PATTERNS,
)


class TestSeverity(unittest.TestCase):
    """Tests for Severity enum."""

    def test_values(self):
        self.assertEqual(Severity.CRITICAL.value, "critical")
        self.assertEqual(Severity.HIGH.value, "high")
        self.assertEqual(Severity.MEDIUM.value, "medium")
        self.assertEqual(Severity.LOW.value, "low")
        self.assertEqual(Severity.INFO.value, "info")


class TestSecurityFinding(unittest.TestCase):
    """Tests for SecurityFinding dataclass."""

    def test_to_dict(self):
        f = SecurityFinding(
            file="test.py",
            line=42,
            severity=Severity.HIGH,
            category="code_execution",
            description="eval() found",
            evidence="result = eval(user_input)",
        )
        d = f.to_dict()
        self.assertEqual(d["file"], "test.py")
        self.assertEqual(d["line"], 42)
        self.assertEqual(d["severity"], "high")
        self.assertEqual(d["category"], "code_execution")
        self.assertIn("evidence", d)


class TestSecurityAuditReport(unittest.TestCase):
    """Tests for SecurityAuditReport dataclass."""

    def test_to_dict(self):
        report = SecurityAuditReport(
            files_scanned=10,
            total_findings=1,
            findings=[
                SecurityFinding("a.py", 1, Severity.HIGH, "cat", "desc"),
            ],
            severity_counts={"high": 1},
        )
        d = report.to_dict()
        self.assertEqual(d["files_scanned"], 10)
        self.assertEqual(d["total_findings"], 1)
        self.assertEqual(len(d["findings"]), 1)
        self.assertIn("severity_counts", d)

    def test_empty_report(self):
        report = SecurityAuditReport()
        d = report.to_dict()
        self.assertEqual(d["total_findings"], 0)
        self.assertEqual(d["findings"], [])


class TestAuditPatterns(unittest.TestCase):
    """Verify the audit pattern database is properly defined."""

    def test_patterns_list_not_empty(self):
        self.assertGreater(len(_AUDIT_PATTERNS), 0)

    def test_all_patterns_are_tuples(self):
        for pattern in _AUDIT_PATTERNS:
            self.assertEqual(len(pattern), 4)
            cat, sev, regex, desc = pattern
            self.assertIsInstance(cat, str)
            self.assertIsInstance(sev, Severity)
            self.assertIsInstance(desc, str)

    def test_categories_covered(self):
        categories = {p[0] for p in _AUDIT_PATTERNS}
        expected = {
            "hardcoded_secret", "code_execution", "subprocess_safety",
            "deserialization", "unsafe_logging", "path_traversal",
            "resource_exhaustion", "tls_security",
        }
        self.assertTrue(expected.issubset(categories), f"Missing: {expected - categories}")


class TestCheckFile(unittest.TestCase):
    """Tests for SecurityAuditor.check_file."""

    def setUp(self):
        self.auditor = SecurityAuditor()

    def test_nonexistent_file(self):
        findings = self.auditor.check_file("/nonexistent/file.py")
        # Non-existent file returns empty list (not an error finding)
        self.assertEqual(findings, [])

    def test_non_python_file(self):
        with TemporaryDirectory() as td:
            txt = Path(td) / "readme.txt"
            txt.write_text("hello world")
            findings = self.auditor.check_file(str(txt))
            self.assertEqual(findings, [])

    def test_clean_python_file(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "clean.py"
            pyf.write_text(
                "def hello(name: str) -> str:\n"
                "    return f'Hello, {name}!'\n"
                "\n"
                "if __name__ == '__main__':\n"
                "    print(hello('world'))\n"
            )
            findings = self.auditor.check_file(str(pyf))
            # Should be clean
            findings_filtered = [f for f in findings if f.category != "resource_exhaustion"]
            self.assertEqual(len(findings_filtered), 0, f"Unexpected findings: {findings_filtered}")

    def test_eval_detection(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "evil.py"
            pyf.write_text("data = eval(user_input)\n")
            findings = self.auditor.check_file(str(pyf))
            eval_findings = [f for f in findings if "eval" in f.description.lower()]
            self.assertGreater(len(eval_findings), 0)
            self.assertEqual(eval_findings[0].severity, Severity.HIGH)

    def test_exec_detection(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "evil2.py"
            pyf.write_text("exec(code_string)\n")
            findings = self.auditor.check_file(str(pyf))
            exec_findings = [f for f in findings if "exec" in f.description.lower()]
            self.assertGreater(len(exec_findings), 0)

    def test_hardcoded_password_detection(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "secrets.py"
            pyf.write_text('password = "super_secret_1234"\n')
            findings = self.auditor.check_file(str(pyf))
            secret_findings = [f for f in findings if f.category == "hardcoded_secret"]
            self.assertGreater(len(secret_findings), 0)

    def test_shell_true_detection(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "unsafe.py"
            pyf.write_text("subprocess.run(cmd, shell=True)\n")
            findings = self.auditor.check_file(str(pyf))
            shell_findings = [f for f in findings if "shell" in f.description.lower()]
            self.assertGreater(len(shell_findings), 0)

    def test_pickle_detection(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "de.py"
            pyf.write_text("data = pickle.loads(user_data)\n")
            findings = self.auditor.check_file(str(pyf))
            pickle_findings = [f for f in findings if "pickle" in f.description.lower()]
            self.assertGreater(len(pickle_findings), 0)

    def test_verify_false_detection(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "tls.py"
            pyf.write_text("requests.get(url, verify=False)\n")
            findings = self.auditor.check_file(str(pyf))
            tls_findings = [f for f in findings if "tls" in f.category]
            self.assertGreater(len(tls_findings), 0)

    def test_multiple_findings_in_one_file(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "multi.py"
            pyf.write_text(
                "eval(user_input)\n"
                "exec(code)\n"
                "password = 'admin1234'\n"
            )
            findings = self.auditor.check_file(str(pyf))
            # Should find at least eval, exec, and password
            categories = {f.category for f in findings}
            self.assertIn("code_execution", categories)
            self.assertIn("hardcoded_secret", categories)


class TestAuditCodebase(unittest.TestCase):
    """Tests for SecurityAuditor.audit_codebase."""

    def setUp(self):
        self.auditor = SecurityAuditor()

    def test_reconpro_scan(self):
        """Scanning the reconpro directory should work without errors."""
        reconpro_dir = Path(__file__).resolve().parent.parent / "reconpro"
        report = self.auditor.audit_codebase(str(reconpro_dir))
        self.assertIsInstance(report, SecurityAuditReport)
        self.assertGreater(report.files_scanned, 0)

    def test_report_structure(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "test.py"
            pyf.write_text("eval(data)\n")
            report = self.auditor.audit_codebase(td)
            self.assertIn("files_scanned", report.to_dict())
            self.assertIn("total_findings", report.to_dict())
            self.assertIn("severity_counts", report.to_dict())
            self.assertIn("findings", report.to_dict())

    def test_severity_counts(self):
        with TemporaryDirectory() as td:
            pyf = Path(td) / "vuln.py"
            pyf.write_text("eval(x)\n")
            report = self.auditor.audit_codebase(td)
            if report.total_findings > 0:
                self.assertIsInstance(report.severity_counts, dict)

    def test_empty_directory(self):
        with TemporaryDirectory() as td:
            report = self.auditor.audit_codebase(td)
            self.assertEqual(report.files_scanned, 0)
            self.assertEqual(report.total_findings, 0)

    def test_nonexistent_directory(self):
        report = self.auditor.audit_codebase("/nonexistent/path")
        self.assertIsInstance(report, SecurityAuditReport)
        self.assertEqual(report.files_scanned, 0)

    def test_skips_pycache(self):
        with TemporaryDirectory() as td:
            td_path = td  # td is already a str for TemporaryDirectory
            # Create __pycache__ with a .py file
            cache = Path(td) / "__pycache__"
            cache.mkdir()
            (cache / "cached.py").write_text("eval(x)\n")
            # Also a normal file
            (Path(td) / "normal.py").write_text("x = 1\n")
            report = self.auditor.audit_codebase(td)
            # Only normal.py should be scanned
            self.assertEqual(report.files_scanned, 1)

    def test_skips_git(self):
        with TemporaryDirectory() as td:
            git = Path(td) / ".git"
            git.mkdir()
            (git / "hook.py").write_text("eval(x)\n")
            (Path(td) / "main.py").write_text("x = 1\n")
            report = self.auditor.audit_codebase(td)
            self.assertEqual(report.files_scanned, 1)


class TestCustomExtraPatterns(unittest.TestCase):
    """Tests for custom extra_patterns parameter."""

    def test_extra_pattern_detection(self):
        custom = [
            ("custom_bad", "high", r"TODO.*HACK", "TODO HACK found"),
        ]
        auditor = SecurityAuditor(extra_patterns=custom)
        with TemporaryDirectory() as td:
            pyf = Path(td) / "hack.py"
            pyf.write_text("# TODO: HACK to fix later\n")
            findings = auditor.check_file(str(pyf))
            # Comment lines are skipped for non-secret categories
            # Put pattern in code to ensure detection
            pyf2 = Path(td) / "hack2.py"
            pyf2.write_text("x = 'TODO: HACK to fix later'\n")
            findings2 = auditor.check_file(str(pyf2))
            custom_findings = [f for f in findings2 if f.category == "custom_bad"]
            self.assertGreater(len(custom_findings), 0)

    def test_extra_pattern_with_existing(self):
        custom = [
            ("custom_todo", "info", r"FIXME", "FIXME comment"),
        ]
        auditor = SecurityAuditor(extra_patterns=custom)
        # Should still detect built-in patterns + custom
        self.assertGreater(len(auditor._patterns), len(_AUDIT_PATTERNS))


if __name__ == "__main__":
    unittest.main()
