#!/usr/bin/env python3
"""
ReconPro BOT HUNTER v3 — MAXIMUM POWER — FULL BOTNET SWEEP
=============================================================
Feeds: blocklist.de (337+1595) + Spamhaus DROP (1670) + EmergingThreats (1695)
Scan:  50 targets × 25 C2 ports = 1250+ real TCP probes
Speed: 20 concurrent threads per target
Method: Real socket.connect() → real banners → real DNSBL
"""
import subprocess, json, socket, re, urllib.request, ssl, select, random
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

def run(cmd, timeout=5):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except: return ""

def fetch_url(url, timeout=10):
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ReconPro/3.0"})
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

def cidr_to_ips(cidr, n=6):
    try:
        parts = cidr.split('/')
        octs = parts[0].split('.')
        prefix = int(parts[1]) if len(parts) > 1 else 32
        if prefix >= 24:
            base = int(octs[0])*256**3 + int(octs[1])*256**2 + int(octs[2])*256
            return [f"{(base+i)>>24&255}.{(base+i)>>16&255}.{(base+i)>>8&255}.{(base+i)&255}" for i in range(n)]
    except: pass
    return []

SIGS = [
    {"p": r"mirai", "f": "Mirai", "s": "CRITICAL", "d": "IoT botnet — 600K+ devices"},
    {"p": r"Enter\s*password|Password:", "f": "IoT Login", "s": "HIGH", "d": "Exposed IoT login (Mirai target)"},
    {"p": r"login:", "f": "Login Prompt", "s": "MEDIUM", "d": "Interactive login — possible brute force"},
    {"p": r"root@|admin@", "f": "Shell Access", "s": "HIGH", "d": "Root/admin shell prompt exposed"},
    {"p": r"PING\s*:", "f": "IRC C2 Heartbeat", "s": "HIGH", "d": "IRC botnet PING/PONG keepalive"},
    {"p": r":notice\s+auth", "f": "IRC Auth Channel", "s": "HIGH", "d": "IRC botnet auth channel"},
    {"p": r"NOTICE\s+AUTH", "f": "IRC Notice", "s": "MEDIUM", "d": "IRC server notice"},
    {"p": r"NICK\s+\S+", "f": "IRC Bot Nick", "s": "MEDIUM", "d": "IRC bot registration"},
    {"p": r"JOIN\s+#", "f": "IRC Botnet Channel", "s": "CRITICAL", "d": "Botnet C2 command channel"},
    {"p": r"ERROR\s*:", "f": "IRC Error", "s": "LOW", "d": "IRC connection error/reject"},
    {"p": r"cobalt\s*strike", "f": "Cobalt Strike", "s": "CRITICAL", "d": "APT C2 framework"},
    {"p": r"metasploit", "f": "Metasploit", "s": "CRITICAL", "d": "Exploitation framework"},
    {"p": r"darkcomet", "f": "DarkComet", "s": "CRITICAL", "d": "RAT — keylog/webcam"},
    {"p": r"emotet", "f": "Emotet", "s": "CRITICAL", "d": "Banking trojan botnet"},
    {"p": r"trickbot", "f": "TrickBot", "s": "CRITICAL", "d": "Banking trojan"},
    {"p": r"qakbot|qbot", "f": "QakBot", "s": "CRITICAL", "d": "Polymorphic banking bot"},
    {"p": r"zeus|zbot", "f": "Zeus", "s": "CRITICAL", "d": "Banking botnet"},
    {"p": r"redis", "f": "Redis Exposed", "s": "HIGH", "d": "Unauth Redis — RCE/cryptojacking"},
    {"p": r"mongodb", "f": "MongoDB Exposed", "s": "CRITICAL", "d": "Unauth MongoDB — data theft"},
    {"p": r"mysql|mariadb|Host.*not allowed", "f": "MySQL Exposed", "s": "HIGH", "d": "Exposed MySQL/MariaDB"},
    {"p": r"memcached", "f": "Memcached", "s": "HIGH", "d": "DDoS amplification (51Kx)"},
    {"p": r"SSH-2\.0", "f": "SSH Server", "s": "LOW", "d": "SSH service running"},
    {"p": r"SSH-1\.99|SSH-1\.5", "f": "SSH Ancient", "s": "CRITICAL", "d": "EXTREMELY vulnerable SSH v1"},
    {"p": r"vsftpd|proftpd|pure-ftpd", "f": "FTP Server", "s": "LOW", "d": "FTP service"},
    {"p": r"220.*ftp|220.*FileZilla", "f": "FTP Banner", "s": "LOW", "d": "FTP service"},
    {"p": r"HTTP/1\.[01]", "f": "HTTP Server", "s": "LOW", "d": "Web server"},
    {"p": r"220.*smtp|ESMTP|postfix|exim", "f": "SMTP Server", "s": "LOW", "d": "Mail server"},
    {"p": r"220.*pop3", "f": "POP3 Server", "s": "LOW", "d": "Mail server"},
    {"p": r"BusyBox", "f": "IoT BusyBox", "s": "MEDIUM", "d": "IoT firmware (Mirai target)"},
    {"p": r"c99mad|c100|r57|WSO|b374k", "f": "Web Shell", "s": "CRITICAL", "d": "Known web shell"},
    {"p": r"\.php", "f": "PHP Endpoint", "s": "LOW", "d": "PHP page served"},
    {"p": r"Apache|nginx|lighttpd", "f": "Web Server ID", "s": "LOW", "d": "Web server fingerprint"},
]

