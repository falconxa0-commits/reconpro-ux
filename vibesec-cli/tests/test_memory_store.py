"""Tests for the UnifiedMemoryStore in memory.py.

Covers:
- FindingStore CRUD operations (save, get, latest, trend, count, filter)
- AgentBlackboard (set, get, get_all, clear, TTL expiration)
- CredentialVault (store, get_all, search, purge, obfuscation)
- Knowledge Graph integration methods (add_target, add_vulnerability, etc.)
- Thread safety (concurrent reads/writes)
- Export/import and stats
"""
import json
import os
import shutil
import tempfile
import threading
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from reconpro.memory import UnifiedMemoryStore, FINDINGS_DIR, MEMORY_DIR, VAULT_PATH


def _use_temp_dir():
    """Return a temp directory and set module-level paths."""
    tmp = tempfile.mkdtemp(prefix="reconpro_memtest_")
    return tmp


class _TempDirMixin:
    """Mixin that patches the module-level directory paths to a temp dir."""

    def setUp(self):
        self._tmpdir = tempfile.mkdtemp(prefix="reconpro_memtest_")
        self._patches = [
            patch("reconpro.memory.MEMORY_DIR", Path(self._tmpdir)),
            patch("reconpro.memory.FINDINGS_DIR", Path(self._tmpdir) / "findings"),
            patch("reconpro.memory.VAULT_PATH", Path(self._tmpdir) / "vault.json"),
        ]
        for p in self._patches:
            p.start()

    def tearDown(self):
        for p in self._patches:
            p.stop()
        shutil.rmtree(self._tmpdir, ignore_errors=True)


# ═══════════════════════════════════════════════════════════════════════
#  FindingStore Tests
# ═══════════════════════════════════════════════════════════════════════

class TestFindingStoreCRUD(_TempDirMixin, unittest.TestCase):
    """FindingStore: save, get, latest, count, trend operations."""

    def test_save_and_retrieve_finding(self):
        """save_finding should persist and allow retrieval."""
        store = UnifiedMemoryStore()
        store.save_finding("example.com", {
            "title": "Open Port 22",
            "severity": "high",
            "category": "network",
            "module": "recon",
        })
        findings = store.get_findings("example.com")
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["title"], "Open Port 22")
        self.assertEqual(findings[0]["severity"], "high")
        self.assertEqual(findings[0]["_target"], "example.com")

    def test_save_multiple_findings_for_same_target(self):
        """Multiple findings for one target should accumulate."""
        store = UnifiedMemoryStore()
        for i in range(5):
            store.save_finding("example.com", {
                "title": f"Finding {i}",
                "severity": "low",
                "module": "test",
            })
        findings = store.get_findings("example.com")
        self.assertEqual(len(findings), 5)

    def test_save_findings_for_different_targets(self):
        """Findings for different targets should be isolated."""
        store = UnifiedMemoryStore()
        store.save_finding("a.com", {"title": "A", "severity": "high", "module": "x"})
        store.save_finding("b.com", {"title": "B", "severity": "low", "module": "x"})
        self.assertEqual(len(store.get_findings("a.com")), 1)
        self.assertEqual(len(store.get_findings("b.com")), 1)
        self.assertEqual(store.get_findings("a.com")[0]["title"], "A")

    def test_get_findings_empty_target(self):
        """Unknown target should return empty list."""
        store = UnifiedMemoryStore()
        self.assertEqual(store.get_findings("nonexistent.com"), [])

    def test_finding_has_timestamp(self):
        """Saved finding should have an auto-generated _ts field."""
        store = UnifiedMemoryStore()
        store.save_finding("ts.com", {"title": "T", "severity": "info", "module": "m"})
        findings = store.get_findings("ts.com")
        self.assertIn("_ts", findings[0])

    def test_save_finding_persists_to_disk(self):
        """Findings should be flushed to disk JSON."""
        store = UnifiedMemoryStore()
        store.save_finding("persist.com", {
            "title": "Disk Check",
            "severity": "medium",
            "module": "test",
        })
        # Verify JSON file exists on disk
        h = store._target_hash("persist.com")
        path = Path(self._tmpdir) / "findings" / f"findings_{h}.json"
        self.assertTrue(path.is_file())
        data = json.loads(path.read_text())
        self.assertEqual(data["_target"], "persist.com")
        self.assertEqual(len(data["entries"]), 1)


