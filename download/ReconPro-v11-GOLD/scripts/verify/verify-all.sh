#!/usr/bin/env bash
set -euo pipefail
echo '=== ReconPro v11.0.0 - Full Verification ==='
PASS=0; FAIL=0
check() { if eval "$2" &>/dev/null; then echo "  [PASS] $1"; ((PASS++)); else echo "  [FAIL] $1"; ((FAIL++)); fi; }
echo '[Backend]'; check 'Wheel' '[ -f backend/reconpro-11.0.0-py3-none-any.whl ]'; check 'Sdist' '[ -f backend/reconpro-11.0.0.tar.gz ]'; check 'requirements' '[ -f backend/requirements.txt ]'; check 'install.sh' '[ -f backend/install.sh ]'; check 'LICENSE' '[ -f backend/LICENSE ]'
echo '[Web]'; check 'package.json' '[ -f web/package.json ]'; check 'next.config' '[ -f web/next.config.ts ]'; check 'tsconfig' '[ -f web/tsconfig.json ]'; check 'src/app' '[ -d web/src/app ]'; check 'src/components' '[ -d web/src/components ]'; check 'src/lib' '[ -d web/src/lib ]'; check 'prisma' '[ -f web/prisma/schema.prisma ]'
echo '[Deployment-17]'; for t in docker kubernetes nginx apache traefik caddy pm2 supervisor gunicorn uvicorn netlify aws azure gcp helm terraform github-actions vercel; do check "$t" "[ -d deployment/$t ] || [ -f deployment/$t ]"; done
echo '[Database]'; check 'schema' '[ -f database/schema/schema.prisma ]'; check 'seeds' '[ -f database/seeds/seed.ts ]'; check 'backup' '[ -f database/backup/backup.sh ]'; check 'restore' '[ -f database/backup/restore.sh ]'
echo '[Docs]'; for d in README.md INSTALL.md DEPLOYMENT.md API_REFERENCE.md CLI_REFERENCE.md ARCHITECTURE.md SECURITY_MODEL.md TROUBLESHOOTING.md CHANGELOG.md RELEASE_NOTES.md ROADMAP.md LICENSE; do check "docs/$d" "[ -f docs/$d ]"; done
echo '[Reports]'; for r in GOLD_CERTIFICATION.md SECURITY_REPORT.md PERFORMANCE_REPORT.md TEST_REPORT.md QA_REPORT.md DEPLOYMENT_READINESS.md WHEEL_FORENSICS.md; do check "reports/$r" "[ -f reports/$r ]"; done
echo '[Tests]'; for t in python typescript integration regression stress benchmark Snapshots Fixtures; do check "$t" "[ -d tests/$t ]"; done
echo '[Manifests]'; for m in MANIFEST.json SHA256_HASHES.txt FILE_INDEX.json BUILD_INFO.json VERSION.json DEPENDENCY_TREE.json PACKAGE_SUMMARY.json; do check "$m" "[ -f manifests/$m ]"; done
echo '[Certificates]'; check 'fullchain.pem' '[ -f certificates/fullchain.pem ]'; check 'privkey.pem' '[ -f certificates/privkey.pem ]'
echo '[Assets]'; check 'logos' '[ -d assets/logos ]'; check 'banners' '[ -d assets/banners ]'
echo '[Licenses]'; check 'THIRD_PARTY.md' '[ -f licenses/THIRD_PARTY.md ]'; check 'LICENSE' '[ -f licenses/LICENSE ]'
echo ''; echo "Results: $PASS PASS, $FAIL FAIL"; [ $FAIL -eq 0 ] && echo 'ALL CHECKS PASS' || echo 'FAILURES DETECTED'; exit $FAIL
