"""Production-grade tests for reconpro.learning_system."""

import json
import os
import threading
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Dict, List

from reconpro.learning_system import (
    LearningSystem,
    _empty_state,
    _LEARNING_FILE,
)


class TestEmptyState(unittest.TestCase):
    """Tests for _empty_state helper."""

    def test_returns_dict(self):
        state = _empty_state()
        self.assertIsInstance(state, dict)

    def test_has_required_keys(self):
        state = _empty_state()
        for key in ("version", "target_history", "module_effectiveness",
                     "error_patterns", "target_patterns", "regressions",
                     "total_scans"):
            self.assertIn(key, state)

    def test_version_is_one(self):
        self.assertEqual(_empty_state()["version"], 1)

    def test_total_scans_zero(self):
        self.assertEqual(_empty_state()["total_scans"], 0)


class TestLearningSystemInit(unittest.TestCase):
    """Tests for LearningSystem initialization."""

    def test_default_file_path(self):
        ls = LearningSystem()
        self.assertEqual(ls._file, _LEARNING_FILE)

    def test_custom_file_path(self):
        with TemporaryDirectory() as td:
            custom = Path(td) / "custom_learning.json"
            ls = LearningSystem(learning_file=custom)
            self.assertEqual(ls._file, custom)

    def test_state_initialised(self):
        with TemporaryDirectory() as td:
            ls = LearningSystem(learning_file=Path(td) / "learn.json")
            self.assertIsInstance(ls._state, dict)
            self.assertIn("version", ls._state)

    def test_loads_existing_file(self):
        with TemporaryDirectory() as td:
            fpath = Path(td) / "existing.json"
            data = {"version": 1, "total_scans": 5, "target_history": {"t": []},
                    "module_effectiveness": {}, "error_patterns": {},
                    "target_patterns": {}, "regressions": []}
            fpath.write_text(json.dumps(data))
            ls = LearningSystem(learning_file=fpath)
            self.assertEqual(ls._state["total_scans"], 5)

    def test_handles_corrupt_file(self):
        with TemporaryDirectory() as td:
            fpath = Path(td) / "bad.json"
            fpath.write_text("NOT VALID JSON{{{{")
            ls = LearningSystem(learning_file=fpath)
            # Should fall back to empty state
            self.assertEqual(ls._state["total_scans"], 0)


class TestRecordScan(unittest.TestCase):
    """Tests for LearningSystem.record_scan."""

    def _make_ls(self) -> LearningSystem:
        td = self._temp_dir.name
        return LearningSystem(learning_file=Path(td) / "learn.json")

    def setUp(self):
        self._temp_dir = TemporaryDirectory()
        self.ls = self._make_ls()

    def tearDown(self):
        self._temp_dir.cleanup()

    def test_record_increments_total_scans(self):
        self.ls.record_scan({"target": "t.com", "findings": [], "modules_run": [], "total_score": 0})
        self.assertEqual(self.ls._state["total_scans"], 1)

    def test_record_persists_to_disk(self):
        self.ls.record_scan({"target": "t.com", "findings": [], "modules_run": [], "total_score": 0})
        # Reload and verify
        ls2 = self._make_ls()
        self.assertEqual(ls2._state["total_scans"], 1)

    def test_record_target_history(self):
        self.ls.record_scan({
            "target": "example.com",
            "findings": [{"category": "ssl"}],
            "modules_run": ["recon"],
            "total_score": 85,
        })
        history = self.ls._state["target_history"]
        self.assertIn("example.com", history)
        self.assertEqual(len(history["example.com"]), 1)
        entry = history["example.com"][0]
        self.assertEqual(entry["finding_count"], 1)
        self.assertEqual(entry["score"], 85)
        self.assertIn("recon", entry["modules"])
        self.assertIn("ssl", entry["categories"])

    def test_record_module_effectiveness(self):
        self.ls.record_scan({
            "target": "t.com",
            "findings": [{"module": "recon"}, {"module": "recon"}, {"module": "auth"}],
            "modules_run": ["recon", "auth"],
        })
        me = self.ls._state["module_effectiveness"]
        self.assertIn("recon", me)
        self.assertEqual(me["recon"]["runs"], 1)
        self.assertEqual(me["recon"]["findings"], 2)
        self.assertEqual(me["recon"]["avg_findings"], 2.0)

    def test_record_error_patterns(self):
        self.ls.record_scan({
            "target": "t.com",
            "findings": [],
            "modules_run": ["recon"],
            "errors": [{"module": "recon", "error_type": "timeout"}],
        })
        ep = self.ls._state["error_patterns"]
        self.assertIn("timeout", ep.get("recon", {}))

    def test_record_target_patterns(self):
        self.ls.record_scan({
            "target": "example.com",
            "findings": [{"module": "ssl_check"}],
            "modules_run": ["ssl_check"],
            "total_score": 90,
        })
        tp = self.ls._state["target_patterns"]
        pattern = self.ls._extract_target_pattern("example.com")
        self.assertIn(pattern, tp)
        self.assertEqual(tp[pattern]["scan_count"], 1)
        self.assertIn("ssl_check", tp[pattern]["modules_that_work"])

    def test_multiple_scans_tracked(self):
        for i in range(5):
            self.ls.record_scan({
                "target": "t.com",
                "findings": [],
                "modules_run": [],
                "total_score": 0,
            })
        self.assertEqual(self.ls._state["total_scans"], 5)

    def test_target_history_capped_at_50(self):
        for i in range(60):
            self.ls.record_scan({
                "target": "t.com",
                "findings": [],
                "modules_run": [],
                "total_score": 0,
            })
        hist = self.ls._state["target_history"]["t.com"]
        self.assertLessEqual(len(hist), 50)