class TestFindingStoreFilters(_TempDirMixin, unittest.TestCase):
    """FindingStore: filtering by severity, module, and since timestamp."""

    def _seed(self, store):
        """Seed the store with several findings."""
        now = datetime.now(timezone.utc)
        for i, (sev, mod) in enumerate([
            ("critical", "recon"),
            ("high", "recon"),
            ("medium", "ssl"),
            ("low", "recon"),
            ("info", "recon"),
        ]):
            entry = {
                "title": f"F{i}",
                "severity": sev,
                "module": mod,
                "_ts": (now - timedelta(days=i)).isoformat(),
                "_target": "filter.com",
            }
            store._findings["filter.com"].append(entry)
        store._findings_loaded = True

    def test_filter_by_severity(self):
        store = UnifiedMemoryStore()
        self._seed(store)
        crit = store.get_findings("filter.com", severity="critical")
        self.assertEqual(len(crit), 1)
        self.assertEqual(crit[0]["severity"], "critical")

    def test_filter_by_module(self):
        store = UnifiedMemoryStore()
        self._seed(store)
        ssl_findings = store.get_findings("filter.com", module="ssl")
        self.assertEqual(len(ssl_findings), 1)
        self.assertEqual(ssl_findings[0]["module"], "ssl")

    def test_filter_by_since_timestamp(self):
        store = UnifiedMemoryStore()
        self._seed(store)
        now = datetime.now(timezone.utc)
        cutoff = (now - timedelta(hours=36)).isoformat()
        recent = store.get_findings("filter.com", since=cutoff)
        # Findings at day-0 and day-1 are within 36 hours
        self.assertGreaterEqual(len(recent), 2)

    def test_combined_filters(self):
        store = UnifiedMemoryStore()
        self._seed(store)
        recon_high = store.get_findings("filter.com", severity="high", module="recon")
        self.assertEqual(len(recon_high), 1)

    def test_filter_case_insensitive(self):
        store = UnifiedMemoryStore()
        self._seed(store)
        result = store.get_findings("filter.com", severity="CRITICAL")
        self.assertEqual(len(result), 1)


class TestFindingStoreLatest(_TempDirMixin, unittest.TestCase):
    """FindingStore: get_latest_findings and finding_count."""

    def test_latest_returns_most_recent(self):
        store = UnifiedMemoryStore()
        now = datetime.now(timezone.utc)
        for i in range(10):
            entry = {
                "title": f"F{i}",
                "severity": "info",
                "module": "m",
                "_ts": (now - timedelta(hours=i * 10)).isoformat(),
                "_target": "latest.com",
            }
            store._findings["latest.com"].append(entry)
        store._findings_loaded = True
        latest = store.get_latest_findings("latest.com", limit=3)
        self.assertEqual(len(latest), 3)
        # First should be the most recent (smallest time delta)
        self.assertEqual(latest[0]["title"], "F0")

    def test_finding_count_all(self):
        store = UnifiedMemoryStore()
        store.save_finding("cnt.com", {"title": "A", "severity": "high", "module": "m"})
        store.save_finding("cnt.com", {"title": "B", "severity": "low", "module": "m"})
        self.assertEqual(store.finding_count("cnt.com"), 2)

    def test_finding_count_by_severity(self):
        store = UnifiedMemoryStore()
        store.save_finding("cnt.com", {"title": "A", "severity": "high", "module": "m"})
        store.save_finding("cnt.com", {"title": "B", "severity": "low", "module": "m"})
        store.save_finding("cnt.com", {"title": "C", "severity": "high", "module": "m"})
        self.assertEqual(store.finding_count("cnt.com", severity="high"), 2)
        self.assertEqual(store.finding_count("cnt.com", severity="low"), 1)


