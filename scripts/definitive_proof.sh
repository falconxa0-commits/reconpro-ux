#!/bin/bash
set -euo pipefail

DOMAIN="${1:-stripe.com}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  DEFINITIVE PROOF: Raw Tool Output for $DOMAIN"     
echo "║  Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"                 
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. DNS A/AAAA Records ──
echo "━━━ DNS A RECORDS ━━━"
dig +short A "$DOMAIN" 2>/dev/null || echo "N/A"
echo ""

echo "━━━ DNS AAAA RECORDS ━━━"
dig +short AAAA "$DOMAIN" 2>/dev/null || echo "N/A"
echo ""

# ── 2. DNS MX Records ──
echo "━━━ DNS MX RECORDS ━━━"
dig +short MX "$DOMAIN" 2>/dev/null || echo "N/A"
echo ""

# ── 3. DNS NS Records ──
echo "━━━ DNS NS RECORDS ━━━"
dig +short NS "$DOMAIN" 2>/dev/null || echo "N/A"
echo ""

# ── 4. DNS TXT Records (SPF, DMARC-adjacent) ──
echo "━━━ DNS TXT RECORDS ━━━"
dig +short TXT "$DOMAIN" 2>/dev/null || echo "N/A"
echo ""

# ── 5. DMARC Record ──
echo "━━━ DMARC RECORD (_dmarc.$DOMAIN) ━━━"
dig +short TXT "_dmarc.$DOMAIN" 2>/dev/null || echo "N/A"
echo ""

# ── 6. HTTP Headers ──
echo "━━━ HTTP RESPONSE HEADERS (https://$DOMAIN) ━━━"
curl -sI -L --max-time 15 "https://$DOMAIN" 2>/dev/null | head -50 || echo "N/A"
echo ""

# ── 7. SSL/TLS Certificate ──
echo "━━━ SSL/TLS CERTIFICATE INFO ━━━"
echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | grep -E '(subject=|issuer=|notAfter=|Protocol|Cipher)' | head -10 || echo "N/A"
echo ""

# ── 8. Security Headers Check ──
echo "━━━ SECURITY HEADER ANALYSIS ━━━"
HEADERS=$(curl -sI -L --max-time 15 "https://$domain" 2>/dev/null)

for header in "strict-transport-security" "content-security-policy" "x-frame-options" "x-content-type-options" "x-xss-protection" "referrer-policy" "permissions-policy" "cross-origin-opener-policy" "cross-origin-resource-policy"; do
    VAL=$(echo "$HEADERS" | grep -i "$header" | head -1 | tr -d '\r')
    if [ -n "$VAL" ]; then
        echo "✅ PRESENT: $VAL"
    else
        echo "❌ MISSING: $header"
    fi
done
echo ""

# ── 9. Server Header Disclosure ──
echo "━━━ SERVER HEADER DISCLOSURE ━━━"
echo "$HEADERS" | grep -i "^server:" | head -1 || echo "Server header not exposed"
echo ""

# ── 10. SPF Record Analysis ──
echo "━━━ SPF ANALYSIS ━━━"
SPF=$(dig +short TXT "$DOMAIN" 2>/dev/null | tr -d '"' | grep -i "v=spf1" || true)
if [ -n "$SPF" ]; then
    echo "SPF Record: $SPF"
    echo "$SPF" | grep -qi "+all" && echo "⚠️ SPF allows +all (open relay)" || true
    echo "$SPF" | grep -qi "?all" && echo "⚠️ SPF uses ?all (neutral)" || true  
    echo "$SPF" | grep -qi "~all" && echo "✅ SPF uses ~all (softfail)" || true
    echo "$SPF" | grep -qi "-all" && echo "✅ SPF uses -all (hardfail)" || true
    if echo "$SPF" | grep -qi "include:"; then
        INCLUDES=$(echo "$SPF" | grep -oP 'include:\S+' || true)
        echo "Third-party includes: $INCLUDES"
    fi
else
    echo "❌ NO SPF RECORD FOUND"
fi
echo ""

# ── 11. DNSSEC Validation ──
echo "━━━ DNSSEC CHECK ━━━"
dig +dnssec "$DOMAIN" A 2>/dev/null | grep -E '(RRSIG|NOERROR|SERVFAIL)' | head -5 || echo "N/A"
echo ""

# ── 12. Port Probing ──
echo "━━━ COMMON PORT PROBE ━━━"
for PORT in 80 443 8080 8443 3000; do
    RESULT=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN:$PORT" 2>/dev/null || echo "timeout")
    if [ "$RESULT" != "timeout" ] && [ "$RESULT" != "000" ]; then
        echo "Port $PORT: OPEN (HTTP $RESULT)"
    else
        RESULT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$DOMAIN:$PORT" 2>/dev/null || echo "timeout")
        if [ "$RESULT_HTTP" != "timeout" ] && [ "$RESULT_HTTP" != "000" ]; then
            echo "Port $PORT: OPEN (HTTP $RESULT_HTTP)"
        else
            echo "Port $PORT: closed/filtered"
        fi
    fi
done
echo ""

echo "══════════════════════════════════════════════════════════════════"
echo "END OF RAW TOOL OUTPUT"
echo "══════════════════════════════════════════════════════════════════"
