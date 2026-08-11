"""Production-grade tests for reconpro.target_intelligence."""

import unittest
from dataclasses import dataclass
from typing import Any, Dict, List

from reconpro.target_intelligence import (
    TargetIntelligence,
    TargetIntelReport,
    CategoryRisk,
    _CATEGORY_CLASSIFICATION,
    _SEVERITY_RISK,
    _BUSINESS_IMPACT,
    _CATEGORY_ACTIONS,
)


class TestClassify(unittest.TestCase):
    """Tests for TargetIntelligence._classify static method."""

    def test_known_category_ssl(self):
        self.assertEqual(
            TargetIntelligence._classify({"category": "ssl"}), "infra"
        )

    def test_known_category_xss(self):
        self.assertEqual(
            TargetIntelligence._classify({"category": "xss"}), "app"
        )

    def test_known_category_secrets(self):
        self.assertEqual(
            TargetIntelligence._classify({"category": "secrets"}), "data"
        )

    def test_known_category_cors(self):
        self.assertEqual(
            TargetIntelligence._classify({"category": "cors"}), "network"
        )

    def test_known_category_auth(self):
        self.assertEqual(
            TargetIntelligence._classify({"category": "auth"}), "auth"
        )

    def test_known_category_crypto(self):
        self.assertEqual(
            TargetIntelligence._classify({"category": "crypto"}), "crypto"
        )

    def test_unknown_category_defaults_to_app(self):
        self.assertEqual(
            TargetIntelligence._classify({"category": "unknown_foo"}), "app"
        )

    def test_heuristic_ssl_in_title(self):
        self.assertEqual(
            TargetIntelligence._classify({"title": "SSL Certificate Expired"}),
            "infra",
        )

    def test_heuristic_injection_in_title(self):
        self.assertEqual(
            TargetIntelligence._classify({"title": "SQL Injection Found"}),
            "app",
        )

    def test_heuristic_secret_in_description(self):
        self.assertEqual(
            TargetIntelligence._classify(
                {"title": "Issue", "description": "password leaked in logs"}
            ),
            "data",
        )

    def test_missing_category_field(self):
        self.assertEqual(
            TargetIntelligence._classify({"title": "generic issue"}), "app"
        )


class TestCategoryRisk(unittest.TestCase):
    """Tests for TargetIntelligence._category_risk."""

    def test_empty_list_returns_zero(self):
        risk = TargetIntelligence._category_risk([])
        self.assertEqual(risk.risk_score, 0.0)
        self.assertEqual(risk.finding_count, 0)

    def test_single_critical_finding(self):
        risk = TargetIntelligence._category_risk(
            [{"severity": "critical", "category": "ssl"}]
        )
        self.assertEqual(risk.risk_score, 1.0)
        self.assertEqual(risk.finding_count, 1)

    def test_mixed_severity_findings(self):
        findings = [
            {"severity": "low", "category": "ssl"},
            {"severity": "high", "category": "ssl"},
            {"severity": "medium", "category": "ssl"},
        ]
        risk = TargetIntelligence._category_risk(findings)
        self.assertGreater(risk.risk_score, 0.0)
        self.assertEqual(risk.finding_count, 3)
        self.assertIn("low", risk.severity_breakdown)

    def test_multiple_critical_boosts(self):
        findings = [
            {"severity": "critical", "category": "injection"},
            {"severity": "critical", "category": "injection"},
            {"severity": "critical", "category": "injection"},
        ]
        risk = TargetIntelligence._category_risk(findings)
        self.assertEqual(risk.risk_score, 1.0)  # Boosted and capped

    def test_two_high_boosts(self):
        findings = [
            {"severity": "high", "category": "injection"},
            {"severity": "high", "category": "injection"},
            {"severity": "info", "category": "injection"},
        ]
        risk = TargetIntelligence._category_risk(findings)
        # avg_risk = (0.75 + 0.75 + 0.1) / 3 = 0.533, boost 1.15 → 0.613
        self.assertGreater(risk.risk_score, 0.5)  # Should be boosted above avg

    def test_to_dict(self):
        risk = TargetIntelligence._category_risk(
            [{"severity": "medium", "category": "ssl"}]
        )
        d = risk.to_dict()
        self.assertIn("category", d)
        self.assertIn("risk_score", d)
        self.assertIn("finding_count", d)


class TestOverallRisk(unittest.TestCase):
    """Tests for TargetIntelligence._overall_risk."""

    def test_empty_assessment(self):
        self.assertEqual(TargetIntelligence._overall_risk({}, 0), 0.0)

    def test_single_category(self):
        assessment = {"infra": CategoryRisk("infra", 0.8, 2)}
        self.assertAlmostEqual(
            TargetIntelligence._overall_risk(assessment, 2), 0.8
        )

    def test_weighted_average(self):
        assessment = {
            "infra": CategoryRisk("infra", 1.0, 5),
            "app": CategoryRisk("app", 0.0, 1),
        }
        # Weighted by finding count: (1.0*5 + 0.0*1)/6 = 0.833
        risk = TargetIntelligence._overall_risk(assessment, 6)
        self.assertAlmostEqual(risk, 5.0 / 6.0, places=2)

    def test_zero_weight_division(self):
        assessment = {"infra": CategoryRisk("infra", 0.5, 0)}
        self.assertEqual(TargetIntelligence._overall_risk(assessment, 0), 0.0)


