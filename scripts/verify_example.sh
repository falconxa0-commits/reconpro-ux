#!/bin/bash
DOMAIN="example.com"
echo ""
echo "================================================================"
echo "  INDEPENDENT VERIFICATION #2 — Target: $DOMAIN"
echo "  Method: Raw system tools, NO ReconPro code"
echo "================================================================"
echo ""

echo "--- 1. A Records ---"
echo "Command: dig +short $DOMAIN A"
dig +short $DOMAIN A
echo ""

echo "--- 2. AAAA Records ---"
dig +short $DOMAIN AAAA
echo ""

echo "--- 3. SPF Check ---"
TXT=$(dig +short $DOMAIN TXT)
echo "TXT records: $TXT"
if echo "$TXT" | grep -q "v=spf"; then
  echo ">> SPF: FOUND [ReconPro said: SPF Configured Properly >> VERIFY]"
else
  echo ">> SPF: MISSING"
fi
echo ""

echo "--- 4. DMARC ---"
DMARC=$(dig +short _dmarc.$DOMAIN TXT)
echo "DMARC: $DMARC"
POLICY=$(echo "$DMARC" | grep -oP 'p=\K[a-z]+')
echo ">> Policy: p=$POLICY  [ReconPro said: p=reject >> VERIFY]"
echo ""

echo "--- 5. DKIM (selector1) ---"
DKIM=$(dig +short selector1._domainkey.$DOMAIN TXT)
if echo "$DKIM" | grep -q "v=DKIM"; then
  echo ">> DKIM FOUND with selector1 [ReconPro said: DKIM Found (selector1) >> VERIFY]"
else
  echo ">> DKIM NOT FOUND"
fi
echo ""

echo "--- 6. DNSSEC ---"
RRSIG=$(dig +dnssec $DOMAIN A 2>/dev/null | grep -c "RRSIG")
echo "RRSIG count: $RRSIG"
if [ $RRSIG -gt 0 ]; then
  echo ">> DNSSEC: YES"
else
  echo ">> DNSSEC: NO [ReconPro said: DNSSEC Not Enabled >> VERIFY]"
fi
echo ""

echo "--- 7. HTTP Headers ---"
HEADERS=$(curl -sI https://$DOMAIN 2>/dev/null)
echo "$HEADERS"
echo ""

echo -n "HSTS:    "
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  echo "FOUND"; else echo "MISSING [ReconPro said: Missing HSTS >> VERIFY]"; fi

echo -n "CSP:     "
if echo "$HEADERS" | grep -qi "content-security-policy"; then
  echo "FOUND"; else echo "MISSING [ReconPro said: Missing CSP >> VERIFY]"; fi

echo -n "X-Frame: "
if echo "$HEADERS" | grep -qi "x-frame-options"; then
  echo "FOUND"; else echo "MISSING [ReconPro said: Missing X-Frame-Options >> VERIFY]"; fi

echo -n "Server:  "
echo "$HEADERS" | grep -i "^server:" || echo "NONE"
echo ""

echo "--- 8. SSL Certificate ---"
echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null
echo ""

echo "--- 9. TLS Protocol & Cipher ---"
echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>&1 | grep -E 'Protocol|Cipher'
echo ""

echo "--- 10. Subdomain: www ---"
IP=$(dig +short www.$DOMAIN A | head -1)
if [ -n "$IP" ]; then echo "VERIFIED: www.$DOMAIN -> $IP [ReconPro said: Discovered >> VERIFY]"; else echo "NOT FOUND"; fi
echo ""

echo "--- Certificate Expiry Check ---"
NB=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$NB" ]; then
  EXPIRY_EPOCH=$(date -d "$NB" +%s 2>/dev/null)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  echo "Certificate expires: $NB"
  echo "Days remaining: $DAYS_LEFT"
  echo ">> [ReconPro said: Expiring in ~39 days >> VERIFY — actual: ${DAYS_LEFT} days]"
fi
echo ""
echo "================================================================"
echo "  VERIFICATION #2 COMPLETE"
echo "================================================================"