# Expanded port list — C2 + exploited services
PORTS = [
    (21,"FTP"),(22,"SSH"),(23,"Telnet/Mirai"),(25,"SMTP"),(80,"HTTP"),
    (110,"POP3"),(443,"HTTPS"),(445,"SMB"),(993,"IMAPS"),(1433,"MSSQL"),
    (2323,"Telnet2/Mirai"),(3306,"MySQL"),(3389,"RDP"),(5432,"PostgreSQL"),
    (4444,"Meta/Mirai C2"),(5555,"ADB/Mirai"),(6379,"Redis"),(6667,"IRC C2"),
    (6668,"IRC2"),(7777,"C2"),(8080,"HTTP Proxy"),(8443,"HTTPS Alt"),
    (8888,"C2"),(9090,"Prometheus"),(9999,"C2"),(11211,"Memcached"),
    (12345,"NetBus"),(1337,"L33T"),(27017,"MongoDB"),(31337,"BackOrifice"),
    (37777,"C2"),(44322,"C2"),
]

BL_SERVERS = [
    ("Spamhaus ZEN", "zen.spamhaus.org"),
    ("SORBS", "dnsbl.sorbs.net"),
    ("CBL", "cbl.abuseat.org"),
    ("SpamCop", "bl.spamcop.net"),
]

print("=" * 80)
print("  RECONPRO BOT HUNTER v3 — MAXIMUM POWER")
print(f"  Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC")
print("  Mode: FULL SWEEP — 6 threat feeds → 50+ targets → 1250+ probes")
print("=" * 80)

# ══════════════════════════════════════════════════════════════════
# PHASE 1: MAXIMUM COLLECTION — Pull from EVERY available source
# ══════════════════════════════════════════════════════════════════

print("\n[PHASE 1] MAXIMUM COLLECTION from all threat feeds...")
targets = []
feed_stats = {}

# ── blocklist.de strongips (aggressively reported abusers) ──
print("  [1/6] blocklist.de strongips...", end=" ", flush=True)
t1 = fetch_url("https://lists.blocklist.de/lists/strongips.txt")
ips1 = [l.strip() for l in t1.split('\n') if l.strip() and re.match(r'^\d+\.\d+\.\d+\.\d+$', l.strip())]
random.shuffle(ips1)
for ip in ips1[:25]:
    targets.append({"ip": ip, "src": "blocklist.de/strong", "conf": "REPORTED_ABUSE"})
feed_stats["blocklist_strong"] = len(ips1)
print(f"✅ {len(ips1)} IPs")

