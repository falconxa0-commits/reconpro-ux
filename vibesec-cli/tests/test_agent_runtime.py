"""Tests for the Agent Runtime module (Council Eta - Age V)."""

import unittest
from unittest.mock import patch, MagicMock, PropertyMock

from reconpro.agent_runtime import (
    AgentMessage,
    AgentContext,
    AgentResult,
    AgentRole,
    AgentBase,
    PlannerAgent,
    ReconAgent,
    IntelligenceAgent,
    CorrelationAgent,
    ReportingAgent,
    AgentOrchestrator,
    AutonomousScanReport,
)


class TestAgentMessage(unittest.TestCase):
    """Tests for AgentMessage creation and fields."""

    def test_message_creation_defaults(self):
        msg = AgentMessage(sender="a", recipient="b", msg_type="task_request", payload={})
        self.assertEqual(msg.sender, "a")
        self.assertEqual(msg.recipient, "b")
        self.assertEqual(msg.msg_type, "task_request")
        self.assertEqual(msg.payload, {})
        self.assertIsNotNone(msg.correlation_id)
        self.assertGreater(msg.timestamp, 0)
        self.assertIsNone(msg.in_reply_to)

    def test_message_custom_correlation_id(self):
        msg = AgentMessage(
            sender="a", recipient="b", msg_type="result",
            payload={"data": 1}, correlation_id="custom-123",
        )
        self.assertEqual(msg.correlation_id, "custom-123")

    def test_message_in_reply_to(self):
        msg = AgentMessage(
            sender="b", recipient="a", msg_type="result",
            payload={}, in_reply_to="corr-456",
        )
        self.assertEqual(msg.in_reply_to, "corr-456")


class TestAgentContext(unittest.TestCase):
    """Tests for AgentContext dataclass."""

    def test_context_defaults(self):
        ctx = AgentContext(agent_id="p1", role="planner", target="example.com")
        self.assertEqual(ctx.agent_id, "p1")
        self.assertEqual(ctx.role, "planner")
        self.assertEqual(ctx.target, "example.com")
        self.assertEqual(ctx.findings, [])
        self.assertIsNone(ctx.memory_ref)
        self.assertEqual(ctx.status, "idle")

    def test_context_with_findings(self):
        findings = [{"title": "XSS", "severity": "high"}]
        ctx = AgentContext(agent_id="r1", role="recon", target="x", findings=findings)
        self.assertEqual(len(ctx.findings), 1)


class TestAgentResult(unittest.TestCase):
    """Tests for AgentResult creation and serialization."""

    def test_result_creation(self):
        r = AgentResult(
            agent_id="p1", role="planner",
            findings=[{"title": "Plan"}],
            confidence=0.9, processing_time_ms=42.5,
        )
        self.assertEqual(r.agent_id, "p1")
        self.assertEqual(len(r.findings), 1)
        self.assertAlmostEqual(r.confidence, 0.9)

    def test_result_to_dict(self):
        r = AgentResult(agent_id="r1", role="recon", confidence=0.85)
        d = r.to_dict()
        self.assertEqual(d["agent_id"], "r1")
        self.assertEqual(d["role"], "recon")
        self.assertIn("confidence", d)
        self.assertIn("processing_time_ms", d)
        self.assertIn("metadata", d)


class TestPlannerAgent(unittest.TestCase):
    """Tests for PlannerAgent.execute()."""

    def test_execute_returns_agent_result(self):
        agent = PlannerAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="planner", target="example.com"))
        result = agent.execute({"goal": "recon example.com", "target": "example.com"})
        self.assertIsInstance(result, AgentResult)
        self.assertEqual(result.role, AgentRole.PLANNER)
        self.assertGreater(len(result.findings), 0)
        self.assertGreater(result.confidence, 0)
        self.assertGreater(result.processing_time_ms, 0)

    def test_execute_produces_plan_in_metadata(self):
        agent = PlannerAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="planner", target="x"))
        result = agent.execute({"goal": "audit x", "target": "x"})
        self.assertIn("plan", result.metadata)
        plan = result.metadata["plan"]
        self.assertIn("modules", plan)
        self.assertIn("target", plan)

    def test_execute_local_goal_uses_local_modules(self):
        agent = PlannerAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="planner", target="localhost"))
        result = agent.execute({"goal": "local audit", "target": "localhost"})
        plan = result.metadata.get("plan", {})
        # Heuristic fallback should select local modules.
        if plan.get("target_type") == "local":
            self.assertTrue(any(m in plan.get("modules", []) for m in ("host", "dev", "doctor")))


