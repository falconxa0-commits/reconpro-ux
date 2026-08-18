#!/usr/bin/env bash
set -euo pipefail
docker compose -f deployment/docker/docker-compose.yml up -d
