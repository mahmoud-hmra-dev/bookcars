#!/bin/bash
# BookCars MongoDB Backup Script
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
DB_URI="${BC_DB_URI:-mongodb://admin:admin@127.0.0.1:27017/bookcars?authSource=admin}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

echo "[$(date)] Starting MongoDB backup..."
mkdir -p "$BACKUP_PATH"

mongodump --uri="$DB_URI" --out="$BACKUP_PATH" --gzip

echo "[$(date)] Backup completed: $BACKUP_PATH"

# Clean old backups
find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
echo "[$(date)] Cleaned backups older than $RETENTION_DAYS days"
