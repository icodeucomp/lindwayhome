#!/bin/bash
# Install on the VPS at /opt/lindway/bin/apply-env.sh (chmod +x). Run it yourself over SSH.
#
# Usage: apply-env.sh [main|beta|all]      (default: all)
#
# Applies a change to /opt/lindway/env/app.env (for example a new TEAM_ACCESS_PASSWORD) without a
# deploy: the file is copied into the live release as `.env` and the container is recreated with
# the existing image. Nothing is rebuilt, so it takes seconds instead of minutes. NEXT_PUBLIC_*
# values are compiled into the client bundle and need a real deploy to change.
set -euo pipefail
umask 022

root=/opt/lindway
envfile="$root/env/app.env"
[ -f "$envfile" ] || { echo "missing $envfile" >&2; exit 2; }

apply() {
  local app="$1" port project compose_file site
  case "$app" in
    main) port=18090; project=lindway;      compose_file=docker-compose.yml;      site=https://lindwayhome.com ;;
    beta) port=18091; project=lindway-beta; compose_file=docker-compose.beta.yml; site=https://beta.lindwayhome.com ;;
  esac

  local live="$root/$app/current"
  [ -d "$live" ] || { echo "$app: no live release, skipping"; return 0; }

  # Same lock as deploy.sh, so this never runs in the middle of a deploy.
  exec 9>"$root/.deploy-$app.lock"
  flock 9

  cp "$envfile" "$live/.env"
  sed -i '/^NEXT_PUBLIC_BASE_URL=/d' "$live/.env"
  printf '\nNEXT_PUBLIC_BASE_URL=%s\n' "$site" >> "$live/.env"
  chmod 600 "$live/.env"

  (cd "$live" && APP_PORT="$port" docker compose -p "$project" -f "$compose_file" up -d)

  for _ in $(seq 1 40); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api" || true)
    [ "$code" = "200" ] && { echo "== $app healthy"; flock -u 9; return 0; }
    sleep 3
  done
  echo "!! $app did not become healthy" >&2
  return 1
}

case "${1:-all}" in
  main) apply main ;;
  beta) apply beta ;;
  all)  apply main; apply beta ;;
  *) echo "usage: apply-env.sh [main|beta|all]" >&2; exit 2 ;;
esac
