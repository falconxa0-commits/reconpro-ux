"""StatCounter — Number display with delta flash animation.

Shows a count with an up/down delta indicator that briefly
flashes when the value changes.

Usage::
    counter = StatCounter(id="finding-count", label="findings")
    counter.set(85, delta=12)  # 85 findings, +12 in last minute
    # Renders: ● 85 findings  ↑12

The delta arrow and number flash the accent color for 0.5s
then fade to the dim color.
"""
from __future__ import annotations

import time
from typing import Optional

from textual.reactive import reactive
from textual.timer import Timer
from textual.widget import Widget

from ..theme import Theme


class StatCounter(Widget):
    """Animated counter with delta indicator.

    Reactive attributes:
        value    — current count
        delta    — recent change (positive = increase)
    """

    DEFAULT_CSS = """
    StatCounter {
        width: auto;
        height: 1;
    }
    """

    value: reactive[int] = reactive(0)
    delta: reactive[int] = reactive(0)

    def __init__(
        self,
        label: str = "",
        icon: str = "●",
        color: str = "",
        id: str = "stat-counter",
    ) -> None:
        super().__init__(id=id)
        self.label = label
        self.icon = icon
        self._custom_color = color
        self._flash_timer: Optional[Timer] = None
        self._flash_until: float = 0.0
        self._flash_duration: float = 1.5
        self._prev_value: int = 0

    def on_mount(self) -> None:
        self._flash_timer = self.set_interval(0.1, self._check_flash)
        self._update_display()

    def set(self, value: int, delta: int = 0) -> None:
        """Update the counter and trigger a flash animation."""
        self._prev_value = self.value
        self.value = value
        self.delta = delta
        if delta != 0:
            self._flash_until = time.monotonic() + self._flash_duration
        self._update_display()

    def increment(self, amount: int = 1) -> None:
        """Increment the value by amount, auto-computing delta."""
        self.set(self.value + amount, amount)

    def _check_flash(self) -> None:
        """Re-render while flash is active to create animation."""
        now = time.monotonic()
        if now < self._flash_until:
            self._update_display()

    def _update_display(self) -> None:
        """Render the counter line."""
        t = Theme.current()
        color = self._custom_color or t.ACCENT
        dim = t.TEXT_DIM
        now = time.monotonic()
        is_flashing = now < self._flash_until

        # Fade effect: brightness decreases over flash duration
        if is_flashing and self.delta != 0:
            remaining = self._flash_until - now
            fade = min(1.0, remaining / self._flash_duration)
            # Use accent color while flashing, dim when fading
            delta_color = color if fade > 0.5 else dim
            arrow_style = f"bold {delta_color}" if fade > 0.3 else dim
        else:
            delta_color = dim
            arrow_style = dim

        # Build delta arrow
        if self.delta > 0:
            delta_str = f"[{arrow_style}]↑{self.delta}[/{arrow_style}]"
        elif self.delta < 0:
            delta_str = f"[{arrow_style}]↓{abs(self.delta)}[/{arrow_style}]"
        else:
            delta_str = ""

        # Icon + value + label + delta
        icon_color = t.GREEN if self.value == 0 else color
        self.update(
            f"[{icon_color}]{self.icon}[/{icon_color}] "
            f"[bold {color}]{self.value}[/{color}] "
            f"[{dim}]{self.label}[/{dim}]"
            f"  {delta_str}"
        )

    def on_unmount(self) -> None:
        if self._flash_timer:
            self._flash_timer.stop()
