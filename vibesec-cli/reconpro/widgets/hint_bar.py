"""HintBar — Adaptive contextual hint strip below the command input.

Shows context-sensitive tips that rotate based on:
  - Current app state (idle, scanning, has findings, has target)
  - Time-based rotation every 8 seconds
  - Command-specific hints after failed commands
  - Keyboard shortcut reminders

The hints are subtle — rendered in TEXT_DIM so they don't
compete with the main UI, but they make the app feel alive
and guide new users naturally.

Usage::
    hint = HintBar(id="hint-bar")
    hint.push_context("idle")       # switch hint pool
    hint.show_once("Press Tab for auto-complete")  # one-shot hint
"""
from __future__ import annotations

import random
import time
from typing import Dict, List, Optional

from textual.reactive import reactive
from textual.timer import Timer
from textual.widget import Widget

from ..theme import Theme


# ── Hint pools by context ──
HINTS: Dict[str, List[str]] = {
    "idle": [
        "Type [cyan]scan <target>[/] to begin reconnaissance",
        "[cyan]agent[/] deploys an autonomous AI hacker",
        "[cyan]swarm <target>[/] launches multi-agent assault",
        "[cyan]blitz t1 t2 t3[/] scans multiple targets in parallel",
        "Press [cyan]Tab[/] for auto-complete · [cyan]?[/] for help",
        "[cyan]theme list[/] to browse 6 built-in themes",
        "[cyan]audit[/] runs a local security health check",
        "[cyan]doctor[/] diagnoses your ReconPro installation",
    ],
    "scanning": [
        "Scan in progress... [cyan]clear[/] to reset feeds",
        "Press [cyan]d[/] to inspect the latest finding",
        "Findings appear in real-time on the right panel",
        "Click any finding for full details",
        "[cyan]Ctrl+S[/] will re-scan this target when done",
    ],
    "has_findings": [
        "[cyan]export html[/] to generate a styled report",
        "[cyan]d[/] to inspect the last finding in detail",
        "Click findings on the right panel for details",
        "[cyan]adversarial <target>[/] runs fix-verify loops",
        "[cyan]history[/] to see past scan results",
    ],
    "has_target": [
        "[cyan]Ctrl+S[/] to re-scan [cyan]{target}[/]",
        "[cyan]swarm {target}[/] for multi-agent deep scan",
        "[cyan]adversarial {target}[/] for iterative hardening",
        "[cyan]scan {target} with recon auth[/] for selective modules",
    ],
}


class HintBar(Widget):
    """Single-line contextual hint that rotates periodically.

    Reactive attributes:
        text  — current hint text (with markup)
    """

    DEFAULT_CSS = """
    HintBar {
        width: 100%;
        height: 1;
    }
    """

    text: reactive[str] = reactive("")

    def __init__(self, id: str = "hint-bar") -> None:
        super().__init__(id=id)
        self._current_context: str = "idle"
        self._pool: List[str] = []
        self._pool_idx: int = 0
        self._timer: Optional[Timer] = None
        self._rotate_interval: float = 8.0
        self._once_text: Optional[str] = None
        self._once_until: float = 0.0
        self._target_name: str = ""

    def on_mount(self) -> None:
        self._refresh_pool("idle")
        self._timer = self.set_interval(self._rotate_interval, self._rotate)
        self._render()

    def push_context(self, context: str, target: str = "") -> None:
        """Switch to a different hint pool.

        Args:
            context: one of "idle", "scanning", "has_findings", "has_target"
            target: optional target name for template substitution
        """
        if context != self._current_context:
            self._current_context = context
            self._target_name = target
            self._refresh_pool(context)
            self._pool_idx = 0
            self._render()

    def show_once(self, text: str, duration: float = 4.0) -> None:
        """Show a one-shot hint that overrides rotation temporarily."""
        self._once_text = text
        self._once_until = time.monotonic() + duration
        self._render()

    def set_target(self, target: str) -> None:
        """Update the target name for hint templates."""
        self._target_name = target

    def _refresh_pool(self, context: str) -> None:
        """Load and shuffle the hint pool for the given context."""
        self._pool = list(HINTS.get(context, HINTS["idle"]))
        random.shuffle(self._pool)

    def _rotate(self) -> None:
        """Advance to the next hint in the pool."""
        if not self._pool:
            return
        self._pool_idx = (self._pool_idx + 1) % len(self._pool)
        self._render()

    def _substitute(self, text: str) -> str:
        """Replace {target} in hint templates."""
        if self._target_name:
            return text.replace("{target}", self._target_name)
        return text

    def _render(self) -> None:
        """Render the current hint."""
        t = Theme.current()
        dim = t.TEXT_DIM

        # One-shot hint takes priority
        now = time.monotonic()
        if self._once_text and now < self._once_until:
            content = f"[{dim}]{self._once_text}[/{dim}]"
            try:
                self.update(content)
            except Exception:
                pass
            return

        # Clear one-shot
        if self._once_text and now >= self._once_until:
            self._once_text = None

        if not self._pool:
            try:
                self.update("")
            except Exception:
                pass
            return

        hint = self._pool[self._pool_idx % len(self._pool)]
        hint = self._substitute(hint)
        content = f"[{dim}]  {hint}[/{dim}]"
        try:
            self.update(content)
        except Exception:
            pass

    def on_unmount(self) -> None:
        if self._timer:
            self._timer.stop()
