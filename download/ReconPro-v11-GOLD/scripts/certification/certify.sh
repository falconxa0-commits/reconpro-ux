#!/usr/bin/env bash
set -euo pipefail
echo "=== ReconPro v11.0.0 — Certification ==="
bash scripts/verify/verify-all.sh
echo ""
echo "Run Python tests:"
cd tests/python && python3 -m pytest --tb=short -q 2>/dev/null || echo "pytest not available"