class TestFindingStoreTrend(_TempDirMixin, unittest.TestCase):
    """FindingStore: trend calculation."""

    def test_trend_with_data(self):
        store = UnifiedMemoryStore()
        now = datetime.now(timezone.utc)
        entries = []
        for i in range(3):
            for _ in range(i + 1):
                entries.append({
                    "title": f"D{i}",
                    "severity": "high",
                    "module": "m",
                    "_ts": (now - timedelta(days=i)).isoformat(),
                    "_target": "trend.com",
                })
        for e in entries:
            store._findings["trend.com"].append(e)
        store._findings_loaded = True
        trend = store.trend("trend.com", days=5)
        self.assertIsInstance(trend, list)
        self.assertTrue(len(trend) >= 3)
        # Each entry has expected keys
        for day_entry in trend:
            self.assertIn("date", day_entry)
            self.assertIn("score", day_entry)
            self.assertIn("critical", day_entry)
            self.assertIn("high", day_entry)

    def test_trend_empty_target(self):
        store = UnifiedMemoryStore()
        trend = store.trend("empty.com", days=7)
        self.assertEqual(trend, [])


# ═══════════════════════════════════════════════════════════════════════
#  AgentBlackboard Tests
# ═══════════════════════════════════════════════════════════════════════

class TestAgentBlackboard(_TempDirMixin, unittest.TestCase):
    """AgentBlackboard: set, get, get_all, clear, TTL."""

    def test_set_and_get(self):
        store = UnifiedMemoryStore()
        store.bb_set("key1", {"data": 42}, agent_id="agent-1")
        result = store.bb_get("key1")
        self.assertEqual(result, {"data": 42})

    def test_get_missing_key_returns_none(self):
        store = UnifiedMemoryStore()
        self.assertIsNone(store.bb_get("no_such_key"))

    def test_get_expired_key_returns_none(self):
        store = UnifiedMemoryStore()
        store.bb_set("ephemeral", "gone", agent_id="a", ttl=0)
        # TTL is 0, so it should be immediately expired
        time.sleep(0.01)
        self.assertIsNone(store.bb_get("ephemeral"))

    def test_set_overwrites(self):
        store = UnifiedMemoryStore()
        store.bb_set("k", "v1", agent_id="a")
        store.bb_set("k", "v2", agent_id="a")
        self.assertEqual(store.bb_get("k"), "v2")

    def test_get_all_returns_all_active(self):
        store = UnifiedMemoryStore()
        store.bb_set("a", 1, agent_id="x")
        store.bb_set("b", 2, agent_id="y")
        all_entries = store.bb_get_all()
        self.assertEqual(len(all_entries), 2)
        self.assertEqual(all_entries["a"], 1)
        self.assertEqual(all_entries["b"], 2)

    def test_get_all_filters_by_agent(self):
        store = UnifiedMemoryStore()
        store.bb_set("a", 1, agent_id="agent-x")
        store.bb_set("b", 2, agent_id="agent-y")
        x_entries = store.bb_get_all(agent_id="agent-x")
        self.assertEqual(len(x_entries), 1)
        self.assertIn("a", x_entries)

    def test_clear_wipes_all(self):
        store = UnifiedMemoryStore()
        store.bb_set("a", 1, agent_id="x")
        store.bb_set("b", 2, agent_id="y")
        store.bb_clear()
        self.assertEqual(store.bb_get_all(), {})

    def test_get_all_prunes_expired(self):
        store = UnifiedMemoryStore()
        store.bb_set("live", "yes", agent_id="a", ttl=60)
        store.bb_set("dead", "no", agent_id="a", ttl=0)
        time.sleep(0.01)
        all_entries = store.bb_get_all()
        self.assertEqual(len(all_entries), 1)
        self.assertIn("live", all_entries)


