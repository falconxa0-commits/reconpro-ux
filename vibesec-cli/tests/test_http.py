"""Tests for http module."""
import unittest
from unittest.mock import patch, MagicMock
from reconpro.http import Finding, RateLimiter, compute_grade, badge_markdown, GRADE_MAP


class TestFinding(unittest.TestCase):
    def test_creation_with_required_fields(self):
        """Finding should create with all required fields."""
        f = Finding(
            title="Open Port",
            severity="high",
            category="network",
            module="recon",
            description="Port 80 is open",
            evidence="nmap -p 80",
            asset="example.com",
        )
        self.assertEqual(f.title, "Open Port")
        self.assertEqual(f.severity, "high")
        self.assertEqual(f.points_deducted, 0)  # default

    def test_creation_with_optional_fields(self):
        """Finding should accept optional fields."""
        f = Finding(
            title="XSS",
            severity="critical",
            category="injection",
            module="xss",
            description="Reflected XSS",
            evidence="<script>",
            asset="example.com",
            points_deducted=15,
            remediation="Escape output",
            dread_score=8.5,
        )
        self.assertEqual(f.points_deducted, 15)
        self.assertEqual(f.dread_score, 8.5)
        self.assertEqual(f.remediation, "Escape output")

    def test_to_dict(self):
        """to_dict should return all fields."""
        f = Finding(
            title="SSL",
            severity="medium",
            category="tls",
            module="ssl",
            description="Weak cipher",
            evidence="TLS 1.0",
            asset="example.com",
            points_deducted=5,
        )
        d = f.to_dict()
        self.assertIsInstance(d, dict)
        self.assertEqual(d["title"], "SSL")
        self.assertEqual(d["severity"], "medium")
        self.assertEqual(d["points_deducted"], 5)
        self.assertIn("module", d)
        self.assertIn("evidence", d)


class TestRateLimiter(unittest.TestCase):
    def test_creation(self):
        """RateLimiter should initialize with default rate."""
        rl = RateLimiter()
        self.assertAlmostEqual(rl._min_interval, 0.1, places=2)

    def test_custom_rate(self):
        """RateLimiter should accept custom rate."""
        rl = RateLimiter(max_per_second=2.0)
        self.assertAlmostEqual(rl._min_interval, 0.5, places=2)

    @patch('reconpro.http.time.sleep')
    @patch('reconpro.http.time.monotonic')
    def test_acquire_first_call_no_sleep(self, mock_mono, mock_sleep):
        """First acquire with large elapsed should not sleep."""
        mock_mono.side_effect = [10.0, 10.0]
        rl = RateLimiter(max_per_second=10.0)
        rl.acquire()
        mock_sleep.assert_not_called()

    @patch('reconpro.http.time.sleep')
    @patch('reconpro.http.time.monotonic')
    def test_acquire_fast_call_sleeps(self, mock_mono, mock_sleep):
        """Fast consecutive call should trigger sleep."""
        # First call: now=10.0, elapsed > 0.1 -> no sleep
        # Second call: now=10.01, elapsed < 0.1 -> sleep
        mock_mono.side_effect = [10.0, 10.0, 10.01, 10.1]
        rl = RateLimiter(max_per_second=10.0)
        rl.acquire()
        mock_sleep.assert_not_called()
        rl.acquire()
        mock_sleep.assert_called_once()


class TestComputeGrade(unittest.TestCase):
    def test_perfect_score(self):
        self.assertEqual(compute_grade(100), "A+")

    def test_a_plus_boundary(self):
        self.assertEqual(compute_grade(90), "A+")
        self.assertEqual(compute_grade(89), "A")

    def test_a_boundary(self):
        self.assertEqual(compute_grade(80), "A")
        self.assertEqual(compute_grade(79), "B")

    def test_b_boundary(self):
        self.assertEqual(compute_grade(65), "B")
        self.assertEqual(compute_grade(64), "C")

    def test_c_boundary(self):
        self.assertEqual(compute_grade(50), "C")
        self.assertEqual(compute_grade(49), "D")

    def test_d_boundary(self):
        self.assertEqual(compute_grade(35), "D")
        self.assertEqual(compute_grade(34), "F")

    def test_zero_score(self):
        self.assertEqual(compute_grade(0), "F")


class TestBadgeMarkdown(unittest.TestCase):
    def test_grade_a_plus(self):
        md = badge_markdown("example.com", "A+")
        self.assertIn("A+", md)
        self.assertIn("brightgreen", md)
        self.assertIn("img.shields.io", md)

    def test_grade_f(self):
        md = badge_markdown("bad.com", "F")
        self.assertIn("F", md)
        self.assertIn("red", md)

    def test_grade_b(self):
        md = badge_markdown("ok.com", "B")
        self.assertIn("yellow", md)

    def test_unknown_grade(self):
        md = badge_markdown("x.com", "X")
        self.assertIn("lightgrey", md)


# ═══════════════════════════════════════════════════════════════════════
#  Additional Edge Case Tests (Council Gamma)
# ═══════════════════════════════════════════════════════════════════════

