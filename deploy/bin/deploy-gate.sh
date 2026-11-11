#!/bin/bash
# Install on the VPS at /opt/lindway/bin/deploy-gate.sh (chmod +x). It is the
# forced command of the CI deploy key in root's authorized_keys, so that key can
# run `deploy main` or `deploy beta` and nothing else.
set -euo pipefail
read -r verb app extra <<<"${SSH_ORIGINAL_COMMAND:-}"
if [ "$verb" != "deploy" ] || [ -n "${extra:-}" ]; then
  echo "denied: only 'deploy <main|beta>' is allowed" >&2
  exit 1
fi
case "$app" in
  main|beta) ;;
  *) echo "denied: unknown app '$app'" >&2; exit 1 ;;
esac
exec /opt/lindway/bin/deploy.sh "$app"
