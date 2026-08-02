"""TUI Dashboard — full terminal UI using Rich only (no textual dep).

Visual dashboard with:
- Live score display
- Module status grid
- Findings feed
- Command input bar
- Keyboard shortcuts
"""
from __future__ import annotations

import os
import sys
import time
import threading
from typing import Any, Dict, List, Optional

from rich.console import Console
from rich.table import Table
from rich.text import Text
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from rich.columns import Columns
from rich.prompt import Prompt

from . import __version__
from .scanner import scan, audit_scan, MODULE_REGISTRY, LOCAL_MODULES
from .history import list_scans, get_latest, save_scan


SEV_COLORS = {
    "critical": "bright_red", "high": "red",
    "medium": "yellow", "low": "green", "info": "dim",
}
GRADE_COLORS = {
    "A+": "bright_green", "A": "green", "B": "yellow",
    "C": "red", "D": "bright_red", "F": "bold bright_red",
}


class DashboardState:
    def __init__(self):
        self.scanning = False
        self.scan_target = ""
        self.progress = 0
        self.current_module = ""
        self.last_result = None
        self.findings_feed: List[str] = []
        self.message = "Ready. Press [s] to scan, [a] to audit, [h] for help."


state = DashboardState()


def _build_layout() -> Layout:
    layout = Layout()
    layout.split(
        Layout(name="header", size=3),
        Layout(name="body"),
        Layout(name="input", size=3),
    )
    layout["body"].split_row(
        Layout(name="left", ratio=2),
        Layout(name="right", ratio=3),
    )
    layout["left"].split(
        Layout(name="score", size=8),
        Layout(name="modules", ratio=1),
        Layout(name="shortcuts"),
    )
    layout["right"].split(
        Layout(name="feed", ratio=3),
        Layout(name="details", ratio=2),
    )
    return layout


def _render_header() -> Panel:
    sc = state.last_result.severity_counts if state.last_result else {}
    total = len(state.last_result.findings) if state.last_result else 0
    target = state.scan_target or "no target"

    header_text = (
        f"[bold bright_white]RECONPRO[/] [dim]v{__version__}[/]  │  "
        f"Target: [cyan]{target}[/]  │  "
        f"Findings: [bold]{total}[/]  │  "
        f"[bright_red]{sc.get('critical',0)} crit[/]  "
        f"[red]{sc.get('high',0)} high[/]  "
        f"[yellow]{sc.get('medium',0)} med[/]  "
        f"[green]{sc.get('low',0)} low[/]"
    )
    return Panel(header_text, style="dim", border_style="bright_white")


def _render_score() -> Panel:
    if state.last_result:
        score = state.last_result.total_score
        grade = state.last_result.grade
        gc = GRADE_COLORS.get(grade, "white")

        bar_w = 36
        filled = int(score / 100 * bar_w)
        bar = "█" * filled + "░" * (bar_w - filled)

        text = (
            f"  {bar}  [{gc}]{score}/100 ({grade})[/{gc}]\n"
            f"  {state.message}"
        )
    else:
        text = f"  {'█' * 36}  [dim]---/100 (---)[/]\n  {state.message}"
    return Panel(text, title="[bold]SCORE[/bold]", border_style="bright_white", title_align="left")


def _render_modules() -> Panel:
    lines = []
    all_mods = {**MODULE_REGISTRY, **LOCAL_MODULES}
    for mid, entry in all_mods.items():
        name = entry["name"]
        if state.scanning and state.current_module == mid:
            status = "[bright_green]● SCANNING[/]"
        elif state.last_result and mid in state.last_result.module_results:
            count = len(state.last_result.module_results[mid].get("findings", []))
            status = f"[dim]{count} findings[/]"
        else:
            status = "[dim]idle[/]"
        lines.append(f"  [cyan]{mid:10}[/]  {name:16}  {status}")
    return Panel("\n".join(lines), title="[bold]MODULES[/bold]", border_style="dim", title_align="left")


