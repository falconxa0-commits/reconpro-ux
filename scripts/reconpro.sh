#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# ReconPro UNIFIED — One-Command Launcher
# ══════════════════════════════════════════════════════════════════════════════
# Usage:
#   ./reconpro.sh                          # interactive menu
#   ./reconpro.sh <host>                   # full unified scan
#   ./reconpro.sh <host> --modules recon   # selective scan
#   ./reconpro.sh --wishes                 # ask the oracle for 8 wishes
#   ./reconpro.sh --grant-wishes           # grant the 8 wishes
#   ./reconpro.sh --list                   # list modules
#
# Installs Python rich automatically if missing. No other deps required.
# ══════════════════════════════════════════════════════════════════════════════

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECONPRO_PY="$SCRIPT_DIR/reconpro.py"

# ─── Auto-install rich if missing ────────────────────────────────────────────
if ! python3 -c "import rich" 2>/dev/null; then
  echo "[*] Installing python-rich for advanced terminal visuals..."
  pip install --quiet rich 2>&1 | tail -1 || pip3 install --quiet rich
fi

# ─── Verify the engine exists ────────────────────────────────────────────────
if [ ! -f "$RECONPRO_PY" ]; then
  echo "[!] reconpro.py not found at $RECONPRO_PY"
  exit 1
fi

# ─── Run it ──────────────────────────────────────────────────────────────────
exec python3 -u "$RECONPRO_PY" "$@"
