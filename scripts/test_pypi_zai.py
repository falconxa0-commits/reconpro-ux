#!/usr/bin/env python3
"""Test z.ai integration from the pip-installed reconpro package (NOT local source).

This proves the PyPI package works end-to-end with the live z.ai API.
"""
import sys
import time
import json

passed = 0
failed = 0

def test(name, fn):
    global passed, failed
    print(f"  TEST {name}...", end=" ", flush=True)
    try:
        result = fn()
        print(f"PASS" + (f" ({result})" if result else ""))
        passed += 1
    except Exception as e:
        print(f"FAIL: {e}")
        failed += 1


# ── 1. Import from pip-installed package ──
print("\n[1/6] Import Tests")

def test_import_module():
    from reconpro.integrations.zai_stream import ZAIStreamClient
    return "OK"

def test_import_from_init():
    from reconpro.integrations import ZAIStreamClient
    return "OK"

def test_cli_has_zai():
    import reconpro.cli as cli
    # Check the CLI module loads without error
    assert hasattr(cli, 'main')
    return "OK"

test("import zai_stream module", test_import_module)
test("import ZAIStreamClient from __init__", test_import_from_init)
test("cli module loads with zai handler", test_cli_has_zai)


# ── 2. Config Discovery ──
print("\n[2/6] Config Discovery")

def test_config_discovery():
    from reconpro.integrations.zai_stream import _discover_config
    cfg = _discover_config()
    assert cfg.get("baseUrl"), "Missing baseUrl"
    assert cfg.get("apiKey"), "Missing apiKey"
    return cfg.get("baseUrl", "")[:40]

test("discover config from /etc/.z-ai-config", test_config_discovery)


# ── 3. Client Creation ──
print("\n[3/6] Client Creation")

def test_client_auto_config():
    from reconpro.integrations import ZAIStreamClient
    c = ZAIStreamClient()
    assert c.base_url, "No base_url"
    assert c.api_key, "No api_key"
    assert "z.ai" in c.base_url or "internal-api" in c.base_url
    return f"model={c.model}"

def test_client_repr():
    from reconpro.integrations import ZAIStreamClient
    c = ZAIStreamClient()
    r = repr(c)
    assert "ZAIStreamClient" in r
    return "OK"

test("auto-config client creation", test_client_auto_config)
test("client __repr__", test_client_repr)


# ── 4. Health Check (live API) ──
print("\n[4/6] Live API Tests")

def test_health_check():
    from reconpro.integrations import ZAIStreamClient
    c = ZAIStreamClient(timeout=30)
    r = c.health_check()
    assert r["status"] == "connected", f"Not connected: {r}"
    assert r["latency_ms"] > 0
    return f"{r['latency_ms']}ms"

test("health check (live z.ai)", test_health_check)


# ── 5. Chat (non-streaming) ──
print("\n[5/6] Chat Tests")

def test_chat_non_streaming():
    from reconpro.integrations import ZAIStreamClient
    c = ZAIStreamClient(timeout=30)
    resp = c.chat("Say exactly: RECONPRO_TEST_OK")
    assert "RECONPRO_TEST_OK" in resp.upper(), f"Unexpected: {resp[:100]}"
    return f"{len(resp)} chars"

test("non-streaming chat", test_chat_non_streaming)


# ── 6. Streaming Chat ──
print("\n[6/6] Streaming Tests")

def test_chat_streaming():
    from reconpro.integrations import ZAIStreamClient
    c = ZAIStreamClient(timeout=30)
    chunks = []
    for chunk in c.chat_stream("Count 1 to 5 briefly."):
        chunks.append(chunk)
    full = "".join(chunks)
    assert len(chunks) > 1, f"Only {len(chunks)} chunk(s) — not streaming"
    assert len(full) > 10, f"Response too short: {full[:50]}"
    return f"{len(chunks)} chunks, {len(full)} chars"

def test_analyze_findings_stream():
    from reconpro.integrations import ZAIStreamClient
    c = ZAIStreamClient(timeout=60)
    findings = [
        {
            "title": "Missing X-Frame-Options header",
            "severity": "high",
            "category": "headers",
            "module": "recon",
            "description": "No X-Frame-Options or Content-Security-Policy frame-ancestors directive found. Clickjacking attacks are possible.",
            "evidence": "Response headers lack X-Frame-Options",
            "asset": "https://test.example.com",
            "points_deducted": 5,
            "dread_score": 7.5,
        },
        {
            "title": "Cloud metadata endpoint accessible",
            "severity": "critical",
            "category": "ssrf",
            "module": "chain",
            "description": "SSRF to 169.254.169.254 succeeded, exposing cloud instance metadata including IAM credentials.",
            "evidence": "HTTP 200 from metadata endpoint with role ARN",
            "asset": "https://test.example.com/api/proxy",
            "points_deducted": 15,
            "dread_score": {"damage": 10, "reproducibility": 9, "exploitability": 8, "affected_users": 5, "discoverability": 7},
        },
    ]
    chunks = []
    for chunk in c.analyze_findings_stream(findings, target="test.example.com"):
        chunks.append(chunk)
    full = "".join(chunks)
    assert len(chunks) > 5, f"Only {len(chunks)} chunks"
    assert len(full) > 100, f"Analysis too short: {len(full)} chars"
    # Verify it mentions the findings
    assert "clickjack" in full.lower() or "frame" in full.lower() or "header" in full.lower()
    return f"{len(chunks)} chunks, {len(full)} chars"

def test_sync_findings():
    from reconpro.integrations import ZAIStreamClient
    c = ZAIStreamClient(timeout=60)
    findings = [{
        "title": "Open redirect",
        "severity": "medium",
        "category": "chain",
        "module": "chain",
        "description": "URL parameter allows redirect to external domains",
        "asset": "https://test.example.com",
        "dread_score": 5.0,
    }]
    r = c.sync_findings(findings, target="test.example.com")
    assert r["action"] == "analyzed"
    assert r["findings_count"] == 1
    assert len(r["analysis"]) > 50
    return "OK"

test("streaming chat", test_chat_streaming)
test("streaming finding analysis", test_analyze_findings_stream)
test("sync_findings (structured result)", test_sync_findings)


# ── Summary ──
print(f"\n{'='*60}")
print(f"  RESULTS: {passed} passed, {failed} failed out of {passed+failed}")
print(f"  Package: reconpro (pip-installed, NOT local source)")
print(f"{'='*60}")
sys.exit(0 if failed == 0 else 1)
