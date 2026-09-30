# Hajar Supermarkt

An online supermarket for private (B2C) customers in Austria, with home
delivery and cash/card-on-delivery payment. Bilingual German/Arabic storefront,
customer accounts with email/phone verification, an admin back office for
products, orders, customers, accounting and store settings, and a
mobile delivery view for drivers.

This README is the project's only documentation file. Contributor and
architecture notes for Claude Code live in [`CLAUDE.md`](CLAUDE.md).

## Contents

1. [Features](#1-features)
2. [Tech stack](#2-tech-stack)
3. [Local development](#3-local-development)
4. [Deployment](#4-deployment)
5. [Distance-based delivery fee](#5-distance-based-delivery-fee)
6. [Personal data & GDPR](#6-personal-data--gdpr)
7. [Security](#7-security)
8. [Roadmap](#8-roadmap)
9. [Feature history](#9-feature-history)
10. [Design system](#10-design-system)

---

## 1. Features

- **Customers**: register with email OTP and a phone code sent via WhatsApp
  (Meta WhatsApp Cloud API); an account must be verified before it can order. Order
  history with live status, one-click reorder, printable order report, push
  notifications, and a preferred language (DE/AR) used for every email and
  push.
- **Admin back office** at an obscured path (`ADMIN_BASE` in
  `frontend/src/config/adminPath.js`, default `/console-eb68a2f3`): dashboard,
  products, orders, customers, accounting, promotions and coupons, settings,
  audit log. Settings, Accounting, Customers and Promotions are additionally
  gated by a section PIN.
- **Drivers**: mobile `/driver` portal. Every driver has an individual account
  and PIN; a login only becomes a session after an admin approves it on the
  Dashboard. Drivers see only orders assigned to them and can only set
  `out_for_delivery` / `shipped` / `delivered`.
- **Store operations**: distance-based delivery fees, delivery time windows,
  postal-code allow-list, minimum order value, free-delivery threshold,
  maintenance mode, low-stock alerts, Google reviews widget.

## 2. Tech stack

- **Backend**: Node.js, Express 5, Prisma ORM on PostgreSQL, JWT auth in
  HttpOnly cookies, Nodemailer, WhatsApp Cloud API (phone verification), web-push
  (VAPID), optional Redis (rate limiting)
- **Frontend**: React 19, Vite, Tailwind CSS, React Router 7
- **Deployment**: nginx (reverse proxy + static hosting) + PM2 (cluster mode)

```
backend/       Express API, Prisma schema, controllers, routes, email templates, tests
frontend/      React storefront + admin dashboard + driver view (one Vite app)
deployment/    nginx.conf and PM2 ecosystem.config.js for production
```

---

## 3. Local development

### Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database (local, or managed: Supabase, Neon, RDS…)
- Optional: an SMTP account (e.g. Gmail with an
  [App Password](https://myaccount.google.com/apppasswords)); without it,
  emails are logged to the console instead of sent

### Environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Never commit `.env` files.

**`backend/.env`**

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` or `production`. Production disables dev helpers (on-screen OTP codes, verbose OTP logging) and requires `ENCRYPTION_KEY`. |
| `PORT` | API port (default `5000`). |
| `HOST` | Interface to listen on. `127.0.0.1` in production (also set in `deployment/ecosystem.config.js`) so the API is reachable only through nginx; leave unset in local development. |
| `DATABASE_URL` | PostgreSQL connection string. On Supabase use the pooled connection (Transaction mode, port 6543) with `?pgbouncer=true`. PM2 cluster mode runs several processes, each with its own Prisma pool, and the pooler keeps them within the connection limit. |
| `DIRECT_URL` | Direct connection (port 5432, no pgbouncer), used by `prisma db push` and the backup scripts ([4.7](#47-backups-and-the-encryption-key)). Without a pooler, set it to the same value as `DATABASE_URL` (Prisma requires the variable to exist). |
| `JWT_SECRET` | Random secret, at least 32 characters (`openssl rand -hex 32`). Required; the server won't start without it. |
| `SECTION_UNLOCK_SECRET` | Random secret, at least 32 characters, **different from `JWT_SECRET`**. Required. |
| `ENCRYPTION_KEY` | 64 hex characters (`openssl rand -hex 32`); AES key for PII at rest. Required in production. Outside production, a missing key stores PII unencrypted (with a startup warning). |
| `FRONTEND_URL` | Public frontend URL(s), comma-separated. Used for CORS and links in emails. Must be the real domain in production. |
| `TRUST_PROXY` | `true` (default) behind nginx; needed for correct client IPs in rate limiting. |
| `FORCE_SECURE_COOKIES` | `true` for HTTPS staging environments that don't set `NODE_ENV=production`. |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_FROM` | SMTP for OTPs, order emails, password reset. Placeholder values → emails are skipped and logged. |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_OTP_TEMPLATE` | WhatsApp Cloud API for phone verification codes ([4.4](#44-whatsapp-phone-verification)). Unset in development → codes are logged to the console; unset in production → phone verification fails. |
| `WHATSAPP_TEMPLATE_DEFAULT_LANGUAGE` / `WHATSAPP_GRAPH_API_VERSION` | Optional; template language used when the customer's language isn't available (default `de`), Graph API version (default `v23.0`). |
| `REDIS_URL` | Recommended in production; shares rate-limit counters across processes/servers. Without it each PM2 worker counts on its own, so every limit is multiplied by the worker count (the server warns at startup). |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Optional; Web Push for order-status notifications. Generate the pair with `npx web-push generate-vapid-keys`. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Optional; admin created by the seed script. Without a password a one-time random one is printed. |
| `PRISMA_LOG_QUERIES` | Optional; `true` prints every SQL query Prisma runs (debugging only, very noisy). Off by default. |
| `TEST_CUSTOMER_EMAIL` / `TEST_CUSTOMER_PHONE` / `TEST_CUSTOMER_NAME` / `TEST_CUSTOMER_PASSWORD` | Optional; the verified test customer created by `node scripts/createTestCustomer.js`. Without a password a random one is printed once. |
| `BACKUP_DIR` / `BACKUP_KEEP_DAYS` / `BACKUP_KEEP_MONTHS` | Backups ([4.7](#47-backups-and-the-encryption-key)): where `npm run backup` writes (default `backups/` at the repo root, gitignored), and how long they're kept (default: every backup of the last 14 days, plus the newest of each of the last 3 months). |
| `BACKUP_COPY_COMMAND` | Command run after each backup to copy it off the server; the file path is in `$BACKUP_FILE`. Unset → the backup stays only on the server (with a warning). |
| `RESTORE_TEST_URL` | Optional; Postgres server for `npm run backup:restore-test` to create its scratch database on. Defaults to `DIRECT_URL`. |
| `PG_BIN_DIR` | Optional; folder with `pg_dump` / `pg_restore` / `psql` when they aren't on `PATH` (e.g. `C:\Program Files\PostgreSQL\17\bin`). |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` | Optional; error tracking with Sentry ([4.8](#48-monitoring-and-logs)). Unset → off, and the Sentry library isn't loaded. `SENTRY_ENVIRONMENT` defaults to `NODE_ENV`. |

**`frontend/.env`**

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Leave **empty** when nginx proxies `/api` on the same domain (standard setup). Only set an absolute URL if the API is on a separate host. |
### Run it

```bash
# Backend
cd backend
npm install
npx prisma db push      # sync the schema (this project doesn't use `prisma migrate`)
npm run prisma:seed     # optional: default admin + sample categories/products/delivery windows
npm run dev             # API on http://localhost:5000, restarts on file changes
npm test                # unit tests (Node's built-in test runner)

# Frontend (second terminal)
cd frontend
npm install
npm run dev             # Vite on http://localhost:5173
npm run lint            # oxlint
npm run build           # production build -> frontend/dist
```

Or run `./start.sh` / `start.bat` from the repo root to start both.

The admin login is at `${ADMIN_BASE}/login` (currently
`/console-eb68a2f3/login`). Change `ADMIN_BASE` before deploying a fork. It
hides the page but is not real access control.

**Test data** (from `backend/`, after the seed):

```bash
node scripts/createTestCustomer.js      # a verified customer you can log in with (TEST_CUSTOMER_* vars)
node scripts/createFakeOrders.js 50     # 50 demo orders over the last 14 days, all statuses (default 30)
node scripts/createFakeOrders.js --delete   # remove every demo order again
```

Demo orders are guest orders tagged `[Demo-Bestellung]` in their internal note;
`--delete` only removes orders with that tag. Stock is not changed. The script
refuses to run with `NODE_ENV=production` unless `--allow-production` is passed.

**Schema changes**: edit `backend/prisma/schema.prisma`, then run
`npx prisma db push`. There is no migrations directory.

**CI**: `.github/workflows/ci.yml` runs the backend tests plus frontend lint and
build on every pull request and every push to `main`.

---

## 4. Deployment

### 4.1 What you need

| What | Why | Required? |
|---|---|---|
| A VPS, or a host that runs a persistent Node process (Railway, Render) | The backend is a long-running process (PM2), writes cached logos to local disk and calls `app.listen()`. It does not fit serverless hosts like Vercel. The static frontend can go anywhere. | Yes |
| PostgreSQL | Supabase, Neon, self-hosted, … | Yes |
| A domain + TLS certificate | Public URL, HTTPS, CORS (`FRONTEND_URL`) | Yes |
| SMTP account | OTPs, order emails, password resets | Recommended |
| Meta WhatsApp Business account | Phone verification codes via WhatsApp | Yes (customers can't order without a verified phone) |
| Redis | Shared rate limiting across PM2 instances/servers | Recommended (PM2 runs one worker per CPU core) |

### 4.2 Server and database

```bash
sudo apt update
sudo apt install -y nodejs npm nginx postgresql-client
sudo npm install -g pm2
git clone <your-repo-url> /var/www/supermarket
cd /var/www/supermarket/backend
npm install
npx prisma db push
```

- **Supabase / pooled Postgres**: take both connection strings from Project
  Settings → Database. Put the pooled one (port 6543, add `?pgbouncer=true`)
  in `DATABASE_URL` and the direct one (port 5432) in `DIRECT_URL`.
- **Self-hosted Postgres**: set `DATABASE_URL`, and set `DIRECT_URL` to the
  same value.

#### One-time: money columns Float → Decimal (existing databases only)

All euro amounts (prices, discounts, fees, order totals, accounting) are
`DECIMAL(10,2)`. On a database created before this change, `prisma db push`
stops with "data loss" warnings because every value gets rounded to whole
cents. That rounding is the purpose of the change; Prisma alters the columns in
place and drops nothing.

```bash
pg_dump "$DIRECT_URL" > backup-before-decimal.sql   # 1. back up
pm2 stop all                                        # 2. no writes during the change
cd backend && npx prisma db push --accept-data-loss # 3. apply
pm2 start ../deployment/ecosystem.config.js         # 4. start the new code
```

Before confirming, read the warnings. Every line should say "cast from
`DoublePrecision` to `Decimal(10,2)`". If any line mentions a dropped column
or table, the schema and database are out of sync: stop and investigate.

### 4.3 Production environment

In `backend/.env`, use the variables from [section 3](#environment-variables)
with these values:

```env
NODE_ENV=production
PORT=5000
HOST=127.0.0.1
TRUST_PROXY=true
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=<openssl rand -hex 32>
SECTION_UNLOCK_SECRET=<openssl rand -hex 32, different>
ENCRYPTION_KEY=<openssl rand -hex 32>
REDIS_URL=redis://localhost:6379
# plus DATABASE_URL, DIRECT_URL, EMAIL_*, WHATSAPP_*, and optionally VAPID_*
```

The backend's rate limiter keeps its counters in Redis when `REDIS_URL` is
set, otherwise in each process's memory. PM2 runs one process per CPU core
(`instances: 'max'`) and doesn't pin a client to one worker, so without Redis
every limit is multiplied by the number of workers.

The `limit_req` zones in `deployment/nginx.conf` are the real per-IP limit on
the login, registration, one-time-code, 2FA and PIN endpoints, in front of all
workers. They only help if nginx is the only way in: keep `HOST=127.0.0.1` so
port 5000 isn't reachable from outside. With `trust proxy` on, a directly
reachable backend would trust a client-supplied `X-Forwarded-For` header.

Generate the secrets fresh for each deployment; never copy them from dev.

### 4.4 WhatsApp (phone verification)

The customer's phone number is verified with a 6-digit code the backend sends
through Meta's WhatsApp Cloud API (`backend/utils/whatsappService.js`). The
customer presses "Code per WhatsApp senden" (`POST /api/customer/resend-otp`
with `type: 'phone'`) and enters the code (`POST /api/customer/verify-phone`).
Codes are valid for 10 minutes, can be re-sent after 60 seconds, and lock
after 5 wrong attempts. Only backend config is needed; the browser never talks
to Meta.

1. In [Meta for Developers](https://developers.facebook.com/apps) create a
   **Business** app and add the **WhatsApp** product. Link it to your Meta
   Business portfolio (business verification is needed to message more than
   a few test numbers).
2. Add and verify the store's sending phone number (WhatsApp → API Setup).
   Copy its **Phone number ID** into `WHATSAPP_PHONE_NUMBER_ID`.
3. In WhatsApp Manager → Message templates, create a template in category
   **Authentication**, with the **Copy code** button, in German (`de`) and
   Arabic (`ar`) under the same name. Put the name in `WHATSAPP_OTP_TEMPLATE`.
   Customers get the language they chose; if a language isn't approved yet,
   `WHATSAPP_TEMPLATE_DEFAULT_LANGUAGE` (default `de`) is used.
4. In Business Settings → System users, create a system user, assign it the
   app and the WhatsApp account, and generate a **permanent** token with the
   `whatsapp_business_messaging` permission. Put it in `WHATSAPP_ACCESS_TOKEN`
   (the temporary token from API Setup expires after 24 hours).
5. Add a payment method in WhatsApp Manager: authentication messages are
   billed per message delivered.

**Development vs production:** with `NODE_ENV=production` the code is always
sent with the template, and `WHATSAPP_OTP_TEMPLATE` is required. In any other
environment it's sent as a plain text message instead, so you can test
before the template is approved. WhatsApp only delivers free text within 24
hours after the recipient last messaged your business number, so first send
any message from the test phone to that number (and, on Meta's test number,
add the phone as a recipient under API Setup). Otherwise Meta rejects it with
error 131047.

In development you can leave the `WHATSAPP_*` variables empty: the code is
printed to the backend console instead. In production a missing config makes
sending fail with an error, since customers can't order without a verified
phone.

Cost control: each send is limited by the per-IP `authLimiter`, nginx's
`limit_req` on `resend-otp`, the 60-second cooldown per account and the
one-account-per-phone-number rule. Keep an eye on the WhatsApp Manager
insights for unusual volume.

### 4.5 Build, start, nginx

```bash
cd /var/www/supermarket/frontend && npm install && npm run build   # -> frontend/dist
cd ../backend
pm2 start ../deployment/ecosystem.config.js   # cluster mode, instances: 'max', port 5000
pm2 save
pm2 startup                                   # follow the printed instructions
```

Use [`deployment/nginx.conf`](deployment/nginx.conf):

```bash
sudo cp deployment/nginx.conf /etc/nginx/sites-available/supermarket.conf
# edit server_name and the ssl_certificate paths
sudo ln -s /etc/nginx/sites-available/supermarket.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

That config handles:
- redirecting HTTP to HTTPS, with TLS 1.2/1.3 only;
- security headers (HSTS, Content-Security-Policy, `X-Frame-Options`,
  `nosniff`, Referrer-Policy, Permissions-Policy) on every location — nginx
  drops server-level `add_header`s in any location that sets its own, so
  locations set caching with `expires` instead;
- serving `frontend/dist` with a single-page-app fallback, hashed `/assets/`
  cached for good and `index.html` never cached;
- proxying `/api/` and `/uploads/` to `127.0.0.1:5000` with `X-Forwarded-*`
  headers, which Express needs for `trust proxy`;
- per-IP rate limits on the login, register, one-time-code, 2FA and PIN
  endpoints (under all three customer route prefixes).

After changing the CSP, complete one registration with phone verification
with the browser console open, to check nothing the page needs is blocked.

Point DNS at the server and get a certificate (e.g. Certbot).

### 4.6 First run

1. `cd backend && npm run prisma:seed`. This creates the admin plus sample
   categories and delivery windows, and is safe to re-run. If the admin
   password was auto-generated, note it and change it.
2. Change `ADMIN_BASE` from the default.
3. Settings: set the **section PIN** (it gates Settings, Accounting, Customers
   and Promotions). Changing the PIN later locks every section that was
   unlocked with the old one.
4. Settings → **Fahrerkonten**: create one account per driver. Each PIN is
   shown once and never stored in plaintext, so give it to the driver through
   another channel.
5. Fill in the store details: name, logo, address/coordinates, delivery fees
   and windows, Impressum.
6. Check that Settings → Allgemein → **Wartungsmodus** (maintenance mode) is
   off.

After each deploy that adds `tokenVersion` checks, every user is logged out
once. This is expected.

### 4.7 Backups and the encryption key

Two things must survive losing the server: the **database** and the
**`ENCRYPTION_KEY`**. Customer contact details and the order snapshots (name,
phone, email, address) are encrypted with that key ([6](#6-personal-data--gdpr)),
and orders must be kept for 7 years (§ 132 BAO). A backup without the key
can't be read, and the key alone has nothing to open. Keep them in
**different places**: a key stored next to the backups defeats the encryption.

#### The encryption key

1. As soon as `ENCRYPTION_KEY` is generated, save it in a password manager
   (Bitwarden, 1Password, …) in an entry the business owner controls, not only
   on the server. A printed copy in a safe is a good second copy. Saving the
   whole `backend/.env` there is simplest.
2. Save the key's fingerprint in the same entry. `cd backend && npm run key:check`
   prints it (`Key fingerprint: …`); it identifies the key without revealing it.
3. Check that the saved copy works: `npm run key:check -- --prompt`, then paste
   the key from the password manager (the input is hidden). `OK` means the copy
   opens the data. `FAIL` means it isn't the key the data was encrypted with.
4. Never replace `ENCRYPTION_KEY` on a server that has data. There's no key
   rotation, so values encrypted with the old key would become unreadable.
   When rebuilding a server, use the saved copy, never a new key.

The other secrets can be replaced if lost: a new `JWT_SECRET` or
`SECTION_UNLOCK_SECRET` only logs everyone out, new VAPID keys mean customers
re-enable push, and SMTP/WhatsApp credentials can be re-issued.

#### Nightly backup

`npm run backup` (`backend/scripts/backupDatabase.js`) dumps the app's schema
with `pg_dump` (compressed custom format), checks the file with
`pg_restore --list`, deletes old backups (see `BACKUP_KEEP_*` in
[3](#environment-variables)), and runs `BACKUP_COPY_COMMAND` to copy the new
file off the server. It connects with `DIRECT_URL`; Supabase's pooler can't
run `pg_dump`.

`pg_dump` must be the **same major version as the database server, or newer**.
Ubuntu's `postgresql-client` may be older, so install the matching version from
the [PostgreSQL apt repository](https://wiki.postgresql.org/wiki/Apt), e.g.
`sudo apt install -y postgresql-client-17`.

```bash
sudo mkdir -p /var/backups/supermarket
sudo chown "$USER" /var/backups/supermarket && chmod 700 /var/backups/supermarket
# in backend/.env: BACKUP_DIR=/var/backups/supermarket (+ BACKUP_COPY_COMMAND, below)
cd /var/www/supermarket/backend && npm run backup   # first run by hand
```

Then run it every night from the deploy user's crontab (`crontab -e`):

```cron
MAILTO=you@example.com
30 3 * * * cd /var/www/supermarket/backend && node scripts/backupDatabase.js >> /var/backups/supermarket/backup.log 2>&1 || echo "Hajar backup FAILED, see /var/backups/supermarket/backup.log"
```

A failed backup logs `BACKUP FAILED: …` and exits with code 1, so cron emails
the echo line (when the server can send mail). Otherwise, look at the end of
`backup.log` once a week.

**Off-site copy.** A backup on the same server is lost with the server. The
dump contains customer names in plain text and all order data, so the
off-site copy must be **encrypted and private**. One way is
[rclone](https://rclone.org) with a `crypt` remote in front of any storage
(Hetzner Storage Box, Backblaze B2, S3, …):

```bash
rclone config        # add the storage remote, then a "crypt" remote on top of it, e.g. "offsite-crypt"
# in backend/.env:
BACKUP_COPY_COMMAND=rclone copy "$BACKUP_FILE" offsite-crypt:hajar-backups
```

Save the crypt remote's passwords in the password manager too. `rclone copy`
never deletes, so trim the remote now and then, e.g.
`rclone delete --min-age 100d offsite-crypt:hajar-backups`.

On Supabase, the platform's own backups depend on your plan; this dump is a
copy you control either way.

Not in the backup: `backend/.env` (keep it in the password manager),
`backend/uploads/` (the cached store logo; save it again in Settings), and
Redis (only rate-limit counters).

#### Monthly restore test

A backup counts only once it has been restored. Once a month, and after
changing anything about backups:

```bash
cd /var/www/supermarket/backend
npm run backup:restore-test -- --prompt    # paste the key from the password manager
```

It restores the newest backup into a new scratch database
(`supermarket_restore_test_<time>`), prints the row counts, checks that the
pasted key opens the restored data, and drops the scratch database again. It
never drops any other database. `RESTORE TEST PASSED` means both the backup and
your key copy work. The database user needs permission to create databases. If
it doesn't have it, set `RESTORE_TEST_URL` to another Postgres server (for
example one on your own computer), copy a backup file there, and pass its path:
`npm run backup:restore-test -- --prompt path/to/file.dump`.

#### Restoring after a disaster

1. Set up the new server as in 4.2–4.5, but put the **saved** `ENCRYPTION_KEY`
   in `backend/.env`, not a new one.
2. Create a new, empty database (a new Supabase project, or `createdb`) and
   set `DATABASE_URL` / `DIRECT_URL`. Don't run `prisma db push` first: the
   backup creates the tables.
3. Restore the newest backup. `--clean` removes whatever the target already
   contains, so only restore into the new, empty database:

   ```bash
   pg_restore --no-owner --no-privileges --clean --if-exists --exit-on-error \
     --dbname="$DIRECT_URL" /var/backups/supermarket/supermarket-<time>.dump
   ```

4. `npm run key:check` must say `OK`. `npx prisma db push` should then report
   that the database is already in sync.
5. Start the app (`pm2 start ../deployment/ecosystem.config.js`), then
   re-delete any customers who asked for deletion after that backup was taken
   ([6](#retention)).

### 4.8 Monitoring and logs

**Is the shop up?** `GET /api/health` answers `200 {"status":"ok","database":"ok"}`
only when both the API and the database respond. When the database doesn't, it
answers `503 {"status":"error","database":"down"}` and logs the failure. Point
an uptime monitor at `https://yourdomain.de/api/health` every 1–5 minutes, with
alerts to your phone or email: for example UptimeRobot or Better Stack (both have
free plans). The monitor only sees that URL, no customer data. `/health` is the
same check for use on the server itself (`curl -s localhost:5000/health`),
since nginx only forwards `/api/` and `/uploads/`.

**Logs.** PM2 keeps the backend's output in `~/.pm2/logs/` (one `-out.log` and
one `-error.log` for all workers), with a timestamp on every line:

```bash
pm2 logs supermarket-backend --lines 100   # recent lines, then keeps following
```

Server errors are logged with their stack trace. Every 5xx response and every
request slower than 2 s also gets a line like
`[request] <id> GET /api/orders -> 500 in 35 ms`. Only the method and path are
logged: bodies and query strings can contain personal data. Every response has
an `X-Request-Id` header (browser devtools → Network), and a 500 response also
returns it as `requestId`. To find the matching log lines:
`grep <id> ~/.pm2/logs/*.log`.

**Log rotation.** PM2 never deletes old logs by itself, so install its rotation
module once:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```

That rotates daily, or at 10 MB, and keeps the last 14 files. nginx's logs in
`/var/log/nginx/` are already rotated by Ubuntu.

**Deploys without dropped requests.** Use `pm2 reload supermarket-backend`, not
`restart`. It starts new workers first; each old worker stops taking new
connections, lets its running requests finish (up to 8 s), then exits. After a
change to `deployment/ecosystem.config.js` itself, re-create the process once so
PM2 picks up the new settings (a few seconds of downtime):

```bash
pm2 delete supermarket-backend && pm2 start ../deployment/ecosystem.config.js && pm2 save
```

**Error tracking (optional, Sentry).** Off until `SENTRY_DSN` is set. Then the
backend reports every server error and crash to [Sentry](https://sentry.io), which
emails you about new problems. Only the backend reports; customers' browsers
never contact Sentry, and with no `SENTRY_DSN` the Sentry library isn't even
loaded. Before anything is sent, `backend/utils/errorEvents.js` strips personal
data. A report keeps:

- the error message, with email addresses and phone numbers masked and Prisma's
  data dump removed;
- the stack trace, with the surrounding lines of the shop's code;
- the request's method and path;
- the `request_id` tag (the response's `X-Request-Id`).

It never contains query strings, headers, cookies, request bodies, IP addresses
or earlier log lines.

1. Create an account at sentry.io and choose the **EU data region** (Frankfurt)
   when creating the organization; it can't be changed later. An EU DSN contains
   `.de.sentry.io`.
2. Create a project for Node.js / Express and copy its DSN.
3. In the organization's settings, accept Sentry's Data Processing Addendum
   (Art. 28 GDPR). Under Security & Privacy, turn on "Prevent storing of IP
   addresses" and keep the data scrubber on as a second safety net.
4. Check that an alert rule emails you when a new issue appears (new projects
   have one).
5. Put `SENTRY_DSN=…` in `backend/.env` and run `pm2 reload supermarket-backend`.
6. The privacy policy (`/datenschutz`, section 2) now shows its "Fehlerberichte
   (Sentry)" paragraph automatically; it's hidden while `SENTRY_DSN` is unset.
   It says the data is stored in the EU under a processing agreement, so steps
   1 and 3 must be done. Have the wording checked like the rest of the policy.

Without Sentry, errors are only in the PM2 logs.

### 4.9 Go-live checklist

- [ ] `.env` files not committed; secrets freshly generated for this deployment
- [ ] Uptime monitor on `https://<your domain>/api/health` with alerts, and `pm2-logrotate` installed ([4.8](#48-monitoring-and-logs))
- [ ] If using Sentry: EU region, processing agreement accepted, IP storage off, the `/datenschutz` paragraph checked ([4.8](#48-monitoring-and-logs))
- [ ] `ENCRYPTION_KEY` (or the whole `.env`) saved in a password manager with its fingerprint; `npm run key:check -- --prompt` says `OK` ([4.7](#47-backups-and-the-encryption-key))
- [ ] Nightly backup in cron, `BACKUP_COPY_COMMAND` copies it off the server encrypted, and one `npm run backup:restore-test -- --prompt` has passed
- [ ] `FRONTEND_URL` is the real production domain, not `localhost`
- [ ] `HOST=127.0.0.1` and `REDIS_URL` set; port 5000 not reachable from outside
- [ ] nginx serves HTTPS only; HTTP redirects to HTTPS; `nginx -t` passes
- [ ] WhatsApp: permanent system-user token set, OTP template approved in `de` and `ar`, payment method added ([4.4](#44-whatsapp-phone-verification))
- [ ] `ADMIN_BASE` changed from the default
- [ ] One full run: customer registration → order → admin fulfilment → driver delivery
- [ ] Consider a WAF/DDoS layer in front (e.g. Cloudflare); the app itself has none

---

## 5. Distance-based delivery fee

### Model

```
distance fee = round(D × rate per km, 2)
delivery fee = base fee + distance fee        e.g. 2.00 € + 2.7 km × 0.10 € = 2.27 €
```

- `D` is the road driving distance from the store (default Koppreitergasse 8,
  1120 Wien) to the customer's exact street address, not just the district.
- Store settings: `deliveryFee` (base, default 2.00 €), `deliveryFeePerKm`
  (default 0.10 €), `freeDeliveryThreshold`, `maxDeliveryDistanceKm`
  (0 = unlimited), `storeLatitude` / `storeLongitude`. They are set under
  Settings → *Lieferung & Zeitfenster*, which also has a button to geocode the
  store address.
- **Free delivery** applies when the cart reaches `freeDeliveryThreshold` or
  a free-shipping coupon is applied.
- **Maximum distance**: checkout is blocked with a clear message beyond
  `maxDeliveryDistanceKm`. An address that can't be located is also blocked,
  but only when a maximum is set.

### How the distance is found (`backend/utils/distanceService.js`)

1. **Normalize the address.** Apartment details are stripped (`Top 4`,
   `Stiege 2`, `Tür 14`, `Stock 1`, `Apt/Floor`), and `166/4` becomes `166`.
   Geocoders fail on these details.
2. **Geocode**: Photon (OSM, biased toward the store location) → Nominatim
   (one retry after 400 ms) → a built-in table of postal-code centroids for
   Vienna and the surrounding area. The last fallback works offline, so
   checkout never breaks when those services are down.
3. **Route**: OSRM gives the real road distance. If it doesn't answer within
   2.5 s, straight-line distance × 1.25 is used instead.
4. **Cache**: coordinates and routes are kept in memory for 1 hour
   (max 1000 entries).

The server recalculates the fee when each order is created and stores
`deliveryDistanceKm`, `baseDeliveryFee`, `distanceDeliveryFee`, `deliveryFee`
on the order. The cart shows the breakdown live, and admin order views and
receipts show distance and fee components.

### API

`POST /api/delivery-distance/calculate` (public, rate-limited)

```json
{ "address": "Margaretenstraße 166, Top 4, 1050 Wien", "postalCode": "1050" }
```

```json
{
  "distanceKm": 2.7, "straightLineKm": 2.1,
  "isExactAddress": true, "isApproximate": false,
  "source": "photon_osm", "routingEngine": "osrm_driving",
  "destinationCoordinates": { "lat": 48.1861007, "lon": 16.3449607 },
  "originCoordinates": { "lat": 48.1746605, "lon": 16.3272662 },
  "baseFee": 2.0, "perKmRate": 0.1, "distanceFee": 0.27, "totalDeliveryFee": 2.27,
  "isWithinMaxDistance": true, "maxDeliveryDistanceKm": 15.0
}
```

`POST /api/delivery-distance/geocode-store` (admin) geocodes the store address.

### Verified examples (base 2.00 €, 0.10 €/km)

| Address | Distance | Fee |
|---|---|---|
| Margaretenstraße 166, Top 4, 1050 Wien | 2.7 km | 2.27 € |
| Reinprechtsdorfer Straße 12, 1050 Wien | 3.3 km | 2.33 € |
| Pilgramgasse 15, 1050 Wien | 3.6 km | 2.36 € |
| Thaliastraße 10, 1160 Wien | 5.1 km | 2.51 € |
| Thaliastraße 100, 1160 Wien | 5.6 km | 2.56 € |
| Wagramer Straße 100, 1220 Wien (15 km limit) | 15.8 km | blocked |

---

## 6. Personal data & GDPR

This section is the internal policy. The public privacy notice and the legal
basis for each processing purpose are on `/datenschutz`
(`frontend/src/pages/Datenschutz.jsx`).

### What is stored

| Data | Where | Protection |
|---|---|---|
| Name, email, phone, address | `Customer` | Email, phone and address fields AES-256-GCM encrypted (`backend/utils/piiCrypto.js`); email/phone lookups via HMAC-SHA-256 hashes |
| Order history; customer name/phone/email and delivery address/notes as they were at order time | `Order` | Snapshot fields encrypted (`encrypt` on write, `withDecryptedCustomer` in `backend/controllers/orderShared.js` on read) |
| Password | `Customer.password` | bcrypt hash |
| Error reports (only when `SENTRY_DSN` is set, [4.8](#48-monitoring-and-logs)) | Sentry, EU region | Personal data stripped before sending (`backend/utils/errorEvents.js`); IP storage off in Sentry; listed in `/datenschutz` §2 while enabled |

The order snapshot is deliberately separate from the `Customer` row, so
invoices stay readable after an account is deleted. Rows created before
encryption was introduced are backfilled by
`backend/scripts/encryptCustomerPii.js` and
`backend/scripts/encryptOrderSnapshotPii.js`, both safe to re-run.

### Retention

- **Customer accounts**: kept until the customer asks for deletion. There is
  no automatic purge.
- **Orders and invoices**: kept for 7 years, as required by Austrian tax law
  (§ 132 BAO). Deleting a customer sets `Order.customerId` to null
  (`onDelete: SetNull`) rather than deleting the orders. Deleting an order is
  blocked (403, audit-logged).
- **OTP codes / reset tokens**: 15–60 minutes, cleared on use or expiry.
- **Database backups** ([4.7](#47-backups-and-the-encryption-key)): every
  nightly backup of the last 14 days, plus the newest of each of the last 3
  months (`BACKUP_KEEP_DAYS`, `BACKUP_KEEP_MONTHS`, and the same for the
  off-site copy). A deleted customer disappears from the backups when the last
  backup that still contains them expires. Backups are only used to restore
  the shop. If one is ever restored, delete again every customer whose
  deletion request came after that backup was taken, so keep those requests
  (the emails) until the backups have expired.

### Handling a "delete my data" request

1. The customer writes to the address on `/datenschutz` (privacy policy §6,
   "Recht auf Löschung") or to the admin.
2. The admin opens **Kunden**, finds the customer and clicks **Entfernen**
   (`DELETE /api/customer-auth/customers/:id`).
3. The `Customer` row (name, encrypted contact data, password) is deleted.
   Past orders remain for tax purposes, unlinked, with their order-time
   snapshot.

### Known gaps

- There's no self-service "delete my account" button; deletion goes through
  the admin. That is GDPR-compliant, since a request channel exists.
- The customer gets no confirmation email after deletion.
- There's no retention job that purges long-inactive, unverified accounts.
- Check that `NODE_ENV=production` and `ENCRYPTION_KEY` are set on every real
  deployment. Otherwise PII is stored as plaintext.

---

## 7. Security

### Status

No code findings are open. These manual items remain:

- [ ] **#19** Set `FRONTEND_URL` to the production domain ([4.3](#43-production-environment))
- [ ] **#20** Verify the live server enforces HTTPS with an HTTP→HTTPS redirect ([4.5](#45-build-start-nginx))
- [ ] Consider a WAF/DDoS layer (e.g. Cloudflare)

### Fix log

Code comments like `// #28 fix:` refer to the numbered entries below. Read the
entry before changing a hardening measure.

**Critical**
- **#1** Rotated all secrets (DB password, JWT secret, email password, AES key, VAPID private key) and moved them out of version control.
- **#2** Rotated the Firebase service-account key; the JSON stays gitignored.
- **#4** `createOrder` never takes `customerId` from the body for customers, only from the authenticated JWT (prevents IDOR).
- **#5** `verifyEmail` / `resendOtp` require the customer session and check that it matches.
- **#6** `editOrder` never uses a client-supplied price; always the DB price, which must be > 0.

**High**
- **#7** JWT secret replaced with a cryptographically random 64-character value.
- **#8** Section-unlock tokens use their own secret (`SECTION_UNLOCK_SECRET`), not `JWT_SECRET`.
- **#9** Redis-backed distributed rate limiter (`ioredis`) with in-memory fallback.
- **#10** Stock check and decrement happen atomically inside the order transaction (`decrementStockOrThrow`).
- **#11** `deleteCustomer` writes an audit-log entry (admin, time, customer ID).
- **#12** `verifyEmail` checks OTP expiry, then the code, then the attempt count.
- **#13** `resendOtp` is rate-limited per customer and requires the current OTP to have expired.
- **#14** Accounting date filters are validated (400 on invalid dates).
- **#15** The accounting `limit` query parameter is capped at 200.
- **#16** Admin-placed orders verify that the supplied customer exists.
- **#17** Declining/cancelling an order rolls back coupon usage (`usedCount`, `CouponUsage`).
- **#18** Order deletion is blocked with 403 (§ 132 BAO) and audit-logged.
- **#21** `trust proxy 1` for nginx, switchable with `TRUST_PROXY`.

**Medium**
- **#22** Admin JWT lifetime is 24h, with revocation via `tokenVersion`.
- **#23** A customer password reset bumps `tokenVersion`, invalidating all sessions.
- **#24** OTP expiry and attempt checks run in a consistent order.
- **#25** `editOrder` stock adjustments happen inside its transaction.
- **#26** `editOrder` re-applies coupon and promotion discounts when recalculating.
- **#27** An address that can't be geocoded is rejected when a maximum distance is set (`isWithinMaxDistance: false`).
- **#28** JSON/urlencoded body limit is 100 kb.
- **#29** `preferredLanguage` is validated against `de`/`ar`/`en`.
- **#30** Image and logo URLs must be http(s); `javascript:` and `data:` are rejected.
- **#31** `mapEmbedUrl` must start with `https://www.google.com/maps/embed`.
- **#32** `goo.gl` / `g.page` shortlinks are blocked in the Google scraper (SSRF via redirect).
- **#33** The `createAdmin` controller was removed.
- **#34** `updateOrderStatus` accepts only allow-listed status values.
- **#35** Prisma client logs errors and warnings.
- **#36** Nodemailer uses `requireTLS: true` (prevents STARTTLS stripping).
- **#37** `CustomerAccount` polling stops when the session ends.
- **#38** JWTs live in HttpOnly cookies (cookie-parser, cookie auth, logout route).
- **#39** Admin auth headers are attached by the `adminAxios` interceptor, not by hand.
- **#40** Email/phone lookup hashes use HMAC-SHA-256 keyed with `ENCRYPTION_KEY` (no rainbow tables).

**Low**
- **#41** `createAdmin` fully removed.
- **#42** SKU collision retries give up with a clear error after 5 attempts.
- **#43** Puppeteer runs with the correct sandbox flags for the Linux deploy user.
- **#44** The Nodemailer transport is cached and reused.
- **#45** Coupon rollback was fixed before the order-deletion route was registered.
- **#46** `Accounting → Order` uses `onDelete: Cascade`.
- **#47** `OrderItem → Order` uses `onDelete: Cascade`.
- **#48** `deliveryNotes` is included in `CUSTOMER_PUBLIC_SELECT` for admin order views.
- **#49** `normalizeAustrianPhone` no longer treats bare `43…` local numbers as country-coded.
- **#50** The section passcode hash is cached instead of queried on every gated request.

**Follow-up audit**
- **#51** Passcode reset requires the current passcode, is rate-limited and audit-logged, and invalidates the cache.
- **#52** `anyAuthMiddleware` / `optionalAuthMiddleware` check `tokenVersion` and read HttpOnly cookies.
- **#53** `Admin.tokenVersion` is checked in `authMiddleware` and bumped on password change and logout.
- **#54** Logout clears cookies with matching options and revokes the token in the DB.
- **#55** The order's delivery address and notes are encrypted at rest (backwards-compatible decrypt).
- **#56** `ENCRYPTION_KEY` format is validated at startup (`lib/config.js`).
- **#57** `mapUrl` and `googleReviewsUrl` must be strict `https://` URLs; protocol-relative URLs are rejected (stored XSS).
- **#58** The Google scraper intercepts requests and blocks private, loopback and cloud-metadata IPs on every navigation and redirect (blind SSRF).
- **#59** Accounting CSV export escapes formula triggers (`=`, `+`, `-`, `@`).
- **#60** `editOrder` ignores client prices entirely (see #6).
- **#61** Changing password, email or phone requires `currentPassword`; a fresh session is issued afterwards.
- **#62** Redis rate-limit keys always get a TTL (atomic pipeline, no keys that never expire).

**Review 2026-09-24/25 hardening**
- Cookie-only auth: no JWT in `localStorage`. On mount the app checks `GET /api/auth/me` (admin) or `GET /api/customer/profile` (customer). Shared `adminAxios` / `customerAxios` send cookies and attach `X-CSRF-Token`.
- Double-submit CSRF tokens (`middleware/csrf.js`) on every cookie-authenticated mutation, including both logout routes.
- `customerAuthMiddleware` fails closed when `tokenVersion` is missing.
- Changing or removing the section PIN always requires the current PIN, even in an unlocked session.
- One `SECURE_COOKIES` setting (`lib/config.js`), honouring `FORCE_SECURE_COOKIES`.
- SSRF: `isPrivateOrLocalHost` blocks localhost, RFC 1918, IPv6 ULA/link-local/loopback and `169.254.x.x`, using real CIDR math that also covers IPv4-mapped IPv6. `googleReviewsUrl` is validated in `syncGoogleReviews` too.
- Admin logos are downloaded and validated server-side (≤ 2 MB, MIME + magic bytes, SVG script check) and served from `/uploads` with `CSP: default-src 'none'`. Visitors never contact the original host.
- Scraped Google rating (0–5) and review count (non-negative integer) are range-checked.
- The customer login grace period is safe by design: orders strictly require verified email and phone.
- Driver email addresses are hidden in the delivery view.

### Driver feature review

- **Per-driver accounts** (`Driver` model: `name`, `nameLower` unique, `pinHash`, `active`). Login checks that driver's own PIN. Unknown name and wrong PIN return the same error, so driver names can't be enumerated.
- A correct PIN only creates a `DriverLoginRequest` (with IP address). An admin must approve it on the Dashboard. The driver polls with a one-time `pollToken` (5-minute TTL), which is not exposed in the admin list.
- Each approved login gets a `DriverSession` row. `driverOrAdminAuthMiddleware` checks the session (`revokedAt`, `expiresAt`) and `Driver.active` on **every** request, so a force-logout or deactivation works immediately.
- A race condition in the case-insensitive duplicate-name check allowed two drivers with the same name in different case, and so cross-driver logins. It was fixed with the DB-unique `nameLower` column and `findUnique`; a conflict returns a clean 400.
- Rate limiters had shared one Redis bucket. Each now has its own prefix (`rl:pin-manage`, `rl:driver-login`, `rl:driver-poll`, `rl:admin-2fa`, `rl:distance`, next to `rl:auth`, `rl:api`, `rl:coupon`).
- Drivers get a 404 for orders not assigned to them (IDOR check), and only admins can assign drivers. `driverName` is only rendered through JSX (no `dangerouslySetInnerHTML`). The public driver login and poll endpoints have their own rate limits.
- `Order.assignedDriverName` is a snapshot string (like `customerName`), so renaming a driver doesn't change past orders.
- Admin management under Settings → Fahrerkonten: create (admin-chosen or random PIN, shown once), rename, activate/deactivate, reset PIN, delete (only when inactive). Gated by admin auth plus the section PIN.

---

## 8. Roadmap

- [ ] Ticket system for problems and bugs
- [ ] Loyalty/reward points for repeat customers, building on the coupon system
- [ ] Self-service account deletion and a deletion confirmation email ([6](#known-gaps))

## 9. Feature history

- **Preferred language**: customers choose DE/AR in their profile. Order confirmations, status and modification emails, password reset and push notifications use that language.
- **Reorder**: "Erneut bestellen" on past orders adds the items that are still in stock to the cart and reports the ones that aren't.
- **Low-stock alerts**: the Dashboard shows a banner when products are at 15 units or fewer, linked to `Products?stock=low`.
- **Audit log**: logins (2FA), password changes, product/stock changes, order status and edits, settings and PIN changes, coupons and promotions. Bilingual/RTL view with search, category filters and KPI cards.
- **Driver portal**: `/driver` (also `${ADMIN_BASE}/driver`) shows active, on-route and delivered orders, with one-tap call, Google Maps navigation, an item checklist, and confirmation steps for "out for delivery" / "delivered" (including cash collected for COD).
- **Driver sessions and assignment**: the Dashboard lists logged-in drivers with a force-logout button. Orders get an assigned driver, and accepting an order requires picking a driver in the same step, so no accepted order is invisible to every driver.
- **Order edits**: admins can change items; prices, promotions, coupon eligibility, the minimum order value and free delivery are all re-evaluated, and the customer must accept or decline the change.
- **Distance-based delivery fees and delivery time windows** ([5](#5-distance-based-delivery-fee)).
- **Maintenance mode**: blocks new customer orders server-side; admins keep full access.
- **Money handling**: amounts stored as `DECIMAL(10,2)` and rounded half-up to the cent.
- **Orders list pagination and search**: the admin Orders list (`GET /api/orders?page=`) is server-paginated (`page`, `limit` — default 50, max 100) with server-side `status` and `search` filters, so only one page of orders is loaded at a time. Measured on 400 orders this cut the list load from ~180 ms / 1 MB to ~30 ms / 125 KB. `search` covers the whole history: order number, driver, customer name, phone and address. Because the name/phone/address snapshots are encrypted at rest, a search loads just those columns, decrypts them in memory and matches with `utils/orderSearch.js` before paging. The status bar reads `GET /api/orders/summary` (a DB `groupBy`) so it counts every order. Without `page` (the driver view, `?updatedSince=` polls) the endpoint returns a flat array as before; the driver view gets the same scope for drivers and admins (no declined orders, delivered ones only from the last 7 days), since it re-fetches every 8 s; with `page` it returns `{ data, total, page, limit, totalPages }`. Frontend: `pages/orders/useOrders.js` owns the paged fetch + polling (ignoring out-of-order responses while typing); `pages/Orders.jsx` renders the list and pager.
- **Order drawer**: clicking an order opens one side drawer (`pages/orders/OrderDrawer.jsx`) with tabs *Übersicht* (status, driver, delivery slot, internal note, totals — each saved inline), *Artikel* (item changes: a separate mode with its own warning and confirm, since saving emails the customer and moves the order to `pending_customer_approval`), *Kunde & Lieferung* (tap-to-call, map link, customer-visible note) and *Verlauf* (`GET /api/orders/:id/history`: the order's own audit entries, no section passcode needed). The list cards keep one-click triage (accept with driver, decline with confirm, next status). **Stale edits**: every drawer write sends the `updatedAt` it is showing as `expectedUpdatedAt`; the status, assign-driver and edit endpoints answer `409 { code: 'STALE_ORDER' }` if the order changed since, and the drawer shows a "changed — reload" banner instead of overwriting the other change. The driver choice lists active driver accounts (`GET /api/settings/drivers/names`, names only) plus online drivers.

## 10. Design system

Frontend UI rules (React + Tailwind + Cairo font, dark mode via `class`, DE/AR + RTL).

### Colour tokens

Defined in `frontend/tailwind.config.js`; each maps to a full Tailwind palette, so every
shade works (`bg-primary-600`, `dark:text-danger-300`, `border-warning-200/60`, ...).
Use these names, never the raw palette names:

| Token | Palette | Use |
|---|---|---|
| `primary` | blue | Admin back-office primary (buttons, links, active states) |
| `brand` | emerald | Customer storefront primary |
| `success` | emerald | Success / completed / money in (admin side) |
| `warning` | amber | Waiting, attention, low stock |
| `danger` | rose | Destructive actions, errors, declined |
| `info` | sky | Informational, in transit |
| `promo` | purple | Promotions and coupons, "preparing" status |
| `slate` / `gray` | slate / gray | Neutral text and surfaces (`gray-650/750/850/950` are extra dark-mode shades) |

**One primary per surface**: storefront, customer account, cart, login and legal pages use
`brand`; admin pages and the driver view use `primary`. `red`, `indigo`, `violet`, `pink`,
`teal` and `cyan` are no longer used — use the matching token.

### Order status colours

One source of truth: `frontend/src/utils/orderStatusBadge.js` (tested in
`frontend/tests/orderStatusBadge.test.js`), used through `useStatusBadge(audience)` and
`<OrderStatusBadge status audience />`. The colour is the same everywhere; only the wording
changes by audience (`admin`, `customer` — who is told what *they* need to do — and `driver`).

| Status | Tone |
|---|---|
| pending | `warning` |
| pending_customer_approval | `warning`, stronger border, pulses |
| accepted / confirmed | `primary` |
| preparing | `promo` |
| out_for_delivery / shipped | `info`, pulses |
| delivered / completed | `success` |
| declined / rejected / cancelled | `danger` |

### Feedback and shared components

- **Never use `alert()` / `window.confirm()`.** Use `useToast()` (`toast.success/error/warning/info`)
  and `await useConfirm()({ message, variant })` from `context/FeedbackContext.jsx`. Toasts are
  non-blocking and announced to screen readers; the confirm dialog is themed, RTL-aware, and
  focuses *Cancel* for `variant: 'danger'` so Enter never deletes by accident. Escape cancels it
  without also closing a drawer underneath.
- **Shared primitives** live in `frontend/src/components/ui/` (import from `components/ui`):
  `Button` / `IconButton` (icon-only buttons require a `label`), `Card`, `Badge`, `Input`,
  `Textarea`, `Select`, `Switch` (on/off toggle, `role="switch"`, mirrors in Arabic), `Modal`,
  `Drawer` (Escape, focus trap, scroll lock, opens from the inline-end side so it flips in
  Arabic), `EmptyState`, `Skeleton*` and `Pagination`. Every admin page and dialog uses them;
  a form inside a `Modal` puts its submit button in the `footer` and links it with
  `<Button type="submit" form={formId}>` (the footer sits outside the `<form>`).
- **Loading**: list pages show `SkeletonList` placeholders shaped like the content, not a spinner.
- **Empty lists**: `EmptyState` (icon + message + optional action).

### Layout, type and accessibility rules

- **Radius**: `rounded-xl` for controls (inputs, buttons, chips), `rounded-2xl` for cards,
  drawers and dialogs. No `rounded-3xl`.
- **Shadow**: `shadow-sm` resting cards, `shadow-md` hover, `shadow-lg` floating (toasts,
  menus), `shadow-2xl` dialogs/drawers.
- **Page shell**: the admin `Layout` sets max width (`max-w-7xl`) and gutters for every page;
  pages don't add their own. Page roots use `space-y-4 sm:space-y-6`.
- **Type scale** (`index.css`): `text-heading-xl` (page title), `text-heading-lg` (dialog/drawer
  title), `text-heading-md` (card title), `text-body-muted`, `text-caption`. Table cells get
  `tabular-nums` globally; use it on any other money/count.
- **Tables**: long lists (Customers, Accounting, Promotions) scroll inside the card with a
  sticky header and zebra rows; below `md` they switch to one card per row (Promotions renders
  the same cell pieces in both layouts, so they can't drift apart).
- **Contrast**: muted text is `text-slate-500` (light, 4.8:1 on white) and `dark:text-slate-400`
  (7.6:1 on `gray-950`). `text-slate-400` / `dark:text-gray-500` fail WCAG AA for text — only
  for decorative icons.
- **Keyboard & motion**: a global `:focus-visible` ring; `prefers-reduced-motion` stops
  pulsing/transitions (spinners keep turning). Icon-only buttons need an `aria-label`
  (`IconButton` enforces it). Tap targets are at least 44px (`min-h-11`). Dense controls
  (order-card footers, `Button size="sm"`, the storefront chips) may stay 36px for the mouse
  but must grow on touch screens with the `coarse:` variant (`@media (pointer: coarse)`,
  defined in `tailwind.config.js`), e.g. `min-h-9 coarse:min-h-11`. For a small inline link that
  mustn't move the layout, grow only the hit area: `coarse:py-3.5 coarse:-my-3.5`.
- **Tailwind 3 only**: this project is on Tailwind 3.4. v4-only classes (`shadow-2xs`,
  `shadow-xs`, `backdrop-blur-xs`, `outline-hidden`, `border-3`, `animate-in fade-in`) silently do
  nothing — use `shadow-sm`, `backdrop-blur-sm`, `outline-none`, `border-[3px]`, `animate-fade-in`.
  The `xs:` breakpoint (480px) is defined in `tailwind.config.js`.

### Design roadmap

Status of the design/UX plan (formerly `DESIGN_TODO.md`).

**Done**
- [x] P0 — semantic colour tokens; one primary per surface (brand on the storefront, primary in
  admin); 11 accents collapsed to the token roles; one order-status style everywhere.
- [x] P1 — order drawer (tabs, inline admin edits, separate confirmed item editing, list quick
  actions kept, stale-edit 409 banner).
- [x] P1 — toast + confirm system replaces every `alert()`/`window.confirm()`; shared primitives;
  skeleton loaders and `EmptyState` on the list pages.
- [x] P1 — one radius/shadow scale, consistent page shell and spacing rhythm, sticky zebra tables.
- [x] P2 — type-scale tokens, `tabular-nums` on tables/totals, dark-mode contrast fix, focus ring,
  reduced motion, labels on icon-only buttons, dark-mode walk-through of every admin page
  (checked with screenshots, no horizontal overflow at 390px).
- [x] P3 — storefront CTAs use the brand colour, product images have one 4:3 ratio and lazy-load,
  category label moved off the image so it no longer collides with the stock badge.
- [x] Older admin pages migrated to `components/ui`: every hand-built dialog (product, restock,
  catalog, coupon, offer, customer, create/accept/print order) is now a `Modal`; buttons,
  inputs, selects and toggles use the shared parts. Tab bars, filter chips and the coupon/offer
  type pickers stay custom (`aria-pressed`) but meet the tap-target rule.
- [x] Promotions tables: card view on phones.
- [x] 44px tap-target audit: every admin page, dialog and settings tab plus the storefront,
  login and registration measured at 390px on a touch device — no target under 44px (logo
  links aside, 36px).

**Still open**
- [ ] Storefront trust signals: the reviews widget is empty until Google reviews are synced.
