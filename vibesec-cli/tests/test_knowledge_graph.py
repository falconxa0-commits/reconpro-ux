"""Tests for the SecurityKnowledgeGraph in knowledge_graph.py.

Covers:
- Initialization and empty graph
- Node creation for all NODE_TYPES
- Edge creation for all EDGE_TYPES
- Attack surface computation
- Blast radius
- Attack chain discovery (find_chains)
- Vulnerable assets detection
- Cross-correlation (correlate)
- Serialization/deserialization (save/load, to_cypher, to_dict)
- Fallback graph operations (_FallbackDiGraph)
- Stats computation
- Severity normalization
- Path finding helpers (_resolve_node, _bfs_collect)
"""
import json
import os
import tempfile
import shutil
import unittest
from pathlib import Path
from unittest.mock import patch

from reconpro.knowledge_graph import (
    EDGE_TYPES,
    NODE_TYPES,
    SEVERITY_ORDER,
    SecurityKnowledgeGraph,
    _FallbackDiGraph,
    _make_graph,
    HAS_NX,
    DEFAULT_GRAPH_DIR,
)


class _TempGraphDirMixin:
    """Mixin that provides a temp directory for graph persistence."""

    def setUp(self):
        self._tmpdir = tempfile.mkdtemp(prefix="reconpro_kg_test_")
        self._patches = [
            patch("reconpro.knowledge_graph.DEFAULT_GRAPH_DIR", Path(self._tmpdir)),
        ]
        for p in self._patches:
            p.start()

    def tearDown(self):
        for p in self._patches:
            p.stop()
        shutil.rmtree(self._tmpdir, ignore_errors=True)


# ═══════════════════════════════════════════════════════════════════════
#  Initialization & Empty Graph
# ═══════════════════════════════════════════════════════════════════════

class TestGraphInit(_TempGraphDirMixin, unittest.TestCase):
    """Graph initialization and basic state."""

    def test_empty_graph(self):
        g = SecurityKnowledgeGraph()
        stats = g.stats()
        self.assertEqual(stats["total_nodes"], 0)
        self.assertEqual(stats["total_edges"], 0)

    def test_node_type_index_empty(self):
        g = SecurityKnowledgeGraph()
        self.assertEqual(len(g._node_type_index), 0)

    def test_edge_type_index_empty(self):
        g = SecurityKnowledgeGraph()
        self.assertEqual(len(g._edge_type_index), 0)

    def test_backing_engine_reported(self):
        g = SecurityKnowledgeGraph()
        stats = g.stats()
        expected = "networkx" if HAS_NX else "fallback_dict"
        self.assertEqual(stats["backing_engine"], expected)


# ═══════════════════════════════════════════════════════════════════════
#  Node Creation — all NODE_TYPES
# ═══════════════════════════════════════════════════════════════════════

class TestNodeCreation(unittest.TestCase):
    """Node creation for each valid node type."""

    def setUp(self):
        self.g = SecurityKnowledgeGraph()

    def test_add_target_node(self):
        nid = self.g._add_indexed_node("target", "example.com")
        self.assertEqual(nid, "target:example.com")
        stats = self.g.stats()
        self.assertIn("target", stats["nodes_by_type"])
        self.assertEqual(stats["nodes_by_type"]["target"], 1)

    def test_add_subdomain_node(self):
        nid = self.g._add_indexed_node("subdomain", "www.example.com")
        self.assertEqual(nid, "subdomain:www.example.com")
        self.assertIn("subdomain", self.g._node_type_index)

    def test_add_port_node(self):
        nid = self.g._add_indexed_node("port", "example.com:443", port=443)
        self.assertEqual(nid, "port:example.com:443")

    def test_add_service_node(self):
        nid = self.g._add_indexed_node("service", "example.com:443:https", name="https")
        self.assertEqual(nid, "service:example.com:443:https")

    def test_add_finding_node(self):
        nid = self.g._add_indexed_node("finding", "example.com:XSS", severity="high")
        self.assertEqual(nid, "finding:example.com:XSS")

    def test_add_cve_node(self):
        nid = self.g.add_cve("CVE-2024-0001", severity="critical")
        self.assertEqual(nid, "cve:CVE-2024-0001")

    def test_add_asset_node(self):
        nid = self.g._add_indexed_node("asset", "server-01")
        self.assertEqual(nid, "asset:server-01")

    def test_add_endpoint_node(self):
        nid = self.g._add_indexed_node("endpoint", "example.com:GET:/api")
        self.assertEqual(nid, "endpoint:example.com:GET:/api")

    def test_add_technology_node(self):
        nid = self.g._add_indexed_node("technology", "nginx")
        self.assertEqual(nid, "technology:nginx")

    def test_add_certificate_node(self):
        nid = self.g._add_indexed_node("certificate", "example.com:star.example.com")
        self.assertEqual(nid, "certificate:example.com:star.example.com")

    def test_add_node_is_idempotent(self):
        """Adding the same node twice should not duplicate."""
        nid1 = self.g._add_indexed_node("target", "dup.com")
        nid2 = self.g._add_indexed_node("target", "dup.com")
        self.assertEqual(nid1, nid2)
        stats = self.g.stats()
        self.assertEqual(stats["nodes_by_type"]["target"], 1)


