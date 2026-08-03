"""CommandCompleter — Fuzzy auto-complete dropdown for the NEXUS command bar.

Shows a floating suggestion panel that:
  - Fuzzy-matches typed text against all commands + aliases
  - Shows top 5 matches ranked by relevance (prefix > substring > fuzzy)
  - Highlights matched characters in cyan
  - Tab accepts the top suggestion (or cycles through matches)
  - Escape / backspace-to-empty dismisses
  - Shows command hint/description next to each match
  - Appears instantly on typing, disappears on submit
  - Contextual: adapts suggestions based on scan state (no rescan if no target, etc.)

Usage in NexusApp compose::
    yield CommandCompleter(id="cmd-completer")

Wire up in NexusApp::
    def on_input_changed(self, event):
        completer = self.query_one("#cmd-completer", CommandCompleter)
        completer.show_suggestions(event.value)

    def on_key(self, event):
        if event.key == "tab" and completer.visible:
            completer.accept_top()
"""
from __future__ import annotations

from difflib import SequenceMatcher
from typing import List, Tuple, Optional, Dict

from textual.reactive import reactive
from textual.timer import Timer
from textual.widget import Widget
from textual.containers import Horizontal, Vertical

from ..theme import Theme


# ── Command database: (name, aliases, description, takes_args, context) ──
# context: None = always, "needs_target" = only if target exists, "no_scan" = only when idle
COMMAND_DB: List[Tuple[str, List[str], str, bool, Optional[str]]] = [
    ("scan",      ["s"],   "Scan a remote target",                    True,  None),
    ("audit",     ["a"],   "Audit local machine",                      False, "no_scan"),
    ("dev",       [],      "Scan dev project",                         True,  "no_scan"),
    ("doctor",    [],      "Health check",                             False, "no_scan"),
    ("blitz",     ["b"],   "Parallel multi-target scan",               True,  None),
    ("subdomains",["sub"], "Discover subdomains",                      True,  None),
    ("agent",     [],      "Autonomous AI agent",                      True,  None),
    ("swarm",     [],      "Multi-agent swarm attack",                 True,  None),
    ("adversarial",["adv"],"Adversarial attack loop",                 True,  None),
    ("graph",     ["g"],   "Knowledge graph stats",                    False, None),
    ("export",    ["exp"], "Export last scan (sarif/md/json/html)",    True,  "needs_target"),
    ("history",   ["h"],   "Scan history",                            False, None),
    ("theme",     [],      "Switch theme",                             True,  None),
    ("clear",     ["c"],   "Clear all feeds",                          False, None),
    ("help",      ["?"],   "Show commands",                            False, None),
    ("quit",      ["q", "exit"], "Exit NEXUS",                        False, None),
]


def _fuzzy_score(query: str, candidate: str) -> float:
    """Score how well query matches candidate.

    Returns 0.0-1.0 where 1.0 = perfect prefix match.
    Scoring: prefix=1.0, word-start=0.9, substring=0.7, fuzzy=0.5*ratio
    """
    q = query.lower()
    c = candidate.lower()

    if not q:
        return 0.0

    # Exact prefix
    if c.startswith(q):
        return 1.0

    # Alias exact prefix
    for cmd, aliases, *_ in COMMAND_DB:
        if c == cmd:
            for alias in aliases:
                if alias.startswith(q):
                    return 0.95

    # Substring match
    if q in c:
        return 0.7

    # Fuzzy match using SequenceMatcher
    ratio = SequenceMatcher(None, q, c).ratio()
    return ratio * 0.5


def _highlight_match(text: str, query: str, color: str, dim: str) -> str:
    """Highlight matching characters in text with color.

    For fuzzy matches, highlights each character of query that appears
    in order within text.
    """
    if not query:
        return f"[{dim}]{text}[/{dim}]"

    q = query.lower()
    t_lower = text.lower()

    # Prefix match — highlight the prefix portion
    if t_lower.startswith(q):
        matched = text[:len(q)]
        rest = text[len(q):]
        return f"[{color} bold]{matched}[/{color}] [{dim}]{rest}[/{dim}]"

    # Character-by-character fuzzy highlight
    result = []
    qi = 0
    for i, ch in enumerate(text):
        if qi < len(q) and t_lower[i] == q[qi]:
            result.append(f"[{color} bold]{ch}[/{color}]")
            qi += 1
        else:
            result.append(f"[{dim}]{ch}[/{dim}]")

    # If we didn't match all chars, just dim the whole thing
    if qi < len(q):
        return f"[{dim}]{text}[/{dim}]"

    return "".join(result)


