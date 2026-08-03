"""VelocityMeter — Real-time throughput indicator.

Shows current scan velocity in a single line:
    ⟨ 234 req/s │ 8.2 find/min │ 42% complete │ 01:23 elapsed ⟩

The values are color-coded: high throughput = green, low = dim.
Completion percentage uses a mini progress bar.
"""
from __future__ import annotations

import time
from typing import Optional

from textual.reactive import reactive
from textual.timer import Timer
from textual.widget import Widget

from ..theme import Theme


class VelocityMeter(Widget):
    """Real-time scan velocity display.

    Reactive attributes:
        requests_per_sec   — current HTTP request rate
        findings_per_min   — findings discovery rate
        completion_pct     — scan progress 0-100
    """

    DEFAULT_CSS = """
    VelocityMeter {
        width: 100%;
        height: 1;
    }
    """

    requests_per_sec: reactive[float] = reactive(0.0)
    findings_per_min: reactive[float] = reactive(0.0)
    completion_pct: reactive[float] = reactive(0.0)

    def __init__(self, id: str = "velocity-meter") -> None:
        super().__init__(id=id)
        self._start_time: Optional[float] = None
        self._total_requests: int = 0
        self._total_findings: int = 0
        self._req_history: list = []  # (timestamp, count) pairs
        self._find_history: list = []  # (timestamp, count) pairs
        self._timer: Optional[Timer] = None

    def on_mount(self) -> None:
        self._timer = self.set_interval(1.0, self._tick)
        self._render()

    def start(self) -> None:
        """Begin tracking velocity."""
        self._start_time = time.monotonic()
        self._total_requests = 0
        self._total_findings = 0
        self._req_history.clear()
        self._find_history.clear()
        self.completion_pct = 0.0
        self._render()

    def stop(self) -> None:
        """Stop tracking."""
        self.requests_per_sec = 0.0
        self.findings_per_min = 0.0
        self._render()

    def record_request(self, count: int = 1) -> None:
        """Record completed requests."""
        self._total_requests += count
        self._req_history.append((time.monotonic(), self._total_requests))

    def record_finding(self, count: int = 1) -> None:
        """Record discovered findings."""
        self._total_findings += count
        self._find_history.append((time.monotonic(), self._total_findings))

    def set_completion(self, pct: float) -> None:
        """Set scan completion percentage (0-100)."""
        self.completion_pct = max(0.0, min(100.0, pct))

    def _tick(self) -> None:
        """Recalculate rates every second."""
        now = time.monotonic()
        window = 10.0  # 10-second rolling window

        # Requests per second (rolling window)
        cutoff = now - window
        self._req_history = [(t, c) for t, c in self._req_history if t > cutoff]
        if len(self._req_history) >= 2:
            dt = self._req_history[-1][0] - self._req_history[0][0]
            dc = self._req_history[-1][1] - self._req_history[0][1]
            self.requests_per_sec = dc / dt if dt > 0 else 0.0
        else:
            self.requests_per_sec = 0.0

        # Findings per minute (rolling window)
        self._find_history = [(t, c) for t, c in self._find_history if t > cutoff]
        if len(self._find_history) >= 2:
            dt = self._find_history[-1][0] - self._find_history[0][0]
            dc = self._find_history[-1][1] - self._find_history[0][1]
            self.findings_per_min = dc / dt * 60 if dt > 0 else 0.0
        else:
            self.findings_per_min = 0.0

        self._render()

    def _render(self) -> None:
        """Render the velocity line."""
        t = Theme.current()
        dim = t.TEXT_DIM
        cyan = t.CYAN
        green = t.GREEN
        yellow = t.YELLOW
        red = t.RED

        # Format request rate with color
        rps = self.requests_per_sec
        if rps >= 100:
            rps_color = green
        elif rps >= 30:
            rps_color = cyan
        elif rps > 0:
            rps_color = yellow
        else:
            rps_color = dim

        # Format findings rate with color
        fpm = self.findings_per_min
        if fpm >= 10:
            fpm_color = red
        elif fpm >= 3:
            fpm_color = yellow
        elif fpm > 0:
            fpm_color = cyan
        else:
            fpm_color = dim

        # Mini progress bar for completion
        pct = self.completion_pct
        bar_width = 8
        filled = int(pct / 100 * bar_width)
        bar = "█" * filled + "░" * (bar_width - filled)
        if pct >= 80:
            pct_color = green
        elif pct >= 40:
            pct_color = yellow
        else:
            pct_color = cyan

        # Elapsed time
        elapsed_str = ""
        if self._start_time:
            elapsed = time.monotonic() - self._start_time
            mins, secs = divmod(int(elapsed), 60)
            elapsed_str = f"{mins:02d}:{secs:02d}"

        # Build the line
        parts = [
            f"[{dim}]⟨[/{dim}]",
            f"[{rps_color}]{rps:>6.1f}[/{rps_color}][{dim}] req/s[/{dim}]",
            f"[{dim}] │ [/{dim}]",
            f"[{fpm_color}]{fpm:>5.1f}[/{fpm_color}][{dim}] find/min[/{dim}]",
            f"[{dim}] │ [/{dim}]",
            f"[{pct_color}]{bar}[/{pct_color}] [{pct_color}]{pct:.0f}%[/{pct_color}]",
        ]
        if elapsed_str:
            parts.append(f"[{dim}] │ [/{dim}][{dim}]{elapsed_str}[/{dim}]")
        parts.append(f"[{dim}]⟩[/{dim}]")

        self.update(" ".join(parts))

    def on_unmount(self) -> None:
        if self._timer:
            self._timer.stop()