# ═══════════════════════════════════════════════════════════════════════
#  Edge Creation — all EDGE_TYPES
# ═══════════════════════════════════════════════════════════════════════

class TestEdgeCreation(unittest.TestCase):
    """Edge creation for each valid edge type."""

    def setUp(self):
        self.g = SecurityKnowledgeGraph()

    def test_edge_has_subdomain(self):
        self.g._add_indexed_node("target", "example.com")
        sub = self.g._add_indexed_node("subdomain", "www.example.com")
        self.g._add_indexed_edge("target:example.com", sub, "has_subdomain")
        stats = self.g.stats()
        self.assertEqual(stats["edges_by_type"].get("has_subdomain", 0), 1)

    def test_edge_runs_on(self):
        self.g._add_indexed_node("port", "p:443")
        svc = self.g._add_indexed_node("service", "p:443:https")
        self.g._add_indexed_edge("port:p:443", svc, "runs_on")
        stats = self.g.stats()
        self.assertEqual(stats["edges_by_type"].get("runs_on", 0), 1)

    def test_edge_has_port(self):
        self.g._add_indexed_node("target", "t")
        port = self.g._add_indexed_node("port", "t:80")
        self.g._add_indexed_edge("target:t", port, "has_port")
        stats = self.g.stats()
        self.assertEqual(stats["edges_by_type"].get("has_port", 0), 1)

    def test_edge_has_vuln(self):
        self.g._add_indexed_node("target", "t")
        vuln = self.g._add_indexed_node("finding", "t:v")
        self.g._add_indexed_edge("target:t", vuln, "has_vuln")
        stats = self.g.stats()
        self.assertEqual(stats["edges_by_type"].get("has_vuln", 0), 1)

    def test_edge_related_cve(self):
        self.g._add_indexed_node("finding", "f1")
        cve = self.g.add_cve("CVE-2024-0001")
        self.g._add_indexed_edge("finding:f1", cve, "related_cve")
        stats = self.g.stats()
        self.assertEqual(stats["edges_by_type"].get("related_cve", 0), 1)

    def test_edge_exposes(self):
        self.g._add_indexed_node("target", "t")
        ep = self.g._add_indexed_node("endpoint", "e")
        self.g._add_indexed_edge("target:t", ep, "exposes")
        stats = self.g.stats()
        self.assertEqual(stats["edges_by_type"].get("exposes", 0), 1)

    def test_edge_uses_tech(self):
        self.g._add_indexed_node("target", "t")
        tech = self.g._add_indexed_node("technology", "react")
        self.g._add_indexed_edge("target:t", tech, "uses_tech")
        stats = self.g.stats()
        self.assertEqual(stats["edges_by_type"].get("uses_tech", 0), 1)

    def test_edge_links_to(self):
        self.g._add_indexed_node("asset", "a")
        self.g._add_indexed_node("asset", "b")
        self.g._add_indexed_edge("asset:a", "asset:b", "links_to")
        stats = self.g.stats()
        self.assertEqual(stats["edges_by_type"].get("links_to", 0), 1)

    def test_edge_has_cert(self):
        self.g._add_indexed_node("target", "t")
        cert = self.g._add_indexed_node("certificate", "c")
        self.g._add_indexed_edge("target:t", cert, "has_cert")
        stats = self.g.stats()
        self.assertEqual(stats["edges_by_type"].get("has_cert", 0), 1)


