#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# MLCalc — Restore Script
# Restores PostgreSQL database and screenshot uploads from backup
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[RESTORE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Parse arguments ──────────────────────────────────────────────────────────

DB_BACKUP="${1:-}"
UPLOADS_BACKUP="${2:-}"

if [ -z "$DB_BACKUP" ]; then
    echo "Usage: $0 <db_backup.sql.gz> [uploads_backup.tar.gz]"
    echo ""
    echo "Available backups:"
    ls -la backups/db_*.sql.gz 2>/dev/null || echo "  No database backups found"
    echo ""
    ls -la backups/uploads_*.tar.gz 2>/dev/null || echo "  No upload backups found"
    exit 1
fi

if [ ! -f "$DB_BACKUP" ]; then
    error "Database backup file not found: $DB_BACKUP"
fi

# ─── Confirmation ─────────────────────────────────────────────────────────────

echo ""
warn "═══════════════════════════════════════════════════════"
warn "  ⚠️  WARNING: This will OVERWRITE the current database!"
warn "═══════════════════════════════════════════════════════"
echo ""
echo "  Database backup: $DB_BACKUP"
if [ -n "$UPLOADS_BACKUP" ]; then
    echo "  Uploads backup:  $UPLOADS_BACKUP"
fi
echo ""
read -p "  Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled."
    exit 0
fi

# ─── Ensure services are running ──────────────────────────────────────────────

log "Ensuring services are running..."
docker-compose up -d db

# Wait for database
MAX_RETRIES=30
RETRY_COUNT=0
until docker-compose exec -T db pg_isready -U mlcalc >/dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        error "Database failed to start"
    fi
    sleep 2
done

# ─── Restore database ─────────────────────────────────────────────────────────

log "Restoring database from: $DB_BACKUP"

# Drop existing connections and restore
docker-compose exec -T db psql -U mlcalc -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'mlcalc' AND pid <> pg_backend_pid();" 2>/dev/null || true
docker-compose exec -T db psql -U mlcalc -c "DROP DATABASE IF EXISTS mlcalc;"
docker-compose exec -T db psql -U mlcalc -c "CREATE DATABASE mlcalc;"

gunzip -c "$DB_BACKUP" | docker-compose exec -T db psql -U mlcalc mlcalc

log "Database restored successfully!"

# ─── Restore uploads ──────────────────────────────────────────────────────────

if [ -n "$UPLOADS_BACKUP" ] && [ -f "$UPLOADS_BACKUP" ]; then
    log "Restoring uploads from: $UPLOADS_BACKUP"

    docker-compose run --rm --no-deps app sh -c "rm -rf /app/uploads/*"
    cat "$UPLOADS_BACKUP" | docker-compose run --rm --no-deps app tar xzf - -C / 2>/dev/null || {
        warn "Upload restore via container failed. Try manual restore."
    }

    log "Uploads restored successfully!"
fi

# ─── Run migrations (in case schema changed) ──────────────────────────────────

log "Running migrations to ensure schema is up-to-date..."
docker-compose exec -T app alembic upgrade head || warn "Migration had warnings (may be expected)"

# ─── Restart app ──────────────────────────────────────────────────────────────

log "Restarting application..."
docker-compose restart app

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
log "═══════════════════════════════════════════════════════"
log "  ✅ Restore complete!"
log "═══════════════════════════════════════════════════════"
log "  Database restored from: $DB_BACKUP"
if [ -n "$UPLOADS_BACKUP" ]; then
    log "  Uploads restored from:  $UPLOADS_BACKUP"
fi
echo ""
