from __future__ import annotations

import re
from typing import Any, Dict, List
from ..http import http_probe, Finding


BOT_SIGNATURES = [
    ("Mirai C2", [r"\x00\x00.*\x00", r"mi\x00rak\x00i"], None),
    ("Cobalt Strike Beacon", ["beacon", "cobalt strike", r"c2\.config", "sleep\.mask", "jitter"], ["/beacon", "/c2", "/api/beacon"]),
    ("Metasploit Handler", ["metasploit", "msf", "meterpreter", "reverse_tcp", "payload/stage"], ["/metasploit", "/msf"]),
    ("Emotet C2", ["emotet", "geodo", "heodo", "trickbot", "qakbot"], None),
    ("TrickBot C2", ["trickbot", "trickloader", "trick_door", "postback"], None),
    ("QakBot C2", ["qakbot", "qbot", "pink botnet", "chthonic"], None),
    ("SolarWinds SUNBURST", ["solarwinds", "sunburst", "orion", "supernova", "solarwinds.orion"], None),
    ("Log4Shell Exploitation", ["jndi:ldap", "jndi:rmi", "log4j", "log4shell", r"\${jndi:"], None),
    ("Generic Bot Panel", ["botnet", "bot panel", "c2 panel", "command & control"], ["/c2"]),
    ("DGA Domain", None, None),
]

C2_INDICATORS = [
    "botnet", "c2 server", "command and control", "zombie",
    "bot panel", "ddos panel", "stresser", "booter",
    "cobalt strike", "beacon", "meterpreter", "metasploit",
    "emotet", "trickbot", "qakbot", "solarwinds",
    "jndi:ldap", "jndi:rmi", "log4shell", "log4j",
    "reverse_shell", "backdoor", "webshell",
    "malware", "trojan", "rat.exe", "implant",
]


def _check_bot_indicators(body: str, headers: Dict[str, str]) -> List[str]:
    """Check if a response looks like a bot/C2 panel."""
    found = []
    haystack = (body + " " + " ".join(headers.values())).lower()
    for indicator in C2_INDICATORS:
        if indicator in haystack:
            found.append(indicator)
    return found


def _check_common_c2_paths(base_url: str, timeout: int = 8,
                             verify_tls: bool = True) -> List[Finding]:
    """Probe common C2/bot panel paths."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    c2_paths = [
        "/c2", "/bot", "/panel", "/admin.php", "/gate.php",
        "/config.php", "/task.php", "/report.php",
        "/api/bot", "/api/c2", "/api/task",
        "/wp-content/plugins/", "/shell.php", "/backdoor.php",
        "/.hidden/", "/_hidden/", "/temp/", "/cache/",
    ]

    for path in c2_paths:
        url = base_url.rstrip("/") + path
        resp = http_probe(url, timeout=timeout, verify_tls=verify_tls)
        status = resp.get("status", 0)
        body = resp.get("body", "")[:4096]
        headers = resp.get("headers", {})

        if status == 200 and len(body) > 10:
            indicators = _check_bot_indicators(body, headers)
            if indicators:
                findings.append(Finding(
                    title=f"Bot/C2 panel: {path}",
                    severity="critical", category="bot_detection",
                    module="bot",
                    description=f"Bot/C2 indicators found at {path}: {', '.join(indicators)}",
                    evidence=f"GET {path} -> 200, indicators: {', '.join(indicators)}",
                    asset=host, points_deducted=15,
                    remediation="Remove any bot/C2 panels. Scan for compromise.",
                ))

            # Check for PHP webshell signatures
            php_sigs = ["eval(", "base64_decode(", "system(", "exec(",
                       "passthru(", "shell_exec(", "assert(", "preg_replace.*e"]
            for sig in php_sigs:
                if sig in body:
                    findings.append(Finding(
                        title=f"Potential webshell: {path}",
                        severity="critical", category="webshell",
                        module="bot",
                        description=f"PHP webshell signature '{sig}' found at {path}",
                        evidence=f"GET {path} -> 200, signature: {sig}",
                        asset=host, points_deducted=15,
                        remediation="Remove the webshell immediately. Audit server access logs.",
                    ))
                    break

    return findings


def _check_honeypot_signs(base_url: str, timeout: int = 8,
                          verify_tls: bool = True) -> List[Finding]:
    """Detect if the target might be a honeypot."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    resp = http_probe(base_url, timeout=timeout, verify_tls=verify_tls)
    body = resp.get("body", "")[:8192]
    headers = resp.get("headers", {})

    honeypot_sigs = [
        ("Cowrie", ["cowrie", "telnet", "ssh honeypot"]),
        ("Dionaea", ["dionaea"]),
        ("T-Pot", ["t-pot", "hpotter"]),
        ("HFish", ["hfish"]),
        ("General honeypot", ["honeypot", "honeynet"]),
    ]

    haystack = (body + " " + " ".join(headers.values())).lower()
    for name, sigs in honeypot_sigs:
        if any(s in haystack for s in sigs):
            findings.append(Finding(
                title=f"Honeypot detected: {name}",
                severity="info", category="honeypot",
                module="bot",
                description=f"Honeypot signature '{name}' detected — target may be a decoy",
                evidence=f"Signature match in response", asset=host, points_deducted=0,
                remediation="This finding is informational. Honeypot detection means the target may not be genuine.",
            ))
            break

    return findings


def _check_malware_signatures(base_url: str, timeout: int = 8,
                                verify_tls: bool = True) -> List[Finding]:
    """Probe main page and signature-specific paths for malware family indicators."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    for name, patterns, paths in BOT_SIGNATURES:
        if patterns is None:
            continue

        urls_to_check = [base_url]
        if paths:
            for p in paths:
                urls_to_check.append(base_url.rstrip("/") + p)

        for check_url in urls_to_check:
            try:
                resp = http_probe(check_url, timeout=timeout, verify_tls=verify_tls)
                body = resp.get("body", "")[:8192]
                headers = resp.get("headers", {})
                haystack = (body + " " + " ".join(headers.values())).lower()

                for pattern in patterns:
                    try:
                        if re.search(pattern, haystack, re.IGNORECASE):
                            findings.append(Finding(
                                title=f"Malware signature: {name}",
                                severity="critical", category="bot_detection",
                                module="bot",
                                description=f"Malware family '{name}' signature matched at {check_url}",
                                evidence=f"Pattern '{pattern}' matched in response from {check_url}",
                                asset=host, points_deducted=15,
                                remediation="Isolate and investigate the host. Remove any malicious payloads.",
                            ))
                            break
                    except re.error:
                        if pattern.lower() in haystack:
                            findings.append(Finding(
                                title=f"Malware signature: {name}",
                                severity="critical", category="bot_detection",
                                module="bot",
                                description="Malware family '{}' signature matched at {}".format(name, check_url),
                                evidence="Pattern '{}' matched in response from {}".format(pattern, check_url),
                                asset=host, points_deducted=15,
                                remediation="Isolate and investigate the host. Remove any malicious payloads.",
                            ))
                            break
                else:
                    continue
                break
            except Exception:
                pass

    return findings


def run_bot(target: str, base_url: str, timeout: int = 8,
             verify_tls: bool = True) -> List[Finding]:
    """C2 / bot infrastructure detection. Returns list of Findings."""
    findings: List[Finding] = []
    host = target.replace("https://", "").replace("http://", "").split("/")[0]

    findings.extend(_check_common_c2_paths(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_check_honeypot_signs(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_check_malware_signatures(base_url, timeout=timeout, verify_tls=verify_tls))

    return findings
