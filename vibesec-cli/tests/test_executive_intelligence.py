"""Tests for the Executive Intelligence module (Council Eta - Age V)."""

import unittest
from unittest.mock import MagicMock

from reconpro.executive_intelligence import (
    RiskMatrixEntry,
    ExecutiveReport,
    ExecutiveIntelligence,
)


# ── Helpers ────────────────────────────────────────────────────────────

def _minimal_scan_data():
    return {
        "target": "example.com",
        "findings": [],
        "modules_run": ["recon"],
        "severity_counts": {},
        "total_score": 90,
        "grade": "A",
        "total_findings": 0,
    }


def _full_scan_data():
    return {
        "target": "example.com",
        "findings": [
            {"title": "SQL Injection", "severity": "critical", "category": "injection",
             "description": "SQLi found on /login", "evidence": "' OR 1=1--"},
            {"title": "Missing HSTS", "severity": "medium", "category": "headers",
             "description": "HSTS header not set", "evidence": "no strict-transport"},
            {"title": "XSS Reflected", "severity": "high", "category": "xss",
             "description": "Reflected XSS on search", "evidence": "<script>alert(1)</script>"},
            {"title": "Info Disclosure", "severity": "low", "category": "info_disclosure",
             "description": "Server version leaked", "evidence": "Server: Apache/2.4"},
            {"title": "Weak TLS", "severity": "medium", "category": "ssl",
             "description": "TLS 1.0 supported", "evidence": "TLSv1.0"},
        ],
        "modules_run": ["recon", "auth", "chain"],
        "severity_counts": {"critical": 1, "high": 1, "medium": 2, "low": 1},
        "total_score": 55,
        "grade": "D",
        "total_findings": 5,
    }


def _mock_intelligence_report():
    mock = MagicMock()
    mock.to_dict.return_value = {
        "confidence_scores": [
            {"title": "SQL Injection", "confidence": 0.95},
            {"title": "XSS Reflected", "confidence": 0.8},
        ],
        "engineering_report": {
            "overall_score": 55, "grade": "D", "dimensions": {
                "injection": {"score": 20, "findings_count": 1},
                "headers": {"score": 60, "findings_count": 2},
            },
        },
    }
    return mock


def _mock_correlation_result():
    mock = MagicMock()
    mock.to_dict.return_value = {
        "chains": [
            {"title": "SQL Injection", "severity": "critical", "sources": ["auth", "chain"],
             "confidence": 0.95, "summary": "Corroborated SQLi"},
        ],
    }
    return mock


class TestGenerateMinimal(unittest.TestCase):
    """generate() with minimal scan data."""

    def test_generate_returns_executive_report(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_minimal_scan_data())
        self.assertIsInstance(report, ExecutiveReport)

    def test_generate_minimal_target(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_minimal_scan_data())
        self.assertEqual(report.target, "example.com")

    def test_generate_minimal_timestamp(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_minimal_scan_data())
        self.assertIsNotNone(report.timestamp)
        self.assertGreater(len(report.timestamp), 0)

    def test_generate_minimal_empty_findings(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_minimal_scan_data())
        self.assertEqual(len(report.top_findings), 0)
        self.assertEqual(len(report.risk_matrix), 0)
        self.assertEqual(len(report.remediation_plan), 0)


