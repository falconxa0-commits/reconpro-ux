"""Nexus Agent — LLM-powered agentic security engine.

The core AI brain of ReconPro. Accepts a natural language goal, reasons about
what needs to be done, plans tool usage, executes step by step, verifies
results, and adapts the plan dynamically.

Supports three backends:
  1. OpenAI (GPT-4o-mini) — requires OPENAI_API_KEY
  2. Anthropic Claude — requires ANTHROPIC_API_KEY
  3. Rule-based planner — works with zero API keys

18 built-in tools covering scanning, recon, intel, and export.
Persistent per-target memory stored at ~/.reconpro/memory/agent_context.json.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

# ── Optional LLM dependency flags ─────────────────────────────────────

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

console = Console()
MEMORY_DIR = Path.home() / ".reconpro" / "memory"
CONTEXT_FILE = MEMORY_DIR / "agent_context.json"
MAX_ITERATIONS = 10


# ══════════════════════════════════════════════════════════════════════
#  TOOL RESULT & TOOL
# ══════════════════════════════════════════════════════════════════════


class ToolResult:
    """Result of a tool execution."""

    def __init__(self, output: str, success: bool = True, data: Any = None):
        self.output = output
        self.success = success
        self.data = data

    def to_dict(self) -> Dict:
        return {"output": self.output, "success": self.success, "data": self.data}


class Tool:
    """A callable tool the agent can use."""

    def __init__(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any],
        execute: Callable[..., ToolResult],
        category: str = "scan",
        dangerous: bool = False,
    ):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.execute = execute
        self.category = category
        self.dangerous = dangerous

    def to_openai_tool(self) -> Dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": self.parameters,
                    "required": list(self.parameters.keys()),
                },
            },
        }

    def to_anthropic_tool(self) -> Dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {
                "type": "object",
                "properties": self.parameters,
                "required": list(self.parameters.keys()),
            },
        }


class ToolRegistry:
    """Registry of all available tools."""

    def __init__(self):
        self.tools: Dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self.tools[tool.name] = tool

    def get(self, name: str) -> Optional[Tool]:
        return self.tools.get(name)

    def execute(self, name: str, **kwargs) -> ToolResult:
        tool = self.tools.get(name)
        if not tool:
            return ToolResult(f"Tool '{name}' not found.", success=False)
        try:
            return tool.execute(**kwargs)
        except Exception as e:
            return ToolResult(f"Tool error: {e}", success=False)

    def list_tools(self) -> List[Dict]:
        return [
            {"name": t.name, "description": t.description, "category": t.category}
            for t in self.tools.values()
        ]

    def to_openai_tools(self) -> List[Dict]:
        return [t.to_openai_tool() for t in self.tools.values()]

    def to_anthropic_tools(self) -> List[Dict]:
        return [t.to_anthropic_tool() for t in self.tools.values()]


# ══════════════════════════════════════════════════════════════════════
#  PERSISTENT MEMORY
# ══════════════════════════════════════════════════════════════════════


class AgentMemory:
    """Persistent memory for the Nexus agent across sessions."""

    def __init__(self):
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        self._data = self._load()

    def _load(self) -> Dict:
        if CONTEXT_FILE.exists():
            try:
                return json.loads(CONTEXT_FILE.read_text())
            except Exception:
                pass
        return {
            "sessions": [],
            "target_contexts": {},
            "learned_patterns": [],
            "created": datetime.now(timezone.utc).isoformat(),
        }

    def _save(self) -> None:
        # Keep only the last 50 sessions
        if len(self._data.get("sessions", [])) > 50:
            self._data["sessions"] = self._data["sessions"][-50:]
        try:
            CONTEXT_FILE.write_text(json.dumps(self._data, indent=2, default=str))
        except OSError:
            pass

    def save_session(
        self,
        goal: str,
        target: str,
        plan: List[Dict],
        tool_results: List[Dict],
        summary: str,
    ) -> None:
        session = {
            "goal": goal,
            "target": target,
            "plan": plan,
            "tool_results": tool_results,
            "summary": summary,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._data.setdefault("sessions", []).append(session)
        # Update target context
        self._data.setdefault("target_contexts", {})[target] = {
            "last_score": self._extract_score(tool_results),
            "last_grade": self._extract_grade(tool_results),
            "last_run": session["timestamp"],
            "finding_count": self._extract_finding_count(tool_results),
            "known_issues": self._extract_issues(tool_results),
        }
        self._save()

    def get_target_context(self, target: str) -> Optional[Dict]:
        return self._data.get("target_contexts", {}).get(target)

    def get_recent_sessions(self, limit: int = 5) -> List[Dict]:
        return self._data.get("sessions", [])[-limit:]

    @staticmethod
    def _extract_score(results: List[Dict]) -> Optional[int]:
        for r in results:
            d = r.get("data")
            if isinstance(d, dict) and "total_score" in d:
                return d["total_score"]
        return None

    @staticmethod
    def _extract_grade(results: List[Dict]) -> Optional[str]:
        for r in results:
            d = r.get("data")
            if isinstance(d, dict) and "grade" in d:
                return d["grade"]
        return None

    @staticmethod
    def _extract_finding_count(results: List[Dict]) -> int:
        total = 0
        for r in results:
            d = r.get("data")
            if isinstance(d, dict) and "findings" in d:
                total += len(d["findings"])
        return total

    @staticmethod
    def _extract_issues(results: List[Dict]) -> List[str]:
        issues = []
        for r in results:
            d = r.get("data")
            if isinstance(d, dict) and "findings" in d:
                for f in d["findings"]:
                    if isinstance(f, dict) and f.get("severity") in ("critical", "high"):
                        issues.append(f.get("title", ""))
        return issues[:20]


# ══════════════════════════════════════════════════════════════════════
#  TOOL IMPLEMENTATIONS (18 tools)
# ══════════════════════════════════════════════════════════════════════


def _tool_remote_scan(
    target: str = "",
    modules: str = "",
    all_modules: bool = False,
    timeout: int = 10,
) -> ToolResult:
    """Full remote scan of a target domain/URL."""
    from .scanner import scan
    if not target:
        return ToolResult("No target specified.", success=False)
    mod_list = [m.strip().lower() for m in modules.split(",") if m.strip()] if modules else None
    result = scan(target, modules=mod_list, all_modules=all_modules, timeout=timeout)
    return ToolResult(
        f"Scanned {target}. Score: {result.total_score}/100 ({result.grade}). "
        f"{len(result.findings)} findings.",
        success=True,
        data=result.to_dict(),
    )


def _tool_vibesec_benchmark(target: str = "") -> ToolResult:
    """Quick VibeSec score check."""
    from .scanner import scan
    if not target:
        return ToolResult("No target specified.", success=False)
    result = scan(target, modules=["vibesec"])
    score = result.vibesec_score or result.total_score
    grade = result.vibesec_grade or result.grade
    return ToolResult(
        f"VibeSec benchmark for {target}: {score}/100 ({grade}).",
        success=True,
        data={
            "target": target, "vibesec_score": score,
            "vibesec_grade": grade, "findings": result.findings,
        },
    )


def _tool_local_audit(target_path: str = ".") -> ToolResult:
    """Full machine audit."""
    from .scanner import audit_scan
    result = audit_scan(target=target_path, all_modules=True)
    return ToolResult(
        f"Local audit of {target_path}. Score: {result.total_score}/100 ({result.grade}). "
        f"{len(result.findings)} findings.",
        success=True,
        data=result.to_dict(),
    )


def _tool_dev_scan(path: str = ".") -> ToolResult:
    """Developer project scan."""
    from .scanner import audit_scan
    result = audit_scan(target=path, modules=["dev"])
    return ToolResult(
        f"Dev scan of {path}. Score: {result.total_score}/100 ({result.grade}). "
        f"{len(result.findings)} findings.",
        success=True,
        data=result.to_dict(),
    )


def _tool_doctor_check() -> ToolResult:
    """Health check with fix suggestions."""
    from .scanner import audit_scan
    result = audit_scan(target="localhost", modules=["doctor"])
    return ToolResult(
        f"Doctor check complete. Score: {result.total_score}/100 ({result.grade}). "
        f"{len(result.findings)} findings.",
        success=True,
        data=result.to_dict(),
    )


def _tool_port_scan() -> ToolResult:
    """Check for open and risky ports on the local machine."""
    from .modules.host import _check_open_ports
    findings = _check_open_ports()
    if not findings:
        return ToolResult("No risky ports found.", success=True, data=[])
    lines = [f"{f.severity.upper()}: {f.title}" for f in findings]
    return ToolResult(
        f"Found {len(findings)} port issue(s):\n" + "\n".join(lines),
        success=True,
        data=[f.to_dict() for f in findings],
    )


def _tool_secret_hunt(path: str = ".") -> ToolResult:
    """Find secrets and credentials in a directory."""
    from .modules.host import _check_env_secrets
    from .modules.dev import _check_env_files, _check_hardcoded_secrets
    abs_path = os.path.abspath(path)
    all_f = (
        _check_env_secrets()
        + _check_env_files(abs_path)
        + _check_hardcoded_secrets(abs_path)
    )
    if not all_f:
        return ToolResult("No secrets found.", success=True, data=[])
    lines = [f"{f.severity.upper()}: {f.title}" for f in all_f[:20]]
    return ToolResult(
        f"Found {len(all_f)} secret(s):\n" + "\n".join(lines),
        success=True,
        data=[f.to_dict() for f in all_f],
    )


def _tool_subdomain_discover(domain: str = "") -> ToolResult:
    """Discover subdomains via CT logs and DNS."""
    from .subdomains import discover_subdomains
    if not domain:
        return ToolResult("No domain specified.", success=False)
    subs = discover_subdomains(domain)
    return ToolResult(
        f"Found {len(subs)} subdomain(s): {', '.join(subs[:20])}",
        success=True,
        data={"subdomains": subs},
    )


def _tool_blitz_scan(targets_str: str = "") -> ToolResult:
    """Parallel multi-target scan."""
    from .parallel import blitz_scan
    target_list = [t.strip() for t in targets_str.split(",") if t.strip()]
    if len(target_list) < 2:
        return ToolResult("Blitz requires at least 2 comma-separated targets.", success=False)
    result = blitz_scan(target_list, max_workers=min(4, len(target_list)), save=True)
    return ToolResult(
        f"Blitz: {result.get('total_findings', 0)} findings across "
        f"{result.get('targets_scanned', 0)} targets.",
        success=True,
        data=result,
    )


def _tool_ast_analyze(path: str = ".") -> ToolResult:
    """AST code analysis for security anti-patterns."""
    from .modules.ast_analyzer import ASTAnalyzer
    analyzer = ASTAnalyzer()
    findings = analyzer.analyze_directory(path)
    if not findings:
        return ToolResult(f"No code issues found in {path}.", success=True, data=[])
    summary = analyzer.summary()
    lines = [f"{f.severity.upper()}: {f.title} ({f.asset})" for f in findings[:20]]
    return ToolResult(
        f"AST analysis of {path}: {summary['total']} findings.\n" + "\n".join(lines),
        success=True,
        data={
            "findings": [f.to_dict() for f in findings],
            "summary": summary,
        },
    )


def _tool_cve_enrich(findings_json: str = "[]") -> ToolResult:
    """Enrich findings with CVE data from NVD."""
    from .cve_radar import CVERadar
    try:
        findings = json.loads(findings_json)
    except (json.JSONDecodeError, TypeError):
        return ToolResult("Invalid findings JSON.", success=False)
    if not findings or not isinstance(findings, list):
        return ToolResult("Empty or invalid findings list.", success=False)
    radar = CVERadar()
    enriched = radar.bulk_enrich(findings[:30])
    threat = radar.threat_summary(enriched)
    cve_count = threat.get("unique_cves_found", 0)
    return ToolResult(
        f"Enriched {len(enriched)} findings. Found {cve_count} unique CVEs. "
        f"{threat.get('recommendation', '')}",
        success=True,
        data={"enriched_findings": enriched, "threat_summary": threat},
    )


def _tool_knowledge_graph(action: str = "build", target: str = "") -> ToolResult:
    """Build or query the security knowledge graph."""
    from .knowledge_graph import SecurityKnowledgeGraph
    if not target:
        return ToolResult("No target specified.", success=False)
    kg = SecurityKnowledgeGraph()
    if action == "build":
        from .history import get_latest
        latest = get_latest(target=target)
        if not latest:
            latest = get_latest()
        if latest:
            kg.add_scan_result(latest)
        n_count = len(list(kg._g.nodes(data=False)))
        e_count = len(list(kg._g.edges(data=False)))
        return ToolResult(
            f"Knowledge graph built: {n_count} nodes, {e_count} edges for {target}.",
            success=True,
            data={"node_count": n_count, "edge_count": e_count, "target": target},
        )
    elif action == "attack_chains":
        chains = kg.find_attack_chains(max_depth=4)
        return ToolResult(
            f"Found {len(chains)} attack chain(s).", success=True,
            data={"attack_chains": chains},
        )
    else:
        return ToolResult(f"Unknown action: {action}. Use 'build' or 'attack_chains'.", success=False)


def _tool_adversarial_loop(target: str = "", rounds: int = 2) -> ToolResult:
    """Run hacker-coder-guardian adversarial loop."""
    from .adversarial import run_adversarial
    if not target:
        return ToolResult("No target specified.", success=False)
    is_local = target in ("localhost", ".", "local", "my machine")
    result = run_adversarial(target, max_rounds=rounds, is_local=is_local)
    return ToolResult(
        f"Adversarial loop: {result.total_findings_initial} initial findings, "
        f"{result.findings_fixed} fixed, {result.findings_unfixed} remaining. "
        f"Score: {result.initial_grade} ({result.initial_score}) -> "
        f"{result.final_grade} ({result.final_score})",
        success=True,
        data={
            "target": result.target,
            "initial_score": result.initial_score,
            "final_score": result.final_score,
            "initial_grade": result.initial_grade,
            "final_grade": result.final_grade,
            "findings_fixed": result.findings_fixed,
            "findings_unfixed": result.findings_unfixed,
            "converged": result.converged,
        },
    )


def _tool_swarm_run(target: str = "", mode: str = "recon") -> ToolResult:
    """Run the full swarm attack (SCOUT -> HACKER -> CODER -> GUARDIAN)."""
    from .swarm import run_swarm
    if not target:
        return ToolResult("No target specified.", success=False)
    result = run_swarm(target, mode=mode)
    total_findings = sum(len(a.findings) for a in result.agents.values())
    return ToolResult(
        f"Swarm complete ({mode} mode). {total_findings} total findings across "
        f"{len(result.agents)} agents.",
        success=True,
        data={
            "target": target, "mode": mode,
            "agents": {k: {"status": v.status.value, "findings_count": len(v.findings)}
                       for k, v in result.agents.items()},
        },
    )


def _tool_generate_report(format: str = "html") -> ToolResult:
    """Generate a report (HTML, MD, SARIF, JSON) from the last scan."""
    from .history import get_latest
    from .formats import export
    latest = get_latest()
    if not latest:
        return ToolResult("No scan data to export. Run a scan first.", success=False)
    target = latest.get("target", "unknown").replace(",", "").replace("/", "_")[:40]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext_map = {"html": ".html", "md": ".md", "sarif": ".sarif", "json": ".json"}
    ext = ext_map.get(format.lower(), ".html")
    filename = f"reconpro_report_{ts}_{target}{ext}"
    filepath = str(MEMORY_DIR / filename)
    path = export(latest, filepath, format=format.lower())
    return ToolResult(
        f"Report generated: {path}",
        success=True,
        data={"path": path, "format": format},
    )


def _tool_scan_history(limit: int = 10) -> ToolResult:
    """List past scans."""
    from .history import list_scans
    scans = list_scans(limit=limit)
    if not scans:
        return ToolResult("No scan history found.", success=True, data=[])
    lines = [
        f"  {s.get('total_score', '?')}/100 ({s.get('grade', '?')})  "
        f"{s.get('target', '?')[:30]}  {len(s.get('findings', []))} findings"
        for s in scans
    ]
    return ToolResult(
        f"Recent {len(scans)} scan(s):\n" + "\n".join(lines),
        success=True,
        data=scans,
    )


def _tool_diff_scans() -> ToolResult:
    """Compare the two most recent scans."""
    from .history import list_scans, diff_scans
    scans = list_scans(limit=2)
    if len(scans) < 2:
        return ToolResult("Need at least 2 scans to compare.", success=False)
    d = diff_scans(scans[0]["_file"], scans[1]["_file"])
    return ToolResult(
        f"A: {d['scan_a']['target']} {d['scan_a']['score']}/100 ({d['scan_a']['grade']})\n"
        f"B: {d['scan_b']['target']} {d['scan_b']['score']}/100 ({d['scan_b']['grade']})\n"
        f"Score change: {d['score_change']} pts | "
        f"Fixed: {len(d['fixed'])} | New: {len(d['new'])} | Persistent: {len(d['persistent'])}",
        success=True,
        data=d,
    )


def _tool_shell_command(command: str = "") -> ToolResult:
    """Run an arbitrary shell command. DANGEROUS — use with caution."""
    if not command:
        return ToolResult("No command specified.", success=False)
    dangerous_patterns = ["rm -rf /", "mkfs", "dd if=", ":(){ :|:& };:", "chmod -R 777 /"]
    for dp in dangerous_patterns:
        if dp in command:
            return ToolResult(f"Blocked dangerous command pattern: {dp}", success=False)
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=30,
        )
        output = (result.stdout + result.stderr)[:2000]
        return ToolResult(
            f"Exit code: {result.returncode}\n{output}",
            success=result.returncode == 0,
        )
    except subprocess.TimeoutExpired:
        return ToolResult("Command timed out (30s).", success=False)
    except Exception as e:
        return ToolResult(f"Command error: {e}", success=False)


# ══════════════════════════════════════════════════════════════════════
#  BUILD DEFAULT REGISTRY
# ══════════════════════════════════════════════════════════════════════


def build_registry() -> ToolRegistry:
    """Build the default tool registry with all 18 tools."""
    reg = ToolRegistry()

    reg.register(Tool(
        "remote_scan",
        "Full remote security scan of a domain or URL. Runs all enabled modules (recon, auth, "
        "chain, oblivion, etc.) and returns score, grade, and detailed findings. "
        "Use all_modules=true for maximum coverage.",
        {
            "target": {"type": "string", "description": "Domain or URL to scan"},
            "modules": {"type": "string", "description": "Comma-separated module list (optional, e.g. 'recon,auth')"},
            "all_modules": {"type": "boolean", "description": "Run all available modules"},
            "timeout": {"type": "integer", "description": "Per-request timeout in seconds (default 10)"},
        },
        _tool_remote_scan, category="scan",
    ))

    reg.register(Tool(
        "vibesec_benchmark",
        "Quick VibeSec security score benchmark. Returns a fast 0-100 score and grade "
        "for a target without running the full scan suite.",
        {
            "target": {"type": "string", "description": "Domain or URL to benchmark"},
        },
        _tool_vibesec_benchmark, category="scan",
    ))

    reg.register(Tool(
        "local_audit",
        "Full local machine security audit. Checks open ports, firewall rules, users, SSH config, "
        "Docker security, environment secrets, file permissions, cron jobs, and network config.",
        {
            "target_path": {"type": "string", "description": "Directory to audit (default: current)"},
        },
        _tool_local_audit, category="local",
    ))

    reg.register(Tool(
        "dev_scan",
        "Scan a developer project for security issues: package.json/requirements.txt vulnerabilities, "
        ".env file exposure, git secrets, Docker config, and hardcoded credentials.",
        {
            "path": {"type": "string", "description": "Project directory path (default: current)"},
        },
        _tool_dev_scan, category="scan",
    ))

    reg.register(Tool(
        "doctor_check",
        "Run security health check on the local machine. Checks password policy, disk encryption, "
        "screen auto-lock, antivirus status, system updates, and browser security settings. "
        "Provides fix suggestions for each issue.",
        {},
        _tool_doctor_check, category="local",
    ))

    reg.register(Tool(
        "port_scan",
        "Check for open and risky ports on the local machine. Identifies services that may be "
        "unnecessarily exposed (e.g., databases on public interfaces).",
        {},
        _tool_port_scan, category="recon",
    ))

    reg.register(Tool(
        "secret_hunt",
        "Hunt for secrets and credentials in a directory tree. Scans .env files, hardcoded passwords, "
        "API keys, tokens, and other sensitive values in source code.",
        {
            "path": {"type": "string", "description": "Directory to scan (default: current)"},
        },
        _tool_secret_hunt, category="recon",
    ))

    reg.register(Tool(
        "subdomain_discover",
        "Discover subdomains using certificate transparency logs (crt.sh) and DNS enumeration. "
        "Returns a list of all discovered subdomains for the given domain.",
        {
            "domain": {"type": "string", "description": "Domain to discover subdomains for"},
        },
        _tool_subdomain_discover, category="recon",
    ))

    reg.register(Tool(
        "blitz_scan",
        "Scan multiple targets in parallel using thread pools. Provide comma-separated targets. "
        "Requires at least 2 targets. Uses up to 4 parallel workers.",
        {
            "targets_str": {"type": "string", "description": "Comma-separated list of domains/URLs"},
        },
        _tool_blitz_scan, category="scan",
    ))

    reg.register(Tool(
        "ast_analyze",
        "Static AST code analysis for security anti-patterns in Python, JavaScript, and TypeScript. "
        "Detects eval/exec usage, SQL injection patterns, hardcoded secrets, weak crypto, "
        "unsafe deserialization, path traversal, command injection, and more.",
        {
            "path": {"type": "string", "description": "Directory or file to analyze (default: current)"},
        },
        _tool_ast_analyze, category="intel",
    ))

    reg.register(Tool(
        "cve_enrich",
        "Enrich a list of findings with real CVE data from the NVD (National Vulnerability Database). "
        "Takes a JSON array of finding dicts and returns enriched findings with CVE references, "
        "CVSS scores, and a threat intelligence summary.",
        {
            "findings_json": {"type": "string", "description": "JSON array of finding dicts to enrich"},
        },
        _tool_cve_enrich, category="intel",
    ))

    reg.register(Tool(
        "knowledge_graph",
        "Build or query the security knowledge graph. 'build' action ingests scan results into a graph. "
        "'attack_chains' action discovers potential attack paths through the graph.",
        {
            "action": {"type": "string", "description": "Action: 'build' or 'attack_chains'"},
            "target": {"type": "string", "description": "Target domain the graph is for"},
        },
        _tool_knowledge_graph, category="intel",
    ))

    reg.register(Tool(
        "adversarial_loop",
        "Run the hacker-coder-guardian adversarial remediation loop. HACKER finds vulnerabilities, "
        "CODER generates fix commands, GUARDIAN verifies fixes. Repeats for multiple rounds.",
        {
            "target": {"type": "string", "description": "Domain/URL or 'localhost' for local audit"},
            "rounds": {"type": "integer", "description": "Number of HACKER->CODER->GUARDIAN rounds (default 2)"},
        },
        _tool_adversarial_loop, category="scan",
    ))

    reg.register(Tool(
        "swarm_run",
        "Run the full multi-agent swarm attack system. Orchestrates SCOUT (recon), HACKER (deep vuln), "
        "CODER (remediation), and GUARDIAN (verification) agents in parallel. "
        "Modes: 'full', 'recon', 'attack', 'fix', 'verify'.",
        {
            "target": {"type": "string", "description": "Domain or URL to attack"},
            "mode": {"type": "string", "description": "Swarm mode: 'full', 'recon', 'attack', 'fix', or 'verify'"},
        },
        _tool_swarm_run, category="scan",
    ))

    reg.register(Tool(
        "generate_report",
        "Generate a security report from the most recent scan data. Supports HTML, Markdown, SARIF, "
        "and JSON formats. SARIF is compatible with GitHub Code Scanning.",
        {
            "format": {"type": "string", "description": "Report format: 'html', 'md', 'sarif', or 'json'"},
        },
        _tool_generate_report, category="export",
    ))

    reg.register(Tool(
        "scan_history",
        "List recent scan results from local history. Shows target, score, grade, and finding count.",
        {
            "limit": {"type": "integer", "description": "Number of scans to show (default 10)"},
        },
        _tool_scan_history, category="export",
    ))

    reg.register(Tool(
        "diff_scans",
        "Compare the two most recent scans to see what changed. Shows score delta, fixed findings, "
        "new findings, and persistent issues.",
        {},
        _tool_diff_scans, category="export",
    ))

    reg.register(Tool(
        "shell_command",
        "[DANGEROUS] Execute an arbitrary shell command. Use only when other tools cannot accomplish "
        "the task. Certain destructive patterns are blocked.",
        {
            "command": {"type": "string", "description": "Shell command to execute"},
        },
        _tool_shell_command, category="system", dangerous=True,
    ))

    return reg


# ══════════════════════════════════════════════════════════════════════
#  RULE-BASED PLANNING ENGINE
# ══════════════════════════════════════════════════════════════════════


class RuleBasedPlanner:
    """Smart rule-based planner that classifies intent, generates plans,
    and adapts based on results — no LLM required.

    The planner uses a weighted intent scoring system that considers:
      - Direct keyword matches with configurable weights
      - Modifier words that boost or reduce intent scores
      - Target type classification (domain, IP, local, codebase)
      - Proximity of intent words to target words
      - Prior context from persistent memory
    """

    # Intent keyword weights: (word_pattern, base_weight)
    _INTENT_KEYWORDS: Dict[str, List[Tuple[str, float]]] = {
        "full_scan": [
            ("scan", 0.4), ("audit", 0.3), ("assess", 0.3), ("pentest", 0.5),
            ("security", 0.2), ("vuln", 0.4), ("test", 0.2),
        ],
        "subdomain_recon": [
            ("subdomain", 0.8), ("sub-domain", 0.8), ("attack surface", 0.6),
            ("enumerate", 0.5), ("discover", 0.3), ("surface map", 0.7),
        ],
        "local_audit": [
            ("machine", 0.6), ("laptop", 0.6), ("computer", 0.5), ("local", 0.6),
            ("my system", 0.7), ("this machine", 0.6), ("localhost", 0.7),
        ],
        "dev_security": [
            ("project", 0.5), ("codebase", 0.5), ("repo", 0.4), ("source code", 0.5),
            ("dependencies", 0.4), ("package", 0.3), ("code", 0.3),
        ],
        "secret_hunting": [
            ("secrets", 0.7), ("secret", 0.7), ("credential", 0.7), ("api key", 0.6), ("token", 0.5),
            ("password", 0.5), ("leak", 0.5), ("exposed", 0.3),
        ],
        "compliance": [
            ("compliance", 0.7), ("health", 0.5), ("doctor", 0.5), ("diagnos", 0.5),
            ("checkup", 0.5), ("hardening", 0.5), ("cis", 0.6), ("policy", 0.4),
        ],
        "attack_simulation": [
            ("attack", 0.6), ("exploit", 0.6), ("hack", 0.5), ("swarm", 0.7),
            ("adversarial", 0.7), ("red team", 0.6), ("offensive", 0.5),
        ],
        "code_analysis": [
            (" ast ", 0.7), ("static analysis", 0.5), ("code review", 0.5), ("sast", 0.7),
            ("analyze code", 0.6), ("code quality", 0.4), ("static code", 0.5),
        ],
        "threat_intel": [
            ("cve", 0.7), ("threat", 0.6), ("intel", 0.6), ("enrich", 0.5),
            ("knowledge graph", 0.7), ("graph", 0.4), ("chain", 0.3),
        ],
        "reporting": [
            ("report", 0.7), ("html", 0.4), ("sarif", 0.6), ("pdf", 0.4),
            ("markdown", 0.4), ("export", 0.5), ("document", 0.4), ("generate report", 0.7),
        ],
        "comparison": [
            ("compare", 0.7), ("diff", 0.7), ("vs", 0.5), ("versus", 0.5),
            ("trend", 0.5), ("progress", 0.3),
        ],
        "benchmarking": [
            ("benchmark", 0.7), ("score", 0.4), ("grade", 0.4), ("rating", 0.5),
            ("vibesec", 0.6), ("quick", 0.2),
        ],
    }

    # Modifier words that amplify intent
    _AMPLIFIERS = {
        "full": 1.5, "deep": 1.5, "complete": 1.4, "everything": 1.5,
        "all": 1.3, "thorough": 1.4, "comprehensive": 1.4, "maximum": 1.5,
        "aggressive": 1.3, "exhaustive": 1.5, "entire": 1.3,
    }

    # Modifier words that reduce intent
    _DAMPENERS = {
        "quick": 0.7, "fast": 0.7, "brief": 0.6, "simple": 0.7,
        "just": 0.7, "only": 0.6, "basic": 0.6, "lightweight": 0.6,
    }

    # Module-specific keywords
    _MODULE_KEYWORDS: Dict[str, List[str]] = {
        "recon": ["recon", "reconnaissance", "probe", "fingerprint"],
        "auth": ["auth", "login", "bypass", "session", "cookie"],
        "chain": ["ssrf", "chain", "redirect", "open redirect"],
        "gorgon": ["sqli", "xss", "injection", "gorgon"],
        "oblivion": ["oblivion", "dread", "deep scan", "ultimate"],
        "bot": ["bot", "crawler", "c2", "automation"],
        "nhi": ["nhi", "cloud", "identity", "oauth"],
        "vibesec": ["vibesec", "vibe", "benchmark", "score"],
    }

    def __init__(self, registry: ToolRegistry, memory: AgentMemory):
        self.registry = registry
        self.memory = memory

    def classify_intent(self, goal: str) -> Dict[str, float]:
        """Score each intent based on the goal text.

        Uses weighted keyword matching, proximity scoring, and modifiers.
        Returns a dict mapping intent names to float scores in [0, 1+].
        """
        goal_lower = goal.lower()
        # Pad for whole-word matching
        padded = f' {goal_lower} '
        scores: Dict[str, float] = {}
        words = goal_lower.split()

        # Calculate global modifier
        modifier = 1.0
        for w in words:
            if w in self._AMPLIFIERS:
                modifier = max(modifier, self._AMPLIFIERS[w])
            if w in self._DAMPENERS:
                modifier = min(modifier, self._DAMPENERS[w])

        for intent, keywords in self._INTENT_KEYWORDS.items():
            score = 0.0
            for pattern, weight in keywords:
                # Use whole-word matching to avoid false positives
                # (e.g., "repo" matching inside "report")
                if len(pattern.split()) > 1:
                    # Multi-word pattern: check substring (already specific enough)
                    matched = pattern in goal_lower
                else:
                    # Single-word pattern: check whole word with padding
                    matched = f' {pattern} ' in padded
                if matched:
                    # Boost if near a target-like word
                    proximity_boost = 1.0
                    pattern_idx = goal_lower.find(pattern)
                    for tw in (".com", ".io", ".net", ".org", "http", "localhost"):
                        tw_idx = goal_lower.find(tw)
                        if tw_idx >= 0 and abs(pattern_idx - tw_idx) < 40:
                            proximity_boost = 1.3
                            break
                    score += weight * proximity_boost
            scores[intent] = min(score * modifier, 2.0)

        return scores

    def extract_targets(self, goal: str) -> List[str]:
        """Extract targets (domains, IPs, URLs, paths) from the goal."""
        urls = re.findall(r'https?://[\w\-._~:/?#\[\]@!$&\'()*+,;=%]+', goal)
        domains = re.findall(r'[\w][\w\-]*\.[\w]{2,}(?:\.[\w]{2,})?', goal)
        skip = {
            'the', 'and', 'for', 'with', 'all', 'of', 'to', 'from', 'that', 'this',
            'scan', 'audit', 'check', 'find', 'get', 'show', 'me', 'my',
        }
        targets = list(set(
            urls + [d for d in domains if d.lower() not in skip and len(d) > 4]
        ))
        return targets

    def detect_target_type(self, goal: str, targets: List[str]) -> str:
        """Classify the target type from context."""
        goal_lower = goal.lower()
        local_indicators = [
            'machine', 'laptop', 'computer', 'local', 'my system', 'this machine',
            'localhost', 'my mac', 'my pc', 'my server',
        ]
        for ind in local_indicators:
            if ind in goal_lower:
                return "local"
        dev_indicators = ['project', 'codebase', 'repo', 'source code', 'code review']
        padded = f' {goal_lower} '
        for ind in dev_indicators:
            if f' {ind} ' in padded and not targets:
                return "codebase"
        if targets:
            for t in targets:
                if t.startswith("http"):
                    return "remote"
                if re.match(r'^\d+\.\d+\.\d+\.\d+$', t):
                    return "remote"
            return "remote"
        return "unknown"

    def detect_modules(self, goal: str) -> Optional[List[str]]:
        """Detect specific module requests from the goal text."""
        goal_lower = goal.lower()
        for mod_name, keywords in self._MODULE_KEYWORDS.items():
            for kw in keywords:
                if kw in goal_lower:
                    return [mod_name]
        return None

    def generate_plan(
        self, goal: str, scores: Dict[str, float],
        targets: List[str], target_type: str,
    ) -> List[Dict[str, Any]]:
        """Generate an ordered execution plan based on classified intents.

        Returns a list of step dicts: {"tool", "args", "reason"}
        """
        plan: List[Dict[str, Any]] = []
        domain = ""
        if targets:
            domain = targets[0].replace("https://", "").replace("http://", "").split("/")[0]

        # Sort intents by score, take significant ones
        sorted_intents = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        significant = [(name, s) for name, s in sorted_intents if s > 0.2]

        # Check prior context for this target
        prior = None
        if domain:
            prior = self.memory.get_target_context(domain)

        # ── Subdomain recon phase ──
        if any(n == "subdomain_recon" and s > 0.3 for n, s in significant):
            if domain:
                plan.append({
                    "tool": "subdomain_discover",
                    "args": {"domain": domain},
                    "reason": "User requested subdomain reconnaissance",
                })

        # ── Benchmarking ──
        if any(n == "benchmarking" and s > 0.3 for n, s in significant):
            if domain:
                plan.append({
                    "tool": "vibesec_benchmark",
                    "args": {"target": domain},
                    "reason": "User wants a quick security benchmark",
                })

        # ── Local audit ──
        if target_type == "local":
            if any(n == "compliance" and s > 0.3 for n, s in significant):
                plan.append({"tool": "doctor_check", "args": {}, "reason": "Health/compliance check requested"})
            if any(n == "local_audit" and s > 0.2 for n, s in significant):
                plan.append({"tool": "local_audit", "args": {"target_path": "."}, "reason": "Local machine audit requested"})

        # ── Dev security ──
        if target_type == "codebase" or any(n == "dev_security" and s > 0.3 for n, s in significant):
            plan.append({"tool": "dev_scan", "args": {"path": "."}, "reason": "Developer project scan requested"})

        # ── Secret hunting ──
        if any(n == "secret_hunting" and s > 0.3 for n, s in significant):
            plan.append({"tool": "secret_hunt", "args": {"path": "."}, "reason": "Secret hunting requested"})

        # ── Code analysis ──
        if any(n == "code_analysis" and s > 0.3 for n, s in significant):
            plan.append({"tool": "ast_analyze", "args": {"path": "."}, "reason": "Static code analysis requested"})

        # ── Full remote scan ──
        is_full = any(n == "full_scan" and s > 0.2 for n, s in significant)
        if targets and target_type == "remote":
            modules = self.detect_modules(goal)
            if len(targets) > 1:
                # Multiple targets → blitz (even if full_scan is set)
                plan.append({
                    "tool": "blitz_scan",
                    "args": {"targets_str": ",".join(targets)},
                    "reason": f"Multiple targets detected ({len(targets)}), using parallel blitz scan",
                })
            elif is_full or not plan:
                plan.append({
                    "tool": "remote_scan",
                    "args": {
                        "target": targets[0],
                        "modules": ",".join(modules) if modules else "",
                        "all_modules": is_full and not modules,
                    },
                    "reason": "Full remote security scan" +
                              (" with all modules" if is_full and not modules else ""),
                })

        # ── Attack simulation ──
        if any(n == "attack_simulation" and s > 0.3 for n, s in significant):
            if domain:
                plan.append({
                    "tool": "adversarial_loop",
                    "args": {"target": domain, "rounds": 2},
                    "reason": "Attack simulation / adversarial remediation requested",
                })
            elif target_type == "local":
                plan.append({
                    "tool": "adversarial_loop",
                    "args": {"target": "localhost", "rounds": 2},
                    "reason": "Local adversarial remediation loop",
                })

        # ── Swarm ──
        has_swarm_word = "swarm" in goal.lower()
        if has_swarm_word and any(n == "attack_simulation" and s > 0.3 for n, s in significant):
            if domain:
                # Replace adversarial_loop with swarm if swarm is explicitly requested
                plan = [s for s in plan if s["tool"] != "adversarial_loop"]
                plan.append({
                    "tool": "swarm_run",
                    "args": {"target": domain, "mode": "full"},
                    "reason": "Full swarm attack requested",
                })

        # ── Threat intel / CVE enrichment ──
        # Note: CVE enrichment is added dynamically by adapt_plan() after scan results.
        # If user explicitly wants knowledge graph, add it now.
        if any(n == "threat_intel" and s > 0.3 for n, s in significant):
            if domain and ("graph" in goal.lower() or "chain" in goal.lower()):
                plan.append({
                    "tool": "knowledge_graph",
                    "args": {"action": "build", "target": domain},
                    "reason": "Knowledge graph analysis requested",
                })

        # ── Comparison ──
        if any(n == "comparison" and s > 0.3 for n, s in significant):
            plan.append({"tool": "diff_scans", "args": {}, "reason": "Scan comparison requested"})

        # ── Reporting ──
        wants_report = any(n == "reporting" and s > 0.3 for n, s in significant)
        has_scan_step = any(
            s["tool"] in ("remote_scan", "local_audit", "blitz_scan", "dev_scan",
                           "vibesec_benchmark", "adversarial_loop", "swarm_run")
            for s in plan
        )
        if wants_report:
            fmt = "sarif" if "sarif" in goal.lower() else "html"
            if has_scan_step:
                plan.append({
                    "tool": "generate_report",
                    "args": {"format": fmt},
                    "reason": f"Report generation requested ({fmt})",
                })
            else:
                # No scan was run — just generate from latest history
                plan.append({
                    "tool": "generate_report",
                    "args": {"format": fmt},
                    "reason": f"Generating {fmt} report from latest scan history",
                })

        # ── Fallback: if no plan was generated ──
        if not plan:
            if targets:
                plan.append({
                    "tool": "remote_scan",
                    "args": {"target": targets[0]},
                    "reason": "Default: scanning the detected target",
                })
            elif target_type == "local":
                plan.append({"tool": "local_audit", "args": {}, "reason": "Default: auditing local machine"})
            elif target_type == "codebase":
                plan.append({"tool": "dev_scan", "args": {}, "reason": "Default: scanning developer project"})
            else:
                plan.append({"tool": "scan_history", "args": {}, "reason": "No clear target — showing scan history"})

        return plan

    def adapt_plan(
        self,
        plan: List[Dict[str, Any]],
        completed_results: List[Tuple[Dict, ToolResult]],
        current_idx: int,
    ) -> List[Dict[str, Any]]:
        """Adapt the remaining plan based on results seen so far.

        This is the 'intelligence' of the rule engine — it inspects intermediate
        results and inserts new steps or modifies remaining ones.
        """
        additions: List[Dict[str, Any]] = []
        domain = ""
        last_score = None
        has_critical = False
        total_findings = 0
        all_findings: List[Dict] = []
        subdomains_found = False

        for step, result in completed_results:
            d = result.data
            if isinstance(d, dict):
                # Extract score from scan results
                if "total_score" in d:
                    last_score = d["total_score"]
                if "vibesec_score" in d:
                    last_score = d["vibesec_score"]
                # Collect findings
                findings = d.get("findings", [])
                if isinstance(findings, list):
                    all_findings.extend(findings)
                    total_findings += len(findings)
                    for f in findings:
                        if isinstance(f, dict) and f.get("severity") in ("critical", "high"):
                            has_critical = True
                # Check for subdomains
                if "subdomains" in d and len(d["subdomains"]) > 3:
                    subdomains_found = True
                # Get target from data
                if not domain:
                    domain = d.get("target", "")

        # If any findings found → add CVE enrichment (if not already planned)
        has_any_findings = total_findings > 0
        if has_any_findings and not any(s["tool"] == "cve_enrich" for s in plan[current_idx:]):
            if all_findings:
                try:
                    findings_json = json.dumps(all_findings[:20])
                except (TypeError, ValueError):
                    findings_json = "[]"
                reason = "Enriching findings with CVE data from NVD"
                if has_critical:
                    reason = "Critical/high findings detected — enriching with CVE data"
                additions.append({
                    "tool": "cve_enrich",
                    "args": {"findings_json": findings_json},
                    "reason": reason,
                })

        # If many subdomains found and not already doing blitz → suggest blitz
        if subdomains_found and not any(s["tool"] == "blitz_scan" for s in plan[current_idx:]):
            # Don't add blitz automatically (too aggressive), but add knowledge graph
            if domain and not any(s["tool"] == "knowledge_graph" for s in plan[current_idx:]):
                additions.append({
                    "tool": "knowledge_graph",
                    "args": {"action": "build", "target": domain},
                    "reason": "Large attack surface detected — building knowledge graph",
                })

        # If score is very low → add knowledge graph
        if last_score is not None and last_score < 40:
            if domain and not any(s["tool"] == "knowledge_graph" for s in plan[current_idx:]):
                additions.append({
                    "tool": "knowledge_graph",
                    "args": {"action": "build", "target": domain},
                    "reason": f"Critical score ({last_score}/100) — analyzing attack surface via knowledge graph",
                })

        # If score is low and no adversarial loop → add one
        if last_score is not None and last_score < 50:
            if domain and not any(s["tool"] in ("adversarial_loop", "swarm_run") for s in plan + additions):
                additions.append({
                    "tool": "adversarial_loop",
                    "args": {"target": domain, "rounds": 2},
                    "reason": f"Low score ({last_score}/100) — running adversarial loop for remediation guidance",
                })

        # Insert additions after current step
        remaining = plan[current_idx + 1:]
        plan = plan[:current_idx + 1] + additions + remaining

        return plan


# ══════════════════════════════════════════════════════════════════════
#  SYSTEM PROMPT FOR LLM
# ══════════════════════════════════════════════════════════════════════


def _build_system_prompt(tool_descriptions: str, context_summary: str) -> str:
    return f"""You are RECONPRO NEXUS, an elite autonomous security AI agent. You are a senior