# ═══════════════════════════════════════════════════════════════════════
#  Attack Surface & Blast Radius
# ═══════════════════════════════════════════════════════════════════════

class TestAttackSurface(unittest.TestCase):
    """get_attack_surface and get_blast_radius."""

    def setUp(self):
        self.g = SecurityKnowledgeGraph()

    def test_empty_target_returns_empty(self):
        result = self.g.get_attack_surface("nonexistent.com")
        self.assertEqual(result["endpoints"], [])
        self.assertEqual(result["ports"], [])
        self.assertEqual(result["vulnerabilities"], [])
        self.assertEqual(result["technologies"], [])

    def test_attack_surface_with_data(self):
        self.g.add_scan_result({
            "target": "ascan.com",
            "findings": [{"title": "XSS", "severity": "high", "target": "ascan.com"}],
            "ports": [{"port": 80, "service": "http", "state": "open"}],
            "technologies": ["nginx"],
            "endpoints": [{"path": "/api", "method": "POST"}],
        })
        surface = self.g.get_attack_surface("ascan.com")
        self.assertGreater(len(surface["vulnerabilities"]), 0)
        self.assertGreater(len(surface["ports"]), 0)
        self.assertGreater(len(surface["technologies"]), 0)
        self.assertGreater(len(surface["endpoints"]), 0)

    def test_blast_radius_empty(self):
        result = self.g.get_blast_radius("nonexistent")
        self.assertEqual(result, [])

    def test_blast_radius_with_vulns(self):
        self.g.add_scan_result({
            "target": "blast.com",
            "findings": [
                {"title": "SQLi", "severity": "critical", "target": "blast.com"},
                {"title": "XSS", "severity": "high", "target": "blast.com"},
            ],
        })
        radius = self.g.get_blast_radius("blast.com")
        self.assertGreater(len(radius), 0)
        severities = [r.get("severity") for r in radius]
        self.assertIn("critical", severities)
        self.assertIn("high", severities)


# ═══════════════════════════════════════════════════════════════════════
#  Attack Chain Discovery
# ═══════════════════════════════════════════════════════════════════════

class TestFindChains(unittest.TestCase):
    """find_chains should discover multi-hop attack paths."""

    def setUp(self):
        self.g = SecurityKnowledgeGraph()

    def test_no_chains_for_empty_graph(self):
        chains = self.g.find_chains("nonexistent")
        self.assertEqual(chains, [])

    def test_chains_to_cve(self):
        """Target → port → finding → CVE should form a chain to CVE."""
        self.g._add_indexed_node("target", "chain.com")
        self.g._add_indexed_node("port", "chain.com:80")
        self.g._add_indexed_edge("target:chain.com", "port:chain.com:80", "has_port")
        # Use severity=info for finding so DFS continues past it to the CVE
        self.g._add_indexed_node("finding", "chain.com:SQLi", severity="info")
        self.g._add_indexed_edge("port:chain.com:80", "finding:chain.com:SQLi", "has_vuln")
        cve_id = self.g.add_cve("CVE-2024-CHAIN", severity="critical")
        self.g._add_indexed_edge("finding:chain.com:SQLi", cve_id, "related_cve")

        chains = self.g.find_chains("chain.com")
        self.assertGreater(len(chains), 0)
        # Verify chain reaches the CVE node
        last_nodes = [c[-1].get("label", c[-1].get("node_id", "")) for c in chains]
        self.assertTrue(any("CVE-2024-CHAIN" in n for n in last_nodes))

    def test_chains_sorted_by_severity(self):
        """Chains should be sorted by terminal node severity (desc)."""
        self.g._add_indexed_node("target", "sort.com")
        self.g._add_indexed_node("finding", "sort.com:Low", severity="low")
        self.g._add_indexed_edge("target:sort.com", "finding:sort.com:Low", "has_vuln")
        self.g._add_indexed_node("finding", "sort.com:Critical", severity="critical")
        self.g._add_indexed_edge("target:sort.com", "finding:sort.com:Critical", "has_vuln")

        chains = self.g.find_chains("sort.com")
        if len(chains) >= 2:
            first_sev = SEVERITY_ORDER.get(
                self.g._safe_sev(chains[0][-1].get("severity")), 0
            )
            last_sev = SEVERITY_ORDER.get(
                self.g._safe_sev(chains[-1][-1].get("severity")), 0
            )
            self.assertGreaterEqual(first_sev, last_sev)