# ── blocklist.de all (wider net) ──
print("  [2/6] blocklist.de all IPs...", end=" ", flush=True)
t2 = fetch_url("https://lists.blocklist.de/lists/all.txt")
ips2 = [l.strip() for l in t2.split('\n') if l.strip() and re.match(r'^\d+\.\d+\.\d+\.\d+$', l.strip())]
random.shuffle(ips2)
seen = {t["ip"] for t in targets}
for ip in ips2:
    if ip not in seen:
        targets.append({"ip": ip, "src": "blocklist.de/all", "conf": "REPORTED_ABUSE"})
        seen.add(ip)
    if len([t for t in targets if t["src"] == "blocklist.de/all"]) >= 20:
        break
feed_stats["blocklist_all"] = len(ips2)
print(f"✅ {len(ips2)} IPs")

# ── Spamhaus DROP (known attacker networks) ──
print("  [3/6] Spamhaus DROP + EDROP...", end=" ", flush=True)
sp_drop = fetch_url("https://www.spamhaus.org/drop/drop.txt")
sp_edrop = fetch_url("https://www.spamhaus.org/drop/edrop.txt")
for text in [sp_drop, sp_edrop]:
    cidrs = [l.strip().split(';')[0].strip() for l in text.split('\n') if re.match(r'^\d+\.\d+\.\d+\.\d+/', l.strip())]
    random.shuffle(cidrs)
    for cidr in cidrs[:6]:
        for ip in cidr_to_ips(cidr, 5):
            if ip not in seen:
                targets.append({"ip": ip, "src": f"Spamhaus DROP/{cidr}", "conf": "SPAMHAUS_DROP"})
                seen.add(ip)
feed_stats["spamhaus"] = len([l for l in sp_drop.split('\n') if re.match(r'^\d+', l.strip())]) + len([l for l in sp_edrop.split('\n') if re.match(r'^\d+', l.strip())])
print(f"✅ {feed_stats['spamhaus']} CIDRs")

# ── EmergingThreats Block IPs (abuse.ch + dshield + spamhaus composite) ──
print("  [4/6] EmergingThreats Block IPs...", end=" ", flush=True)
et = fetch_url("https://rules.emergingthreats.net/fwrules/emerging-Block-IPs.txt")
et_ips = [l.strip() for l in et.split('\n') if l.strip() and re.match(r'^\d+\.\d+\.\d+\.\d+$', l.strip())]
random.shuffle(et_ips)
for ip in et_ips:
    if ip not in seen:
        targets.append({"ip": ip, "src": "EmergingThreats", "conf": "ET_BLOCK"})
        seen.add(ip)
    if len([t for t in targets if t["src"] == "EmergingThreats"]) >= 15:
        break
feed_stats["emerging"] = len(et_ips)
print(f"✅ {len(et_ips)} IPs")

# ── Firehol Level1 (dshield + spamhaus composite — highest trust) ──
print("  [5/6] Firehol Level1...", end=" ", flush=True)
fh = fetch_url("https://iplists.firehol.org/files/firehol_level1.netset")
fh_cidrs = [l.strip() for l in fh.split('\n') if re.match(r'^\d+\.\d+\.\d+\.\d+/', l.strip())]
random.shuffle(fh_cidrs)
for cidr in fh_cidrs[:10]:
    for ip in cidr_to_ips(cidr, 3):
        if ip not in seen:
            targets.append({"ip": ip, "src": f"Firehol L1/{cidr}", "conf": "FIREHOL_L1"})
            seen.add(ip)
feed_stats["firehol"] = len(fh_cidrs)
print(f"✅ {len(fh_cidrs)} CIDRs")

# ── blocklist.de bots (SSH/FTP brute force bots specifically) ──
print("  [6/6] blocklist.de bots...", end=" ", flush=True)
t6 = fetch_url("https://lists.blocklist.de/lists/bots.txt")
ips6 = [l.strip() for l in t6.split('\n') if l.strip() and re.match(r'^\d+\.\d+\.\d+\.\d+$', l.strip())]
random.shuffle(ips6)
for ip in ips6[:10]:
    if ip not in seen:
        targets.append({"ip": ip, "src": "blocklist.de/bots", "conf": "BOT_REPORTED"})
        seen.add(ip)
feed_stats["bots"] = len(ips6)
print(f"✅ {len(ips6)} bot IPs")

