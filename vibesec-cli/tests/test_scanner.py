"""Tests for scanner module."""
import unittest
from unittest.mock import patch, MagicMock
from reconpro.scanner import (
    scan, audit_scan, MODULE_REGISTRY, LOCAL_MODULES,
    ALL_MODULES, DEFAULT_MODULES, DEFAULT_LOCAL_MODULES, ReconProResult
)

class TestModuleRegistry(unittest.TestCase):
    def test_remote_module_count(self):
        """MODULE_REGISTRY should have expected remote modules."""
        self.assertGreaterEqual(len(MODULE_REGISTRY), 10)
    
    def test_local_module_count(self):
        """LOCAL_MODULES should have expected local modules."""
        self.assertGreaterEqual(len(LOCAL_MODULES), 3)
    
    def test_all_modules_is_union(self):
        """ALL_MODULES should be union of remote + local."""
        expected = set(MODULE_REGISTRY.keys()) | set(LOCAL_MODULES.keys())
        self.assertEqual(set(ALL_MODULES), expected)
    
    def test_default_modules_valid(self):
        """DEFAULT_MODULES should all exist in MODULE_REGISTRY."""
        for m in DEFAULT_MODULES:
            self.assertIn(m, MODULE_REGISTRY)
    
    def test_default_local_modules_valid(self):
        """DEFAULT_LOCAL_MODULES should all exist in LOCAL_MODULES."""
        for m in DEFAULT_LOCAL_MODULES:
            self.assertIn(m, LOCAL_MODULES)
    
    def test_no_duplicate_modules(self):
        """Remote and local modules should not overlap."""
        remote = set(MODULE_REGISTRY.keys())
        local = set(LOCAL_MODULES.keys())
        self.assertEqual(remote & local, set())

class TestReconProResult(unittest.TestCase):
    def test_result_creation(self):
        """ReconProResult should create with required fields."""
        result = ReconProResult(
            target="example.com",
            modules_run=["recon"],
            findings=[],
            severity_counts={},
            total_score=100,
            grade="A",
            badge_markdown="[A](example.com)",
        )
        self.assertEqual(result.target, "example.com")
        self.assertEqual(result.total_score, 100)
    
    def test_result_to_dict(self):
        """to_dict should include all key fields."""
        result = ReconProResult(
            target="test.com",
            modules_run=["recon"],
            findings=[{"severity": "medium", "title": "Test"}],
            severity_counts={"medium": 1},
            total_score=90,
            grade="B",
            badge_markdown="[B](test.com)",
        )
        d = result.to_dict()
        self.assertIn("target", d)
        self.assertIn("findings", d)
        self.assertEqual(d["total_score"], 90)

class TestAuditScanWithMock(unittest.TestCase):
    @patch.dict('reconpro.scanner.LOCAL_MODULES', {
        "host": {"runner": lambda **kw: [], "name": "Host Audit"},
    }, clear=True)
    def test_audit_scan_returns_result(self):
        """audit_scan should return ReconProResult."""
        result = audit_scan(target=".", modules=["host"])
        self.assertIsInstance(result, ReconProResult)
        self.assertEqual(result.modules_run, ["host"])

    @patch.dict('reconpro.scanner.LOCAL_MODULES', {
        "host": {"runner": lambda **kw: [], "name": "Host Audit"},
    }, clear=True)
    def test_audit_scan_empty_findings_gives_perfect_score(self):
        """No findings should give score 100."""
        result = audit_scan(target=".", modules=["host"])
        self.assertEqual(result.total_score, 100)
        self.assertEqual(result.grade, "A+")

if __name__ == "__main__":
    unittest.main()
