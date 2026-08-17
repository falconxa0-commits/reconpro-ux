#!/usr/bin/env bash
set -euo pipefail
echo "ReconPro v11.0.0 — Create Release Archive"
bash scripts/build/build-wheel.sh
bash scripts/build/build-web.sh
bash scripts/verify/verify-all.sh
echo ""
echo "Archive contents:"
du -sh ReconPro-v11-GOLD/
echo ""
sha256sum ReconPro-v11-GOLD.zip
echo ""
echo "Release ready."
