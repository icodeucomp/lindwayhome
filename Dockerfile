# syntax=docker/dockerfile:1

# ── builder ───────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# `prisma-client` is a file: dependency on generated/prisma, which does not exist yet.
RUN mkdir -p generated/prisma && npm ci --no-audit --no-fund

COPY . .
# prisma.config.ts reads DATABASE_URL, but `generate` never connects.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so this one
# must be a build arg. Real secrets are NOT passed here: the placeholders below only
# let modules that throw on a missing secret at import (auth.ts, checkout-token.ts)
# load while Next collects page data, and they never reach the runtime image.
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    JWT_SECRET=build-only \
    CHECKOUT_TOKEN_SECRET=build-only
RUN npm run build

# ── runner ────────────────────────────────────────────────────────────────────
# Keeps the full node_modules (not `output: "standalone"`): the entrypoint runs
# `prisma migrate deploy` and the seed, which need the prisma CLI and tsx.
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget && rm -rf /var/lib/apt/lists/*

# The base image's `node` user is uid/gid 1000, which on most hosts is the first human login
# account. Uploads are a bind mount, so that id is also the owner of files on the host, and a
# person (or a user created later) who happens to hold 1000 could edit them. A fixed id that no
# login account uses keeps the owner meaningful: on the server it belongs to a no-login
# `lindway-app` user. `usermod -u` also re-owns /home/node.
ARG APP_UID=1500
ARG APP_GID=1500
RUN groupmod -g ${APP_GID} node && usermod -u ${APP_UID} -g ${APP_GID} node

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4790 \
    HOSTNAME=0.0.0.0 \
    UPLOADS_PATH=/data/uploads

COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/generated ./generated
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts /app/next.config.ts /app/tsconfig.json ./
# prisma/seed.ts imports from src/ via the `@/` alias, so the seed needs the sources.
COPY --from=builder --chown=node:node /app/src ./src
COPY --chown=node:node docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data/uploads /app/logs && chown -R node:node /data /app/logs

USER node
EXPOSE 4790
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 CMD wget -qO- http://127.0.0.1:4790/api >/dev/null || exit 1
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npx", "next", "start"]