# ═══════════════════════════════════════════════════════════════════════
#  CredentialVault Tests
# ═══════════════════════════════════════════════════════════════════════

class TestCredentialVault(_TempDirMixin, unittest.TestCase):
    """CredentialVault: store, get_all, search, purge, obfuscation."""

    def test_store_and_retrieve(self):
        store = UnifiedMemoryStore()
        store.vault_store("db.example.com", "admin", "s3cret")
        creds = store.vault_get_all()
        self.assertEqual(len(creds), 1)
        self.assertEqual(creds[0]["username"], "admin")
        self.assertEqual(creds[0]["password"], "s3cret")

    def test_store_with_url_and_notes(self):
        store = UnifiedMemoryStore()
        store.vault_store(
            "api.example.com", "user", "pass",
            url="https://api.example.com/login", notes="Production API"
        )
        creds = store.vault_get_all()
        self.assertEqual(creds[0]["url"], "https://api.example.com/login")
        self.assertEqual(creds[0]["notes"], "Production API")

    def test_get_all_filters_by_source(self):
        store = UnifiedMemoryStore()
        store.vault_store("source-a.com", "u1", "p1")
        store.vault_store("source-b.com", "u2", "p2")
        a_creds = store.vault_get_all(source="source-a.com")
        self.assertEqual(len(a_creds), 1)
        self.assertEqual(a_creds[0]["source"], "source-a.com")

    def test_search_by_username(self):
        store = UnifiedMemoryStore()
        store.vault_store("x.com", "admin_user", "p1")
        store.vault_store("y.com", "regular_user", "p2")
        results = store.vault_search("admin")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["username"], "admin_user")

    def test_search_case_insensitive(self):
        store = UnifiedMemoryStore()
        store.vault_store("x.com", "AdminUser", "p1")
        results = store.vault_search("adminuser")
        self.assertEqual(len(results), 1)

    def test_search_by_url(self):
        store = UnifiedMemoryStore()
        store.vault_store("x.com", "u", "p", url="https://vault.example.com")
        results = store.vault_search("vault.example.com")
        self.assertEqual(len(results), 1)

    def test_search_no_match(self):
        store = UnifiedMemoryStore()
        store.vault_store("x.com", "u", "p")
        results = store.vault_search("no_match_at_all")
        self.assertEqual(len(results), 0)

    def test_purge_clears_all(self):
        store = UnifiedMemoryStore()
        store.vault_store("x.com", "u", "p")
        store.vault_store("y.com", "u", "p")
        store.vault_purge()
        self.assertEqual(store.vault_get_all(), [])

    def test_obfuscate_roundtrip(self):
        """_obfuscate / _deobfuscate should roundtrip."""
        key = UnifiedMemoryStore._machine_key()
        original = "MySecretPassword123!@#"
        obfuscated = UnifiedMemoryStore._obfuscate(original, key)
        deobfuscated = UnifiedMemoryStore._deobfuscate(obfuscated, key)
        self.assertEqual(deobfuscated, original)

    def test_obfuscate_differs_from_plaintext(self):
        key = UnifiedMemoryStore._machine_key()
        obfuscated = UnifiedMemoryStore._obfuscate("hello", key)
        self.assertNotEqual(obfuscated, "hello")

    def test_deobfuscate_invalid_input(self):
        key = UnifiedMemoryStore._machine_key()
        result = UnifiedMemoryStore._deobfuscate("!!!invalid-base64!!!", key)
        self.assertEqual(result, "")


# ═══════════════════════════════════════════════════════════════════════
#  Graph Integration Methods
# ═══════════════════════════════════════════════════════════════════════

