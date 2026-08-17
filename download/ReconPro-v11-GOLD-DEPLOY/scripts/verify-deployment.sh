#!/usr/bin/env bash
set -euo pipefail
echo "=== ReconPro v11.0.0 — Post-Install Verification ==="
echo ""

# Check Python CLI
echo "[1/4] Python CLI..."
if command -v reconpro &>/dev/null; then
    VERSION=$(reconpro --version 2>&1)
    echo "  reconpro --version: $VERSION"
else
    echo "  WARNING: reconpro not found in PATH"
fi

# Check wheel
echo "[2/4] Wheel integrity..."
if [ -f "python/dist/reconpro-11.0.0-py3-none-any.whl" ]; then
    echo "  Wheel: $(ls -lh python/dist/reconpro-11.0.0-py3-none-any.whl | awk '{print $5}')"
else
    echo "  WARNING: Wheel not found"
fi

# Check web app
echo "[3/4] Web application..."
if [ -f "web/package.json" ]; then
    echo "  package.json: $(wc -c < web/package.json) bytes"
else
    echo "  WARNING: web/package.json not found"
fi

# Check deployment files
echo "[4/4] Deployment files..."
for f in deploy/Dockerfile deploy/docker-compose.yml deploy/nginx/reconpro.conf deploy/systemd/reconpro.service deploy/.env.example deploy/vercel.json; do
    if [ -f "$f" ]; then
        echo "  OK: $f"
    else
        echo "  MISSING: $f"
    fi
done

echo ""
echo "Verification complete."
