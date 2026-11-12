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

`docker-compose.yml` runs the app and its own PostgreSQL. `docker-compose.beta.yml` is the app alone, for the beta site (see CI/CD below).

```bash
cp .env.example .env     # fill in secrets; see comments in the file
docker compose up -d --build
```

- On every start the container runs `prisma migrate deploy`, then serves on host port `APP_PORT` (default 18090, localhost only), which maps to port 4790 inside the container.
- Set `SEED_ON_START=true` for **one** start on a fresh database to load seed data, then remove it.
- `NEXT_PUBLIC_BASE_URL` is inlined into the client bundle at build time; changing it needs `--build`.
- Volumes: `pgdata` (database), `uploads` (product/article images, served at `/uploads/*`) and `logs`. The container runs as `www-data`, which owns the volumes.
- Healthcheck: `GET /api`.
- Put a reverse proxy (nginx/Caddy) with TLS in front of `APP_PORT`.

### Xendit webhook

Set `XENDIT_CALLBACK_TOKEN`, and in the Xendit dashboard point the invoice callback at `https://<your-domain>/api/payments/xendit/callback`.

### Scheduled cleanup

Call these with the `x-cron-secret: $CRON_SECRET` header from a cron job:

- `POST /api/files/cleanup` — sweeps expired temp uploads
- `POST /api/orders/cleanup` — releases orders stuck awaiting payment

## CI/CD

Two sites run from one server and **one database**:

| Site | Branch | Folder | Port | Compose project |
| --- | --- | --- | --- | --- |
| https://lindwayhome.com (main) | `main` | `/opt/lindway/main` | 18090 | `lindway` (runs the database) |
| https://beta.lindwayhome.com (beta) | `lindway-beta` | `/opt/lindway/beta` | 18091 (container 4091) | `lindway-beta` (app only) |

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main` or `lindway-beta` (or manually):

1. **verify** — `tsc`, `lint`, `paxel:check`, `build`. A failure stops the pipeline.
2. **deploy** — packs the git-tracked files into a tarball and pipes it over SSH as `deploy main` or `deploy beta` (chosen by the branch); the key's forced command (`deploy-gate.sh`) runs `/opt/lindway/bin/deploy.sh`. The build itself happens on the server with `docker compose`.

Repository secrets required: `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS` (output of `ssh-keyscan <host>`). The matching public key goes in the server's `/root/.ssh/authorized_keys` with a forced command (below), so the key can only run `deploy main` / `deploy beta`, never a shell.

### The deploy/ folder

```
deploy/
  config-sites.conf        nginx, both sites   -> /etc/nginx/sites-available/lindway
  bin/deploy.sh            deploy <main|beta>  -> /opt/lindway/bin/
  bin/deploy-gate.sh       forced SSH command  -> /opt/lindway/bin/
  bin/rollback.sh          rollback <main|beta> [stamp] -> /opt/lindway/bin/
  bin/apply-env.sh         apply an env/app.env change without a rebuild -> /opt/lindway/bin/
  bin/cron-cleanup.sh      expired uploads / unpaid orders -> /opt/lindway/bin/
  bin/backup-db.sh         daily pg_dump       -> /etc/cron.daily/lindway-db-backup
  env/app.env              secrets template    -> /opt/lindway/env/app.env
  coming-soon.html         public page while in development -> /opt/lindway/site/coming-soon.html
  systemd/app-lindwayhome.service, app-lindwayhome-beta.service -> /etc/systemd/system/
