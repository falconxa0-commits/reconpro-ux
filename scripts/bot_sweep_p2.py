#!/usr/bin/env python3
"""
Bot Sweep PART 2 — Scan targets 26-50
"""
import subprocess, json, socket, re, urllib.request, ssl, select, random
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

def run(cmd, timeout=4):
    try: return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout).stdout.strip()
    except: return ""

def fetch_url(url, timeout=8):
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    try:
        resp = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "ReconPro/3.0"}), timeout=timeout, context=ctx)
        return resp.read().decode('utf-8', errors='replace')
    except: return ""

def tcp_connect(ip, port, timeout=2):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(timeout); s.connect((ip, port))
        banner = ""
        try:
            s.send(b"\r\n")
            if select.select([s], [], [], 2)[0]: banner = re.sub(r'[\x00-\x08\x0e-\x1f\x7f]', '.', s.recv(2048).decode('utf-8', errors='replace')).strip()[:500]
        except: pass
        s.close()
        return True, banner
    except: return False, ""

def cidr_to_ips(cidr, n=4):
    try:
        p = cidr.split('/'); o = p[0].split('.'); pre = int(p[1]) if len(p)>1 else 32
        if pre >= 24:
            b = int(o[0])*256**3+int(o[1])*256**2+int(o[2])*256
            return [f"{(b+i)>>24&255}.{(b+i)>>16&255}.{(b+i)>>8&255}.{(b+i)&255}" for i in range(n)]
    except: pass
    return []

SIGS = [
    {"p": r"mirai", "f": "Mirai", "s": "CRITICAL", "d": "IoT botnet 600K+"},
    {"p": r"Enter\s*password|Password:", "f": "IoT Login", "s": "HIGH", "d": "Exposed IoT login"},
    {"p": r"login:", "f": "Login", "s": "MEDIUM", "d": "Login prompt"},
    {"p": r"root@|admin@", "f": "Shell", "s": "HIGH", "d": "Root/admin shell"},
    {"p": r"PING\s*:", "f": "IRC C2", "s": "HIGH", "d": "Botnet heartbeat"},
    {"p": r":notice\s+auth|NOTICE.*AUTH", "f": "IRC Auth", "s": "HIGH", "d": "IRC bot auth"},
    {"p": r"NICK\s+\S+", "f": "IRC Bot", "s": "MEDIUM", "d": "IRC registration"},
    {"p": r"JOIN\s+#", "f": "IRC Channel", "s": "CRITICAL", "d": "C2 channel"},
    {"p": r"cobalt\s*strike", "f": "Cobalt Strike", "s": "CRITICAL", "d": "APT C2"},
    {"p": r"metasploit", "f": "Metasploit", "s": "CRITICAL", "d": "Exploit framework"},
    {"p": r"emotet", "f": "Emotet", "s": "CRITICAL", "d": "Banking trojan"},
    {"p": r"trickbot", "f": "TrickBot", "s": "CRITICAL", "d": "Banking trojan"},
    {"p": r"qakbot|qbot", "f": "QakBot", "s": "CRITICAL", "d": "Polymorphic bot"},
    {"p": r"zeus|zbot", "f": "Zeus", "s": "CRITICAL", "d": "Banking botnet"},
    {"p": r"redis", "f": "Redis", "s": "HIGH", "d": "Unauth Redis RCE"},
    {"p": r"mongodb|MongoDB", "f": "MongoDB", "s": "CRITICAL", "d": "Unauth MongoDB"},
    {"p": r"mysql|mariadb|Host.*not allowed", "f": "MySQL", "s": "HIGH", "d": "Exposed MySQL"},
    {"p": r"SSH-2\.0", "f": "SSH", "s": "LOW", "d": "SSH running"},
    {"p": r"SSH-1\.99|SSH-1\.5", "f": "SSHv1", "s": "CRITICAL", "d": "Vulnerable SSH v1"},
    {"p": r"vsftpd|proftpd|pure-ftpd", "f": "FTP", "s": "LOW", "d": "FTP server"},
    {"p": r"220.*ftp|220.*FileZilla", "f": "FTP2", "s": "LOW", "d": "FTP banner"},
    {"p": r"HTTP/1\.[01]", "f": "HTTP", "s": "LOW", "d": "Web server"},
    {"p": r"220.*smtp|ESMTP|postfix|exim", "f": "SMTP", "s": "LOW", "d": "Mail server"},
    {"p": r"BusyBox", "f": "IoT", "s": "MEDIUM", "d": "IoT BusyBox"},
    {"p": r"c99mad|c100|r57|WSO|b374k", "f": "WebShell", "s": "CRITICAL", "d": "Known webshell"},
    {"p": r"Apache|nginx", "f": "WebSrv", "s": "LOW", "d": "Web server ID"},
]

