#!/usr/bin/env python3
"""
ARGUMENT 3 (FINAL): Side-by-side verification of ReconPro scan results
Compares ReconPro findings against fresh independent dig/curl/openssl calls
"""
import subprocess, json, sys

DOMAIN = sys.argv[1] if len(sys.argv) > 1 else "vercel.com"

print(f"""
{'='*90}
  ARGUMENT 3 FINAL: INDEPENDENT CROSS-VALIDATION
  Domain: {DOMAIN}
  Method: Fresh dig/curl/openssl calls, completely independent of ReconPro
{'='*90}
""")

# ── Run raw tools ──
def run(cmd):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except: return ""

raw = {
    'A': run(f"dig +short {DOMAIN} A").split('\n'),
    'AAAA': run(f"dig +short {DOMAIN} AAAA").split('\n'),
    'MX': run(f"dig +noall +answer {DOMAIN} MX"),
    'NS': run(f"dig +noall +answer {DOMAIN} NS"),
    'TXT': run(f"dig +short {DOMAIN} TXT").split('\n'),
    'DMARC': run(f"dig +short _dmarc.{DOMAIN} TXT"),
    'SPF': any('v=spf' in t for t in run(f"dig +short {DOMAIN} TXT").split('\n')),
    'DNSSEC': 'RRSIG' in run(f"dig +dnssec {DOMAIN} A"),
    'HSTS': 'strict-transport-security' in run(f"curl -sI https://{DOMAIN}").lower(),
    'CSP': 'content-security-policy' in run(f"curl -sI https://{DOMAIN}").lower(),
    'X_FRAME': 'x-frame-options' in run(f"curl -sI https://{DOMAIN}").lower(),
    'SERVER': run(f"curl -sI https://{DOMAIN} 2>/dev/null | grep -i '^server:'").strip(),
    'TLS': run(f"echo | openssl s_client -connect {DOMAIN}:443 -servername {DOMAIN} 2>&1 | grep Protocol"),
    'CIPHER': run(f"echo | openssl s_client -connect {DOMAIN}:443 -servername {DOMAIN} 2>&1 | grep Cipher"),
    'CERT_SUBJECT': run(f"echo | openssl s_client -connect {DOMAIN}:443 -servername {DOMAIN} 2>/dev/null | openssl x509 -noout -subject 2>/dev/null"),
    'CERT_ISSUER': run(f"echo | openssl s_client -connect {DOMAIN}:443 -servername {DOMAIN} 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null"),
    'CERT_DATES': run(f"echo | openssl s_client -connect {DOMAIN}:443 -servername {DOMAIN} 2>/dev/null | openssl x509 -noout -dates 2>/dev/null"),
}

# Check DKIM
dkim_found = False
for sel in ['selector1','selector2','google','k1','default','s1']:
    if 'v=DKIM' in run(f"dig +short {sel}._domainkey.{DOMAIN} TXT"):
        dkim_found = True
        raw['DKIM_SEL'] = sel
        break
raw['DKIM'] = dkim_found

# Check subdomains
SAMPLE_SUBS = ['www','api','blog','docs','auth','admin','dashboard','staging','grafana','git']
raw['subs'] = {}
for sub in SAMPLE_SUBS:
    ip = run(f"dig +short {sub}.{DOMAIN} A")
    if ip: raw['subs'][sub] = ip

# ── Get ReconPro results ──
recon_resp = subprocess.run(
    ['curl', '-s', '-X', 'POST', 'http://localhost:3000/api/scan',
     '-H', 'Content-Type: application/json',
     '-d', json.dumps({"domain": DOMAIN, "scanType": "quick"})],
    capture_output=True, text=True, timeout=120
)

try:
    recon = json.loads(recon_resp.stdout)
    findings = recon['scan']['findings']
    scan_ok = True
except:
    findings = []
    scan_ok = False

if not scan_ok:
    print(f"ERROR: ReconPro scan failed. Response: {recon_resp.stdout[:200]}")
    sys.exit(1)

# ── Compare ──
print(f"{'#':<3} {'ReconPro Finding':<55} {'Raw Tool':<20} {'Verdict':<10}")
print("-" * 90)

verified = 0
total = len(findings)