```

### Sharing one database

Beta uses the production database, the same secrets and the same uploads volume, so **everything beta does is real data**: an order placed on beta is a real order, an admin edit on beta edits production. Beta is for trying *code* (UI, logic), not data. Two guards are built in:

- **Beta never migrates or seeds** (`SKIP_MIGRATE=true` in `docker-compose.beta.yml`). Only main runs `prisma migrate deploy`, so a half-finished branch cannot change the live schema. Consequence: a branch that adds a migration works on beta only after main has applied it.
- **Both sites are closed to the public for now** (see "Access gate"): nobody can reach the shared data without a team sign-in. Beta is also served `noindex`.

Payments: the Xendit callback in the Xendit dashboard points at main only. The cleanup cron runs once, against main.

### One-time server setup

```bash
mkdir -p /opt/lindway/{bin,env,main,beta,backups}
install -m 755 deploy/bin/deploy.sh deploy/bin/deploy-gate.sh deploy/bin/rollback.sh deploy/bin/cron-cleanup.sh deploy/bin/apply-env.sh /opt/lindway/bin/
install -m 755 deploy/bin/backup-db.sh /etc/cron.daily/lindway-db-backup

# The container runs as www-data (uid 33). Volumes created by an older install may still belong to
# another uid, so hand them over once:
#   chown -R www-data:www-data /var/lib/docker/volumes/lindway_uploads/_data /var/lib/docker/volumes/lindway_logs/_data

# secrets: filled in from the template, never in git; shared by both sites
install -m 600 deploy/env/app.env /opt/lindway/env/app.env && nano /opt/lindway/env/app.env
# Set SEED_ON_START=true for the very first deploy of main only, then remove it.

