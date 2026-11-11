#!/bin/sh
set -e

# Applies pending migrations (including the stock trigger, D24) before serving.
# `migrate deploy` is non-interactive and never resets, unlike `migrate dev`.
# Beta shares the production database and sets SKIP_MIGRATE=true so only main changes the schema.
if [ "$SKIP_MIGRATE" != "true" ]; then
  npx prisma migrate deploy
fi

# The seed rewrites data, so it is opt-in. Run it once on a fresh database with
# SEED_ON_START=true, then remove the variable.
if [ "$SEED_ON_START" = "true" ]; then
  npx tsx prisma/seed.ts
fi

exec "$@"
