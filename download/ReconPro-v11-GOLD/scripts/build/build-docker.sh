#!/usr/bin/env bash
set -euo pipefail
docker build -t reconpro:11.0.0 -f deployment/docker/Dockerfile .
echo 'Docker image built.'
