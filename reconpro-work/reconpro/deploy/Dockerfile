# =============================================================================
# ReconPro v11 Enterprise — Production Docker Image
# Multi-stage build: builder → lean runtime
# =============================================================================
#
# Build:
#   docker build -t reconpro:v11-enterprise .
#
# Run:
#   docker run -d -p 7890:7890 \
#     -e RECONPRO_REQUIRE_AUTH=true \
#     -e RECONPRO_BOOTSTRAP_SECRET=changeme \
#     -v ~/.reconpro:/home/reconpro/.reconpro \
#     reconpro:v11-enterprise
#
# Health check:
#   curl http://localhost:7890/ | jq .
# =============================================================================

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies (cached layer)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy project source
COPY . /build/

# Install package with all optional dependencies from source
# Core deps: rich, textual, requests
# Optional: aiohttp (async HTTP engine)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        /build/[full] && \
    pip install --no-cache-dir \
        aiohttp>=3.9.0

# Collect installed packages for the runtime stage
RUN pip freeze > /build/requirements-frozen.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

LABEL maintainer="security@reconpro.io"
LABEL org.opencontainers.image.title="ReconPro Enterprise"
LABEL org.opencontainers.image.description="ReconPro v11 — Enterprise Security Reconnaissance Platform. 27 Modules. 50+ Commands. MITRE ATT&CK. SARIF/PDF/CSV."
LABEL org.opencontainers.image.version="11.0.0"
LABEL org.opencontainers.image.vendor="ReconPro Security"
LABEL org.opencontainers.image.source="https://github.com/reconpro/reconpro"
LABEL org.opencontainers.image.licenses="MIT"
LABEL version="11.0.0"
LABEL description="ReconPro v11 Enterprise — Production API Server"

# Install only runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 reconpro && \
    useradd --uid 1001 --gid reconpro --shell /bin/bash \
        --create-home --home-dir /home/reconpro reconpro

WORKDIR /opt/reconpro

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages/ \
    /usr/local/lib/python3.12/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Copy application source (needed for runtime imports)
COPY --from=builder /build/reconpro/ /opt/reconpro/reconpro/
COPY --from=builder /build/setup.py* /opt/reconpro/
COPY --from=builder /build/pyproject.toml /opt/reconpro/
COPY --from=builder /build/requirements-frozen.txt /opt/reconpro/

# Set ownership
RUN chown -R reconpro:reconpro /opt/reconpro

# Create persistent data directories
RUN mkdir -p /home/reconpro/.reconpro/{reports,history,plugins} && \
    chown -R reconpro:reconpro /home/reconpro/.reconpro

# Switch to non-root user
USER reconpro

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/opt/reconpro \
    RECONPRO_DATA_DIR=/home/reconpro/.reconpro \
    RECONPRO_LOG_LEVEL=INFO \
    RECONPRO_MAX_WORKERS=4 \
    RECONPRO_DEFAULT_TIMEOUT=8 \
    PATH="/opt/reconpro/.venv/bin:/usr/local/bin:${PATH}"

# Expose API port
EXPOSE 7890

# Health check: probe the status endpoint every 30s, fail after 3 consecutive misses
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD-SHELL curl -fsS http://localhost:7890/ > /dev/null 2>&1 || exit 1

# Start the ReconPro API server via CLI entrypoint
ENTRYPOINT ["reconpro"]
CMD ["serve", "--port", "7890"]
