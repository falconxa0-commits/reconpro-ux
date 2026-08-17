#!/usr/bin/env bash
set -euo pipefail
echo "Building ReconPro v11.0.0 wheel..."
cd reconpro-work
rm -rf build/ dist/ *.egg-info
pip install --upgrade build
python -m build --wheel --sdist
echo "Built:"
ls -lh dist/
