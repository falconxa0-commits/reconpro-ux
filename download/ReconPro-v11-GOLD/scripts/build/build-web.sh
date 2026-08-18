#!/usr/bin/env bash
set -euo pipefail
cd web && npm ci && npx prisma generate && npm run build
echo 'Build complete.'
