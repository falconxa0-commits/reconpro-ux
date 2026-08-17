#!/usr/bin/env bash
set -euo pipefail
echo "ReconPro v11.0.0 — Full Backup"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Backing up to: $BACKUP_DIR"
# Database
bash database/backup/backup.sh
# Config
cp -r deployment/.env.example "$BACKUP_DIR/env.example"
echo "Backup complete: $BACKUP_DIR"
