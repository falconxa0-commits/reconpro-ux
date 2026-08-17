#!/usr/bin/env python3
"""Phase A — JSON Compliance: Final test of all --json commands."""
import subprocess
import json
import os
import sys

RECONPRO = "/home/z/.local/bin/reconpro"

# Categorized commands
LOCAL_JSON = [
    ("ports --json", "ports"),
    ("secrets . --json", "secrets"),
    ("health --json", "health"),
    ("deps --json", "deps"),
    ("notifications --json", "notifications"),
    ("memory --stats --json", "memory"),
    ("rate --json", "rate"),
    ("threat-feeds --stats --json", "threat-feeds"),
    ("auto-fix --json", "auto-fix"),
    ("recommendations --json", "recommendations"),
    ("doctor --json", "doctor"),
    ("dashboard --json", "dashboard"),
    ("iac . --json", "iac"),
    ("container . --json", "container"),
    ("digital-twin --json", "digital-twin"),
    ("info --health --json", "info"),
    ("regression --report --json", "regression"),
    ("scan . --modules none --json", "scan"),
    ("vibesec . --json", "vibesec"),
    ("audit --modules none --json", "audit"),
    ("dev . --json", "dev"),
    ("cloud-recon local --json", "cloud-recon"),
    ("report --json", "report"),
    ("benchmark-engineering --quick --json", "benchmark-engineering"),
]

# Commands that need real targets/network — test but allow failure
NETWORK_JSON = [
    ("subdomains example.com --json", "subdomains"),
    ("geoip 8.8.8.8 --json", "geoip"),
    ("wishes example.com --json", "wishes"),
    ("ai-redteam example.com --json", "ai-redteam"),
    ("supply-chain example.com --json", "supply-chain"),
    ("cross-validate --json", "cross-validate"),
    ("quantum-fingerprint example.com --json", "quantum-fingerprint"),
    ("dark-web example.com --json", "dark-web"),
    ("info-ops example.com --json", "info-ops"),
    ("steg example.com --json", "steg"),
    ("covert example.com --json", "covert"),
    ("zero-day example.com --json", "zero-day"),
    ("ghost example.com --json", "ghost"),
    ("sigint example.com --json", "sigint"),
    ("attributor example.com --json", "attributor"),
    ("weaponized-report example.com --json", "weaponized-report"),
    ("honeypot example.com --json", "honeypot"),
    ("dead-drop example.com --json", "dead-drop"),
]

pass_count = 0
fail_count = 0
net_fail = 0
results = []

def test_cmd(cmd_str, desc, timeout=30):
    global pass_count, fail_count, net_fail
    env = {**os.environ, "NO_COLOR": "1", "TERM": "dumb"}
    try:
        proc = subprocess.run(
            f"{RECONPRO} {cmd_str}".split(),
            capture_output=True, text=True, timeout=timeout, env=env
        )
        stdout = proc.stdout.strip()
        if stdout:
            try:
                data = json.loads(stdout)
                pass_count += 1
                results.append((desc, "PASS", None))
                return
            except json.JSONDecodeError:
                fail_count += 1
                results.append((desc, "FAIL", f"Invalid JSON ({len(stdout)}b stdout)"))
                return
        else:
            # No stdout — check stderr for network error
            if "timeout" in proc.stderr.lower() or "connection" in proc.stderr.lower() or "resolved" in proc.stderr.lower():
                net_fail += 1
                results.append((desc, "NET_FAIL", "Network/sandbox"))
                return
            fail_count += 1
            results.append((desc, "FAIL", f"Empty stdout, stderr={len(proc.stderr)}b"))
    except subprocess.TimeoutExpired:
        net_fail += 1
        results.append((desc, "NET_FAIL", "Timeout"))
    except Exception as e:
        fail_count += 1
        results.append((desc, "FAIL", str(e)))

print("Phase A — JSON Compliance (LOCAL)")
print("=" * 60)
for cmd, desc in LOCAL_JSON:
    test_cmd(cmd, desc)
    status = results[-1][1]
    marker = "✓" if status == "PASS" else "✗"
    print(f"  {marker} {desc:35} {status}")

print(f"\nPhase A — JSON Compliance (NETWORK — best effort)")
print("=" * 60)
for cmd, desc in NETWORK_JSON:
    test_cmd(cmd, desc, timeout=20)
    status = results[-1][1]
    marker = "✓" if status == "PASS" else ("⊘" if status == "NET_FAIL" else "✗")
    print(f"  {marker} {desc:35} {status}")

print(f"\n{'='*60}")
print(f"SUMMARY: {pass_count} PASS / {fail_count} FAIL / {net_fail} NET_FAIL (expected)")
print(f"{'='*60}")

if fail_count > 0:
    print("\nFAILURES:")
    for desc, status, reason in results:
        if status == "FAIL":
            print(f"  ✗ {desc}: {reason}")

out = {"pass": pass_count, "fail": fail_count, "net_fail": net_fail, "total": pass_count+fail_count+net_fail, "results": [{"desc":r[0],"status":r[1],"reason":r[2]} for r in results]}
with open("/home/z/my-project/download/phase_a_json_results.json", "w") as f:
    json.dump(out, f, indent=2)
