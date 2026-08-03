"""ReconPro NEXUS — Interactive Textual TUI.

A mind-blowing terminal interface for ReconPro security scanner.
Concurrent agent-backed scanning with live findings feed,
module status grid, score tracking, and animated boot sequence.
"""
from __future__ import annotations

import asyncio
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from textual import work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical, VerticalScroll
from textual.css.query import NoMatches
from textual.events import Click, Key
from textual.reactive import reactive
from textual.screen import ModalScreen
from textual.timer import Timer
from textual.widget import Widget
from textual.widgets import (
    Footer,
    Header,
    Input,
    Label,
    RichLog,
    Static,
    Button,
)

# ════════════════════════════════════════════════════════════════════════════════
# Theme — single source of truth for all colors
# ════════════════════════════════════════════════════════════════════════════════

from .theme import Theme
from .widgets import ScoreGauge, Sparkline, StatCounter, VelocityMeter

VERSION = "7.0.0"
BG = Theme.current().BG
CYAN = Theme.current().CYAN
RED = Theme.current().RED
YELLOW = Theme.current().YELLOW
GREEN = Theme.current().GREEN
DIM_CYAN = Theme.current().DIM_CYAN
DIM_RED = Theme.current().DIM_RED
PANEL_BG = Theme.current().PANEL_BG
BORDER_COLOR = Theme.current().BORDER
HEADER_BG = Theme.current().HEADER_BG
INPUT_BG = Theme.current().INPUT_BG
TEXT_DIM = Theme.current().TEXT_DIM
MUTED = Theme.current().MUTED

SEV_STYLES: Dict[str, str] = {
    "critical": Theme.current().sev_style("critical"),
    "high": Theme.current().sev_style("high"),
    "medium": Theme.current().sev_style("medium"),
    "low": Theme.current().sev_style("low"),
    "info": Theme.current().sev_style("info"),
}

GRADE_COLORS: Dict[str, str] = {
    "A+": Theme.current().grade_color("A+"),
    "A": Theme.current().grade_color("A"),
    "B": Theme.current().grade_color("B"),
    "C": Theme.current().grade_color("C"),
    "D": Theme.current().grade_color("D"),
    "F": Theme.current().grade_color("F"),
}

MODULE_NAMES: Dict[str, str] = {
    "recon": "RECON",
    "auth": "AUTH BYPASS",
    "chain": "CHAIN HUNTER",
    "bot": "BOT HUNTER",
    "gorgon": "GORGON ULTRA",
    "oblivion": "OBLIVION",
    "vibesec": "VIBESEC",
    "nhi": "NHI GRAPH",
    "host": "HOST AUDIT",
    "dev": "DEV SEC",
    "doctor": "DOCTOR",
}

SPINNER_FRAMES = Theme.current().spinner_frames

# ════════════════════════════════════════════════════════════════════════════════
# Finding Detail Modal
# ════════════════════════════════════════════════════════════════════════════════


class FindingDetailModal(ModalScreen):
    """Modal overlay showing full finding details."""

    def __init__(self, finding: Dict[str, Any]) -> None:
        super().__init__()
        self.finding = finding

    def compose(self) -> ComposeResult:
        f = self.finding
        sev = f.get("severity", "info").lower()
        sev_color = SEV_STYLES.get(sev, "white")
        title = f.get("title", "Unknown")
        category = f.get("category", "")
        module = f.get("module", "")
        pts = f.get("points_deducted", 0)
        evidence = f.get("evidence", "")
        remediation = f.get("remediation", "No remediation available.")
        description = f.get("description", "")
        asset = f.get("asset", "")
        related_cves = f.get("related_cves", [])

        lines: List[str] = []
        lines.append(f"[{sev_color}][{sev.upper()}] {title}[/]")
        lines.append("")
        if asset:
            lines.append(f"[dim]Asset:[/] [cyan]{asset}[/]")
        if category:
            lines.append(f"[dim]Category:[/] {category}")
        if module:
            lines.append(f"[dim]Module:[/] {module}")
        lines.append(f"[dim]Points:[/] -{pts}")
        if related_cves:
            cve_ids = ", ".join(
                c.get("cve_id", "") for c in related_cves[:5] if c.get("cve_id")
            )
            if cve_ids:
                lines.append(f"[dim]CVEs:[/] [red]{cve_ids}[/]")
        lines.append("")
        if description:
            lines.append(f"[bold]Description:[/]")
            lines.append(f"[dim]{description}[/]")
            lines.append("")
        if evidence:
            lines.append(f"[bold]Evidence:[/]")
            lines.append(f"[dim]{evidence}[/]")
            lines.append("")
        lines.append(f"[bold]{GREEN}Remediation:[/]")
        lines.append(f"{GREEN}{remediation}[/]")

        content = "\n".join(lines)

        with Vertical(classes="modal-container"):
            yield Label(content, classes="modal-content")
            with Horizontal(classes="modal-actions"):
                yield Button("Close", variant="primary", id="close-modal")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "close-modal":
            self.dismiss()


# ════════════════════════════════════════════════════════════════════════════════
# Boot Screen Widget
# ════════════════════════════════════════════════════════════════════════════════


