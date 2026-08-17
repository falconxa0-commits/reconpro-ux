#!/usr/bin/env bash
set -euo pipefail
echo "Building ReconPro web dashboard..."
cd web
npm ci
npx prisma generate
npm run build
echo "Build complete: .next/standalone/"
