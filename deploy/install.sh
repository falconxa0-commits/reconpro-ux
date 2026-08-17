# ReconPro — Quick Deploy Script (Ubuntu/Debian VPS)
# Usage: curl -fsSL https://raw.githubusercontent.com/reconpro/reconpro/main/deploy/install.sh | bash

set -euo pipefail

APP_DIR="/opt/reconpro"
APP_USER="reconpro"
NODE_VERSION="20"

echo "=== ReconPro v0.2.0 — Production Install ==="

# ── 1. Install Node.js ────────────────────────────────────────────────
echo "[1/8] Installing Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
    apt-get install -y nodejs
fi
echo "  Node.js $(node --version)"

# ── 2. Create application user ──────────────────────────────────────────
echo "[2/8] Creating user '$APP_USER'..."
id -u $APP_USER &> /dev/null || useradd -r -s /bin/false -d $APP_DIR $APP_USER

# ── 3. Clone / Copy application ────────────────────────────────────────
echo "[3/8] Deploying application to $APP_DIR..."
mkdir -p $APP_DIR/db
if [ -d "$APP_DIR/.next" ]; then
    echo "  Existing build found. Pulling latest..."
    # git -C $APP_DIR pull --ff-only  # Uncomment for git-based deploys
fi

# ── 4. Install dependencies ───────────────────────────────────────────
echo "[4/8] Installing dependencies..."
cd $APP_DIR
npm ci --omit=dev
npx prisma generate

# ── 5. Build application ───────────────────────────────────────────────
echo "[5/8] Building application..."
NODE_ENV=production npm run build

# ── 6. Setup environment ───────────────────────────────────────────────
echo "[6/8] Configuring environment..."
if [ ! -f "$APP_DIR/.env" ]; then
    cp production.env.example "$APP_DIR/.env"
    echo "  IMPORTANT: Edit $APP_DIR/.env with your configuration."
fi

# ── 7. Setup database ─────────────────────────────────────────────────
echo "[7/8] Initializing database..."
npx prisma db push

# ── 8. Install systemd service ────────────────────────────────────────
echo "[8/8] Installing systemd service..."
cp deploy/systemd/reconpro.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable reconpro
systemctl start reconpro

echo ""
echo "=== ReconPro is running ==="
echo "  URL:       http://$(hostname -I | awk '{print $1}'):3000"
echo "  Health:    http://$(hostname -I | awk '{print $1}'):3000/api/health"
echo "  Logs:      journalctl -u reconpro -f"
echo "  Config:    $APP_DIR/.env"
echo "  DB:        $APP_DIR/db/reconpro.db"
echo ""
echo "Next steps:"
echo "  1. Configure Nginx reverse proxy with TLS"
echo "  2. Update DNS to point to this server"
echo "  3. Create admin account via /register"
