#!/usr/bin/env bash
set -euo pipefail
echo "ReconPro v11.0.0 INFERNO - Install"
PYTHON=""
for cmd in python3.12 python3.11 python3.10 python3.9 python3.8 python3; do
    command -v "$cmd" &>/dev/null && PYTHON="$cmd" && break
done
[ -z "$PYTHON" ] && echo "ERROR: Python 3.8+ required." && exit 1
echo "Using: $PYTHON ($($PYTHON --version 2>&1))"
[ ! -d ".venv" ] && $PYTHON -m venv .venv
source .venv/bin/activate
pip install --upgrade pip --quiet
echo "Installing ReconPro..."
pip install reconpro-11.0.0-py3-none-any.whl --quiet
reconpro --version
echo "Done."
