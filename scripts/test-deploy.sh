#!/bin/bash
# Comprehensive route testing against live Vercel deployment

BASE="https://reconpro-ux.vercel.app"
PASS=0
FAIL=0
TOTAL=0

test_route() {
  local method=$1 route=$2 expected_code=$3 label=$4
  local resp
  resp=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" --max-time 10 "$BASE$route")
  TOTAL=$((TOTAL+1))
  if [ "$resp" = "$expected_code" ]; then
    echo "  PASS $method $route -> $resp ($label)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $method $route -> $resp (expected $expected_code) ($label)"
    FAIL=$((FAIL+1))
  fi
}

test_header() {
  local route=$1 header=$2 expected=$3 label=$4
  local val
  val=$(curl -sI --max-time 10 "$BASE$route" | rg -i "$header" | head -1)
  TOTAL=$((TOTAL+1))
  if echo "$val" | rg -qi "$expected"; then
    echo "  PASS $route $header contains '$expected' ($label)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $route $header missing '$expected' got: $val ($label)"
    FAIL=$((FAIL+1))
  fi
}

echo "========================================"
echo "ROUTE STATUS CODE TESTS"
echo "========================================"

# Public pages (expect 200)
for route in / /login /register /forgot-password /about /pricing /docs \
  /enterprise /security /careers /contact /status /roadmap /changelog \
  /privacy /terms /cookies /trust /api-overview; do
  test_route GET "$route" 200 "public page"
done

# Dashboard routes (expect 307 redirect to login)
for route in /overview /scans /findings /monitoring /compliance /teams /integrations /settings; do
  test_route GET "$route" 307 "protected -> login redirect"
done

# API health (expect 200)
test_route GET /api/health 200 "health check"

# API auth routes (GET -> 405, POST needs body)
test_route GET /api/auth/login 405 "login GET=405"
test_route GET /api/auth/logout 405 "logout GET=405"
test_route GET /api/auth/register 405 "register GET=405"

# Protected API routes (expect 401)
for route in /api/dashboard /api/scans /api/teams /api/integrations \
  /api/compliance /api/monitoring /api/threats /api/reports /api/members \
  /api/audit /api/executive; do
  test_route GET "$route" 401 "protected API"
done

echo ""
echo "========================================"
echo "CSP HEADER TESTS"
echo "========================================"

test_header / "content-security-policy" "unsafe-inline" "CSP allows inline scripts"
test_header / "content-security-policy" "img-src" "CSP has img-src"
test_header / "x-frame-options" "DENY" "X-Frame-Options DENY"
test_header / "x-content-type-options" "nosniff" "X-Content-Type-Options"
test_header / "strict-transport-security" "max-age" "HSTS present"
test_header / "referrer-policy" "strict-origin" "Referrer-Policy"

# Verify NO nonce header (removed in cleanup)
echo ""
NONCE_CHECK=$(curl -sI --max-time 10 "$BASE/" | rg -i "x-content-security-policy-nonce")
TOTAL=$((TOTAL+1))
if [ -z "$NONCE_CHECK" ]; then
  echo "  PASS No nonce header (removed)"
  PASS=$((PASS+1))
else
  echo "  FAIL Nonce header still present: $NONCE_CHECK"
  FAIL=$((FAIL+1))
fi

echo ""
echo "========================================"
echo "STATIC ASSET TESTS"
echo "========================================"

test_route GET /favicon.svg 200 "favicon"
test_route GET /logo.svg 200 "logo"
test_route GET /manifest.json 200 "manifest"
test_route GET /robots.txt 200 "robots"

# JS chunks (all should be 200)
for chunk in d59f830a2b8e768c 45e87443bf4afd1a 0d6c6744ebdc908a f7e760a99339b65f f9573229f9efe5e8 ff1a16fafef87110 694836347d1e5ef3 ae8f6e216296d46a a7371ae655d0d84b b5c02e11bb73554a 22286ab6be654094 591299dee3db6b46 turbopack-00ef63ac548ed6c2 187e721df5fb74ea; do
  test_route GET "/_next/static/chunks/${chunk}.js" 200 "JS chunk ${chunk:0:12}..."
done

# CSS files
test_route GET "/_next/static/chunks/a54f1930ffaf8a9d.css" 200 "CSS chunk 1"
test_route GET "/_next/static/chunks/1975b6b2153665a8.css" 200 "CSS chunk 2"

echo ""
echo "========================================"
echo "CONTENT VERIFICATION"
echo "========================================"

# Landing page has real content (not just spinner)
LANDING=$(curl -s --max-time 10 "$BASE/")
TOTAL=$((TOTAL+1))
if echo "$LANDING" | rg -q "Attack Surface Intelligence Platform"; then
  echo "  PASS Landing page has hero content"
  PASS=$((PASS+1))
else
  echo "  FAIL Landing page missing hero content"
  FAIL=$((FAIL+1))
fi

TOTAL=$((TOTAL+1))
if echo "$LANDING" | rg -q "ReconPro"; then
  echo "  PASS Landing page has ReconPro branding"
  PASS=$((PASS+1))
else
  echo "  FAIL Landing page missing ReconPro branding"
  FAIL=$((FAIL+1))
fi

# Login page has form
LOGIN=$(curl -s --max-time 10 "$BASE/login")
TOTAL=$((TOTAL+1))
if echo "$LOGIN" | rg -q "Sign in to your account"; then
  echo "  PASS Login page has sign-in form"
  PASS=$((PASS+1))
else
  echo "  FAIL Login page missing sign-in form"
  FAIL=$((FAIL+1))
fi

TOTAL=$((TOTAL+1))
if echo "$LOGIN" | rg -q 'type="email"'; then
  echo "  PASS Login page has email input"
  PASS=$((PASS+1))
else
  echo "  FAIL Login page missing email input"
  FAIL=$((FAIL+1))
fi

TOTAL=$((TOTAL+1))
if echo "$LOGIN" | rg -q 'type="password"'; then
  echo "  PASS Login page has password input"
  PASS=$((PASS+1))
else
  echo "  FAIL Login page missing password input"
  FAIL=$((FAIL+1))
fi

echo ""
echo "========================================"
echo "RESULTS: $PASS/$TOTAL passed, $FAIL failed"
echo "========================================"
if [ $FAIL -eq 0 ]; then
  echo "ALL TESTS PASSED"
fi
exit $FAIL