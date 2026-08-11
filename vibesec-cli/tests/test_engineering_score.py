"""Production-grade tests for reconpro.engineering_score."""

import unittest
from typing import Any, Dict, List

from reconpro.engineering_score import (
    EngineeringScorer,
    EngineeringReport,
    DimensionScore,
    _DIMENSION_WEIGHTS,
    _SEVERITY_PENALTY,
    _CATEGORY_MAP,
)


class TestDimensionScore(unittest.TestCase):
    """Tests for DimensionScore dataclass."""

    def test_default_values(self):
        ds = DimensionScore(name="security", score=85.0)
        self.assertEqual(ds.max_score, 100.0)
        self.assertEqual(ds.findings_count, 0)
        self.assertEqual(ds.recommendations, [])

    def test_to_dict(self):
        ds = DimensionScore(name="security", score=75.0, findings_count=3)
        d = ds.to_dict()
        self.assertEqual(d["name"], "security")
        self.assertEqual(d["score"], 75.0)
        self.assertEqual(d["findings_count"], 3)


class TestEngineeringReport(unittest.TestCase):
    """Tests for EngineeringReport dataclass."""

    def test_to_dict(self):
        report = EngineeringReport(
            target="example.com",
            overall_score=82.5,
            dimensions={"security": DimensionScore("security", 80.0)},
            total_findings=5,
            grade="A",
        )
        d = report.to_dict()
        self.assertIn("target", d)
        self.assertIn("grade", d)
        self.assertIn("dimensions", d)


class TestComputeGrade(unittest.TestCase):
    """Tests for EngineeringScorer._compute_grade."""

    def test_a_plus(self):
        self.assertEqual(EngineeringScorer._compute_grade(95), "A+")
        self.assertEqual(EngineeringScorer._compute_grade(90), "A+")

    def test_a(self):
        self.assertEqual(EngineeringScorer._compute_grade(85), "A")
        self.assertEqual(EngineeringScorer._compute_grade(80), "A")

    def test_b(self):
        self.assertEqual(EngineeringScorer._compute_grade(70), "B")
        self.assertEqual(EngineeringScorer._compute_grade(65), "B")

    def test_c(self):
        self.assertEqual(EngineeringScorer._compute_grade(55), "C")
        self.assertEqual(EngineeringScorer._compute_grade(50), "C")

    def test_d(self):
        self.assertEqual(EngineeringScorer._compute_grade(40), "D")
        self.assertEqual(EngineeringScorer._compute_grade(35), "D")

    def test_f(self):
        self.assertEqual(EngineeringScorer._compute_grade(34), "F")
        self.assertEqual(EngineeringScorer._compute_grade(0), "F")

    def test_boundary_values(self):
        # Exact boundaries
        self.assertEqual(EngineeringScorer._compute_grade(89.9), "A")
        self.assertEqual(EngineeringScorer._compute_grade(79.9), "B")
        self.assertEqual(EngineeringScorer._compute_grade(64.9), "C")
        self.assertEqual(EngineeringScorer._compute_grade(49.9), "D")
        self.assertEqual(EngineeringScorer._compute_grade(34.9), "F")


class TestScoreWithNoFindings(unittest.TestCase):
    """Score with no findings should yield perfect score."""

    def test_no_findings_perfect_score(self):
        scorer = EngineeringScorer()
        report = scorer.score("example.com", [])
        self.assertEqual(report.overall_score, 100.0)
        self.assertEqual(report.grade, "A+")
        self.assertEqual(report.total_findings, 0)

    def test_all_dimensions_at_100(self):
        scorer = EngineeringScorer()
        report = scorer.score("example.com", [])
        for dim in _DIMENSION_WEIGHTS:
            self.assertEqual(
                report.dimensions[dim].score, 100.0,
                f"Dimension {dim} should be 100.0"
            )


