"""Tests for the Autonomous Planner module (Council Eta - Age V)."""

import unittest
from unittest.mock import patch, MagicMock

from reconpro.autonomous_planner import (
    GoalParser,
    AutonomousPlanner,
    ExecutionPhase,
    ExecutionStrategy,
    ResourceEstimate,
)


class TestGoalParser(unittest.TestCase):
    """Tests for GoalParser.parse() across goal types and targets."""

    def setUp(self):
        self.parser = GoalParser()

    # ── Goal type classification ───────────────────────────────────────

    def test_parse_recon_goal(self):
        result = self.parser.parse("Perform recon on example.com")
        self.assertEqual(result["goal_type"], "recon")
        self.assertEqual(result["target"], "example.com")

    def test_parse_audit_goal(self):
        result = self.parser.parse("Evaluate the security of testsite.org")
        self.assertEqual(result["goal_type"], "audit")

    def test_parse_compliance_goal(self):
        result = self.parser.parse("Check PCI compliance for app.io")
        self.assertEqual(result["goal_type"], "compliance")

    def test_parse_attack_surface_goal(self):
        result = self.parser.parse("Map the attack surface of target.net")
        self.assertEqual(result["goal_type"], "attack_surface")

    def test_parse_full_assessment_goal(self):
        result = self.parser.parse("Run a comprehensive scan on bigcorp.com")
        self.assertEqual(result["goal_type"], "full_assessment")

    def test_parse_cloud_audit_goal(self):
        result = self.parser.parse("Audit AWS S3 buckets for cloud.dev")
        self.assertEqual(result["goal_type"], "cloud_audit")

    def test_parse_code_review_goal(self):
        result = self.parser.parse("Run SAST static analysis on repo project")
        self.assertEqual(result["goal_type"], "code_review")

    # ── Target extraction ──────────────────────────────────────────────

    def test_extract_ip_target(self):
        result = self.parser.parse("Scan 192.168.1.1 for vulnerabilities")
        self.assertEqual(result["target"], "192.168.1.1")

    def test_extract_url_target(self):
        result = self.parser.parse("Test https://example.com/login for auth issues")
        self.assertEqual(result["target"], "https://example.com/login")

    def test_extract_domain_target(self):
        result = self.parser.parse("Enumerate subdomains of targetdomain.com")
        self.assertEqual(result["target"], "targetdomain.com")

    # ── Edge cases ─────────────────────────────────────────────────────

    def test_empty_goal_falls_back_to_audit(self):
        result = self.parser.parse("")
        self.assertEqual(result["goal_type"], "audit")

    def test_no_matching_keywords_falls_back_to_audit(self):
        result = self.parser.parse("xyzzy foobar")
        self.assertEqual(result["goal_type"], "audit")

    def test_extract_timeout_constraint(self):
        result = self.parser.parse("scan example.com timeout 300 seconds")
        self.assertEqual(result["constraints"]["timeout"], 300.0)

    def test_extract_depth_constraint(self):
        result = self.parser.parse("scan example.com depth=deep")
        self.assertIn("depth", result["constraints"])
        self.assertEqual(result["constraints"]["depth"], "deep")

    def test_raw_goal_preserved(self):
        goal_text = "Perform recon on example.com"
        result = self.parser.parse(goal_text)
        self.assertEqual(result["raw_goal"], goal_text)


