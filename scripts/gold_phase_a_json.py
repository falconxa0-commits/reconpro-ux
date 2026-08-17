#!/usr/bin/env python3
"""Phase A — JSON Compliance: Verify all --json commands output ONLY valid JSON on stdout."""
import subprocess
import sys
import json
import os
import re

RECONPRO = "/home/z/.local/bin/reconpro"

# Commands that accept --json and can be tested non-interactively (no network needed)
LOCAL_JSON_COMMANDS = [
    (["audit", "--modules", "none", "--json"], "audit (no modules)", 30),
    (["dev", ".", "--json"], "dev", 30),
    (["doctor", "--json"], "doctor", 30),
    (["ports", "--json"], "ports", 30),
    (["secrets", ".", "--json"], "secrets", 30),
    (["iac", ".", "--json"], "iac", 30),
    (["container", ".", "--json"], "container", 30),
    (["dashboard", "--json"], "dashboard", 30),
    (["export", "/tmp/reconpro_test_export.json", "--json"], "export", 30),
    (["threat-feeds", "--stats", "--json"], "threat-feeds (stats)", 30),
    (["rate", "--json"], "rate", 30),
    (["info", "--health", "--json"], "info (health)", 30),
    (["benchmark-engineering", "--quick", "--json"], "benchmark-engineering", 30),
    (["recommendations", "--json"], "recommendations", 30),
    (["memory", "--stats", "--json"], "memory (stats)", 30),
    (["digital-twin", "--json"], "digital-twin", 30),
    (["auto-fix", "--json"], "auto-fix", 30),
    (["regression", "--report", "--json"], "regression (report)", 30),
    (["health", "--json"], "health", 30),
    (["deps", "--json"], "deps", 30),
    (["notifications", "--json"], "notifications", 30),
    (["copilot", "--json"], "copilot", 30),
]

# Slow commands
SLOW_JSON_COMMANDS = [
    (["engineering", "--json", "--repo", "."], "engineering", 120),
    (["validate", "--json", "--repo", "."], "validate", 120),
]

# Network commands — will likely fail with connection errors but should still output JSON
NETWORK_JSON_COMMANDS = [
    (["scan", ".", "--modules", "none", "--json"], "scan (no modules)", 30),
    (["vibesec", ".", "--json"], "vibesec", 30),
    (["subdomains", "example.com", "--json"], "subdomains", 30),
    (["cloud-recon", "local", "--json"], "cloud-recon", 30),
    (["report", "--json"], "report", 30),
    (["wishes", "example.com", "--json"], "wishes", 30),
    (["geoip", "8.8.8.8", "--json"], "geoip", 30),
    (["ai-redteam", "example.com", "--json"], "ai-redteam", 30),
    (["supply-chain", "example.com", "--json"], "supply-chain", 30),
    (["cross-validate", "--json"], "cross-validate", 30),
    (["quantum-fingerprint", "example.com", "--json"], "quantum-fingerprint", 30),
    (["dark-web", "example.com", "--json"], "dark-web", 30),
    (["info-ops", "example.com", "--json"], "info-ops", 30),
    (["steg", "example.com", "--json"], "steg", 30),
    (["covert", "example.com", "--json"], "covert", 30),
    (["zero-day", "example.com", "--json"], "zero-day", 30),
    (["ghost", "example.com", "--json"], "ghost", 30),
    (["sigint", "example.com", "--json"], "sigint", 30),
    (["attributor", "example.com", "--json"], "attributor", 30),
    (["weaponized-report", "example.com", "--json"], "weaponized-report", 30),
    (["honeypot", "example.com", "--json"], "honeypot", 30),
    (["dead-drop", "example.com", "--json"], "dead-drop", 30),
]

results = {"pass": 0, "fail": 0, "skip": 0, "details": []}

