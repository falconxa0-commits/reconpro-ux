"""Tests for engine module."""
import unittest
from unittest.mock import patch, MagicMock
from reconpro.engine import ScanEngine, ScanEvent, EventCollector

class TestScanEvent(unittest.TestCase):
    def test_event_creation(self):
        """ScanEvent should create with required fields."""
        event = ScanEvent(type="SCAN_START")
        self.assertEqual(event.type, "SCAN_START")
        self.assertIsNone(event.module_id)
    
    def test_finding_event(self):
        """FINDING event should hold finding reference."""
        mock_finding = MagicMock(title="Test Finding")
        event = ScanEvent(type="FINDING", module_id="recon", finding=mock_finding)
        self.assertEqual(event.type, "FINDING")
        self.assertEqual(event.module_id, "recon")
        self.assertIsNotNone(event.finding)

class TestEventCollector(unittest.TestCase):
    def test_collector_buffers_events(self):
        """EventCollector should buffer all events."""
        collector = EventCollector()
        event1 = ScanEvent(type="SCAN_START")
        event2 = ScanEvent(type="MODULE_START", module_id="recon")
        collector(event1)
        collector(event2)
        self.assertEqual(len(collector.events), 2)
    
    def test_findings_property(self):
        """findings property should extract finding objects."""
        collector = EventCollector()
        mock_finding = MagicMock(title="F1")
        collector(ScanEvent(type="FINDING", finding=mock_finding))
        self.assertEqual(len(collector.findings), 1)
    
    def test_timeline(self):
        """timeline should produce formatted strings."""
        collector = EventCollector()
        collector(ScanEvent(type="SCAN_START"))
        lines = collector.timeline()
        self.assertTrue(len(lines) > 0)
        self.assertIn("SCAN_START", lines[0])

class TestScanEngine(unittest.TestCase):
    def test_engine_creation(self):
        """ScanEngine should create with defaults."""
        engine = ScanEngine()
        self.assertEqual(engine._concurrency, 5)
        self.assertTrue(engine._use_async)
    
    def test_resolve_remote_modules_defaults(self):
        """Default remote modules should match scanner.py."""
        mods = ScanEngine._resolve_remote_modules(None, False)
        from reconpro.scanner import DEFAULT_MODULES
        self.assertEqual(mods, DEFAULT_MODULES)
    
    def test_resolve_local_modules_defaults(self):
        """Default local modules should match scanner.py."""
        mods = ScanEngine._resolve_local_modules(None, False)
        from reconpro.scanner import DEFAULT_LOCAL_MODULES
        self.assertEqual(mods, DEFAULT_LOCAL_MODULES)

# ═══════════════════════════════════════════════════════════════════════
#  Additional Engine Tests (Council Gamma)
# ═══════════════════════════════════════════════════════════════════════

class TestScanEventExtended(unittest.TestCase):
    """Extended ScanEvent creation and attribute tests."""

    def test_event_with_all_fields(self):
        """ScanEvent with all optional fields populated."""
        from reconpro.http import Finding
        finding = Finding(
            title="Test", severity="high", category="test",
            module="m", description="d", evidence="e", asset="a",
        )
        event = ScanEvent(
            type="FINDING", module_id="recon", target="example.com",
            finding=finding, findings_count=3, duration=1.5,
            modules=["recon", "ssl"], timestamp=100.0,
        )
        self.assertEqual(event.type, "FINDING")
        self.assertEqual(event.module_id, "recon")
        self.assertEqual(event.target, "example.com")
        self.assertEqual(event.findings_count, 3)
        self.assertAlmostEqual(event.duration, 1.5)
        self.assertEqual(event.modules, ["recon", "ssl"])

    def test_event_timestamp_default(self):
        """timestamp should default to time.monotonic()."""
        event = ScanEvent(type="SCAN_START")
        self.assertGreater(event.timestamp, 0)

    def test_event_findings_count_default(self):
        event = ScanEvent(type="MODULE_COMPLETE")
        self.assertEqual(event.findings_count, 0)

    def test_event_duration_default(self):
        event = ScanEvent(type="SCAN_COMPLETE")
        self.assertAlmostEqual(event.duration, 0.0)