# ═══════════════════════════════════════════════════════════════════════
#  Vulnerable Assets & Correlation
# ═══════════════════════════════════════════════════════════════════════

class TestVulnerableAssets(unittest.TestCase):
    """get_vulnerable_assets and correlate."""

    def setUp(self):
        self.g = SecurityKnowledgeGraph()

    def test_no_vulnerable_assets_empty(self):
        self.assertEqual(self.g.get_vulnerable_assets(), [])

    def test_vulnerable_assets_detected(self):
        self.g.add_scan_result({
            "target": "vuln-assets.com",
            "findings": [
                {"title": "RCE", "severity": "critical", "target": "vuln-assets.com"},
            ],
        })
        vuln = self.g.get_vulnerable_assets()
        self.assertGreater(len(vuln), 0)

    def test_correlate_empty(self):
        self.assertEqual(self.g.correlate(), [])

    def test_correlate_shared_technology(self):
        """Two findings sharing a technology should be correlated."""
        tech_id = self.g._add_indexed_node("technology", "php")
        f1 = self.g._add_indexed_node("finding", "xss", severity="high")
        f2 = self.g._add_indexed_node("finding", "sqli", severity="high")
        self.g._add_indexed_edge(tech_id, f1, "exposes")
        self.g._add_indexed_edge(tech_id, f2, "exposes")
        suggestions = self.g.correlate()
        self.assertGreater(len(suggestions), 0)
        self.assertEqual(suggestions[0]["relationship"], "shared_technology")


# ═══════════════════════════════════════════════════════════════════════
#  Serialization & Deserialization
# ═══════════════════════════════════════════════════════════════════════

class TestSerialization(_TempGraphDirMixin, unittest.TestCase):
    """Save, load, to_cypher, and to_dict."""

    def _seed_graph(self):
        g = SecurityKnowledgeGraph()
        g.add_scan_result({
            "target": "serial.com",
            "findings": [{"title": "Test", "severity": "high", "target": "serial.com"}],
            "ports": [{"port": 443, "service": "https", "state": "open"}],
            "technologies": ["nginx"],
        })
        return g

    def test_save_and_load_roundtrip(self):
        g1 = self._seed_graph()
        path = g1.save(path=os.path.join(self._tmpdir, "rt_graph.json"))
        self.assertTrue(os.path.isfile(path))

        g2 = SecurityKnowledgeGraph()
        g2.load(path=path)

        stats1 = g1.stats()
        stats2 = g2.stats()
        self.assertEqual(stats1["total_nodes"], stats2["total_nodes"])
        self.assertEqual(stats1["total_edges"], stats2["total_edges"])

    def test_to_cypher_produces_create_statements(self):
        g = self._seed_graph()
        cypher = g.to_cypher()
        self.assertIsInstance(cypher, str)
        self.assertIn("CREATE", cypher)

    def test_to_cypher_empty_graph(self):
        g = SecurityKnowledgeGraph()
        cypher = g.to_cypher()
        # Empty graph still valid string
        self.assertIsInstance(cypher, str)

    def test_stats_after_data(self):
        g = self._seed_graph()
        stats = g.stats()
        self.assertGreater(stats["total_nodes"], 0)
        self.assertGreater(stats["total_edges"], 0)
        self.assertIn("nodes_by_type", stats)
        self.assertIn("edges_by_type", stats)
        self.assertIn("severity_distribution", stats)


# ═══════════════════════════════════════════════════════════════════════
#  Fallback Graph (_FallbackDiGraph)
# ═══════════════════════════════════════════════════════════════════════