class TestReconAgent(unittest.TestCase):
    """Tests for ReconAgent.execute()."""

    @patch("reconpro.scanner.scan")
    def test_execute_remote_target(self, mock_scan):
        mock_result = MagicMock()
        mock_result.findings = [{"title": "Open Port 22", "severity": "medium", "category": "network"}]
        mock_result.modules_run = ["recon"]
        mock_result.total_score = 85
        mock_result.grade = "B"
        mock_scan.return_value = mock_result

        agent = ReconAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="recon", target="example.com"))
        result = agent.execute({"target": "example.com", "modules": ["recon"]})
        self.assertIsInstance(result, AgentResult)
        mock_scan.assert_called_once()

    @patch("reconpro.scanner.audit_scan")
    def test_execute_local_target(self, mock_audit_scan):
        mock_result = MagicMock()
        mock_result.findings = [{"title": "Weak Permissions", "severity": "medium"}]
        mock_result.modules_run = ["host"]
        mock_result.total_score = 70
        mock_result.grade = "C"
        mock_audit_scan.return_value = mock_result

        agent = ReconAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="recon", target="."))
        result = agent.execute({"target": "localhost"})
        self.assertIsInstance(result, AgentResult)
        mock_audit_scan.assert_called_once()

    def test_execute_no_target_returns_warning(self):
        agent = ReconAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="recon", target=""))
        result = agent.execute({"target": "", "modules": []})
        self.assertTrue(len(result.findings) >= 1)
        self.assertEqual(result.findings[0].get("category"), "recon")


class TestIntelligenceAgent(unittest.TestCase):
    """Tests for IntelligenceAgent.execute()."""

    @patch("reconpro.agent_runtime.ConfidenceEngine", create=True)
    def test_execute_with_findings(self, mock_ce_cls):
        mock_ce = MagicMock()
        mock_ce.score_findings.return_value = [
            {"title": "XSS", "severity": "high", "confidence": 0.85}
        ]
        mock_ce_cls.return_value = mock_ce

        agent = IntelligenceAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="intelligence", target="x"))
        result = agent.execute({
            "findings": [{"title": "XSS", "severity": "high"}],
            "target": "x",
        })
        self.assertIsInstance(result, AgentResult)
        self.assertGreater(result.processing_time_ms, 0)

    @patch("reconpro.agent_runtime.TargetIntelligence", create=True)
    @patch("reconpro.agent_runtime.ConfidenceEngine", create=True)
    def test_execute_with_empty_findings(self, mock_ce_cls, mock_ti_cls):
        mock_ce = MagicMock()
        mock_ce.score_findings.return_value = []
        mock_ce_cls.return_value = mock_ce

        agent = IntelligenceAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="intelligence", target="x"))
        result = agent.execute({"findings": [], "target": "x"})
        self.assertIsInstance(result, AgentResult)
        self.assertEqual(result.confidence, 0.0)


class TestCorrelationAgent(unittest.TestCase):
    """Tests for CorrelationAgent.execute()."""

    def test_execute_with_duplicate_findings(self):
        agent = CorrelationAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="correlation", target="x"))
        findings = [
            {"title": "XSS", "category": "injection", "severity": "high", "source": "auth"},
            {"title": "XSS", "category": "injection", "severity": "medium", "source": "chain"},
        ]
        result = agent.execute({"findings": findings})
        self.assertIsInstance(result, AgentResult)
        # Should detect corroborated findings.
        self.assertGreater(len(result.findings), 0)
        self.assertEqual(result.findings[0].get("type"), "corroborated")

    def test_execute_with_unique_findings(self):
        agent = CorrelationAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="correlation", target="x"))
        findings = [
            {"title": "XSS", "category": "injection", "severity": "high", "source": "auth"},
            {"title": "CSRF", "category": "auth", "severity": "medium", "source": "auth"},
        ]
        result = agent.execute({"findings": findings})
        # No corroboration -> empty findings list.
        self.assertEqual(len(result.findings), 0)
        self.assertLess(result.confidence, 0.8)

    def test_max_severity_helper(self):
        group = [
            {"severity": "low"},
            {"severity": "critical"},
            {"severity": "medium"},
        ]
        self.assertEqual(CorrelationAgent._max_severity(group), "critical")


