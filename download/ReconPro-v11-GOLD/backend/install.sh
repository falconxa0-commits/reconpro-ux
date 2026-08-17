#!/usr/bin/env bash
set -euo pipefail
echo "╔══════════════════════════════════════════════════╗"
echo "║  ReconPro v11.0.0 INFERNO — Installation       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Detect Python
PYTHON=""
for cmd in python3.12 python3.11 python3.10 python3.9 python3.8 python3; do
    if command -v "$cmd" &>/dev/null; then
        PYTHON="$cmd"
        break
    fi
done

if [ -z "$PYTHON" ]; then
    echo "ERROR: Python 3.8+ required but not found."
    exit 1
fi

echo "Using: $PYTHON ($($PYTHON --version 2>&1))"

# Create venv
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON -m venv .venv
fi

echo "Activating venv..."
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip --quiet

# Install wheel
echo "Installing ReconPro v11.0.0..."
pip install reconpro-11.0.0-py3-none-any.whl --quiet

# Verify
echo ""
echo "Verifying installation..."
reconpro --version
echo ""
echo "Installation complete. Run: reconpro --help"