class TestAutonomousPlannerPlan(unittest.TestCase):
    """Tests for AutonomousPlanner.plan() across goal types and targets."""

    def setUp(self):
        self.planner = AutonomousPlanner()

    def test_plan_recon_goal_returns_strategy(self):
        strategy = self.planner.plan("recon example.com")
        self.assertIsInstance(strategy, ExecutionStrategy)
        self.assertEqual(strategy.goal_type, "recon")
        self.assertIn("recon", strategy.required_modules)

    def test_plan_audit_goal_includes_auth_modules(self):
        strategy = self.planner.plan("audit example.com")
        self.assertEqual(strategy.goal_type, "audit")
        self.assertTrue(len(strategy.required_modules) >= 3)

    def test_plan_compliance_goal(self):
        strategy = self.planner.plan("compliance check for example.com")
        self.assertEqual(strategy.goal_type, "compliance")

    def test_plan_attack_surface_goal(self):
        strategy = self.planner.plan("map attack surface of example.com")
        self.assertEqual(strategy.goal_type, "attack_surface")

    def test_plan_full_assessment_goal(self):
        strategy = self.planner.plan("comprehensive scan of example.com")
        self.assertEqual(strategy.goal_type, "full_assessment")
        # Full assessment should include many modules.
        self.assertGreater(len(strategy.required_modules), 5)

    def test_plan_cloud_audit_goal(self):
        strategy = self.planner.plan("audit AWS cloud for cloud.example.com")
        self.assertEqual(strategy.goal_type, "cloud_audit")

    def test_plan_code_review_goal(self):
        strategy = self.planner.plan("static analysis code review of example.com")
        self.assertEqual(strategy.goal_type, "code_review")

    def test_plan_ip_target(self):
        strategy = self.planner.plan("recon 10.0.0.1")
        self.assertEqual(strategy.target, "10.0.0.1")

    def test_plan_localhost_target(self):
        strategy = self.planner.plan("local audit of localhost")
        # "localhost" doesn't match URL/IP/domain regex, falls back to "unknown"
        # unless target is passed via context.
        self.assertIsInstance(strategy, ExecutionStrategy)
        self.assertEqual(strategy.goal_type, "audit")

    def test_plan_url_target(self):
        strategy = self.planner.plan("audit https://example.com/app")
        self.assertEqual(strategy.target, "https://example.com/app")

    def test_plan_has_phases(self):
        strategy = self.planner.plan("recon example.com")
        self.assertTrue(len(strategy.phases) >= 1)
        for phase in strategy.phases:
            self.assertIsInstance(phase, ExecutionPhase)

    def test_plan_dependencies_resolved(self):
        strategy = self.planner.plan("audit example.com")
        # Dependencies should only reference available modules.
        for mod, deps in strategy.dependencies.items():
            self.assertIn(mod, strategy.required_modules)
            for d in deps:
                self.assertIn(d, strategy.required_modules)

    def test_plan_rollback_plan_not_empty(self):
        strategy = self.planner.plan("audit example.com")
        self.assertTrue(len(strategy.rollback_plan) >= 1)

    def test_plan_to_dict_roundtrip(self):
        strategy = self.planner.plan("recon example.com")
        d = strategy.to_dict()
        self.assertIn("goal_type", d)
        self.assertIn("phases", d)
        self.assertIn("required_modules", d)
        self.assertEqual(d["goal_type"], "recon")


class TestAutonomousPlannerReplan(unittest.TestCase):
    """Tests for AutonomousPlanner.replan()."""

    def setUp(self):
        self.planner = AutonomousPlanner()
        self.strategy = self.planner.plan("audit example.com")

    def test_replan_after_completed_modules(self):
        results = {"recon": {"findings_count": 5}, "auth": {"findings_count": 3}}
        replanned = self.planner.replan(self.strategy, results)
        self.assertNotIn("recon", replanned.required_modules)
        self.assertNotIn("auth", replanned.required_modules)

    def test_replan_after_failed_modules(self):
        results = {"recon": {"error": "timeout"}}
        replanned = self.planner.replan(self.strategy, results)
        self.assertNotIn("recon", replanned.required_modules)

    def test_replan_all_completed_yields_empty(self):
        results = {m: {"findings_count": 0} for m in self.strategy.required_modules}
        replanned = self.planner.replan(self.strategy, results)
        self.assertEqual(len(replanned.required_modules), 0)

    def test_replan_many_findings_lowers_confidence(self):
        results = {"recon": {"findings_count": 30}}
        replanned = self.planner.replan(self.strategy, results)
        self.assertLessEqual(replanned.confidence_threshold, self.strategy.confidence_threshold)


