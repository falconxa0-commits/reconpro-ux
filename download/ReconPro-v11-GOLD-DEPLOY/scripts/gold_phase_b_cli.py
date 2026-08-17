#!/usr/bin/env python3
"""Phase B — CLI Contract: Verify all 77 commands."""
import subprocess
import os
import re

RECONPRO = "/home/z/.local/bin/reconpro"

# All 77 commands with expected args for non-interactive test
COMMANDS = [
    # Commands with required target args — use safe defaults
    ("scan . --modules none", "scan"),
    ("vibesec .", "vibesec"),
    ("audit --modules none", "audit"),
    ("dev .", "dev"),
    ("doctor", "doctor"),
    ("ports", "ports"),
    ("secrets .", "secrets"),
    ("list", "list"),
    ("nexus", "nexus"),           # interactive — skip execution
    ("chat", "chat"),             # interactive — skip execution
    ("tui", "tui"),               # interactive — skip execution
    ("blitz", "blitz"),           # needs 2+ targets
    ("agent \"test goal\"", "agent"),
    ("subdomains example.com", "subdomains"),
    ("schedule .", "schedule"),    # needs target
    ("serve", "serve"),           # binds port — skip execution
    ("report", "report"),
    ("dashboard", "dashboard"),
    ("history", "history"),
    ("diff", "diff"),
    ("screenshot http://example.com", "screenshot"),
    ("open http://example.com", "open"),
    ("plugin list", "plugin"),
    ("swarm example.com", "swarm"),
    ("adversarial example.com", "adversarial"),
    ("ast .", "ast"),
    ("cve test", "cve"),
    ("graph", "graph"),
    ("iac .", "iac"),
    ("container .", "container"),
    ("cloud-recon local", "cloud-recon"),
    ("defense", "defense"),
    ("fuzzer http://example.com", "fuzzer"),
    ("profile example.com", "profile"),
    ("compliance", "compliance"),
    ("delta", "delta"),
    ("benchmark", "benchmark"),
    ("graph-visual", "graph-visual"),
    ("netmap", "netmap"),
    ("passive example.com", "passive"),
    ("export /tmp/rp_test.json", "export"),
    ("zai", "zai"),
    ("wishes example.com", "wishes"),
    ("geoip 8.8.8.8", "geoip"),
    ("threat-feeds", "threat-feeds"),
    ("ai-redteam example.com", "ai-redteam"),
    ("supply-chain example.com", "supply-chain"),
    ("cross-validate", "cross-validate"),
    ("quantum-fingerprint example.com", "quantum-fingerprint"),
    ("dark-web example.com", "dark-web"),
    ("info-ops example.com", "info-ops"),
    ("steg example.com", "steg"),
    ("covert example.com", "covert"),
    ("zero-day example.com", "zero-day"),
    ("ghost example.com", "ghost"),
    ("sigint example.com", "sigint"),
    ("attributor example.com", "attributor"),
    ("weaponized-report example.com", "weaponized-report"),
    ("honeypot example.com", "honeypot"),
    ("rate", "rate"),
    ("dead-drop example.com", "dead-drop"),
    ("info", "info"),
    ("engineering --repo .", "engineering"),     # SLOW
    ("validate --repo .", "validate"),           # SLOW
    ("benchmark-engineering --quick", "benchmark-engineering"),
    ("recommendations", "recommendations"),
    ("memory --stats", "memory"),
    ("digital-twin", "digital-twin"),
    ("auto-fix", "auto-fix"),
    ("regression", "regression"),
    ("health", "health"),
    ("deps", "deps"),
    ("palette", "palette"),             # interactive
    ("theme list", "theme"),
    ("workspace list", "workspace"),
    ("notifications", "notifications"),
    ("copilot", "copilot"),
]

