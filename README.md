# Lindway Home

Indonesian fashion e-commerce storefront for the Lindway brand (Denpasar, Bali): a single Next.js 16 App Router app with its own admin dashboard, PostgreSQL via Prisma, Paxel shipping and Xendit payments.

## Local development

```bash
npm install
npm run db:generate      # generated/prisma is gitignored, so a fresh clone must run this
cp .env.example .env     # then fill in DATABASE_URL and the secrets
npm run db:migrate
npm run db:seed
npm run dev              # http://localhost:3000
```

Paxel and Xendit run in **mock mode** while `PAXEL_API_KEY` / `XENDIT_SECRET_KEY` are empty, so checkout, booking and tracking work without any account.

### Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run paxel:check      # Paxel signature vectors (no DB or network)
npm run db:check         # data invariants (needs DATABASE_URL)
npm run smoke:checkout   # full checkout + shipping run against a running server
```

## Production with Docker

`docker-compose.yml` runs the app and its own PostgreSQL.

```bash
cp .env.example .env     # fill in secrets; see comments in the file
docker compose up -d --build
```

- On every start the container runs `prisma migrate deploy`, then serves on port `APP_PORT` (default 3000).
- Set `SEED_ON_START=true` for **one** start on a fresh database to load seed data, then remove it.
- `NEXT_PUBLIC_BASE_URL` is inlined into the client bundle at build time; changing it needs `--build`.
- Volumes: `pgdata` (database), `uploads` (product/article images, served at `/uploads/*`), `logs`.
- Healthcheck: `GET /api`.
- Put a reverse proxy (nginx/Caddy) with TLS in front of `APP_PORT`.

### Xendit webhook

Set `XENDIT_CALLBACK_TOKEN`, and in the Xendit dashboard point the invoice callback at `https://<your-domain>/api/payments/xendit/callback`.

### Scheduled cleanup

Call these with the `x-cron-secret: $CRON_SECRET` header from a cron job:

- `POST /api/files/cleanup` — sweeps expired temp uploads
- `POST /api/orders/cleanup` — releases orders stuck awaiting payment

## CI/CD

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main` (or manually):

1. **verify** — `tsc`, `lint`, `paxel:check`, `build`. A failure stops the pipeline.
2. **deploy** — packs the git-tracked files into a tarball and pipes it over SSH as `deploy lindway`; the key's forced command (`deploy-gate.sh`) runs `/opt/lindway/bin/deploy.sh`. The build itself happens on the server with `docker compose`.

Repository secrets required: `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS` (output of `ssh-keyscan <host>`). The matching public key goes in the server's `/root/.ssh/authorized_keys` with a forced command (below), so the key can only run `deploy lindway`, never a shell.

[`deploy/`](deploy/) holds copies of the two scripts that run on the VPS.

### One-time server setup

```bash
mkdir -p /opt/lindway/bin
install -m 755 deploy/deploy.sh deploy/deploy-gate.sh /opt/lindway/bin/

# secrets: filled in from .env.example, never in git; copied into every deploy as .env
cp .env.example /opt/lindway/.env && nano /opt/lindway/.env
# Set SEED_ON_START=true for the very first deploy only, then remove it.

# one line in /root/.ssh/authorized_keys (public key from `ssh-keygen`, comment last):
command="/opt/lindway/bin/deploy-gate.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... lindway-ci-deploy
```

Layout afterwards: `/opt/lindway/{bin/, .env, current/, previous/}`. A forced-command key cannot open a shell, so test it with `ssh -i key root@host "deploy lindway" < /dev/null` (it will try to deploy an empty archive and fail), not `echo ok`.

### What a deploy does

Unpack to `/opt/lindway/next` → keep the live copy as `previous` → swap the new one in as `current` → `docker compose up -d --build` → poll `GET /api` on port **18083** (set in `deploy.sh`; point the reverse proxy there). If the build or health check fails, `previous` is restored and rebuilt automatically. The database, uploads and logs are docker volumes (project name pinned to `lindway`), so swapping folders never touches data.

Files intended for local tooling only (`CLAUDE.md`, `.claude/`) are not tracked by git, so they never reach GitHub, the deploy archive or the Docker image.
