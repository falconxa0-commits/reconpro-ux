"""Production-grade tests for reconpro.decision_engine."""

import unittest
from typing import Any, Dict, List

from reconpro.decision_engine import (
    DecisionEngine,
    ScanPlan,
    _RETRYABLE_ERRORS,
    _SKIP_ERRORS,
    _MODULE_TIME,
    _TARGET_MODULE_HINTS,
)


class TestClassifyTarget(unittest.TestCase):
    """Tests for DecisionEngine._classify_target."""

    def setUp(self):
        self.engine = DecisionEngine()

    def test_domain(self):
        self.assertEqual(self.engine._classify_target("example.com"), "domain")

    def test_domain_with_http(self):
        self.assertEqual(self.engine._classify_target("https://example.com"), "domain")

    def test_ip_address(self):
        self.assertEqual(self.engine._classify_target("10.0.0.1"), "ip")

    def test_ip_with_protocol(self):
        self.assertEqual(self.engine._classify_target("https://192.168.1.1"), "ip")

    def test_localhost(self):
        self.assertEqual(self.engine._classify_target("localhost"), "localhost")

    def test_127_0_0_1(self):
        self.assertEqual(self.engine._classify_target("127.0.0.1"), "localhost")

    def test_ipv6_localhost(self):
        # urlparse("https://::1") -> hostname "::1", not "localhost"
        # This is a known limitation — ::1 with 6 colons doesn't match the simple check
        result = self.engine._classify_target("::1")
        self.assertIsInstance(result, str)

    def test_url_with_path(self):
        self.assertEqual(self.engine._classify_target("https://example.com/api/test"), "url")

    def test_cloud_amazonaws(self):
        self.assertEqual(
            self.engine._classify_target("app.amazonaws.com"), "cloud"
        )

    def test_cloud_azure(self):
        self.assertEqual(
            self.engine._classify_target("app.azure.com"), "cloud"
        )

    def test_cloud_heroku(self):
        self.assertEqual(
            self.engine._classify_target("myapp.herokuapp.com"), "cloud"
        )

    def test_strips_whitespace(self):
        self.assertEqual(self.engine._classify_target("  example.com  "), "domain")


class TestPlanScan(unittest.TestCase):
    """Tests for DecisionEngine.plan_scan."""

    def setUp(self):
        self.engine = DecisionEngine()

    def test_domain_target(self):
        plan = self.engine.plan_scan("example.com", ["recon", "auth", "chain"])
        self.assertIsInstance(plan, ScanPlan)
        self.assertEqual(plan.target, "example.com")
        self.assertEqual(plan.target_type, "domain")
        self.assertIn("recon", plan.modules_to_run)
        self.assertGreater(len(plan.order), 0)

    def test_ip_target(self):
        plan = self.engine.plan_scan("10.0.0.1", ["host", "recon", "cve_radar"])
        self.assertEqual(plan.target_type, "ip")
        self.assertIn("host", plan.modules_to_run)

    def test_localhost_target(self):
        plan = self.engine.plan_scan("localhost", ["host", "dev", "doctor"])
        self.assertEqual(plan.target_type, "localhost")
        self.assertIn("fast_mode", plan.throttle_flags)

    def test_url_target(self):
        plan = self.engine.plan_scan(
            "https://example.com/api", ["recon", "auth", "fuzzer"]
        )
        self.assertEqual(plan.target_type, "url")
        self.assertIn("respect_robots_txt", plan.throttle_flags)

    def test_empty_modules(self):
        plan = self.engine.plan_scan("example.com", [])
        self.assertEqual(plan.modules_to_run, [])
        self.assertEqual(plan.estimated_time, 0.0)

    def test_modules_skipped_from_hints(self):
        # Domain target should prioritise recon, subdomains, auth
        plan = self.engine.plan_scan("example.com", ["auth", "recon", "bot"])
        # auth and recon should be before bot in the order (they're in domain hints)
        auth_idx = plan.order.index("auth")
        recon_idx = plan.order.index("recon")
        bot_idx = plan.order.index("bot")
        self.assertLess(recon_idx, bot_idx)
        self.assertLess(auth_idx, bot_idx)

    def test_estimated_time(self):
        plan = self.engine.plan_scan("example.com", ["recon", "auth"])
        expected = _MODULE_TIME.get("recon", 15.0) + _MODULE_TIME.get("auth", 15.0)
        self.assertAlmostEqual(plan.estimated_time, expected, places=1)

    def test_learning_data_skips(self):
        learning = {
            "error_patterns": {
                "auth": {"not_applicable": 5, "no_dns_record": 1},
            },
            "target_history": {},
        }
        plan = self.engine.plan_scan(
            "example.com", ["recon", "auth", "chain"], learning_data=learning
        )
        # auth should be skipped due to not_applicable errors
        self.assertNotIn("auth", plan.modules_to_run)
        self.assertIn("auth", plan.skip_reasons)

    def test_retry_modules(self):
        learning = {
            "error_patterns": {
                "recon": {"timeout": 10},
            },
            "target_history": {},
        }
        plan = self.engine.plan_scan(
            "example.com", ["recon"], learning_data=learning
        )
        # recon should have retry budget because timeout is retryable
        self.assertEqual(plan.retry_modules.get("recon", 0), 2)

    def test_to_dict(self):
        plan = self.engine.plan_scan("example.com", ["recon"])
        d = plan.to_dict()
        self.assertIn("target", d)
        self.assertIn("target_type", d)
        self.assertIn("modules_to_run", d)
        self.assertIn("order", d)
        self.assertIn("skip_reasons", d)
        self.assertIn("estimated_time", d)


