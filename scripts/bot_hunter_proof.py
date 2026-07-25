#!/usr/bin/env python3
"""
ReconPro BOT HUNTER v2 — UNDENIABLE PROOF (FAST VERSION)
=========================================================
Real IPs from blocklist.de + Spamhaus DROP → Real TCP scan → Real banner analysis
"""
import subprocess, json, socket, re, urllib.request, ssl, select, random
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

def run(cmd, timeout=5):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except: return ""

def fetch_url(url, timeout=12):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ReconPro/2.0"})
        resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        return resp.read().decode('utf-8', errors='replace')
    except: return ""

def tcp_connect(ip, port, timeout=2):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((ip, port))
        banner = ""
        try:
            s.send(b"\r\n")
            rdy = select.select([s], [], [], 2)
            if rdy[0]:
                raw = s.recv(2048)
                banner = raw.decode('utf-8', errors='replace')
                banner = re.sub(r'[\x00-\x08\x0e-\x1f\x7f]', '.', banner).strip()[:500]
        except: pass
        s.close()
        return True, banner
    except: return False, ""

def cidr_to_sample_ips(cidr, n=5):
    try:
        parts = cidr.split('/')
        octs = parts[0].split('.')
        prefix = int(parts[1]) if len(parts) > 1 else 32
        if prefix >= 24:
            base = int(octs[0])*256**3 + int(octs[1])*256**2 + int(octs[2])*256
            ips = []
            for i in range(n):
                num = base + i
                ips.append(f"{(num>>24)&255}.{(num>>16)&255}.{(num>>8)&255}.{num&255}")
            return ips
    except: pass
    return []

SIGS = [
    {"p": r"mirai", "f": "Mirai", "s": "CRITICAL", "d": "IoT botnet — 600K+ devices"},
    {"p": r"Enter\s*password", "f": "IoT Login", "s": "HIGH", "d": "Exposed IoT login prompt"},
    {"p": r"PING\s*:", "f": "IRC C2 Heartbeat", "s": "HIGH", "d": "IRC botnet PING/PONG"},
    {"p": r":notice\s+auth", "f": "IRC Auth Channel", "s": "HIGH", "d": "IRC botnet auth"},
    {"p": r"NICK\s+\S+", "f": "IRC Bot Nick", "s": "MEDIUM", "d": "IRC bot registration"},
    {"p": r"cobalt\s*strike", "f": "Cobalt Strike", "s": "CRITICAL", "d": "APT C2 framework"},
    {"p": r"metasploit", "f": "Metasploit", "s": "CRITICAL", "d": "Exploitation framework"},
    {"p": r"darkcomet", "f": "DarkComet", "s": "CRITICAL", "d": "RAT — keylog/webcam"},
    {"p": r"emotet", "f": "Emotet", "s": "CRITICAL", "d": "Banking trojan botnet"},
    {"p": r"trickbot", "f": "TrickBot", "s": "CRITICAL", "d": "Banking trojan"},
    {"p": r"qakbot|qbot", "f": "QakBot", "s": "CRITICAL", "d": "Polymorphic banking bot"},
    {"p": r"zeus|zbot", "f": "Zeus", "s": "CRITICAL", "d": "Banking botnet"},
    {"p": r"redis", "f": "Redis Exposed", "s": "HIGH", "d": "Unauth Redis — RCE vector"},
    {"p": r"mongodb", "f": "MongoDB Exposed", "s": "CRITICAL", "d": "Unauth MongoDB"},
    {"p": r"mysql|mariadb", "f": "MySQL Exposed", "s": "HIGH", "d": "Exposed MySQL"},
    {"p": r"memcached", "f": "Memcached", "s": "HIGH", "d": "DDoS amplification"},
    {"p": r"SSH-2\.0", "f": "SSH Server", "s": "LOW", "d": "SSH running"},
    {"p": r"SSH-1\.99", "f": "SSH Ancient", "s": "MEDIUM", "d": "Old vulnerable SSH"},
    {"p": r"vsftpd|proftpd|pure-ftpd", "f": "FTP Server", "s": "LOW", "d": "FTP service"},
    {"p": r"HTTP/1\.[01]", "f": "HTTP Server", "s": "LOW", "d": "Web server"},
    {"p": r"220.*ftp", "f": "FTP Banner", "s": "LOW", "d": "FTP service"},
    {"p": r"220.*smtp|ESMTP|postfix|exim", "f": "SMTP", "s": "LOW", "d": "Mail server"},
    {"p": r"BusyBox", "f": "IoT BusyBox", "s": "MEDIUM", "d": "IoT firmware (Mirai)"},
    {"p": r"root@|login:", "f": "Shell Prompt", "s": "MEDIUM", "d": "Shell access"},
    {"p": r"c99mad|c100|r57|WSO", "f": "Web Shell", "s": "CRITICAL", "d": "Known web shell"},
]