# one line in /root/.ssh/authorized_keys (public key from `ssh-keygen`, comment last):
command="/opt/lindway/bin/deploy-gate.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... lindway-ci-deploy
```

Layout afterwards: `/opt/lindway/{bin/, env/app.env, backups/, main/{current,releases}, beta/{current,releases}}`. A forced-command key cannot open a shell, so test it with `ssh -i key root@host "deploy main" < /dev/null` (it will try to deploy an empty archive and fail), not `echo ok`. Deploy **main first** on a fresh server: beta joins main's Docker network to reach the database and refuses to deploy without it.

DNS: an `A` record for `beta.lindwayhome.com` pointing at the server, then add the name to the certificate:

```bash
certbot certonly --nginx --expand -d lindwayhome.com -d www.lindwayhome.com -d beta.lindwayhome.com
```

### Access gate

The app is still in development and both sites run on the live database, so neither is open to the public. They are closed in two different ways:

| | lindwayhome.com (main) | beta.lindwayhome.com (beta) |
| --- | --- | --- |
| Public sees | "Coming soon" page (503, no `noindex`) | the browser's sign-in popup (401, `noindex`) |
| Who can get in | nobody, until launch | the team, with the shared username and password |
| Closed by | the `$lw_main_closed` switch in `deploy/config-sites.conf` (nginx) | `TEAM_ACCESS_GATE=true` in `docker-compose.beta.yml` (the app's `src/proxy.ts`) |
| Credentials | none | `TEAM_ACCESS_USERNAME` / `TEAM_ACCESS_PASSWORD` in `/opt/lindway/env/app.env` |
| Session length | n/a | `TEAM_ACCESS_SESSION_HOURS` in the same file (default 24) |
| Code, port, container | branch `main`, 18090, `lindway-app` | branch `lindway-beta`, 18091 (container 4091), `lindway-beta-app` |
| Database, uploads | shared | shared |

**Beta password.** One shared username and password, kept only in the env file; whoever enters them is the team. Nothing is stored in the database and there is no dashboard for it. While either variable is empty beta stays shut for everyone.

```bash
# /opt/lindway/env/app.env
TEAM_ACCESS_USERNAME=team
TEAM_ACCESS_PASSWORD=choose-a-long-password
TEAM_ACCESS_SESSION_HOURS=24
```

**To change the password or the session length**, edit that file and run `/opt/lindway/bin/apply-env.sh` (seconds, no rebuild). Everyone has to sign in again.

**Session length.** A browser keeps popup credentials until it is closed and re-sends them on its own, so a plain check could never expire. The app therefore issues a signed cookie (`lw_session`) that lasts `TEAM_ACCESS_SESSION_HOURS`, and once that period has rolled over it refuses the first request even if the browser re-sent the old credentials, which makes the browser show the popup again. The cookie is for the beta host only, so signing in to beta never opens lindwayhome.com. Wrong passwords are counted per IP (10 in 10 minutes, then 429).

Xendit's payment callback (`POST /api/payments/xendit/callback`) is exempt on both sites, because it carries no browser credentials and must reach the app. The cleanup cron calls the app on `127.0.0.1` directly and never goes through either gate.

#### Opening lindwayhome.com to the public

On the server, in `/etc/nginx/sites-available/lindway`, change the `1` to `0` on this line, then reload:

```nginx
map $host $lw_main_closed { lindwayhome.com 1; default 0; }   # 1 = coming soon, 0 = open
```

```bash
nginx -t && systemctl reload nginx
```

That is the only change. Beta keeps its password, because the beta gate is separate. Keep `deploy/config-sites.conf` in step with the server copy. The "Coming soon" page is served from `/opt/lindway/site/coming-soon.html`:

```bash
install -d -m 755 /opt/lindway/site
install -m 644 deploy/coming-soon.html /opt/lindway/site/coming-soon.html
```

To open **beta** to everyone instead, remove the `TEAM_ACCESS_GATE` line from `docker-compose.beta.yml` and deploy.

### Nginx

[`deploy/config-sites.conf`](deploy/config-sites.conf) is the config for both sites in one file. It terminates TLS, raises the upload limit to 50 MB, adds security headers, and rate-limits login, register, the contact form, uploads and checkout. The Xendit callback is deliberately unthrottled, and `/api/files/cleanup` and `/api/orders/cleanup` return 404 from outside (the cron script calls the app on `127.0.0.1` directly). The host decides the upstream: `beta.lindwayhome.com` goes to port 18091, everything else to 18090.

```bash
cp deploy/config-sites.conf /etc/nginx/sites-available/lindway
ln -s /etc/nginx/sites-available/lindway /etc/nginx/sites-enabled/lindway
nginx -t && systemctl reload nginx
```

Rate limits are per client IP, so they rely on nginx sending the real address in `X-Forwarded-For` (the proxy block sets it). The upstream ports in the file must match `port=` in `deploy.sh`. HTTP/2 is not enabled.

### Run it as systemd services (shows in Cockpit)

Do this **after** the first successful deploy of each site, because the units never build.

```bash
cp deploy/systemd/app-lindwayhome.service deploy/systemd/app-lindwayhome-beta.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now app-lindwayhome
systemctl enable --now app-lindwayhome-beta     # after beta's first deploy
journalctl -u app-lindwayhome -f           # container logs
```

`app-lindwayhome-beta` requires `app-lindwayhome`, because the database lives in main's stack.

### What a deploy does

Unpack to `/opt/lindway/<app>/next` → move the live copy to `<app>/releases/<timestamp>` → swap the new one in as `current` → write `.env` from `env/app.env` plus that site's `NEXT_PUBLIC_BASE_URL` → `docker compose up -d --build` → poll `GET /api` on the site's port. If the build or health check fails, the version it replaced is restored and rebuilt automatically. The last 5 versions per site are kept in `releases/` (change `keep` in `deploy.sh`). The database and logs are docker volumes (project names pinned) and so are the uploads (`lindway_uploads`), so swapping folders never touches data. Back up the `lindway_uploads` volume (`/var/lib/docker/volumes/lindway_uploads/_data`); `backup-db.sh` dumps the database daily into `/opt/lindway/backups` and keeps 14 days. Everything under `/opt/lindway` is root-owned and not writable by others.

Manual rollback to any kept version:

```bash
ls /opt/lindway/main/releases              # pick a stamp
/opt/lindway/bin/rollback.sh main          # newest earlier version
/opt/lindway/bin/rollback.sh beta 20261105-020413
```

The version being replaced is kept too, so a rollback can itself be rolled back.

