#!/usr/bin/env bash
set -euo pipefail
# ReconPro v11.0.0 — Database Restore Script

BACKUP_FILE="${1:?Usage: restore.sh <backup_file>}"
DB_PATH="${DATABASE_URL:-file:/app/db/reconpro.db}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup not found: $BACKUP_FILE"
    exit 1
fi

if [[ "$DB_PATH" == file:* ]]; then
    DB_FILE="${DB_PATH#file:}"
    mkdir -p "$(dirname "$DB_FILE")"
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" > "$DB_FILE"
    else
        cp "$BACKUP_FILE" "$DB_FILE"
    fi
    echo "Restored to: $DB_FILE"
elif [[ "$DB_PATH" == postgresql:* ]]; then
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | psql "$DB_PATH"
    else
        psql "$DB_PATH" < "$BACKUP_FILE"
    fi
    echo "Restored to PostgreSQL"
fi

echo "Restore complete."
