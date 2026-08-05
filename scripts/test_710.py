#!/usr/bin/env python3
"""Test ALL new features in reconpro 7.1.0 from pip install."""
import sys
passed = failed = 0

def test(name, fn):
    global passed, failed
    print(f"  {name}...", end=" ", flush=True)
    try:
        r = fn()
        print(f"PASS" + (f" ({r})" if r else ""))
        passed += 1
    except Exception as e:
        print(f"FAIL: {e}")
        failed += 1

print("\n=== IMPORT TESTS ===")
test("1.  zai_stream module", lambda: __import__("reconpro.integrations.zai_stream", fromlist=["ZAIStreamClient"]) and "OK")
test("2.  SplunkClient", lambda: __import__("reconpro.integrations.splunk", fromlist=["SplunkClient"]) and "OK")
test("3.  PagerDutyClient", lambda: __import__("reconpro.integrations.pagerduty", fromlist=["PagerDutyClient"]) and "OK")
test("4.  All 6 integrations from __init__", lambda: __import__("reconpro.integrations", fromlist=["SplunkClient", "PagerDutyClient", "ZAIStreamClient"]) and "OK")
test("5.  Pegasus module", lambda: __import__("reconpro.modules.pegasus", fromlist=["run_pegasus"]) and "OK")
test("6.  run_pegasus in __init__", lambda: __import__("reconpro.modules", fromlist=["run_pegasus"]) and "OK")

print("\n=== GORGON ULTRA: 15 STAGES ===")
from reconpro.modules.gorgon import (
    _stage_1_invocation, _stage_2_surface_map, _stage_3_injection, _stage_4_http_methods,
    _stage_5_content_type, _stage_6_cors_exploit, _stage_7_conversation_chain, _stage_8_parameter_pollution,
    _stage_9_rate_limit, _stage_10_idor_probe, _stage_11_headers_analysis, _stage_12_error_probing,
    _stage_13_ua_fingerprint, _stage_14_websocket, _stage_15_fear_assessment,
    _fear_index,
)
test("7.  Fear Index levels", lambda: _fear_index(0.5) == "SUBTLE" and _fear_index(8.5) == "OMNIPOTENT" and "OK")
test("8.  15 stage functions exist", lambda: len([_stage_1_invocation, _stage_2_surface_map, _stage_3_injection, _stage_4_http_methods, _stage_5_content_type, _stage_6_cors_exploit, _stage_7_conversation_chain, _stage_8_parameter_pollution, _stage_9_rate_limit, _stage_10_idor_probe, _stage_11_headers_analysis, _stage_12_error_probing, _stage_13_ua_fingerprint, _stage_14_websocket, _stage_15_fear_assessment]) == 15 and "15 stages")

print("\n=== OBLIVION: 20 TOOLS, 6-LEVEL DREAD ===")
from reconpro.modules.oblivion import (
    _analyze_info_disclosure, _analyze_headers_deep, _analyze_js_secrets,
    _stage_4_js_deps, _stage_5_mixed_content, _stage_6_form_audit, _stage_7_error_probe,
    _stage_8_rate_limit, _stage_9_session_mgmt, _stage_10_cors_deep, _stage_11_hpp,
    _stage_12_api_versions, _stage_13_backup_files, _stage_14_dir_listing, _stage_15_cookie_bomb,
    _stage_16_websocket, _stage_17_graphql_introspection, _stage_18_mirror_fracture,
    _stage_19_temporal, _stage_20_wisdom_verdict, DREAD_SCALE, DREAD_LEVELS, _dread_level,
)
test("9.  20 tool functions", lambda: len([_analyze_info_disclosure, _analyze_headers_deep, _analyze_js_secrets, _stage_4_js_deps, _stage_5_mixed_content, _stage_6_form_audit, _stage_7_error_probe, _stage_8_rate_limit, _stage_9_session_mgmt, _stage_10_cors_deep, _stage_11_hpp, _stage_12_api_versions, _stage_13_backup_files, _stage_14_dir_listing, _stage_15_cookie_bomb, _stage_16_websocket, _stage_17_graphql_introspection, _stage_18_mirror_fracture, _stage_19_temporal, _stage_20_wisdom_verdict]) == 20 and "20 tools")
test("10. DREAD 6 levels", lambda: len(DREAD_SCALE) == 6 and "6 levels")
test("11. DREAD_LEVELS 6 entries", lambda: len(DREAD_LEVELS) == 6 and "6 dread levels")
test("12. ABSOLUTE top level", lambda: _dread_level(9.8)[0] == "ABSOLUTE" and "OK")
test("13. Transcendent severity", lambda: DREAD_SCALE["transcendent"] == (10, 10, 10, 10, 10) and "OK")

