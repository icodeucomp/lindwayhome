#!/bin/bash
# Install on the VPS at /opt/lindway/bin/deploy.sh (chmod +x).
#
# Usage: /opt/lindway/bin/deploy.sh lindway < source.tar.gz
#
# Layout under /opt/lindway:
#   bin/deploy.sh      this script
#   bin/deploy-gate.sh forced command of the CI key (see authorized_keys)
#   .env               server-only secrets, created once by hand, copied into every deploy
#   current/           the live source
#   releases/<stamp>/  every earlier version (oldest first); the last $keep are kept
#
# Unpacks the new source next to the live copy, builds and swaps the containers.
# If the build or the health check fails, the version it replaced is put back and its
# containers restarted, so a broken commit never leaves the app down. Older versions
# stay in releases/ for a manual rollback (see README).
#
# The database, uploads and logs live in docker volumes, not in the source folder,
# so swapping folders never touches data. The compose project name is pinned (-p)
# for the same reason: a name derived from the folder would change across a swap
# and point the app at brand-new empty volumes.
set -euo pipefail

root=/opt/lindway
port=18090
keep=5   # how many earlier versions to keep in releases/

# Only one app lives here; the argument is checked so a typo in the workflow fails
# loudly instead of deploying something unintended.
[ "${1:-}" = "lindway" ] || { echo "unknown app: '${1:-}'" >&2; exit 2; }

[ -f "$root/.env" ] || { echo "missing $root/.env (copy .env.example and fill it in)" >&2; exit 2; }

exec 9>"$root/.deploy.lock"
flock 9

live="$root/current"
new="$root/next"
releases="$root/releases"

rm -rf "$new"
mkdir -p "$new"
tar -xz -C "$new"
cp "$root/.env" "$new/.env"

mkdir -p "$releases"
# One-time move from the old single-slot layout.
if [ -d "$root/previous" ]; then mv "$root/previous" "$releases/00000000-000000-legacy"; fi

backup=""
if [ -d "$live" ]; then
  backup="$releases/$(date +%Y%m%d-%H%M%S)"
  mv "$live" "$backup"
fi
mv "$new" "$live"

# Shell variables win over .env in compose interpolation, so the port the health
# check polls and the port the container publishes cannot disagree.
export APP_PORT="$port"
compose() { docker compose -p lindway -f docker-compose.yml "$@"; }

healthy() {
  for _ in $(seq 1 40); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api" || true)
    [ "$code" = "200" ] && return 0
    sleep 3
  done
  return 1
}

rollback() {
  echo "!! deploy failed, restoring previous version" >&2
  if [ -n "$backup" ] && [ -d "$backup" ]; then
    rm -rf "$live"
    mv "$backup" "$live"
    (cd "$live" && compose up -d --build --remove-orphans) || true
  fi
  exit 1
}

cd "$live"
compose up -d --build --remove-orphans || rollback
healthy || rollback

# Timestamps sort oldest-first, so everything before the last $keep goes.
ls -1 "$releases" | sort | head -n "-$keep" | while read -r r; do rm -rf "${releases:?}/$r"; done || true

docker image prune -f >/dev/null
echo "== lindway deployed ($(date -Is))"
compose ps