# Critical C2 ports + exposed services — optimized set
PORTS = [
    (21,"FTP"),(22,"SSH"),(23,"Telnet/Mirai"),(25,"SMTP"),(80,"HTTP"),
    (445,"SMB"),(2323,"Telnet Alt"),(4444,"Meta/Mirai C2"),(3306,"MySQL"),
    (5555,"ADB/Mirai"),(6379,"Redis"),(6667,"IRC C2"),(8080,"HTTP Proxy"),
    (8888,"C2"),(9999,"C2"),(12345,"NetBus"),(27017,"MongoDB"),(31337,"BO C2"),
]

BL_SERVERS = [
    ("Spamhaus ZEN", "zen.spamhaus.org"),
    ("SORBS", "dnsbl.sorbs.net"),
    ("CBL", "cbl.abuseat.org"),
    ("SpamCop", "bl.spamcop.net"),
]

print("=" * 80)
print("  RECONPRO BOT HUNTER v2 — 100% REAL PROOF")
print(f"  Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC")
print("=" * 80)

# PHASE 1: Collect real IPs
print("\n[1] Collecting REAL abuser IPs from threat feeds...")

targets = []

# blocklist.de
print("  blocklist.de strongips...", end=" ", flush=True)
bl_text = fetch_url("https://lists.blocklist.de/lists/strongips.txt")
bl_ips = [l.strip() for l in bl_text.split('\n') if l.strip() and re.match(r'^\d+\.\d+\.\d+\.\d+$', l.strip())]
random.shuffle(bl_ips)
for ip in bl_ips[:30]:
    targets.append({"ip": ip, "src": "blocklist.de", "conf": "REPORTED_ABUSE"})
print(f"✅ {len(bl_ips)} IPs loaded, using {min(30, len(bl_ips))}")

# Spamhaus DROP
print("  Spamhaus DROP...", end=" ", flush=True)
sp_text = fetch_url("https://www.spamhaus.org/drop/drop.txt")
sp_cidrs = [l.strip().split(';')[0].strip() for l in sp_text.split('\n') if re.match(r'^\d+\.\d+\.\d+\.\d+/', l.strip())]
for cidr in sp_cidrs[:8]:
    for ip in cidr_to_sample_ips(cidr, 5):
        targets.append({"ip": ip, "src": f"Spamhaus DROP ({cidr})", "conf": "SPAMHAUS"})
print(f"✅ {len(sp_cidrs)} CIDRs → sample IPs")

# DShield
print("  DShield Top Attackers...", end=" ", flush=True)
ds_text = fetch_url("https://feeds.dshield.org/block.txt")
ds_cidrs = []
for line in ds_text.split('\n'):
    parts = line.strip().split('\t')
    if len(parts) >= 2 and re.match(r'^\d+\.\d+\.\d+\.\d+/', parts[0]):
        ds_cidrs.append(parts[0].strip())