class TestScoreWithFindings(unittest.TestCase):
    """Score with findings should reduce scores."""

    def test_critical_ssl_finding(self):
        scorer = EngineeringScorer()
        findings = [
            {
                "severity": "critical",
                "category": "ssl",
                "title": "SSL is broken",
                "description": "TLS 1.0 in use",
            }
        ]
        report = scorer.score("example.com", findings)
        # security and reliability should be penalised
        self.assertLess(report.dimensions["security"].score, 100.0)
        self.assertLess(report.dimensions["reliability"].score, 100.0)
        self.assertLess(report.overall_score, 100.0)

    def test_info_finding_small_penalty(self):
        scorer = EngineeringScorer()
        findings = [
            {"severity": "info", "category": "best_practice", "title": "Tip"}
        ]
        report = scorer.score("example.com", findings)
        # Penalty should be small
        self.assertGreater(report.overall_score, 95.0)

    def test_multiple_critical_findings(self):
        scorer = EngineeringScorer()
        findings = [
            {"severity": "critical", "category": "injection", "title": "SQLi"},
            {"severity": "critical", "category": "injection", "title": "CMDi"},
            {"severity": "critical", "category": "auth", "title": "Bypass"},
            {"severity": "critical", "category": "ssl", "title": "TLS"},
            {"severity": "critical", "category": "secrets", "title": "Key leak"},
            {"severity": "critical", "category": "xss", "title": "XSS"},
        ]
        report = scorer.score("example.com", findings)
        self.assertLess(report.overall_score, 80.0)
        self.assertIn(report.grade, ("B", "C", "D", "F"))

    def test_finding_count_tracked(self):
        scorer = EngineeringScorer()
        findings = [
            {"severity": "medium", "category": "ssl", "title": f"Issue {i}"}
            for i in range(5)
        ]
        report = scorer.score("example.com", findings)
        self.assertEqual(report.total_findings, 5)
        self.assertGreater(report.dimensions["security"].findings_count, 0)

    def test_unknown_category_heuristic(self):
        scorer = EngineeringScorer()
        findings = [
            {"severity": "high", "category": "unknown_cat", "title": "Strange issue"}
        ]
        report = scorer.score("example.com", findings)
        # Heuristic should still affect some dimensions
        self.assertLess(report.overall_score, 100.0)


class TestAllDimensionsPresent(unittest.TestCase):
    """All 8 dimensions must be present in the result."""

    def test_all_dimensions(self):
        scorer = EngineeringScorer()
        report = scorer.score("t.com", [])
        expected = set(_DIMENSION_WEIGHTS.keys())
        actual = set(report.dimensions.keys())
        self.assertEqual(expected, actual)

    def test_dimension_weights_sum_to_one(self):
        total = sum(_DIMENSION_WEIGHTS.values())
        self.assertAlmostEqual(total, 1.0, places=2)


class TestRecommendations(unittest.TestCase):
    """Dimensions below threshold should get recommendations."""

    def test_low_score_generates_recommendations(self):
        scorer = EngineeringScorer()
        # Create enough critical findings to drop security below 70
        findings = [
            {"severity": "critical", "category": "injection", "title": f"Issue {i}"}
            for i in range(10)
        ]
        report = scorer.score("example.com", findings)
        # Security should be low enough for recommendations
        if report.dimensions["security"].score < 70:
            self.assertGreater(len(report.dimensions["security"].recommendations), 0)

    def test_high_score_no_recommendations(self):
        scorer = EngineeringScorer()
        report = scorer.score("example.com", [])
        for dim in report.dimensions.values():
            self.assertEqual(dim.recommendations, [])


class TestGuessDimensions(unittest.TestCase):
    """Tests for the heuristic dimension guesser."""

    def test_ssl_keywords(self):
        dims = EngineeringScorer._guess_dimensions(
            {"title": "TLS certificate expired", "description": ""}
        )
        self.assertIn("security", dims)
        self.assertIn("reliability", dims)

    def test_header_keywords(self):
        dims = EngineeringScorer._guess_dimensions(
            {"title": "CSP header missing", "description": ""}
        )
        self.assertIn("security", dims)

    def test_slow_keyword(self):
        dims = EngineeringScorer._guess_dimensions(
            {"title": "Slow response time", "description": ""}
        )
        self.assertIn("performance", dims)

    def test_fallback_security(self):
        dims = EngineeringScorer._guess_dimensions(
            {"title": "Random issue", "description": "Something weird"}
        )
        self.assertIn("security", dims)

    def test_no_duplicates(self):
        dims = EngineeringScorer._guess_dimensions(
            {"title": "SSL auth issue", "description": "Auth TLS security"}
        )
        self.assertEqual(len(dims), len(set(dims)))


class TestPointsDeductedScaling(unittest.TestCase):
    """Penalty scaling based on points_deducted."""

    def test_scaled_penalty(self):
        scorer = EngineeringScorer()
        # points_deducted=50 should double the penalty
        findings = [
            {"severity": "high", "category": "ssl", "title": "T", "points_deducted": 50}
        ]
        report = scorer.score("t.com", findings)
        # With 2x penalty of 15.0 = 30.0 deduction
        self.assertLess(report.dimensions["security"].score, 75.0)


if __name__ == "__main__":
    unittest.main()