PORTS = [
    (21,"FTP"),(22,"SSH"),(23,"Telnet"),(25,"SMTP"),(80,"HTTP"),
    (110,"POP3"),(443,"HTTPS"),(445,"SMB"),(2323,"Telnet2"),(3306,"MySQL"),
    (4444,"C2"),(5555,"ADB"),(6379,"Redis"),(6667,"IRC"),(6668,"IRC2"),
    (7777,"C2"),(8080,"Proxy"),(8888,"C2"),(9999,"C2"),(12345,"NetBus"),
    (27017,"MongoDB"),(31337,"BO"),(37777,"C2"),(44322,"C2"),
]

BL = [("Spamhaus ZEN","zen.spamhaus.org"),("SORBS","dnsbl.sorbs.net"),("CBL","cbl.abuseat.org"),("SpamCop","bl.spamcop.net")]

print("=" * 70)
print("  BOT SWEEP v3 — MAXIMUM POWER (Part 2: Scan 26-50)")
print(f"  Time: {datetime.now(timezone.utc).strftime('%H:%M:%S')} UTC")
print("=" * 70)

# Phase 1: Collect more targets
print("\n[1] Collecting from additional feeds...")
targets = []; seen = set()

for label, url, limit in [
    ("blocklist.de/strong","https://lists.blocklist.de/lists/strongips.txt",20),
    ("Spamhaus DROP","https://www.spamhaus.org/drop/drop.txt",12),
    ("EmergingThreats","https://rules.emergingthreats.net/fwrules/emerging-Block-IPs.txt",10),
    ("Firehol L1","https://iplists.firehol.org/files/firehol_level1.netset",8),
]:
    text = fetch_url(url)
    ip_lines = [l.strip() for l in text.split('\n') if l.strip() and re.match(r'^\d+\.\d+\.\d+\.\d+$', l.strip())]
    if ip_lines:
        random.shuffle(ip_lines)
        for ip in ip_lines[:limit]:
            if ip not in seen:
                targets.append({"ip": ip, "src": label, "conf": "REPORTED"})
                seen.add(ip)
    else:
        cidrs = [l.strip().split(';')[0].strip() for l in text.split('\n') if re.match(r'^\d+\.\d+\.\d+\.\d+/', l.strip())]
        random.shuffle(cidrs)
        for c in cidrs[:5]:
            for ip in cidr_to_ips(c, 3):
                if ip not in seen:
                    targets.append({"ip": ip, "src": label, "conf": "REPORTED"})
                    seen.add(ip)

print(f"  Collected {len(targets)} targets")

results = {"metadata": {"tool": "BotSweep v3 P2", "timestamp": datetime.now(timezone.utc).isoformat()+"Z"},
    "scan": {"scanned": 0, "probes": 0, "open": 0, "malware": [], "infrastructure": [], "blacklists": [], "evidence": []},
    "score": 0, "level": "LOW", "total_open": 0, "total_malware": 0, "total_bl": 0}

scan_list = targets[:25]
print(f"\n[2] Scanning {len(scan_list)} targets × {len(PORTS)} ports...\n")

