# Multi-stage production Dockerfile: React SPA built and served from Django via WhiteNoise

# ---- Stage 1: Build the React frontend ----
FROM node:22-alpine AS frontend-build
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Production Django runtime ----
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    SQLITE_PATH=/data/db.sqlite3

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python production dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root application user
RUN useradd -m -u 10001 appuser

# Copy backend code and compiled frontend assets
COPY backend/ ./
COPY --from=frontend-build /frontend/dist ./frontend_dist

# Prepare directories for data volume and static collection
RUN mkdir -p /data staticfiles && \
    chown -R appuser:appuser /app /data

USER appuser

# Collect static assets into staticfiles for WhiteNoise compression
RUN python manage.py collectstatic --noinput

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

CMD sh -c "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2"
