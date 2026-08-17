#!/usr/bin/env bash
set -euo pipefail
echo "=== ReconPro v11.0.0 — Quick Install ==="
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install python/dist/reconpro-11.0.0-py3-none-any.whl
echo ""
echo "Installation complete. Activate with: source .venv/bin/activate"
echo "Run: reconpro --help"
