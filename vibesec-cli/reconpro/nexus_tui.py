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

from .theme import Theme, THEMES
from .widgets import (
    ScoreGauge, Sparkline, StatCounter, VelocityMeter,
    CommandCompleter, HintBar,
)

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
ACCENT = Theme.current().ACCENT

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

    /* ── Phase C: Focused panel glow ──────────────────────── */
    #left-panel.panel-focused {{
        border-right: solid {ACCENT};
    }}
    #right-panel.panel-focused {{
        border: solid {ACCENT};
    }}
    #chat-log.panel-focused,
    #findings-feed.panel-focused {{
        border: solid {ACCENT};
    }}
    .panel-focused-border {{
        border: solid {ACCENT} !important;
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
    #stat-medium {{ margin-right: 2; }}
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
    #modules-wrapper {{
        width: 100%;
        height: 2fr;
        transition: height 200ms in 100ms;
    }}
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
        transition: height 300ms in 200ms;
    }}
    .module-cell {{
        height: 3;
        padding: 0 1;
        border: solid {BORDER_COLOR};
        margin-bottom: 1;
        background: {BG};
        overflow: hidden;
    }}

    /* ── Phase D: Responsive Layout ────────────────────────── */
    #content.compact {{
        /* When terminal < 80 cols: stack panels vertically */
    }}
    #content.compact #left-panel {{
        width: 100%;
        height: 50%;
        dock: top;
        border-right: none;
        border-bottom: solid {BORDER_COLOR};
    }}
    #content.compact #right-panel {{
        width: 100%;
        height: 50%;
    }}
    #module-grid.grid-cols-2 {{
        grid-size: 2;
        grid-columns: 1fr 1fr;
    }}
    #module-grid.grid-cols-4 {{
        grid-size: 4;
        grid-columns: 1fr 1fr 1fr 1fr;
    }}

    /* ── Phase D: Panel Collapse ───────────────────────────── */
    #left-panel.collapsed {{
        width: 0;
        overflow: hidden;
        border: none;
    }}
    #left-panel.collapsed * {{
        display: none;
    }}
    #right-panel.expanded {{
        width: 100%;
    }}
    #modules-wrapper.collapsed {{
        height: 0;
        overflow: hidden;
    }}
    #modules-wrapper.collapsed * {{
        display: none;
    }}
    #modules-header.collapsed {{
        display: none;
    }}
    #findings-feed.expanded-modules {{
        height: 5fr;
    }}

    /* ── Panel Split Indicator (shown briefly on resize) ──── */
    .split-indicator {{
        text-align: center;
        color: {ACCENT};
        text-style: bold;
    }}

    /* ── Hint Bar ──────────────────────────────────────── */
    #hint-bar {{
        dock: bottom;
        width: 100%;
        height: 1;
        background: {BG};
        padding: 0 2;
    }}

    /* ── Command Completer (popup overlay) ──────────────────── */
    #cmd-completer {{
        offset-x: 2;
        offset-y: -1;
        width: 52;
        background: {HEADER_BG};
        border: solid {BORDER_COLOR};
        padding: 0 1;
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
        Binding("shift+tab", "cycle_focus_reverse", "Focus back"),
        Binding("ctrl+c", "quit", "Quit"),
        Binding("d", "show_last_finding", "Detail"),
        Binding("escape", "dismiss_completer", "Dismiss"),
        # Phase D: layout bindings
        Binding("ctrl+left", "narrow_left", "Narrow left"),
        Binding("ctrl+right", "widen_left", "Widen left"),
        Binding("ctrl+up", "modules_collapse", "Toggle modules"),
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
        # ── Phase B: findings-per-minute tracker ──
        self._finding_timestamps: List[float] = []
        self._fpm_timer: Optional[Timer] = None
        # ── Phase C: completer + navigation state ──
        self._completer_active: bool = False
        self._findings_cursor: int = -1  # j/k navigation index
        self._first_scan_done: bool = False  # tracks onboarding hint
        # ── Phase D: responsive layout state ──
        self._split_ratio: int = 40  # left panel width %
        self._left_collapsed: bool = False
        self._modules_collapsed: bool = False
        self._resize_timer: Optional[Timer] = None
        self._compact_mode: bool = False
        self._split_flash_timer: Optional[Timer] = None

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
                yield ScoreGauge(bar_width=18, id="score-gauge")

            # Stats bar — living data
            with Horizontal(id="stats-bar"):
                yield StatCounter(label="findings", icon="●", id="stat-findings")
                yield StatCounter(label="critical", icon="◆", color=RED, id="stat-critical")
                yield StatCounter(label="high", icon="◆", color=YELLOW, id="stat-high")
                yield StatCounter(label="medium", icon="◆", color="#ff9500", id="stat-medium")
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
                    # Phase D: modules-wrapper for collapse/expand
                    with Vertical(id="modules-wrapper"):
                        yield Label("⬡ MODULES", id="modules-header")
                        with Container(id="module-grid"):
                            for mod_id, mod_name in MODULE_NAMES.items():
                                cell = ModuleCell(mod_id, mod_name)
                                cell.set_class(True, "module-cell")
                                self._module_cells[mod_id] = cell
                                yield cell

            # Velocity meter
            yield VelocityMeter(id="velocity-meter")

            # Hint bar (contextual tips)
            yield HintBar(id="hint-bar")

            # Command completer (popup layer)
            yield CommandCompleter(id="cmd-completer")

            # Bottom bar
            with Horizontal(id="bottom-bar"):
                yield Input(
                    placeholder="scan <target>  |  agent <goal>  |  fuzzer <url>  |  help  |  Tab",
                    id="command-input",
                )
                yield Label("", id="bottom-info")

    # ── Mount ───────────────────────────────────────────────────────────────

    def on_key(self, event: Key) -> None:
        """Handle key events — boot skip + completer + history + vim-nav."""
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

        # ── Number keys: quick jump to panels (0=input, 1=chat, 2=findings, 3=modules) ──
        if event.key in ("0", "1", "2", "3") and not self._input_focused():
            jump_map = {"0": "#command-input", "1": "#chat-log", "2": "#findings-feed", "3": "#module-grid"}
            # Skip panel jump to collapsed panels
            target_sel = jump_map[event.key]
            if event.key == "1" and self._left_collapsed:
                target_sel = "#findings-feed"
            if event.key == "3" and self._modules_collapsed:
                target_sel = "#findings-feed"
            self._focus_widget(target_sel)
            event.stop()
            return

        # ── Phase D: [ and ] to toggle panel collapse ──
        if event.key == "[" and not self._input_focused():
            self._toggle_left_panel()
            event.stop()
            return
        if event.key == "]" and not self._input_focused():
            self._toggle_right_panel()
            event.stop()
            return
        if event.key == "=" and not self._input_focused():
            self._toggle_modules()
            event.stop()
            return

        # ── Tab: completer accept/cycle / quick-pick on empty / cycle focus ──
        if event.key == "tab":
            try:
                inp = self.query_one("#command-input", Input)
                comp = self.query_one("#cmd-completer", CommandCompleter)
                if inp.has_focus:
                    # Completer visible → accept top suggestion
                    if comp.visible:
                        accepted = comp.accept_top()
                        if accepted:
                            self._apply_completion(inp, comp, accepted)
                        event.stop()
                        return
                    # Empty input → quick-pick menu
                    if not inp.value.strip():
                        comp.show_quick_pick()
                        event.stop()
                        return
            except NoMatches:
                pass
            # Fall through to default Tab behavior (cycle focus)
            return

        # ── Escape: dismiss completer, close modal, or jump to input ──
        if event.key == "escape":
            try:
                comp = self.query_one("#cmd-completer", CommandCompleter)
                if comp.visible:
                    comp.hide()
                    event.stop()
                    return
            except NoMatches:
                pass
            # If any modal screen is open, Escape will dismiss it via Textual
            # Otherwise jump back to input
            if not self._input_focused():
                self._focus_input()
                event.stop()
                return

        # ── Up/Down in completer: cycle suggestions ──
        if event.key in ("up", "down"):
            try:
                comp = self.query_one("#cmd-completer", CommandCompleter)
                inp = self.query_one("#command-input", Input)
                if comp.visible and inp.has_focus:
                    direction = -1 if event.key == "up" else 1
                    comp.cycle_selection(direction)
                    event.stop()
                    return
            except NoMatches:
                pass

        # ── j/k vim-style navigation: findings feed + chat log ──
        if event.key in ("j", "k"):
            # Findings feed navigation
            try:
                feed = self.query_one("#findings-feed", RichLog)
                if feed.has_focus and self._findings_list:
                    self._vim_navigate_findings(event.key)
                    event.stop()
                    return
            except NoMatches:
                pass
            # Chat log scroll (j=down, k=up)
            try:
                chat = self.query_one("#chat-log", RichLog)
                if chat.has_focus:
                    if event.key == "j":
                        chat.scroll_relative(3)
                    else:
                        chat.scroll_relative(-3)
                    event.stop()
                    return
            except NoMatches:
                pass

        # ── Arrow keys on module grid: navigate cells ──
        if event.key in ("up", "down", "left", "right"):
            try:
                grid = self.query_one("#module-grid", Container)
                if grid.has_focus:
                    self._arrow_navigate_modules(event.key)
                    event.stop()
                    return
            except NoMatches:
                pass

        # ── Enter on findings: open detail modal ──
        if event.key == "enter":
            try:
                feed = self.query_one("#findings-feed", RichLog)
                if feed.has_focus and self._findings_list:
                    idx = self._findings_cursor if 0 <= self._findings_cursor < len(self._findings_list) else len(self._findings_list) - 1
                    self.push_screen(FindingDetailModal(self._findings_list[idx]))
                    event.stop()
                    return
            except NoMatches:
                pass

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

    def _input_focused(self) -> bool:
        """Check if the command input currently has focus."""
        try:
            return self.query_one("#command-input", Input).has_focus
        except NoMatches:
            return False

    def _focus_widget(self, selector: str) -> None:
        """Focus a widget by selector and update panel glow + hint tip."""
        try:
            widget = self.query_one(selector, Widget)
            widget.focus()
            self._update_panel_focus(selector)
            # Show focus-specific keybinding tip
            try:
                self.query_one("#hint-bar", HintBar).push_focus_tip(selector)
            except NoMatches:
                pass
        except NoMatches:
            pass

    def _update_panel_focus(self, focused_selector: str) -> None:
        """Update the panel-focused CSS class on panels.

        Only one panel should be highlighted at a time.
        """
        # Map selectors to their parent panel ids
        panel_map = {
            "#command-input": None,  # input is in bottom bar, no panel
            "#chat-log": "#left-panel",
            "#findings-feed": "#right-panel",
            "#module-grid": "#right-panel",
        }
        panel_id = panel_map.get(focused_selector)

        # Clear all panel-focused classes
        for pid in ("#left-panel", "#right-panel"):
            try:
                self.query_one(pid, Widget).set_class(False, "panel-focused")
            except NoMatches:
                pass

        # Set focused panel
        if panel_id:
            try:
                self.query_one(panel_id, Widget).set_class(True, "panel-focused")
            except NoMatches:
                pass

    def _apply_completion(self, inp: Input, comp: CommandCompleter, accepted: str) -> None:
        """Apply a completion suggestion to the input field.

        Phase C: handles both command-level and arg-level completions.
        For arg mode, appends/replaces the last word instead of the first.
        """
        parts = inp.value.split()

        if comp._mode == "command":
            # Replace the first word with the accepted command
            rest = parts[1:] if len(parts) > 1 else []
            inp.value = accepted + (" " + " ".join(rest) if rest else "")
        else:
            # Arg-level: replace the last word
            if len(parts) >= 2:
                parts[-1] = accepted
                inp.value = " ".join(parts)
            else:
                inp.value = accepted

        inp.cursor_position = len(inp.value)

    def _vim_navigate_findings(self, direction: str) -> None:
        """j/k vim-style navigation through the findings list.

        Scrolls the findings feed and updates the cursor position.
        """
        if not self._findings_list:
            return

        if direction == "j":
            self._findings_cursor = min(self._findings_cursor + 1, len(self._findings_list) - 1)
        else:  # k
            self._findings_cursor = max(self._findings_cursor - 1, 0)

        # Scroll the feed to keep the cursor visible
        try:
            feed = self.query_one("#findings-feed", RichLog)
            feed.scroll_to(y=self._findings_cursor, animate=False)
        except NoMatches:
            pass

        # Show cursor position in bottom-info
        try:
            el = self.query_one("#bottom-info", Label)
            total = len(self._findings_list)
            cursor = self._findings_cursor + 1
            finding = self._findings_list[self._findings_cursor]
            sev = finding.get("severity", "info").lower()
            title = finding.get("title", "?")[:40]
            sev_style = SEV_STYLES.get(sev, "white")
            el.update(f"[{sev_style}]{cursor}/{total}[/{sev_style}] [{DIM_CYAN}]{title}[/{DIM_CYAN}]")
        except NoMatches:
            pass

    # ── Module grid arrow-key navigation ──
    # The grid is 4 columns × 3 rows (11 modules + 1 empty)
    _GRID_COLS = 4

    def _arrow_navigate_modules(self, direction: str) -> None:
        """Navigate module cells with arrow keys when module-grid has focus."""
        module_keys = list(self._module_cells.keys())
        if not module_keys:
            return

        # Current focused module index
        current_idx = 0
        for i, key in enumerate(module_keys):
            try:
                if self._module_cells[key].has_focus:
                    current_idx = i
                    break
            except Exception:
                pass

        new_idx = current_idx
        if direction == "right":
            new_idx = min(current_idx + 1, len(module_keys) - 1)
        elif direction == "left":
            new_idx = max(current_idx - 1, 0)
        elif direction == "down":
            new_idx = min(current_idx + self._GRID_COLS, len(module_keys) - 1)
        elif direction == "up":
            new_idx = max(current_idx - self._GRID_COLS, 0)

        if new_idx != current_idx:
            key = module_keys[new_idx]
            self._module_cells[key].focus()
            # Show module hint
            mod_name = MODULE_NAMES.get(key, key)
            try:
                el = self.query_one("#bottom-info", Label)
                el.update(f"[{CYAN}]{mod_name}[/{CYAN}] [{MUTED}]{key}[/{MUTED}]")
            except NoMatches:
                pass

    def _push_module_scanning_hint(self, module_id: str) -> None:
        """Push module-specific scanning hint to the hint bar."""
        try:
            self.query_one("#hint-bar", HintBar).push_module_hint(module_id)
        except NoMatches:
            pass

    def _push_error_hint(self) -> None:
        """Push error_state context hints to the hint bar."""
        try:
            self.query_one("#hint-bar", HintBar).push_context("error_state")
        except NoMatches:
            pass

    def _get_target_history(self) -> List[str]:
        """Extract unique targets from command history."""
        targets: List[str] = []
        seen: set = set()
        for cmd in reversed(self._command_history):
            parts = cmd.split()
            if len(parts) >= 2 and parts[0] in ("scan", "blitz", "swarm", "subdomains", "adversarial"):
                t = parts[1]
                if t not in seen:
                    seen.add(t)
                    targets.append(t)
        return targets[:10]

    def _get_module_name_list(self) -> List[str]:
        """Return list of module id strings for completion."""
        return list(MODULE_NAMES.keys())

    def _update_severity_hints(self) -> None:
        """Push severity-aware hints if critical/high findings exist."""
        if not self._findings_list:
            return
        crit = sum(1 for f in self._findings_list if f.get("severity", "").lower() == "critical")
        high = sum(1 for f in self._findings_list if f.get("severity", "").lower() == "high")
        med = sum(1 for f in self._findings_list if f.get("severity", "").lower() == "medium")
        if crit > 0:
            try:
                self.query_one("#hint-bar", HintBar).push_dynamic_context(
                    "critical_findings",
                    critical=crit, high=high, medium=med,
                    total=len(self._findings_list),
                    score=self.score, target=self.current_target,
                )
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
        chat.write(f"[{DIM_CYAN}]  Press [cyan bold]Tab[/] on empty input to browse all commands[/]")
        chat.write(f"[{DIM_CYAN}]  Quick jump: [cyan]0[/] input · [cyan]1[/] chat · [cyan]2[/] findings · [cyan]3[/] modules[/]")
        chat.write("")

        # Phase C: show first_scan onboarding hints
        if not self._first_scan_done:
            try:
                self.query_one("#hint-bar", HintBar).push_context("first_scan")
            except NoMatches:
                pass

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
        med = sum(
            1 for f in self._findings_list
            if f.get("severity", "").lower() == "medium"
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
        try:
            self.query_one("#stat-medium", StatCounter).set(med)
        except NoMatches:
            pass

        # Track finding timestamps for true per-minute rate
        now = time.monotonic()
        for _ in range(delta):
            self._finding_timestamps.append(now)

        # Push to findings sparkline (true findings-per-minute)
        try:
            spark = self.query_one("#spark-findings", Sparkline)
            # Calculate actual FPM from timestamps in the last 60s
            cutoff = now - 60.0
            self._finding_timestamps = [t for t in self._finding_timestamps if t > cutoff]
            fpm = len(self._finding_timestamps)
            spark.push(float(fpm))
        except NoMatches:
            pass

        # Wire into velocity meter
        try:
            vm = self.query_one("#velocity-meter", VelocityMeter)
            if delta > 0:
                vm.record_finding(delta)
        except NoMatches:
            pass

        # Keep bottom-info label too (compact view)
        try:
            el = self.query_one("#bottom-info", Label)
            el.update(
                f"[{GREEN}]●[/] {new} findings  [{RED}]{crit}[/]C [{YELLOW}]{high}[/]H [{MUTED}]{med}[/]M"
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
                # Start periodic FPM sparkline push
                if self._fpm_timer is None:
                    self._fpm_timer = self.set_interval(5.0, self._push_fpm_to_sparkline)
            else:
                scan_label.update(f"[{GREEN}]DONE[/]")
                self.scan_start_time = None
                # Stop velocity meter
                try:
                    self.query_one("#velocity-meter", VelocityMeter).stop()
                except NoMatches:
                    pass
                # Stop periodic FPM timer
                if self._fpm_timer is not None:
                    self._fpm_timer.stop()
                    self._fpm_timer = None
                # Push final 0 to show decay
                try:
                    self.query_one("#spark-findings", Sparkline).push(0.0)
                except NoMatches:
                    pass
                # Switch hints: severity-aware if critical, else has_findings/has_target
                self._update_severity_hints()
                if self.finding_count > 0 and not any(
                    f.get("severity", "").lower() == "critical" for f in self._findings_list
                ):
                    try:
                        self.query_one("#hint-bar", HintBar).push_context(
                            "has_findings", target=self.current_target
                        )
                    except NoMatches:
                        pass
                elif not self._findings_list and self.current_target:
                    try:
                        self.query_one("#hint-bar", HintBar).push_context(
                            "has_target", target=self.current_target
                        )
                    except NoMatches:
                        pass
        except NoMatches:
            pass
        # Update hint bar context
        try:
            if new:
                self.query_one("#hint-bar", HintBar).push_context("scanning")
        except NoMatches:
            pass

    def _push_fpm_to_sparkline(self) -> None:
        """Periodically push true findings-per-minute to sparkline."""
        now = time.monotonic()
        cutoff = now - 60.0
        self._finding_timestamps = [t for t in self._finding_timestamps if t > cutoff]
        fpm = len(self._finding_timestamps)
        try:
            self.query_one("#spark-findings", Sparkline).push(float(fpm))
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
        # Update hint bar with target context
        try:
            hint = self.query_one("#hint-bar", HintBar)
            hint.set_target(new)
            if new and not self.is_scanning:
                hint.push_context("has_target", target=new)
                hint.show_once(f"Target set: [cyan]{new}[/] · [cyan]Ctrl+S[/] to rescan")
            elif not new:
                hint.push_context("idle")
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

        # Dismiss completer on submit
        try:
            self.query_one("#cmd-completer", CommandCompleter).hide()
        except NoMatches:
            pass

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

    def on_input_changed(self, event: Input.Changed) -> None:
        """Live fuzzy completion as user types."""
        try:
            comp = self.query_one("#cmd-completer", CommandCompleter)
            comp.configure_context(
                has_target=bool(self.current_target),
                is_scanning=self.is_scanning,
                target_history=self._get_target_history(),
                module_names=self._get_module_name_list(),
            )
            comp.show_suggestions(event.value)
            self._completer_active = comp.visible
        except NoMatches:
            pass

    def action_dismiss_completer(self) -> None:
        """Escape: dismiss the completer popup."""
        try:
            self.query_one("#cmd-completer", CommandCompleter).hide()
            self._completer_active = False
        except NoMatches:
            pass

    def action_cycle_focus(self) -> None:
        """Tab cycles focus between panels and input.

        Phase D: skips collapsed panels in the focus cycle.
        """
        # Build effective focus order excluding collapsed panels
        effective = ["#command-input"]
        if not self._left_collapsed:
            effective.append("#chat-log")
        effective.append("#findings-feed")
        if not self._modules_collapsed:
            effective.append("#module-grid")

        # Find current position in effective order
        current_focused = None
        for sel in effective:
            try:
                if self.query_one(sel, Widget).has_focus:
                    current_focused = sel
                    break
            except NoMatches:
                pass

        if current_focused and current_focused in effective:
            idx = effective.index(current_focused)
            next_idx = (idx + 1) % len(effective)
        else:
            next_idx = 0

        self._focus_widget(effective[next_idx])

    def action_cycle_focus_reverse(self) -> None:
        """Shift+Tab cycles focus in reverse. Skips collapsed panels."""
        effective = ["#command-input"]
        if not self._left_collapsed:
            effective.append("#chat-log")
        effective.append("#findings-feed")
        if not self._modules_collapsed:
            effective.append("#module-grid")

        current_focused = None
        for sel in effective:
            try:
                if self.query_one(sel, Widget).has_focus:
                    current_focused = sel
                    break
            except NoMatches:
                pass

        if current_focused and current_focused in effective:
            idx = effective.index(current_focused)
            prev_idx = (idx - 1) % len(effective)
        else:
            prev_idx = 0

        self._focus_widget(effective[prev_idx])

    # ════════════════════════════════════════════════════════════════════════
    # Phase D: Responsive Layout + Panel Scaling + Collapse
    # ════════════════════════════════════════════════════════════════════════

    def on_resize(self, event) -> None:
        """Adapt layout to terminal size changes.

        - < 80 cols: compact mode (stack panels vertically, 2-col grid)
        - 80–119 cols: standard (3-col grid)
        - >= 120 cols: wide (4-col grid)
        """
        # Debounce to avoid flicker during rapid resize
        if self._resize_timer is not None:
            self._resize_timer.stop()
        self._resize_timer = self.set_timer(0.15, lambda: self._apply_responsive_layout(event.width, event.height))

    def _apply_responsive_layout(self, width: int, height: int) -> None:
        """Apply layout changes based on terminal dimensions."""
        try:
            content = self.query_one("#content", Widget)
            grid = self.query_one("#module-grid", Container)
        except NoMatches:
            return

        # Compact mode: < 80 cols
        if width < 80:
            if not self._compact_mode:
                content.set_class(True, "compact")
                grid.set_class(True, "grid-cols-2")
                grid.remove_class("grid-cols-4")
                self._compact_mode = True
                self._flash_split_indicator("COMPACT")
            return

        # Wide mode: >= 120 cols
        if width >= 120:
            if self._compact_mode:
                content.remove_class("compact")
                self._compact_mode = False
            if width >= 160:
                grid.set_class(True, "grid-cols-4")
                grid.remove_class("grid-cols-2")
            else:
                grid.remove_class("grid-cols-4")
                grid.remove_class("grid-cols-2")
            self._flash_split_indicator("WIDE" if width >= 160 else "STD")
            return

        # Standard mode: 80-119 cols
        if self._compact_mode:
            content.remove_class("compact")
            self._compact_mode = False
        grid.remove_class("grid-cols-4")
        grid.remove_class("grid-cols-2")
        self._flash_split_indicator("STD")

    def _flash_split_indicator(self, label: str) -> None:
        """Briefly show the layout mode in bottom-info."""
        try:
            el = self.query_one("#bottom-info", Label)
            el.update(f"[{ACCENT}]{label} {self._split_ratio}:{100 - self._split_ratio}[/{ACCENT}]")
            if self._split_flash_timer:
                self._split_flash_timer.stop()
            self._split_flash_timer = self.set_timer(1.5, self._clear_split_indicator)
        except NoMatches:
            pass

    def _clear_split_indicator(self) -> None:
        """Clear the split ratio indicator."""
        self._split_flash_timer = None
        try:
            el = self.query_one("#bottom-info", Label)
            el.update("")
        except NoMatches:
            pass

    def action_narrow_left(self) -> None:
        """Ctrl+Left: narrow the left panel (min 20%)."""
        if self._left_collapsed:
            return
        self._split_ratio = max(20, self._split_ratio - 5)
        self._apply_split_ratio()

    def action_widen_left(self) -> None:
        """Ctrl+Right: widen the left panel (max 70%)."""
        if self._left_collapsed:
            return
        self._split_ratio = min(70, self._split_ratio + 5)
        self._apply_split_ratio()

    def _apply_split_ratio(self) -> None:
        """Apply the current split ratio to panel widths."""
        try:
            left = self.query_one("#left-panel", Widget)
            right = self.query_one("#right-panel", Widget)
            left.styles.width = f"{self._split_ratio}%"
            right.styles.width = f"{100 - self._split_ratio}%"
        except NoMatches:
            pass
        self._flash_split_indicator(f"{self._split_ratio}:{100 - self._split_ratio}")

    def action_modules_collapse(self) -> None:
        """Ctrl+Up: toggle module grid visibility."""
        self._toggle_modules()

    def _toggle_left_panel(self) -> None:
        """Toggle left (chat) panel collapse with [ key."""
        try:
            left = self.query_one("#left-panel", Widget)
            right = self.query_one("#right-panel", Widget)
            if self._left_collapsed:
                left.remove_class("collapsed")
                right.remove_class("expanded")
                left.styles.width = f"{self._split_ratio}%"
                right.styles.width = f"{100 - self._split_ratio}%"
                self._left_collapsed = False
            else:
                left.set_class(True, "collapsed")
                right.set_class(True, "expanded")
                self._left_collapsed = True
                # Focus jumps to findings if chat was focused
                try:
                    chat = self.query_one("#chat-log", RichLog)
                    if chat.has_focus:
                        self.query_one("#findings-feed", RichLog).focus()
                except NoMatches:
                    pass
            mode = "CHAT ON" if not self._left_collapsed else "CHAT OFF"
            self._flash_split_indicator(mode)
        except NoMatches:
            pass

    def _toggle_right_panel(self) -> None:
        """Toggle right panel — collapses modules section with ] key.

        In the TUI context, ] toggles the modules grid to maximize findings space.
        """
        # ] key actually toggles modules (more useful than hiding findings)
        self._toggle_modules()

    def _toggle_modules(self) -> None:
        """Toggle module grid visibility."""
        try:
            wrapper = self.query_one("#modules-wrapper", Widget)
            header = self.query_one("#modules-header", Label)
            feed = self.query_one("#findings-feed", RichLog)
            if self._modules_collapsed:
                wrapper.remove_class("collapsed")
                header.remove_class("collapsed")
                feed.remove_class("expanded-modules")
                self._modules_collapsed = False
            else:
                wrapper.set_class(True, "collapsed")
                header.set_class(True, "collapsed")
                feed.set_class(True, "expanded-modules")
                self._modules_collapsed = True
                # Focus jumps to findings if module-grid was focused
                try:
                    grid = self.query_one("#module-grid", Container)
                    if grid.has_focus:
                        feed.focus()
                except NoMatches:
                    pass
            mode = "MODS ON" if not self._modules_collapsed else "MODS OFF"
            self._flash_split_indicator(mode)
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

        # ── Phase C: extended TUI commands ──
        if cmd == "passive":
            self._handle_passive(args)
            return

        if cmd == "fuzzer" or cmd == "fuzz":
            self._handle_fuzzer(args)
            return

        if cmd == "cve":
            self._handle_cve(args)
            return

        if cmd == "profile":
            self._handle_profile(args)
            return

        if cmd == "netmap":
            self._handle_netmap()
            return

        if cmd == "defense":
            self._handle_defense()
            return

        if cmd == "compliance":
            self._handle_compliance()
            return

        if cmd == "delta":
            self._handle_delta()
            return

        if cmd == "benchmark":
            self._handle_benchmark()
            return

        if cmd == "iac":
            self._handle_iac(args)
            return

        if cmd == "container":
            self._handle_container(args)
            return

        if cmd == "ast":
            self._handle_ast(args)
            return

        if cmd == "cloud-recon":
            self._handle_cloud_recon(args)
            return

        self._chat(f"[{RED}]Unknown command: {cmd}[/]")
        self._chat(f"[{DIM_CYAN}]Type [cyan]help[/] for available commands · Press [cyan]Tab[/] on empty input to browse[/]")
        try:
            self.query_one("#hint-bar", HintBar).show_once(
                f"Tip: [cyan]Tab[/] on empty input shows all commands"
            )
        except NoMatches:
            pass

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
        self._finding_timestamps.clear()
        self.score = 100
        self.grade = "A+"
        # Reset sparklines
        try:
            self.query_one("#spark-findings", Sparkline).clear()
            self.query_one("#spark-score", Sparkline).clear()
        except NoMatches:
            pass
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
            ("[cyan]passive <domain>[/]", "Passive DNS / OSINT"),
            ("[cyan]fuzzer <url>[/]", "Fuzz parameters"),
            ("[cyan]cve <query>[/]", "CVE / NVD lookup"),
            ("[cyan]profile <target>[/]", "Target fingerprinting"),
            ("[cyan]netmap[/]", "Network topology"),
            ("[cyan]iac [path][/]", "IaC audit"),
            ("[cyan]container [path][/]", "Container analysis"),
            ("[cyan]ast [path][/]", "AST code analysis"),
            ("[cyan]cloud-recon <target>[/]", "Cloud asset recon"),
            ("[cyan]export <format>[/]", "Export last scan"),
            ("[cyan]defense[/]", "Remediation code"),
            ("[cyan]compliance[/]", "Framework mapping"),
            ("[cyan]delta[/]", "Diff vs last scan"),
            ("[cyan]benchmark[/]", "Score tracking"),
            ("[cyan]history[/]", "Scan history"),
            ("[cyan]theme [name|list][/]", "Switch theme"),
            ("[cyan]clear[/]", "Clear all feeds"),
            ("[cyan]quit[/]", "Exit"),
            ("", ""),
            ("[bold cyan]KEYS[/]", ""),
            (f"[{DIM_CYAN}]Tab[/]          Auto-complete / quick-pick / cycle focus", ""),
            (f"[{DIM_CYAN}]Esc[/]          Dismiss suggestions / back to input", ""),
            (f"[{DIM_CYAN}]Ctrl+L[/]       Clear findings", ""),
            (f"[{DIM_CYAN}]Ctrl+S[/]       Re-scan last target", ""),
            (f"[{DIM_CYAN}]↑/↓[/]           Completer nav / history", ""),
            (f"[{DIM_CYAN}]←→↑↓[/]         Module grid navigation", ""),
            (f"[{DIM_CYAN}]j/k[/]           Navigate findings & chat (vim)", ""),
            (f"[{DIM_CYAN}]Enter[/]         Open finding detail", ""),
            (f"[{DIM_CYAN}]Shift+Tab[/]     Reverse focus cycle", ""),
            (f"[{DIM_CYAN}]0/1/2/3[/]       Quick jump: input/chat/findings/modules", ""),
            (f"[{DIM_CYAN}]d[/]            Inspect last finding", ""),
            (f"[{DIM_CYAN}]Ctrl+←/→[/]     Resize left/right panel split", ""),
            (f"[{DIM_CYAN}]Ctrl+↑[/]       Toggle module grid", ""),
            (f"[{DIM_CYAN}][[/]            Toggle chat panel", ""),
            (f"[{DIM_CYAN}]]=[/]            Toggle module grid", ""),
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
        self._first_scan_done = True
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

    # ── Phase C: Extended command handlers ──────────────────────────────────

    def _handle_passive(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: passive <domain>[/]")
            return
        domain = args[0]
        self.current_target = domain
        self._chat(f"[{DIM_CYAN}]Passive DNS/OSINT for [cyan bold]{domain}[/]...[/]")
        self._run_generic_worker(f"passive {domain}", modules=["recon"], target=domain)

    def _handle_fuzzer(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: fuzzer <url>[/]")
            return
        url = args[0]
        self.current_target = url
        self._chat(f"[{YELLOW} bold]  Fuzzing [cyan]{url}[/]...[/]")
        self._run_generic_worker(f"fuzzer {url}", modules=["auth", "chain"], target=url)

    def _handle_cve(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: cve <query>[/]")
            return
        query = " ".join(args)
        self._chat(f"[{DIM_CYAN}]Searching CVE/NVD for [cyan]{query}[/]...[/]")
        self._run_generic_worker(f"cve {query}", modules=[], target=f"cve:{query}")

    def _handle_profile(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: profile <target>[/]")
            return
        target = args[0]
        self.current_target = target
        self._chat(f"[{DIM_CYAN}]Fingerprinting [cyan bold]{target}[/]...[/]")
        self._run_generic_worker(f"profile {target}", modules=["recon"], target=target)

    def _handle_netmap(self) -> None:
        self._chat(f"[{DIM_CYAN}]Mapping network topology...[/]")
        self._run_generic_worker("netmap", modules=["host"], target="local-netmap")

    def _handle_defense(self) -> None:
        if not self._findings_list:
            self._chat(f"[{RED}]No findings to generate remediations for. Run a scan first.[/]")
            return
        self._chat(f"[{GREEN}]Generating remediation code for {len(self._findings_list)} findings...[/]")
        self._run_generic_worker("defense", modules=[], target="defense")

    def _handle_compliance(self) -> None:
        if not self._findings_list:
            self._chat(f"[{RED}]No findings to map. Run a scan first.[/]")
            return
        self._chat(f"[{DIM_CYAN}]Mapping {len(self._findings_list)} findings to compliance frameworks...[/]")
        self._run_generic_worker("compliance", modules=[], target="compliance")

    def _handle_delta(self) -> None:
        if not self.last_scan_data:
            self._chat(f"[{RED}]No scan data to diff. Run a scan first.[/]")
            return
        self._chat(f"[{DIM_CYAN}]Computing delta vs last scan...[/]")
        self._run_generic_worker("delta", modules=[], target="delta")

    def _handle_benchmark(self) -> None:
        self._chat(f"[{DIM_CYAN}]Loading score benchmarks...[/]")
        self._run_generic_worker("benchmark", modules=[], target="benchmark")

    def _handle_iac(self, args: List[str]) -> None:
        path = args[0] if args else "."
        self.current_target = f"iac:{path}"
        self._chat(f"[{DIM_CYAN}]Auditing IaC at [cyan]{path}[/]...[/]")
        self._run_generic_worker(f"iac {path}", modules=[], target=path, is_local=True)

    def _handle_container(self, args: List[str]) -> None:
        path = args[0] if args else "."
        self.current_target = f"container:{path}"
        self._chat(f"[{DIM_CYAN}]Analyzing container at [cyan]{path}[/]...[/]")
        self._run_generic_worker(f"container {path}", modules=[], target=path, is_local=True)

    def _handle_ast(self, args: List[str]) -> None:
        path = args[0] if args else "."
        self.current_target = f"ast:{path}"
        self._chat(f"[{DIM_CYAN}]Running AST analysis at [cyan]{path}[/]...[/]")
        self._run_generic_worker(f"ast {path}", modules=[], target=path, is_local=True)

    def _handle_cloud_recon(self, args: List[str]) -> None:
        if not args:
            self._chat(f"[{RED}]Usage: cloud-recon <target>[/]")
            return
        target = args[0]
        self.current_target = target
        self._chat(f"[{DIM_CYAN}]Cloud asset recon for [cyan bold]{target}[/]...[/]")
        self._run_generic_worker(f"cloud-recon {target}", modules=["recon"], target=target)

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

        # Set modules to scanning + push module-specific hints
        if modules:
            for m in modules:
                if m in self._module_cells:
                    self.call_from_thread(self._module_cells[m].set_status, "scanning")
                    self.call_from_thread(self._push_module_scanning_hint, m)
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
            # Phase C: push error_state hints
            self.call_from_thread(self._push_error_hint)
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
    def _run_generic_worker(
        self,
        label: str,
        modules: Optional[List[str]] = None,
        target: str = "",
        is_local: bool = False,
    ) -> None:
        """Generic background worker for Phase C extended commands.

        Reuses the scan infrastructure for commands like passive, fuzzer,
        cve, profile, netmap, defense, compliance, delta, benchmark,
        iac, container, ast, cloud-recon.
        """
        self.call_from_thread(self.is_scanning.set, True)

        # Set specified modules to scanning
        if modules:
            for m in modules:
                if m in self._module_cells:
                    self.call_from_thread(self._module_cells[m].set_status, "scanning")

        try:
            self.call_from_thread(
                self._chat, f"[{DIM_CYAN}]  ⏳ {label} in progress...[/]"
            )

            # Try to run as a scan if we have a target and modules
            if target and target not in ("defense", "compliance", "delta", "benchmark") and modules:
                from .scanner import scan, audit_scan

                if is_local:
                    result = audit_scan(target=target, modules=modules)
                else:
                    result = scan(target=target, modules=modules)

                data = result.to_dict()
                self.call_from_thread(self._process_scan_data, data, modules_list=modules)
            elif target and target not in ("defense", "compliance", "delta", "benchmark"):
                # Full scan with target
                from .scanner import scan, audit_scan

                if is_local:
                    result = audit_scan(target=target)
                else:
                    result = scan(target=target)

                data = result.to_dict()
                self.call_from_thread(self._process_scan_data, data, modules_list=None)
            else:
                # Non-scan operations (defense, compliance, delta, benchmark)
                self.call_from_thread(
                    self._chat,
                    f"[{GREEN}]  ✓ {label} operation complete.[/]",
                )

        except ImportError:
            self.call_from_thread(
                self._chat,
                f"[{YELLOW}]  ⚠ {label} requires additional modules. Use [cyan]pip install reconpro[full][/][/]",
            )
        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  ✗ {label} error: {e}[/]")
            self.call_from_thread(self._push_error_hint)
            if modules:
                for m in modules:
                    if m in self._module_cells:
                        self.call_from_thread(self._module_cells[m].set_status, "error")

        finally:
            self.call_from_thread(self.is_scanning.set, False)
            if modules:
                for m in modules:
                    if m in self._module_cells:
                        self.call_from_thread(self._module_cells[m].set_status, "done")

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

        # Phase C: trigger severity-aware hints after scan data loaded
        self._update_severity_hints()

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
