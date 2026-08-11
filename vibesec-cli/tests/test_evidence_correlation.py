"""Tests for the Evidence Correlation module (Council Eta - Age V)."""

import unittest

from reconpro.evidence_correlation import (
    EvidenceCorrelator,
    EvidenceChain,
    CorrelationResult,
    _normalise_severity,
    _extract_base_domain,
)


# ── Helpers ────────────────────────────────────────────────────────────

def _make_finding(title, category="injection", target="example.com",
                   module="auth", severity="high", evidence=""):
    return {
        "title": title, "category": category, "target": target,
        "module": module, "severity": severity, "evidence": evidence,
    }


class TestCorrelateEmpty(unittest.TestCase):
    """Correlate with empty or missing findings."""

    def test_correlate_empty_list(self):
        ec = EvidenceCorrelator()
        result = ec.correlate([])
        self.assertIsInstance(result, CorrelationResult)
        self.assertEqual(len(result.chains), 0)
        self.assertEqual(result.deduplicated_count, 0)
        self.assertEqual(result.processing_time_ms, 0.0)

    def test_correlate_none_input(self):
        ec = EvidenceCorrelator()
        result = ec.correlate(None)
        self.assertEqual(len(result.chains), 0)

    def test_correlate_non_list_input(self):
        ec = EvidenceCorrelator()
        result = ec.correlate("not a list")
        self.assertEqual(len(result.chains), 0)


class TestCorrelateSingle(unittest.TestCase):
    """Single finding should produce exactly one chain with no corroboration."""

    def test_single_finding_one_chain(self):
        ec = EvidenceCorrelator()
        f = _make_finding("XSS Vulnerability", "injection", "example.com", "auth", "high")
        result = ec.correlate([f])
        self.assertEqual(len(result.chains), 1)
        self.assertEqual(result.deduplicated_count, 0)
        chain = result.chains[0]
        self.assertEqual(len(chain.corroborating_findings), 0)
        self.assertEqual(chain.severity, "high")
        self.assertIn("auth", chain.source_modules)


class TestCorrelateDuplicates(unittest.TestCase):
    """Duplicate findings (same fingerprint) should be grouped and deduplicated."""

    def test_two_identical_fingerprint_grouped(self):
        ec = EvidenceCorrelator()
        f1 = _make_finding("SQL Injection", "injection", "example.com", "auth", "high")
        f2 = _make_finding("SQL Injection", "injection", "example.com", "chain", "medium")
        result = ec.correlate([f1, f2])
        self.assertEqual(len(result.chains), 1)
        self.assertEqual(result.deduplicated_count, 1)
        chain = result.chains[0]
        self.assertEqual(len(chain.corroborating_findings), 1)
        self.assertIn("auth", chain.source_modules)
        self.assertIn("chain", chain.source_modules)

    def test_three_identical_grouped(self):
        ec = EvidenceCorrelator()
        findings = [
            _make_finding("Info Leak", "info_disclosure", "example.com", f"mod{i}", "medium")
            for i in range(3)
        ]
        result = ec.correlate(findings)
        self.assertEqual(len(result.chains), 1)
        self.assertEqual(result.deduplicated_count, 2)


class TestCorrelateDifferentFindings(unittest.TestCase):
    """Findings with different fingerprints should not be grouped together."""

    def test_different_titles_no_grouping(self):
        ec = EvidenceCorrelator()
        f1 = _make_finding("XSS", "injection", "example.com")
        f2 = _make_finding("CSRF", "auth", "example.com")
        result = ec.correlate([f1, f2])
        self.assertEqual(len(result.chains), 2)
        self.assertEqual(result.deduplicated_count, 0)

    def test_different_targets_no_grouping(self):
        ec = EvidenceCorrelator()
        f1 = _make_finding("XSS", "injection", "a.com")
        f2 = _make_finding("XSS", "injection", "b.com")
        result = ec.correlate([f1, f2])
        self.assertEqual(len(result.chains), 2)

    def test_different_categories_no_grouping(self):
        ec = EvidenceCorrelator()
        f1 = _make_finding("XSS", "injection", "example.com")
        f2 = _make_finding("XSS", "headers", "example.com")
        result = ec.correlate([f1, f2])
        self.assertEqual(len(result.chains), 2)


class TestConfidenceBoost(unittest.TestCase):
    """Confidence should increase with corroboration count."""

    def test_single_finding_no_boost(self):
        ec = EvidenceCorrelator()
        f = _make_finding("XSS", "injection", "example.com", "auth", "high")
        result = ec.correlate([f])
        # Single finding: no corroboration boost.
        self.assertEqual(result.confidence_boosted, 0)
        self.assertGreater(result.chains[0].confidence, 0)

    def test_corroborated_boost_higher_than_single(self):
        ec = EvidenceCorrelator()
        f1 = _make_finding("XSS", "injection", "example.com", "auth", "high")
        f2 = _make_finding("XSS", "injection", "example.com", "chain", "high")
        # Get base confidence from single finding.
        single_result = ec.correlate([f1])
        single_conf = single_result.chains[0].confidence
        # Corroborated should be higher.
        double_result = ec.correlate([f1, f2])
        self.assertGreater(double_result.chains[0].confidence, single_conf)
        self.assertEqual(double_result.confidence_boosted, 1)

    def test_confidence_capped_at_one(self):
        ec = EvidenceCorrelator()
        findings = [
            _make_finding("Bug", "injection", "example.com", f"mod{i}", "high")
            for i in range(10)
        ]
        for f in findings:
            f["confidence"] = 0.9
        result = ec.correlate(findings)
        self.assertLessEqual(result.chains[0].confidence, 1.0)