class TestEventCollectorExtended(unittest.TestCase):
    """Extended EventCollector tests."""

    def test_by_module_groups_scan_events(self):
        """Scan-level events should be under '_scan' key."""
        collector = EventCollector()
        collector(ScanEvent(type="SCAN_START"))
        collector(ScanEvent(type="MODULE_START", module_id="recon"))
        grouped = collector.by_module()
        self.assertIn("_scan", grouped)
        self.assertIn("recon", grouped)
        self.assertEqual(len(grouped["_scan"]), 1)

    def test_by_module_empty(self):
        """Empty collector should return empty dict."""
        collector = EventCollector()
        self.assertEqual(collector.by_module(), {})

    def test_findings_ignores_non_finding_events(self):
        """findings property should skip non-FINDING events."""
        collector = EventCollector()
        collector(ScanEvent(type="SCAN_START"))
        collector(ScanEvent(type="MODULE_START", module_id="recon"))
        self.assertEqual(collector.findings, [])

    def test_findings_ignores_none_finding(self):
        """FINDING events with None finding should be skipped."""
        collector = EventCollector()
        collector(ScanEvent(type="FINDING", finding=None))
        self.assertEqual(collector.findings, [])

    def test_timeline_multiple_events(self):
        """Timeline should include all events with relative timestamps."""
        collector = EventCollector()
        collector(ScanEvent(type="SCAN_START", timestamp=0.0))
        collector(ScanEvent(type="MODULE_START", module_id="recon", timestamp=0.5))
        collector(ScanEvent(
            type="MODULE_COMPLETE", module_id="recon",
            findings_count=2, duration=1.0, timestamp=1.5,
        ))
        lines = collector.timeline()
        self.assertEqual(len(lines), 3)
        self.assertIn("MODULE_COMPLETE", lines[2])
        self.assertIn("2 findings", lines[2])

    def test_collector_start_time_from_scan_start(self):
        """_start should be set from the first SCAN_START event."""
        collector = EventCollector()
        collector(ScanEvent(type="MODULE_START", module_id="recon", timestamp=5.0))
        # No SCAN_START yet, so _start should still be 0
        self.assertEqual(collector._start, 0.0)
        collector(ScanEvent(type="SCAN_START", timestamp=10.0))
        self.assertAlmostEqual(collector._start, 10.0)


