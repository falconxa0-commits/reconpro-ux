#!/usr/bin/env bash
set -euo pipefail
[ -z "${1:-}" ] && echo "Usage: restore-db.sh <backup_file>" && exit 1
bash database/backup/restore.sh "$1"
