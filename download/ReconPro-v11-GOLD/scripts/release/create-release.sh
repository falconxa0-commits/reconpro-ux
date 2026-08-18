#!/usr/bin/env bash
set -euo pipefail
bash scripts/build/build-docker.sh && bash scripts/verify/verify-all.sh
echo ''; sha256sum ReconPro-v11-GOLD.zip
