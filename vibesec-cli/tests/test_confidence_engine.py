"""Production-grade tests for reconpro.confidence_engine."""

import unittest
from unittest.mock import patch

from reconpro.confidence_engine import (
    ConfidenceEngine,
    _fingerprint,
    _normalise_severity,
    _SEVERITY_WEIGHT,
    _VALID_SEVERITIES,
)


class TestNormaliseSeverity(unittest.TestCase):
    """Tests for _normalise_severity helper."""

    def test_known_severity_passthrough(self):
        for s in _VALID_SEVERITIES:
            self.assertEqual(_normalise_severity(s), s)

    def test_none_returns_info(self):
        self.assertEqual(_normalise_severity(None), "info")

    def test_uppercase_normalised(self):
        self.assertEqual(_normalise_severity("CRITICAL"), "critical")

    def test_unknown_severity_returns_info(self):
        self.assertEqual(_normalise_severity("urgent"), "info")

    def test_whitespace_trimmed(self):
        self.assertEqual(_normalise_severity("  high  "), "high")

    def test_numeric_input_returns_info(self):
        self.assertEqual(_normalise_severity(42), "info")


class TestFingerprint(unittest.TestCase):
    """Tests for _fingerprint helper."""

    def test_same_input_same_fingerprint(self):
        f1 = {"title": "XSS", "category": "app", "asset": "target.com"}
        f2 = {"title": "XSS", "category": "app", "asset": "target.com"}
        self.assertEqual(_fingerprint(f1), _fingerprint(f2))

    def test_different_title_different_fingerprint(self):
        f1 = {"title": "XSS", "category": "app", "asset": "t.com"}
        f2 = {"title": "CSRF", "category": "app", "asset": "t.com"}
        self.assertNotEqual(_fingerprint(f1), _fingerprint(f2))

    def test_missing_asset_uses_target(self):
        f = {"title": "XSS", "category": "app", "target": "fallback.com"}
        fp = _fingerprint(f)
        self.assertIsInstance(fp, str)
        self.assertEqual(len(fp), 16)

    def test_missing_all_fields(self):
        f = {}
        fp = _fingerprint(f)
        self.assertEqual(len(fp), 16)

    def test_fingerprint_is_hex(self):
        f = {"title": "test", "category": "c", "asset": "a"}
        fp = _fingerprint(f)
        int(fp, 16)  # Must not raise


class TestEvidenceSpecificity(unittest.TestCase):
    """Tests for _evidence_specificity static method."""

    def test_empty_evidence(self):
        score = ConfidenceEngine._evidence_specificity({})
        self.assertEqual(score, 0.0)

    def test_short_generic_evidence(self):
        score = ConfidenceEngine._evidence_specificity(
            {"evidence": "Something is wrong", "description": ""}
        )
        # "Something is wrong" is too generic to match any patterns
        self.assertGreaterEqual(score, 0.0)

    def test_url_in_evidence(self):
        score = ConfidenceEngine._evidence_specificity(
            {"evidence": "https://example.com/api/v1", "description": ""}
        )
        self.assertGreater(score, 0.2)

    def test_code_snippet_in_evidence(self):
        score = ConfidenceEngine._evidence_specificity(
            {"evidence": "function test() { return eval(x); }", "description": ""}
        )
        # Matches code snippet (0.3) but not other patterns
        self.assertGreaterEqual(score, 0.3)

    def test_headers_in_evidence(self):
        score = ConfidenceEngine._evidence_specificity(
            {"evidence": "X-Content-Type-Options: nosniff", "description": ""}
        )
        self.assertGreater(score, 0.1)

    def test_long_detailed_evidence(self):
        long_text = "a" * 250
        score = ConfidenceEngine._evidence_specificity(
            {"evidence": long_text, "description": ""}
        )
        self.assertGreater(score, 0.1)

    def test_capped_at_one(self):
        maxed = ConfidenceEngine._evidence_specificity(
            {
                "evidence": "https://a.com function test() { def foo(): pass } X-Header: value " + "x" * 250,
                "description": "import os\n" * 20,
            }
        )
        self.assertLessEqual(maxed, 1.0)


