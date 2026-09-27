# Deployment Checklist

Everything you need before this app can run in production. This is a
practical, ordered checklist — for the *why* behind specific hardening
choices, see `DEPLOYMENT_SECURITY.md` (nginx config, security headers) and
`GDPR_DATA_POLICY.md` (data handling). For local dev setup, see `README.md`.

---

## 1. Accounts / services you need first

| What | Why | Required? |
|---|---|---|
| A server (VPS) or PaaS to run the Node backend | Backend has no build step, runs as a long-lived process (PM2) — not a natural fit for serverless platforms like Vercel (see note below) | Yes |
| A PostgreSQL database | Supabase, Neon, a self-hosted instance on the same VPS, or any managed Postgres | Yes |
| A domain name | For the public URL, SSL certificate, CORS (`FRONTEND_URL`) | Yes (technically works on a bare IP, but no real deployment should) |
| An SMTP account (e.g. Gmail with an [App Password](https://myaccount.google.com/apppasswords)) | Sends OTP codes, order confirmations, password resets | Recommended — without it, emails are skipped and only logged to console |
| A Firebase project | Verifies customer phone numbers at registration (Phone Auth) | Optional — without it, phone verification is disabled client-side with a clear message; email verification still works |
| Redis instance | Distributed rate limiting across multiple PM2 instances/servers | Optional — falls back to an in-memory limiter per process if unset |

**On Vercel specifically**: the frontend deploys there cleanly (static Vite build). The backend does not fit without real rework — it writes cached logo files to local disk (`backend/uploads/`), reads a Firebase key from a local file path, and calls `app.listen()` rather than exporting a serverless handler. Recommendation: frontend on Vercel, backend on a normal VPS or a platform that runs a persistent Node process (Railway, Render, or the VPS + PM2 setup this repo already documents).

---

## 2. Server setup

```bash
# Node.js 18+, PostgreSQL client tools, nginx, PM2
sudo apt update
sudo apt install -y nodejs npm nginx postgresql-client
sudo npm install -g pm2

git clone <your-repo-url> /var/www/supermarket
cd /var/www/supermarket
```

---

## 3. Database

### Option A — Supabase (or any pooled Postgres provider)

Get two connection strings from **Project Settings → Database → Connection string**:

- **Pooled** (Transaction mode, port `6543`) → `DATABASE_URL`, with `?pgbouncer=true` appended
- **Direct** (port `5432`) → `DIRECT_URL`

Both are needed because this app runs PM2 in cluster mode (`instances: 'max'` in `deployment/ecosystem.config.js`) — several Node processes each open their own Prisma connection pool, which can exhaust a managed provider's direct-connection limit. The pooled connection is used for normal queries; the direct one only for schema pushes (the pooler doesn't support those).

### Option B — self-hosted Postgres on the same VPS

Just set `DATABASE_URL` to the local connection string; leave `DIRECT_URL` unset **or** set it to the same value as `DATABASE_URL` (if `directUrl` is present in `schema.prisma`, Prisma requires the env var to exist even when it's identical to `DATABASE_URL`).

### Sync the schema (either option)

```bash
cd backend
npm install
npx prisma db push
```

This project uses `prisma db push`, not `prisma migrate` — there's no migrations directory to keep in sync.

---

## 4. Environment variables

### `backend/.env`

```env
NODE_ENV=production
PORT=5000
TRUST_PROXY=true

# Database — see section 3
DATABASE_URL=
DIRECT_URL=

# Required, no defaults — server refuses to start without these.
# Generate each with: openssl rand -hex 32
JWT_SECRET=
SECTION_UNLOCK_SECRET=
# Must differ from JWT_SECRET.
ENCRYPTION_KEY=

FRONTEND_URL=https://yourdomain.com

# SMTP — omit/leave as placeholders to skip email sending (logged to console instead)
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=

# Optional — phone verification via Firebase Admin (see section 5)
FIREBASE_SERVICE_ACCOUNT_PATH=

# Optional — distributed rate limiting across multiple instances/servers
REDIS_URL=

# Optional — controls the admin account `npm run prisma:seed` creates.
# If SEED_ADMIN_PASSWORD is left unset, a random one-time password is
# generated and printed to the console when you run the seed script.
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

### `frontend/.env`

```env
# Leave empty if nginx proxies /api on the same domain as the frontend
# (the standard setup — see the nginx config in DEPLOYMENT_SECURITY.md).
VITE_API_URL=

# Optional — only needed for phone verification (Firebase Phone Auth).
# From Firebase Console -> Project Settings -> General -> Your apps -> Web app.
# These are not secret; safe to commit if your build process does.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## 5. Firebase setup (optional — only if you want phone verification)

Phone verification needs **two** separate pieces of config; either missing disables it.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method → Phone** → enable.
3. **Frontend**: Project Settings → General → "Your apps" → add a Web app → copy the config values into `frontend/.env` (`VITE_FIREBASE_*` above).
4. **Backend**: Project Settings → Service accounts → "Generate new private key" → download the JSON → place it at `backend/firebase-service-account.json` (already gitignored), or point `FIREBASE_SERVICE_ACCOUNT_PATH` at wherever you put it.
5. See `DEPLOYMENT_SECURITY.md` section 1B for restricting the Firebase Web API key to your production domain and enabling App Check — do this before going live, not after.

---

## 6. Build and start

```bash
# Frontend
cd frontend
npm install
npm run build   # -> frontend/dist, served by nginx

# Backend
cd ../backend
pm2 start ../deployment/ecosystem.config.js
pm2 save
pm2 startup     # follow the printed instructions to survive a reboot
```

Copy `deployment/nginx.conf` (or the config in `DEPLOYMENT_SECURITY.md`) to `/etc/nginx/sites-available/`, update `server_name` and certificate paths, symlink into `sites-enabled`, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Point DNS at the server and get a certificate (e.g. via Certbot) before going live.

---

## 7. First-run setup (after the app is live)

1. **Seed the database**: `cd backend && npm run prisma:seed` — creates the admin account (see section 4) plus sample categories/delivery windows. Re-running is safe; it skips creating the admin if that email already exists.
2. **Log in and immediately note/rotate the admin password** if it was auto-generated.
3. **Change the admin path**: `frontend/src/config/adminPath.js` — `ADMIN_BASE` ships as `/console-eb68a2f3`. Change it to your own value before going live (it's obscurity, not real access control — the real boundary is the login itself).
4. **Set the section PIN**: Settings → the step-up PIN gating Settings/Accounting/Customers/Promotions.
5. **Create driver accounts**: Settings → Fahrerkonten — each delivery driver needs their own individual account + PIN (there's no shared driver PIN anymore). Relay each generated PIN to the driver out of band (it's shown once, never stored in plaintext).
6. **Fill in store details**: Settings → store name/logo/address/delivery fees/legal (Impressum) fields.
7. **Sanity-check maintenance mode is off**: Settings → Allgemein → Wartungsmodus should be inactive unless you're deliberately still finishing setup.

---

## 8. Before calling it done

- [ ] `backend/.env` is not committed anywhere (confirm `.gitignore` covers it — it does by default)
- [ ] `JWT_SECRET`, `SECTION_UNLOCK_SECRET`, `ENCRYPTION_KEY` are freshly generated for this deployment, not copied from a dev/test environment
- [ ] Firebase Web API key restricted to your production domain (section 5, step 5)
- [ ] nginx serves HTTPS only, HTTP redirects to HTTPS (`DEPLOYMENT_SECURITY.md` section 2)
- [ ] `FRONTEND_URL` is the real production domain, not `localhost`
- [ ] Admin path (`ADMIN_BASE`) changed from the default
- [ ] Ran through the customer registration → order → admin fulfillment flow once end-to-end