class BootScreen(Widget):
    """Full-screen animated boot sequence."""

    def __init__(self) -> None:
        super().__init__()
        self._step = 0
        self._spinner_idx = 0
        self._module_idx = 0
        self._module_names = list(MODULE_NAMES.values())
        self._done = False
        self._timer: Optional[Timer] = None

    def compose(self) -> ComposeResult:
        with Vertical(classes="boot-container"):
            yield Static("", id="boot-line-1", classes="boot-title")
            yield Static("", id="boot-line-2", classes="boot-line")
            yield Static("", id="boot-line-3", classes="boot-line")
            yield Static("", id="boot-line-4", classes="boot-line")

    def on_mount(self) -> None:
        self._timer = self.set_interval(0.04, self._tick)

    def _tick(self) -> None:
        app = self.app
        if not isinstance(app, NexusApp):
            return

        line1 = app.query_one("#boot-line-1", Static)
        line2 = app.query_one("#boot-line-2", Static)
        line3 = app.query_one("#boot-line-3", Static)
        line4 = app.query_one("#boot-line-4", Static)

        if self._step == 0:
            # Letter-by-letter title
            title = "RECONPRO NEXUS"
            chars = title[: self._spinner_idx]
            self._spinner_idx += 1
            line1.update(f"[{CYAN} bold]{chars}[/]")
            if self._spinner_idx > len(title):
                self._spinner_idx = 0
                self._step = 1
                line1.update(f"[{CYAN} bold]{title}[/]  [{DIM_CYAN}]v{VERSION}[/]")

        elif self._step == 1:
            # Spinner for "Initializing agent..."
            frame = SPINNER_FRAMES[self._spinner_idx % len(SPINNER_FRAMES)]
            self._spinner_idx += 1
            line2.update(f"  [{CYAN}]{frame}[/] [{DIM_CYAN}]Initializing agent...[/]")
            if self._spinner_idx > 30:
                self._spinner_idx = 0
                self._step = 2
                line2.update(f"  [{GREEN}]✓[/] [{DIM_CYAN}]Agent initialized.[/]")

        elif self._step == 2:
            # Module names appearing one by one
            if self._module_idx < len(self._module_names):
                visible = self._module_names[: self._module_idx + 1]
                self._module_idx += 1
                modules_str = "  ".join(f"[{CYAN}]○[/] [{DIM_CYAN}]{m}[/]" for m in visible)
                remaining = len(self._module_names) - self._module_idx
                if remaining > 0:
                    modules_str += f"  [{DIM_CYAN}]+{remaining} more...[/]"
                frame = SPINNER_FRAMES[self._spinner_idx % len(SPINNER_FRAMES)]
                self._spinner_idx += 1
                line3.update(
                    f"  [{CYAN}]{frame}[/] [{DIM_CYAN}]Loading {len(self._module_names)} modules...[/]\n  {modules_str}"
                )
            else:
                all_mods = "  ".join(
                    f"[{GREEN}]●[/] [{DIM_CYAN}]{m}[/]" for m in self._module_names
                )
                line3.update(
                    f"  [{GREEN}]✓[/] [{DIM_CYAN}]All {len(self._module_names)} modules loaded.[/]\n  {all_mods}"
                )
                self._step = 3
                self._spinner_idx = 0

        elif self._step == 3:
            # "Ready." with flash
            if self._spinner_idx == 0:
                line4.update(f"[{YELLOW} bold]  ▶  READY.[/]")
            elif self._spinner_idx == 6:
                line4.update(f"[{GREEN} bold]  ▶  READY.[/]")
            elif self._spinner_idx >= 10:
                self._done = True
                if self._timer:
                    self._timer.stop()
                self.app.call_from_thread(self.app._finish_boot)
            self._spinner_idx += 1


# ════════════════════════════════════════════════════════════════════════════════
# Module Status Cell Widget
# ════════════════════════════════════════════════════════════════════════════════


class ModuleCell(Static):
    """Single module status cell in the grid."""

    def __init__(self, module_id: str, name: str) -> None:
        super().__init__()
        self.module_id = module_id
        self.module_name = name
        self.status = "idle"  # idle | scanning | done | error
        self.finding_count = 0
        self._spinner_idx = 0
        self._timer: Optional[Timer] = None

    def on_mount(self) -> None:
        self._update_display()
        self._timer = self.set_interval(0.1, self._spin)

    def _spin(self) -> None:
        if self.status == "scanning":
            self._spinner_idx = (self._spinner_idx + 1) % len(SPINNER_FRAMES)
            self._update_display()

    def _update_display(self) -> None:
        name_short = self.module_name[:14]
        if self.status == "idle":
            icon = f"[{DIM_CYAN}]○[/]"
            status_text = f"[{DIM_CYAN}]idle[/]"
        elif self.status == "scanning":
            frame = SPINNER_FRAMES[self._spinner_idx]
            icon = f"[{CYAN}]{frame}[/]"
            status_text = f"[{CYAN}]scanning[/]"
        elif self.status == "done":
            icon = f"[{GREEN}]✓[/]"
            status_text = f"[{GREEN}]done ({self.finding_count})[/]"
        elif self.status == "error":
            icon = f"[{RED}]✗[/]"
            status_text = f"[{RED}]error[/]"
        else:
            icon = "○"
            status_text = "idle"

        self.update(
            f"{icon} [{CYAN} bold]{name_short}[/]\n  {status_text}"
        )

    def set_status(self, status: str, count: int = 0) -> None:
        self.status = status
        self.finding_count = count
        self._update_display()

    def on_unmount(self) -> None:
        if self._timer:
            self._timer.stop()


# ════════════════════════════════════════════════════════════════════════════════
# Pulsing Status Dot Widget
# ════════════════════════════════════════════════════════════════════════════════


class StatusDot(Static):
    """Pulsing dot indicator for scan status."""

    scanning: reactive[bool] = reactive(False)

    def __init__(self) -> None:
        super().__init__("")
        self._phase = 0

    def on_mount(self) -> None:
        self.set_interval(0.3, self._pulse)

    def watch_scanning(self, old: bool, new: bool) -> None:
        # Update visual state based on scanning status
        if new:
            self.update(f"[{self._get_pulse_color()}]●[/]")
        else:
            self.update(f"[{GREEN}]●[/]")

    def _get_pulse_color(self) -> str:
        return ["#003322", "#006644", CYAN, "#006644"][self._phase] if self.scanning else GREEN

    def _pulse(self) -> None:
        self._phase = (self._phase + 1) % 4
        if self.scanning:
            brightness = self._get_pulse_color()
            self.update(f"[{brightness}]●[/]")
        else:
            self.update(f"[{GREEN}]●[/]")


# ════════════════════════════════════════════════════════════════════════════════
# Main Application
# ════════════════════════════════════════════════════════════════════════════════