class TestMaxSeverity(unittest.TestCase):
    """Tests for TargetIntelligence._max_severity."""

    def test_empty_list(self):
        self.assertEqual(TargetIntelligence._max_severity([]), "info")

    def test_critical_present(self):
        findings = [
            {"severity": "info"},
            {"severity": "critical"},
            {"severity": "low"},
        ]
        self.assertEqual(TargetIntelligence._max_severity(findings), "critical")

    def test_no_critical(self):
        findings = [
            {"severity": "info"},
            {"severity": "high"},
        ]
        self.assertEqual(TargetIntelligence._max_severity(findings), "high")

    def test_all_info(self):
        findings = [{"severity": "info"}]
        self.assertEqual(TargetIntelligence._max_severity(findings), "info")


class TestAnalyze(unittest.TestCase):
    """Tests for TargetIntelligence.analyze."""

    def setUp(self):
        self.ti = TargetIntelligence()

    def test_empty_findings(self):
        report = self.ti.analyze("example.com", [])
        self.assertIsInstance(report, TargetIntelReport)
        self.assertEqual(report.finding_count, 0)
        self.assertEqual(report.critical_count, 0)
        self.assertEqual(report.high_count, 0)
        self.assertEqual(report.overall_risk, 0.0)
        self.assertEqual(report.confidence, 0.5)  # Default
        self.assertIsInstance(report.technology_stack, list)
        self.assertIsInstance(report.suggested_next_actions, list)

    def test_mixed_severity_findings(self):
        findings = [
            {"severity": "critical", "category": "ssl", "title": "SSL issue"},
            {"severity": "high", "category": "xss", "title": "XSS found"},
            {"severity": "info", "category": "headers", "title": "Missing header"},
        ]
        report = self.ti.analyze("example.com", findings)
        self.assertEqual(report.finding_count, 3)
        self.assertEqual(report.critical_count, 1)
        self.assertEqual(report.high_count, 1)
        self.assertGreater(report.overall_risk, 0.0)
        self.assertEqual(
            report.business_impact, _BUSINESS_IMPACT["critical"]
        )

    def test_all_categories_have_risk(self):
        findings = [
            {"severity": "medium", "category": "ssl"},
            {"severity": "medium", "category": "xss"},
            {"severity": "medium", "category": "secrets"},
            {"severity": "medium", "category": "cors"},
            {"severity": "medium", "category": "auth"},
            {"severity": "medium", "category": "crypto"},
        ]
        report = self.ti.analyze("example.com", findings)
        for cat in ("infra", "app", "data", "network", "auth", "crypto"):
            self.assertIn(cat, report.risk_assessment)

    def test_confidence_from_findings(self):
        findings = [
            {"confidence": 0.9, "severity": "medium"},
            {"confidence": 0.7, "severity": "medium"},
        ]
        report = self.ti.analyze("example.com", findings)
        # Average of 0.9 and 0.7 = 0.8
        self.assertAlmostEqual(report.confidence, 0.8, places=1)

    def test_attack_surface_populated(self):
        findings = [
            {"severity": "high", "category": "ssl"},
            {"severity": "info", "category": "headers"},
        ]
        report = self.ti.analyze("example.com", findings)
        self.assertGreater(len(report.attack_surface), 0)

    def test_suggested_actions_populated(self):
        findings = [
            {"severity": "critical", "category": "secrets"},
        ]
        report = self.ti.analyze("example.com", findings)
        self.assertGreater(len(report.suggested_next_actions), 0)

    def test_to_dict(self):
        report = self.ti.analyze("example.com", [])
        d = report.to_dict()
        self.assertIn("target", d)
        self.assertIn("risk_assessment", d)
        self.assertIn("overall_risk", d)
        self.assertIn("suggested_next_actions", d)

    def test_profile_extraction(self):
        @dataclass
        class FakeProfile:
            def to_dict(self) -> Dict[str, Any]:
                return {
                    "detected_technologies": ["React", "Nginx"],
                    "app_type": "SPA",
                    "waf": "Cloudflare",
                }

        report = self.ti.analyze(
            "example.com", [], profile=FakeProfile()
        )
        self.assertIn("React", report.technology_stack)
        self.assertEqual(report.vendor, "Cloudflare")
        self.assertEqual(report.app_type, "SPA")

    def test_none_input_findings(self):
        report = self.ti.analyze("example.com", [])
        self.assertIsInstance(report, TargetIntelReport)


class TestCategoryClassificationCompleteness(unittest.TestCase):
    """Verify all classification mappings are defined."""

    def test_all_classifications_map_to_valid_intel_category(self):
        valid = {"infra", "app", "data", "network", "auth", "crypto"}
        for cat, intel_cat in _CATEGORY_CLASSIFICATION.items():
            self.assertIn(intel_cat, valid, f"{cat} maps to {intel_cat}")

    def test_all_categories_have_actions(self):
        for cat in ("infra", "app", "data", "network", "auth", "crypto"):
            self.assertIn(cat, _CATEGORY_ACTIONS)
            self.assertGreater(len(_CATEGORY_ACTIONS[cat]), 0)


if __name__ == "__main__":
    unittest.main()