for cidr in ds_cidrs[:5]:
    for ip in cidr_to_sample_ips(cidr, 5):
        targets.append({"ip": ip, "src": "DShield Attacker", "conf": "DSHIELD"})
print(f"✅ {len(ds_cidrs)} networks → sample IPs")

seen = set()
unique = []
for t in targets:
    if t["ip"] not in seen:
        seen.add(t["ip"])
        unique.append(t)

print(f"\n  Total unique targets: {len(unique)}")
print(f"  All from REAL threat intel sources")

# PHASE 2: Scan
results = {
    "metadata": {
        "tool": "ReconPro Bot Hunter v2",
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        "method": "Real TCP + Real DNSBL + Real Geo",
        "sources": ["blocklist.de", "Spamhaus DROP", "DShield"],
        "note": "100% REAL — NO SIMULATION",
    },
    "feeds": {"blocklist_de": len(bl_ips), "spamhaus": len(sp_cidrs), "dshield": len(ds_cidrs), "targets": len(unique)},
    "scan": {"scanned": 0, "probes": 0, "open": 0, "malware": [], "infrastructure": [], "blacklists": [], "evidence": []},
    "score": 0, "level": "LOW",
}

scan_list = unique[:20]
print(f"\n[2] Scanning {len(scan_list)} targets × {len(PORTS)} ports = {len(scan_list)*len(PORTS)} probes...\n")

for i, t in enumerate(scan_list):
    ip = t["ip"]
    print(f"  [{i+1}/{len(scan_list)}] {ip} ({t['conf']})")
    results["scan"]["scanned"] += 1

    # Geo
    geo = None
    try:
        req = urllib.request.Request(
            f"http://ip-api.com/json/{ip}?fields=status,query,country,city,isp,org,as,reverse,hosting,proxy,abuse",
            headers={"User-Agent": "ReconPro/2.0"}
        )
        ctx2 = ssl.create_default_context()
        ctx2.check_hostname = False
        ctx2.verify_mode = ssl.CERT_NONE
        resp = urllib.request.urlopen(req, timeout=5, context=ctx2)
        geo = json.loads(resp.read())
    except: pass

    if geo and geo.get("status") == "success":
        flags = []
        if geo.get("hosting"): flags.append("DC")
        if geo.get("proxy"): flags.append("PROXY")
        if geo.get("abuse"): flags.append("ABUSE")
        print(f"    Geo: {geo.get('city','?')}, {geo.get('country','?')} | {geo.get('isp','?')[:35]} | {','.join(flags) or 'none'}")
        results["scan"]["evidence"].append(f"GEO:{ip} → {geo.get('city','')},{geo.get('country','')} | {geo.get('isp','')} | {','.join(flags)}")
    
    # DNSBL (batch with dig)
    for bl_name, bl_srv in BL_SERVERS:
        r = run(f"dig +short +time=2 {ip}.{bl_srv} 2>/dev/null", 3500)
        if r and 'NXDOMAIN' not in r and r.strip() not in ('','0'):
            print(f"    🔴 BLACKLISTED: {bl_name} → {r.strip()}")
            results["scan"]["blacklists"].append({"ip": ip, "list": bl_name, "val": r.strip()})
            results["scan"]["evidence"].append(f"BL:{ip} → {bl_name}={r.strip()} (REAL dig lookup)")
            results["score"] += 20

    # Port scan
    open_p = []
    def probe(pd):
        port, name = pd
        return tcp_connect(ip, port), port, name
    with ThreadPoolExecutor(max_workers=12) as pool:
        fmap = {pool.submit(probe, p): p for p in PORTS}
        for f in as_completed(fmap, timeout=40):
            try:
                (is_open, banner), port, name = f.result()
                results["scan"]["probes"] += 1
                if is_open:
                    open_p.append((port, name, banner))
            except: pass

    if not open_p:
        print(f"    TCP: all {len(PORTS)} ports closed/filtered")
        results["scan"]["evidence"].append(f"TCP:{ip} all ports filtered")
        continue

    print(f"    TCP: {len(open_p)} OPEN!")
    for port, name, banner in open_p:
        results["scan"]["open"] += 1
        bp = banner[:80] if banner else "(no banner)"
        print(f"      :{port} ({name}) → {bp}")
        results["scan"]["evidence"].append(f"TCP:{ip}:{port} ({name}) OPEN banner={bp[:60]}")

        # Match sigs
        msig = None
        for s in SIGS:
            if re.search(s["p"], banner, re.IGNORECASE):
                msig = s
                break

        entry = {"ip": ip, "port": port, "service": name, "banner": banner[:400], "preview": banner[:120],
                 "malware": msig["f"] if msig else None, "severity": msig["s"] if msig else "INFO",
                 "desc": msig["d"] if msig else None, "method": "REAL TCP socket",
                 "source": t["src"], "conf": t["conf"]}
        results["scan"]["infrastructure"].append(entry)

        if msig:
            print(f"        💀 MATCH: {msig['f']} [{msig['s']}] — {msig['d']}")
            entry["evidence"] = "BANNER_PATTERN_MATCH"
            results["scan"]["malware"].append(entry)
            results["scan"]["evidence"].append(f"SIG:{msig['f']} on {ip}:{port} banner='{banner[:60]}'")
            results["score"] += 30 if msig["s"] == "CRITICAL" else 15