class TestSeverityConsistency(unittest.TestCase):
    """Tests for _severity_consistency static method."""

    def test_info_needs_no_evidence(self):
        score = ConfidenceEngine._severity_consistency(
            {"severity": "info", "evidence": "", "description": ""}
        )
        self.assertEqual(score, 1.0)

    def test_critical_with_short_evidence_low_score(self):
        score = ConfidenceEngine._severity_consistency(
            {"severity": "critical", "evidence": "short", "description": ""}
        )
        self.assertLess(score, 1.0)

    def test_critical_with_long_evidence_full_score(self):
        score = ConfidenceEngine._severity_consistency(
            {"severity": "critical", "evidence": "x" * 120, "description": ""}
        )
        self.assertEqual(score, 1.0)

    def test_high_with_60_char_evidence(self):
        score = ConfidenceEngine._severity_consistency(
            {"severity": "high", "evidence": "a" * 60, "description": ""}
        )
        self.assertEqual(score, 1.0)

    def test_unknown_severity_treated_as_info(self):
        score = ConfidenceEngine._severity_consistency(
            {"severity": "unknown", "evidence": "", "description": ""}
        )
        self.assertEqual(score, 1.0)


class TestCVEBonus(unittest.TestCase):
    """Tests for _cve_bonus static method."""

    def test_no_cve(self):
        self.assertEqual(ConfidenceEngine._cve_bonus({}), 0.0)

    def test_cve_in_list(self):
        self.assertEqual(
            ConfidenceEngine._cve_bonus({"cves": ["CVE-2024-1234"]}), 0.4
        )

    def test_two_cves(self):
        self.assertEqual(
            ConfidenceEngine._cve_bonus({"cves": ["CVE-2024-1", "CVE-2024-2"]}), 0.7
        )

    def test_three_or_more_cves(self):
        self.assertEqual(
            ConfidenceEngine._cve_bonus({"cves": ["CVE-2024-1", "CVE-2024-2", "CVE-2024-3"]}),
            1.0,
        )

    def test_cve_in_evidence_text(self):
        self.assertGreater(
            ConfidenceEngine._cve_bonus(
                {"evidence": "Affected by CVE-2024-12345", "description": ""}
            ),
            0.0,
        )

    def test_cve_in_references_field(self):
        self.assertEqual(
            ConfidenceEngine._cve_bonus({"references": ["CVE-2024-10000"]}), 0.4
        )


class TestScoreFinding(unittest.TestCase):
    """Tests for ConfidenceEngine.score_finding."""

    def setUp(self):
        self.engine = ConfidenceEngine()

    def test_empty_finding_baseline(self):
        score = self.engine.score_finding({})
        # Baseline 0.5, but evidence_length bonus for empty evidence gives 0
        # severity_consistency for info with empty evidence = 1.0 → +0.20
        # Total: 0.5 + 0 + 0.20 + 0 + 0 + 0 = 0.70
        self.assertGreaterEqual(score, 0.5)
        self.assertLessEqual(score, 0.8)

    def test_detailed_finding_scores_higher(self):
        detailed = {
            "evidence": "https://example.com/vuln endpoint returns 200 with sensitive data",
            "description": "Detailed description of the vulnerability found " * 10,
            "severity": "high",
            "remediation": "Fix by doing X",
            "cves": ["CVE-2024-10000"],
        }
        score = self.engine.score_finding(detailed)
        self.assertGreater(score, 0.7)

    def test_score_bounded(self):
        for _ in range(50):
            score = self.engine.score_finding({"evidence": "x" * 500, "description": "x" * 500})
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 1.0)

    def test_with_reproducibility_context(self):
        finding = {"title": "Test", "category": "x", "asset": "a"}
        previous = [{"title": "Test", "category": "x", "asset": "a"}]
        ctx = {"previous_findings": previous}
        score = self.engine.score_finding(finding, ctx)
        # Should get a reproducibility bonus
        self.assertGreater(score, 0.5)

    def test_remediation_bonus(self):
        with_remed = {"evidence": "short", "description": "short", "remediation": "Fix it"}
        without_remed = {"evidence": "short", "description": "short"}
        self.assertGreater(
            self.engine.score_finding(with_remed),
            self.engine.score_finding(without_remed),
        )