class TestScanEngineExtended(unittest.TestCase):
    """Extended ScanEngine tests."""

    def test_engine_custom_concurrency(self):
        """Engine should accept custom concurrency."""
        engine = ScanEngine(concurrency=10)
        self.assertEqual(engine._concurrency, 10)

    def test_engine_custom_rate_limit(self):
        """Engine should accept custom rate limit."""
        engine = ScanEngine(rate_limit=100.0)
        self.assertEqual(engine._default_rate_limit, 100.0)

    def test_engine_use_async_false(self):
        """Engine can be configured to not use async module runners."""
        engine = ScanEngine(use_async=False)
        self.assertFalse(engine._use_async)

    def test_engine_with_intelligence_callback(self):
        """Engine should store intelligence callback."""
        cb = lambda r: None
        engine = ScanEngine(intelligence_callback=cb)
        self.assertIs(engine._intelligence_callback, cb)

    def test_emit_calls_callback(self):
        """_emit should call the event callback."""
        received = []
        engine = ScanEngine(event_callback=lambda e: received.append(e))
        event = ScanEvent(type="SCAN_START")
        engine._emit(event)
        self.assertEqual(len(received), 1)
        self.assertEqual(received[0].type, "SCAN_START")

    def test_emit_callback_exception_not_propagated(self):
        """Callback exceptions should be silently swallowed."""
        bad_cb = lambda e: 1 / 0
        engine = ScanEngine(event_callback=bad_cb)
        # Should not raise
        engine._emit(ScanEvent(type="SCAN_START"))

    def test_emit_no_callback(self):
        """_emit with no callback should be a no-op."""
        engine = ScanEngine(event_callback=None)
        # Should not raise
        engine._emit(ScanEvent(type="SCAN_START"))

    def test_resolve_remote_modules_all_modules(self):
        """all_modules=True should return all registered modules."""
        mods = ScanEngine._resolve_remote_modules(None, True)
        from reconpro.scanner import ALL_MODULES, MODULE_REGISTRY
        expected = [m for m in ALL_MODULES if m in MODULE_REGISTRY]
        self.assertEqual(mods, expected)

    def test_resolve_remote_modules_custom_list(self):
        """Explicit module list should filter to valid modules."""
        mods = ScanEngine._resolve_remote_modules(["recon", "nonexistent"], False)
        self.assertEqual(mods, ["recon"])

    def test_resolve_local_modules_all_modules(self):
        """all_modules=True for local should return DEFAULT_LOCAL_MODULES."""
        mods = ScanEngine._resolve_local_modules(None, True)
        from reconpro.scanner import DEFAULT_LOCAL_MODULES
        self.assertEqual(mods, DEFAULT_LOCAL_MODULES)

    def test_resolve_local_modules_custom_list(self):
        """Explicit local module list should filter to valid local modules."""
        from reconpro.scanner import LOCAL_MODULES
        valid_local = list(LOCAL_MODULES.keys())[:2]
        mods = ScanEngine._resolve_local_modules(valid_local, False)
        self.assertEqual(set(mods), set(valid_local))

    def test_build_result_with_no_findings(self):
        """_build_result with no findings should produce score 100."""
        engine = ScanEngine()
        result = engine._build_result(
            target="perfect.com", mods=["recon"],
            all_findings=[], module_results={},
            vibesec_score=None, vibesec_grade=None,
        )
        self.assertEqual(result.total_score, 100)
        self.assertEqual(result.grade, "A+")

    def test_build_result_with_findings(self):
        """_build_result with deductions should produce correct score."""
        from reconpro.http import Finding
        engine = ScanEngine()
        findings = [
            Finding(
                title="T1", severity="high", category="c", module="m",
                description="d", evidence="e", asset="a", points_deducted=20,
            ),
            Finding(
                title="T2", severity="medium", category="c", module="m",
                description="d", evidence="e", asset="a", points_deducted=10,
            ),
        ]
        result = engine._build_result(
            target="scored.com", mods=["recon"],
            all_findings=findings, module_results={},
            vibesec_score=None, vibesec_grade=None,
        )
        self.assertEqual(result.total_score, 70)
        # Score 70 maps to grade "B" (threshold is 65)
        self.assertEqual(result.grade, "B")

    def test_build_result_clamps_score(self):
        """Score should be clamped to [0, 100]."""
        from reconpro.http import Finding
        engine = ScanEngine()
        findings = [
            Finding(
                title="T", severity="critical", category="c", module="m",
                description="d", evidence="e", asset="a", points_deducted=200,
            ),
        ]
        result = engine._build_result(
            target="clamped.com", mods=["recon"],
            all_findings=findings, module_results={},
            vibesec_score=None, vibesec_grade=None,
        )
        self.assertEqual(result.total_score, 0)
        self.assertEqual(result.grade, "F")

    def test_build_result_target_normalization(self):
        """Target should be normalized (strip scheme)."""
        engine = ScanEngine()
        result = engine._build_result(
            target="https://example.com/path", mods=["recon"],
            all_findings=[], module_results={},
            vibesec_score=None, vibesec_grade=None,
        )
        self.assertEqual(result.target, "example.com")

    def test_build_result_severity_counts(self):
        """Severity counts should be computed from findings."""
        from reconpro.http import Finding
        engine = ScanEngine()
        findings = [
            Finding(title="T1", severity="high", category="c", module="m",
                    description="d", evidence="e", asset="a"),
            Finding(title="T2", severity="high", category="c", module="m",
                    description="d", evidence="e", asset="a"),
            Finding(title="T3", severity="low", category="c", module="m",
                    description="d", evidence="e", asset="a"),
        ]
        result = engine._build_result(
            target="sevcount.com", mods=["recon"],
            all_findings=findings, module_results={},
            vibesec_score=None, vibesec_grade=None,
        )
        self.assertEqual(result.severity_counts["high"], 2)
        self.assertEqual(result.severity_counts["low"], 1)

    def test_build_result_with_vibesec(self):
        """_build_result should include vibesec_score and vibesec_grade."""
        engine = ScanEngine()
        result = engine._build_result(
            target="vibesec.com", mods=["recon"],
            all_findings=[], module_results={},
            vibesec_score=85, vibesec_grade="B",
        )
        self.assertEqual(result.vibesec_score, 85)
        self.assertEqual(result.vibesec_grade, "B")

    def test_build_result_includes_badge_markdown(self):
        """Result should include a badge_markdown string."""
        engine = ScanEngine()
        result = engine._build_result(
            target="badge.com", mods=["recon"],
            all_findings=[], module_results={},
            vibesec_score=None, vibesec_grade=None,
        )
        self.assertIn("img.shields.io", result.badge_markdown)


if __name__ == "__main__":
    unittest.main()