class TestAutonomousPlannerResources(unittest.TestCase):
    """Tests for AutonomousPlanner.estimate_resources()."""

    def setUp(self):
        self.planner = AutonomousPlanner()

    def test_estimate_resources_for_recon(self):
        strategy = self.planner.plan("recon example.com")
        est = self.planner.estimate_resources(strategy)
        self.assertIsInstance(est, ResourceEstimate)
        self.assertIn(est.cpu_estimate, ("low", "medium", "high"))
        self.assertGreater(est.ram_estimate_mb, 0)
        self.assertGreaterEqual(est.wall_time_seconds, 0)

    def test_estimate_resources_empty_strategy(self):
        strategy = ExecutionStrategy(
            goal_type="audit", target="x", phases=[], total_estimated_time=0,
            required_modules=[], dependencies={})
        est = self.planner.estimate_resources(strategy)
        self.assertEqual(est.cpu_estimate, "low")
        self.assertEqual(est.ram_estimate_mb, 50)
        self.assertEqual(est.network_requests, 0)

    def test_estimate_resources_full_assessment_is_higher(self):
        recon = self.planner.plan("recon example.com")
        full = self.planner.plan("comprehensive scan of example.com")
        est_recon = self.planner.estimate_resources(recon)
        est_full = self.planner.estimate_resources(full)
        self.assertGreaterEqual(est_full.ram_estimate_mb, est_recon.ram_estimate_mb)
        self.assertGreaterEqual(est_full.network_requests, est_recon.network_requests)

    def test_estimate_resources_to_dict(self):
        strategy = self.planner.plan("recon example.com")
        est = self.planner.estimate_resources(strategy)
        d = est.to_dict()
        self.assertIn("cpu_estimate", d)
        self.assertIn("ram_estimate_mb", d)
        self.assertIn("wall_time_seconds", d)


class TestAutonomousPlannerValidation(unittest.TestCase):
    """Tests for AutonomousPlanner.validate_strategy()."""

    def setUp(self):
        self.planner = AutonomousPlanner()

    def test_validate_clean_strategy_no_warnings(self):
        strategy = self.planner.plan("recon example.com")
        warnings = self.planner.validate_strategy(strategy)
        self.assertEqual(len(warnings), 0)

    def test_validate_circular_dependency_detected(self):
        strategy = ExecutionStrategy(
            goal_type="audit", target="x",
            phases=[ExecutionPhase(name="p0", module_group=["a", "b"])],
            total_estimated_time=30,
            required_modules=["a", "b"],
            dependencies={"a": ["b"], "b": ["a"]},
        )
        warnings = self.planner.validate_strategy(strategy)
        self.assertTrue(any("circular" in w.lower() for w in warnings))

    def test_validate_empty_phase_warns(self):
        strategy = ExecutionStrategy(
            goal_type="audit", target="x",
            phases=[ExecutionPhase(name="empty_phase", module_group=[])],
            total_estimated_time=0,
            required_modules=[],
            dependencies={},
        )
        warnings = self.planner.validate_strategy(strategy)
        self.assertTrue(any("no modules" in w.lower() for w in warnings))

    def test_validate_unknown_module_warns(self):
        strategy = ExecutionStrategy(
            goal_type="audit", target="x",
            phases=[ExecutionPhase(name="p0", module_group=["nonexistent_module"])],
            total_estimated_time=15,
            required_modules=["nonexistent_module"],
            dependencies={},
        )
        warnings = self.planner.validate_strategy(strategy)
        self.assertTrue(any("unknown" in w.lower() for w in warnings))

    def test_validate_dependency_not_in_required_warns(self):
        strategy = ExecutionStrategy(
            goal_type="audit", target="x",
            phases=[ExecutionPhase(name="p0", module_group=["auth"])],
            total_estimated_time=30,
            required_modules=["auth"],
            dependencies={"auth": ["recon"]},
        )
        warnings = self.planner.validate_strategy(strategy)
        self.assertTrue(any("not in required" in w.lower() for w in warnings))


class TestEdgeCases(unittest.TestCase):
    """Edge case tests for the planner."""

    def test_no_matching_modules_yields_minimal_plan(self):
        planner = AutonomousPlanner()
        strategy = planner.plan("recon example.com", context={"modules": ["nonexistent_module_xyz"]})
        self.assertEqual(len(strategy.required_modules), 0)

    def test_empty_goal_produces_valid_strategy(self):
        planner = AutonomousPlanner()
        strategy = planner.plan("")
        self.assertIsInstance(strategy, ExecutionStrategy)
        # Should default to audit type.
        self.assertEqual(strategy.goal_type, "audit")

    def test_confidence_threshold_deep_scan(self):
        planner = AutonomousPlanner()
        strategy = planner.plan("recon example.com depth=deep")
        self.assertEqual(strategy.confidence_threshold, 0.9)

    def test_confidence_threshold_normal_recon(self):
        planner = AutonomousPlanner()
        strategy = planner.plan("recon example.com")
        self.assertEqual(strategy.confidence_threshold, 0.7)


if __name__ == "__main__":
    unittest.main()