class TestGenerateFull(unittest.TestCase):
    """generate() with full data + intelligence + correlation."""

    def test_generate_full_report(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(
            _full_scan_data(),
            intelligence_report=_mock_intelligence_report(),
            correlation_result=_mock_correlation_result(),
        )
        self.assertIsInstance(report, ExecutiveReport)
        self.assertEqual(report.target, "example.com")

    def test_full_report_has_evidence_chains(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(
            _full_scan_data(),
            intelligence_report=_mock_intelligence_report(),
            correlation_result=_mock_correlation_result(),
        )
        self.assertGreater(len(report.evidence_chains), 0)

    def test_full_report_has_engineering_data(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(
            _full_scan_data(),
            intelligence_report=_mock_intelligence_report(),
        )
        eng = report.engineering_report
        self.assertIn("overall_score", eng)
        self.assertEqual(eng["overall_score"], 55)

    def test_full_report_risk_matrix_uses_confidence(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(
            _full_scan_data(),
            intelligence_report=_mock_intelligence_report(),
        )
        # SQL Injection should have high likelihood from confidence_scores.
        sqli_entry = next((e for e in report.risk_matrix if e["finding_title"] == "SQL Injection"), None)
        self.assertIsNotNone(sqli_entry)
        self.assertGreater(sqli_entry["likelihood"], 0.8)


class TestBuildSummary(unittest.TestCase):
    """_build_summary() produces non-empty text."""

    def test_summary_not_empty(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        self.assertTrue(len(report.executive_summary) > 50)

    def test_summary_contains_target(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        self.assertIn("example.com", report.executive_summary)

    def test_summary_contains_score(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        self.assertIn("55", report.executive_summary)

    def test_summary_multiple_paragraphs(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        paragraphs = [p for p in report.executive_summary.split("\n\n") if p.strip()]
        self.assertGreaterEqual(len(paragraphs), 2)

    def test_summary_empty_findings_says_no_vulnerabilities(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_minimal_scan_data())
        self.assertIn("No vulnerabilities were detected", report.executive_summary)


class TestBuildRiskMatrix(unittest.TestCase):
    """_build_risk_matrix() correct sorting and fields."""

    def test_risk_matrix_sorted_by_score(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        scores = [e["risk_score"] for e in report.risk_matrix]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_risk_matrix_entries_have_required_fields(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        for entry in report.risk_matrix:
            self.assertIn("finding_title", entry)
            self.assertIn("severity", entry)
            self.assertIn("likelihood", entry)
            self.assertIn("impact", entry)
            self.assertIn("risk_score", entry)
            self.assertIn("recommendation", entry)

    def test_risk_matrix_critical_higher_than_low(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        if len(report.risk_matrix) >= 2:
            first = report.risk_matrix[0]["risk_score"]
            last = report.risk_matrix[-1]["risk_score"]
            self.assertGreaterEqual(first, last)


class TestBuildRemediationPlan(unittest.TestCase):
    """_build_remediation_plan() groups by category."""

    def test_remediation_groups_by_category(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        categories = [r["category"] for r in report.remediation_plan]
        self.assertEqual(len(categories), len(set(categories)))

    def test_remediation_sorted_by_severity(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        sevs = [sev_order.get(r["severity"], 4) for r in report.remediation_plan]
        self.assertEqual(sevs, sorted(sevs))

    def test_remediation_has_steps(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        for item in report.remediation_plan:
            self.assertGreater(len(item["steps"]), 0)

    def test_remediation_empty_findings(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_minimal_scan_data())
        self.assertEqual(len(report.remediation_plan), 0)


class TestPrioritizeFindings(unittest.TestCase):
    """_prioritize_findings() ranking logic."""

    def test_top_10_limit(self):
        ei = ExecutiveIntelligence()
        # 15 findings — only top 10 should be returned.
        data = _minimal_scan_data()
        data["findings"] = [
            {"title": f"Issue {i}", "severity": "high", "category": "injection"}
            for i in range(15)
        ]
        data["total_findings"] = 15
        report = ei.generate(data)
        self.assertLessEqual(len(report.top_findings), 10)

    def test_critical_ranks_above_low(self):
        ei = ExecutiveIntelligence()
        data = _minimal_scan_data()
        data["findings"] = [
            {"title": "Low Issue", "severity": "low", "category": "info_disclosure"},
            {"title": "Critical Issue", "severity": "critical", "category": "injection"},
        ]
        data["total_findings"] = 2
        report = ei.generate(data)
        self.assertEqual(report.top_findings[0]["title"], "Critical Issue")

    def test_findings_have_priority_score(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        for f in report.top_findings:
            self.assertIn("priority_score", f)
            self.assertGreaterEqual(f["priority_score"], 0)


class TestToMarkdown(unittest.TestCase):
    """to_markdown() output format."""

    def test_markdown_starts_with_heading(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        md = report.to_markdown()
        self.assertTrue(md.startswith("# Executive Intelligence Report"))

    def test_markdown_contains_target(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        md = report.to_markdown()
        self.assertIn("example.com", md)

    def test_markdown_contains_sections(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        md = report.to_markdown()
        self.assertIn("## Executive Summary", md)
        self.assertIn("## Risk Matrix", md)
        self.assertIn("## Top Findings", md)
        self.assertIn("## Remediation Plan", md)


class TestToDict(unittest.TestCase):
    """to_dict() output completeness."""

    def test_to_dict_all_keys_present(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        d = report.to_dict()
        expected_keys = [
            "target", "timestamp", "scan_summary", "executive_summary",
            "risk_matrix", "attack_timeline", "top_findings", "remediation_plan",
            "engineering_report", "evidence_chains", "machine_json",
        ]
        for key in expected_keys:
            self.assertIn(key, d, f"Missing key: {key}")

    def test_to_dict_machine_json_has_meta(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_full_scan_data())
        d = report.to_dict()
        self.assertIn("meta", d["machine_json"])
        self.assertEqual(d["machine_json"]["meta"]["generator"], "ReconPro ExecutiveIntelligence")


class TestWithEmptyFindings(unittest.TestCase):
    """Full pipeline with zero findings should not crash."""

    def test_empty_findings_all_sections_valid(self):
        ei = ExecutiveIntelligence()
        report = ei.generate(_minimal_scan_data())
        # All sections should be lists/dicts, not None.
        self.assertIsInstance(report.risk_matrix, list)
        self.assertIsInstance(report.attack_timeline, list)
        self.assertIsInstance(report.top_findings, list)
        self.assertIsInstance(report.remediation_plan, list)
        self.assertIsInstance(report.evidence_chains, list)
        self.assertIsInstance(report.machine_json, dict)
        # to_dict and to_markdown should not crash.
        self.assertIsInstance(report.to_dict(), dict)
        self.assertIsInstance(report.to_markdown(), str)


class TestRiskMatrixEntryToDict(unittest.TestCase):
    """RiskMatrixEntry.to_dict() serialisation."""

    def test_to_dict_rounds_values(self):
        entry = RiskMatrixEntry(
            finding_title="XSS", severity="high", likelihood=0.75,
            impact=0.8, risk_score=0.6, category="XSS",
            recommendation="Encode output",
        )
        d = entry.to_dict()
        self.assertEqual(d["finding_title"], "XSS")
        self.assertEqual(d["severity"], "high")
        self.assertIn("recommendation", d)


if __name__ == "__main__":
    unittest.main()
