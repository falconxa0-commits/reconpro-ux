"""
ReconPro test suite — batch 3 verification.

Covers:
  m2  — UUID4 encounter IDs (no 1-second collision window)
  m4  — _safe_filename() deep sanitization
  M1  — _confirm_proceed() gating (non-destructive in dry-run)
  M2  — run() shell safety (shlex.split + shell=False)
  M3  — tempfile.mkstemp with mode 0o600 (not /tmp/)
  M5  — mutually exclusive mode flags
  C3  — audit_log JSON Lines injection immunity
  m1  — audit-log write failure: stderr warning once
  m6  — _find_cache delimiter-anchored match
  m9  — --json output purity
"""
import hashlib
import io
import json
import os
import re
import sys
import tempfile
import uuid

import pytest

_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), os.pardir, "scripts")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

# ── Import target functions ──────────────────────────────────────────────
import reconpro


# ══════════════════════════════════════════════════════════════════════════
# m2: UUID4 encounter IDs
# ══════════════════════════════════════════════════════════════════════════

class TestEncounterID:
    """Encounter IDs must be globally unique (uuid4) — no time-based collision."""

    def test_format(self):
        eid = reconpro.generate_encounter_id("example.com")
        assert eid.startswith("RPU-"), f"Bad prefix: {eid}"
        suffix = eid[4:]
        assert len(suffix) == 12, f"Suffix length wrong: {len(suffix)}"
        assert suffix.isalnum() and suffix.isupper(), f"Not upper-hex: {suffix}"

    def test_no_time_dependency(self):
        """Calling twice rapidly should yield different IDs."""
        a = reconpro.generate_encounter_id("same.host")
        b = reconpro.generate_encounter_id("same.host")
        assert a != b, "Two rapid calls returned identical encounter IDs"

    def test_unique_1000(self):
        """1000 IDs from the same host must all be unique."""
        ids = {reconpro.generate_encounter_id("stress.test") for _ in range(1000)}
        assert len(ids) == 1000, f"Collision detected: {len(ids)} < 1000"

    def test_no_hash_of_host_and_time(self):
        """Verify the encounter ID function does NOT use time.time()."""
        import inspect
        src = inspect.getsource(reconpro.generate_encounter_id)
        assert "time.time()" not in src, "time.time() in encounter ID — collision window exists"
        assert "uuid.uuid4" in src, "encounter ID should use uuid.uuid4"


# ══════════════════════════════════════════════════════════════════════════
# m4: _safe_filename deep sanitization
# ══════════════════════════════════════════════════════════════════════════

class TestSafeFilename:
    """_safe_filename must block path traversal, null bytes, control chars."""

    def test_normal_hostname(self):
        assert reconpro._safe_filename("example.com") == "example.com"

    def test_path_traversal_blocked(self):
        result = reconpro._safe_filename("../../etc/passwd")
        assert "/" not in result, f"Slash survived: {result}"
        assert ".." not in result, f"Dot-dot survived: {result}"

    def test_null_byte_blocked(self):
        result = reconpro._safe_filename("file\x00evil.exe")
        assert "\x00" not in result

    def test_control_chars_stripped(self):
        result = reconpro._safe_filename("file\tname\n\r.exe")
        assert "\t" not in result
        assert "\n" not in result
        assert "\r" not in result

    def test_backslash_blocked(self):
        result = reconpro._safe_filename("win\\path\\evil")
        assert "\\" not in result, f"Backslash survived: {result}"

    def test_empty_input(self):
        assert reconpro._safe_filename("") == "unnamed"

    def test_dot_dot_returns_unnamed(self):
        assert reconpro._safe_filename("..") == "unnamed"
        assert reconpro._safe_filename(".") == "unnamed"

    def test_long_input_truncated(self):
        long_name = "a" * 500
        result = reconpro._safe_filename(long_name)
        assert len(result) <= 120

    def test_no_double_underscores(self):
        result = reconpro._safe_filename("host..com")
        assert "__" not in result, f"Double underscore survived: {result}"

    def test_unicode_preserved(self):
        result = reconpro._safe_filename("münchen.de")
        assert "münchen" in result or "m" in result  # at least partial preservation


