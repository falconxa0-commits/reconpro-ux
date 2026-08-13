#!/bin/bash
# Fix rate-limit IP spoofing vulnerability across all API routes
# Replaces: checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', ...)
# With:     checkRateLimit(extractClientIP(request), ...)

set -euo pipefail

cd /home/z/my-project/src/app/api

FIXED=0
for file in $(rg -l "x-forwarded-for.*\|\| 'unknown'" . --include="*.ts" 2>/dev/null); do
  # Skip if already uses extractClientIP
  if rg -q "extractClientIP" "$file" 2>/dev/null; then
    echo "SKIP (already fixed): $file"
    continue
  fi

  # Determine the request variable name
  REQ_VAR="request"
  if rg -q "checkRateLimit\(req\." "$file" 2>/dev/null; then
    REQ_VAR="req"
  elif rg -q "checkRateLimit\(_req\." "$file" 2>/dev/null; then
    REQ_VAR="_req"
  fi

  # Check if api-protection is already imported
  if rg -q "from '@/lib/api-protection'" "$file" 2>/dev/null; then
    # Add extractClientIP to existing import
    sed -i "s/import { \([^}]*\) } from '@/lib\/api-protection'/import { \1, extractClientIP } from '@\/lib\/api-protection'/" "$file"
  elif rg -q "import.*checkRateLimit.*from" "$file" 2>/dev/null; then
    # Add new import after the checkRateLimit import
    sed -i "/import.*checkRateLimit/a import { extractClientIP } from '@/lib/api-protection';" "$file"
  else
    # Add import at top after other imports
    sed -i "1s/^/import { extractClientIP } from '@\/lib\/api-protection';\n/" "$file"
  fi

  # Replace the vulnerable pattern
  # Pattern 1: request.headers.get('x-forwarded-for') || 'unknown'
  sed -i "s/checkRateLimit(${REQ_VAR}\\.headers\\.get('x-forwarded-for') || 'unknown'/checkRateLimit(extractClientIP(${REQ_VAR})/g" "$file"

  FIXED=$((FIXED + 1))
  echo "FIXED: $file"
done

echo ""
echo "=== FIXED $FIXED files ==="