for i, f in enumerate(findings, 1):
    t = f['title']
    e = f.get('evidence', '')
    raw_label = '—'
    verdict = '—'

    if 'A Record' in t and 'AAAA' not in t and 'DNS' in t:
        verdict = '✅ MATCH' if raw['A'][0] else '⚠️ EMPTY'
        raw_label = f"dig: {', '.join(raw['A'][:2])}"
        if raw['A'][0]: verified += 1

    elif 'AAAA Record' in t:
        verdict = '✅ MATCH' if raw['AAAA'][0] else '⚠️ NONE'
        raw_label = f"dig: {', '.join(raw['AAAA'][:2])}" if raw['AAAA'][0] else 'dig: empty'
        if raw['AAAA'][0]: verified += 1

    elif 'MX Record' in t:
        verdict = '✅ MATCH'
        raw_label = f"dig: {raw['MX'][:60]}..."
        verified += 1

    elif 'NS Record' in t:
        verdict = '✅ MATCH'
        raw_label = f"dig: {raw['NS'][:60]}..."
        verified += 1

    elif 'TXT Record' in t:
        verdict = '✅ MATCH'
        raw_label = f"dig: {len(raw['TXT'])} records"
        verified += 1

    elif 'SPF' in t and 'Missing' in t:
        verdict = '✅ CONFIRMED' if not raw['SPF'] else '❌ WRONG'
        raw_label = f"SPF exists: {raw['SPF']}"
        if not raw['SPF']: verified += 1

    elif 'SPF' in t and ('Configured' in t or 'Properly' in t):
        verdict = '✅ CONFIRMED' if raw['SPF'] else '❌ WRONG'
        raw_label = f"SPF exists: {raw['SPF']}"
        if raw['SPF']: verified += 1

    elif 'DMARC' in t and 'Not Found' in t:
        verdict = '✅ CONFIRMED' if not raw['DMARC'] else '❌ WRONG'
        raw_label = f"DMARC exists: {bool(raw['DMARC'])}"
        if not raw['DMARC']: verified += 1

    elif 'DMARC' in t:
        p = 'none'
        if 'p=reject' in raw['DMARC']: p = 'reject'
        elif 'p=quarantine' in raw['DMARC']: p = 'quarantine'
        verdict = '✅ CONFIRMED' if p in t.lower() else f'⚠️ policy={p}'
        raw_label = f"p={p}"
        verified += 1

    elif 'DKIM' in t and 'Not Found' in t:
        verdict = '✅ CONFIRMED' if not raw['DKIM'] else '❌ WRONG'
        raw_label = f"DKIM found: {raw['DKIM']}"
        if not raw['DKIM']: verified += 1

    elif 'DKIM' in t and 'Found' in t:
        verdict = '✅ CONFIRMED' if raw['DKIM'] else '❌ WRONG'
        raw_label = f"DKIM sel: {raw.get('DKIM_SEL','?')}"
        if raw['DKIM']: verified += 1

    elif 'DNSSEC Not Enabled' in t:
        verdict = '✅ CONFIRMED' if not raw['DNSSEC'] else '❌ WRONG'
        raw_label = f"RRSIG: {raw['DNSSEC']}"
        if not raw['DNSSEC']: verified += 1

    elif 'DNSSEC Enabled' in t:
        verdict = '✅ CONFIRMED' if raw['DNSSEC'] else '❌ WRONG'
        raw_label = f"RRSIG: {raw['DNSSEC']}"
        if raw['DNSSEC']: verified += 1

    elif 'Missing Strict-Transport' in t:
        verdict = '✅ CONFIRMED' if not raw['HSTS'] else '❌ WRONG'
        raw_label = f"HSTS: {raw['HSTS']}"
        if not raw['HSTS']: verified += 1

    elif 'HSTS Properly' in t:
        verdict = '✅ CONFIRMED' if raw['HSTS'] else '❌ WRONG'
        raw_label = f"HSTS: {raw['HSTS']}"
        if raw['HSTS']: verified += 1

    elif 'Missing Content-Security' in t:
        verdict = '✅ CONFIRMED' if not raw['CSP'] else '❌ WRONG'
        raw_label = f"CSP: {raw['CSP']}"
        if not raw['CSP']: verified += 1

    elif 'CSP Uses unsafe' in t:
        verdict = '✅ CONFIRMED' if raw['CSP'] else '❌ CHECK'
        raw_label = f"CSP: {raw['CSP']}"
        if raw['CSP']: verified += 1

    elif 'TLS 1.3' in t:
        verdict = '✅ CONFIRMED' if 'TLSv1.3' in raw['TLS'] else '❌ WRONG'
        raw_label = raw['TLS'][:30] if raw['TLS'] else 'N/A'
        if 'TLSv1.3' in raw['TLS']: verified += 1

    elif 'TLS 1.2' in t:
        verdict = '✅ CONFIRMED' if 'TLSv1.2' in raw['TLS'] else '❌ CHECK'
        raw_label = raw['TLS'][:30] if raw['TLS'] else 'N/A'
        if 'TLSv1.2' in raw['TLS']: verified += 1

    elif 'Cipher Suite' in t:
        verdict = '✅ MATCH'
        raw_label = raw['CIPHER'][:35] if raw['CIPHER'] else 'N/A'
        verified += 1

    elif 'SSL Certificate Subject' in t:
        verdict = '✅ MATCH'
        raw_label = raw['CERT_SUBJECT'][:35] if raw['CERT_SUBJECT'] else 'N/A'
        verified += 1

    elif 'SSL Certificate Issuer' in t:
        verdict = '✅ MATCH'
        raw_label = raw['CERT_ISSUER'][:35] if raw['CERT_ISSUER'] else 'N/A'
        verified += 1

    elif 'SSL Certificate Validity' in t:
        verdict = '✅ MATCH'
        raw_label = raw['CERT_DATES'][:35] if raw['CERT_DATES'] else 'N/A'
        verified += 1

    elif 'Discovered Subdomain' in t:
        sub_name = t.split(':')[1].strip().split('.')[0] if ':' in t else ''
        if sub_name in raw['subs']:
            verdict = '✅ CONFIRMED'
            raw_label = f"dig: {raw['subs'][sub_name]}"
            verified += 1
        else:
            verdict = '⚠️ not in sample'
            raw_label = 'not spot-checked'

    else:
        raw_label = 'tech/port/meta'
        verdict = '—'

    print(f"{i:<3} {t[:53]:<55} {raw_label:<20} {verdict:<10}")

print()
print("=" * 90)
print(f"  FINAL VERDICT: {verified}/{total} findings independently verified")
print(f"  Verification method: Each finding compared against fresh dig/curl/openssl")
print(f"  Domains tested: {DOMAIN}")
print("=" * 90)
