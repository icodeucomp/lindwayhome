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
  bin/cron-cleanup.sh      expired uploads / unpaid orders -> /opt/lindway/bin/
  bin/backup-db.sh         daily pg_dump       -> /etc/cron.daily/lindway-db-backup
  env/app.env              secrets template    -> /opt/lindway/env/app.env
  coming-soon.html         public page while in development -> /opt/lindway/site/coming-soon.html
  systemd/app-lindwayhome.service, app-lindwayhome-beta.service -> /etc/systemd/system/
```

### Sharing one database

Beta uses the production database, the same secrets and the same uploads volume, so **everything beta does is real data**: an order placed on beta is a real order, an admin edit on beta edits production. Beta is for trying *code* (UI, logic), not data. Two guards are built in:

- **Beta never migrates or seeds** (`SKIP_MIGRATE=true` in `docker-compose.beta.yml`). Only main runs `prisma migrate deploy`, so a half-finished branch cannot change the live schema. Consequence: a branch that adds a migration works on beta only after main has applied it.
- **Both sites are closed to the public for now** ("Coming soon", see "Access gate"), so nobody can reach the shared data through either host; only people with the team link can. Beta is also served `noindex`.

Payments: the Xendit callback in the Xendit dashboard points at main only. The cleanup cron runs once, against main.

### One-time server setup

```bash
mkdir -p /opt/lindway/{bin,env,main,beta,backups}
install -m 755 deploy/bin/deploy.sh deploy/bin/deploy-gate.sh deploy/bin/rollback.sh deploy/bin/cron-cleanup.sh /opt/lindway/bin/
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

The app is still in development. **lindwayhome.com** shows a "Coming soon" page (503) to the public, and **beta.lindwayhome.com** asks for a username and password (HTTP basic auth, user `team`) so the team can test there. Every path is covered on both, API, uploads and admin included, which keeps the shared database out of reach. Search engines get a temporary 503 with `Retry-After` on the main domain (no `noindex`, so its SEO is preserved for a short period) and `noindex` on beta. The one request let through without the cookie is Xendit's payment callback (`POST /api/payments/xendit/callback`), which has to reach the app. The cleanup cron calls the app on `127.0.0.1` directly and never goes through the gate.

The secret lives in `/etc/nginx/lindway-access.conf` (root, mode 600, **not in git**), which `config-sites.conf` includes, so nginx will not start without it. Create it once:

```bash
install -d -m 755 /opt/lindway/site
install -m 644 deploy/coming-soon.html /opt/lindway/site/coming-soon.html

key=$(openssl rand -hex 24)
printf 'map $cookie_lw_access $lw_pass   { "%s" 1; default 0; }
map $arg_key          $lw_key_ok { "%s" 1; default 0; }
' "$key" "$key" > /etc/nginx/lindway-access.conf
chmod 600 /etc/nginx/lindway-access.conf
nginx -t && systemctl reload nginx
echo "https://beta.lindwayhome.com/team-access?key=$key"   # send this link to the team
```

Opening that link once sets a 30-day cookie for `lindwayhome.com` and `beta.lindwayhome.com`, after which both sites work in that browser. This is the only way into the main domain; beta also accepts the password, which is stored hashed in `/etc/nginx/lindway-beta.htpasswd` (not in git). Change it with `printf 'team:%s
' "$(openssl passwd -apr1 'NEW-PASSWORD')" > /etc/nginx/lindway-beta.htpasswd && systemctl reload nginx`. A wrong or missing key gets a 404. **Rotate** by running the block again (old cookies stop working at once). **Launch** by deleting the `if ($lw_gate) { return 503; }` line in `config-sites.conf` (and the access include), then reload; beta stays `noindex` through the `$lw_robots` map.

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

