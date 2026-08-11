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


if __name__ == "__main__":
    unittest.main()