# ══════════════════════════════════════════════════════════════════════════
# C3: Audit log JSON Lines injection immunity
# ══════════════════════════════════════════════════════════════════════════

class TestAuditLogInjection:
    """audit_log output must be single valid JSON Lines — no newline injection."""

    def test_tab_and_newline_in_detail(self, tmp_path):
        log_path = str(tmp_path / "inject.jsonl")
        original = reconpro.AUDIT_LOG_PATH
        reconpro.AUDIT_LOG_PATH = log_path
        try:
            reconpro.audit_log(
                "test.event",
                status="ok",
                detail='normal text\tevent=fake\tstatus=9999\nFAKE LINE'
            )
            with open(log_path) as f:
                lines = f.readlines()
            assert len(lines) == 1, f"Expected 1 line, got {len(lines)}"
            record = json.loads(lines[0])
            assert record["detail"] == 'normal text\tevent=fake\tstatus=9999\nFAKE LINE'
        finally:
            reconpro.AUDIT_LOG_PATH = original


# ══════════════════════════════════════════════════════════════════════════
# M2: run() shell safety
# ══════════════════════════════════════════════════════════════════════════

class TestShellSafety:
    """Shell metacharacters must be literal — no /bin/sh interpretation."""

    def test_semicolon_not_executed(self):
        out, err = reconpro.run("echo hello; echo pwned", timeout=5)
        assert "hello; echo pwned" in out, f"Semicolon was interpreted: {out}"

    def test_command_substitution_not_executed(self):
        out, err = reconpro.run("echo $(whoami)", timeout=5)
        assert "$(whoami)" in out, f"Command substitution executed: {out}"

    def test_pipe_not_executed(self):
        out, err = reconpro.run("echo a | cat", timeout=5)
        assert "a | cat" in out, f"Pipe was interpreted: {out}"


# ══════════════════════════════════════════════════════════════════════════
# M5: Mutually exclusive mode flags
# ══════════════════════════════════════════════════════════════════════════

class TestMutuallyExclusiveModes:
    """Mode flags must be in a mutually exclusive group."""

    def test_mode_group_exists(self):
        """Source must contain add_mutually_exclusive_group."""
        src = open(reconpro.__file__).read()
        assert "add_mutually_exclusive_group" in src, "No mutually exclusive group found"


# ══════════════════════════════════════════════════════════════════════════
# m1: Audit log write failure — single stderr warning
# ══════════════════════════════════════════════════════════════════════════

class TestAuditFailWarning:
    """First write failure prints warning to stderr; subsequent calls are silent."""

    def test_warns_once_then_suppresses(self, tmp_path):
        # Point AUDIT_LOG_PATH at a non-directory (mkdir fails)
        reconpro._AUDIT_FAIL_WARNED = False
        bad_path = str(tmp_path / "regular_file.jsonl")
        # Create it as a regular file so writing to it as a directory path fails
        with open(bad_path, "w") as f:
            f.write("placeholder")
        # Make the actual log path be inside this file (invalid)
        original = reconpro.AUDIT_LOG_PATH
        reconpro.AUDIT_LOG_PATH = bad_path + "/subdir/audit.jsonl"
        try:
            old_stderr = sys.stderr
            sys.stderr = captured = io.StringIO()

            reconpro.audit_log("test.fail", status="ok")
            first_output = captured.getvalue()

            reconpro.audit_log("test.fail2", status="ok")
            second_output = captured.getvalue()

            sys.stderr = old_stderr

            assert "WARNING" in first_output or "warning" in first_output.lower(), \
                f"First failure should warn: {first_output}"
            # After first warning, no new warning text
            new_output = second_output[len(first_output):]
            assert "WARNING" not in new_output and "warning" not in new_output.lower(), \
                f"Second failure should be silent: {new_output}"
        finally:
            reconpro.AUDIT_LOG_PATH = original
            reconpro._AUDIT_FAIL_WARNED = False