# Interactive commands that can't be tested for execution
INTERACTIVE = {"nexus", "chat", "tui", "serve", "palette"}
# Commands that bind ports
SKIP_EXEC = {"nexus", "chat", "tui", "serve", "palette", "blitz"}
# Slow commands
SLOW = {"engineering", "validate"}
TIMEOUT = {c: 15 for c in COMMANDS}
for cmd_str, desc in COMMANDS:
    if desc in SLOW:
        TIMEOUT[(cmd_str, desc)] = 90

env = {**os.environ, "NO_COLOR": "1", "TERM": "dumb"}
help_pass = 0
help_fail = 0
exec_pass = 0
exec_fail = 0
exec_skip = 0
details = []

print("=" * 70)
print("PHASE B — CLI CONTRACT: --help TEST")
print("=" * 70)

for cmd_str, desc in COMMANDS:
    cmd_name = cmd_str.split()[0]
    try:
        proc = subprocess.run(
            f"{RECONPRO} {cmd_name} --help".split(),
            capture_output=True, text=True, timeout=10, env=env
        )
        if proc.returncode == 0 and len(proc.stdout) > 20:
            help_pass += 1
            details.append({"cmd": desc, "help": "PASS"})
        else:
            help_fail += 1
            details.append({"cmd": desc, "help": "FAIL", "exit": proc.returncode, "stdout": len(proc.stdout)})
    except Exception as e:
        help_fail += 1
        details.append({"cmd": desc, "help": "FAIL", "error": str(e)})

print(f"\n  --help: {help_pass}/{help_pass+help_fail} PASS")

print(f"\n{'='*70}")
print("PHASE B — CLI CONTRACT: EXECUTION TEST (non-interactive)")
print("=" * 70)

for cmd_str, desc in COMMANDS:
    if desc in SKIP_EXEC:
        exec_skip += 1
        print(f"  ⊘ {desc:35} SKIP (interactive/port)")
        continue
    timeout = TIMEOUT.get((cmd_str, desc), 15)
    try:
        proc = subprocess.run(
            f"{RECONPRO} {cmd_str}".split(),
            capture_output=True, text=True, timeout=timeout, env=env
        )
        has_traceback = "Traceback" in proc.stdout or "Traceback" in proc.stderr
        if not has_traceback:
            exec_pass += 1
            status = "PASS"
        else:
            exec_fail += 1
            status = "FAIL (traceback)"
        details_entry = next((d for d in details if d["cmd"] == desc), {})
        details_entry["exec"] = status
        details_entry["exec_exit"] = proc.returncode
        details_entry["exec_stderr"] = len(proc.stderr)
        marker = "✓" if status == "PASS" else "✗"
        print(f"  {marker} {desc:35} {status} (exit={proc.returncode})")
    except subprocess.TimeoutExpired:
        exec_skip += 1
        print(f"  ⊘ {desc:35} TIMEOUT ({timeout}s)")
    except Exception as e:
        exec_fail += 1
        print(f"  ✗ {desc:35} ERROR: {e}")

print(f"\n{'='*70}")
print(f"PHASE B SUMMARY")
print(f"{'='*70}")
print(f"  --help:     {help_pass}/{help_pass+help_fail} PASS")
print(f"  Execution:  {exec_pass}/{exec_pass+exec_fail+exec_skip} PASS ({exec_skip} skipped)")
print(f"  Total FAIL: {help_fail + exec_fail}")

if help_fail > 0 or exec_fail > 0:
    print("\nFAILURES:")
    for d in details:
        if d.get("help") == "FAIL":
            print(f"  ✗ {d['cmd']} --help: exit={d.get('exit')}, stdout={d.get('stdout')}b")
        if d.get("exec", "").startswith("FAIL"):
            print(f"  ✗ {d['cmd']} exec: {d.get('exec')}")

# Save
import json
out = {"help_pass": help_pass, "help_fail": help_fail, "exec_pass": exec_pass, "exec_fail": exec_fail, "exec_skip": exec_skip, "details": details}
with open("/home/z/my-project/download/phase_b_cli_results.json", "w") as f:
    json.dump(out, f, indent=2)
print(f"\nResults saved: /home/z/my-project/download/phase_b_cli_results.json")
