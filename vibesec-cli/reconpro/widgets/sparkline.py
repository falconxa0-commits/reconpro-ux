"""Sparkline — Mini line chart using Unicode block characters.

Renders a compact single-line chart that shows data trends.
Perfect for: findings rate, request rate, score trajectory.

Usage::
    spark = Sparkline(id="findings-spark", title="FIND/MIN", max_points=40)
    spark.push(3)   # add a data point
    spark.push(7)
    spark.push(2)
    # Renders: ▁▂▃▇▅▃▁▂ FIND/MIN  4.3avg

The sparkline auto-scales to the data range and colors based
on the theme's severity/grade colors.
"""
from __future__ import annotations

from collections import deque
from typing import List, Optional

from textual.reactive import reactive
from textual.widget import Widget

from ..theme import Theme


# 8-level Unicode block heights (bottom to top)
BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"]


class Sparkline(Widget):
    """Single-line sparkline chart widget.

    Reactive attributes:
        color   — hex color for the bars (default: theme accent)
        title   — label shown after the chart
    """

    DEFAULT_CSS = """
    Sparkline {
        width: auto;
        height: 1;
    }
    """

    color: reactive[str] = reactive("")
    title: reactive[str] = reactive("")

    def __init__(
        self,
        max_points: int = 30,
        title: str = "",
        color: str = "",
        id: str = "sparkline",
    ) -> None:
        super().__init__(id=id)
        self._data: deque = deque(maxlen=max_points)
        self._max_points = max_points
        if title:
            self.title = title
        if color:
            self.color = color

    def push(self, value: float) -> None:
        """Add a data point and re-render if mounted."""
        self._data.append(value)
        try:
            self._render()
        except Exception:
            pass

    def push_batch(self, values: List[float]) -> None:
        """Add multiple data points and re-render once."""
        for v in values:
            self._data.append(v)
        try:
            self._render()
        except Exception:
            pass

    def clear(self) -> None:
        """Clear all data points."""
        self._data.clear()
        self._render()

    @property
    def data(self) -> List[float]:
        """Return current data as a list."""
        return list(self._data)

    @property
    def avg(self) -> float:
        """Current average of stored data."""
        if not self._data:
            return 0.0
        return sum(self._data) / len(self._data)

    @property
    def latest(self) -> float:
        """Most recent data point."""
        return self._data[-1] if self._data else 0.0
    
    @property
    def peak(self) -> float:
        """Peak value in current data."""
        return max(self._data) if self._data else 0.0

    def _render(self) -> None:
        """Render the sparkline to a single line of styled text."""
        t = Theme.current()
        bar_color = self.color or t.ACCENT
        dim = t.TEXT_DIM
        title = self.title

        if not self._data:
            # Empty state — show placeholder dashes
            width = min(self._max_points, 20)
            self.update(f"[{dim}]{'─' * width}[/{dim}] [{dim}]{title}[/{dim}]")
            return

        data = list(self._data)
        data_min = min(data)
        data_max = max(data)
        data_range = data_max - data_min

        # Build block characters
        chars: List[str] = []
        for val in data:
            if data_range == 0:
                # All values the same — show mid-height
                idx = 3  # ▄
            else:
                normalized = (val - data_min) / data_range
                idx = int(normalized * (len(BLOCKS) - 1) + 0.5)
                idx = max(0, min(len(BLOCKS) - 1, idx))
            chars.append(BLOCKS[idx])

        line = "".join(chars)

        # Compute summary stats
        avg = self.avg
        peak = self.peak
        latest = self.latest

        # Format: ▁▂▃▇▅▃▁▂  FIND/MIN  4.3avg  7peak
        # Show peak in bold if it's the latest value
        if latest >= peak and len(data) > 1:
            peak_style = f"bold {bar_color}"
        else:
            peak_style = dim

        self.update(
            f"[{bar_color}]{line}[/{bar_color}]"
            f"  [{dim}]{title}[/{dim}] "
            f"[{bar_color}]{avg:.1f}[/{bar_color}][{dim}]avg[/{dim}] "
            f"[{peak_style}]{peak:.0f}[/{peak_style}][{dim}]pk[/{dim}]"
        )

    def watch_title(self, old: str, new: str) -> None:
        try:
            self._render()
        except Exception:
            pass

    def watch_color(self, old: str, new: str) -> None:
        try:
            self._render()
        except Exception:
            pass
