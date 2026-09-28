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

---

## 1. Features

- **Customers**: register with email OTP and phone verification (Firebase
  Phone Auth); an account must be verified before it can order. Order
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
  HttpOnly cookies, Nodemailer, Firebase Admin (phone verification), web-push
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
| `DIRECT_URL` | Direct connection (port 5432, no pgbouncer), used only by `prisma db push`. Without a pooler, set it to the same value as `DATABASE_URL` (Prisma requires the variable to exist). |
| `JWT_SECRET` | Random secret, at least 32 characters (`openssl rand -hex 32`). Required; the server won't start without it. |
| `SECTION_UNLOCK_SECRET` | Random secret, at least 32 characters, **different from `JWT_SECRET`**. Required. |
| `ENCRYPTION_KEY` | 64 hex characters (`openssl rand -hex 32`); AES key for PII at rest. Required in production. Outside production, a missing key stores PII unencrypted (with a startup warning). |
| `FRONTEND_URL` | Public frontend URL(s), comma-separated. Used for CORS and links in emails. Must be the real domain in production. |
| `TRUST_PROXY` | `true` (default) behind nginx; needed for correct client IPs in rate limiting. |
| `FORCE_SECURE_COOKIES` | `true` for HTTPS staging environments that don't set `NODE_ENV=production`. |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_FROM` | SMTP for OTPs, order emails, password reset. Placeholder values → emails are skipped and logged. |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Optional; path to the Firebase service-account JSON (default `backend/firebase-service-account.json`, gitignored). |
| `REDIS_URL` | Recommended in production; shares rate-limit counters across processes/servers. Without it each PM2 worker counts on its own, so every limit is multiplied by the worker count (the server warns at startup). |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Optional; Web Push for order-status notifications. Generate the pair with `npx web-push generate-vapid-keys`. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Optional; admin created by the seed script. Without a password a one-time random one is printed. |

**`frontend/.env`**

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Leave **empty** when nginx proxies `/api` on the same domain (standard setup). Only set an absolute URL if the API is on a separate host. |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Optional; Firebase web config for phone verification. Not secret. |

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
| Firebase project | Phone verification at registration | Optional (email verification still works without it) |
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
# plus DATABASE_URL, DIRECT_URL, EMAIL_*, and optionally FIREBASE_SERVICE_ACCOUNT_PATH, VAPID_*
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

### 4.4 Firebase (only for phone verification)

Phone verification needs both the frontend and the backend config. If either
is missing, the feature is disabled.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
   and enable Authentication → Sign-in method → **Phone**.
2. **Frontend**: Project Settings → General → Your apps → add a Web app → copy
   the values into the `VITE_FIREBASE_*` variables.
3. **Backend**: Project Settings → Service accounts → Generate new private key
   → save as `backend/firebase-service-account.json` (gitignored), or point
   `FIREBASE_SERVICE_ACCOUNT_PATH` at it. When rotating, delete the old key
   in the console.
4. **Before going live**, restrict the Web API key in the
   [Google Cloud credentials page](https://console.cloud.google.com/apis/credentials)
   ("Browser key (auto created by Firebase)"):
   - Application restriction: Websites → `https://yourdomain.com/*`,
     `https://*.yourdomain.com/*`
   - API restriction: *Identity Toolkit API* and *Token Service API* only
   - Enable **Firebase App Check** (reCAPTCHA) to stop automated SMS abuse

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
with the browser console open, to check nothing Firebase needs is blocked.

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

### 4.7 Go-live checklist

- [ ] `.env` files not committed; secrets freshly generated for this deployment
- [ ] `FRONTEND_URL` is the real production domain, not `localhost`
- [ ] `HOST=127.0.0.1` and `REDIS_URL` set; port 5000 not reachable from outside
- [ ] nginx serves HTTPS only; HTTP redirects to HTTPS; `nginx -t` passes
- [ ] Firebase Web API key restricted, App Check enabled (if phone verification is used)
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

- [ ] **#3** Restrict and rotate the Firebase Web API key, enable App Check ([4.4](#44-firebase-only-for-phone-verification))
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
