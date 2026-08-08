from __future__ import annotations

import re
import time
import json
from typing import Any, Dict, List, Optional
from ..http import http_probe, Finding


DREAD_SCALE = {
    "critical":     (10, 8, 9, 9, 8),
    "high":         (8, 7, 7, 7, 7),
    "medium":       (5, 5, 5, 5, 5),
    "low":          (3, 3, 3, 3, 4),
    "info":         (1, 1, 1, 1, 2),
    "transcendent": (10, 10, 10, 10, 10),
}

DREAD_LEVELS = [
    ("SUBTLE",      0,   2.0,   "Barely perceptible"),
    ("NOTABLE",     2.0, 4.0,   "Something is watching"),
    ("SUBSTANTIAL",  4.0, 6.0,   "The foundation cracks"),
    ("DEVASTATING",  6.0, 8.0,   "Total system compromise"),
    ("OMNIPOTENT",  8.0, 9.5,   "The target IS the vulnerability"),
    ("ABSOLUTE",    9.5, 10.1,  "Resistance is recursive"),
]

FEAR_INDEX = DREAD_LEVELS


def _dread_score(severity: str) -> float:
    d, r, e, a, disc = DREAD_SCALE.get(severity, (0, 0, 0, 0, 0))
    return round((d + r + e + a + disc) / 5, 1)


def _dread_level(score: float) -> tuple:
    for name, lo, hi, desc in DREAD_LEVELS:
        if lo <= score < hi:
            return (name, desc)
    return ("ABSOLUTE", "Resistance is recursive")


def _oblivion_ai(prompt: str, timeout: int = 30) -> str:
    try:
        from ..integrations.zai_stream import ZAIStreamClient
        return ZAIStreamClient(timeout=timeout).chat(
            prompt, system_prompt="You are OBLIVION, the last oracle. Be concise and technical.")
    except Exception:
        return "[OBLIVION analysis unavailable — stdlib fallback used]"


def _h(base_url: str) -> str:
    return base_url.replace("https://", "").replace("http://", "").split("/")[0]


# ── Stage 1-3: Original OBLIVION stages ─────────────────────────────────

def _analyze_info_disclosure(base_url: str, timeout: int = 8,
                              verify_tls: bool = True) -> List[Finding]:
    findings: List[Finding] = []
    host = _h(base_url)
    info_paths = [
        "/.git/HEAD", "/.git/config", "/.git/logs/HEAD",
        "/.svn/entries", "/.hg/store", "/.DS_Store", "/Thumbs.db",
        "/server-status", "/server-info", "/.well-known/security.txt",
        "/.env", "/.env.local", "/.env.production",
        "/wp-config.php.bak", "/config.php~",
        "/backup.sql", "/db.sql", "/dump.sql",
        "/.htaccess", "/.htpasswd", "/WEB-INF/web.xml",
        "/META-INF/MANIFEST.MF", "/debug", "/phpinfo.php", "/info.php",
        "/actuator", "/actuator/env", "/actuator/health",
        "/swagger.json", "/swagger-ui.html", "/graphql", "/graphiql",
    ]
    for path in info_paths:
        try:
            resp = http_probe(base_url.rstrip("/") + path, timeout=timeout, verify_tls=verify_tls)
            if resp.get("status") == 200 and len(resp.get("body", "")) > 10:
                body_lower = resp.get("body", "").lower()
                if any(s in body_lower for s in ["password", "secret", "api_key", "token", "private"]):
                    sev, pts = "critical", 15
                elif any(s in body_lower for s in ["stack trace", "exception", "error", "debug"]):
                    sev, pts = "high", 10
                elif path in ("/.git/HEAD", "/.svn/entries", "/.hg/store"):
                    sev, pts = "high", 10
                elif "swagger" in path or "graphql" in path:
                    sev, pts = "low", 3
                else:
                    sev, pts = "medium", 5
                findings.append(Finding(
                    title="Info disclosure: {}".format(path), severity=sev, category="info_disclosure",
                    module="oblivion", description="Sensitive info at {}".format(path),
                    evidence="GET {} -> 200 ({} bytes)".format(path, len(resp.get("body", ""))),
                    asset=host, points_deducted=pts, dread_score=_dread_score(sev),
                ))
        except Exception:
            pass
    return findings