def _render_feed() -> Panel:
    if not state.findings_feed:
        return Panel("  [dim]No findings yet. Run a scan.[/]", title="[bold]LIVE FEED[/bold]", border_style="dim", title_align="left")
    feed_text = "\n".join(state.findings_feed[-20:])
    return Panel(feed_text, title="[bold]LIVE FEED[/bold]", border_style="dim", title_align="left")


def _render_details() -> Panel:
    if not state.last_result or not state.last_result.findings:
        return Panel("  [dim]Scan results will appear here.[/]", title="[bold]FINDINGS[/bold]", border_style="dim", title_align="left")

    table = Table(border_style="dim", header_style="bold dim", show_header=True)
    table.add_column("Sev", width=7)
    table.add_column("Finding", style="white")

    for f in state.last_result.findings[:8]:
        sev = f.get("severity", "info")
        c = SEV_COLORS.get(sev, "white")
        table.add_row(f"[{c}]{sev[:3].upper()}[/{c}]", f.get("title", "")[:50])

    return Panel(table, title="[bold]FINDINGS[/bold]", border_style="dim", title_align="left")


def _render_shortcuts() -> Panel:
    return Panel(
        "  [bold][s][/] scan   [bold][a][/] audit   [bold][d][/] dev   [bold][D][/] doctor\n"
        "  [bold][h][/] history [bold][r][/] report  [bold][p][/] ports  [bold][x][/] secrets\n"
        "  [bold][q][/] quit",
        title="[dim]SHORTCUTS[/dim]",
        border_style="dim", title_align="left",
        padding=(0, 1),
    )


def _render_input() -> Panel:
    return Panel(
        "  [dim]Type a command: scan <target> | audit | dev | doctor | blitz t1 t2 | subdomains <domain> | quit[/]",
        border_style="bright_white",
    )


def _run_scan_bg(target: str, modules=None, all_modules=False, is_local=False, local_target="localhost", local_modules=None):
    """Run a scan in a background thread."""
    state.scanning = True
    state.scan_target = target
    state.findings_feed = []
    state.message = "Scanning..."

    try:
        if is_local:
            result = audit_scan(target=local_target, modules=local_modules)
        else:
            result = scan(target, modules=modules, all_modules=all_modules)

        state.last_result = result
        state.scanning = False

        # Build feed
        for f in result.findings:
            sev = f.get("severity", "info")
            c = SEV_COLORS.get(sev, "white")
            state.findings_feed.append(f"[{c}]{sev.upper():8}[/{c}]  {f.get('title', '')[:60]}")

        state.message = f"Done. {result.total_score}/100 ({result.grade})"
        save_scan(result.to_dict())
    except Exception as e:
        state.scanning = False
        state.message = f"Error: {e}"


