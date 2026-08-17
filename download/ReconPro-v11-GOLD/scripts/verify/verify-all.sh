#!/usr/bin/env bash
set -euo pipefail
echo "=== ReconPro v11.0.0 — Full Verification ==="

PASS=0; FAIL=0

check() {
    if eval "$2" &>/dev/null; then
        echo "  [PASS] $1"; ((PASS++))
    else
        echo "  [FAIL] $1"; ((FAIL++))
    fi
}

echo "[Backend]"
check "Wheel exists" "[ -f backend/reconpro-11.0.0-py3-none-any.whl ]"
check "Sdist exists" "[ -f backend/reconpro-11.0.0.tar.gz ]"
check "requirements.txt" "[ -f backend/requirements.txt ]"
check "install.sh" "[ -f backend/install.sh ]"
check "LICENSE" "[ -f backend/LICENSE ]"

echo "[Web]"
check "package.json" "[ -f web/package.json ]"
check "next.config.ts" "[ -f web/next.config.ts ]"
check "tsconfig.json" "[ -f web/tsconfig.json ]"
check "src/app" "[ -d web/src/app ]"
check "src/components" "[ -d web/src/components ]"
check "src/lib" "[ -d web/src/lib ]"
check "prisma/schema.prisma" "[ -f web/prisma/schema.prisma ]"

echo "[Deployment]"
check "Dockerfile" "[ -f deployment/Dockerfile ]"
check "docker-compose.yml" "[ -f deployment/docker-compose.yml ]"
check "nginx/" "[ -d deployment/nginx ]"
check "kubernetes/" "[ -d deployment/kubernetes ]"
check "systemd/" "[ -d deployment/systemd ]"
check "vercel.json" "[ -f deployment/vercel.json ]"
check "Procfile" "[ -f deployment/Procfile ]"
check ".env.example" "[ -f deployment/.env.example ]"

echo "[Database]"
check "schema" "[ -f database/schema/schema.prisma ]"
check "seeds" "[ -f database/seeds/seed.ts ]"
check "backup script" "[ -f database/backup/backup.sh ]"
check "restore script" "[ -f database/backup/restore.sh ]"

echo "[Docs]"
for doc in README.md INSTALL.md DEPLOYMENT.md API_REFERENCE.md CLI_REFERENCE.md ARCHITECTURE.md SECURITY_MODEL.md TROUBLESHOOTING.md CHANGELOG.md RELEASE_NOTES.md ROADMAP.md LICENSE; do
    check "docs/$doc" "[ -f docs/$doc ]"
done

echo "[Reports]"
for rpt in GOLD_CERTIFICATION.md SECURITY_REPORT.md PERFORMANCE_REPORT.md TEST_REPORT.md QA_REPORT.md DEPLOYMENT_READINESS.md WHEEL_FORENSICS.md; do
    check "reports/$rpt" "[ -f reports/$rpt ]"
done

echo "[Tests]"
check "python tests" "[ -d tests/python ]"
check "typescript tests" "[ -d tests/typescript ]"
check "integration tests" "[ -d tests/integration ]"
check "regression tests" "[ -d tests/regression ]"
check "stress tests" "[ -d tests/stress ]"
check "benchmark tests" "[ -d tests/benchmark ]"

echo "[Manifests]"
check "MANIFEST.json" "[ -f manifests/MANIFEST.json ]"
check "SHA256_HASHES.txt" "[ -f manifests/SHA256_HASHES.txt ]"
check "FILE_INDEX.json" "[ -f manifests/FILE_INDEX.json ]"
check "BUILD_INFO.json" "[ -f manifests/BUILD_INFO.json ]"
check "VERSION.json" "[ -f manifests/VERSION.json ]"

echo ""
echo "Results: $PASS PASS, $FAIL FAIL"
[ $FAIL -eq 0 ] && echo "STATUS: ALL CHECKS PASS" || echo "STATUS: FAILURES DETECTED"
exit $FAIL