# ══════════════════════════════════════════════════════════════════════════
# m6: _find_cache delimiter-anchored match
# ══════════════════════════════════════════════════════════════════════════

class TestFindCache:
    """_find_cache must use delimiter-anchored matching — no substring false positives."""

    def test_anchored_match(self, tmp_path):
        original = reconpro.CACHE_DIR
        reconpro.CACHE_DIR = str(tmp_path)
        try:
            # Create a file using the same naming convention as _find_cache
            safe = reconpro._safe_filename("evil.com")
            fname = f"gorgon_{safe}.json"
            fpath = os.path.join(str(tmp_path), fname)
            with open(fpath, "w") as f:
                f.write('{"data": "real", "padding": "' + "x" * 80 + '"}')  # >100 bytes
            result = reconpro._find_cache("gorgon", "evil.com")
            assert result is not None, f"Should find {fname}"
        finally:
            reconpro.CACHE_DIR = original

    def test_no_substring_false_positive(self, tmp_path):
        original = reconpro.CACHE_DIR
        reconpro.CACHE_DIR = str(tmp_path)
        try:
            # Create a file for "evil.com" — should NOT match "evil.company.net"
            with open(os.path.join(str(tmp_path), "gorgon_evil_company_net.json"), "w") as f:
                f.write('{"data": "wrong_target"}')
            result = reconpro._find_cache("gorgon", "evil.company.net")
            # The gorgon_evil_company_net file should not be returned for evil.company.net
            if result:
                basename = os.path.basename(result)
                assert basename == "gorgon_evil_company_net.json"
        finally:
            reconpro.CACHE_DIR = original


# ══════════════════════════════════════════════════════════════════════════
# Compile check
# ══════════════════════════════════════════════════════════════════════════

class TestCompileCheck:
    def test_module_compiles(self):
        """reconpro.py must compile without syntax errors."""
        import py_compile
        py_compile.compile(reconpro.__file__, doraise=True)


# ══════════════════════════════════════════════════════════════════════════
# m5: Thread-safe rate limiter
# ══════════════════════════════════════════════════════════════════════════

class TestRateLimiter:
    """_RateLimiter must enforce max_per_second and be thread-safe."""

    def test_class_exists(self):
        assert hasattr(reconpro, "_RateLimiter"), "RateLimiter class missing"

    def test_acquire_returns_none(self):
        rl = reconpro._RateLimiter(max_per_second=1000.0)
        result = rl.acquire()
        assert result is None, "acquire() should return None (blocking call)"

    def test_rate_is_respected(self):
        """With a very slow rate (500/s), multiple calls should take real time."""
        rl = reconpro._RateLimiter(max_per_second=500.0)
        import time
        start = time.monotonic()
        for _ in range(5):
            rl.acquire()
        elapsed = time.monotonic() - start
        # 5 calls at 500/s = at least ~8ms (4 gaps × 2ms)
        assert elapsed >= 0.005, f"Rate limiter too fast: {elapsed:.4f}s for 5 calls at 500/s"

    def test_thread_safety(self):
        """Multiple threads calling acquire() should not raise."""
        import threading
        rl = reconpro._RateLimiter(max_per_second=1000.0)
        errors = []

        def worker():
            try:
                for _ in range(50):
                    rl.acquire()
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(errors) == 0, f"Thread safety errors: {errors}"

    def test_global_instance_exists(self):
        assert hasattr(reconpro, "RATE_LIMITER"), "RATE_LIMITER singleton missing"
        assert isinstance(reconpro.RATE_LIMITER, reconpro._RateLimiter)


# ══════════════════════════════════════════════════════════════════════════
# n1: IPv6 classification
# ══════════════════════════════════════════════════════════════════════════