security consultant with 20 years of experience in offensive security, penetration
testing, and threat intelligence.

## YOUR MISSION
Analyze the user's natural language goal, then execute a sequence of security tools
to accomplish it. Think step-by-step: ANALYZE → PLAN → EXECUTE → VERIFY.

## YOUR TOOLS ({len(tool_descriptions.splitlines())} available)
{tool_descriptions}

## THINKING PROTOCOL
1. **ANALYZE**: Identify the target type (domain, IP, local, codebase), the user's
   true intent (recon, vulnerability assessment, compliance, remediation), and any
   modifiers (depth, speed, format).
2. **PLAN**: Build an ordered plan. Chain tools intelligently:
   - For full recon: subdomain_discover → remote_scan → cve_enrich → knowledge_graph → generate_report
   - For local audit: doctor_check → local_audit → secret_hunt → ast_analyze
   - For attack simulation: remote_scan → adversarial_loop or swarm_run
   - For threat intel: remote_scan → cve_enrich → knowledge_graph
3. **EXECUTE**: Call tools one at a time. Wait for results before deciding next steps.
4. **VERIFY**: After each tool result, check:
   - Did it succeed? If not, try an alternative approach.
   - Are there critical/high findings? If yes, enrich with CVEs.
   - Is the score very low (< 40)? If yes, add knowledge graph analysis.
   - Were many subdomains found? If yes, consider a follow-up scan.
