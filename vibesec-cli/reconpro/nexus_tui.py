"""ReconPro NEXUS — Mind-blowing terminal UI with Textual.

Full split-screen interface: agent chat + live findings + module status.
Mouse support, keyboard navigation, real-time scan visualization, animated boot.
"""
from __future__ import annotations

import os
import sys
import time
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical, VerticalScroll, ScrollableContainer
from textual.widgets import (
    Header, Footer, Input, Static, RichLog, ProgressBar, Label,
)
from textual.reactive import reactive
from textual.worker import Worker, get_current_worker
from textual import events, work
from textual.css.query import NoMatches

from . import __version__
from .scanner import scan, audit_scan, MODULE_REGISTRY, LOCAL_MODULES, ALL_MODULES
from .history import list_scans, get_latest, save_scan, diff_scans
from .reports import generate_html_report
from .parallel import blitz_scan
from .subdomains import discover_subdomains

# Colors
SEV_COLORS = {
    "critical": "bright_red", "high": "red",
    "medium": "yellow", "low": "green", "info": "dim",
}
SEV_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
GRADE_COLORS = {
    "A+": "#00ff88", "A": "#44dd66", "B": "#ffdd00",
    "C": "#ff8800", "D": "#ff4444", "F": "#ff0044",
}
GRADE_COLORS_RICH = {
    "A+": "bright_green", "A": "green", "B": "yellow",
    "C": "red", "D": "bright_red", "F": "bold bright_red",
}

NEXUS_CSS = """
Screen {
    background: #0a0a14;
    color: #c8c8d0;
}
.nexus-header {
    background: #0d0d1a;
    border-bottom: solid #1a1a3a;
    height: 3;
    padding: 0 1;
    content-align: left middle;
}
#main-container {
    height: 1fr;
}
.chat-panel {
    border-right: solid #1a1a3a;
    width: 42%;
    background: #0c0c18;
}
#chat-log {
    background: transparent;
    border: none;
    scrollbar-size: 1 1;
    scrollbar-color: #1a1a3a #0a0a14;
    padding: 0 1;
}
#feed-log {
    background: transparent;
    border: none;
    scrollbar-size: 1 1;
    scrollbar-color: #1a1a3a #0a0a14;
    padding: 0 1;
}
#module-log {
    background: transparent;
    border: none;
    scrollbar-size: 1 1;
    scrollbar-color: #1a1a3a #0a0a14;
    padding: 0 1;
}
.panel-label {
    background: #0d0d1a;
    color: #00ffcc;
    text-style: bold;
    height: 1;
    padding: 0 1;
    border-bottom: solid #1a1a3a;
}
.feed-panel {
    background: #0c0c18;
}
.module-panel {
    background: #0c0c18;
    border-top: solid #1a1a3a;
    height: 35%;
}
.input-area {
    background: #0d0d1a;
    border-top: solid #1a1a3a;
    height: 3;
    padding: 0 1;
}
#cmd-input {
    background: #0d0d1a;
    border: solid #1a2a3a;
    color: #00ffcc;
    caret-color: #00ffcc;
    padding: 0 1;
}
#cmd-input:focus {
    border: solid #00ffcc;
}
#cmd-input > .input--placeholder {
    color: #334455;
}
.shortcut-bar {
    background: #08080f;
    color: #445566;
    height: 1;
    padding: 0 1;
    content-align: left middle;
}
RichLog {
    background: transparent;
}
.boot-line { color: #00ffcc; text-style: dim; }
.msg-nexus { color: #00ffcc; text-style: bold; }
.msg-user { color: #ff8844; text-style: bold; }
.msg-system { color: #888899; text-style: italic; }
.msg-error { color: #ff4444; }
.msg-success { color: #00ff88; }
.msg-warning { color: #ffaa00; }
.finding-critical { color: #ff4444; text-style: bold; }
.finding-high { color: #ff6644; }
.finding-medium { color: #ffaa00; }
.finding-low { color: #44cc66; }
.finding-info { color: #666677; }
.module-active { color: #00ffcc; text-style: bold; }
.module-done { color: #446666; }
.module-idle { color: #333344; }
.module-error { color: #ff4444; }
"""

