#!/usr/bin/env bash
set -euo pipefail
# ReconPro v11.0.0 — Database Backup Script

DB_PATH="${DATABASE_URL:-file:/app/db/reconpro.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

if [[ "$DB_PATH" == file:* ]]; then
    DB_FILE="${DB_PATH#file:}"
    if [ -f "$DB_FILE" ]; then
        cp "$DB_FILE" "$BACKUP_DIR/reconpro_${TIMESTAMP}.db"
        gzip "$BACKUP_DIR/reconpro_${TIMESTAMP}.db"
        echo "Backup created: $BACKUP_DIR/reconpro_${TIMESTAMP}.db.gz"
    else
        echo "Database file not found: $DB_FILE"
        exit 1
    fi
elif [[ "$DB_PATH" == postgresql:* ]]; then
    pg_dump "$DB_PATH" > "$BACKUP_DIR/reconpro_${TIMESTAMP}.sql"
    gzip "$BACKUP_DIR/reconpro_${TIMESTAMP}.sql"
    echo "Backup created: $BACKUP_DIR/reconpro_${TIMESTAMP}.sql.gz"
else
    echo "Unsupported DATABASE_URL format"
    exit 1
fi

# Cleanup old backups (keep last 30)
ls -t "$BACKUP_DIR"/*.gz 2>/dev/null | tail -n +31 | xargs -r rm --
echo "Cleanup complete."