5. **ADAPT**: Modify your plan based on intermediate results. Add enrichment steps
   when significant findings are discovered.

## RULES
- Max 10 tool calls unless the user explicitly requests more.
- Prioritize critical and high severity findings.
- Always generate a report (generate_report) as the final step when a scan was run.
- Use shell_command ONLY as a last resort when no other tool can accomplish the task.
- Explain your reasoning before each tool call.
- If a tool fails, try an alternative or explain why you can't proceed.

## PREVIOUS CONTEXT
{context_summary}

## OUTPUT FORMAT
After completing all steps, provide a clear summary of:
- What was analyzed
- What tools were used and what they found
- Key findings (severity + title)
- Recommendations
- Any generated reports or artifacts
"""


# ══════════════════════════════════════════════════════════════════════
#  NEXUS AGENT
# ══════════════════════════════════════════════════════════════════════


class NexusAgent:
    """The Nexus Agent — LLM-powered or rule-based agentic security engine.

    Executes a THINK → PLAN → EXECUTE → VERIFY → ADAPT loop, using either
    an LLM (OpenAI/Anthropic) or a smart rule-based planner as fallback.
    """

    def __init__(
        self,
        on_message: Optional[Callable] = None,
        on_finding: Optional[Callable] = None,
        on_status: Optional[Callable] = None,
        verbose: bool = True,
    ):
        self.registry = build_registry()
        self.memory = AgentMemory()
        self.planner = RuleBasedPlanner(self.registry, self.memory)
        self.verbose = verbose
        self.on_message = on_message or (lambda msg, style="": None)
        self.on_finding = on_finding or (lambda f: None)
        self.on_status = on_status or (lambda s: None)
        self._findings: List[Dict] = []
        self._steps: List[str] = []
        self._targets: List[str] = []
        self._tool_results: List[Dict] = []

    def _emit(self, msg: str, style: str = "") -> None:
        self.on_message(msg, style)

    def _emit_status(self, status: str) -> None:
        self.on_status(status)

    def _emit_finding(self, finding: Dict) -> None:
        self.on_finding(finding)
        self._findings.append(finding)

    def _detect_backend(self) -> str:
        """Detect which LLM backend is available."""
        if os.environ.get("OPENAI_API_KEY") and HAS_OPENAI:
            return "openai"
        if os.environ.get("ANTHROPIC_API_KEY") and HAS_ANTHROPIC:
            return "anthropic"
        return "rules"

    def execute(self, goal: str) -> Dict[str, Any]:
        """Main entry point. Execute the agent on a natural language goal."""
        backend = self._detect_backend()

        # Reset state
        self._findings = []
        self._steps = []
        self._targets = []
        self._tool_results = []

        if backend == "openai":
            self._emit("[bold cyan]NEXUS[/] | LLM: [green]OpenAI GPT-4o-mini[/]")
            result = self._execute_llm(goal, backend="openai")
        elif backend == "anthropic":
            self._emit("[bold cyan]NEXUS[/] | LLM: [green]Anthropic Claude[/]")
            result = self._execute_llm(goal, backend="anthropic")
        else:
            self._emit("[bold cyan]NEXUS[/] | Engine: [yellow]Rule-Based Planner[/]")
            self._emit("[dim]Set OPENAI_API_KEY or ANTHROPIC_API_KEY for AI mode.[/]")
            result = self._execute_rules(goal)

        # Save session to memory
        if self._targets:
            self.memory.save_session(
                goal=goal,
                target=self._targets[0] if self._targets else "unknown",
                plan=[{"step": s} for s in self._steps],
                tool_results=self._tool_results,
                summary=result.get("summary", ""),
            )

        return result

    # ── LLM EXECUTION ─────────────────────────────────────────────────

    def _execute_llm(self, goal: str, backend: str) -> Dict[str, Any]:
        """Execute using LLM tool-calling loop."""
        tool_descs = "\n".join(
            f"  - {t.name}: {t.description}" for t in self.registry.tools.values()
        )
        prior = ""
        for session in self.memory.get_recent_sessions(limit=3):
            prior += f"  - {session.get('target', '?')}: {session.get('summary', '')[:100]}\n"
        context_summary = f"Recent sessions:\n{prior}" if prior else "No prior sessions."

        system_prompt = _build_system_prompt(tool_descs, context_summary)
        messages = [{"role": "system", "content": system_prompt}]
        messages.append({"role": "user", "content": goal})

        self._print_header(goal, "LLM reasoning")

        for iteration in range(MAX_ITERATIONS):
            self._emit_status(f"LLM reasoning (step {iteration + 1})...")

            try:
                if backend == "openai":
                    response = self._call_openai(messages)
                else:
                    response = self._call_anthropic(messages)
            except Exception as e:
                self._emit(f"[red]LLM error: {e} — falling back to rule engine.[/]")
                return self._execute_rules(goal)

            if not response:
                self._emit("[yellow]LLM returned empty response — falling back to rules.[/]")
                return self._execute_rules(goal)

            content = response.get("content", "")
            tool_calls = response.get("tool_calls", [])

            # If no tool calls, the LLM is done
            if not tool_calls:
                if content:
                    self._emit(f"  [dim]{content[:500]}[/]")
                break

            # Execute each tool call
            for tc in tool_calls:
                fn_name = tc.get("function", {}).get("name", "")
                fn_args_str = tc.get("function", {}).get("arguments", "{}")
                try:
                    fn_args = json.loads(fn_args_str) if isinstance(fn_args_str, str) else fn_args_str
                except json.JSONDecodeError:
                    fn_args = {}

                self._emit(f"  [bold]{fn_name}[/]({json.dumps(fn_args)[:100]})")
                self._emit_status(f"Executing: {fn_name}")

                result = self.registry.execute(fn_name, **fn_args)
                success_mark = "[green]✓[/]" if result.success else "[red]✗[/]"
                self._emit(f"    {success_mark} {result.output[:200]}")

                self._steps.append(fn_name)
                self._collect_result(fn_name, result)

                # Feed result back to LLM
                if backend == "openai":
                    messages.append({"role": "assistant", "content": None, "tool_calls": [tc]})
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id", f"call_{fn_name}"),
                        "content": result.output[:4000],
                    })
                else:
                    messages.append({
                        "role": "user",
                        "content": f"Tool {fn_name} result: {result.output[:3000]}",
                    })

        summary = self._build_summary()
        self._print_footer(summary)
        return {
            "goal": goal,
            "steps": self._steps,
            "targets": self._targets,
            "total_findings": len(self._findings),
            "findings": self._findings,
            "summary": summary,
            "backend": backend,
        }

    def _call_openai(self, messages: List[Dict]) -> Optional[Dict]:
        """Call OpenAI API with tool calling."""
        client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        model = os.environ.get("RECONPRO_MODEL", "gpt-4o-mini")
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=self.registry.to_openai_tools(),
            tool_choice="auto",
            max_tokens=4096,
            temperature=0.1,
        )
        choice = response.choices[0]
        message = choice.message
        tool_calls = []
        if message.tool_calls:
            for tc in message.tool_calls:
                tool_calls.append({
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                })
        return {"content": message.content or "", "tool_calls": tool_calls}

    def _call_anthropic(self, messages: List[Dict]) -> Optional[Dict]:
        """Call Anthropic API with tool use."""
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        model = os.environ.get("RECONPRO_MODEL", "claude-sonnet-4-20250514")

        system_msg = ""
        anthropic_messages = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                anthropic_messages.append(m)

        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=system_msg,
            messages=anthropic_messages,
            tools=self.registry.to_anthropic_tools(),
        )

        text_parts, tool_calls = [], []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "type": "function",
                    "function": {
                        "name": block.name,
                        "arguments": json.dumps(block.input),
                    },
                })

        return {"content": "\n".join(text_parts), "tool_calls": tool_calls}

    # ── RULE-BASED EXECUTION ──────────────────────────────────────────

    def _execute_rules(self, goal: str) -> Dict[str, Any]:
        """Execute using the intelligent rule-based planner."""
        # THINK phase
        scores = self.planner.classify_intent(goal)
        targets = self.planner.extract_targets(goal)
        target_type = self.planner.detect_target_type(goal, targets)

        domain = ""
        if targets:
            domain = targets[0].replace("https://", "").replace("http://", "").split("/")[0]

        # Build intent display
        top_intents = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:4]
        intent_str = " + ".join(f"{n} ({s:.1f})" for n, s in top_intents if s > 0.1)

        self._print_header(goal, "rule-based planner")
        self._emit(f"  [THINK] Analyzing goal...")
        self._emit(f"    [dim]→ Target: {domain or target_type} ({target_type})[/]")
        if intent_str:
            self._emit(f"    [dim]→ Intent: {intent_str}[/]")
        self._emit(f"    [dim]→ Strategy: plan → execute → adapt[/]")

        # PLAN phase
        plan = self.planner.generate_plan(goal, scores, targets, target_type)
        self._emit(f"")
        self._emit(f"  [PLAN] {len(plan)} step(s):")
        for i, step in enumerate(plan, 1):
            self._emit(f"    {i}. [bold]{step['tool']}[/] — {step['reason']}")

        # EXECUTE phase with adaptation
        completed: List[Tuple[Dict, ToolResult]] = []
        step_idx = 0
        total_steps = len(plan)

        while step_idx < total_steps and step_idx < MAX_ITERATIONS:
            step = plan[step_idx]
            tool_name = step["tool"]
            args = step["args"]
            current_display = step_idx + 1

            self._emit(f"")
            self._emit(f"  [EXEC] Step {current_display}/{total_steps}: [bold]{tool_name}[/]...")
            self._emit_status(f"Executing step {current_display}/{total_steps}: {tool_name}")

            result = self.registry.execute(tool_name, **args)
            success_mark = "[green]✓[/]" if result.success else "[red]✗[/]"
            self._emit(f"    {success_mark} {result.output[:300]}")

            self._steps.append(tool_name)
            self._collect_result(tool_name, result)
            completed.append((step, result))

            # Track targets
            if tool_name in ("remote_scan", "vibesec_benchmark", "subdomain_discover",
                             "adversarial_loop", "swarm_run"):
                if domain:
                    self._targets.append(domain)
            if tool_name == "blitz_scan" and result.data:
                for t in result.data.get("results", {}):
                    self._targets.append(t)

            # VERIFY & ADAPT phase (after each step)
            old_len = len(plan)
            plan = self.planner.adapt_plan(plan, completed, step_idx)
            new_steps = len(plan) - old_len
            if new_steps > 0:
                total_steps = len(plan)
                added = plan[step_idx + 1: step_idx + 1 + new_steps]
                self._emit(f"")
                self._emit(f"  [ADAPT] Added {new_steps} step(s) based on results:")
                for a in added:
                    self._emit(f"    + [bold]{a['tool']}[/] — {a['reason']}")

            step_idx += 1

        summary = self._build_summary()
        self._print_footer(summary)
        return {
            "goal": goal,
            "steps": self._steps,
            "targets": self._targets,
            "total_findings": len(self._findings),
            "findings": self._findings,
            "summary": summary,
            "backend": "rules",
        }

    # ── RESULT COLLECTION ─────────────────────────────────────────────

    def _collect_result(self, tool_name: str, result: ToolResult) -> None:
        """Extract findings from a tool result and store them."""
        entry = {"tool": tool_name, "output": result.output[:500], "success": result.success}
        if result.data:
            entry["data"] = result.data
            if isinstance(result.data, dict):
                # Direct findings
                for f in result.data.get("findings", []):
                    if isinstance(f, dict):
                        self._emit_finding(f)
                # Blitz results
                for t, td in result.data.get("results", {}).items():
                    self._targets.append(t)
                    if isinstance(td, dict):
                        for f in td.get("findings", []):
                            if isinstance(f, dict):
                                self._emit_finding(f)
        self._tool_results.append(entry)

    # ── SUMMARY ───────────────────────────────────────────────────────

    def _build_summary(self) -> str:
        parts = [f"{len(self._findings)} findings"]
        if self._targets:
            parts.append(f"{len(set(self._targets))} target(s)")
        if self._steps:
            parts.append(f"{len(self._steps)} tool call(s)")
        return ", ".join(parts)

    # ── RICH OUTPUT ───────────────────────────────────────────────────

    def _print_header(self, goal: str, engine: str) -> None:
        """Print the agent header panel."""
        if not self.verbose:
            return
        title = Text()
        title.append(" NEXUS AGENT ", style="bold white on #1a1a2e")
        title.append(f" [{engine}]", style="dim")

        content = Text()
        content.append(f"Goal: ", style="bold")
        content.append(goal[:120], style="cyan")

        console.print(Panel(content, title=title, border_style="bright_blue", padding=(0, 1)))

    def _print_footer(self, summary: str) -> None:
        """Print the completion footer."""
        if not self.verbose:
            return
        content = Text()
        content.append(f"[DONE] ", style="bold green")
        content.append(f"Goal complete. {summary}.", style="white")

        if self._findings:
            critical = sum(1 for f in self._findings if f.get("severity") == "critical")
            high = sum(1 for f in self._findings if f.get("severity") == "high")
            if critical or high:
                content.append("\n", style="")
                if critical:
                    content.append(f"  [red]{critical} CRITICAL[/]", style="")
                if high:
                    content.append(f"  [yellow]{high} HIGH[/]", style="")

        console.print(Panel(content, border_style="green", padding=(0, 1)))


# ══════════════════════════════════════════════════════════════════════
#  MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════


def run_nexus_agent(goal: str, verbose: bool = True) -> dict:
    """Run the Nexus Agent on a goal.

    This is the main entry point for the agent system. It creates an agent,
    executes the goal, and returns a results dictionary.

    Args:
        goal: Natural language goal (e.g., "Fully recon example.com and find all vulnerabilities").
        verbose: If True, print rich output. If False, run silently.

    Returns:
        Dict with keys: goal, steps, targets, total_findings, findings, summary, backend.
    """
    if not goal or not goal.strip():
        if verbose:
            console.print("[yellow]No goal provided. Try something like:[/]")
            console.print("  [dim]nexus 'scan example.com with all modules'[/]")
            console.print("  [dim]nexus 'audit my local machine'[/]")
            console.print("  [dim]nexus 'find secrets in my project'[/]")
        return {"error": "No goal provided"}

    def _on_message(msg: str, style: str = "") -> None:
        if verbose:
            if style:
                console.print(msg)
            else:
                console.print(msg)

    def _on_finding(finding: Dict) -> None:
        pass  # Findings are collected internally

    def _on_status(status: str) -> None:
        pass  # Status updates handled internally

    agent = NexusAgent(
        on_message=_on_message,
        on_finding=_on_finding,
        on_status=_on_status,
        verbose=verbose,
    )
    return agent.execute(goal)