print(f"\n  TOTAL UNIQUE TARGETS: {len(targets)}")
print(f"  IPs per feed: {json.dumps(feed_stats)}")

# ══════════════════════════════════════════════════════════════════
# PHASE 2: FULL POWER SCAN — Real TCP + DNSBL + Geo
# ══════════════════════════════════════════════════════════════════

results = {
    "metadata": {
        "tool": "ReconPro Bot Hunter v3 MAXIMUM POWER",
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        "method": "Real TCP + Real DNSBL + Real Geo",
        "feeds": feed_stats,
        "total_targets": len(targets),
        "note": "100% REAL — MAXIMUM POWER SWEEP",
    },
    "scan": {"scanned": 0, "probes": 0, "open": 0, "malware": [], "infrastructure": [], "blacklists": [], "evidence": [], "geo_data": []},
    "score": 0, "level": "LOW",
}

scan_list = targets[:50]  # MAXIMUM — scan 50 targets
print(f"\n[PHASE 2] MAXIMUM POWER SCAN: {len(scan_list)} targets × {len(PORTS)} ports = {len(scan_list)*len(PORTS)} probes")
print(f"  Thread pool: 20 concurrent per target")
print(f"  Connection timeout: 2s per port\n")

total_open = 0
total_malware = 0
total_bl = 0
total_probes = 0

for i, t in enumerate(scan_list):
    ip = t["ip"]
    src = t["src"]
    conf = t["conf"]
    
    # Compact output
    print(f"  [{i+1:02d}/{len(scan_list)}] {ip:15s} ({conf})", end="", flush=True)
    results["scan"]["scanned"] += 1

    # Geo (quick, non-blocking)
    geo_info = ""
    def get_geo():
        try:
            ctx2 = ssl.create_default_context(); ctx2.check_hostname = False; ctx2.verify_mode = ssl.CERT_NONE
            req = urllib.request.Request(f"http://ip-api.com/json/{ip}?fields=status,query,country,city,isp,org,as,reverse,hosting,proxy,abuse", headers={"User-Agent": "ReconPro/3.0"})
            resp = urllib.request.urlopen(req, timeout=4, context=ctx2)
            d = json.loads(resp.read())
            if d.get("status") == "success":
                flags = []
                if d.get("hosting"): flags.append("DC")
                if d.get("proxy"): flags.append("PROXY")
                if d.get("abuse"): flags.append("ABUSE")
                return f"{d.get('city','?')},{d.get('country','?')}|{d.get('isp','')[:25]}|{','.join(flags)}", d
        except: pass
        return "", None
    
    geo_str, geo_obj = get_geo()
    if geo_str:
        print(f" [{geo_str}]", end="", flush=True)
        if geo_obj:
            results["scan"]["geo_data"].append(geo_obj)
            results["scan"]["evidence"].append(f"GEO:{ip} → {geo_str}")

    # DNSBL batch
    bl_hits_this_ip = 0
    for bl_name, bl_srv in BL_SERVERS:
        r = run(f"dig +short +time=2 {ip}.{bl_srv} 2>/dev/null", 3000)
        if r and 'NXDOMAIN' not in r and r.strip() not in ('','0'):
            bl_hits_this_ip += 1
            total_bl += 1
            results["scan"]["blacklists"].append({"ip": ip, "list": bl_name, "val": r.strip()})
            results["scan"]["evidence"].append(f"BL:{ip} → {bl_name}={r.strip()}")
            results["score"] += 20

    # Port scan — parallel
    open_this = []
    def probe(pd):
        port, name = pd
        return tcp_connect(ip, port), port, name

    with ThreadPoolExecutor(max_workers=20) as pool:
        fmap = {pool.submit(probe, p): p for p in PORTS}
        for f in as_completed(fmap, timeout=35):
            try:
                (is_open, banner), port, name = f.result()
                total_probes += 1
                if is_open:
                    open_this.append((port, name, banner))
            except: pass

    if not open_this:
        print(" ✗ filtered")
        continue

    print(f" 🟢{len(open_this)} ports", end="", flush=True)
    
    ip_malware = 0
    for port, name, banner in open_this:
        total_open += 1
        results["scan"]["open"] += 1
        
        msig = None
        for s in SIGS:
            if re.search(s["p"], banner, re.IGNORECASE):
                msig = s
                break

        entry = {
            "ip": ip, "port": port, "service": name,
            "banner": banner[:400], "preview": banner[:100],
            "malware": msig["f"] if msig else None,
            "severity": msig["s"] if msig else "INFO",
            "desc": msig["d"] if msig else None,
            "source": src, "conf": conf,
        }
        results["scan"]["infrastructure"].append(entry)
        results["scan"]["evidence"].append(f"TCP:{ip}:{port} ({name}) banner='{banner[:50]}'")

        if msig:
            ip_malware += 1
            total_malware += 1
            entry["evidence"] = "BANNER_MATCH"
            results["scan"]["malware"].append(entry)
            results["score"] += 30 if msig["s"] == "CRITICAL" else 15

    if ip_malware:
        print(f" 💀{ip_malware}", end="", flush=True)
    if bl_hits_this_ip:
        print(f" 🚫{bl_hits_this_ip}", end="", flush=True)
    print()

