#!/usr/bin/env bash
set -euo pipefail
echo "Deploying ReconPro via Docker Compose..."
docker compose -f deployment/docker-compose.yml up -d
echo "Deployed. Health: http://localhost:3000/api/health"