class NexusApp(App):
    """ReconPro NEXUS — The security scanner TUI."""

    TITLE = "RECONPRO NEXUS"
    SUB_TITLE = f"v{VERSION}"
    CSS = f"""
    /* ── Base ────────────────────────────────────────────── */
    Screen {{
        background: {BG};
        color: #ccccdd;
    }}

    /* ── Boot Screen ─────────────────────────────────────── */
    .boot-container {{
        width: 100%;
        height: 100%;
        align: center middle;
        padding: 4;
    }}
    .boot-title {{
        text-align: center;
        margin-bottom: 2;
    }}
    .boot-line {{
        text-align: center;
        margin-bottom: 1;
    }}

    /* ── Main Layout ─────────────────────────────────────── */
    #main-container {{
        display: none;
        width: 100%;
        height: 100%;
    }}
    #main-container.visible {{
        display: block;
    }}

    /* ── Header Bar ──────────────────────────────────────── */
    #app-header {{
        dock: top;
        width: 100%;
        height: 3;
        background: {HEADER_BG};
        border-bottom: solid {BORDER_COLOR};
        padding: 0 2;
        content-align: left middle;
    }}
    #header-title {{
        color: {CYAN};
        text-style: bold;
    }}
    #header-version {{
        color: {DIM_CYAN};
        margin-left: 1;
    }}
    #header-target {{
        color: #888899;
        margin-left: 2;
    }}
    #header-status {{
        color: {GREEN};
        margin-left: 1;
    }}
    #header-scanning {{
        color: {YELLOW};
        margin-left: 1;
        text-style: bold;
    }}
    #score-gauge {{
        margin-left: auto;
    }}

    /* ── Stats Bar ────────────────────────────────────── */
    #stats-bar {{
        dock: top;
        width: 100%;
        height: 1;
        background: {HEADER_BG};
        border-bottom: solid {BORDER_COLOR};
        padding: 0 2;
        content-align: left middle;
    }}
    #stat-findings {{ margin-right: 2; }}
    #stat-critical {{ margin-right: 2; }}
    #stat-high {{ margin-right: 2; }}
    #spark-findings {{ margin-right: 2; }}
    #spark-score {{ margin-right: 0; }}

    /* ── Velocity Meter ───────────────────────────────── */
    #velocity-meter {{
        dock: bottom;
        width: 100%;
        height: 1;
        background: {HEADER_BG};
        border-top: solid {BORDER_COLOR};
        padding: 0 2;
    }}

    /* ── Content Area ────────────────────────────────────── */
    #content {{
        width: 100%;
        height: 1fr;
        dock: top;
    }}

    /* ── Left Panel (Chat/Command) ────────────────────────── */
    #left-panel {{
        width: 40%;
        height: 100%;
        dock: left;
        border-right: solid {BORDER_COLOR};
    }}
    #chat-header {{
        height: 1;
        background: {HEADER_BG};
        border-bottom: solid {BORDER_COLOR};
        padding: 0 1;
        content-align: left middle;
        color: {CYAN};
        text-style: bold;
    }}
    #chat-log {{
        width: 100%;
        height: 1fr;
        border: none;
        background: {PANEL_BG};
        padding: 0 1;
    }}

    /* ── Right Panel ─────────────────────────────────────── */
    #right-panel {{
        width: 60%;
        height: 100%;
    }}

    /* ── Findings Feed ───────────────────────────────────── */
    #findings-header {{
        height: 1;
        background: {HEADER_BG};
        border-bottom: solid {BORDER_COLOR};
        padding: 0 1;
        content-align: left middle;
        color: {RED};
        text-style: bold;
    }}
    #findings-feed {{
        width: 100%;
        height: 3fr;
        border: none;
        background: {PANEL_BG};
        padding: 0 1;
    }}

    /* ── Module Grid ─────────────────────────────────────── */
    #modules-header {{
        height: 1;
        background: {HEADER_BG};
        border-top: solid {BORDER_COLOR};
        border-bottom: solid {BORDER_COLOR};
        padding: 0 1;
        content-align: left middle;
        color: {GREEN};
        text-style: bold;
    }}
    #module-grid {{
        width: 100%;
        height: 2fr;
        background: {PANEL_BG};
        padding: 0 1;
        layout: grid;
        grid-size: 3;
        grid-gutter: 0 2;
        grid-columns: 1fr 1fr 1fr;
        overflow-y: auto;
    }}
    .module-cell {{
        height: 3;
        padding: 0 1;
        border: solid {BORDER_COLOR};
        margin-bottom: 1;
        background: {BG};
        overflow: hidden;
    }}

    /* ── Bottom Bar ──────────────────────────────────────── */
    #bottom-bar {{
        dock: bottom;
        width: 100%;
        height: 3;
        background: {HEADER_BG};
        border-top: solid {BORDER_COLOR};
        padding: 0 1;
        content-align: left middle;
    }}
    #command-input {{
        width: 70%;
        background: {INPUT_BG};
        border: solid {BORDER_COLOR};
        color: {CYAN};
        padding: 0 1;
        margin-right: 2;
    }}
    #command-input:focus {{
        border: solid {CYAN};
    }}
    #bottom-info {{
        width: 30%;
        text-align: right;
        color: #888899;
    }}
    #finding-counter {{
        color: {RED};
        text-style: bold;
    }}

    /* ── Modal ───────────────────────────────────────────── */
    .modal-container {{
        align: center middle;
        background: rgba(10, 10, 20, 0.92);
        padding: 4 8;
    }}
    .modal-content {{
        background: {PANEL_BG};
        border: solid {CYAN};
        padding: 2 4;
        max-width: 120;
        max-height: 30;
        overflow-y: auto;
    }}
    .modal-actions {{
        align: center middle;
        margin-top: 1;
    }}
    .modal-actions Button {{
        margin: 0 2;
    }}

    /* ── Hide default header/footer ──────────────────────── */
    Header {{
        display: none;
    }}
    Footer {{
        display: none;
    }}

    /* ── Scrollbars (where supported) ────────────────────── */
    RichLog {{
        scrollbar-size: 1 1;
        scrollbar-color: {DIM_CYAN} {BG};
    }}
    VerticalScroll {{
        scrollbar-size: 1 1;
        scrollbar-color: {DIM_CYAN} {BG};
    }}
    """

    BINDINGS = [
        Binding("ctrl+l", "clear_feed", "Clear feed"),
        Binding("ctrl+s", "rescan", "Re-scan"),
        Binding("tab", "cycle_focus", "Cycle focus"),
        Binding("ctrl+c", "quit", "Quit"),
        Binding("d", "show_last_finding", "Detail"),
    ]

    # ── Reactive state ──
    score: reactive[int] = reactive(100)
    grade: reactive[str] = reactive("A+")
    finding_count: reactive[int] = reactive(0)
    is_scanning: reactive[bool] = reactive(False)
    current_target: reactive[str] = reactive("")
    scan_start_time: reactive[Optional[float]] = reactive(None)
    last_scan_data: reactive[Optional[Dict[str, Any]]] = reactive(None)

    def __init__(self) -> None:
        super().__init__()
        self._command_history: List[str] = []
        self._history_index: int = -1
        self._findings_list: List[Dict[str, Any]] = []
        self._last_finding: Optional[Dict[str, Any]] = None
        self._module_cells: Dict[str, ModuleCell] = {}
        self._boot_done = False
        self._boot_skipped = False
        self._elapsed_timer: Optional[Timer] = None
        self._focus_order = ["#command-input", "#chat-log", "#findings-feed", "#module-grid"]
        self._focus_idx = 0
        self._finding_severity_filter: Optional[str] = None

    # ── Compose ──────────────────────────────────────────────────────────────

    def compose(self) -> ComposeResult:
        # Boot screen (shown first)
        yield BootScreen(id="boot-screen")

        # Main container (hidden until boot finishes)
        with Container(id="main-container"):
            # Header
            with Horizontal(id="app-header"):
                yield Label("RECONPRO NEXUS", id="header-title")
                yield Label(f"v{VERSION}", id="header-version")
                yield Label("", id="header-target")
                yield StatusDot(id="status-dot")
                yield Label("", id="header-scanning")
                yield ScoreGauge(bar_width=14, id="score-gauge")

            # Stats bar — living data
            with Horizontal(id="stats-bar"):
                yield StatCounter(label="findings", icon="●", id="stat-findings")
                yield StatCounter(label="critical", icon="◆", color=RED, id="stat-critical")
                yield StatCounter(label="high", icon="◆", color=YELLOW, id="stat-high")
                yield Sparkline(max_points=30, title="FIND/MIN", color=CYAN, id="spark-findings")
                yield Sparkline(max_points=30, title="SCORE", color=GREEN, id="spark-score")

            # Content area
            with Horizontal(id="content"):
                # Left panel — Chat
                with Vertical(id="left-panel"):
                    yield Label("◄ COMMAND", id="chat-header")
                    yield RichLog(
                        id="chat-log",
                        highlight=True,
                        markup=True,
                        max_lines=500,
                        wrap=True,
                    )

                # Right panel
                with Vertical(id="right-panel"):
                    yield Label("► FINDINGS", id="findings-header")
                    yield RichLog(
                        id="findings-feed",
                        highlight=True,
                        markup=True,
                        max_lines=1000,
                        wrap=True,
                    )
                    yield Label("⬡ MODULES", id="modules-header")
                    with Container(id="module-grid"):
                        for mod_id, mod_name in MODULE_NAMES.items():
                            cell = ModuleCell(mod_id, mod_name)
                            cell.set_class(True, "module-cell")
                            self._module_cells[mod_id] = cell
                            yield cell

            # Velocity meter
            yield VelocityMeter(id="velocity-meter")

            # Bottom bar
            with Horizontal(id="bottom-bar"):
                yield Input(
                    placeholder="scan <target>  |  audit  |  agent <goal>  |  help",
                    id="command-input",
                )
                yield Label("", id="bottom-info")

    # ── Mount ───────────────────────────────────────────────────────────────

    def on_key(self, event: Key) -> None:
        """Handle key events — boot skip + history navigation."""
        # Skip boot on ANY key press during boot sequence
        if not self._boot_done and not self._boot_skipped:
            self._boot_skipped = True
            try:
                boot = self.query_one("#boot-screen", BootScreen)
                if boot._timer:
                    boot._timer.stop()
            except NoMatches:
                pass
            self._finish_boot()
            return

        # Command history navigation
        if event.key == "up" and self._history_index > 0:
            try:
                inp = self.query_one("#command-input", Input)
                if inp.has_focus:
                    self._history_index -= 1
                    inp.value = self._command_history[self._history_index]
            except NoMatches:
                pass
        elif event.key == "down":
            try:
                inp = self.query_one("#command-input", Input)
                if inp.has_focus:
                    if self._history_index < len(self._command_history) - 1:
                        self._history_index += 1
                        inp.value = self._command_history[self._history_index]
                    else:
                        self._history_index = len(self._command_history)
                        inp.value = ""
            except NoMatches:
                pass

    def on_mount(self) -> None:
        self._elapsed_timer = self.set_interval(1.0, self._update_elapsed)
        # Focus the input after a short delay
        self.set_timer(0.1, self._focus_input)

    def _focus_input(self) -> None:
        try:
            inp = self.query_one("#command-input", Input)
            inp.focus()
        except NoMatches:
            pass

    def _finish_boot(self) -> None:
        """Called from boot screen when animation completes."""
        try:
            boot = self.query_one("#boot-screen", BootScreen)
            boot.remove()
        except NoMatches:
            pass

        try:
            main = self.query_one("#main-container", Container)
            main.set_class(True, "visible")
        except NoMatches:
            pass

        self._boot_done = True
        self._focus_input()

        # Welcome message in chat
        chat = self.query_one("#chat-log", RichLog)
        chat.write(f"[{CYAN} bold]RECONPRO NEXUS v{VERSION}[/]")
        chat.write(f"[{DIM_CYAN}]──────────────────────────────────────[/]")
        chat.write(f"[{GREEN}]●[/] [{DIM_CYAN}]System ready. {len(MODULE_NAMES)} modules loaded.[/]")
        chat.write(f"[{DIM_CYAN}]  Type [cyan bold]help[/] for commands, or start with [cyan bold]scan <target>[/][/]")
        chat.write("")

    # ── Reactive watchers ──────────────────────────────────────────────────

    def watch_score(self, old: int, new: int) -> None:
        try:
            gauge = self.query_one("#score-gauge", ScoreGauge)
            gauge.set_score(new, self.grade)
        except NoMatches:
            pass
        # Push to score sparkline
        try:
            spark = self.query_one("#spark-score", Sparkline)
            spark.push(float(new))
        except NoMatches:
            pass

    def watch_grade(self, old: str, new: str) -> None:
        try:
            gauge = self.query_one("#score-gauge", ScoreGauge)
            gauge.set_score(self.score, new)
        except NoMatches:
            pass

    def watch_finding_count(self, old: int, new: int) -> None:
        delta = new - old if old > 0 else 0
        crit = sum(
            1 for f in self._findings_list
            if f.get("severity", "").lower() == "critical"
        )
        high = sum(
            1 for f in self._findings_list
            if f.get("severity", "").lower() == "high"
        )

        # Update stat counters
        try:
            self.query_one("#stat-findings", StatCounter).set(new, delta=delta)
        except NoMatches:
            pass
        try:
            self.query_one("#stat-critical", StatCounter).set(crit)
        except NoMatches:
            pass
        try:
            self.query_one("#stat-high", StatCounter).set(high)
        except NoMatches:
            pass

        # Push to findings sparkline (findings per minute approximation)
        try:
            spark = self.query_one("#spark-findings", Sparkline)
            spark.push(float(delta))
        except NoMatches:
            pass

        # Keep bottom-info label too (compact view)
        try:
            el = self.query_one("#bottom-info", Label)
            el.update(
                f"[{GREEN}]●[/] {new} findings  [{RED}]{crit}[/]C [{YELLOW}]{high}[/]H"
            )
        except NoMatches:
            pass

    def watch_is_scanning(self, old: bool, new: bool) -> None:
        try:
            dot = self.query_one("#status-dot", StatusDot)
            dot.scanning = new
            scan_label = self.query_one("#header-scanning", Label)
            if new:
                scan_label.update(f"[{YELLOW} bold]SCANNING[/]")
                self.scan_start_time = time.monotonic()
                # Start velocity meter
                try:
                    self.query_one("#velocity-meter", VelocityMeter).start()
                except NoMatches:
                    pass
            else:
                scan_label.update(f"[{GREEN}]DONE[/]")
                self.scan_start_time = None
                # Stop velocity meter
                try:
                    self.query_one("#velocity-meter", VelocityMeter).stop()
                except NoMatches:
                    pass
        except NoMatches:
            pass

    def watch_current_target(self, old: str, new: str) -> None:
        try:
            el = self.query_one("#header-target", Label)
            if new:
                el.update(f"[{DIM_CYAN}]▸ {new}[/]")
            else:
                el.update("")
        except NoMatches:
            pass

    def _update_elapsed(self) -> None:
        if self.is_scanning and self.scan_start_time:
            elapsed = time.monotonic() - self.scan_start_time
            mins, secs = divmod(int(elapsed), 60)
            try:
                scan_label = self.query_one("#header-scanning", Label)
                scan_label.update(f"[{YELLOW} bold]SCANNING {mins:02d}:{secs:02d}[/]")
            except NoMatches:
                pass

    # ── Input handling ─────────────────────────────────────────────────────

    def on_input_submitted(self, event: Input.Submitted) -> None:
        """Handle user command input."""
        raw = event.value.strip()
        event.input.value = ""

        if not raw:
            return

        # Handle theme command
        parts = raw.split()
        if parts[0].lower() == "theme":
            self._handle_theme(parts[1:])
            return

        # Update history
        if self._command_history and self._command_history[-1] != raw:
            self._command_history.append(raw)
        elif not self._command_history:
            self._command_history.append(raw)
        self._history_index = len(self._command_history)

        self._process_command(raw)

    def action_cycle_focus(self) -> None:
        """Tab cycles focus between panels and input."""
        self._focus_idx = (self._focus_idx + 1) % len(self._focus_order)
        selector = self._focus_order[self._focus_idx]
        try:
            widget = self.query_one(selector, Widget)
            widget.focus()
        except NoMatches:
            pass

    def action_clear_feed(self) -> None:
        """Ctrl+L: clear findings feed."""
        try:
            feed = self.query_one("#findings-feed", RichLog)
            feed.clear()
        except NoMatches:
            pass

    def action_rescan(self) -> None:
        """Ctrl+S: re-scan the last target."""
        if self.current_target:
            self._run_scan_worker(self.current_target)
            chat = self.query_one("#chat-log", RichLog)
            chat.write(f"[{CYAN}]► Re-scanning [bold]{self.current_target}[/][/]...")
        else:
            chat = self.query_one("#chat-log", RichLog)
            chat.write(f"[{RED}]No previous target to re-scan.[/]")

    # ── Command Processing ──────────────────────────────────────────────────

    def _chat(self, text: str) -> None:
        """Write a line to the chat log."""
        try:
            chat = self.query_one("#chat-log", RichLog)
            chat.write(text)
        except NoMatches:
            pass

    def _feed(self, text: str) -> None:
        """Write a line to the findings feed."""
        try:
            feed = self.query_one("#findings-feed", RichLog)
            feed.write(text)
        except NoMatches:
            pass

    def _set_all_modules_status(self, status: str, count: int = 0) -> None:
        """Set all module cells to a given status."""
        for cell in self._module_cells.values():
            cell.set_status(status, count)

    def _process_command(self, raw: str) -> None:
        """Parse and execute a user command."""
        self._chat(f"[{CYAN} bold]▸ {raw}[/]")

        parts = raw.split()
        cmd = parts[0].lower()
        args = parts[1:]

        if cmd in ("quit", "q", "exit"):
            self.exit()
            return

        if cmd == "clear":
            self._clear_all_feeds()
            return

        if cmd == "help":
            self._show_help()
            return

        if cmd == "scan":
            self._handle_scan(args)
            return

        if cmd == "audit":
            self._handle_audit(args)
            return

        if cmd == "dev":
            self._handle_dev(args)
            return

        if cmd == "doctor":
            self._handle_doctor()
            return

        if cmd == "blitz":
            self._handle_blitz(args)
            return

        if cmd == "subdomains":
            self._handle_subdomains(args)
            return

        if cmd == "agent":
            self._handle_agent(args)
            return

        if cmd == "swarm":
            self._handle_swarm(args)
            return

        if cmd == "adversarial":
            self._handle_adversarial(args)
            return

        if cmd == "graph":
            self._handle_graph()
            return

        if cmd == "export":
            self._handle_export(args)
            return

        if cmd == "history":
            self._handle_history()
            return

        if cmd == "theme":
            # Already handled in on_input_submitted before _process_command
            return

        self._chat(f"[{RED}]Unknown command: {cmd}[/]")
        self._chat(f"[{DIM_CYAN}]Type [cyan]help[/] for available commands.[/]")

    def _handle_theme(self, args: List[str]) -> None:
        """Handle theme switching command."""
        if not args or args[0].lower() in ("list", "ls"):
            available = Theme.available_themes()
            current = Theme.current_name()
            self._chat(f"[{CYAN} bold]  THEMES[/]")
            for name in available:
                marker = f" [{GREEN}]●[/]" if name == current else "  [{DIM_CYAN}]○[/]"
                display_name = THEMES[name].get("name", name)
                self._chat(f"  {marker} [{CYAN}]{name}[/] [{MUTED}]- {display_name}[/]")
            return

        name = args[0].lower()
        try:
            Theme.set_theme(name)
            self._chat(f"[{GREEN}]  ✓ Theme changed to [bold]{name}[/]. Restart nexus to apply fully.[/]")
        except ValueError as e:
            self._chat(f"[{RED}]  {e}[/]")

    def _clear_all_feeds(self) -> None:
        try:
            self.query_one("#findings-feed", RichLog).clear()
            self.query_one("#chat-log", RichLog).clear()
        except NoMatches:
            pass
        self._findings_list.clear()
        self.finding_count = 0
        self.score = 100
        self.grade = "A+"
        self._set_all_modules_status("idle")
        self._chat(f"[{DIM_CYAN}]Cleared.[/]")

    def _show_help(self) -> None:
        help_lines = [
            ("[bold cyan]COMMANDS[/]", ""),
            ("[cyan]scan <target>[/]", "Remote security scan"),
            ("[cyan]scan <target> with <mods>[/]", "Scan specific modules"),
            ("[cyan]audit[/]", "Local machine audit"),
            ("[cyan]dev [path][/]", "Dev project scan"),
            ("[cyan]doctor[/]", "Health check"),
            ("[cyan]blitz <t1> <t2> ...[/]", "Parallel multi-target"),
            ("[cyan]subdomains <domain>[/]", "Subdomain discovery"),
            ("[cyan]agent <goal>[/]", "Autonomous agent"),
            ("[cyan]swarm <target>[/]", "Multi-agent swarm"),
            ("[cyan]adversarial <target>[/]", "Adversarial loop"),
            ("[cyan]graph[/]", "Knowledge graph stats"),
            ("[cyan]export <format>[/]", "Export last scan"),
            ("[cyan]history[/]", "Scan history"),
            ("[cyan]theme [name][/]", "Switch theme (cyberpunk, midnight, matrix, solarized, blood, snow)"),
            ("[cyan]theme list[/]", "List available themes"),
            ("[cyan]clear[/]", "Clear all feeds"),
            ("[cyan]quit[/]", "Exit"),
            ("", ""),
            ("[bold cyan]KEYS[/]", ""),
            (f"[{DIM_CYAN}]Tab[/]      Cycle focus", ""),
            (f"[{DIM_CYAN}]Ctrl+L[/]   Clear findings", ""),
            (f"[{DIM_CYAN}]Ctrl+S[/]   Re-scan last target", ""),
            (f"[{DIM_CYAN}]↑/↓[/]     Command history", ""),
            (f"[{DIM_CYAN}]Any key[/]  Skip boot animation", ""),
        ]
        for line in help_lines:
            self._chat(f"  {line[0]}  {line[1]}")

    # ── Command Handlers ───────────────────────────────────────────────────

    def _handle_scan(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: scan <target> [with <mod1> <mod2> ...][/]")
            return

        # Parse "with" clause
        modules: Optional[List[str]] = None
        target_parts: List[str] = []
        found_with = False
        mod_parts: List[str] = []
        for a in args:
            if a.lower() == "with":
                found_with = True
                continue
            if found_with:
                mod_parts.append(a)
            else:
                target_parts.append(a)

        target = " ".join(target_parts)
        if not target:
            self._chat(f"[{RED}]No target specified.[/]")
            return

        if mod_parts:
            modules = [m.strip().lower() for m in mod_parts]
            self._chat(f"[{DIM_CYAN}]Scanning [cyan bold]{target}[/] with modules: {', '.join(modules)}[/]")
        else:
            self._chat(f"[{DIM_CYAN}]Scanning [cyan bold]{target}[/]...[/]")

        self.current_target = target
        self._run_scan_worker(target, modules=modules)

    def _handle_audit(self, args: List[str]) -> None:
        target = args[0] if args else "."
        self.current_target = target if target != "." else "local-audit"
        self._chat(f"[{DIM_CYAN}]Auditing local machine ({target})...[/]")
        self._run_scan_worker(target, is_local=True)

    def _handle_dev(self, args: List[str]) -> None:
        path = args[0] if args else "."
        self.current_target = f"dev:{path}"
        self._chat(f"[{DIM_CYAN}]Scanning dev project at [cyan]{path}[/]...[/]")
        self._run_scan_worker(path, is_local=True, modules=["dev"])

    def _handle_doctor(self) -> None:
        self.current_target = "doctor"
        self._chat(f"[{DIM_CYAN}]Running health check...[/]")
        self._run_scan_worker("localhost", is_local=True, modules=["doctor"])

    def _handle_blitz(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: blitz <target1> <target2> ...[/]")
            return
        self._chat(f"[{DIM_CYAN}]Blitz scanning {len(args)} targets...[/]")
        self._run_blitz_worker(args)

    def _handle_subdomains(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: subdomains <domain>[/]")
            return
        domain = args[0]
        self._chat(f"[{DIM_CYAN}]Discovering subdomains of [cyan bold]{domain}[/]...[/]")
        self._run_subdomain_worker(domain)

    def _handle_agent(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: agent <goal>[/]")
            return
        goal = " ".join(args)
        self._chat(f"[{YELLOW} bold]🤖 Agent:[/] [dim]Goal: {goal}[/]")
        self._run_agent_worker(goal)

    def _handle_swarm(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: swarm <target>[/]")
            return
        target = args[0]
        self.current_target = target
        self._chat(f"[{RED} bold]⚡ Swarm:[/] [dim]Deploying agents against {target}...[/]")
        self._run_swarm_worker(target)

    def _handle_adversarial(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: adversarial <target>[/]")
            return
        target = args[0]
        self.current_target = target
        self._chat(f"[{RED} bold]⚔  Adversarial:[/] [dim]Starting loop against {target}...[/]")
        self._run_adversarial_worker(target)

    def _handle_graph(self) -> None:
        self._chat(f"[{DIM_CYAN}]Loading knowledge graph...[/]")
        self._run_graph_worker()

    def _handle_export(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: export <format>  (sarif, md, json, html)[/]")
            return
        fmt = args[0].lower()
        if self.last_scan_data is None:
            self._chat(f"[{RED}]No scan data to export. Run a scan first.[/]")
            return
        self._run_export_worker(fmt)

    def _handle_history(self) -> None:
        self._run_history_worker()

    # ════════════════════════════════════════════════════════════════════════
    # Background Workers (concurrent)
    # ════════════════════════════════════════════════════════════════════════

    @work(exclusive=False, thread=True)
    def _run_scan_worker(
        self,
        target: str,
        modules: Optional[List[str]] = None,
        is_local: bool = False,
    ) -> None:
        """Run a scan in a background thread."""
        self.call_from_thread(self.is_scanning.set, True)

        # Set modules to scanning
        if modules:
            for m in modules:
                if m in self._module_cells:
                    self.call_from_thread(self._module_cells[m].set_status, "scanning")
        else:
            all_mods = (
                list(MODULE_NAMES.keys())
                if is_local
                else [k for k in MODULE_NAMES if k not in ("host", "dev", "doctor")]
            )
            for m in all_mods:
                if m in self._module_cells:
                    self.call_from_thread(self._module_cells[m].set_status, "scanning")

        try:
            from .scanner import scan, audit_scan
            from .history import save_scan

            self.call_from_thread(
                self._chat, f"[{DIM_CYAN}]  ⏳ Scan in progress...[/]"
            )

            if is_local:
                result = audit_scan(target=target, modules=modules)
            else:
                result = scan(target=target, modules=modules)

            # Process findings
            data = result.to_dict()
            self.call_from_thread(self._on_scan_complete, data, modules, is_local)

            # Save to history
            try:
                save_scan(data, label="nexus")
            except Exception:
                pass

        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  ✗ Scan error: {e}[/]")
            if modules:
                for m in modules:
                    if m in self._module_cells:
                        self.call_from_thread(self._module_cells[m].set_status, "error")
            else:
                self.call_from_thread(self._set_all_modules_status, "error")

        finally:
            self.call_from_thread(self.is_scanning.set, False)

    @work(exclusive=False, thread=True)
    def _run_blitz_worker(self, targets: List[str]) -> None:
        """Run parallel blitz scan."""
        self.call_from_thread(self.is_scanning.set, True)
        self.call_from_thread(self._set_all_modules_status, "scanning")

        try:
            from .parallel import blitz_scan

            self.call_from_thread(
                self._chat, f"[{DIM_CYAN}]  ⏳ Blitz scanning {len(targets)} targets...[/]"
            )

            result = blitz_scan(targets, save=True)

            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Blitz complete. {result['successful']}/{result['targets_scanned']} successful, "
                f"{result['total_findings']} findings, avg score: {result['average_score']} ({result['average_grade']})[/]",
            )

            for t, r in result.get("results", {}).items():
                self.call_from_thread(self._process_scan_data, r, modules_list=None)

        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  ✗ Blitz error: {e}[/]")
            self.call_from_thread(self._set_all_modules_status, "error")

        finally:
            self.call_from_thread(self.is_scanning.set, False)

    @work(exclusive=False, thread=True)
    def _run_subdomain_worker(self, domain: str) -> None:
        """Discover subdomains in background."""
        self.call_from_thread(self.is_scanning.set, True)

        try:
            from .subdomains import discover_subdomains

            self.call_from_thread(
                self._chat, f"[{DIM_CYAN}]  ⏳ Discovering subdomains...[/]"
            )

            subs = discover_subdomains(domain)

            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Found {len(subs)} subdomain(s) for {domain}[/]",
            )

            for sub in subs:
                self.call_from_thread(
                    self._feed, f"  [{CYAN}]SUB[/] [{DIM_CYAN}]{sub}[/]"
                )
                self.call_from_thread(self.finding_count.set, self.finding_count + 1)

            if subs:
                self.call_from_thread(
                    self._chat, f"[{DIM_CYAN}]  Use [cyan]blitz {' '.join(subs[:10])}[/] to scan them.[/]"
                )

        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  ✗ Subdomain error: {e}[/]")

        finally:
            self.call_from_thread(self.is_scanning.set, False)

    @work(exclusive=False, thread=True)
    def _run_agent_worker(self, goal: str) -> None:
        """Run autonomous agent."""
        self.call_from_thread(self.is_scanning.set, True)
        self.call_from_thread(self._set_all_modules_status, "scanning")

        try:
            from .agent import run_agent

            self.call_from_thread(
                self._chat, f"[{YELLOW}]  🤖 Agent thinking...[/]"
            )

            result = run_agent(goal, save=True)

            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Agent complete. {result['total_findings']} findings across {len(result['targets'])} target(s).[/]",
            )

            for step in result.get("steps", []):
                self.call_from_thread(
                    self._chat, f"    [{YELLOW}]▸[/] [{DIM_CYAN}]{step}[/]"
                )

            for r in result.get("results", []):
                self.call_from_thread(self._process_scan_data, r, modules_list=None)

        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  ✗ Agent error: {e}[/]")
            self.call_from_thread(self._set_all_modules_status, "error")

        finally:
            self.call_from_thread(self.is_scanning.set, False)

    @work(exclusive=False, thread=True)
    def _run_swarm_worker(self, target: str) -> None:
        """Run swarm."""
        self.call_from_thread(self.is_scanning.set, True)

        # Map swarm agents to module cells
        swarm_modules = ["recon", "auth", "chain", "gorgon", "oblivion", "vibesec", "nhi"]
        for m in swarm_modules:
            if m in self._module_cells:
                self.call_from_thread(self._module_cells[m].set_status, "scanning")

        try:
            from .swarm import run_swarm

            self.call_from_thread(
                self._chat, f"[{RED}]  ⚡ Deploying swarm...[/]"
            )

            result = run_swarm(target, mode="full")

            self.call_from_thread(
                self._chat, f"[{GREEN}]  ✓ Swarm complete.[/]"
            )

            # Process each agent's findings
            for agent_name, agent_msg in result.agents.items():
                agent_findings = agent_msg.findings if agent_msg else []
                for f in agent_findings:
                    self.call_from_thread(self._add_finding_to_feed, f)

            for m in swarm_modules:
                if m in self._module_cells:
                    self.call_from_thread(self._module_cells[m].set_status, "done")

            summary = result.summary() if hasattr(result, "summary") else "Swarm finished"
            self.call_from_thread(self._chat, f"[{DIM_CYAN}]  {summary}[/]")

        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  ✗ Swarm error: {e}[/]")
            for m in swarm_modules:
                if m in self._module_cells:
                    self.call_from_thread(self._module_cells[m].set_status, "error")

        finally:
            self.call_from_thread(self.is_scanning.set, False)

    @work(exclusive=False, thread=True)
    def _run_adversarial_worker(self, target: str) -> None:
        """Run adversarial loop."""
        self.call_from_thread(self.is_scanning.set, True)
        self.call_from_thread(self._set_all_modules_status, "scanning")

        try:
            from .adversarial import run_adversarial

            self.call_from_thread(
                self._chat, f"[{RED}]  ⚔  Starting adversarial loop...[/]"
            )

            result = run_adversarial(target, max_rounds=3)

            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Adversarial complete. {result.findings_fixed} fixed, {result.findings_unfixed} remaining.[/]"
            )
            self.call_from_thread(
                self._chat,
                f"[{DIM_CYAN}]    Score: {result.initial_grade} ({result.initial_score}) → {result.final_grade} ({result.final_score})[/]"
            )

            if result.remediation_report:
                for line in result.remediation_report.split("\n")[:20]:
                    self.call_from_thread(self._chat, f"    [{DIM_CYAN}]{line}[/]")

            self.call_from_thread(self._set_all_modules_status, "done")

        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  ✗ Adversarial error: {e}[/]")
            self.call_from_thread(self._set_all_modules_status, "error")

        finally:
            self.call_from_thread(self.is_scanning.set, False)

    @work(exclusive=False, thread=True)
    def _run_graph_worker(self) -> None:
        """Show knowledge graph stats."""
        try:
            from .knowledge_graph import SecurityKnowledgeGraph

            graph = SecurityKnowledgeGraph()
            stats = graph.stats()

            self.call_from_thread(
                self._chat,
                f"[{CYAN} bold]  Knowledge Graph Stats[/]"
            )
            for key, val in stats.items():
                self.call_from_thread(
                    self._chat, f"    [{DIM_CYAN}]{key}:[/] {val}"
                )

        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  Graph error: {e}[/]")

    @work(exclusive=False, thread=True)
    def _run_export_worker(self, fmt: str) -> None:
        """Export last scan data."""
        try:
            from .formats import export

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            target_name = self.last_scan_data.get("target", "scan") if self.last_scan_data else "scan"
            filename = f"reconpro_{target_name}_{timestamp}.{fmt}"

            self.call_from_thread(
                self._chat, f"[{DIM_CYAN}]  Exporting as {fmt}...[/]"
            )

            path = export(self.last_scan_data, filename, format=fmt)

            self.call_from_thread(
                self._chat, f"[{GREEN}]  ✓ Exported to: {path}[/]"
            )

        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  ✗ Export error: {e}[/]")

    @work(exclusive=False, thread=True)
    def _run_history_worker(self) -> None:
        """Show scan history."""
        try:
            from .history import list_scans

            scans = list_scans(limit=15)

            if not scans:
                self.call_from_thread(self._chat, f"[{DIM_CYAN}]  No scan history found.[/]")
                return

            self.call_from_thread(
                self._chat, f"[{CYAN} bold]  Recent Scans ({len(scans)})[/]"
            )

            for s in scans:
                target = s.get("target", "?")
                score = s.get("total_score", "?")
                grade = s.get("grade", "?")
                n_findings = len(s.get("findings", []))
                gc = GRADE_COLORS.get(grade, "#ccccdd")
                saved = s.get("_saved_at", "?")[:19]
                self.call_from_thread(
                    self._chat,
                    f"    [{gc}]{grade}[/] [{DIM_CYAN}]{score}[/] {n_findings}f  [cyan]{target}[/]  [dim]{saved}[/]"
                )

        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  History error: {e}[/]")

    # ── Scan Data Processing ───────────────────────────────────────────────

    def _on_scan_complete(
        self,
        data: Dict[str, Any],
        modules: Optional[List[str]],
        is_local: bool,
    ) -> None:
        """Process completed scan data on the main thread."""
        self._process_scan_data(data, modules)

        # Update score
        new_score = data.get("total_score", 100)
        new_grade = data.get("grade", "A+")
        self.score = new_score
        self.grade = new_grade
        self.last_scan_data = data

        # Summary in chat
        n = len(data.get("findings", []))
        sc = data.get("severity_counts", {})
        mods_run = data.get("modules_run", [])
        gc = GRADE_COLORS.get(new_grade, "#ccccdd")

        self._chat(f"[{gc} bold]  ✓ Scan complete[/]")
        self._chat(
            f"    [{gc}]{new_grade}[/] [{DIM_CYAN}]{new_score}/100 | {n} findings[/]"
        )
        if sc.get("critical"):
            self._chat(f"    [{RED}]{sc['critical']} critical[/] [{RED}]{sc.get('high', 0)} high[/] [{YELLOW}]{sc.get('medium', 0)} medium[/] [{GREEN}]{sc.get('low', 0)} low[/]")
        self._chat(
            f"    [{DIM_CYAN}]Modules: {', '.join(mods_run)}[/]"
        )

        # Set module statuses to done
        for m in mods_run:
            if m in self._module_cells:
                mod_findings = sum(
                    1 for f in data.get("findings", []) if f.get("module") == m
                )
                self._module_cells[m].set_status("done", mod_findings)

    def _process_scan_data(
        self,
        data: Dict[str, Any],
        modules_list: Optional[List[str]],
    ) -> None:
        """Add findings from scan data to the feed."""
        findings = data.get("findings", [])
        for f in findings:
            self._add_finding_to_feed(f)

        # Update score if not already set
        new_score = data.get("total_score")
        new_grade = data.get("grade")
        if new_score is not None:
            self.score = new_score
        if new_grade is not None:
            self.grade = new_grade
        self.last_scan_data = data

    def _add_finding_to_feed(self, finding: Dict[str, Any]) -> None:
        """Add a single finding to the feed and update counters."""
        self._findings_list.append(finding)
        self._last_finding = finding
        self.finding_count = len(self._findings_list)

        sev = finding.get("severity", "info").lower()
        sev_style = SEV_STYLES.get(sev, "white")
        module = finding.get("module", "?").upper()
        title = finding.get("title", "Unknown finding")
        pts = finding.get("points_deducted", 0)

        # Truncate long titles
        if len(title) > 60:
            title = title[:57] + "..."

        idx = len(self._findings_list)
        sev_tag = f"[{sev_style} bold]{sev.upper()[0:4]}[/]"
        module_tag = f"[{CYAN}]{module}[/]"

        self._feed(f"  [{DIM_CYAN}]{idx:>3}[/] {sev_tag} {module_tag}: {title} [{DIM_CYAN}](-{pts})[/]")

        # Also show in chat if critical or high
        if sev in ("critical", "high"):
            self._chat(f"    {sev_tag} [{RED}]{title}[/] [{DIM_CYAN}](-{pts})[/]")
            # Pulse the findings header for visual emphasis
            self._pulse_findings_header()

    # ── Finding Detail Modal & Pulse ──────────────────────────────────────

    def on_click(self, event: Click) -> None:
        """Open finding detail modal for the clicked finding.

        Uses the vertical click position to determine which finding index
        the user clicked on, mapping it to _findings_list.
        """
        try:
            if (
                isinstance(event.widget, RichLog)
                and event.widget.id == "findings-feed"
                and self._findings_list
            ):
                # Get the line offset to determine which finding was clicked.
                # Each finding entry is 1 line in the RichLog.
                # We use the y coordinate relative to the widget to estimate the index.
                region = event.widget.region
                if region is not None:
                    # Calculate which line was clicked relative to the scroll position
                    scroll_offset = event.widget.scroll_y
                    click_y = event.y - region.y
                    # Each finding takes 1 line; estimate index from click position
                    # Account for scroll position
                    line_height = 1
                    if hasattr(event.widget, "_line_height"):
                        line_height = event.widget._line_height
                    clicked_index = int((click_y + scroll_offset * line_height) / line_height)
                    # Clamp to valid range
                    clicked_index = max(0, min(clicked_index, len(self._findings_list) - 1))
                    finding = self._findings_list[clicked_index]
                else:
                    finding = self._findings_list[-1]
                self.push_screen(FindingDetailModal(finding))
        except (NoMatches, Exception):
            pass

    def action_show_last_finding(self) -> None:
        """Show detail modal for the last finding (bound to 'd' key)."""
        if self._findings_list:
            self.push_screen(FindingDetailModal(self._findings_list[-1]))
        else:
            self._chat(f"[{DIM_CYAN}]No findings to inspect. Run a scan first.[/]")

    def _pulse_findings_header(self) -> None:
        """Flash the findings header border red for critical/high findings."""
        try:
            header = self.query_one("#findings-header", Label)
            header.update(f"[{RED} bold]► FINDINGS ⚠[/]")
            self.set_timer(0.3, lambda: self._restore_findings_header())
        except NoMatches:
            pass

    def _restore_findings_header(self) -> None:
        """Restore findings header to normal state."""
        try:
            header = self.query_one("#findings-header", Label)
            header.update(f"[{RED}]► FINDINGS[/]")
        except NoMatches:
            pass


# ════════════════════════════════════════════════════════════════════════════════
# Public Entry Point
# ════════════════════════════════════════════════════════════════════════════════


def start_nexus() -> None:
    """Launch the ReconPro NEXUS TUI."""
    app = NexusApp()
    app.run()
