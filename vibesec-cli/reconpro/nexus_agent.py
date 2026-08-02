"""Nexus Agent \u2014 LLM-powered agentic security engine.

Tool-calling architecture: the agent reasons about goals, selects tools,
executes them, and chains results autonomously.

Supports:
  - OpenAI GPT-4/3.5
  - Anthropic Claude
  - Rule-based fallback (no API key needed)

Tool registry: 18 tools covering all ReconPro capabilities.
Memory: persistent per-project context stored at ~/.reconpro/memory/.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from rich.console import Console

console = Console()
MEMORY_DIR = Path.home() / ".reconpro" / "memory"


# \u2500\u2500 Tool Registry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n

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
    def __init__(self, name: str, description: str, parameters: Dict[str, Any],
                 execute: Callable[..., ToolResult], category: str = "scan"):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.execute = execute
        self.category = category

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
            return ToolResult(f"Tool '{name}' not found", success=False)
        try:
            return tool.execute(**kwargs)
        except Exception as e:
            return ToolResult(f"Tool error: {e}", success=False)

    def list_tools(self) -> List[Dict]:
        return [{"name": t.name, "description": t.description, "category": t.category}
                for t in self.tools.values()]

    def to_openai_tools(self) -> List[Dict]:
        return [t.to_openai_tool() for t in self.tools.values()]


# \u2500\u2500 Agent Memory \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n

class AgentMemory:
    """Persistent memory for the Nexus agent."""
    def __init__(self, project: str = "default"):
        self.project = project
        self._ensure_dir()
        self.memory_file = MEMORY_DIR / f"{project}.json"
        self._data = self._load()

    def _ensure_dir(self) -> None:
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)

    def _load(self) -> Dict:
        if self.memory_file.exists():
            try:
                with open(self.memory_file) as f:
                    return json.load(f)
            except Exception:
                pass
        return {"project": self.project, "context": {}, "learned_patterns": [],
                "conversation_history": [], "created": datetime.now().isoformat(),
                "updated": datetime.now().isoformat()}

    def _save(self) -> None:
        self._data["updated"] = datetime.now().isoformat()
        if len(self._data["conversation_history"]) > 100:
            self._data["conversation_history"] = self._data["conversation_history"][-50:]
        with open(self.memory_file, "w") as f:
            json.dump(self._data, f, indent=2, default=str)

    def add_message(self, role: str, content: str) -> None:
        self._data["conversation_history"].append(
            {"role": role, "content": content, "ts": datetime.now().isoformat()})
        self._save()

    def set_context(self, key: str, value: Any) -> None:
        self._data["context"][key] = value
        self._save()

    def get_context(self, key: str, default=None) -> Any:
        return self._data["context"].get(key, default)

    def add_pattern(self, pattern: str) -> None:
        if pattern not in self._data["learned_patterns"]:
            self._data["learned_patterns"].append(pattern)
            self._save()

    def get_history(self, limit: int = 20) -> List[Dict]:
        return self._data["conversation_history"][-limit:]

    def get_context_summary(self) -> str:
        ctx = self._data["context"]
        parts = [f"  {k}: {v}" for k, v in ctx.items()] if ctx else []
        patterns = self._data.get("learned_patterns", [])
        if patterns:
            parts.append(f"  Known patterns: {len(patterns)}")
        return "\n".join(parts) if parts else "No prior context."


# \u2500\u2500 Tool Implementations \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n
def _tool_scan_remote(target: str, modules: str = "", all_modules: bool = False) -> ToolResult:
    from .scanner import scan
    mod_list = [m.strip().lower() for m in modules.split(",") if m.strip()] if modules else None
    result = scan(target, modules=mod_list, all_modules=all_modules)
    return ToolResult(f"Scanned {target}. Score: {result.total_score}/100 ({result.grade}). "
                      f"{len(result.findings)} findings.", success=True, data=result.to_dict())

def _tool_scan_local(modules: str = "") -> ToolResult:
    from .scanner import audit_scan
    mod_list = [m.strip().lower() for m in modules.split(",") if m.strip()] if modules else None
    result = audit_scan(target="localhost", modules=mod_list)
    return ToolResult(f"Local audit complete. Score: {result.total_score}/100 ({result.grade}). "
                      f"{len(result.findings)} findings.", success=True, data=result.to_dict())

def _tool_scan_dev(path: str = ".") -> ToolResult:
    from .scanner import audit_scan
    result = audit_scan(target=path, modules=["dev"])
    return ToolResult(f"Dev scan of {path}. Score: {result.total_score}/100 ({result.grade}). "
                      f"{len(result.findings)} findings.", success=True, data=result.to_dict())

def _tool_run_doctor() -> ToolResult:
    from .scanner import audit_scan
    result = audit_scan(target="localhost", modules=["doctor"])
    return ToolResult(f"Doctor complete. Score: {result.total_score}/100 ({result.grade}). "
                      f"{len(result.findings)} findings.", success=True, data=result.to_dict())

def _tool_blitz(targets: str) -> ToolResult:
    from .parallel import blitz_scan
    target_list = [t.strip() for t in targets.split(",") if t.strip()]
    if len(target_list) < 2:
        return ToolResult("Blitz requires at least 2 targets.", success=False)
    result = blitz_scan(target_list, max_workers=min(4, len(target_list)), save=True)
    return ToolResult(f"Blitz: {result.get('total_findings', 0)} findings across "
                      f"{result.get('targets_scanned', 0)} targets.", success=True, data=result)

def _tool_subdomains(domain: str) -> ToolResult:
    from .subdomains import discover_subdomains
    subs = discover_subdomains(domain)
    return ToolResult(f"Found {len(subs)} subdomains: {', '.join(subs[:20])}",
                      success=True, data={"subdomains": subs})

def _tool_check_ports() -> ToolResult:
    from .modules.host import _check_open_ports
    findings = _check_open_ports()
    if not findings:
        return ToolResult("No risky ports found.", success=True, data=[])
    lines = [f"{f.severity.upper()}: {f.title}" for f in findings]
    return ToolResult(f"Found {len(findings)} port issues:\n" + "\n".join(lines),
                      success=True, data=[f.to_dict() for f in findings])

def _tool_hunt_secrets(path: str = ".") -> ToolResult:
    from .modules.host import _check_env_secrets
    from .modules.dev import _check_env_files, _check_hardcoded_secrets
    all_f = _check_env_secrets() + _check_env_files(os.path.abspath(path)) + _check_hardcoded_secrets(os.path.abspath(path))
    if not all_f:
        return ToolResult("No secrets found.", success=True, data=[])
    lines = [f"{f.severity.upper()}: {f.title}" for f in all_f[:20]]
    return ToolResult(f"Found {len(all_f)} secret(s):\n" + "\n".join(lines),
                      success=True, data=[f.to_dict() for f in all_f])

def _tool_screenshot(url: str) -> ToolResult:
    try:
        from .browser_mod import take_screenshot
        path = take_screenshot(url)
        return ToolResult(f"Screenshot saved: {path}", success=True)
    except ImportError:
        return ToolResult("Playwright required: pip install reconpro[browser]", success=False)

def _tool_spider(url: str, max_pages: int = 30) -> ToolResult:
    try:
        from .browser_mod import spider
        pages = spider(url, max_pages=max_pages)
        lines = [f"{p.get('status', '?')} {p.get('title', '?')[:40]}" for p in pages[:20]]
        return ToolResult(f"Found {len(pages)} pages:\n" + "\n".join(lines), success=True, data=pages)
    except ImportError:
        return ToolResult("Playwright required.", success=False)

def _tool_get_history(limit: int = 10) -> ToolResult:
    from .history import list_scans
    scans = list_scans(limit=limit)
    if not scans:
        return ToolResult("No scan history.", success=True, data=[])
    lines = [f"  {s.get('total_score', '?')}/100 ({s.get('grade', '?')})  {s.get('target', '?')[:30]}  {len(s.get('findings', []))} findings" for s in scans]
    return ToolResult(f"Recent {len(scans)} scans:\n" + "\n".join(lines), success=True, data=scans)

def _tool_compare_scans() -> ToolResult:
    from .history import list_scans, diff_scans
    scans = list_scans(limit=2)
    if len(scans) < 2:
        return ToolResult("Need at least 2 scans to compare.", success=False)
    d = diff_scans(scans[0]["_file"], scans[1]["_file"])
    return ToolResult(f"A: {d['scan_a']['target']} {d['scan_a']['score']}/100\n"
                      f"B: {d['scan_b']['target']} {d['scan_b']['score']}/100\n"
                      f"Change: {d['score_change']} pts", success=True, data=d)

def _tool_generate_report() -> ToolResult:
    from .history import get_latest
    from .reports import generate_html_report
    latest = get_latest()
    if not latest:
        return ToolResult("No scan data.", success=False)
    path = generate_html_report(latest)
    return ToolResult(f"Report generated: {path}", success=True)

def _tool_run_terminal(command: str) -> ToolResult:
    dangerous = ["rm -rf /", "mkfs", "dd if=", ":(){ :|:& };:"]
    for d in dangerous:
        if d in command:
            return ToolResult("Blocked dangerous command.", success=False)
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        output = (result.stdout + result.stderr)[:2000]
        return ToolResult(f"Exit code: {result.returncode}\n{output}", success=result.returncode == 0)
    except subprocess.TimeoutExpired:
        return ToolResult("Command timed out (30s).", success=False)
    except Exception as e:
        return ToolResult(f"Command error: {e}", success=False)

def _tool_read_file(path: str) -> ToolResult:
    try:
        p = Path(path).expanduser()
        if not p.exists():
            return ToolResult(f"File not found: {path}", success=False)
        content = p.read_text()[:5000]
        return ToolResult(f"Contents of {path} ({len(content)} chars):\n{content}", success=True)
    except Exception as e:
        return ToolResult(f"Error: {e}", success=False)

def _tool_search_code(pattern: str, path: str = ".") -> ToolResult:
    try:
        p = Path(path).expanduser()
        if not p.is_dir(): p = p.parent
        matches = []
        for ext in ("*.py", "*.js", "*.ts", "*.jsx", "*.tsx", "*.go", "*.rs", "*.java", "*.rb", "*.php", "*.yml", "*.yaml", "*.json", "*.env"):
            for fp in p.rglob(ext):
                if ".git" in str(fp) or "node_modules" in str(fp): continue
                try:
                    content = fp.read_text()[:10000]
                    for i, line in enumerate(content.split("\n"), 1):
                        if re.search(pattern, line, re.IGNORECASE):
                            matches.append(f"{fp.relative_to(p)}:{i}: {line.strip()[:80]}")
                            if len(matches) >= 30: break
                except Exception: continue
            if len(matches) >= 30: break
        if not matches:
            return ToolResult(f"No matches for '{pattern}'.", success=True)
        return ToolResult(f"Found {len(matches)} match(es):\n" + "\n".join(matches[:30]), success=True)
    except Exception as e:
        return ToolResult(f"Search error: {e}", success=False)

def _tool_open_browser(url: str) -> ToolResult:
    try:
        import webbrowser
        webbrowser.open(url)
        return ToolResult(f"Opened {url}.", success=True)
    except Exception as e:
        return ToolResult(f"Error: {e}", success=False)


# \u2500\u2500 Build Default Registry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n
def build_registry() -> ToolRegistry:
    reg = ToolRegistry()
    reg.register(Tool("scan_remote",
        "Scan a remote target for security vulnerabilities. Returns score, grade, and findings.",
        {"target": {"type": "string", "description": "Domain or URL"},
         "modules": {"type": "string", "description": "Comma-separated module list (optional)"},
         "all_modules": {"type": "boolean", "description": "Run all modules"}},
        _tool_scan_remote, category="scan"))
    reg.register(Tool("scan_local",
        "Audit the local machine. Checks ports, firewall, users, SSH, Docker, env secrets, file perms, cron, network.",
        {"modules": {"type": "string", "description": "Comma-separated module list (optional)"}},
        _tool_scan_local, category="scan"))
    reg.register(Tool("scan_dev",
        "Scan a dev project for security issues. Checks package.json, requirements.txt, env files, git, secrets, docker.",
        {"path": {"type": "string", "description": "Project directory path"}},
        _tool_scan_dev, category="scan"))
    reg.register(Tool("run_doctor",
        "Run security health check. Checks password policy, disk encryption, auto-lock, antivirus, updates, browser security.",
        {}, _tool_run_doctor, category="scan"))
    reg.register(Tool("blitz_scan",
        "Scan multiple targets in parallel. Provide comma-separated targets.",
        {"targets": {"type": "string", "description": "Comma-separated list of targets"}},
        _tool_blitz, category="scan"))
    reg.register(Tool("discover_subdomains",
        "Discover subdomains using certificate transparency logs and DNS enumeration.",
        {"domain": {"type": "string", "description": "Domain to discover subdomains for"}},
        _tool_subdomains, category="recon"))
    reg.register(Tool("check_ports",
        "Check for open and risky ports on the local machine.",
        {}, _tool_check_ports, category="recon"))
    reg.register(Tool("hunt_secrets",
        "Hunt for secrets and credentials in the current directory.",
        {"path": {"type": "string", "description": "Directory to scan (default: current)"}},
        _tool_hunt_secrets, category="recon"))
    reg.register(Tool("take_screenshot",
        "Take a screenshot of a URL using headless browser.",
        {"url": {"type": "string", "description": "URL to screenshot"}},
        _tool_screenshot, category="browser"))
    reg.register(Tool("spider_url",
        "Crawl a website and discover all linked pages.",
        {"url": {"type": "string", "description": "Starting URL"},
         "max_pages": {"type": "integer", "description": "Max pages (default 30)"}},
        _tool_spider, category="browser"))
    reg.register(Tool("open_browser",
        "Open a URL in the system browser.",
        {"url": {"type": "string", "description": "URL to open"}},
        _tool_open_browser, category="browser"))
    reg.register(Tool("get_history",
        "Get recent scan history.",
        {"limit": {"type": "integer", "description": "Number of scans (default 10)"}},
        _tool_get_history, category="utility"))
    reg.register(Tool("compare_scans",
        "Compare the last two scans to see what changed.",
        {}, _tool_compare_scans, category="utility"))
    reg.register(Tool("generate_report",
        "Generate an HTML security report from the last scan.",
        {}, _tool_generate_report, category="utility"))
    reg.register(Tool("run_terminal",
        "Execute a shell command. Use for quick lookups, not destructive operations.",
        {"command": {"type": "string", "description": "Shell command to execute"}},
        _tool_run_terminal, category="system"))
    reg.register(Tool("read_file",
        "Read the contents of a file.",
        {"path": {"type": "string", "description": "File path to read"}},
        _tool_read_file, category="system"))
    reg.register(Tool("search_code",
        "Search for a pattern in code files in a directory.",
        {"pattern": {"type": "string", "description": "Regex pattern"},
         "path": {"type": "string", "description": "Directory to search (default: current)"}},
        _tool_search_code, category="system"))
    return reg


# \u2500\u2500 Nexus Agent \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n
class NexusAgent:
    """The Nexus Agent \u2014 LLM-powered or rule-based agentic security engine."""
    def __init__(self, on_message: Optional[Callable] = None,
                 on_finding: Optional[Callable] = None,
                 on_status: Optional[Callable] = None,
                 project: str = "default"):
        self.registry = build_registry()
        self.memory = AgentMemory(project)
        self.on_message = on_message or (lambda msg, style="msg-nexus": None)
        self.on_finding = on_finding or (lambda f: None)
        self.on_status = on_status or (lambda s: None)
        self._llm_available = bool(os.environ.get("OPENAI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY"))
        self._findings: List[Dict] = []
        self._steps: List[str] = []
        self._targets: List[str] = []

    def _emit(self, msg: str, style: str = "msg-nexus") -> None:
        self.on_message(msg, style)

    def _emit_finding(self, finding: Dict) -> None:
        self.on_finding(finding)
        self._findings.append(finding)

    def _emit_status(self, status: str) -> None:
        self.on_status(status)

    def execute(self, goal: str) -> Dict[str, Any]:
        self._emit(f"Analyzing goal: [dim]{goal}[/]")
        self.memory.add_message("user", goal)
        if self._llm_available:
            self._emit("LLM detected \u2014 using AI-powered reasoning.")
            result = self._execute_llm(goal)
        else:
            self._emit("No LLM key found \u2014 using intelligent rule-based engine.")
            self._emit("[dim]Set OPENAI_API_KEY or ANTHROPIC_API_KEY for AI mode.[/]")
            result = self._execute_rules(goal)
        self.memory.add_message("agent", f"Completed: {len(self._findings)} findings")
        return result

    def _execute_rules(self, goal: str) -> Dict[str, Any]:
        goal_lower = goal.lower()
        urls = re.findall(r'https?://[\w\\-.]+(?:/\S*)?', goal)
        domains = re.findall(r'[\w][\w\\-]*\.[\w]{2,}(?:\.[\w]{2,})?', goal)
        skip = {'the', 'and', 'for', 'with', 'all', 'of', 'to', 'from',
                'that', 'this', 'scan', 'audit', 'check', 'find', 'get',
                'show', 'me', 'my', 'com', 'net', 'org', 'io'}
        targets = list(set(urls + [d for d in domains if d.lower() not in skip and len(d) > 3]))
        is_local = any(w in goal_lower for w in ['machine', 'laptop', 'computer', 'local', 'my system'])
        is_subdomain = any(w in goal_lower for w in ['subdomain', 'sub-domain', 'attack surface'])
        is_full = any(w in goal_lower for w in ['full', 'everything', 'all module', 'deep', 'complete'])
        is_secrets = any(w in goal_lower for w in ['secret', 'credential', 'key', 'token', 'password'])
        is_ports = any(w in goal_lower for w in ['port', 'open port'])
        is_compare = any(w in goal_lower for w in ['compare', 'diff', 'vs', 'versus'])
        is_report = any(w in goal_lower for w in ['report', 'html', 'pdf'])
        is_dev = any(w in goal_lower for w in ['dev', 'project', 'codebase', 'repo'])
        is_doctor = any(w in goal_lower for w in ['health', 'doctor', 'diagnos', 'checkup'])
        modules = None
        all_modules = is_full
        if any(w in goal_lower for w in ['recon only', 'just recon']): modules = ['recon']
        elif any(w in goal_lower for w in ['auth', 'bypass', 'login']): modules = ['auth']
        elif any(w in goal_lower for w in ['sqli', 'xss', 'injection', 'gorgon']): modules = ['gorgon']
        elif any(w in goal_lower for w in ['vibesec', 'vibe']): modules = ['vibesec']
        elif any(w in goal_lower for w in ['ssrf', 'chain', 'redirect']): modules = ['chain']
        elif any(w in goal_lower for w in ['bot', 'c2']): modules = ['bot']
        elif any(w in goal_lower for w in ['oblivion', 'dread']): modules = ['oblivion']
        elif any(w in goal_lower for w in ['nhi', 'cloud', 'identity']): modules = ['nhi']
        if is_local:
            self._emit("Step 1: Auditing local machine...")
            self._emit_status("Running local machine audit...")
            r = self.registry.execute("scan_local", modules="host,dev,doctor" if is_full else "")
            self._emit(r.output, "msg-success" if r.success else "msg-error")
            self._steps.append("Local machine audit")
            self._targets.append("localhost")
            if r.data:
                for f in r.data.get("findings", []): self._emit_finding(f)
        if is_secrets:
            self._emit("Hunting for secrets...")
            self._emit_status("Scanning for secrets...")
            r = self.registry.execute("hunt_secrets")
            self._emit(r.output, "msg-success" if not r.data else "msg-warning")
            self._steps.append("Secret hunting")
            if r.data:
                for f in r.data: self._emit_finding(f)
        if is_ports:
            self._emit("Checking ports...")
            self._emit_status("Scanning ports...")
            r = self.registry.execute("check_ports")
            self._emit(r.output)
            self._steps.append("Port check")
            if r.data:
                for f in r.data: self._emit_finding(f)
        if is_dev and not is_local:
            self._emit("Scanning dev project...")
            self._emit_status("Running dev scan...")
            r = self.registry.execute("scan_dev")
            self._emit(r.output, "msg-success" if r.success else "msg-error")
            self._steps.append("Dev scan")
            if r.data:
                for f in r.data.get("findings", []): self._emit_finding(f)
        if is_doctor:
            self._emit("Running diagnostics...")
            self._emit_status("Running doctor...")
            r = self.registry.execute("run_doctor")
            self._emit(r.output, "msg-success" if r.success else "msg-error")
            self._steps.append("Doctor diagnostics")
            if r.data:
                for f in r.data.get("findings", []): self._emit_finding(f)
        if is_subdomain and targets:
            for target in targets:
                domain = target.replace("https://", "").replace("http://", "").split("/")[0]
                self._emit(f"Discovering subdomains of {domain}...")
                self._emit_status(f"Enumerating subdomains of {domain}...")
                r = self.registry.execute("discover_subdomains", domain=domain)
                self._emit(r.output)
                self._steps.append(f"Subdomain discovery ({domain})")
        if targets and not is_local:
            if len(targets) > 1:
                self._emit(f"Blitz scanning {len(targets)} targets...")
                self._emit_status(f"Blitz scanning {len(targets)} targets...")
                r = self.registry.execute("blitz_scan", targets=",".join(targets))
                self._emit(r.output)
                self._steps.append(f"Blitz ({len(targets)} targets)")
                if r.data:
                    for t, td in r.data.get("results", {}).items():
                        self._targets.append(t)
                        for f in td.get("findings", []): self._emit_finding(f)
            else:
                target = targets[0]
                self._emit(f"Scanning {target}...")
                self._emit_status(f"Scanning {target}...")
                mods_str = ",".join(modules) if modules else ""
                r = self.registry.execute("scan_remote", target=target, modules=mods_str, all_modules=all_modules)
                self._emit(r.output, "msg-success" if r.success else "msg-error")
                self._steps.append(f"Scan {target}")
                self._targets.append(target)
                if r.data:
                    for f in r.data.get("findings", []): self._emit_finding(f)
                    from .history import save_scan
                    save_scan(r.data, label="agent")
        if is_compare:
            self._emit("Comparing last two scans...")
            r = self.registry.execute("compare_scans")
            self._emit(r.output)
            self._steps.append("Comparison")
        if is_report:
            self._emit("Generating report...")
            r = self.registry.execute("generate_report")
            self._emit(r.output, "msg-success" if r.success else "msg-error")
            self._steps.append("Report generation")
        if not self._steps:
            if targets:
                target = targets[0]
                self._emit(f"No specific action detected. Scanning {target}...")
                r = self.registry.execute("scan_remote", target=target)
                self._emit(r.output)
                self._steps.append(f"Scan {target}")
                self._targets.append(target)
                if r.data:
                    for f in r.data.get("findings", []): self._emit_finding(f)
            else:
                self._emit("I need a target or specific action.", "msg-warning")
                self._emit("Try: 'scan example.com', 'audit my machine', 'find secrets'", "msg-system")
        self._emit(f"Goal complete. {len(self._findings)} findings across {len(self._targets)} target(s).", "msg-success")
        return {"goal": goal, "steps": self._steps, "targets": self._targets,
                "total_findings": len(self._findings), "findings": self._findings}

    def _execute_llm(self, goal: str) -> Dict[str, Any]:
        self._emit("Initializing LLM reasoning engine...")
        system_prompt = self._build_system_prompt()
        messages = [{"role": "system", "content": system_prompt}]
        for msg in self.memory.get_history(limit=10):
            if msg["role"] in ("user", "assistant"):
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": goal})
        for i in range(10):
            self._emit_status(f"LLM reasoning (step {i + 1})...")
            response = self._call_llm(messages)
            if not response:
                self._emit("LLM call failed. Falling back to rules.", "msg-warning")
                return self._execute_rules(goal)
            msg = response.get("content", "")
            tool_calls = response.get("tool_calls", [])
            if not tool_calls:
                if msg:
                    self._emit(msg)
                    self.memory.add_message("assistant", msg)
                break
            for tc in tool_calls:
                fn_name = tc.get("function", {}).get("name", "")
                fn_args_str = tc.get("function", {}).get("arguments", "{}")
                try:
                    fn_args = json.loads(fn_args_str) if isinstance(fn_args_str, str) else fn_args_str
                except json.JSONDecodeError:
                    fn_args = {}
                self._emit(f"Calling tool: [bold]{fn_name}[/] with {fn_args}")
                self._emit_status(f"Executing: {fn_name}")
                result = self.registry.execute(fn_name, **fn_args)
                self._emit(result.output, "msg-success" if result.success else "msg-error")
                self._steps.append(fn_name)
                if result.data:
                    if isinstance(result.data, dict) and "findings" in result.data:
                        for f in result.data["findings"]: self._emit_finding(f)
                    elif isinstance(result.data, dict) and "results" in result.data:
                        for t, td in result.data["results"].items():
                            self._targets.append(t)
                            if isinstance(td, dict) and "findings" in td:
                                for f in td["findings"]: self._emit_finding(f)
                messages.append({"role": "assistant", "content": None, "tool_calls": [tc]})
                messages.append({"role": "tool", "tool_call_id": tc.get("id", "call_" + fn_name),
                                "content": result.output[:4000]})
                self.memory.add_message("assistant", f"Called {fn_name}: {result.output[:200]}")
        self._emit(f"Agent loop complete. {len(self._findings)} findings.", "msg-success")
        return {"goal": goal, "steps": self._steps, "targets": self._targets,
                "total_findings": len(self._findings), "findings": self._findings}

    def _build_system_prompt(self) -> str:
        tool_descriptions = "\n".join(f"- {t.name}: {t.description}" for t in self.registry.tools.values())
        context = self.memory.get_context_summary()
        return f"""You are NEXUS, an autonomous security analysis agent built into ReconPro.
