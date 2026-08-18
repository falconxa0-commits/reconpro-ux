#!/usr/bin/env bash
set -euo pipefail
DB_PATH="${DATABASE_URL:-file:/app/db/reconpro.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
if [[ "$DB_PATH" == file:* ]]; then
    DB_FILE="${DB_PATH#file:}"
    [ -f "$DB_FILE" ] || { echo "DB not found: $DB_FILE"; exit 1; }
    cp "$DB_FILE" "$BACKUP_DIR/reconpro_${TIMESTAMP}.db"
    gzip "$BACKUP_DIR/reconpro_${TIMESTAMP}.db"
    echo "Backup: $BACKUP_DIR/reconpro_${TIMESTAMP}.db.gz"
fi
ls -t "$BACKUP_DIR"/*.gz 2>/dev/null | tail -n +31 | xargs -r rm --