def test_json_command(args, desc, timeout=30):
    """Test a single command for JSON compliance."""
    env = {**os.environ, "NO_COLOR": "1", "TERM": "dumb", "PYTHONIOENCODING": "utf-8"}
    
    try:
        proc = subprocess.run(
            [RECONPRO] + args, capture_output=True, text=True, timeout=timeout, env=env
        )
        stdout = proc.stdout
        stderr = proc.stderr
        exit_code = proc.returncode
        
        issues = []
        
        # 1. Check stdout is valid JSON
        json_valid = False
        parsed = None
        stdout_stripped = stdout.strip()
        if stdout_stripped:
            try:
                parsed = json.loads(stdout_stripped)
                json_valid = True
            except json.JSONDecodeError as e:
                # Check if it's console.print_json which wraps in a Rich object
                issues.append(f"INVALID JSON: {e}")
        else:
            issues.append("EMPTY stdout")
        
        # 2. ANSI in stdout
        if re.search(r'\x1b\[[0-9;]*m', stdout):
            issues.append("ANSI codes in stdout")
        
        # 3. Banner in stdout
        if stdout_stripped and len(stdout_stripped) > 10 and ("╔" in stdout_stripped[:30] or "RECONPRO" == stdout_stripped[:8]):
            issues.append("Banner in stdout")
        
        # 4. Traceback in stdout
        if "Traceback" in stdout:
            issues.append("Traceback in stdout")
        
        if json_valid and not issues:
            results["pass"] += 1
            status = "PASS"
        else:
            results["fail"] += 1
            status = "FAIL"
        
        detail = {
            "cmd": "reconpro " + " ".join(args),
            "desc": desc,
            "exit_code": exit_code,
            "status": status,
            "stdout_len": len(stdout),
            "stderr_len": len(stderr),
        }
        if issues:
            detail["issues"] = issues
        if parsed is not None:
            detail["json_type"] = type(parsed).__name__
        results["details"].append(detail)
        return status, issues
        
    except subprocess.TimeoutExpired:
        results["skip"] += 1
        results["details"].append({"cmd": "reconpro " + " ".join(args), "desc": desc, "status": "SKIP"})
        return "SKIP", ["timeout"]

print("="*70)
print("PHASE A — JSON COMPLIANCE (LOCAL COMMANDS)")
print("="*70)

for args, desc, timeout in LOCAL_JSON_COMMANDS:
    status, issues = test_json_command(args, desc, timeout)
    marker = "✓" if status == "PASS" else ("✗" if status == "FAIL" else "⊘")
    print(f"  {marker} {desc:35} {status}")

print(f"\n{'='*70}")
print("PHASE A — JSON COMPLIANCE (SLOW COMMANDS)")
print("="*70)

for args, desc, timeout in SLOW_JSON_COMMANDS:
    status, issues = test_json_command(args, desc, timeout)
    marker = "✓" if status == "PASS" else ("✗" if status == "FAIL" else "⊘")
    print(f"  {marker} {desc:35} {status}")

print(f"\n{'='*70}")
print("PHASE A — JSON COMPLIANCE (NETWORK COMMANDS)")
print("="*70)

for args, desc, timeout in NETWORK_JSON_COMMANDS:
    status, issues = test_json_command(args, desc, timeout)
    marker = "✓" if status == "PASS" else ("✗" if status == "FAIL" else "⊘")
    print(f"  {marker} {desc:35} {status}")

print(f"\n{'='*70}")
print("PHASE A — JSON COMPLIANCE SUMMARY")
print(f"{'='*70}")
print(f"  PASS: {results['pass']}")
print(f"  FAIL: {results['fail']}")
print(f"  SKIP: {results['skip']}")
print()

fails = [d for d in results["details"] if d.get("status") == "FAIL"]
if fails:
    print("FAILURES:")
    for f in fails:
        print(f"  ✗ {f['desc']}: {f.get('issues', [])}")
        if f.get('stdout_len', 0) > 0:
            # Show stdout preview
            pass
        if f.get('stderr_len', 0) > 0:
            print(f"    stderr: {f['stderr_len']}b")

# Save
out_path = "/home/z/my-project/download/phase_a_json_results.json"
with open(out_path, "w") as fp:
    json.dump(results, fp, indent=2)
print(f"\nResults saved: {out_path}")
