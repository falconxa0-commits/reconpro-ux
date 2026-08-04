#!/usr/bin/env python3
"""Phase E integration script — adds toast/error-recovery to nexus_tui.py.

Edits:
1. Add toast shortcut methods (_toast_success, _toast_warning, _toast_info)
2. Add success/info toasts on all worker completions
3. Add error recovery with auto-retry on _run_scan_worker
4. Add toast CSS for proper overlay z-index
5. Add _retry_state tracking field
"""
import re

FILE = "/home/z/my-project/vibesec-cli/reconpro/nexus_tui.py"

with open(FILE, "r") as f:
    content = f.read()

# ══════════════════════════════════════════════════════════════════════════════
# 1. Add _retry_state field to __init__
# ══════════════════════════════════════════════════════════════════════════════

OLD_INIT = "self._left_collapsed_before_compact: bool = False  # auto-collapse tracker"
NEW_INIT = """self._left_collapsed_before_compact: bool = False  # auto-collapse tracker
        # ── Phase E: error recovery state ──
        self._retry_count: int = 0
        self._max_retries: int = 2
        self._last_scan_args: Optional[Tuple] = None  # (target, modules, is_local) for retry"""

content = content.replace(OLD_INIT, NEW_INIT)

# ══════════════════════════════════════════════════════════════════════════════
# 2. Add toast shortcut methods after _toast_error
# ══════════════════════════════════════════════════════════════════════════════

OLD_TOAST_ERROR = '''    def _toast_error(self, error: Exception, context: str = "") -> None:
        """Show an error toast with recovery suggestion.

        Phase E: wraps the toast + error hint + optional action hint.
        Truncates long error messages for readability.
        """
        msg = str(error)
        if len(msg) > 60:
            msg = msg[:57] + "..."
        label = f"{context}: " if context else ""
        action = "Ctrl+S to retry" if self.current_target else ""
        self._toast(f"{label}{msg}", severity="error", action=action)'''

NEW_TOAST_METHODS = '''    def _toast_error(self, error: Exception, context: str = "") -> None:
        """Show an error toast with recovery suggestion.

        Phase E: wraps the toast + error hint + optional action hint.
        Truncates long error messages for readability.
        """
        msg = str(error)
        if len(msg) > 60:
            msg = msg[:57] + "..."
        label = f"{context}: " if context else ""
        action = "Ctrl+S to retry" if self.current_target else ""
        self._toast(f"{label}{msg}", severity="error", action=action)

    def _toast_success(self, message: str, action: str = "") -> int:
        """Shortcut: show a success toast."""
        return self._toast(message, severity="success", action=action)

    def _toast_warning(self, message: str, action: str = "") -> int:
        """Shortcut: show a warning toast."""
        return self._toast(message, severity="warning", action=action)

    def _toast_info(self, message: str, action: str = "") -> int:
        """Shortcut: show an info toast."""
        return self._toast(message, severity="info", action=action)

    def _toast_scan_retry(self, attempt: int, max_retries: int) -> None:
        """Show a retry toast with attempt count."""
        self._toast(
            f"Retrying scan ({attempt}/{max_retries})...",
            severity="warning",
            action="Esc to cancel",
            duration=4.0,
        )'''

content = content.replace(OLD_TOAST_ERROR, NEW_TOAST_METHODS)

# ══════════════════════════════════════════════════════════════════════════════
# 3. Add success toasts on blitz complete
# ══════════════════════════════════════════════════════════════════════════════

OLD_BLITZ_OK = '''            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Blitz complete. {result[\'successful\']}/{result[\'targets_scanned\']} successful, "
                f"{result[\'total_findings\']} findings, avg score: {result[\'average_score\']} ({result[\'average_grade\']})[/]",
            )

            for t, r in result.get("results", {}).items():'''

NEW_BLITZ_OK = '''            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Blitz complete. {result[\'successful\']}/{result[\'targets_scanned\']} successful, "
                f"{result[\'total_findings\']} findings, avg score: {result[\'average_score\']} ({result[\'average_grade\']})[/]",
            )
            self.call_from_thread(
                self._toast_success,
                f"Blitz: {result[\'total_findings\']} findings across {result[\'targets_scanned\']} targets",
                action="d to inspect",
            )

            for t, r in result.get("results", {}).items():'''

content = content.replace(OLD_BLITZ_OK, NEW_BLITZ_OK)

# ══════════════════════════════════════════════════════════════════════════════
# 4. Add success toast on subdomain complete
# ══════════════════════════════════════════════════════════════════════════════

OLD_SUB_OK = '''            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Found {len(subs)} subdomain(s) for {domain}[/]",
            )

            for sub in subs:'''