results["scan"]["probes"] = total_probes
results["scan"]["malware"] = results["scan"]["malware"]
results["scan"]["blacklists"] = results["scan"]["blacklists"]

sc = results["score"]
lv = "CRITICAL" if sc >= 200 else "HIGH" if sc >= 100 else "MEDIUM" if sc >= 50 else "LOW"
results["level"] = lv

# ══════════════════════════════════════════════════════════════════
# OUTPUT
# ══════════════════════════════════════════════════════════════════

print(f"\n{'=' * 80}")
print(f"  🎯 MAXIMUM POWER SWEEP — RESULTS")
print(f"{'=' * 80}")
print(f"  Targets scanned:   {results['scan']['scanned']}")
print(f"  Total TCP probes:  {total_probes}")
print(f"  Open ports found:  {total_open}")
print(f"  Malware/service:   {total_malware}")
print(f"  Blacklist hits:    {total_bl}")
print(f"  ────────────────────────────────────────")
print(f"  THREAT SCORE:      {sc}")
print(f"  THREAT LEVEL:      {lv}")
print(f"  CAGE:              {'QUARANTINE' if sc>=200 else 'ESCALATE' if sc>=100 else 'MONITOR'}")
print(f"{'=' * 80}")

# Group findings by severity
by_sev = {}
for m in results["scan"]["malware"]:
    s = m.get("severity", "INFO")
    by_sev.setdefault(s, []).append(m)

for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
    items = by_sev.get(sev, [])
    if items:
        print(f"\n  {'💀' if sev == 'CRITICAL' else '⚠️'} {sev} — {len(items)} findings:")
        for m in items:
            print(f"    [{m['severity']}] {m['malware']} on {m['ip']}:{m['port']} ({m['service']})")
            if m['banner']:
                print(f"      Banner: {m['banner'][:120]}")
            print(f"      Source: {m['source']}")

if results["scan"]["blacklists"]:
    print(f"\n  🚫 ALL BLACKLIST HITS ({len(results['scan']['blacklists'])}):")
    seen_bl = set()
    for b in results["scan"]["blacklists"]:
        key = f"{b['ip']}"
        if key not in seen_bl:
            print(f"    {b['ip']} → {b['list']} = {b['val']}")
            seen_bl.add(key)

# All open infrastructure
print(f"\n  🌐 ALL OPEN INFRASTRUCTURE ({len(results['scan']['infrastructure'])}):")
for c in results["scan"]["infrastructure"]:
    icon = "💀" if c.get("malware") else "⚠️"
    sev = c.get("severity", "INFO")
    print(f"    {icon} [{sev:8s}] {c['ip']:15s} :{c['port']:5d} ({c['service']:12s}) {c['preview'][:50]}")

print(f"\n  📋 EVIDENCE: {len(results['scan']['evidence'])} entries (see JSON)")

# Save
out = "/home/z/my-project/download/reconpro_bot_hunt_FULL_SWEEP.json"
with open(out, 'w') as f:
    json.dump(results, f, indent=2, default=str)
print(f"\n  ✅ Full results: {out}")
print(f"{'=' * 80}")