def start_tui():
    """Start the TUI dashboard."""
    layout = _build_layout()

    console = Console()

    def get_renderable():
        layout["header"].update(_render_header())
        layout["left"]["score"].update(_render_score())
        layout["left"]["modules"].update(_render_modules())
        layout["left"]["shortcuts"].update(_render_shortcuts())
        layout["right"]["feed"].update(_render_feed())
        layout["right"]["details"].update(_render_details())
        layout["input"].update(_render_input())
        return layout

    with Live(get_renderable(), console=console, refresh_per_second=2, screen=True) as live:
        while True:
            # Render current state
            live.update(get_renderable())

            # Get command (non-blocking via short timeout simulation)
            # We use a thread to read input so Live keeps refreshing
            cmd = ""
            try:
                cmd = Prompt.ask("\n  [bold bright_cyan]>[/]", console=console)
            except (EOFError, KeyboardInterrupt):
                break

            cmd = cmd.strip().lower()
            if not cmd:
                continue

            if cmd in ("q", "quit", "exit"):
                break

            elif cmd == "s" or cmd.startswith("scan "):
                target = cmd.replace("scan ", "").strip() if cmd.startswith("scan ") else ""
                if not target:
                    target = Prompt.ask("  Target", console=console)
                threading.Thread(target=_run_scan_bg, args=(target,), daemon=True).start()

            elif cmd == "a" or cmd == "audit":
                state.scan_target = "localhost"
                threading.Thread(target=_run_scan_bg, args=("",), kwargs={"is_local": True}, daemon=True).start()

            elif cmd == "d" or cmd.startswith("dev"):
                path = "." if cmd == "d" else cmd.replace("dev ", "").strip() or "."
                state.scan_target = path
                threading.Thread(target=_run_scan_bg, args=("",), kwargs={"is_local": True, "local_target": path, "local_modules": ["dev"]}, daemon=True).start()

            elif cmd == "D" or cmd == "doctor":
                state.scan_target = "localhost"
                threading.Thread(target=_run_scan_bg, args=("",), kwargs={"is_local": True, "local_modules": ["doctor"]}, daemon=True).start()

            elif cmd.startswith("blitz "):
                import re
                targets = re.findall(r'[\w\-]+\.[\w]{2,}', cmd)
                if len(targets) >= 2:
                    from .parallel import blitz_scan
                    state.scan_target = f"{len(targets)} targets"
                    threading.Thread(target=lambda t: (blitz_scan(t), setattr(state, 'message', 'Blitz done')), args=(targets,), daemon=True).start()
                else:
                    state.message = "blitz needs 2+ targets: blitz t1.com t2.com"

            elif cmd.startswith("subdomain "):
                domain = cmd.split(" ", 1)[1].strip()
                from .subdomains import discover_subdomains
                subs = discover_subdomains(domain)
                state.findings_feed.append(f"[cyan]Found {len(subs)} subdomains:[/]")
                for s in subs[:10]:
                    state.findings_feed.append(f"  [cyan]  {s}[/]")
                state.message = f"{len(subs)} subdomains found for {domain}"

            elif cmd == "h" or cmd == "history":
                scans = list_scans(limit=5)
                if scans:
                    for s in scans:
                        g = s.get("grade", "?")
                        gc = GRADE_COLORS.get(g, "white")
                        state.findings_feed.append(
                            f"[{gc}]{s.get('total_score','?')}/100 ({g})[/{gc}] {s.get('target','?')[:30]}"
                        )
                else:
                    state.findings_feed.append("[dim]No history yet.[/]")

            elif cmd == "r" or cmd == "report":
                from .reports import generate_html_report
                if state.last_result:
                    path = generate_html_report(state.last_result.to_dict())
                    state.findings_feed.append(f"[green]Report: {path}[/]")
                else:
                    latest = get_latest()
                    if latest:
                        path = generate_html_report(latest)
                        state.findings_feed.append(f"[green]Report: {path}[/]")
                    else:
                        state.message = "No scan data for report"

            elif cmd == "p" or cmd == "ports":
                from .modules.host import _check_open_ports
                findings = _check_open_ports()
                if findings:
                    for f in findings:
                        c = SEV_COLORS.get(f.severity, "white")
                        state.findings_feed.append(f"[{c}]{f.severity.upper():8}[/{c}] {f.title}")
                else:
                    state.findings_feed.append("[green]No risky ports.[/]")

            elif cmd == "x" or cmd == "secrets":
                from .modules.host import _check_env_secrets
                from .modules.dev import _check_hardcoded_secrets
                all_f = _check_env_secrets() + _check_hardcoded_secrets(os.path.abspath("."))
                if all_f:
                    for f in all_f:
                        c = SEV_COLORS.get(f.severity, "white")
                        state.findings_feed.append(f"[{c}]{f.severity.upper():8}[/{c}] {f.title}")
                else:
                    state.findings_feed.append("[green]No secrets found.[/]")

            else:
                # Treat as a scan target
                if "." in cmd and " " not in cmd:
                    state.scan_target = cmd
                    threading.Thread(target=_run_scan_bg, args=(cmd,), daemon=True).start()
                else:
                    state.message = f"Unknown: {cmd}. Press [h] for shortcuts"

            live.update(get_renderable())
