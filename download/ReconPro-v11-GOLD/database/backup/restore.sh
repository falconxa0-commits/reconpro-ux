#!/usr/bin/env bash
set -euo pipefail
[ -z "${1:-}" ] && echo "Usage: restore.sh <backup>" && exit 1
BACKUP_FILE="$1"
DB_PATH="${DATABASE_URL:-file:/app/db/reconpro.db}"
[ -f "$BACKUP_FILE" ] || { echo "Not found: $BACKUP_FILE"; exit 1; }
if [[ "$DB_PATH" == file:* ]]; then
    DB_FILE="${DB_PATH#file:}"
    mkdir -p "$(dirname "$DB_FILE")"
    [[ "$BACKUP_FILE" == *.gz ]] && gunzip -c "$BACKUP_FILE" > "$DB_FILE" || cp "$BACKUP_FILE" "$DB_FILE"
    echo "Restored to: $DB_FILE"
fi
