# Lindway Home

Indonesian fashion e-commerce storefront for the Lindway brand (Denpasar, Bali): a single Next.js 16 App Router app with its own admin dashboard, PostgreSQL via Prisma, Paxel shipping and Xendit payments.

## Local development

```bash
npm install
npm run db:generate      # generated/prisma is gitignored, so a fresh clone must run this
cp .env.example .env     # then fill in DATABASE_URL and the secrets
npm run db:migrate
npm run db:seed
npm run dev              # http://localhost:4790
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

- On every start the container runs `prisma migrate deploy`, then serves on host port `APP_PORT` (default 18090, localhost only), which maps to port 4790 inside the container.
- Set `SEED_ON_START=true` for **one** start on a fresh database to load seed data, then remove it.
- `NEXT_PUBLIC_BASE_URL` is inlined into the client bundle at build time; changing it needs `--build`.
- Volumes: `pgdata` (database) and `logs`. Uploads (product/article images, served at `/uploads/*`) use a Docker volume by default, or a host folder when `UPLOADS_HOST_PATH` is set (production sets `/opt/lindway/uploads`).
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

# uploaded images live outside current/, which every deploy swaps. The container runs as uid 1500
# (see the Dockerfile), a no-login system user that owns nothing else, so this is the one folder
# under /opt/lindway that is not root-owned.
useradd --system -u 1500 -U --no-create-home --shell /usr/sbin/nologin lindway-app
mkdir -p /opt/lindway/uploads && chown 1500:1500 /opt/lindway/uploads
# the existing logs volume must follow when switching an older install:
#   chown -R 1500:1500 /var/lib/docker/volumes/lindway_logs/_data

# secrets: filled in from .env.example, never in git; copied into every deploy as .env
# (also set UPLOADS_HOST_PATH=/opt/lindway/uploads in it)
cp .env.example /opt/lindway/.env && nano /opt/lindway/.env
# Set SEED_ON_START=true for the very first deploy only, then remove it.

# one line in /root/.ssh/authorized_keys (public key from `ssh-keygen`, comment last):
command="/opt/lindway/bin/deploy-gate.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... lindway-ci-deploy
```

Layout afterwards: `/opt/lindway/{bin/, .env, uploads/, current/, releases/}`. A forced-command key cannot open a shell, so test it with `ssh -i key root@host "deploy lindway" < /dev/null` (it will try to deploy an empty archive and fail), not `echo ok`.

### Nginx

[`deploy/nginx/`](deploy/nginx/) is the whole site config in one file. It terminates TLS, raises the upload limit to 50 MB, adds security headers, and rate-limits login, register, the contact form, uploads and checkout. The Xendit callback is deliberately unthrottled, and `/api/files/cleanup` and `/api/orders/cleanup` return 404 from outside (the cron script calls the app on `127.0.0.1` directly).

```bash
cp deploy/nginx/lindway /etc/nginx/sites-available/lindway
ln -s /etc/nginx/sites-available/lindway /etc/nginx/sites-enabled/lindway
nginx -t && systemctl reload nginx
```

Rate limits are per client IP, so they rely on nginx sending the real address in `X-Forwarded-For` (the proxy block sets it). The upstream port in the file must match `port=` in `deploy.sh`. The file uses `listen 443 ssl http2`, which is right for nginx 1.24; on 1.25.1+ nginx warns that it is deprecated and `http2 on;` replaces it.

### Run it as a systemd service (shows in Cockpit)

Do this **after** the first successful deploy, because the unit never builds.

```bash
cp deploy/app-lindway.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now app-lindway
journalctl -u app-lindway -f      # container logs
```

### What a deploy does

Unpack to `/opt/lindway/next` → move the live copy to `releases/<timestamp>` → swap the new one in as `current` → `docker compose up -d --build` → poll `GET /api` on port **18090** (set in `deploy.sh`; point the reverse proxy there). If the build or health check fails, the version it replaced is restored and rebuilt automatically. The last 5 versions are kept in `releases/` (change `keep` in `deploy.sh`). The database and logs are docker volumes (project name pinned to `lindway`) and uploads are the host folder `/opt/lindway/uploads`, so swapping folders never touches data. Back up `/opt/lindway/uploads` and the `pgdata` volume. Everything under `/opt/lindway` is root-owned and not writable by others, except `uploads/`.

Manual rollback to any kept version:

```bash
cd /opt/lindway && ls releases                      # pick a timestamp
mv current releases/$(date +%Y%m%d-%H%M%S)-bad && mv releases/<timestamp> current
cd current && APP_PORT=18090 docker compose -p lindway up -d --build
```

Files intended for local tooling only (`CLAUDE.md`, `.claude/`) are not tracked by git, so they never reach GitHub, the deploy archive or the Docker image.