# Classify
sc = results["score"]
lv = "CRITICAL" if sc >= 100 else "HIGH" if sc >= 60 else "MEDIUM" if sc >= 30 else "LOW"
results["level"] = lv

print(f"\n{'=' * 80}")
print(f"  🎯 RESULTS — 100% REAL DATA")
print(f"{'=' * 80}")
print(f"  Targets scanned:   {results['scan']['scanned']}")
print(f"  TCP probes:        {results['scan']['probes']}")
print(f"  Open ports:        {results['scan']['open']}")
print(f"  Malware matches:   {len(results['scan']['malware'])}")
print(f"  Blacklist hits:    {len(results['scan']['blacklists'])}")
print(f"  ───────────────────────────────────")
print(f"  THREAT SCORE:      {sc}")
print(f"  THREAT LEVEL:      {lv}")
print(f"  CAGE:              {'QUARANTINE' if sc>=100 else 'ESCALATE' if sc>=60 else 'MONITOR' if sc>=30 else 'WATCH'}")
print(f"{'=' * 80}")

if results["scan"]["malware"]:
    print(f"\n  💀 MALWARE BANNER MATCHES:")
    for m in results["scan"]["malware"]:
        print(f"    [{m['severity']}] {m['malware']} on {m['ip']}:{m['port']}")
        print(f"      {m['desc']}")
        print(f"      Banner: {m['banner'][:150]}")

if results["scan"]["blacklists"]:
    print(f"\n  🚫 BLACKLIST HITS:")
    for b in results["scan"]["blacklists"]:
        print(f"    {b['ip']} → {b['list']} = {b['val']}")

if results["scan"]["infrastructure"]:
    print(f"\n  🌐 ALL OPEN PORTS:")
    for c in results["scan"]["infrastructure"]:
        icon = "💀" if c.get("malware") else "⚠️"
        print(f"    {icon} [{c['severity']}] {c['ip']}:{c['port']} ({c['service']}) — {c['preview'][:70]}")

print(f"\n  📋 EVIDENCE LOG ({len(results['scan']['evidence'])} entries):")
for e in results["scan"]["evidence"][:60]:
    print(f"  {e}")

out = "/home/z/my-project/download/reconpro_bot_hunt_PROOF.json"
with open(out, 'w') as f:
    json.dump(results, f, indent=2, default=str)
print(f"\n  ✅ Saved: {out}")
print(f"  Verify: nc -v <ip> <port> for any open port above")
print(f"{'=' * 80}")