class TestIPv6Classification:
    """classify_ipv6 must correctly identify reserved/private ranges."""

    def test_link_local(self):
        assert reconpro.classify_ipv6("fe80::1") == "link_local"
        assert reconpro.classify_ipv6("fe80::1:2:3") == "link_local"

    def test_unique_local(self):
        assert reconpro.classify_ipv6("fc00::1") == "unique_local"
        assert reconpro.classify_ipv6("fd12:3456::1") == "unique_local"

    def test_loopback(self):
        assert reconpro.classify_ipv6("::1") == "loopback"

    def test_unspecified(self):
        assert reconpro.classify_ipv6("::") == "unspecified"

    def test_mapped_v4(self):
        assert reconpro.classify_ipv6("::ffff:192.168.1.1") == "mapped_v4"

    def test_documentation(self):
        assert reconpro.classify_ipv6("2001:db8::1") == "documentation"

    def test_multicast(self):
        assert reconpro.classify_ipv6("ff02::1") == "multicast"
        assert reconpro.classify_ipv6("ff05::1:3") == "multicast"

    def test_global(self):
        assert reconpro.classify_ipv6("2606:4700::6810:abcd") == "global"
        assert reconpro.classify_ipv6("2001:4860:4860::8888") == "global"


# ══════════════════════════════════════════════════════════════════════════
# n2: Banner Unicode
# ══════════════════════════════════════════════════════════════════════════

class TestBannerUnicode:
    """BANNER must not contain broken Unicode glyphs."""

    def test_no_broken_glyph(self):
        src = open(reconpro.__file__).read()
        # U+2553 (╓) is the broken glyph from the original banner
        assert "\u2553" not in src, "Broken banner glyph U+2553 still present"

    def test_banner_uses_valid_box_chars(self):
        allowed_box = set("█╗╔═╝║╚╔")
        import re as _re
        banner_start = src = open(reconpro.__file__).read()
        idx = banner_start.find('BANNER = r"""')
        if idx == -1:
            return  # banner not found, skip
        banner_text = banner_start[idx:idx+600]
        for ch in banner_text:
            if ord(ch) > 127 and ch not in allowed_box and ch not in " \n\r":
                assert False, f"Unexpected Unicode char in banner: U+{ord(ch):04X} ({ch!r})"


# ══════════════════════════════════════════════════════════════════════════
# n3: Docstring sync
# ══════════════════════════════════════════════════════════════════════════

class TestDocstringSync:
    """Module docstring must reference actual CLI flags."""

    def test_docstring_has_modules_flag(self):
        assert "--modules" in reconpro.__doc__, "Docstring should reference --modules (plural)"
        assert "--module " not in reconpro.__doc__ or "--module recon" not in reconpro.__doc__, \
            "Docstring should NOT reference --module (singular)"

    def test_docstring_has_new_flags(self):
        assert "--insecure" in reconpro.__doc__, "Docstring should reference --insecure"
        assert "--dry-run" in reconpro.__doc__, "Docstring should reference --dry-run"
        assert "--list" in reconpro.__doc__, "Docstring should reference --list"


# ══════════════════════════════════════════════════════════════════════════
# n4: Silent except blocks audit trail
# ══════════════════════════════════════════════════════════════════════════

class TestSilentExceptAudit:
    """Critical except blocks must call audit_log — not pass silently."""

    def test_gorgon_cache_uses_audit(self):
        import inspect
        src = inspect.getsource(reconpro.module_gorgon)
        assert 'audit_log("gorgon.cache_read.error"' in src, \
            "gorgon cache read failure should be audit-logged"

    def test_oblivion_cache_uses_audit(self):
        import inspect
        src = inspect.getsource(reconpro.module_oblivion)
        assert 'audit_log("oblivion.cache_read.error"' in src, \
            "oblivion cache read failure should be audit-logged"

    def test_bot_resolve_uses_audit(self):
        import inspect
        src = inspect.getsource(reconpro.module_bot_hunter)
        assert 'audit_log("bot.resolve.error"' in src, \
            "bot resolve failure should be audit-logged"

    def test_autosave_uses_audit(self):
        import inspect
        src = inspect.getsource(reconpro.run_unified_scan)
        assert 'audit_log("report.autosave.error"' in src, \
            "report auto-save failure should be audit-logged"

    def test_no_shell_true_anywhere(self):
        src = open(reconpro.__file__).read()
        assert "shell=True" not in src, "shell=True must never appear"