class TestFallbackDiGraph(unittest.TestCase):
    """Pure-Python fallback graph implementation."""

    def test_add_and_has_node(self):
        fg = _FallbackDiGraph()
        fg.add_node("a", key="val")
        self.assertTrue(fg.has_node("a"))
        self.assertFalse(fg.has_node("b"))

    def test_add_node_attributes(self):
        fg = _FallbackDiGraph()
        fg.add_node("a", x=1)
        fg.add_node("a", y=2)
        data = fg.get_node_data("a")
        self.assertEqual(data["x"], 1)
        self.assertEqual(data["y"], 2)

    def test_add_edge_creates_nodes(self):
        fg = _FallbackDiGraph()
        fg.add_edge("u", "v", weight=5)
        self.assertTrue(fg.has_node("u"))
        self.assertTrue(fg.has_node("v"))

    def test_successors_and_predecessors(self):
        fg = _FallbackDiGraph()
        fg.add_edge("a", "b")
        fg.add_edge("a", "c")
        self.assertCountEqual(fg.successors("a"), ["b", "c"])
        self.assertCountEqual(fg.predecessors("b"), ["a"])

    def test_remove_node_cleans_edges(self):
        fg = _FallbackDiGraph()
        fg.add_edge("a", "b")
        fg.add_edge("a", "c")
        fg.remove_node("a")
        self.assertFalse(fg.has_node("a"))
        self.assertEqual(fg.predecessors("b"), [])
        self.assertEqual(fg.predecessors("c"), [])

    def test_nodes_with_data(self):
        fg = _FallbackDiGraph()
        fg.add_node("a", k=1)
        result = fg.nodes(data=True)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0][0], "a")

    def test_nodes_without_data(self):
        fg = _FallbackDiGraph()
        fg.add_node("a")
        fg.add_node("b")
        result = fg.nodes(data=False)
        self.assertCountEqual(result, ["a", "b"])

    def test_edges_with_data(self):
        fg = _FallbackDiGraph()
        fg.add_edge("a", "b", weight=10)
        result = fg.edges(data=True)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0][0], "a")
        self.assertEqual(result[0][1], "b")
        self.assertEqual(result[0][2]["weight"], 10)

    def test_subgraph(self):
        fg = _FallbackDiGraph()
        fg.add_edge("a", "b")
        fg.add_edge("b", "c")
        fg.add_edge("c", "d")
        sub = fg.subgraph({"a", "b", "c"})
        self.assertTrue(sub.has_node("a"))
        self.assertTrue(sub.has_node("b"))
        self.assertTrue(sub.has_node("c"))
        self.assertFalse(sub.has_node("d"))
        # Edge a->b should be present in subgraph
        self.assertIn("b", sub.successors("a"))

    def test_to_dict_and_from_dict_roundtrip(self):
        fg = _FallbackDiGraph()
        fg.add_node("a", color="red")
        fg.add_edge("a", "b", weight=5)
        data = fg.to_dict()
        self.assertIn("nodes", data)
        self.assertIn("edges", data)
        fg2 = _FallbackDiGraph.from_dict(data)
        self.assertTrue(fg2.has_node("a"))
        self.assertIn("b", fg2.successors("a"))

    def test_out_edges(self):
        fg = _FallbackDiGraph()
        fg.add_edge("a", "b")
        fg.add_edge("a", "c")
        edges = fg.out_edges("a")
        self.assertCountEqual(edges, [("a", "b"), ("a", "c")])

    def test_in_edges(self):
        fg = _FallbackDiGraph()
        fg.add_edge("a", "b")
        fg.add_edge("c", "b")
        edges = fg.in_edges("b")
        self.assertCountEqual(edges, [("a", "b"), ("c", "b")])


# ═══════════════════════════════════════════════════════════════════════
#  Helpers & Constants
# ═══════════════════════════════════════════════════════════════════════

