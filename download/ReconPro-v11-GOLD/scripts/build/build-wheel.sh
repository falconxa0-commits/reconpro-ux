#!/usr/bin/env bash
set -euo pipefail
echo 'Building wheel...'
cd backend && pip install --upgrade build && pip install reconpro-11.0.0-py3-none-any.whl --force-reinstall --no-deps
