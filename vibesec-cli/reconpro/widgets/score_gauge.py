"""ScoreGauge — Animated Unicode arc gauge for the header bar.

Renders a score from 0-100 as a colored bar with the grade letter.
Animates smoothly when the score changes.

Usage in TUI compose::
    yield ScoreGauge(id="score-gauge")

Then update reactively::
    gauge = self.query_one("#score-gauge", ScoreGauge)
    gauge.set_score(72, "C")
"""
from __future__ import annotations

import time
from typing import Optional

from textual.reactive import reactive
from textual.timer import Timer
from textual.widget import Widget

from ..theme import Theme


BLOCK_FULL = "█"
BLOCK_EMPTY = "░"
BLOCK_MID = ["▏", "▎", "▍", "▌", "▋", "▊", "▉"]


class ScoreGauge(Widget):
    """Animated score gauge widget.

    Renders as a single-line colored bar showing 0-100 score
    with the numeric value and grade letter.
    """

    DEFAULT_CSS = """
    ScoreGauge {
        width: auto;
        height: 1;
    }
    """

    score: reactive[int] = reactive(100)
    grade: reactive[str] = reactive("A+")

    def __init__(self, bar_width: int = 16, id: str = "score-gauge") -> None:
        super().__init__(id=id)
        self.bar_width = bar_width
        self._target_score: int = 100
        self._display_score: float = 100.0
        self._anim_timer: Optional[Timer] = None

    def on_mount(self) -> None:
        self._anim_timer = self.set_interval(0.05, self._animate)
        self._update_display()

    def set_score(self, score: int, grade: str = "") -> None:
        """Set the target score and optionally the grade.

        The gauge animates smoothly from current to target.
        """
        self._target_score = max(0, min(100, score))
        if grade:
            self.grade = grade

    def _animate(self) -> None:
        """Smoothly interpolate displayed score toward target."""
        diff = self._target_score - self._display_score
        if abs(diff) < 0.5:
            self._display_score = float(self._target_score)
            self.score = self._target_score
        else:
            speed = max(1.0, abs(diff) * 0.15)
            if diff > 0:
                self._display_score = min(self._target_score, self._display_score + speed)
            else:
                self._display_score = max(self._target_score, self._display_score - speed)
            self.score = int(self._display_score)
        self._update_display()

    def _update_display(self) -> None:
        """Render the gauge as styled Textual markup."""
        t = Theme.current()
        score = int(self._display_score)
        grade = self.grade
        color = t.grade_color(grade)

        # Build the bar
        filled = score / 100 * self.bar_width
        full_blocks = int(filled)
        remainder = filled - full_blocks

        if remainder > 0 and full_blocks < self.bar_width:
            partial_idx = min(int(remainder * len(BLOCK_MID)), len(BLOCK_MID) - 1)
            bar = BLOCK_FULL * full_blocks + BLOCK_MID[partial_idx]
            empty_count = self.bar_width - full_blocks - 1
            bar += BLOCK_EMPTY * empty_count
        else:
            bar = BLOCK_FULL * full_blocks + BLOCK_EMPTY * (self.bar_width - full_blocks)

        # Flash during animation
        is_animating = abs(self._target_score - self._display_score) > 1
        if is_animating:
            pulse = int(time.time() * 8) % 2 == 0
            bar_color = color if not pulse else t.ORANGE
        else:
            bar_color = color

        dim = t.DIM_CYAN

        # Split bar into filled and empty parts
        split = full_blocks + (1 if remainder > 0 else 0)
        filled_part = bar[:split] if split > 0 else ""
        empty_part = bar[split:]

        # Build the display string
        ob = "["  # open bracket
        cb = "]"  # close bracket
        self.update(
            f"[dim]{ob}[/{dim}]"
            f"[{bar_color}]{filled_part}[/{bar_color}]"
            f"[dim]{empty_part}[/{dim}]"
            f"[dim]{cb}[/{dim}] "
            f"[bold {color}]{score:>3}[/{color}] [dim]({grade})[/{dim}]"
        )

    def on_unmount(self) -> None:
        if self._anim_timer:
            self._anim_timer.stop()