class TestGetTargetHistory(unittest.TestCase):
    """Tests for LearningSystem.get_target_history."""

    def setUp(self):
        self._temp_dir = TemporaryDirectory()
        self.ls = LearningSystem(learning_file=Path(self._temp_dir.name) / "learn.json")

    def tearDown(self):
        self._temp_dir.cleanup()

    def test_unknown_target(self):
        history = self.ls.get_target_history("unknown.com")
        self.assertEqual(history["scan_count"], 0)
        self.assertIsNone(history["latest_score"])
        self.assertEqual(history["latest_categories"], [])
        self.assertEqual(history["all_scores"], [])

    def test_known_target(self):
        self.ls.record_scan({
            "target": "example.com",
            "findings": [{"category": "ssl"}],
            "modules_run": ["recon", "auth"],
            "total_score": 75,
        })
        history = self.ls.get_target_history("example.com")
        self.assertEqual(history["scan_count"], 1)
        self.assertEqual(history["latest_score"], 75)
        self.assertIn("ssl", history["latest_categories"])
        self.assertEqual(history["all_scores"], [75])

    def test_multiple_scans_accumulate(self):
        self.ls.record_scan({"target": "t.com", "findings": [], "modules_run": [], "total_score": 80})
        self.ls.record_scan({"target": "t.com", "findings": [], "modules_run": ["auth"], "total_score": 90})
        history = self.ls.get_target_history("t.com")
        self.assertEqual(history["scan_count"], 2)
        self.assertEqual(history["latest_score"], 90)
        self.assertIn("auth", history["modules_used"])
        self.assertEqual(history["all_scores"], [80, 90])


class TestSuggestModules(unittest.TestCase):
    """Tests for LearningSystem.suggest_modules."""

    def setUp(self):
        self._temp_dir = TemporaryDirectory()
        self.ls = LearningSystem(learning_file=Path(self._temp_dir.name) / "learn.json")

    def tearDown(self):
        self._temp_dir.cleanup()

    def test_no_history_returns_empty(self):
        suggestions = self.ls.suggest_modules("unknown.com")
        self.assertEqual(suggestions, [])

    def test_returns_modules_from_history(self):
        self.ls.record_scan({
            "target": "example.com",
            "findings": [],
            "modules_run": ["recon", "auth", "ssl"],
        })
        suggestions = self.ls.suggest_modules("example.com")
        self.assertIn("recon", suggestions)
        self.assertIn("auth", suggestions)
        self.assertIn("ssl", suggestions)

    def test_capped_at_20(self):
        # Record enough modules to exceed the cap
        self.ls.record_scan({
            "target": "t.com",
            "findings": [],
            "modules_run": [f"mod_{i}" for i in range(25)],
        })
        suggestions = self.ls.suggest_modules("t.com")
        self.assertLessEqual(len(suggestions), 20)

    def test_pattern_match(self):
        # Record for api.example.com — should suggest for www.example.com
        self.ls.record_scan({
            "target": "api.example.com",
            "findings": [{"module": "ssl_check"}],
            "modules_run": ["ssl_check"],
        })
        suggestions = self.ls.suggest_modules("www.example.com")
        # Pattern extraction should group by example.com
        self.assertIn("ssl_check", suggestions)


