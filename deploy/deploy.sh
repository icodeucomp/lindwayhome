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
#   previous/          the source before the last deploy (kept for rollback)
#
# Unpacks the new source next to the live copy, builds and swaps the containers.
# If the build or the health check fails, the previous source is put back and its
# containers restarted, so a broken commit never leaves the app down.
#
# The database, uploads and logs live in docker volumes, not in the source folder,
# so swapping folders never touches data. The compose project name is pinned (-p)
# for the same reason: a name derived from the folder would change across a swap
# and point the app at brand-new empty volumes.
set -euo pipefail

root=/opt/lindway
port=18084

# Only one app lives here; the argument is checked so a typo in the workflow fails
# loudly instead of deploying something unintended.
[ "${1:-}" = "lindway" ] || { echo "unknown app: '${1:-}'" >&2; exit 2; }

[ -f "$root/.env" ] || { echo "missing $root/.env (copy .env.example and fill it in)" >&2; exit 2; }

exec 9>"$root/.deploy.lock"
flock 9

live="$root/current"
new="$root/next"
old="$root/previous"

rm -rf "$new"
mkdir -p "$new"
tar -xz -C "$new"
cp "$root/.env" "$new/.env"

rm -rf "$old"
[ -d "$live" ] && mv "$live" "$old"
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
  if [ -d "$old" ]; then
    rm -rf "$live"
    mv "$old" "$live"
    (cd "$live" && compose up -d --build --remove-orphans) || true
  fi
  exit 1
}

cd "$live"
compose up -d --build --remove-orphans || rollback
healthy || rollback

docker image prune -f >/dev/null
echo "== lindway deployed ($(date -Is))"
compose ps
