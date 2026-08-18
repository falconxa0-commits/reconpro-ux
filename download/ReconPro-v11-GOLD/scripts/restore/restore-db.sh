#!/usr/bin/env bash
set -euo pipefail
[ -z ${1:-} ] && echo Usage && exit 1
bash database/backup/restore.sh $1
