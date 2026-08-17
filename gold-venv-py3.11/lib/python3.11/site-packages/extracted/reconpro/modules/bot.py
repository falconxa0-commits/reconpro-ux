from __future__ import annotations

import re
from typing import Any, Dict, List
from ..http import http_probe, Finding


BOT_SIGNATURES = [
    ("Mirai C2", [r"\x00\x00.*\x00", r"mi\x00rak\x00i"], ["/c2"]),
    ("Cobalt Strike Beacon", [r"cobalt.?strike", r"c2\.config", r"sleep\.mask", r"jitter"], ["/beacon", "/c2", "/api/beacon"]),
    ("Metasploit Handler", [r"metasploit", r"meterpreter", r"reverse_tcp", r"payload/stage"], ["/metasploit", "/msf"]),
    ("Emotet C2", [r"emotet", r"geodo", r"heodo"], None),
    ("TrickBot C2", [r"trickbot", r"trickloader", r"trick_door", r"postback"], None),
    ("QakBot C2", [r"qakbot", r"qbot", r"pink.?botnet", r"chthonic"], None),
    ("SolarWinds SUNBURST", [r"solarwinds", r"sunburst", r"s\.?orion", r"supernova"], None),
    ("Log4Shell Exploitation", [r"jndi:ldap", r"jndi:rmi", r"log4j", r"log4shell", r"\$\{jndi:"], None),
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
                    title="Bot/C2 panel: {}".format(path),
                    severity="critical", category="bot_detection",
                    module="bot",
                    description="Bot/C2 indicators found at {}: {}".format(path, ", ".join(indicators)),
                    evidence="GET {} -> 200, indicators: {}".format(path, ", ".join(indicators)),
                    asset=host, points_deducted=15,
                    remediation="Remove any bot/C2 panels. Scan for compromise.",
                ))

            php_sigs = ["eval(", "base64_decode(", "system(", "exec(",
                       "passthru(", "shell_exec(", "assert(", "preg_replace.*e"]
            for sig in php_sigs:
                if sig in body:
                    findings.append(Finding(
                        title="Potential webshell: {}".format(path),
                        severity="critical", category="webshell",
                        module="bot",
                        description="PHP webshell signature '{}' found at {}".format(sig, path),
                        evidence="GET {} -> 200, signature: {}".format(path, sig),
                        asset=host, points_deducted=15,
                        remediation="Remove the webshell immediately. Audit server access logs.",
                    ))
                    break

    return findings


def _check_malware_signatures(base_url: str, timeout: int = 8,
                               verify_tls: bool = True) -> List[Finding]:
    """Check response against known malware family signatures."""
    findings: List[Finding] = []
    host = base_url.replace("https://", "").replace("http://", "").split("/")[0]

    for name, patterns, paths in BOT_SIGNATURES:
        if patterns is None:
            continue
        targets = [base_url]
        if paths:
            targets = [base_url.rstrip("/") + p for p in paths]
        for target_url in targets:
            try:
                resp = http_probe(target_url, timeout=timeout, verify_tls=verify_tls)
                haystack = (resp.get("body", "")[:8192] + " " + " ".join(resp.get("headers", {}).values())).lower()
                for pat in patterns:
                    try:
                        if re.search(pat, haystack, re.IGNORECASE):
                            findings.append(Finding(
                                title="{} signature detected".format(name),
                                severity="critical", category="malware_signature",
                                module="bot",
                                description="Known malware signature for {} found at {}".format(name, target_url[:80]),
                                evidence="Pattern: {}".format(pat[:60]),
                                asset=host, points_deducted=15,
                                remediation="Isolate the host. Investigate for compromise. Block C2 domains at firewall.",
                            ))
                            break
                    except re.error:
                        if pat.lower() in haystack:
                            findings.append(Finding(
                                title="{} signature detected".format(name),
                                severity="critical", category="malware_signature",
                                module="bot",
                                description="Known malware signature for {} found".format(name),
                                evidence="String match: {}".format(pat[:60]),
                                asset=host, points_deducted=15,
                                remediation="Isolate the host. Investigate for compromise.",
                            ))
                            break
            except Exception:
                pass
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
                title="Honeypot detected: {}".format(name),
                severity="info", category="honeypot",
                module="bot",
                description="Honeypot signature '{}' detected — target may be a decoy".format(name),
                evidence="Signature match in response", asset=host, points_deducted=0,
                remediation="This finding is informational. Honeypot detection means the target may not be genuine.",
            ))
            break

    return findings


def run_bot(target: str, base_url: str, timeout: int = 8,
             verify_tls: bool = True) -> List[Finding]:
    """C2 / bot infrastructure detection with 10 malware family signatures. Returns list of Findings."""
    findings: List[Finding] = []
    findings.extend(_check_common_c2_paths(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_check_malware_signatures(base_url, timeout=timeout, verify_tls=verify_tls))
    findings.extend(_check_honeypot_signs(base_url, timeout=timeout, verify_tls=verify_tls))
    return findings
