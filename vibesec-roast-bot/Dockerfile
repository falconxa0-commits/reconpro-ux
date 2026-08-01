# ── Stage 1: builder ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────
FROM python:3.12-slim

# Install fonts for card generation
RUN apt-get update && \
    apt-get install -y --no-install-recommends fonts-dejavu-core && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy bot code
COPY bot/ bot/

# Create cache dir
RUN mkdir -p bot/.cache

# Non-root user
RUN useradd --create-home --shell /bin/bash roastbot
USER roastbot

# Credentials dir with restricted permissions
RUN mkdir -p bot/.cache && chmod 700 bot/.cache

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

CMD ["python", "-m", "bot.main"]