class TestGraphIntegration(_TempDirMixin, unittest.TestCase):
    """UnifiedMemoryStore graph pass-through methods."""

    def test_add_and_get_target(self):
        store = UnifiedMemoryStore()
        store.add_target("example.com", priority="high")
        surface = store.get_attack_surface("example.com")
        self.assertIsInstance(surface, dict)
        self.assertIn("endpoints", surface)
        self.assertIn("ports", surface)
        self.assertIn("vulnerabilities", surface)

    def test_add_vulnerability(self):
        store = UnifiedMemoryStore()
        store.add_target("example.com")
        store.add_vulnerability("SQLi", "example.com", severity="critical")
        surface = store.get_attack_surface("example.com")
        self.assertEqual(len(surface["vulnerabilities"]), 1)
        self.assertEqual(surface["vulnerabilities"][0]["severity"], "critical")

    def test_add_asset(self):
        store = UnifiedMemoryStore()
        store.add_asset("web-server-1", role="production")
        stats = store.graph_stats()
        self.assertGreater(stats["total_nodes"], 0)

    def test_add_cve(self):
        store = UnifiedMemoryStore()
        store.add_cve("CVE-2024-1234", severity="high", description="Buffer overflow")
        stats = store.graph_stats()
        self.assertGreater(stats["total_nodes"], 0)

    def test_add_endpoint(self):
        store = UnifiedMemoryStore()
        store.add_endpoint("/api/login", "example.com", method="POST")
        surface = store.get_attack_surface("example.com")
        self.assertEqual(len(surface["endpoints"]), 1)
        self.assertEqual(surface["endpoints"][0]["path"], "/api/login")

    def test_add_technology(self):
        store = UnifiedMemoryStore()
        store.add_technology("nginx", version="1.24")
        stats = store.graph_stats()
        self.assertGreater(stats["total_nodes"], 0)

    def test_add_relation_with_plain_labels(self):
        store = UnifiedMemoryStore()
        store.add_relation("server-a", "server-b", "links_to")
        stats = store.graph_stats()
        self.assertGreater(stats["total_edges"], 0)

    def test_add_relation_with_invalid_edge_type_falls_back(self):
        """Invalid edge type should fall back to 'links_to'."""
        store = UnifiedMemoryStore()
        store.add_relation("x", "y", "invalid_type")
        stats = store.graph_stats()
        self.assertGreater(stats["total_edges"], 0)

    def test_blast_radius(self):
        store = UnifiedMemoryStore()
        store.add_target("target.com")
        store.add_vulnerability("XSS", "target.com", severity="high")
        radius = store.get_blast_radius("target.com")
        self.assertIsInstance(radius, list)
        self.assertGreater(len(radius), 0)

    def test_graph_stats(self):
        store = UnifiedMemoryStore()
        store.add_target("stats.com")
        store.add_vulnerability("Info Leak", "stats.com", severity="medium")
        stats = store.graph_stats()
        self.assertIn("total_nodes", stats)
        self.assertIn("total_edges", stats)
        self.assertIn("nodes_by_type", stats)
        self.assertIn("severity_distribution", stats)


# ═══════════════════════════════════════════════════════════════════════
#  Thread Safety Tests
# ═══════════════════════════════════════════════════════════════════════

class TestThreadSafety(_TempDirMixin, unittest.TestCase):
    """Concurrent read/write operations should not corrupt state."""

    def test_concurrent_bb_writes(self):
        store = UnifiedMemoryStore()
        errors = []

        def writer(n):
            try:
                for i in range(50):
                    store.bb_set(f"key-{n}-{i}", n * 1000 + i, agent_id=f"agent-{n}")
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=writer, args=(t,)) for t in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(errors, [], "Concurrent writes should not raise errors")

    def test_concurrent_findings_writes(self):
        store = UnifiedMemoryStore()
        errors = []

        def writer(n):
            try:
                for i in range(20):
                    store.save_finding(f"target-{n}", {
                        "title": f"Finding-{n}-{i}",
                        "severity": "info",
                        "module": "concurrent_test",
                    })
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=writer, args=(t,)) for t in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(errors, [])
        # Verify no data was lost
        for n in range(3):
            self.assertEqual(len(store.get_findings(f"target-{n}")), 20)


