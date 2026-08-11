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

if __name__ == "__main__":
    unittest.main()
