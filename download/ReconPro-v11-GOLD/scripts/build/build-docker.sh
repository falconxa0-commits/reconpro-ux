#!/usr/bin/env bash
set -euo pipefail
echo "Building ReconPro Docker images..."
docker build -t reconpro:11.0.0 -f deployment/Dockerfile .
docker build -t reconpro-cli:11.0.0 -f deployment/python-cli/Dockerfile .
echo "Images built:"
docker images | grep reconpro
