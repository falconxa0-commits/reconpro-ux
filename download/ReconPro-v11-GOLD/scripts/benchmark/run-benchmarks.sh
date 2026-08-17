#!/usr/bin/env bash
set -euo pipefail
echo "ReconPro v11.0.0 — Benchmarks"
echo "CLI startup:"
time reconpro --version 2>&1
echo ""
echo "Memory usage:"
ps -o rss,comm -p $(pgrep -f "reconpro" | head -1) 2>/dev/null || echo "N/A"
echo ""
echo "Run Python benchmark tests:"
cd tests/benchmark && python3 -m pytest -v 2>/dev/null || echo "pytest not available"
