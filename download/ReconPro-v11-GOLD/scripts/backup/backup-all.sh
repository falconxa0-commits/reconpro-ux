#!/usr/bin/env bash
set -euo pipefail
echo Full Backup
BACKUP_DIR=./backups/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
bash database/backup/backup.sh 2>/dev/null
echo Done