You have {len(self.registry.tools)} tools. Analyze the goal and call tools one at a time.
Prioritize critical and high severity findings.

YOUR TOOLS:
{tool_descriptions}

PROJECT CONTEXT:
{context}"""

    def _call_llm(self, messages):
        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key:
            return self._call_openai(api_key, messages)
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if api_key:
            return self._call_anthropic(api_key, messages)
        return None

    def _call_openai(self, api_key, messages):
        import urllib.request
        import ssl
        url = "https://api.openai.com/v1/chat/completions"
        model = os.environ.get("RECONPRO_MODEL", "gpt-4o-mini")
        payload = {"model": model, "messages": messages,
                   "tools": self.registry.to_openai_tools(),
                   "max_tokens": 4096, "temperature": 0.1}
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
                data = json.loads(resp.read().decode())
            choice = data.get("choices", [{}])[0]
            message = choice.get("message", {})
            return {"content": message.get("content", ""), "tool_calls": message.get("tool_calls", [])}
        except Exception as e:
            self._emit(f"OpenAI error: {e}", "msg-error")
            return None

    def _call_anthropic(self, api_key, messages):
        import urllib.request
        import ssl
        system_msg = ""
        anthropic_messages = []
        for m in messages:
            if m["role"] == "system": system_msg = m["content"]
            else: anthropic_messages.append(m)
        url = "https://api.anthropic.com/v1/messages"
        model = os.environ.get("RECONPRO_MODEL", "claude-sonnet-4-20250514")
        tools = [{"name": t.name, "description": t.description,
                  "input_schema": {"type": "object", "properties": t.parameters,
                                  "required": list(t.parameters.keys())}}
                 for t in self.registry.tools.values()]
        payload = {"model": model, "max_tokens": 4096, "system": system_msg,
                   "messages": anthropic_messages, "tools": tools if tools else None}
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                    headers={"Content-Type": "application/json", "x-api-key": api_key,
                             "anthropic-version": "2023-06-01"})
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
                data = json.loads(resp.read().decode())
            content = data.get("content", [])
            text_parts, tool_calls = [], []
            for block in content:
                if block["type"] == "text": text_parts.append(block["text"])
                elif block["type"] == "tool_use":
                    tool_calls.append({"id": block["id"], "type": "function",
                                    "function": {"name": block["name"],
                                               "arguments": json.dumps(block.get("input", {}))}})
            return {"content": "\n".join(text_parts), "tool_calls": tool_calls}
        except Exception as e:
            self._emit(f"Anthropic error: {e}", "msg-error")
            return None