class TestFindingEdgeCases(unittest.TestCase):
    """Edge cases for Finding dataclass."""

    def test_empty_strings_are_valid(self):
        """Finding should accept empty strings for all string fields."""
        f = Finding(
            title="", severity="", category="", module="",
            description="", evidence="", asset="",
        )
        self.assertEqual(f.title, "")
        self.assertEqual(f.severity, "")
        d = f.to_dict()
        self.assertEqual(d["title"], "")

    def test_large_description(self):
        """Finding should handle very long description strings."""
        long_desc = "A" * 50000
        f = Finding(
            title="Large", severity="info", category="test",
            module="m", description=long_desc, evidence="", asset="a",
        )
        self.assertEqual(len(f.description), 50000)
        d = f.to_dict()
        self.assertEqual(len(d["description"]), 50000)

    def test_unicode_in_fields(self):
        """Finding should handle Unicode characters."""
        f = Finding(
            title="XSS \u4e2d\u6587\u6d4b\u8bd5",
            severity="critical",
            category="injection",
            module="xss",
            description="Script \u00e9 \u00f1 \u2603",
            evidence="<script>alert('\u0410\u0411\u0412')</script>",
            asset="example.com",
        )
        d = f.to_dict()
        self.assertIn("\u4e2d\u6587\u6d4b\u8bd5", d["title"])
        self.assertIn("\u2603", d["description"])

    def test_zero_points_deducted(self):
        """Zero points_deducted should not be confused with unset."""
        f = Finding(
            title="Info", severity="info", category="test",
            module="m", description="d", evidence="e", asset="a",
            points_deducted=0,
        )
        self.assertEqual(f.points_deducted, 0)
        self.assertEqual(f.to_dict()["points_deducted"], 0)

    def test_negative_points_deducted(self):
        """Negative points_deducted should be stored as-is."""
        f = Finding(
            title="Neg", severity="low", category="test",
            module="m", description="d", evidence="e", asset="a",
            points_deducted=-5,
        )
        self.assertEqual(f.points_deducted, -5)

    def test_dread_score_zero(self):
        f = Finding(
            title="ZeroDread", severity="info", category="test",
            module="m", description="d", evidence="e", asset="a",
            dread_score=0.0,
        )
        self.assertEqual(f.dread_score, 0.0)

    def test_to_dict_keys_match_constructor_params(self):
        """to_dict should have the same keys as the dataclass fields."""
        f = Finding(
            title="T", severity="S", category="C", module="M",
            description="D", evidence="E", asset="A",
            points_deducted=1, remediation="R", dread_score=2.5,
        )
        d = f.to_dict()
        expected_keys = {
            "title", "severity", "category", "module",
            "description", "evidence", "asset", "points_deducted",
            "remediation", "dread_score",
        }
        self.assertEqual(set(d.keys()), expected_keys)


class TestRateLimiterEdgeCases(unittest.TestCase):
    """Edge cases for RateLimiter."""

    def test_zero_rate_limit(self):
        """Zero max_per_second should raise ZeroDivisionError."""
        with self.assertRaises(ZeroDivisionError):
            RateLimiter(max_per_second=0.0)

    def test_very_high_rate(self):
        """Very high rate should have near-zero interval."""
        rl = RateLimiter(max_per_second=1000000.0)
        self.assertLess(rl._min_interval, 0.0001)

    @patch('reconpro.http.time.sleep')
    @patch('reconpro.http.time.monotonic')
    def test_acquire_exact_interval_no_sleep(self, mock_mono, mock_sleep):
        """If elapsed equals _min_interval exactly, no sleep needed."""
        mock_mono.side_effect = [10.0, 10.0]
        rl = RateLimiter(max_per_second=10.0)
        rl.acquire()
        mock_sleep.assert_not_called()

    @patch('reconpro.http.time.sleep')
    @patch('reconpro.http.time.monotonic')
    def test_acquire_long_gap_no_sleep(self, mock_mono, mock_sleep):
        """Long gap between calls should not trigger sleep."""
        mock_mono.side_effect = [10.0, 10.0, 100.0, 100.0]
        rl = RateLimiter(max_per_second=10.0)
        rl.acquire()
        rl.acquire()
        mock_sleep.assert_not_called()


class TestComputeGradeEdgeCases(unittest.TestCase):
    """Boundary and extreme values for compute_grade."""

    def test_score_above_100(self):
        self.assertEqual(compute_grade(101), "A+")

    def test_score_very_negative(self):
        self.assertEqual(compute_grade(-100), "F")

    def test_score_negative_one(self):
        self.assertEqual(compute_grade(-1), "F")

    def test_score_at_exact_boundaries(self):
        """Test exact values at each grade threshold."""
        self.assertEqual(compute_grade(90), "A+")
        self.assertEqual(compute_grade(80), "A")
        self.assertEqual(compute_grade(65), "B")
        self.assertEqual(compute_grade(50), "C")
        self.assertEqual(compute_grade(35), "D")
        self.assertEqual(compute_grade(0), "F")

    def test_score_one_below_boundary(self):
        """One point below each threshold should give the next lower grade."""
        self.assertEqual(compute_grade(89), "A")
        self.assertEqual(compute_grade(79), "B")
        self.assertEqual(compute_grade(64), "C")
        self.assertEqual(compute_grade(49), "D")
        self.assertEqual(compute_grade(34), "F")


class TestBadgeMarkdownEdgeCases(unittest.TestCase):
    """Edge cases for badge_markdown."""

    def test_grade_d(self):
        md = badge_markdown("d.com", "D")
        self.assertIn("D", md)
        self.assertIn("orange", md)

    def test_empty_host(self):
        md = badge_markdown("", "A+")
        self.assertIn("A+", md)
        self.assertIn("img.shields.io", md)

    def test_host_with_special_chars(self):
        md = badge_markdown("my-site.example.com", "B")
        self.assertIn("B", md)
        self.assertIn("yellow", md)

    def test_all_grades_have_colors(self):
        """Every defined grade should map to a color."""
        grades = ["A+", "A", "B", "C", "D", "F"]
        for grade in grades:
            md = badge_markdown("test.com", grade)
            self.assertIn("ReconPro", md)
            self.assertIn(grade, md)


if __name__ == "__main__":
    unittest.main()
