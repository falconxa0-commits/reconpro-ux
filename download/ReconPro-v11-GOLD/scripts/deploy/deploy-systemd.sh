#!/usr/bin/env bash
set -euo pipefail
echo "Deploying ReconPro via systemd..."
sudo cp deployment/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable reconpro
sudo systemctl start reconpro
sudo systemctl status reconpro