class TestReportingAgent(unittest.TestCase):
    """Tests for ReportingAgent.execute()."""

    def test_execute_with_findings(self):
        agent = ReportingAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="reporting", target="x"))
        findings = [
            {"title": "XSS", "severity": "high", "category": "injection", "points_deducted": 10},
            {"title": "Info Leak", "severity": "medium", "category": "info_disclosure", "points_deducted": 3},
        ]
        result = agent.execute({
            "findings": findings,
            "goal": "Full scan",
            "target": "example.com",
            "confidence_profile": {"average": 0.8},
            "total_time_ms": 500.0,
        })
        self.assertIsInstance(result, AgentResult)
        self.assertEqual(result.confidence, 1.0)
        self.assertEqual(len(result.findings), 1)
        report = result.findings[0]
        self.assertEqual(report["total_findings"], 2)
        self.assertIn("severity_summary", report)

    def test_execute_empty_findings(self):
        agent = ReportingAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="reporting", target="x"))
        result = agent.execute({"findings": [], "goal": "test", "target": "x"})
        self.assertEqual(result.findings[0]["total_findings"], 0)


class TestAgentOrchestrator(unittest.TestCase):
    """Tests for AgentOrchestrator register, broadcast, and run_goal."""

    def test_register_adds_agent(self):
        orch = AgentOrchestrator()
        agent = PlannerAgent()
        orch.register(agent)
        status = orch.get_agent_status()
        self.assertIn(agent.agent_id, status)

    def test_route_message_delivers_to_agent(self):
        orch = AgentOrchestrator()
        a1 = PlannerAgent()
        a2 = ReconAgent()
        orch.register(a1)
        orch.register(a2)
        # Route a targeted message to a1.
        from reconpro.agent_runtime import AgentMessage
        msg = AgentMessage(sender="orchestrator", recipient=a1.agent_id,
                           msg_type="status_update", payload={"msg": "hello"})
        orch._route_message(msg)
        self.assertEqual(len(a1._inbox), 1)
        self.assertEqual(len(a2._inbox), 0)

    def test_route_broadcast_message(self):
        orch = AgentOrchestrator()
        a1 = PlannerAgent()
        a2 = ReconAgent()
        orch.register(a1)
        orch.register(a2)
        # Route a broadcast message to all agents.
        from reconpro.agent_runtime import AgentMessage
        msg = AgentMessage(sender="orchestrator", recipient="broadcast",
                           msg_type="status_update", payload={"msg": "hello"})
        orch._route_message(msg)
        self.assertGreater(len(a1._inbox), 0)
        self.assertGreater(len(a2._inbox), 0)

    def test_message_log_grows(self):
        orch = AgentOrchestrator()
        agent = PlannerAgent()
        orch.register(agent)
        from reconpro.agent_runtime import AgentMessage
        msg = AgentMessage(sender="orchestrator", recipient=agent.agent_id,
                           msg_type="test", payload={"data": 1})
        orch._route_message(msg)
        self.assertEqual(len(orch._message_log), 1)

    @patch("reconpro.scanner.scan")
    def test_run_goal_with_mocked_scan(self, mock_scan):
        mock_result = MagicMock()
        mock_result.findings = []
        mock_result.modules_run = ["recon"]
        mock_result.total_score = 90
        mock_result.grade = "A"
        mock_scan.return_value = mock_result

        orch = AgentOrchestrator()
        report = orch.run_goal("Quick scan", "example.com")
        self.assertIsInstance(report, dict)
        self.assertIn("goal", report)
        self.assertIn("target", report)
        self.assertEqual(report["target"], "example.com")
        self.assertIn("all_findings", report)
        self.assertIn("agent_results", report)
        # Should have results from all 5 pipeline agents.
        self.assertGreaterEqual(len(report["agent_results"]), 5)

    def test_agent_send_without_orchestrator_queues_outbox(self):
        agent = PlannerAgent()
        agent.initialize(AgentContext(agent_id=agent.agent_id, role="planner", target="x"))
        # No send_fn wired, so messages go to outbox.
        agent.send("someone", "task_request", {"data": 1})
        self.assertEqual(len(agent._outbox), 1)

    def test_autonomous_scan_report_to_dict(self):
        report = AutonomousScanReport(
            goal="test", target="x",
            agent_results=[{"role": "planner", "findings": [], "confidence": 0.9, "processing_time_ms": 1.0, "metadata": {}}],
            all_findings=[],
        )
        d = report.to_dict()
        self.assertEqual(d["goal"], "test")
        self.assertEqual(d["target"], "x")
        self.assertIn("all_findings_count", d)
        self.assertIn("timestamp", d)


if __name__ == "__main__":
    unittest.main()
