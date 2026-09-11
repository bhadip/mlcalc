#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# MLCalc — Deploy Script
# Automates: docker-compose build/up, Alembic migrations, health check
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Pre-flight checks ───────────────────────────────────────────────────────

log "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || error "Docker is not installed"
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || error "Docker Compose is not installed"

if [ ! -f .env ]; then
    warn ".env file not found. Copying from .env.example..."
    cp .env.example .env
    warn "Please edit .env with your actual credentials before continuing."
    exit 1
fi

# ─── Build ─────────────────────────────────────────────────────────────────────

log "Building Docker images..."
docker-compose build --no-cache

# ─── Start services ────────────────────────────────────────────────────────────

log "Starting services..."
docker-compose up -d

# ─── Wait for database ────────────────────────────────────────────────────────

log "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

until docker-compose exec -T db pg_isready -U mlcalc >/dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        error "Database failed to start within timeout"
    fi
    sleep 2
done

log "Database is ready!"

# ─── Run migrations ───────────────────────────────────────────────────────────

log "Running Alembic migrations..."
docker-compose exec -T app alembic upgrade head

# ─── Seed instruments ─────────────────────────────────────────────────────────

log "Seeding default instruments..."
docker-compose exec -T app python -m scripts.seed_instruments || warn "Seed script failed (instruments may already exist)"

# ─── Health check ─────────────────────────────────────────────────────────────

log "Checking application health..."
MAX_HEALTH_RETRIES=10
HEALTH_RETRY=0

until curl -sf http://localhost:8504/api/health >/dev/null 2>&1; do
    HEALTH_RETRY=$((HEALTH_RETRY + 1))
    if [ $HEALTH_RETRY -ge $MAX_HEALTH_RETRIES ]; then
        error "Application health check failed"
    fi
    sleep 3
done

log "Health check passed!"

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
log "═══════════════════════════════════════════════════════"
log "  ✅ MLCalc deployed successfully!"
log "═══════════════════════════════════════════════════════"
echo ""
log "  Local:    http://localhost:8504"
log "  API Docs: http://localhost:8504/api/docs"
log "  Health:   http://localhost:8504/api/health"
echo ""
log "  Cloudflare tunnel: mlcalc.prasanti.com"
log "═══════════════════════════════════════════════════════"
echo ""
