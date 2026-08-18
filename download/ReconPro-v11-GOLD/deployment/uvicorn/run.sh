#!/usr/bin/env bash
set -euo pipefail
HOST="${RECONPRO_HOST:-0.0.0.0}"
PORT="${RECONPRO_PORT:-8000}"
WORKERS="${RECONPRO_WORKERS:-4}"
exec uvicorn reconpro.api:app --host "$HOST" --port "$PORT" --workers "$WORKERS" --log-level info --access-log