class TestSeverityUpgrade(unittest.TestCase):
    """Medium findings corroborated by 3+ modules should upgrade to high."""

    def test_three_modules_upgrades_medium_to_high(self):
        ec = EvidenceCorrelator()
        findings = [
            _make_finding("Misconfiguration", "misconfiguration", "example.com", f"mod{i}", "medium")
            for i in range(3)
        ]
        result = ec.correlate(findings)
        self.assertEqual(len(result.severity_upgrades), 1)
        self.assertEqual(result.chains[0].severity, "high")
        upgrade = result.severity_upgrades[0]
        self.assertEqual(upgrade["upgraded_severity"], "high")
        self.assertEqual(upgrade["original_severity"], "medium")

    def test_two_modules_no_upgrade(self):
        ec = EvidenceCorrelator()
        findings = [
            _make_finding("Misconfiguration", "misconfiguration", "example.com", f"mod{i}", "medium")
            for i in range(2)
        ]
        result = ec.correlate(findings)
        self.assertEqual(len(result.severity_upgrades), 0)
        self.assertEqual(result.chains[0].severity, "medium")


class TestAttackPathBuilding(unittest.TestCase):
    """Chains sharing the same domain should get linked attack paths."""

    def test_same_domain_gets_attack_path(self):
        ec = EvidenceCorrelator()
        f1 = _make_finding("Info Leak", "info_disclosure", "api.example.com", "recon", "low")
        f2 = _make_finding("Auth Bypass", "auth", "api.example.com", "auth", "critical")
        result = ec.correlate([f1, f2])
        # Both chains should have an attack_path since they share the domain.
        paths_with_data = [c for c in result.chains if c.attack_path]
        self.assertGreaterEqual(len(paths_with_data), 1)

    def test_single_chain_no_attack_path(self):
        ec = EvidenceCorrelator()
        f = _make_finding("XSS", "injection", "example.com")
        result = ec.correlate([f])
        # A single chain has no peers to link with.
        # (Cross-reference won't trigger since there's only one.)
        self.assertIsNone(result.chains[0].attack_path)


class TestFingerprintDeterminism(unittest.TestCase):
    """Same finding should always produce the same fingerprint."""

    def test_fingerprint_is_deterministic(self):
        fp1 = EvidenceCorrelator._fingerprint(_make_finding("XSS", "injection", "example.com"))
        fp2 = EvidenceCorrelator._fingerprint(_make_finding("XSS", "injection", "example.com"))
        self.assertEqual(fp1, fp2)

    def test_different_findings_different_fingerprints(self):
        fp1 = EvidenceCorrelator._fingerprint(_make_finding("XSS", "injection", "example.com"))
        fp2 = EvidenceCorrelator._fingerprint(_make_finding("CSRF", "auth", "example.com"))
        self.assertNotEqual(fp1, fp2)

    def test_fingerprint_is_hex_string(self):
        fp = EvidenceCorrelator._fingerprint(_make_finding("Test", "test", "x"))
        self.assertTrue(all(c in "0123456789abcdef" for c in fp))


class TestMalformedFindings(unittest.TestCase):
    """Malformed findings should be handled gracefully."""

    def test_none_entries_skipped(self):
        ec = EvidenceCorrelator()
        f = _make_finding("Valid", "injection")
        result = ec.correlate([None, None, f])
        self.assertEqual(len(result.chains), 1)

    def test_non_dict_entries_skipped(self):
        ec = EvidenceCorrelator()
        f = _make_finding("Valid", "injection")
        result = ec.correlate(["string", 42, f])
        self.assertEqual(len(result.chains), 1)

    def test_finding_without_title_skipped(self):
        ec = EvidenceCorrelator()
        result = ec.correlate([{"category": "test"}, {"title": "", "category": "x"}])
        self.assertEqual(len(result.chains), 0)


class TestCorrelationResultToDict(unittest.TestCase):
    """CorrelationResult.to_dict() serialisation."""

    def test_to_dict_keys(self):
        result = CorrelationResult(
            chains=[EvidenceChain(chain_id="c1", primary_finding={"title": "XSS"})],
            deduplicated_count=3,
            confidence_boosted=2,
            severity_upgrades=[{"chain_id": "c1", "upgraded_severity": "high"}],
            processing_time_ms=12.5,
        )
        d = result.to_dict()
        self.assertIn("chains", d)
        self.assertIn("deduplicated_count", d)
        self.assertIn("confidence_boosted", d)
        self.assertIn("severity_upgrades", d)
        self.assertIn("processing_time_ms", d)
        self.assertIn("total_chains", d)
        self.assertEqual(d["total_chains"], 1)
        self.assertEqual(d["deduplicated_count"], 3)


class TestSeverityNormalisation(unittest.TestCase):
    """Test the _normalise_severity helper."""

    def test_valid_severities(self):
        for sev in ("critical", "high", "medium", "low", "info"):
            self.assertEqual(_normalise_severity(sev), sev)

    def test_none_defaults_to_info(self):
        self.assertEqual(_normalise_severity(None), "info")

    def test_unknown_defaults_to_info(self):
        self.assertEqual(_normalise_severity("critical_high"), "info")


class TestDomainExtraction(unittest.TestCase):
    """Test the _extract_base_domain helper."""

    def test_strip_scheme(self):
        self.assertEqual(_extract_base_domain("https://example.com/path"), "example.com")

    def test_strip_port(self):
        self.assertEqual(_extract_base_domain("example.com:8080"), "example.com")

    def test_plain_domain(self):
        self.assertEqual(_extract_base_domain("api.example.com"), "api.example.com")

    def test_empty_string(self):
        self.assertEqual(_extract_base_domain(""), "")


if __name__ == "__main__":
    unittest.main()