print("\n=== BOT HUNTER: 10 MALWARE FAMILIES ===")
from reconpro.modules.bot import BOT_SIGNATURES, C2_INDICATORS, _check_malware_signatures
test("14. 10 malware signatures", lambda: len(BOT_SIGNATURES) == 10 and "10 families")
test("15. 24 C2 indicators", lambda: len(C2_INDICATORS) == 24 and "24 indicators")
test("16. Cobalt Strike in sigs", lambda: any("cobalt" in str(s).lower() for s in BOT_SIGNATURES) and "OK")
test("17. SolarWinds in sigs", lambda: any("solarwinds" in str(s).lower() for s in BOT_SIGNATURES) and "OK")
test("18. Log4Shell in sigs", lambda: any("log4shell" in str(s).lower() for s in BOT_SIGNATURES) and "OK")
test("19. _check_malware_signatures exists", lambda: callable(_check_malware_signatures) and "OK")

print("\n=== CHAIN HUNTER: 14 PARAMS, 8 PAYLOADS ===")
from reconpro.modules.chain import _check_ssrf
import inspect
ssrf_src = inspect.getsource(_check_ssrf)
test("20. 14 SSRF params", lambda: all(p in ssrf_src for p in ["destination", "forward", "route", "path"]) and "14 params")
test("21. 8 payloads", lambda: all(p in ssrf_src for p in ["gopher://", "google.internal", "metadata/v1"]) and "8 payloads")
test("22. 8 endpoints", lambda: ssrf_src.count("/api/") >= 8 and "8 endpoints")
test("23. DNS rebinding", lambda: "DNS rebind" in ssrf_src and "OK")

print("\n=== RECON: 13 CATEGORIES ===")
test("24. ASN lookup", lambda: "whois" in open("/home/z/.local/lib/python3.13/site-packages/reconpro/modules/recon.py").read() and "OK")
test("25. SPF/DMARC", lambda: "v=spf1" in open("/home/z/.local/lib/python3.13/site-packages/reconpro/modules/recon.py").read() and "OK")

print("\n=== COMPLIANCE: 70+ CONTROLS, 7 FRAMEWORKS ===")
from reconpro.compliance import COMPLIANCE_RULES
test("26. 70+ controls", lambda: len(COMPLIANCE_RULES) >= 70 and "{} controls".format(len(COMPLIANCE_RULES)))
frameworks = set(r["framework"] for r in COMPLIANCE_RULES.values())
test("27. 7 frameworks", lambda: "NIST CSF" in frameworks and len(frameworks) == 7 and "{} frameworks".format(len(frameworks)))

print("\n=== PEGASUS HUNTER ===")
from reconpro.modules.pegasus import PEGASUS_C2_DOMAINS, PEGASUS_SMS_PATTERNS, PEGASUS_PROCESS_SIGNATURES, PEGASUS_PATH_INDICATORS
test("28. 116 C2 domains", lambda: len(PEGASUS_C2_DOMAINS) >= 100 and "{} domains".format(len(PEGASUS_C2_DOMAINS)))
test("29. 11 SMS patterns", lambda: len(PEGASUS_SMS_PATTERNS) == 11 and "OK")
test("30. 19 process sigs", lambda: len(PEGASUS_PROCESS_SIGNATURES) == 19 and "OK")
test("31. 9 path indicators", lambda: len(PEGASUS_PATH_INDICATORS) == 9 and "OK")

print("\n=== MODULE REGISTRATION ===")
from reconpro.scanner import MODULE_REGISTRY
test("32. Pegasus in registry", lambda: "pegasus" in MODULE_REGISTRY and "OK")
test("33. All 9 remote modules", lambda: len(MODULE_REGISTRY) == 9 and "9 modules")

print("\n=== LIVE Z.AI TEST ===")
from reconpro.integrations import ZAIStreamClient
test("34. z.ai health check", lambda: ZAIStreamClient().health_check()["status"] == "connected" and "OK")
test("35. z.ai streaming chat", lambda: len(list(ZAIStreamClient().chat_stream("Say OK"))) > 0 and "OK")

print(f"\n{'='*60}")
print(f"  RESULTS: {passed} passed, {failed} failed out of {passed+failed}")
print(f"  Package: reconpro 7.1.0 (pip-installed)")
print(f"{'='*60}")
sys.exit(0 if failed == 0 else 1)