def _analyze_headers_deep(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings: List[Finding] = []
    host = _h(base_url)
    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    headers = resp.get("headers", {})
    h_lower = {k.lower(): v for k, v in headers.items()}
    checks = [
        ("strict-transport-security", "HSTS", "high"),
        ("content-security-policy", "CSP", "high"),
        ("x-content-type-options", "X-Content-Type-Options", "medium"),
        ("x-frame-options", "X-Frame-Options", "medium"),
        ("referrer-policy", "Referrer-Policy", "low"),
        ("permissions-policy", "Permissions-Policy", "low"),
        ("cross-origin-opener-policy", "COOP", "medium"),
        ("cross-origin-resource-policy", "CORP", "medium"),
        ("cross-origin-embedder-policy", "COEP", "medium"),
    ]
    for hdr, display, sev in checks:
        if hdr not in h_lower:
            findings.append(Finding(
                title="Missing {}".format(display), severity=sev, category="security_headers",
                module="oblivion", description="{} header missing".format(display),
                evidence="{} not found".format(hdr), asset=host, points_deducted=5,
                dread_score=_dread_score(sev),
            ))
    for hdr, title in [("server", "Server version disclosure"), ("x-powered-by", "Tech disclosure")]:
        if hdr in h_lower:
            findings.append(Finding(
                title=title, severity="low", category="info_disclosure", module="oblivion",
                description="{}: {}".format(hdr, h_lower[hdr]),
                evidence="{}: {}".format(hdr, h_lower[hdr]), asset=host, points_deducted=2,
                dread_score=_dread_score("low"),
            ))
    return findings


def _analyze_js_secrets(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings: List[Finding] = []
    host = _h(base_url)
    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    body = resp.get("body", "")[:65536]
    js_urls = re.findall(r'src=["\']([^"\']*\.js[^"\']*)["\']', body)
    inline = re.findall(r'<script[^>]*>(.*?)</script>', body, re.DOTALL)
    all_js = " ".join(inline)
    for js_url in js_urls[:10]:
        try:
            js_resp = http_probe(js_url if js_url.startswith("http") else base_url.rstrip("/") + js_url,
                                timeout=timeout, verify_tls=verify_tls)
            if js_resp.get("status") == 200:
                all_js += " " + js_resp.get("body", "")[:32768]
        except Exception:
            pass
    patterns = [
        (r'api[_-]?key["\':\s]*=["\']([\w-]{20,})', "Hardcoded API key"),
        (r'secret["\':\s]*=["\']([\w-]{20,})', "Hardcoded secret"),
        (r'password["\':\s]*=["\']([^"\']{8,})', "Hardcoded password"),
    ]
    for pat, title in patterns:
        matches = re.findall(pat, all_js, re.IGNORECASE)
        if matches:
            masked = matches[0][:8] + "..." + matches[0][-4:] if len(matches[0]) > 12 else "***"
            findings.append(Finding(
                title=title, severity="critical", category="secrets_in_js", module="oblivion",
                description="Secret in JS: {}".format(title), evidence="Match: {}".format(masked),
                asset=host, points_deducted=15, dread_score=_dread_score("critical"),
            ))
            break
    return findings


# ── Stages 4-20: New OBLIVION stages ─────────────────────────────────

def _stage_4_js_deps(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    body = resp.get("body", "")[:65536]
    js_urls = re.findall(r'src=["\']([^"\']*\.js[^"\']*)["\']', body)
    old_libs = [
        (r'jquery/1\.', "jQuery 1.x", "medium"), (r'jquery/2\.', "jQuery 2.x", "medium"),
        (r'angular\.js/1\.', "AngularJS 1.x", "high"), (r'react/0\.', "React 0.x", "high"),
        (r'lodash/3\.', "Lodash 3.x", "medium"), (r'bootstrap/3\.', "Bootstrap 3.x", "low"),
    ]
    all_js = ""
    for js_url in js_urls[:8]:
        try:
            js_resp = http_probe(js_url if js_url.startswith("http") else base_url.rstrip("/") + js_url,
                                timeout=timeout, verify_tls=verify_tls)
            if js_resp.get("status") == 200:
                all_js += " " + js_resp.get("body", "")[:16384]
        except Exception:
            pass
    for pat, name, sev in old_libs:
        if re.search(pat, all_js, re.IGNORECASE):
            findings.append(Finding(
                title="Vulnerable dependency: {}".format(name), severity=sev,
                category="vulnerable_deps", module="oblivion",
                description="Outdated library {} detected in page JS".format(name),
                evidence="Pattern: {}".format(pat), asset=host, points_deducted=5,
                dread_score=_dread_score(sev),
            ))
    return findings


def _stage_5_mixed_content(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    if not base_url.startswith("https"):
        return findings
    host = _h(base_url)
    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    body = resp.get("body", "")[:65536]
    http_urls = re.findall(r'(?:src|href)=["\'](http://[^"\']+)"', body)
    for url in http_urls[:5]:
        findings.append(Finding(
            title="Mixed content: {}".format(url[:60]), severity="medium",
            category="mixed_content", module="oblivion",
            description="HTTP resource loaded on HTTPS page", evidence="URL: {}".format(url[:80]),
            asset=host, points_deducted=4, dread_score=_dread_score("medium"),
        ))
    return findings


def _stage_6_form_audit(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    body = resp.get("body", "")[:65536]
    forms = re.findall(r'<form[^>]*>(.*?)</form>', body, re.DOTALL | re.IGNORECASE)
    for i, form in enumerate(forms[:10]):
        action = re.search(r'action=["\']([^"\']*)', form, re.IGNORECASE)
        method = re.search(r'method=["\']([^"\']*)', form, re.IGNORECASE)
        has_csrf = bool(re.search(r'csrf|_token|authenticity', form, re.IGNORECASE))
        if action and action.group(1).startswith("http://"):
            findings.append(Finding(
                title="Form {} action over HTTP".format(i+1), severity="medium",
                category="form_security", module="oblivion",
                description="Form submits to HTTP URL", evidence="Action: {}".format(action.group(1)[:80]),
                asset=host, points_deducted=6, dread_score=_dread_score("medium"),
            ))
        if not has_csrf and (method and method.group(1).lower() == "post"):
            findings.append(Finding(
                title="Form {} missing CSRF token".format(i+1), severity="high",
                category="csrf", module="oblivion",
                description="POST form without CSRF protection", evidence="Form {} has no CSRF token".format(i+1),
                asset=host, points_deducted=10, dread_score=_dread_score("high"),
            ))
        sensitive = re.search(r'(password|credit|card|ssn)', form, re.IGNORECASE)
        get_method = method and method.group(1).lower() == "get"
        if sensitive and get_method:
            findings.append(Finding(
                title="Sensitive form {} uses GET".format(i+1), severity="high",
                category="sensitive_get", module="oblivion",
                description="Form with sensitive field uses GET method", evidence="Field: {}".format(sensitive.group(1)),
                asset=host, points_deducted=8, dread_score=_dread_score("high"),
            ))
    return findings


def _stage_7_error_probe(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    for payload in ['?filter=INVALID{{{{', '{"bad": "json"}]"}', '<invalid>xml']:
        try:
            resp = http_probe(base_url.rstrip("/") + "/api/v1/users" + payload,
                             method="POST" if "{" in payload else "GET",
                             body=payload.encode() if "{" in payload else None,
                             headers={"Content-Type": "application/json"} if "{" in payload else {},
                             timeout=timeout, verify_tls=verify_tls)
            body = resp.get("body", "")[:4096].lower()
            sigs = ["stack trace", "exception", "traceback", "syntaxerror", "at line"]
            found = [s for s in sigs if s in body]
            if found:
                findings.append(Finding(
                    title="Error disclosure via probe", severity="medium", category="error_disclosure",
                    module="oblivion", description="Error details leak: {}".format(", ".join(found[:3])),
                    evidence="Signatures: {}".format(", ".join(found[:3])),
                    asset=host, points_deducted=6, dread_score=_dread_score("medium"),
                ))
                break
        except Exception:
            pass
    return findings


def _stage_8_rate_limit(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    got_429 = False
    for i in range(20):
        try:
            resp = http_probe(base_url.rstrip("/") + "/api/v1/users?r={}".format(i), timeout=timeout, verify_tls=verify_tls)
            if resp.get("status") == 429 or "retry-after" in {k.lower() for k in resp.get("headers", {})}:
                got_429 = True
                break
        except Exception:
            pass
    if not got_429:
        findings.append(Finding(
            title="No rate limiting detected", severity="medium", category="rate_limiting",
            module="oblivion", description="20 rapid requests, no 429",
            evidence="No rate limiting", asset=host, points_deducted=5, dread_score=_dread_score("medium"),
        ))
    return findings


def _stage_9_session_mgmt(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    set_cookie = resp.get("headers", {}).get("set-cookie", "")
    for cookie in set_cookie.split(","):
        name = cookie.split("=")[0].strip()
        cl = cookie.lower()
        if name and "httponly" not in cl:
            findings.append(Finding(
                title="Missing HttpOnly: {}".format(name[:40]), severity="medium", category="session",
                module="oblivion", description="Cookie lacks HttpOnly", evidence="Cookie: {}".format(name),
                asset=host, points_deducted=5, dread_score=_dread_score("medium"),
            ))
        if name and "secure" not in cl:
            findings.append(Finding(
                title="Missing Secure: {}".format(name[:40]), severity="medium", category="session",
                module="oblivion", description="Cookie lacks Secure flag", evidence="Cookie: {}".format(name),
                asset=host, points_deducted=5, dread_score=_dread_score("medium"),
            ))
    body = resp.get("body", "")[:8192]
    if re.search(r'[?&](jsessionid|phpsessid|asp.net_sessionid|sid)=', body, re.IGNORECASE):
        findings.append(Finding(
            title="Session ID in URL", severity="high", category="session",
            module="oblivion", description="Session ID exposed in URL — session fixation risk",
            evidence="Session parameter in URL", asset=host, points_deducted=10, dread_score=_dread_score("high"),
        ))
    return findings


def _stage_10_cors_deep(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    origins = ["null", "https://evil.com", "https://{}.evil.com".format(host.split(".")[-1])]
    for origin in origins:
        try:
            resp = http_probe(base_url, headers={"Origin": origin}, timeout=timeout, verify_tls=verify_tls)
            h = resp.get("headers", {})
            acao = h.get("Access-Control-Allow-Origin", "")
            creds = h.get("Access-Control-Allow-Credentials", "")
            if acao == origin and "true" in creds.lower():
                findings.append(Finding(
                    title="CORS credential theft: {}".format(origin), severity="critical",
                    category="cors", module="oblivion",
                    description="CORS allows credentials from attacker origin",
                    evidence="ACAO: {}, Credentials: true".format(acao),
                    asset=host, points_deducted=15, dread_score=_dread_score("critical"),
                ))
                break
        except Exception:
            pass
    return findings


def _stage_11_hpp(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    for ep in ["/api/v1/users", "/api/search"]:
        try:
            r1 = http_probe(base_url.rstrip("/") + ep + "?id=1", timeout=timeout, verify_tls=verify_tls)
            r2 = http_probe(base_url.rstrip("/") + ep + "?id=1&id=2", timeout=timeout, verify_tls=verify_tls)
            if abs(len(r1.get("body", "")) - len(r2.get("body", ""))) > 20:
                findings.append(Finding(
                    title="HPP: {}".format(ep), severity="medium", category="hpp", module="oblivion",
                    description="HTTP parameter pollution — response changes with duplicate params",
                    evidence="id=1: {}b, id=1&id=2: {}b".format(len(r1.get("body", "")), len(r2.get("body", ""))),
                    asset=host, points_deducted=6, dread_score=_dread_score("medium"),
                ))
        except Exception:
            pass
    return findings


def _stage_12_api_versions(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    for v in ["v1", "v2", "v3", "v4", "latest", "internal"]:
        try:
            resp = http_probe(base_url.rstrip("/") + "/api/{}/users".format(v), timeout=timeout, verify_tls=verify_tls)
            if resp.get("status") == 200:
                findings.append(Finding(
                    title="Unauth API: /api/{}/".format(v), severity="medium", category="api_exposure",
                    module="oblivion", description="API version accessible without auth",
                    evidence="GET /api/{}/users -> 200".format(v),
                    asset=host, points_deducted=4, dread_score=_dread_score("medium"),
                ))
        except Exception:
            pass
    return findings


def _stage_13_backup_files(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    paths = ["/config.php.bak", "/config.php.old", "/database.sql", "/site.zip", "/backup/", "/db.dump",
             "/wp-config.php~", "/config.yaml.save", "/.env.backup", "/backup.sql.gz"]
    for path in paths:
        try:
            resp = http_probe(base_url.rstrip("/") + path, timeout=timeout, verify_tls=verify_tls)
            if resp.get("status") == 200 and len(resp.get("body", "")) > 10:
                findings.append(Finding(
                    title="Backup exposed: {}".format(path), severity="high", category="backup_exposure",
                    module="oblivion", description="Backup file accessible",
                    evidence="GET {} -> 200 ({}b)".format(path, len(resp.get("body", ""))),
                    asset=host, points_deducted=12, dread_score=_dread_score("high"),
                ))
        except Exception:
            pass
    return findings


def _stage_14_dir_listing(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    for d in ["/uploads/", "/files/", "/images/", "/assets/", "/backup/", "/logs/", "/tmp/", "/static/"]:
        try:
            resp = http_probe(base_url.rstrip("/") + d, timeout=timeout, verify_tls=verify_tls)
            body = resp.get("body", "").lower()
            if resp.get("status") == 200 and any(s in body for s in ["index of", "parent directory", "<table", "<title>index"]):
                findings.append(Finding(
                    title="Directory listing: {}".format(d), severity="medium", category="directory_listing",
                    module="oblivion", description="Directory listing enabled",
                    evidence="GET {} -> 200".format(d),
                    asset=host, points_deducted=5, dread_score=_dread_score("medium"),
                ))
        except Exception:
            pass
    return findings


def _stage_15_cookie_bomb(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    set_cookie = resp.get("headers", {}).get("set-cookie", "")
    for cookie in set_cookie.split(","):
        if len(cookie.strip()) > 4096:
            findings.append(Finding(
                title="Oversized cookie ({}b)".format(len(cookie.strip())), severity="low",
                category="cookie_bomb", module="oblivion",
                description="Cookie exceeds 4096 bytes", evidence="Cookie size: {}".format(len(cookie.strip())),
                asset=host, points_deducted=3, dread_score=_dread_score("low"),
            ))
    return findings


def _stage_16_websocket(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    for ws in ["/ws", "/websocket", "/socket.io/", "/api/ws"]:
        try:
            resp = http_probe(base_url.rstrip("/") + ws,
                             headers={"Upgrade": "websocket", "Connection": "Upgrade"},
                             timeout=timeout, verify_tls=verify_tls)
            if resp.get("status") in (101, 200, 426):
                findings.append(Finding(
                    title="WebSocket: {}".format(ws), severity="medium", category="websocket",
                    module="oblivion", description="WebSocket endpoint accessible",
                    evidence="{} -> {}".format(ws, resp.get("status")),
                    asset=host, points_deducted=5, dread_score=_dread_score("medium"),
                ))
        except Exception:
            pass
    return findings


def _stage_17_graphql_introspection(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    gql_query = json.dumps({"query": "{ __schema { types { name } } }"})
    for ep in ["/graphql", "/api/graphql"]:
        try:
            resp = http_probe(base_url.rstrip("/") + ep, method="POST", body=gql_query.encode(),
                             headers={"Content-Type": "application/json"}, timeout=timeout, verify_tls=verify_tls)
            body = resp.get("body", "")
            if resp.get("status") == 200 and "__schema" in body and "types" in body:
                findings.append(Finding(
                    title="GraphQL introspection: {}".format(ep), severity="high",
                    category="graphql_introspection", module="oblivion",
                    description="Full schema exposed via introspection",
                    evidence="__schema and types in response", asset=host, points_deducted=10,
                    dread_score=_dread_score("high"),
                ))
                break
        except Exception:
            pass
    return findings


def _stage_18_mirror_fracture(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    uas = ["Chrome/120", "curl/7.88", "python-requests/2.31", "Googlebot/2.1"]
    lengths = []
    for ua in uas:
        try:
            resp = http_probe(base_url, headers={"User-Agent": ua}, timeout=timeout, verify_tls=verify_tls)
            lengths.append(len(resp.get("body", "")))
        except Exception:
            lengths.append(0)
    if max(lengths) > 0 and (max(lengths) - min(lengths)) / max(max(lengths), 1) > 0.2:
        ai = _oblivion_ai("What security risk does differential response behavior indicate? One sentence.", timeout=30)
        findings.append(Finding(
            title="Mirror Fracture: differential responses", severity="info",
            category="differential_response", module="oblivion",
            description="Server treats different User-Agents differently. {}".format(ai[:200]),
            evidence="Lengths: {}".format(lengths), asset=host, points_deducted=2,
            dread_score=_dread_score("info"),
        ))
    return findings


def _stage_19_temporal(base_url: str, timeout: int = 8, verify_tls: bool = True) -> List[Finding]:
    findings = []
    host = _h(base_url)
    bodies = []
    for _ in range(3):
        try:
            resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
            bodies.append(resp.get("body", ""))
            time.sleep(2)
        except Exception:
            bodies.append("")
    if bodies and len(set(len(b) for b in bodies)) > 1:
        findings.append(Finding(
            title="Temporal inconsistency", severity="info", category="temporal_inconsistency",
            module="oblivion", description="Response body changes between requests — application state is dynamic",
            evidence="Lengths: {}".format([len(b) for b in bodies]),
            asset=host, points_deducted=2, dread_score=_dread_score("info"),
        ))
    return findings


def _stage_20_wisdom_verdict(base_url: str, all_findings: List[Finding], target: str,
                            timeout: int = 30) -> List[Finding]:
    host = _h(base_url)
    titles = [f.title for f in all_findings if f.severity in ("critical", "high")]
    scores = [_dread_score(f.severity) for f in all_findings]
    avg = round(sum(scores) / len(scores), 1) if scores else 0
    level, desc = _dread_level(avg)
    prompt = "Wisdom Verdict for {} ({} findings, avg DREAD {}/10, level: {}): {}. One paragraph verdict.".format(
        host, len(all_findings), avg, level, "; ".join(titles[:8]))
    ai = _oblivion_ai(prompt, timeout=timeout)
    sev = "transcendent" if avg >= 9.5 else "critical" if avg >= 7 else "high" if avg >= 5 else "medium"
    return [Finding(
        title="OBLIVION Wisdom Verdict: {} ({}/10)".format(level, avg),
        severity=sev, category="wisdom_verdict", module="oblivion",
        description="{} — {}".format(desc, ai[:300]),
        evidence="DREAD avg: {}/10, Level: {}, Findings: {}".format(avg, level, len(all_findings)),
        asset=host, points_deducted=int(avg),
        dread_score=avg,
    )]


def run_oblivion(target: str, base_url: str, timeout: int = 8,
                 verify_tls: bool = True) -> List[Finding]:
    """23-stage analytical dissolution with DREAD scoring. Returns list of Findings."""
    findings: List[Finding] = []
    findings.extend(_analyze_info_disclosure(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_analyze_headers_deep(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_analyze_js_secrets(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_4_js_deps(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_5_mixed_content(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_6_form_audit(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_7_error_probe(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_8_rate_limit(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_9_session_mgmt(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_10_cors_deep(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_11_hpp(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_12_api_versions(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_13_backup_files(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_14_dir_listing(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_15_cookie_bomb(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_16_websocket(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_17_graphql_introspection(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_18_mirror_fracture(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_19_temporal(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_stage_20_wisdom_verdict(base_url, findings, target, timeout=timeout))
    return findings