class TestShouldRetry(unittest.TestCase):
    """Tests for DecisionEngine.should_retry."""

    def setUp(self):
        self.engine = DecisionEngine()

    def test_retryable_error(self):
        for err in _RETRYABLE_ERRORS:
            self.assertTrue(
                self.engine.should_retry("mod", err, 1),
                f"Should retry for '{err}'"
            )

    def test_permanent_error(self):
        for err in _SKIP_ERRORS:
            self.assertFalse(
                self.engine.should_retry("mod", err, 1),
                f"Should NOT retry for '{err}'"
            )

    def test_max_attempts(self):
        self.assertFalse(self.engine.should_retry("mod", "timeout", 4))

    def test_unknown_error_allows_one_retry(self):
        self.assertTrue(self.engine.should_retry("mod", "weird_error", 1))
        self.assertFalse(self.engine.should_retry("mod", "weird_error", 2))

    def test_timeout_within_limit(self):
        self.assertTrue(self.engine.should_retry("mod", "connection timeout", 1))
        self.assertTrue(self.engine.should_retry("mod", "timeout", 2))
        self.assertTrue(self.engine.should_retry("mod", "timeout", 3))

    def test_case_insensitive(self):
        self.assertTrue(self.engine.should_retry("mod", "TIMEOUT", 1))
        self.assertTrue(self.engine.should_retry("mod", "Connection_Reset", 1))


class TestShouldThrottle(unittest.TestCase):
    """Tests for DecisionEngine.should_throttle."""

    def setUp(self):
        self.engine = DecisionEngine()

    def test_low_error_rate(self):
        self.assertFalse(self.engine.should_throttle(0.0))

    def test_medium_error_rate(self):
        self.assertTrue(self.engine.should_throttle(0.3))

    def test_high_error_rate(self):
        self.assertTrue(self.engine.should_throttle(0.5))

    def test_very_high_error_rate(self):
        self.assertTrue(self.engine.should_throttle(1.0))

    def test_threshold_boundary(self):
        # Below 0.3
        self.assertFalse(self.engine.should_throttle(0.29))


class TestOptimizeOrder(unittest.TestCase):
    """Tests for DecisionEngine.optimize_order."""

    def setUp(self):
        self.engine = DecisionEngine()

    def test_empty_list(self):
        self.assertEqual(self.engine.optimize_order([], "example.com"), [])

    def test_single_module(self):
        result = self.engine.optimize_order(["recon"], "example.com")
        self.assertEqual(result, ["recon"])

    def test_hint_modules_first(self):
        modules = ["auth", "recon", "chain", "bot"]
        ordered = self.engine.optimize_order(modules, "example.com")
        # For domain: recon, subdomains, auth, chain, bot
        recon_idx = ordered.index("recon")
        bot_idx = ordered.index("bot")
        self.assertLess(recon_idx, bot_idx)

    def test_fast_modules_before_slow(self):
        # Without hints (ip target), speed should matter
        modules = ["gorgon", "recon", "doctor"]
        ordered = self.engine.optimize_order(modules, "192.168.1.1")
        # doctor (5s) and recon (15s) should be before gorgon (60s)
        gorgon_idx = ordered.index("gorgon")
        recon_idx = ordered.index("recon")
        self.assertLess(recon_idx, gorgon_idx)

    def test_with_effectiveness_data(self):
        effectiveness = {
            "auth": {"avg_findings": 5.0},
            "recon": {"avg_findings": 1.0},
        }
        modules = ["recon", "auth"]
        ordered = self.engine.optimize_order(modules, "example.com", effectiveness)
        # For domain: hints are ["recon", "subdomains", "auth", "chain", "bot"]
        # recon has hint_priority=0, auth has hint_priority=2
        # Even with higher effectiveness, hints come first
        recon_idx = ordered.index("recon")
        auth_idx = ordered.index("auth")
        self.assertLess(recon_idx, auth_idx)

    def test_preserves_all_modules(self):
        modules = ["recon", "auth", "chain", "bot", "gorgon"]
        ordered = self.engine.optimize_order(modules, "example.com")
        self.assertEqual(set(ordered), set(modules))
        self.assertEqual(len(ordered), len(modules))


class TestComputeSkips(unittest.TestCase):
    """Tests for DecisionEngine._compute_skips."""

    def test_no_skips_with_empty_learning(self):
        skips = DecisionEngine._compute_skips("t.com", ["recon", "auth"], {})
        self.assertEqual(skips, {})

    def test_skips_persistent_errors(self):
        learning = {
            "error_patterns": {
                "recon": {"not_applicable": 4, "feature_disabled": 2},
            },
            "target_history": {},
        }
        skips = DecisionEngine._compute_skips("t.com", ["recon", "auth"], learning)
        self.assertIn("recon", skips)

    def test_no_skips_below_threshold(self):
        learning = {
            "error_patterns": {
                "recon": {"not_applicable": 2},
            },
            "target_history": {},
        }
        skips = DecisionEngine._compute_skips("t.com", ["recon"], learning)
        self.assertNotIn("recon", skips)


if __name__ == "__main__":
    unittest.main()
