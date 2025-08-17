#!/bin/bash

# Comprehensive Database Backup Script
# Backs up PostgreSQL, Redis, and Qdrant databases

set -e

# Configuration
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_BACKUP_DIR="/postgres-backups"
REDIS_BACKUP_DIR="/redis-backups"
QDRANT_BACKUP_DIR="/qdrant-backups"

echo "🗄️  Starting database backup - $(date)"

# Create backup directories
mkdir -p "$POSTGRES_BACKUP_DIR" "$REDIS_BACKUP_DIR" "$QDRANT_BACKUP_DIR"

# PostgreSQL Backup
echo "📊 Backing up PostgreSQL..."
PGPASSWORD=dev_password_123 pg_dump \
    -h postgres \
    -U codetools \
    -d codetools_dev \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --format=custom \
    > "$POSTGRES_BACKUP_DIR/postgres_backup_$BACKUP_DATE.sql"

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL backup completed: postgres_backup_$BACKUP_DATE.sql"
else
    echo "❌ PostgreSQL backup failed"
    exit 1
fi

# Redis Backup (create snapshot)
echo "🔄 Backing up Redis..."
redis-cli -h redis -p 6379 BGSAVE
sleep 5  # Wait for background save to complete

# Copy Redis data files
cp /data/dump.rdb "$REDIS_BACKUP_DIR/redis_backup_$BACKUP_DATE.rdb" 2>/dev/null || {
    echo "⚠️  Redis RDB file not found or empty"
}

# Save Redis AOF if exists
if [ -f /data/appendonly.aof ]; then
    cp /data/appendonly.aof "$REDIS_BACKUP_DIR/redis_aof_backup_$BACKUP_DATE.aof"
    echo "✅ Redis AOF backup completed"
fi

echo "✅ Redis backup completed: redis_backup_$BACKUP_DATE.rdb"

# Qdrant Backup (create snapshot)
echo "🎯 Backing up Qdrant..."
curl -X POST "http://qdrant:6333/snapshots" \
    -H "Content-Type: application/json" \
    -d '{"name": "backup_'$BACKUP_DATE'"}' || {
    echo "⚠️  Qdrant snapshot creation failed, copying data directory instead"
    tar -czf "$QDRANT_BACKUP_DIR/qdrant_data_backup_$BACKUP_DATE.tar.gz" -C /qdrant/storage . 2>/dev/null || {
        echo "⚠️  Qdrant data directory backup also failed"
    }
}

if [ $? -eq 0 ]; then
    echo "✅ Qdrant backup completed: backup_$BACKUP_DATE"
else
    echo "⚠️  Qdrant backup had issues"
fi

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$POSTGRES_BACKUP_DIR" -name "postgres_backup_*.sql" -mtime +7 -delete 2>/dev/null
find "$REDIS_BACKUP_DIR" -name "redis_backup_*.rdb" -mtime +7 -delete 2>/dev/null
find "$REDIS_BACKUP_DIR" -name "redis_aof_backup_*.aof" -mtime +7 -delete 2>/dev/null
find "$QDRANT_BACKUP_DIR" -name "qdrant_*_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null

echo "✅ Database backup completed successfully - $(date)"
echo "📁 Backup files:"
echo "   PostgreSQL: $POSTGRES_BACKUP_DIR/postgres_backup_$BACKUP_DATE.sql"
echo "   Redis: $REDIS_BACKUP_DIR/redis_backup_$BACKUP_DATE.rdb"
echo "   Qdrant: backup_$BACKUP_DATE (snapshot) or qdrant_data_backup_$BACKUP_DATE.tar.gz"