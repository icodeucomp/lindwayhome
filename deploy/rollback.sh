#!/bin/bash
# Install on the VPS at /opt/lindway/bin/rollback.sh (chmod +x). Run it yourself over SSH;
# the CI key cannot call it.
#
# Usage: rollback.sh <main|beta> [stamp]
#
# Makes releases/<stamp> (default: the newest) the live version again. The version being replaced
# is kept in releases/ too, so nothing is lost and a rollback can itself be rolled back.
set -euo pipefail

root=/opt/lindway
app="${1:-}"
want="${2:-}"

case "$app" in
  main) port=18090; project=lindway;      compose_file=docker-compose.yml ;;
  beta) port=18091; project=lindway-beta; compose_file=docker-compose.beta.yml ;;
  *) echo "usage: rollback.sh <main|beta> [stamp]" >&2; exit 2 ;;
esac

exec 9>"$root/.deploy-$app.lock"
flock 9

base="$root/$app"
live="$base/current"
releases="$base/releases"

have=$(ls -1 "$releases" 2>/dev/null | sort)
[ -n "$have" ] || { echo "no earlier versions for $app" >&2; exit 1; }

target="${want:-$(echo "$have" | tail -n 1)}"
[ -d "$releases/$target" ] || { echo "no such version: $target. Have:" >&2; echo "$have" >&2; exit 1; }

mv "$live" "$releases/$(date +%Y%m%d-%H%M%S)-replaced"
mv "$releases/$target" "$live"
echo "$app: $target is live again; the replaced version is kept in releases/"

export APP_PORT="$port"
cd "$live"
docker compose -p "$project" -f "$compose_file" up -d --build --remove-orphans

for _ in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api" || true)
  [ "$code" = "200" ] && { echo "== healthy"; exit 0; }
  sleep 3
done
echo "!! $app did not become healthy after rollback" >&2
exit 1