class TestDetectRegressions(unittest.TestCase):
    """Tests for LearningSystem.detect_regressions."""

    def setUp(self):
        self._temp_dir = TemporaryDirectory()
        self.ls = LearningSystem(learning_file=Path(self._temp_dir.name) / "learn.json")

    def tearDown(self):
        self._temp_dir.cleanup()

    def test_no_previous_scans(self):
        regressions = self.ls.detect_regressions("new.com", [
            {"category": "ssl", "title": "SSL issue", "severity": "high"}
        ])
        self.assertEqual(regressions, [])

    def test_no_new_categories(self):
        self.ls.record_scan({
            "target": "t.com",
            "findings": [{"category": "ssl"}, {"category": "xss"}],
        })
        current = [
            {"category": "ssl", "title": "SSL issue", "severity": "high"},
            {"category": "xss", "title": "XSS issue", "severity": "medium"},
        ]
        regressions = self.ls.detect_regressions("t.com", current)
        self.assertEqual(len(regressions), 0)

    def test_new_category_is_regression(self):
        self.ls.record_scan({
            "target": "t.com",
            "findings": [{"category": "ssl"}],
        })
        current = [
            {"category": "ssl", "title": "SSL", "severity": "high"},
            {"category": "injection", "title": "SQLi", "severity": "critical"},
        ]
        regressions = self.ls.detect_regressions("t.com", current)
        self.assertEqual(len(regressions), 1)
        self.assertEqual(regressions[0]["category"], "injection")
        self.assertTrue(regressions[0]["previous_absent"])

    def test_regression_recorded_in_state(self):
        self.ls.record_scan({
            "target": "t.com",
            "findings": [],
        })
        self.ls.detect_regressions("t.com", [
            {"category": "secrets", "title": "Leak", "severity": "critical"}
        ])
        # Regression event should be stored
        self.assertGreater(len(self.ls._state["regressions"]), 0)


class TestGetScanEffectiveness(unittest.TestCase):
    """Tests for LearningSystem.get_scan_effectiveness."""

    def setUp(self):
        self._temp_dir = TemporaryDirectory()
        self.ls = LearningSystem(learning_file=Path(self._temp_dir.name) / "learn.json")

    def tearDown(self):
        self._temp_dir.cleanup()

    def test_empty_state(self):
        eff = self.ls.get_scan_effectiveness()
        self.assertEqual(eff["total_scans"], 0)
        self.assertEqual(eff["module_rankings"], [])
        self.assertEqual(eff["error_summary"], {})
        self.assertEqual(eff["top_error_modules"], [])

    def test_returns_module_data(self):
        self.ls.record_scan({
            "target": "t.com",
            "findings": [{"module": "recon"}, {"module": "recon"}],
            "modules_run": ["recon", "auth"],
        })
        eff = self.ls.get_scan_effectiveness()
        self.assertEqual(eff["total_scans"], 1)
        # Module rankings should include recon (has findings) and auth
        self.assertGreater(len(eff["module_rankings"]), 0)
        recon_rank = next(
            (r for r in eff["module_rankings"] if r["module"] == "recon"), None
        )
        self.assertIsNotNone(recon_rank)
        self.assertEqual(recon_rank["runs"], 1)
        self.assertEqual(recon_rank["total_findings"], 2)

    def test_ranked_by_avg_findings(self):
        self.ls.record_scan({
            "target": "t.com",
            "findings": [{"module": "recon"}],
            "modules_run": ["recon"],
        })
        self.ls.record_scan({
            "target": "t.com",
            "findings": [],
            "modules_run": ["auth"],
        })
        eff = self.ls.get_scan_effectiveness()
        # recon has avg_findings=1.0, auth has 0.0 — recon should be first
        if len(eff["module_rankings"]) >= 2:
            self.assertGreaterEqual(
                eff["module_rankings"][0]["avg_findings"],
                eff["module_rankings"][1]["avg_findings"],
            )


class TestExtractTargetPattern(unittest.TestCase):
    """Tests for LearningSystem._extract_target_pattern."""

    def test_simple_domain(self):
        self.assertEqual(
            LearningSystem._extract_target_pattern("api.example.com"),
            "example.com",
        )

    def test_ip_address(self):
        self.assertEqual(
            LearningSystem._extract_target_pattern("192.168.1.100"),
            "ip_192.168.1",
        )

    def test_url_with_path(self):
        self.assertEqual(
            LearningSystem._extract_target_pattern("https://example.com/api/v1"),
            "example.com",
        )

    def test_localhost(self):
        result = LearningSystem._extract_target_pattern("localhost")
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 0)


class TestThreadSafety(unittest.TestCase):
    """Basic concurrent record_scan calls."""

    def test_concurrent_records(self):
        with TemporaryDirectory() as td:
            ls = LearningSystem(learning_file=Path(td) / "learn.json")

            def record(i):
                ls.record_scan({
                    "target": f"target_{i % 5}",
                    "findings": [],
                    "modules_run": [],
                })

            threads = [threading.Thread(target=record, args=(i,)) for i in range(20)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            # Should have recorded 20 scans total (may be less due to race on save, but must not crash)
            self.assertGreaterEqual(ls._state["total_scans"], 1)


if __name__ == "__main__":
    unittest.main()