NEW_SUB_OK = '''            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Found {len(subs)} subdomain(s) for {domain}[/]",
            )
            self.call_from_thread(
                self._toast_success,
                f"{len(subs)} subdomain(s) found for {domain}",
                action="blitz " + " ".join(subs[:5]) if len(subs) > 0 else "",
            )

            for sub in subs:'''

content = content.replace(OLD_SUB_OK, NEW_SUB_OK)

# ══════════════════════════════════════════════════════════════════════════════
# 5. Add success toast on agent complete
# ══════════════════════════════════════════════════════════════════════════════

OLD_AGENT_OK = '''            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Agent complete. {result[\'total_findings\']} findings across {len(result[\'targets\'])} target(s).[/]",
            )'''

NEW_AGENT_OK = '''            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Agent complete. {result[\'total_findings\']} findings across {len(result[\'targets\'])} target(s).[/]",
            )
            self.call_from_thread(
                self._toast_success,
                f"Agent: {result[\'total_findings\']} findings across {len(result[\'targets\'])} target(s)",
            )'''

content = content.replace(OLD_AGENT_OK, NEW_AGENT_OK)

# ══════════════════════════════════════════════════════════════════════════════
# 6. Add success toast on swarm complete
# ══════════════════════════════════════════════════════════════════════════════

OLD_SWARM_OK = '''            self.call_from_thread(
                self._chat, f"[{GREEN}]  ✓ Swarm complete.[/]"
            )

            # Process each agent\'s findings'''

NEW_SWARM_OK = '''            self.call_from_thread(
                self._chat, f"[{GREEN}]  ✓ Swarm complete.[/]"
            )
            self.call_from_thread(
                self._toast_success, f"Swarm complete against {target}",
            )

            # Process each agent\'s findings'''

content = content.replace(OLD_SWARM_OK, NEW_SWARM_OK)

# ══════════════════════════════════════════════════════════════════════════════
# 7. Add success toast on adversarial complete
# ══════════════════════════════════════════════════════════════════════════════

OLD_ADV_OK = '''            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Adversarial complete. {result.findings_fixed} fixed, {result.findings_unfixed} remaining.[/]"
            )
            self.call_from_thread(
                self._chat,
                f"[{DIM_CYAN}]    Score: {result.initial_grade} ({result.initial_score}) → {result.final_grade} ({result.final_score})[/]"
            )'''

NEW_ADV_OK = '''            self.call_from_thread(
                self._chat,
                f"[{GREEN}]  ✓ Adversarial complete. {result.findings_fixed} fixed, {result.findings_unfixed} remaining.[/]"
            )
            self.call_from_thread(
                self._toast_success,
                f"Adversarial: {result.findings_fixed} fixed, score {result.initial_grade}→{result.final_grade}",
            )
            self.call_from_thread(
                self._chat,
                f"[{DIM_CYAN}]    Score: {result.initial_grade} ({result.initial_score}) → {result.final_grade} ({result.final_score})[/]"
            )'''

content = content.replace(OLD_ADV_OK, NEW_ADV_OK)

# ══════════════════════════════════════════════════════════════════════════════
# 8. Add success toast on export complete
# ══════════════════════════════════════════════════════════════════════════════

OLD_EXPORT_OK = '''            self.call_from_thread(
                self._chat, f"[{GREEN}]  ✓ Exported to: {path}[/]"
            )'''

NEW_EXPORT_OK = '''            self.call_from_thread(
                self._chat, f"[{GREEN}]  ✓ Exported to: {path}[/]"
            )
            self.call_from_thread(
                self._toast_success, f"Exported {fmt.upper()} to {path}",
            )'''

content = content.replace(OLD_EXPORT_OK, NEW_EXPORT_OK)

# ══════════════════════════════════════════════════════════════════════════════
# 9. Add toast on clear command
# ══════════════════════════════════════════════════════════════════════════════

OLD_CLEAR = '''        self._set_all_modules_status("idle")
        self._chat(f"[{DIM_CYAN}]Cleared.[/]")'''

NEW_CLEAR = '''        self._set_all_modules_status("idle")
        self._chat(f"[{DIM_CYAN}]Cleared.[/]")
        self._toast_info("All feeds cleared")'''

content = content.replace(OLD_CLEAR, NEW_CLEAR)

# ══════════════════════════════════════════════════════════════════════════════
# 10. Add toast on theme change
# ══════════════════════════════════════════════════════════════════════════════

OLD_THEME_OK = '''            self._chat(f"[{GREEN}]  ✓ Theme changed to [bold]{name}[/]. Restart nexus to apply fully.[/]")'''

