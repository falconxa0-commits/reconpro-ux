#!/usr/bin/env bash
set -euo pipefail
RESOURCE_GROUP="reconpro-prod"
IMAGE="${ACR_REGISTRY:-reconpro}.azurecr.io/reconpro:11.0.0"
az containerapp up --resource-group "$RESOURCE_GROUP" --name reconpro-web --image "$IMAGE" --target-port 3000 --ingress external --yes
