#!/bin/bash
# Install at /opt/lindway/bin/cron-cleanup.sh (chmod 755) and schedule it, e.g.:
#   */15 * * * * /opt/lindway/bin/cron-cleanup.sh >> /var/log/lindway-cleanup.log 2>&1
#
# Sweeps expired temp uploads and releases orders stuck awaiting payment (frees the stock
# they reserved). Calls the app on 127.0.0.1 directly, not through nginx, which blocks
# these two paths from the internet. Silent on success; prints only on failure.
root=/opt/lindway
port=18090

secret=$(grep '^CRON_SECRET=' "$root/.env" | cut -d= -f2-)
[ -n "$secret" ] || { echo "$(date -Is) CRON_SECRET is empty in $root/.env" >&2; exit 1; }

status=0
for path in files/cleanup orders/cleanup; do
  curl -fsS -m 30 -X POST -H "x-cron-secret: $secret" "http://127.0.0.1:$port/api/$path" >/dev/null \
    || { echo "$(date -Is) cleanup $path failed" >&2; status=1; }
done
exit $status