NEW_THEME_OK = '''            self._chat(f"[{GREEN}]  ✓ Theme changed to [bold]{name}[/]. Restart nexus to apply fully.[/]")
            self._toast_success(f"Theme: {name}", action="restart nexus to apply fully")'''

content = content.replace(OLD_THEME_OK, NEW_THEME_OK)

# ══════════════════════════════════════════════════════════════════════════════
# 11. Add toast on panel toggle
# ══════════════════════════════════════════════════════════════════════════════

OLD_CHAT_TOGGLE = '''            mode = "CHAT ON" if not self._left_collapsed else "CHAT OFF"
            self._flash_split_indicator(mode)'''

NEW_CHAT_TOGGLE = '''            mode = "CHAT ON" if not self._left_collapsed else "CHAT OFF"
            self._flash_split_indicator(mode)
            self._toast_info(
                f"Chat panel {'shown' if not self._left_collapsed else 'hidden'}",
                action="[ to toggle back",
            )'''

content = content.replace(OLD_CHAT_TOGGLE, NEW_CHAT_TOGGLE)

OLD_MOD_TOGGLE = '''            mode = "MODS ON" if not self._modules_collapsed else "MODS OFF"
            self._flash_split_indicator(mode)'''

NEW_MOD_TOGGLE = '''            mode = "MODS ON" if not self._modules_collapsed else "MODS OFF"
            self._flash_split_indicator(mode)
            self._toast_info(
                f"Module grid {'shown' if not self._modules_collapsed else 'hidden'}",
                action="= to toggle back",
            )'''

content = content.replace(OLD_MOD_TOGGLE, NEW_MOD_TOGGLE)

# ══════════════════════════════════════════════════════════════════════════════
# 12. Add error recovery with auto-retry to _run_scan_worker
# ══════════════════════════════════════════════════════════════════════════════

OLD_SCAN_CATCH = '''        except Exception as e:
            self.call_from_thread(self._chat, f"[{RED}]  ✗ Scan error: {e}[/]")
            # Phase E: error toast with recovery hint
            self.call_from_thread(self._toast_error, e, context="Scan")
            # Phase C: push error_state hints
            self.call_from_thread(self._push_error_hint)
            if modules:
                for m in modules:
                    if m in self._module_cells:
                        self.call_from_thread(self._module_cells[m].set_status, "error")
            else:
                self.call_from_thread(self._set_all_modules_status, "error")'''

NEW_SCAN_CATCH = '''        except Exception as e:
            # Phase E: auto-retry with exponential backoff
            self._retry_count += 1
            if self._retry_count <= self._max_retries:
                self.call_from_thread(
                    self._toast_scan_retry, self._retry_count, self._max_retries,
                )
                # Exponential backoff: 1s, 2s
                import time as _time
                _time.sleep(1.0 * self._retry_count)
                # Retry: recurse into a fresh scan attempt
                try:
                    from .scanner import scan, audit_scan
                    if is_local:
                        result = audit_scan(target=target, modules=modules)
                    else:
                        result = scan(target=target, modules=modules)
                    data = result.to_dict()
                    self._retry_count = 0  # reset on success
                    self.call_from_thread(self._on_scan_complete, data, modules, is_local)
                    try:
                        from .history import save_scan
                        save_scan(data, label="nexus")
                    except Exception:
                        pass
                except Exception as retry_e:
                    # Retry also failed — final error
                    self.call_from_thread(self._chat, f"[{RED}]  ✗ Scan failed after {self._retry_count} retries: {retry_e}[/]")
                    self.call_from_thread(self._toast_error, retry_e, context="Scan (retries exhausted)")
                    self.call_from_thread(self._push_error_hint)
                    if modules:
                        for m in modules:
                            if m in self._module_cells:
                                self.call_from_thread(self._module_cells[m].set_status, "error")
                    else:
                        self.call_from_thread(self._set_all_modules_status, "error")
            else:
                # Max retries exceeded
                self.call_from_thread(self._chat, f"[{RED}]  ✗ Scan error: {e}[/]")
                self.call_from_thread(self._toast_error, e, context="Scan (retries exhausted)")
                self.call_from_thread(self._push_error_hint)
                if modules:
                    for m in modules:
                        if m in self._module_cells:
                            self.call_from_thread(self._module_cells[m].set_status, "error")
                else:
                    self.call_from_thread(self._set_all_modules_status, "error")'''

content = content.replace(OLD_SCAN_CATCH, NEW_SCAN_CATCH)

# ══════════════════════════════════════════════════════════════════════════════
# 13. Reset retry count at scan start
# ══════════════════════════════════════════════════════════════════════════════

