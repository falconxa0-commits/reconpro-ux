#!/usr/bin/env python3
"""Splice the 3 bundle script parts into one complete file."""
from pathlib import Path

base = Path("/home/z/my-project/scripts")

# Part 1: up to and including the _helpers.tpl wf() call (ends at line ~761 with """ )
with open(base / "omega_final_bundle.py") as f:
    lines1 = f.readlines()

# Find where to cut part1
# Line 761 is '"""  )' (closing _helpers.tpl), line 762 is empty, line 763 is truncated
# We want to keep up to and including line 761
for i in range(len(lines1)-1, -1, -1):
    if '"""' in lines1[i] and i > 700:
        cut1 = i + 1
        break

print(f"Part 1: keeping {cut1} of {len(lines1)} lines")

# Part 2: the scripts + manifests + examples + licenses content
with open(base / "_bundle_part2.py") as f:
    part2 = f.read()

# Part 3: validation + ZIP + final report
with open(base / "_bundle_final.py") as f:
    part3 = f.read()

# The missing middle content (Helm README through end of deployment section)
# This starts with a complete wf() call since we cut part1 before the truncated line
middle = '''wf(dp / "helm/README.md", """# ReconPro Helm Chart

## Quick Start

```bash
helm install reconpro deployment/helm/ \\
  --set image.tag=11.0.0 \\
  --set ingress.enabled=true
```", """# ReconPro Helm Chart

## Quick Start

```bash
helm install reconpro deployment/helm/ \\
  --set image.tag=11.0.0 \\
  --set ingress.enabled=true
```

## Configuration

See `values.yaml` for all options.

Key values:
- `replicaCount`: Number of pod replicas (default: 1)
- `image.tag`: Container image tag
- `ingress.enabled`: Enable ingress (default: true)
- `resources.limits.cpu/memory`: Resource limits

## Uninstall

```bash
helm uninstall reconpro
```
""")

# -- 17. Terraform (generated) ---------------------------------------------
wf(dp / "terraform" / "main.tf", """terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "reconpro" {
  source = "./modules/reconpro"

  app_name    = "reconpro"
  environment = var.environment
  image_uri   = var.image_uri
}
""")

wf(dp / "terraform" / "variables.tf", """variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "image_uri" {
  description = "Docker image URI"
  type        = string
}
""")

wf(dp / "terraform" / "outputs.tf", """output "service_url" {
  description = "ReconPro service URL"
  value       = module.reconpro.service_url
}
""")

wf(dp / "terraform" / "modules" / "reconpro" / "main.tf", """resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-${var.environment}"
}

resource "aws_ecs_task_definition" "app" {
  family                   = var.app_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"

  container_definitions = jsonencode([{
    name      = var.app_name
    image     = var.image_uri
    essential = true
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    environment = [{
      name  = "NODE_ENV"
      value = "production"
    }]
  }])
}

resource "aws_ecs_service" "main" {
  name            = var.app_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = var.security_group_ids
    assign_public_ip = true
  }
}

variable "app_name" { type = string }
variable "environment" { type = string }
variable "image_uri" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }

output "service_url" {
  value = aws_ecs_service.main.name
}
""")

# -- Additional existing PaaS targets -----------------------------------

# Vercel
wf(dp / "vercel" / "vercel.json", J({
    "framework": "nextjs",
    "buildCommand": "npm run build",
    "installCommand": "npm ci",
    "outputDirectory": ".next",
    "regions": ["iad1"],
    "headers": [{"source": "/(.*)", "headers": [
        {"key": "X-Frame-Options", "value": "DENY"},
        {"key": "X-Content-Type-Options", "value": "nosniff"},
        {"key": "X-XSS-Protection", "value": "1; mode=block"},
        {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
    ]}]
}))

# Procfile
wf(dp / "Procfile", "web: npx next start -p $PORT\\nrelease: npx prisma migrate deploy\\n")

# .env.example
cp(PROJECT / "production.env.example", dp / ".env.example", required=False)
if not (dp / ".env.example").exists():
    wf(dp / ".env.example", """# ReconPro v11.0.0 — Environment Configuration
NODE_ENV=production
DATABASE_URL=file:/app/db/reconpro.db
NEXTAUTH_SECRET=change-me-to-a-random-string
NEXTAUTH_URL=http://localhost:3000
""")

# PaaS platforms (existing)
paas_map = {
    "render": PROJECT / "deploy" / "cloud" / "render" / "render.yaml",
    "railway": PROJECT / "deploy" / "cloud" / "railway" / "railway.toml",
    "fly.io": PROJECT / "deploy" / "cloud" / "flyio" / "fly.toml",
    "coolify": PROJECT / "deploy" / "cloud" / "coolify" / "coolify.env.example",
    "digitalocean": PROJECT / "deploy" / "cloud" / "digitalocean" / "app-spec.yaml",
}
for name, src in paas_map.items():
    if src.exists():
        cp(src, dp / name / src.name)

# EasyPanel
wf(dp / "easypanel" / "easypanel.json", J({
    "projectName": "reconpro",
    "services": [{
        "name": "web",
        "source": {"image": "node:20-alpine", "buildCommand": "npm ci && npm run build"},
        "ports": [{"port": 3000, "protocol": "http"}],
        "env": [
            {"key": "NODE_ENV", "value": "production"},
            {"key": "DATABASE_URL", "value": "file:/app/db/reconpro.db"},
        ]
    }]
}))

# Python CLI Docker
cp(RECONPRO_WORK / "reconpro" / "deploy" / "Dockerfile", dp / "python-cli" / "Dockerfile", required=False)
cp(RECONPRO_WORK / "reconpro" / "deploy" / "docker-compose.yml", dp / "python-cli" / "docker-compose.yml", required=False)

# VPS install
cp(PROJECT / "deploy" / "install.sh", dp / "install.sh", required=False)
if (dp / "install.sh").exists():
    os.chmod(dp / "install.sh", os.stat(dp / "install.sh").st_mode | stat.S_IEXEC)

# .nvmrc
wf(dp / ".nvmrc", "20\\n")

# GitHub Actions CI/CD
wf(dp / "github-actions" / "ci.yml", """name: ReconPro CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \'3.12\'
      - run: pip install backend/reconpro-11.0.0-py3-none-any.whl
      - run: reconpro --version
      - run: cd tests/python && python -m pytest --tb=short -q

  test-typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \'20\'
          cache: \'npm\'
      - run: cd web && npm ci
      - run: cd web && npx prisma generate
      - run: cd web && npx tsc --noEmit
      - run: cd web && npm test

  build:
    needs: [test-python, test-typescript]
    runs-on: ubuntu-latest
    if: github.ref == \'refs/heads/main\'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \'20\'
      - run: cd web && npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: web/.next/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == \'refs/heads/main\'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: echo \'Deploy step - configure for your target\'
""")

print(f"  17 deployment targets configured")
'''

# Now part2 starts with the scripts section but it begins with "/build-web.sh" which is a continuation
# of a wf() call. Let's check what part2 actually starts with
print(f"Part 2 starts with: {repr(part2[:80])}")
print(f"Part 3 starts with: {repr(part3[:80])}")

# Part2 starts with: /build-web.sh", """#!/usr/bin/env bash
# This is a continuation of: wf(scripts / "build" / "build-web.sh", ...
# So we need to prepend that
part2_fixed = 'wf(scripts / "build"' + part2

# Assemble the final script
final_lines = lines1[:cut1]
final_content = ''.join(final_lines) + middle + '\n' + part2_fixed + '\n' + part3

out_path = base / "omega_final_bundle.py"
with open(out_path, 'w') as f:
    f.write(final_content)

print(f"\nAssembled: {out_path}")
print(f"Total lines: {final_content.count(chr(10)) + 1}")
print(f"Total size: {len(final_content):,} bytes")