BOOT_MESSAGES = [
    ("[boot] Initializing ReconPro Nexus v{}...".format(__version__), 0.12),
    ("[boot] Loading scanner core...", 0.08),
    ("[boot] Registering 11 scanning modules...", 0.10),
    ("[boot] Mounting tool registry (18 tools)...", 0.08),
    ("[boot] Initializing agent memory...", 0.06),
    ("[boot] Calibrating threat detection...", 0.08),
    ("[boot] Starting parallel engine...", 0.06),
    ("[boot] NEXUS ONLINE.", 0.04),
]


class NexusApp(App):
    TITLE = "RECONPRO NEXUS"
    SUB_TITLE = f"v{__version__}"
    CSS = NEXUS_CSS
    BINDINGS = [
        ("tab", "focus_next", "Switch Panel"),
        ("shift+tab", "focus_prev", "Switch Panel"),
        ("ctrl+s", "quick_scan", "Scan"),
        ("ctrl+a", "quick_audit", "Audit"),
        ("ctrl+d", "quick_doctor", "Doctor"),
        ("ctrl+l", "clear_chat", "Clear"),
        ("ctrl+r", "quick_report", "Report"),
        ("ctrl+h", "show_history", "History"),
        ("ctrl+q", "quit_app", "Quit"),
        ("f1", "show_help", "Help"),
    ]

    score = reactive(0)
    grade = reactive("---")
    target = reactive("---")
    scanning = reactive(False)
    findings_count = reactive(0)
    critical_count = reactive(0)
    high_count = reactive(0)

    def compose(self) -> ComposeResult:
        yield Static(self._build_header_text(), classes="nexus-header", id="nexus-header")
        with Horizontal(id="main-container"):
            with Vertical(classes="chat-panel"):
                yield Static("══ AGENT CHAT", classes="panel-label")
                yield RichLog(id="chat-log", highlight=True, markup=True, max_lines=500)
            with Vertical(classes="feed-panel"):
                yield Static("══ LIVE FEED", classes="panel-label")
                with VerticalScroll():
                    yield RichLog(id="feed-log", highlight=True, markup=True, max_lines=300)
                with Vertical(classes="module-panel"):
                    yield Static("══ MODULE STATUS", classes="panel-label")
                    yield RichLog(id="module-log", highlight=True, markup=True, max_lines=100)
        with Vertical(classes="input-area"):
            yield Input(placeholder="Type a command or describe your goal...", id="cmd-input")
        yield Static(
            "[Tab] switch  [Ctrl+S] scan  [Ctrl+A] audit  [Ctrl+D] doctor  "
            "[Ctrl+R] report  [F1] help  [Ctrl+Q] quit",
            classes="shortcut-bar",
        )

    def _build_header_text(self) -> str:
        sc = self.score
        g = self.grade
        t = self.target
        gc = GRADE_COLORS.get(g, "#888888")
        bar_w = 20
        filled = int(sc / 100 * bar_w) if sc > 0 else 0
        bar = "\u2588" * filled + "\u2591" * (bar_w - filled)
        clock = datetime.now().strftime("%H:%M:%S")
        return (
            f"[bold #00ffcc]\u2b22 RECONPRO NEXUS[/] "
            f"[dim]v{__version__}[/]  \u2502  "
            f"[bold #8888ff]Target:[/] [#aaaacc]{t}[/]  \u2502  "
            f"[{gc}]{bar} {sc}/100 ({g})[/{gc}]  \u2502  "
            f"[dim]\u25f0 {clock}[/]  \u2502  "
            f"[bright_red]{self.critical_count}\u2b24[/] [red]{self.high_count}\u2b24[/] [#ffaa00]{self.findings_count} findings"
        )

    def _update_header(self) -> None:
        try:
            header = self.query_one("#nexus-header", Static)
            header.update(self._build_header_text())
        except NoMatches:
            pass

    def watch_score(self, old, new):
        self._update_header()
    def watch_grade(self, old, new):
        self._update_header()
    def watch_target(self, old, new):
        self._update_header()
    def watch_critical_count(self, old, new):
        self._update_header()
    def watch_high_count(self, old, new):
        self._update_header()
    def watch_findings_count(self, old, new):
        self._update_header()

    def on_mount(self):
        chat = self.query_one("#chat-log", RichLog)
        chat.write("")
        self.set_focus(self.query_one("#cmd-input", Input))
        self._boot_animation()

    def _boot_animation(self):
        chat = self.query_one("#chat-log", RichLog)
        chat.write("")
        chat.write("[bold #00ffcc]  \u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563")
        chat.write("[bold #00ffcc]  \u2551[/]  [bold bright_white]  R E C O N P R O    N E X U S   \u2022   A G E N T I C   S E C U R I T Y   E N G I N E  [bold #00ffcc]\u2551")
        chat.write("[bold #00ffcc]  \u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563")
        chat.write("")
        self._boot_step(0)

    def _boot_step(self, step):
        chat = self.query_one("#chat-log", RichLog)
        if step >= len(BOOT_MESSAGES):
            chat.write("")
            chat.write("[msg-success]\u2714 All systems operational. Type a command or describe your goal.[/]")
            chat.write("")
            return
        msg, delay = BOOT_MESSAGES[step]
        if "ONLINE" in msg:
            chat.write(f"[msg-nexus]{msg}[/]")
        else:
            chat.write(f"[boot-line]{msg} \u2714[/]")
        self.set_timer(delay, lambda: self._boot_step(step + 1))

    def on_input_submitted(self, event: Input.Submitted):
        text = event.value.strip()
        if not text:
            return
        event.input.value = ""
        chat = self.query_one("#chat-log", RichLog)
        chat.write(f"[msg-user]\u276f YOU:[/] {text}")
        self._process_command(text)

    def _process_command(self, text):
        low = text.lower().strip()
        chat = self.query_one("#chat-log", RichLog)
        if low in ("quit", "exit", "q"):
            self.quit_app(); return
        if low in ("help", "?", "commands"):
            self._show_help(); return
        if low == "clear":
            self.clear_chat(); return
        if low.startswith("scan ") or ("." in low and " " not in low and not low.startswith(("agent", "blitz", "subdomain", "screenshot", "report", "history", "compare", "secrets", "ports", "audit", "dev", "doctor", "open ", "schedule", "plugin", "modules", "list"))) or low.startswith("http"):
            target = low.replace("scan ", "").strip().split(" with ")[0].strip()
            if not target or target == "scan":
                chat.write("[msg-warning]Usage: scan <target> [with <modules>][/]"); return
            modules = None
            if "with " in low:
                import re
                m = re.search(r'with\s+([\w,\s]+)', low, re.IGNORECASE)
                if m:
                    modules = [x.strip().lower() for x in m.group(1).split(",") if x.strip()]
            self._run_scan(target, modules); return
        if low.startswith("audit"):
            self._run_audit(); return
        if low.startswith("dev"):
            path = "."; parts = low.split()
            if len(parts) > 1 and parts[1] not in ("scan", "check"): path = parts[1]
            self._run_dev_scan(path); return
        if low.startswith("doctor"):
            self._run_doctor(); return
        if low.startswith("blitz"):
            import re
            targets = re.findall(r'[\w\-]+\.[\w]{2,}', low)
            if len(targets) < 2:
                chat.write("[msg-warning]Usage: blitz t1.com t2.com t3.com[/]"); return
            self._run_blitz(targets); return
        if low.startswith("subdomain"):
            parts = low.split()
            if len(parts) < 2: chat.write("[msg-warning]Usage: subdomains <domain>[/]"); return
            self._discover_subdomains(parts[1]); return
        if low.startswith("agent "):
            goal = text.split(" ", 1)[1]; self._run_agent_goal(goal); return
        if low.startswith("report"):
            self._generate_report(); return
        if low.startswith("history"):
            self._show_history(); return
        if low.startswith("compare"):
            self._compare_scans(); return
        if low.startswith("secret"):
            self._hunt_secrets(); return
        if low.startswith("port"):
            self._check_ports(); return
        if low.startswith("screenshot"):
            parts = low.split()
            if len(parts) < 2: chat.write("[msg-warning]Usage: screenshot <url>[/]"); return
            self._take_screenshot(parts[1]); return
        if low.startswith("open "):
            url = text.split(" ", 1)[1]; self._open_browser(url); return
        if low == "score":
            self._show_last_score(); return
        if low.startswith("module") or low.startswith("list"):
            self._list_modules(); return
        self._run_agent_goal(text)

    @work(thread=True, exclusive=True, group="scan")
    def _run_scan(self, target, modules=None):
        chat = self.query_one("#chat-log", RichLog)
        self.target = target
        self.scanning = True
        chat.write(f"[msg-nexus]\u25b8 NEXUS:[/] Scanning [bold #aaaacc]{target}[/]...")
        self._update_module_status("recon", "scanning")
        try:
            result = scan(target, modules=modules)
            self.call_from_thread(self._on_scan_complete, result)
        except Exception as e:
            self.call_from_thread(chat.write, f"[msg-error]\u2718 Scan error: {e}[/]")
            self.scanning = False

    @work(thread=True, exclusive=True, group="scan")
    def _run_audit(self):
        chat = self.query_one("#chat-log", RichLog)
        self.target = "localhost"
        self.scanning = True
        chat.write("[msg-nexus]\u25b8 NEXUS:[/] Auditing local machine...")
        for m in LOCAL_MODULES: self._update_module_status(m, "scanning")
        try:
            result = audit_scan(target="localhost")
            self.call_from_thread(self._on_scan_complete, result)
        except Exception as e:
            self.call_from_thread(chat.write, f"[msg-error]\u2718 Audit error: {e}[/]")
            self.scanning = False

    @work(thread=True, exclusive=True, group="scan")
    def _run_dev_scan(self, path):
        chat = self.query_one("#chat-log", RichLog)
        self.target = path
        self.scanning = True
        chat.write(f"[msg-nexus]\u25b8 NEXUS:[/] Dev scanning [bold #aaaacc]{path}[/]...")
        self._update_module_status("dev", "scanning")
        try:
            result = audit_scan(target=path, modules=["dev"])
            self.call_from_thread(self._on_scan_complete, result)
        except Exception as e:
            self.call_from_thread(chat.write, f"[msg-error]\u2718 Dev scan error: {e}[/]")
            self.scanning = False

    @work(thread=True, exclusive=True, group="scan")
    def _run_doctor(self):
        chat = self.query_one("#chat-log", RichLog)
        self.target = "localhost"
        self.scanning = True
        chat.write("[msg-nexus]\u25b8 NEXUS:[/] Running security diagnostics...")
        self._update_module_status("doctor", "scanning")
        try:
            result = audit_scan(target="localhost", modules=["doctor"])
            self.call_from_thread(self._on_scan_complete, result)
        except Exception as e:
            self.call_from_thread(chat.write, f"[msg-error]\u2718 Doctor error: {e}[/]")
            self.scanning = False

    @work(thread=True, exclusive=True, group="scan")
    def _run_blitz(self, targets):
        chat = self.query_one("#chat-log", RichLog)
        self.target = f"{len(targets)} targets"
        self.scanning = True
        chat.write(f"[msg-nexus]\u25b8 NEXUS:[/] Blitz scanning [bold #aaaacc]{len(targets)} targets[/]...")
        try:
            result = blitz_scan(targets, max_workers=min(4, len(targets)), save=True)
            total = result.get("total_findings", 0)
            avg = result.get("average_score", 0)
            avg_g = result.get("average_grade", "?")
            self.call_from_thread(chat.write,
                f"[msg-success]\u2714 Blitz complete:[/] {total} findings, avg [{GRADE_COLORS_RICH.get(avg_g, 'white')}]{avg}/100 ({avg_g})[/]")
            self.scanning = False
        except Exception as e:
            self.call_from_thread(chat.write, f"[msg-error]\u2718 Blitz error: {e}[/]")
            self.scanning = False

    @work(thread=True, exclusive=True, group="scan")
    def _run_agent_goal(self, goal):
        chat = self.query_one("#chat-log", RichLog)
        chat.write(f"[msg-nexus]\u25b8 NEXUS:[/] Processing goal: [dim]{goal}[/]")
        try:
            from .nexus_agent import NexusAgent
            agent = NexusAgent(
                on_message=lambda msg, style="msg-nexus": self.call_from_thread(self._agent_message, msg, style),
                on_finding=lambda f: self.call_from_thread(self._agent_finding, f),
                on_status=lambda s: self.call_from_thread(self._agent_status, s),
            )
            result = agent.execute(goal)
            self.call_from_thread(self._on_agent_complete, result)
        except Exception as e:
            self.call_from_thread(chat.write, f"[msg-error]\u2718 Agent error: {e}[/]")
            self.scanning = False

    def _agent_message(self, msg, style="msg-nexus"):
        try:
            chat = self.query_one("#chat-log", RichLog)
            chat.write(f"[{style}]\u25b8 NEXUS:[/] {msg}")
        except Exception:
            pass

    def _agent_finding(self, finding):
        try:
            feed = self.query_one("#feed-log", RichLog)
            sev = finding.get("severity", "info")
            title = finding.get("title", "")[:65]
            feed.write(f"[finding-{sev}]\u25cf {sev.upper():8}  {title}")
            self.findings_count += 1
            if sev == "critical": self.critical_count += 1
            elif sev == "high": self.high_count += 1
        except Exception:
            pass

    def _agent_status(self, status):
        try:
            feed = self.query_one("#feed-log", RichLog)
            feed.write(f"[msg-system]\u2502 {status}[/]")
        except Exception:
            pass

    def _on_scan_complete(self, result):
        self.scanning = False
        chat = self.query_one("#chat-log", RichLog)
        feed = self.query_one("#feed-log", RichLog)
        mod_log = self.query_one("#module-log", RichLog)
        self.score = result.total_score
        self.grade = result.grade
        for mod_id in result.modules_run:
            count = len(result.module_results.get(mod_id, {}).get("findings", []))
            self._update_module_status(mod_id, "done", count)
        mod_log.clear()
        mod_log.write("[bold #00ffcc]\u2550\u2550 SCAN COMPLETE[/]")
        mod_log.write("")
        for mod_id in result.modules_run:
            entry = result.module_results.get(mod_id, {})
            count = len(entry.get("findings", []))
            mod_name = MODULE_REGISTRY.get(mod_id, LOCAL_MODULES.get(mod_id, {})).get("name", mod_id.upper())
            color = "#00ff88" if count == 0 else ("#ffaa00" if count < 5 else "#ff4444")
            mod_log.write(f"  [{color}]\u2714[/] [#aaaacc]{mod_name:16}[/]  [dim]{count} findings[/]")
        feed.write("")
        feed.write(f"[bold #00ffcc]\u2550\u2550 SCAN RESULT: {result.target} \u2014 {result.total_score}/100 ({result.grade})[/]")
        feed.write("")
        sorted_findings = sorted(result.findings, key=lambda x: SEV_ORDER.get(x.get("severity", "info"), 4))
        for f in sorted_findings:
            sev = f.get("severity", "info")
            title = f.get("title", "")[:70]
            mod = f.get("module", "")
            feed.write(f"[finding-{sev}]\u25cf {sev.upper():8}  {title} [dim]({mod})[/]")
        g = result.grade
        gc = GRADE_COLORS_RICH.get(g, "white")
        total = len(result.findings)
        sc = result.severity_counts
        chat.write("")
        chat.write(
            f"[msg-success]\u2714 Scan complete:[/] [{gc}]{result.total_score}/100 ({g})[/{gc}]  "
            f"{total} findings  [bright_red]{sc.get('critical', 0)} crit[/]  "
            f"[red]{sc.get('high', 0)} high[/]  [#ffaa00]{sc.get('medium', 0)} med[/]"
        )
        top = sorted_findings[:5]
        if top:
            chat.write("[msg-system]Top findings:[/]")
            for f in top:
                sev = f.get("severity", "info")
                c = SEV_COLORS.get(sev, "white")
                chat.write(f"  [{c}]{sev.upper():8}[/{c}] {f.get('title', '')[:60]}")
        chat.write("[msg-system]Type 'report' for HTML, 'compare' for diff.[/]")
        chat.write("")
        save_scan(result.to_dict())
        self.critical_count = sc.get("critical", 0)
        self.high_count = sc.get("high", 0)
        self.findings_count = total

    def _on_agent_complete(self, result):
        self.scanning = False
        chat = self.query_one("#chat-log", RichLog)
        total = result.get("total_findings", 0)
        steps = result.get("steps", [])
        chat.write("")
        chat.write(f"[msg-success]\u2714 Agent complete:[/] {total} findings across {len(result.get('targets', []))} target(s)")
        if steps:
            chat.write(f"[msg-system]Steps: {', '.join(steps)}[/]")
        chat.write("")

    def _update_module_status(self, mod_id, status, count=0):
        try:
            mod_log = self.query_one("#module-log", RichLog)
            all_mods = {**MODULE_REGISTRY, **LOCAL_MODULES}
            entry = all_mods.get(mod_id, {"name": mod_id.upper()})
            name = entry.get("name", mod_id.upper())
            if status == "scanning":
                mod_log.write(f"  [module-active]\u25cf {name:16}[/] [module-active]SCANNING...[/]")
            elif status == "done":
                mod_log.write(f"  [module-done]\u25cf {name:16}[/] [module-done]{count} findings  DONE[/]")
            elif status == "error":
                mod_log.write(f"  [module-error]\u25cf {name:16}[/] [module-error]ERROR[/]")
        except Exception:
            pass

    def _show_help(self):
        chat = self.query_one("#chat-log", RichLog)
        chat.write("""[bold #00ffcc]\u2550\u2550 NEXUS COMMANDS[/]
[bold]  scan <target> [with <mods>]   [/]Remote scan
[bold]  audit                        [/]Full local machine audit
[bold]  dev [path]                   [/]Developer project scan
[bold]  doctor                       [/]Security health check
[bold]  blitz <t1> <t2> ...         [/]Parallel multi-target scan
[bold]  subdomains <domain>           [/]Discover subdomains
[bold]  agent <goal>                 [/]Autonomous goal-driven scan
[bold]  screenshot <url>             [/]Browser screenshot
[bold]  open <url>                   [/]Open in browser
[bold]  report                       [/]Generate HTML report
[bold]  history                      [/]Show past scans
[bold]  compare                      [/]Diff last two scans
[bold]  secrets [path]               [/]Hunt for secrets
[bold]  ports                        [/]Show open ports
[bold]  modules                      [/]List all modules
[bold]  score                        [/]Show last score
[bold]  clear                        [/]Clear chat
[bold]  quit                         [/]Exit NEXUS
[dim]  Or just type any domain to scan it, or describe a goal in natural language.[/]""")
        chat.write("")

    def _generate_report(self):
        chat = self.query_one("#chat-log", RichLog)
        latest = get_latest()
        if not latest:
            chat.write("[msg-warning]No scan data. Run a scan first.[/]"); return
        chat.write("[msg-nexus]\u25b8 NEXUS:[/] Generating HTML report...")
        try:
            path = generate_html_report(latest)
            chat.write(f"[msg-success]\u2714 Report saved: [bold #aaaacc]{path}[/][/]")
        except Exception as e:
            chat.write(f"[msg-error]\u2718 Report error: {e}[/]")

    def _show_history(self):
        chat = self.query_one("#chat-log", RichLog)
        scans = list_scans(limit=10)
        if not scans:
            chat.write("[msg-system]No scan history yet.[/]"); return
        chat.write(f"[bold #00ffcc]\u2550\u2550 SCAN HISTORY ({len(scans)} recent)[/]")
        for s in scans:
            g = s.get("grade", "?")
            gc = GRADE_COLORS_RICH.get(g, "white")
            ts = s.get("_saved_at", "?")[:16]
            t = s.get("target", "?")[:30]
            sc = s.get("total_score", "?")
            fc = len(s.get("findings", []))
            chat.write(f"  [dim]{ts}[/]  [{gc}]{sc}/100 ({g})[/{gc}]  [#aaaacc]{t:30}[/]  [dim]{fc} findings[/]")
        chat.write("")

    def _compare_scans(self):
        chat = self.query_one("#chat-log", RichLog)
        scans = list_scans(limit=2)
        if len(scans) < 2:
            chat.write("[msg-warning]Need at least 2 scans to compare.[/]"); return
        try:
            d = diff_scans(scans[0]["_file"], scans[1]["_file"])
            chat.write("[bold #00ffcc]\u2550\u2550 COMPARISON[/]")
            chat.write(f"  [dim]A:[/] [#aaaacc]{d['scan_a']['target']}[/] [{GRADE_COLORS_RICH.get(d['scan_a']['grade'],'white')}]{d['scan_a']['score']}/100 ({d['scan_a']['grade']})[/]")
            chat.write(f"  [dim]B:[/] [#aaaacc]{d['scan_b']['target']}[/] [{GRADE_COLORS_RICH.get(d['scan_b']['grade'],'white')}]{d['scan_b']['score']}/100 ({d['scan_b']['grade']})[/]")
            change = d['score_change']
            color = "msg-success" if change > 0 else ("msg-error" if change < 0 else "msg-system")
            chat.write(f"  [{color}]Change: {'+' if change > 0 else ''}{change} pts[/]")
            if d['new']: chat.write(f"  [finding-critical]New ({len(d['new'])}):[/] {', '.join(d['new'][:5])}")
            if d['fixed']: chat.write(f"  [msg-success]Fixed ({len(d['fixed'])}):[/] {', '.join(d['fixed'][:5])}")
        except Exception as e:
            chat.write(f"[msg-error]\u2718 Compare error: {e}[/]")
        chat.write("")

    def _hunt_secrets(self):
        chat = self.query_one("#chat-log", RichLog)
        feed = self.query_one("#feed-log", RichLog)
        chat.write("[msg-nexus]\u25b8 NEXUS:[/] Hunting for secrets...")
        try:
            from .modules.host import _check_env_secrets
            from .modules.dev import _check_env_files, _check_hardcoded_secrets
            all_f = _check_env_secrets() + _check_env_files(os.path.abspath(".")) + _check_hardcoded_secrets(os.path.abspath("."))
            if not all_f:
                chat.write("[msg-success]\u2714 Clean. No secrets found.[/]")
            else:
                chat.write(f"[msg-warning]\u26a0 Found {len(all_f)} secret(s):[/]")
                for f in all_f[:20]:
                    sev = f.severity; c = SEV_COLORS.get(sev, "white")
                    chat.write(f"  [{c}]{sev.upper():8}[/{c}] {f.title}")
                    feed.write(f"[finding-{sev}]\u25cf {sev.upper():8}  {f.title}")
                    self.findings_count += 1
        except Exception as e:
            chat.write(f"[msg-error]\u2718 Error: {e}[/]")

    def _check_ports(self):
        chat = self.query_one("#chat-log", RichLog)
        feed = self.query_one("#feed-log", RichLog)
        chat.write("[msg-nexus]\u25b8 NEXUS:[/] Checking open ports...")
        try:
            from .modules.host import _check_open_ports
            findings = _check_open_ports()
            if not findings:
                chat.write("[msg-success]\u2714 No risky ports found.[/]")
            else:
                chat.write(f"[msg-warning]\u26a0 Found {len(findings)} port issue(s):[/]")
                for f in findings:
                    c = SEV_COLORS.get(f.severity, "white")
                    chat.write(f"  [{c}]{f.severity.upper():8}[/{c}] {f.title}")
                    feed.write(f"[finding-{f.severity}]\u25cf {f.severity.upper():8}  {f.title}")
                    self.findings_count += 1
        except Exception as e:
            chat.write(f"[msg-error]\u2718 Error: {e}[/]")

    def _discover_subdomains(self, domain):
        chat = self.query_one("#chat-log", RichLog)
        feed = self.query_one("#feed-log", RichLog)
        chat.write(f"[msg-nexus]\u25b8 NEXUS:[/] Discovering subdomains of [bold #aaaacc]{domain}[/]...")
        try:
            subs = discover_subdomains(domain)
            if not subs:
                chat.write("[msg-system]No subdomains found.[/]")
            else:
                chat.write(f"[msg-success]\u2714 Found {len(subs)} subdomain(s):[/]")
                for s in subs[:30]:
                    chat.write(f"  [#aaaacc]  {s}[/]")
                    feed.write(f"[#00ffcc]\u25cf SUBDOMAIN[/]  {s}")
        except Exception as e:
            chat.write(f"[msg-error]\u2718 Error: {e}[/]")

    def _take_screenshot(self, url):
        chat = self.query_one("#chat-log", RichLog)
        chat.write(f"[msg-nexus]\u25b8 NEXUS:[/] Taking screenshot of [bold #aaaacc]{url}[/]...")
        try:
            from .browser_mod import take_screenshot
            path = take_screenshot(url)
            chat.write(f"[msg-success]\u2714 Screenshot saved: [bold #aaaacc]{path}[/][/]")
        except ImportError:
            chat.write("[msg-warning]Install browser support: pip install reconpro[browser] && playwright install[/]")
        except Exception as e:
            chat.write(f"[msg-error]\u2718 Error: {e}[/]")

    def _open_browser(self, url):
        try:
            from .browser_mod import open_browser
            open_browser(url)
            chat = self.query_one("#chat-log", RichLog)
            chat.write(f"[msg-system]Opened {url} in browser.[/]")
        except Exception as e:
            chat = self.query_one("#chat-log", RichLog)
            chat.write(f"[msg-error]\u2718 Error: {e}[/]")

    def _show_last_score(self):
        chat = self.query_one("#chat-log", RichLog)
        latest = get_latest()
        if latest:
            g = latest.get("grade", "?")
            gc = GRADE_COLORS_RICH.get(g, "white")
            chat.write(f"  [{gc}]{latest.get('total_score', '?')}/100 ({g})[/{gc}] \u2014 {latest.get('target', '?')}")
        else:
            chat.write("  [msg-system]No scans yet. Run a scan first.[/]")

    def _list_modules(self):
        chat = self.query_one("#chat-log", RichLog)
        chat.write("[bold #00ffcc]\u2550\u2550 REMOTE MODULES[/]")
        for mid, entry in MODULE_REGISTRY.items():
            chat.write(f"  [#00ffcc]{mid:12}[/] [#aaaacc]{entry['name']}[/]")
        chat.write("")
        chat.write("[bold #00ffcc]\u2550\u2550 LOCAL MODULES[/]")
        for mid, entry in LOCAL_MODULES.items():
            chat.write(f"  [#00ffcc]{mid:12}[/] [#aaaacc]{entry['name']}[/]")
        chat.write("")

    def action_quick_scan(self):
        self.query_one("#cmd-input", Input).focus()
    def action_quick_audit(self):
        self._run_audit()
    def action_quick_doctor(self):
        self._run_doctor()
    def action_clear_chat(self):
        self.clear_chat()
    def action_quick_report(self):
        self._generate_report()
    def action_show_history(self):
        self._show_history()
    def action_quit_app(self):
        self.quit()
    def action_show_help(self):
        self._show_help()

    def clear_chat(self):
        try:
            self.query_one("#chat-log", RichLog).clear()
        except NoMatches:
            pass


def run_nexus():
    app = NexusApp()
    app.run()