class TestHelpers(unittest.TestCase):
    """Constants and helper methods."""

    def test_node_types_set(self):
        expected = {
            "target", "subdomain", "port", "service", "vulnerability",
            "finding", "cve", "asset", "endpoint", "technology", "certificate",
        }
        self.assertEqual(NODE_TYPES, expected)

    def test_edge_types_set(self):
        expected = {
            "has_subdomain", "runs_on", "has_port", "has_vuln",
            "related_cve", "exposes", "uses_tech", "links_to", "has_cert",
        }
        self.assertEqual(EDGE_TYPES, expected)

    def test_severity_order(self):
        self.assertEqual(SEVERITY_ORDER["info"], 0)
        self.assertEqual(SEVERITY_ORDER["low"], 1)
        self.assertEqual(SEVERITY_ORDER["medium"], 2)
        self.assertEqual(SEVERITY_ORDER["high"], 3)
        self.assertEqual(SEVERITY_ORDER["critical"], 4)

    def test_safe_sev_normalizes(self):
        g = SecurityKnowledgeGraph()
        self.assertEqual(g._safe_sev("CRITICAL"), "critical")
        self.assertEqual(g._safe_sev(" High "), "high")
        self.assertEqual(g._safe_sev(None), "info")
        self.assertEqual(g._safe_sev("unknown_value"), "info")

    def test_node_id_format(self):
        g = SecurityKnowledgeGraph()
        self.assertEqual(g._node_id("target", "example.com"), "target:example.com")
        self.assertEqual(g._node_id("port", "443"), "port:443")

    def test_resolve_node_not_found(self):
        g = SecurityKnowledgeGraph()
        self.assertIsNone(g._resolve_node("nonexistent"))

    def test_resolve_node_by_exact_id(self):
        g = SecurityKnowledgeGraph()
        g._add_indexed_node("target", "resolve.com")
        result = g._resolve_node("target:resolve.com")
        self.assertEqual(result, "target:resolve.com")

    def test_resolve_node_by_label(self):
        g = SecurityKnowledgeGraph()
        g._add_indexed_node("target", "label.com")
        result = g._resolve_node("label.com")
        self.assertEqual(result, "target:label.com")

    def test_bfs_collect(self):
        g = SecurityKnowledgeGraph()
        g._add_indexed_node("target", "bfs.com")
        g._add_indexed_node("subdomain", "www.bfs.com")
        g._add_indexed_edge("target:bfs.com", "subdomain:www.bfs.com", "has_subdomain")
        visited = g._bfs_collect("target:bfs.com", max_depth=3)
        self.assertIn("target:bfs.com", visited)
        self.assertIn("subdomain:www.bfs.com", visited)


# ═══════════════════════════════════════════════════════════════════════
#  add_scan_result (full payload)
# ═══════════════════════════════════════════════════════════════════════

class TestAddScanResult(unittest.TestCase):
    """Ingest full scan result dict."""

    def setUp(self):
        self.g = SecurityKnowledgeGraph()

    def test_full_scan_result(self):
        self.g.add_scan_result({
            "target": "full.com",
            "subdomains": ["www.full.com", "api.full.com"],
            "ports": [
                {"port": 80, "service": "http", "state": "open"},
                {"port": 443, "service": "https", "state": "open"},
            ],
            "technologies": ["nginx", "React"],
            "findings": [
                {
                    "title": "Missing HSTS",
                    "severity": "medium",
                    "target": "full.com",
                    "category": "headers",
                },
                {
                    "title": "Open Redis",
                    "severity": "critical",
                    "target": "full.com",
                    "port": 6379,
                    "category": "network",
                    "cves": [{"id": "CVE-2023-REDIS", "severity": "high"}],
                },
            ],
            "certificates": [{"common_name": "*.full.com", "issuer": "Let's Encrypt"}],
            "endpoints": [{"path": "/api/v1/users", "method": "GET"}],
        })
        stats = self.g.stats()
        self.assertGreater(stats["total_nodes"], 5)
        self.assertGreater(stats["total_edges"], 5)

    def test_scan_result_with_string_ports(self):
        """Port entries as plain numbers should work."""
        self.g.add_scan_result({
            "target": "sport.com",
            "ports": [80, 443],
        })
        surface = self.g.get_attack_surface("sport.com")
        self.assertEqual(len(surface["ports"]), 2)


if __name__ == "__main__":
    unittest.main()
