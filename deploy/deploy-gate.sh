#!/bin/bash
# Install on the VPS at /opt/lindway/bin/deploy-gate.sh (chmod +x). It is the
# forced command of the CI deploy key in root's authorized_keys, so that key can
# run `deploy lindway` and nothing else.
set -euo pipefail
read -r verb app extra <<<"${SSH_ORIGINAL_COMMAND:-}"
if [ "$verb" != "deploy" ] || [ -n "${extra:-}" ]; then
  echo "denied: only 'deploy <app>' is allowed" >&2
  exit 1
fi
exec /opt/lindway/bin/deploy.sh "$app"
