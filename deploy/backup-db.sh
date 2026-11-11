#!/bin/bash
# Install on the VPS at /etc/cron.daily/lindway-db-backup (chmod 755; no dot in the name or
# run-parts skips it). Daily gzip'd pg_dump of the database both sites share, kept for 14 days.
set -euo pipefail
dir=/opt/lindway/backups
mkdir -p "$dir"
docker exec lindway-db-1 sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$dir/db-$(date +%F).sql.gz"
find "$dir" -name 'db-*.sql.gz' -mtime +14 -delete
