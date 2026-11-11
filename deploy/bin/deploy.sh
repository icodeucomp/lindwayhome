#!/bin/bash
# Install on the VPS at /opt/lindway/bin/deploy.sh (chmod +x).
#
# Usage: deploy.sh <main|beta> < source.tar.gz
#
# Layout under /opt/lindway:
#   bin/                    this script, deploy-gate.sh, rollback.sh, cron-cleanup.sh
#   env/app.env             server-only secrets, shared by both sites, created once by hand
#   backups/                daily database dumps
#   main/current/           lindwayhome.com, live source          (port 18090, project `lindway`)
#   main/releases/<stamp>/  every earlier main version (oldest first); the last $keep are kept
#   beta/current/           beta.lindwayhome.com, live source     (port 18091, project `lindway-beta`)
#   beta/releases/<stamp>/  every earlier beta version
#
# Both sites run against the same database (the one in the main stack), so main must be up before
# beta is deployed. Unpacks the new source next to the live copy, builds and swaps the containers.
# If the build or the health check fails, the version it replaced is put back and its containers
# restarted, so a broken commit never leaves the app down. Older versions stay in releases/ for
# rollback.sh.
#
# The database, uploads and logs live in docker volumes, not in the source
# folder, so swapping folders never touches data. The compose project names are pinned (-p) for the
# same reason: a name derived from the folder would change across a swap and point the app at
# brand-new empty volumes.
set -euo pipefail
umask 022   # nothing under /opt/lindway is ever group- or world-writable

root=/opt/lindway
keep=5   # how many earlier versions to keep in releases/

app="${1:-}"
case "$app" in
  main) port=18090; project=lindway;      compose_file=docker-compose.yml;      site=https://lindwayhome.com ;;
  beta) port=18091; project=lindway-beta; compose_file=docker-compose.beta.yml; site=https://beta.lindwayhome.com ;;
  *) echo "unknown app: '$app' (expected main or beta)" >&2; exit 2 ;;
esac

envfile="$root/env/app.env"
[ -f "$envfile" ] || { echo "missing $envfile (copy deploy/env/app.env and fill it in)" >&2; exit 2; }

# Beta joins the main stack's network to reach the shared database.
if [ "$app" = beta ]; then
  docker network inspect lindway_default >/dev/null 2>&1 \
    || { echo "beta needs the main stack's database: deploy main first" >&2; exit 2; }
fi

exec 9>"$root/.deploy-$app.lock"
flock 9

base="$root/$app"
live="$base/current"
new="$base/next"
releases="$base/releases"
mkdir -p "$base" "$releases"

rm -rf "$new"
mkdir -p "$new"
# --no-same-owner: the archive is built on the GitHub runner, so its files carry that user's
# id (1001), which tar would keep when run as root and which can collide with a real local
# user. Extracted files must be owned by whoever runs this script: root.
tar -xz --no-same-owner -C "$new"

# The URL is compiled into the client bundle, so each site gets its own; everything else is shared.
cp "$envfile" "$new/.env"
sed -i '/^NEXT_PUBLIC_BASE_URL=/d' "$new/.env"
printf '\nNEXT_PUBLIC_BASE_URL=%s\n' "$site" >> "$new/.env"
chmod 600 "$new/.env"

backup=""
if [ -d "$live" ]; then
  backup="$releases/$(date +%Y%m%d-%H%M%S)"
  mv "$live" "$backup"
fi
mv "$new" "$live"

# Shell variables win over .env in compose interpolation, so the port the health
# check polls and the port the container publishes cannot disagree.
export APP_PORT="$port"
compose() { docker compose -p "$project" -f "$compose_file" "$@"; }

healthy() {
  for _ in $(seq 1 40); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api" || true)
    [ "$code" = "200" ] && return 0
    sleep 3
  done
  return 1
}

rollback() {
  echo "!! deploy of $app failed, restoring previous version" >&2
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
echo "== $app deployed ($(date -Is))"
compose ps