class CommandCompleter(Widget):
    """Floating auto-complete dropdown for command input.

    Shows up to 5 fuzzy-matched command suggestions with descriptions.
    Reactive 'visible' controls show/hide with smooth appearance.
    """

    DEFAULT_CSS = """
    CommandCompleter {
        width: auto;
        height: auto;
        max-height: 7;
        display: none;
        layer: popup;
    }
    CommandCompleter.visible {
        display: block;
    }
    """

    visible: reactive[bool] = reactive(False)

    def __init__(self, id: str = "cmd-completer") -> None:
        super().__init__(id=id)
        self._suggestions: List[Tuple[str, str, float]] = []  # (cmd, desc, score)
        self._selected_idx: int = 0
        self._current_query: str = ""
        self._dismiss_timer: Optional[Timer] = None
        self._max_visible: int = 5
        self._context_has_target: bool = False
        self._context_scanning: bool = False

    def configure_context(self, has_target: bool, is_scanning: bool) -> None:
        """Update context for contextual filtering."""
        self._context_has_target = has_target
        self._context_scanning = is_scanning

    def show_suggestions(self, text: str) -> None:
        """Compute and show fuzzy matches for the typed text."""
        text = text.strip()
        self._current_query = text

        # Parse: if user typed "scan example.com", only complete the first word
        parts = text.split()
        query_part = parts[0] if parts else ""

        if not query_part:
            self.hide()
            return

        # Score all commands
        scored: List[Tuple[str, str, float]] = []
        for cmd, aliases, desc, takes_args, ctx in COMMAND_DB:
            # Context filtering
            if ctx == "needs_target" and not self._context_has_target:
                continue
            if ctx == "no_scan" and self._context_scanning:
                continue

            # Score against command name
            score = _fuzzy_score(query_part, cmd)
            if score > 0.25:
                scored.append((cmd, desc, score))
                continue

            # Score against aliases
            for alias in aliases:
                alias_score = _fuzzy_score(query_part, alias)
                if alias_score > 0.25:
                    # Boost alias matches slightly so they appear
                    scored.append((cmd, desc, alias_score * 0.9))
                    break

        # Sort by score descending, take top N
        scored.sort(key=lambda x: x[2], reverse=True)
        self._suggestions = scored[:self._max_visible]
        self._selected_idx = 0

        if self._suggestions:
            self.visible = True
            self._render()
        else:
            self.hide()

    def hide(self) -> None:
        """Dismiss the completer."""
        self.visible = False
        self._suggestions = []
        self._selected_idx = 0
        try:
            self.update("")
        except Exception:
            pass

    def accept_top(self) -> Optional[str]:
        """Accept the currently selected suggestion.

        Returns the full command name to replace the input,
        or None if no suggestions.
        """
        if not self._suggestions:
            return None

        idx = self._selected_idx % len(self._suggestions)
        cmd = self._suggestions[idx][0]
        self.hide()
        return cmd

    def cycle_selection(self, direction: int = 1) -> None:
        """Cycle through suggestions (direction: 1=down, -1=up)."""
        if not self._suggestions:
            return
        n = len(self._suggestions)
        self._selected_idx = (self._selected_idx + direction) % n
        self._render()

    def _render(self) -> None:
        """Render the suggestion dropdown."""
        t = Theme.current()
        cyan = t.CYAN
        dim = t.TEXT_DIM
        accent = t.ACCENT
        sel_bg = t.HEADER_BG
        sel_border = t.BORDER

        if not self._suggestions:
            self.update("")
            return

        lines: List[str] = []
        query = self._current_query.split()[0] if self._current_query else ""

        for i, (cmd, desc, score) in enumerate(self._suggestions):
            is_selected = (i == self._selected_idx % len(self._suggestions))

            # Highlighted command name
            highlighted = _highlight_match(cmd, query, cyan, dim)

            # Selection indicator
            if is_selected:
                indicator = f"[{cyan}]▸[/{cyan}]"
                # Wrap in a subtle box feel
                line = f" {indicator} {highlighted}  [{dim}]{desc}[/{dim}]"
            else:
                indicator = f"[{dim}] [{dim}]"
                line = f" {indicator} {highlighted}  [{dim}]{desc}[/{dim}]"

            lines.append(line)

        # Score hint at bottom
        top_score = self._suggestions[0][2]
        if top_score < 0.6:
            fuzz_label = f"[{dim}]  fuzzy match · Tab to accept, Esc to dismiss[/{dim}]"
            lines.append(fuzz_label)

        content = "\n".join(lines)
        try:
            self.update(content)
        except Exception:
            pass

    def watch_visible(self, old: bool, new: bool) -> None:
        """Toggle CSS class for show/hide."""
        if new:
            self.set_class(True, "visible")
        else:
            self.set_class(False, "visible")
