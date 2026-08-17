#!/bin/bash
# ReconPro v0.2.0 — Create Release Package
# Run from project root: bash scripts/release-package.sh

set -euo pipefail

VERSION="0.2.0"
RELEASE_DIR="release/reconpro-v${VERSION}"
ARCHIVE_NAME="reconpro-v${VERSION}"

echo "=== ReconPro v${VERSION} — Release Package Builder ==="

# ── Clean previous release ───────────────────────────────────────────
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# ── Copy application files ──────────────────────────────────────────
echo "[1/6] Copying application files..."
cp -r src/ "$RELEASE_DIR/src/"
cp -r prisma/ "$RELEASE_DIR/prisma/"
cp -r public/ "$RELEASE_DIR/public/"
cp package.json "$RELEASE_DIR/"
cp package-lock.json "$RELEASE_DIR/" 2>/dev/null || true
cp tsconfig.json "$RELEASE_DIR/"
cp next.config.ts "$RELEASE_DIR/" 2>/dev/null || cp next.config.js "$RELEASE_DIR/" 2>/dev/null || true
cp tailwind.config.ts "$RELEASE_DIR/" 2>/dev/null || true
cp postcss.config.mjs "$RELEASE_DIR/" 2>/dev/null || true
cp .dockerignore "$RELEASE_DIR/"
cp Dockerfile "$RELEASE_DIR/"
cp docker-compose.yml "$RELEASE_DIR/"
cp production.env.example "$RELEASE_DIR/"

# ── Copy documentation ──────────────────────────────────────────────
echo "[2/6] Copying documentation..."
mkdir -p "$RELEASE_DIR/docs"
cp README.md "$RELEASE_DIR/" 2>/dev/null || true
cp LICENSE "$RELEASE_DIR/" 2>/dev/null || true
cp CHANGELOG.md "$RELEASE_DIR/" 2>/dev/null || true
cp docs/*.md "$RELEASE_DIR/docs/" 2>/dev/null || true

# ── Copy deployment configs ─────────────────────────────────────────
echo "[3/6] Copying deployment configs..."
mkdir -p "$RELEASE_DIR/deploy"
cp -r deploy/* "$RELEASE_DIR/deploy/" 2>/dev/null || true

# ── Copy scripts ────────────────────────────────────────────────────
echo "[4/6] Copying scripts..."
mkdir -p "$RELEASE_DIR/scripts"
cp scripts/seed.js "$RELEASE_DIR/scripts/" 2>/dev/null || true

# ── Create release manifests ─────────────────────────────────────────
echo "[5/6] Creating release manifests..."
cat > "$RELEASE_DIR/MANIFEST" << EOF
ReconPro v${VERSION}
Build Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')
Node: $(node --version)
EOF

SHA256=$(find "$RELEASE_DIR" -type f -exec sha256sum {} \; 2>/dev/null | sort | sha256sum | awk '{print $1}')
echo "SHA256: $SHA256" >> "$RELEASE_DIR/MANIFEST"

# ── Create archives ──────────────────────────────────────────────────
echo "[6/6] Creating archives..."
cd release
tar -czf "${ARCHIVE_NAME}.tar.gz" "reconpro-v${VERSION}/"
zip -rq "${ARCHIVE_NAME}.zip" "reconpro-v${VERSION}/"
cd ..

echo ""
echo "=== Release Package Complete ==="
echo "  Directory: release/reconpro-v${VERSION}/"
echo "  Tarball:   release/${ARCHIVE_NAME}.tar.gz"
echo "  Zip:       release/${ARCHIVE_NAME}.zip"
echo "  SHA256:    $SHA256"
echo ""
ls -lh release/${ARCHIVE_NAME}.*