OLD_SCAN_START = '''        self.call_from_thread(self.is_scanning.set, True)

        # Set modules to scanning + push module-specific hints'''

NEW_SCAN_START = '''        self.call_from_thread(self.is_scanning.set, True)
        self._retry_count = 0  # Phase E: reset retry counter on new scan

        # Set modules to scanning + push module-specific hints'''

content = content.replace(OLD_SCAN_START, NEW_SCAN_START)

# ══════════════════════════════════════════════════════════════════════════════
# 14. Add toast CSS for proper z-index overlay
# ══════════════════════════════════════════════════════════════════════════════

OLD_CSS_END = '''    /* ── Hide default header/footer ──────────────────────── */
    Header {
        display: none;
    }
    Footer {
        display: none;
    }'''

NEW_CSS_END = '''    /* ── Phase E: Toast Overlay ────────────────────────────── */
    #toast-container {
        layer: overlay;
        z-index: 100;
    }

    /* ── Phase E: Help overlay backdrop click area ──────── */
    .help-backdrop {
        height: 100%;
    }

    /* ── Hide default header/footer ──────────────────────── */
    Header {
        display: none;
    }
    Footer {
        display: none;
    }'''

content = content.replace(OLD_CSS_END, NEW_CSS_END)

# ══════════════════════════════════════════════════════════════════════════════
# 15. Add warning toast on generic worker ImportError (pip hint)
# ══════════════════════════════════════════════════════════════════════════════

OLD_IMPORT_ERR = '''        except ImportError:
            self.call_from_thread(
                self._chat,
                f"[{YELLOW}]  ⚠ {label} requires additional modules. Use [cyan]pip install reconpro[full][/][/]",
            )'''

NEW_IMPORT_ERR = '''        except ImportError:
            self.call_from_thread(
                self._chat,
                f"[{YELLOW}]  ⚠ {label} requires additional modules. Use [cyan]pip install reconpro[full][/][/]",
            )
            self.call_from_thread(
                self._toast_warning,
                f"{label}: missing modules",
                action="pip install reconpro[full]",
            )'''

content = content.replace(OLD_IMPORT_ERR, NEW_IMPORT_ERR)

# ══════════════════════════════════════════════════════════════════════════════
# 16. Add toast on rescan (Ctrl+S)
# ══════════════════════════════════════════════════════════════════════════════

OLD_RESCAN = '''    def action_rescan(self) -> None:
        """Ctrl+S: re-scan the last target."""
        if self.current_target:
            self._run_scan_worker(self.current_target)
            chat = self.query_one("#chat-log", RichLog)
            chat.write(f"[{CYAN}]► Re-scanning [bold]{self.current_target}[/][/]...")
        else:
            chat = self.query_one("#chat-log", RichLog)
            chat.write(f"[{RED}]No previous target to re-scan.[/]")'''

NEW_RESCAN = '''    def action_rescan(self) -> None:
        """Ctrl+S: re-scan the last target."""
        if self.current_target:
            self._run_scan_worker(self.current_target)
            chat = self.query_one("#chat-log", RichLog)
            chat.write(f"[{CYAN}]► Re-scanning [bold]{self.current_target}[/][/]...")
            self._toast_info(f"Re-scanning {self.current_target}...")
        else:
            chat = self.query_one("#chat-log", RichLog)
            chat.write(f"[{RED}]No previous target to re-scan.[/]")
            self._toast_warning("No previous target to re-scan", action="scan <target>")'''

content = content.replace(OLD_RESCAN, NEW_RESCAN)

# ══════════════════════════════════════════════════════════════════════════════
# 17. Add unknown command toast
# ══════════════════════════════════════════════════════════════════════════════

OLD_UNKNOWN = '''        self._chat(f"[{RED}]Unknown command: {cmd}[/]")
        self._chat(f"[{DIM_CYAN}]Type [cyan]help[/] for available commands · Press [cyan]Tab[/] on empty input to browse[/]")'''

NEW_UNKNOWN = '''        self._chat(f"[{RED}]Unknown command: {cmd}[/]")
        self._chat(f"[{DIM_CYAN}]Type [cyan]help[/] for available commands · Press [cyan]Tab[/] on empty input to browse[/]")
        self._toast_warning(f"Unknown command: {cmd}", action="Tab to browse commands")'''

content = content.replace(OLD_UNKNOWN, NEW_UNKNOWN)

# ══════════════════════════════════════════════════════════════════════════════
# Write
# ══════════════════════════════════════════════════════════════════════════════

with open(FILE, "w") as f:
    f.write(content)

# Count final lines
lines = content.count("\n") + 1
print(f"Phase E integration complete. {FILE}: {lines} lines")