for i, t in enumerate(scan_list):
    ip = t["ip"]
    print(f"  [{i+26:02d}/50] {ip:15s}", end="", flush=True)
    results["scan"]["scanned"] += 1

    try:
        ctx2 = ssl.create_default_context(); ctx2.check_hostname = False; ctx2.verify_mode = ssl.CERT_NONE
        resp = urllib.request.urlopen(urllib.request.Request(f"http://ip-api.com/json/{ip}?fields=status,country,city,isp,hosting,proxy,abuse", headers={"User-Agent":"R/3"}), timeout=4, context=ctx2)
        g = json.loads(resp.read())
        if g.get("status") == "success":
            fl = []
            if g.get("hosting"): fl.append("DC")
            if g.get("proxy"): fl.append("PROXY")
            if g.get("abuse"): fl.append("ABUSE")
            gs = f"{g.get('city','?')},{g.get('country','?')}|{g.get('isp','')[:20]}|{','.join(fl)}"
            print(f" {gs}", end="", flush=True)
            results["scan"]["evidence"].append(f"GEO:{ip} {gs}")
    except: pass

    bl_this = 0
    for bn, bs in BL:
        r = run(f"dig +short +time=2 {ip}.{bs} 2>/dev/null", 3000)
        if r and 'NXDOMAIN' not in r and r.strip() not in ('','0'):
            bl_this += 1; results["total_bl"] += 1
            results["scan"]["blacklists"].append({"ip":ip,"list":bn,"val":r.strip()})
            results["scan"]["evidence"].append(f"BL:{ip}→{bn}={r.strip()}")
            results["score"] += 20

    open_p = []
    with ThreadPoolExecutor(max_workers=20) as pool:
        fmap = {pool.submit(lambda pd: (tcp_connect(ip, pd[0]), pd[0], pd[1]), p): p for p in PORTS}
        for f in as_completed(fmap, timeout=30):
            try:
                (ok, ban), port, name = f.result()
                results["scan"]["probes"] += 1
                if ok: open_p.append((port, name, ban))
            except: pass

    if not open_p:
        print(" ✗")
        continue

    print(f" 🟢{len(open_p)}", end="", flush=True)
    m_this = 0
    for port, name, banner in open_p:
        results["scan"]["open"] += 1; results["total_open"] += 1
        ms = next((s for s in SIGS if re.search(s["p"], banner, re.I)), None)
        e = {"ip":ip,"port":port,"service":name,"banner":banner[:400],"preview":banner[:80],
             "malware":ms["f"] if ms else None,"severity":ms["s"] if ms else "INFO","desc":ms["d"] if ms else None,"source":t["src"]}
        results["scan"]["infrastructure"].append(e)
        results["scan"]["evidence"].append(f"TCP:{ip}:{port} ({name}) '{banner[:40]}'")
        if ms:
            m_this += 1; results["total_malware"] += 1
            e["evidence"] = "BANNER_MATCH"
            results["scan"]["malware"].append(e)
            results["score"] += 30 if ms["s"]=="CRITICAL" else 15
    if m_this: print(f" 💀{m_this}", end="")
    if bl_this: print(f" 🚫{bl_this}", end="")
    print()

sc = results["score"]
results["level"] = "CRITICAL" if sc>=200 else "HIGH" if sc>=100 else "MEDIUM" if sc>=50 else "LOW"

print(f"\n{'=' * 70}")
print(f"  PART 2 SUMMARY")
print(f"  Scanned: {results['scan']['scanned']} | Probes: {results['scan']['probes']} | Open: {results['total_open']}")
print(f"  Malware: {results['total_malware']} | Blacklists: {results['total_bl']} | Score: {sc} [{results['level']}]")
print(f"{'=' * 70}")

out = "/home/z/my-project/download/bot_sweep_part2.json"
with open(out, 'w') as f: json.dump(results, f, indent=2, default=str)
print(f"  Saved: {out}")

for m in sorted(results["scan"]["malware"], key=lambda x: 0 if x["severity"]=="CRITICAL" else 1 if x["severity"]=="HIGH" else 2):
    print(f"  💀 [{m['severity']}] {m['malware']:12s} {m['ip']:15s}:{m['port']:5d} — {m['banner'][:60]}")