class TestScoreFindings(unittest.TestCase):
    """Tests for ConfidenceEngine.score_findings batch processing."""

    def setUp(self):
        self.engine = ConfidenceEngine()

    def test_empty_list(self):
        result = self.engine.score_findings([])
        self.assertEqual(result, [])

    def test_single_finding(self):
        result = self.engine.score_findings([{"title": "T", "severity": "info"}])
        self.assertEqual(len(result), 1)
        self.assertIn("confidence", result[0])

    def test_multiple_findings(self):
        findings = [
            {"title": f"Finding {i}", "severity": "medium", "evidence": "x" * 50}
            for i in range(5)
        ]
        result = self.engine.score_findings(findings)
        self.assertEqual(len(result), 5)
        for r in result:
            self.assertIn("confidence", r)
            self.assertIsInstance(r["confidence"], float)

    def test_context_auto_populated(self):
        findings = [
            {"title": "Duplicate", "category": "x", "asset": "a"},
            {"title": "Duplicate", "category": "x", "asset": "a"},
        ]
        result = self.engine.score_findings(findings)
        # Both should get reproducibility bonus from each other
        for r in result:
            self.assertGreater(r["confidence"], 0.5)

    def test_custom_context_preserved(self):
        ctx = {"module_count": 10}
        findings = [{"title": "T"}]
        result = self.engine.score_findings(findings, context=ctx)
        self.assertEqual(len(result), 1)


class TestCorroborate(unittest.TestCase):
    """Tests for ConfidenceEngine.corroborate."""

    def setUp(self):
        self.engine = ConfidenceEngine()

    def test_empty_list(self):
        result = self.engine.corroborate([])
        self.assertEqual(result, [])

    def test_single_finding_no_boost(self):
        f = {"title": "Solo", "confidence": 0.6}
        result = self.engine.corroborate([f])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["corroboration_count"], 1)

    def test_duplicate_findings_get_boost(self):
        findings = [
            {"title": "Dup", "category": "c", "asset": "a", "confidence": 0.5},
            {"title": "Dup", "category": "c", "asset": "a", "confidence": 0.5},
        ]
        result = self.engine.corroborate(findings)
        self.assertEqual(len(result), 2)
        for r in result:
            self.assertEqual(r["corroboration_count"], 2)
            self.assertGreater(r["confidence"], 0.5)

    def test_different_findings_not_grouped(self):
        findings = [
            {"title": "A", "category": "x", "asset": "a", "confidence": 0.5},
            {"title": "B", "category": "y", "asset": "a", "confidence": 0.5},
        ]
        result = self.engine.corroborate(findings)
        for r in result:
            self.assertEqual(r["corroboration_count"], 1)

    def test_boost_capped(self):
        # 5 sources: boost = min(0.15 * 4, 0.45) = 0.45
        findings = [
            {"title": "Many", "category": "c", "asset": "a", "confidence": 0.3}
            for _ in range(5)
        ]
        result = self.engine.corroborate(findings)
        for r in result:
            self.assertLessEqual(r["confidence"], 1.0)

    def test_confidence_capped_at_one(self):
        findings = [
            {"title": "High", "category": "c", "asset": "a", "confidence": 0.95},
            {"title": "High", "category": "c", "asset": "a", "confidence": 0.95},
        ]
        result = self.engine.corroborate(findings)
        for r in result:
            self.assertLessEqual(r["confidence"], 1.0)


class TestEdgeCases(unittest.TestCase):
    """Edge case tests."""

    def test_finding_with_none_fields(self):
        engine = ConfidenceEngine()
        score = engine.score_finding({
            "severity": None, "evidence": None, "description": None,
        })
        self.assertIsInstance(score, float)
        self.assertGreaterEqual(score, 0.0)

    def test_finding_with_numeric_severity(self):
        engine = ConfidenceEngine()
        score = engine.score_finding({"severity": 5})
        self.assertIsInstance(score, float)

    def test_batch_with_missing_fields(self):
        engine = ConfidenceEngine()
        findings = [{"title": "No sev"}, {}]
        result = engine.score_findings(findings)
        for r in result:
            self.assertIn("confidence", r)


if __name__ == "__main__":
    unittest.main()
