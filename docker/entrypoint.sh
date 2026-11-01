#!/bin/sh
set -e

# Applies pending migrations (including the stock trigger, D24) before serving.
# `migrate deploy` is non-interactive and never resets, unlike `migrate dev`.
npx prisma migrate deploy

# The seed rewrites data, so it is opt-in. Run it once on a fresh database with
# SEED_ON_START=true, then remove the variable.
if [ "$SEED_ON_START" = "true" ]; then
  npx tsx prisma/seed.ts
fi

exec "$@"