# ═══════════════════════════════════════════════════════════════════════
#  Export / Import / Stats / Clear Tests
# ═══════════════════════════════════════════════════════════════════════

class TestExportImport(_TempDirMixin, unittest.TestCase):
    """Export, import, stats, and clear_all."""

    def test_stats_returns_all_subsystems(self):
        store = UnifiedMemoryStore()
        store.add_target("s.com")
        store.bb_set("k", "v", agent_id="a")
        stats = store.stats()
        self.assertIn("graph", stats)
        self.assertIn("findings", stats)
        self.assertIn("blackboard", stats)
        self.assertIn("vault", stats)

    def test_stats_findings_count(self):
        store = UnifiedMemoryStore()
        store.save_finding("s.com", {"title": "T", "severity": "high", "module": "m"})
        stats = store.stats()
        self.assertEqual(stats["findings"]["total_findings"], 1)
        self.assertEqual(stats["findings"]["targets_tracked"], 1)

    def test_clear_all_resets_state(self):
        store = UnifiedMemoryStore()
        store.save_finding("c.com", {"title": "T", "severity": "high", "module": "m"})
        store.bb_set("k", "v", agent_id="a")
        store.add_target("c.com")
        store.clear_all()
        self.assertEqual(store.get_findings("c.com"), [])
        self.assertEqual(store.bb_get_all(), {})
        stats = store.graph_stats()
        self.assertEqual(stats["total_nodes"], 0)

    def test_add_scan_result_populates_graph_and_findings(self):
        store = UnifiedMemoryStore()
        scan_dict = {
            "target": "scan-target.com",
            "module": "recon",
            "findings": [
                {"title": "Open SSH", "severity": "high", "category": "network"},
                {"title": "No CSP", "severity": "medium", "category": "headers"},
            ],
            "ports": [{"port": 22, "service": "ssh", "state": "open"}],
            "technologies": ["nginx"],
        }
        store.add_scan_result(scan_dict)
        # Findings should be in the store
        findings = store.get_findings("scan-target.com")
        self.assertGreater(len(findings), 0)
        # Graph should have nodes
        stats = store.graph_stats()
        self.assertGreater(stats["total_nodes"], 0)

    def test_add_finding_from_scan(self):
        store = UnifiedMemoryStore()
        store.add_finding_from_scan({
            "title": "Test Vuln",
            "severity": "critical",
            "target": "ftest.com",
            "category": "sqli",
        })
        surface = store.get_attack_surface("ftest.com")
        self.assertGreater(len(surface["vulnerabilities"]), 0)

    def test_add_finding_from_scan_no_target_skipped(self):
        """Finding without a target should be silently skipped."""
        store = UnifiedMemoryStore()
        store.add_finding_from_scan({
            "title": "Orphan",
            "severity": "high",
        })
        stats = store.graph_stats()
        # No target node created → no finding nodes either
        self.assertEqual(stats.get("total_nodes", 0), 0)

    def test_target_hash_deterministic(self):
        """Target hash should be consistent."""
        h1 = UnifiedMemoryStore._target_hash("example.com")
        h2 = UnifiedMemoryStore._target_hash("example.com")
        self.assertEqual(h1, h2)
        self.assertEqual(len(h1), 16)

    def test_target_hash_different_for_different_targets(self):
        h1 = UnifiedMemoryStore._target_hash("a.com")
        h2 = UnifiedMemoryStore._target_hash("b.com")
        self.assertNotEqual(h1, h2)


if __name__ == "__main__":
    unittest.main()
