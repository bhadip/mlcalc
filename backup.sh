#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# MLCalc — Backup Script
# Backs up PostgreSQL database and screenshot uploads
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"
UPLOADS_BACKUP_FILE="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[BACKUP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Create backup directory
mkdir -p "$BACKUP_DIR"

# ─── Database backup ──────────────────────────────────────────────────────────

log "Backing up PostgreSQL database..."
docker-compose exec -T db pg_dump -U mlcalc mlcalc | gzip > "$DB_BACKUP_FILE"

if [ -f "$DB_BACKUP_FILE" ]; then
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    log "Database backup complete: $DB_BACKUP_FILE ($DB_SIZE)"
else
    warn "Database backup may have failed"
fi

# ─── Uploads backup ───────────────────────────────────────────────────────────

log "Backing up screenshot uploads..."
docker-compose run --rm --no-deps app tar czf - /app/uploads 2>/dev/null | cat > "$UPLOADS_BACKUP_FILE" || {
    # Fallback: try to backup from volume directly
    warn "Could not backup uploads via container. Trying volume..."
    VOLUME_NAME=$(docker-compose config | grep -A1 screenshot_uploads | grep driver | head -1 || true)
    if [ -n "$VOLUME_NAME" ]; then
        docker run --rm -v "$(docker volume ls -q | grep screenshot)" -v "$(pwd)/backups":/backup alpine \
            tar czf "/backup/uploads_${TIMESTAMP}.tar.gz" -C /data . 2>/dev/null || warn "Volume backup failed"
    fi
}

if [ -f "$UPLOADS_BACKUP_FILE" ]; then
    UPLOAD_SIZE=$(du -h "$UPLOADS_BACKUP_FILE" | cut -f1)
    log "Uploads backup complete: $UPLOADS_BACKUP_FILE ($UPLOAD_SIZE)"
fi

# ─── Cleanup old backups (keep last 7) ────────────────────────────────────────

log "Cleaning up old backups (keeping last 7)..."
ls -t "${BACKUP_DIR}"/db_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm --
ls -t "${BACKUP_DIR}"/uploads_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm --

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
log "═══════════════════════════════════════════════════════"
log "  ✅ Backup complete!"
log "═══════════════════════════════════════════════════════"
log "  Database: $DB_BACKUP_FILE"
log "  Uploads:  $UPLOADS_BACKUP_FILE"
log "  Location: $(pwd)/backups/"
echo ""
