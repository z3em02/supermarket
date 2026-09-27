# Documentation Summary

One-page digest of every Markdown file in this repo (as of 2026-09-27). Each
section names its source file; go there for full detail. Where the files
disagree, see [Inconsistencies](#inconsistencies-found-while-summarizing) at
the end.

| File | What it is |
|---|---|
| `README.md` | Project intro, local setup, env vars, basic nginx + PM2 deployment |
| `CLAUDE.md` | Architecture guide for AI/dev contributors |
| `DEPLOYMENT_CHECKLIST.md` | Ordered production go-live checklist |
| `DEPLOYMENT_SECURITY.md` | Firebase console steps, hardened nginx config, prod env vars |
| `DISTANCE_BASED_DELIVERY.md` | Delivery-fee model, geocoding/routing design, test results (German) |
| `GDPR_DATA_POLICY.md` | What PII is stored, encryption, retention, deletion requests |
| `TODO.md` | Open product/infrastructure work |
| `SECURITY_TODO.md` | Open security items (all manual/deployment actions) |
| `SECURITY_TODO_2026-09-25.md` | Security review summary — all 8 items resolved |
| `SECURITY_TODO_DRIVER_FEATURE.md` | Security review of driver login/assignment |
| `COMPLETED_TODOS.md` | Archive of 60+ completed fixes and features |
| `frontend/README.md` | Unmodified Vite + React template readme (no project content) |
| `.claude/skills/*`, `.claude/CONNECTORS.md`, `backend/.claude|.agents/skills/*` | Instructions for Claude Code, not project docs (see [last section](#claude-code-skills)) |

---

## 1. The product

**Hajar Supermarkt** — online supermarket for private customers in Austria.
Home delivery, cash/card on delivery, German/Arabic (RTL) storefront.

- **Customers**: register with email OTP + phone verification (Firebase Phone
  Auth), must be verified to order; order history, reorder, printable order
  report, push notifications, preferred language for all emails/pushes.
- **Admin back office** at an obscured path (`ADMIN_BASE`, default
  `/console-eb68a2f3`): dashboard, products, orders, customers, accounting,
  promotions/coupons, settings, audit log. Settings/Accounting/Customers/
  Promotions sit behind an extra section PIN.
- **Drivers**: mobile `/driver` portal. Each driver has an individual account
  + PIN; a login only becomes a session after an admin approves it on the
  Dashboard. Drivers see only orders assigned to them and can only set
  `out_for_delivery` / `shipped` / `delivered`.
- **Stack**: Node/Express 5, Prisma on PostgreSQL, React 19 + Vite + Tailwind,
  nginx + PM2 (cluster mode), optional Redis, Nodemailer, Firebase, web-push.

## 2. Local development (README.md, CLAUDE.md)

```bash
cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env
cd backend  && npm install && npx prisma db push && npm run prisma:seed && npm run dev   # :5000
cd frontend && npm install && npm run dev                                                # :5173
cd backend  && npm test        # node:test unit tests; CI also runs frontend lint + build
```

- Schema changes: edit `schema.prisma`, then `npx prisma db push` — the project
  does **not** use `prisma migrate`.
- Seed creates an admin from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, or prints
  a random one-time password.
- Missing SMTP config → emails are logged to the console, not sent.

## 3. Architecture (CLAUDE.md)

- `routes/<name>.js` → `controllers/<name>Controller.js`, Prisma used directly.
  Orders are split into `orderController` / `orderStatusController` /
  `orderModificationController` / `orderShared`.
- Pure logic lives in `utils/` and is unit-tested: `orderPricing`,
  `pricingService` (promotions/coupons), `money` (`roundMoney`), `validation`,
  `piiCrypto`, `deliverySlot`, `distanceService`.
- Money columns are `DECIMAL(10,2)`; `lib/prisma.js` converts them back to JS
  numbers. Round with `roundMoney`, never `toFixed(2)`.
- Two separate auth systems (admin vs customer), each with its own JWT
  HttpOnly cookie, middleware and frontend axios instance; `anyAuth` accepts
  either. Double-submit CSRF on cookie-authenticated mutations.
- Nearly every admin write records an `AuditLog` row — keep doing that.
- `// #NN fix:` comments in code point to entries in `COMPLETED_TODOS.md`.

## 4. Deploying to production (DEPLOYMENT_CHECKLIST.md, DEPLOYMENT_SECURITY.md, README.md)

**You need**: a VPS (or Railway/Render — the backend doesn't fit serverless/Vercel:
it writes to local disk and calls `app.listen()`), PostgreSQL, a domain, SMTP
(recommended), Firebase (optional, for phone verification), Redis (optional).

**Steps**
1. Install Node 18+, nginx, PM2; clone to `/var/www/supermarket`.
2. Database: on Supabase use the pooled URL (port 6543, `?pgbouncer=true`) as
   `DATABASE_URL` and the direct URL as `DIRECT_URL`; self-hosted: one URL
   (set `DIRECT_URL` to the same value). Then `npx prisma db push`.
3. **One-time Float → Decimal migration** on existing databases: back up with
   `pg_dump`, `pm2 stop all`, `npx prisma db push --accept-data-loss` (only
   after checking every warning says "cast from DoublePrecision to
   Decimal(10,2)"), start again.
4. `backend/.env`: `NODE_ENV=production`, `TRUST_PROXY=true`, `FRONTEND_URL`
   (real domain), fresh random `JWT_SECRET`, `SECTION_UNLOCK_SECRET` (must
   differ), `ENCRYPTION_KEY` (64 hex chars, required in production), SMTP,
   optional `FIREBASE_SERVICE_ACCOUNT_PATH`, `REDIS_URL`, seed-admin vars.
   `frontend/.env`: `VITE_API_URL` empty behind nginx; `VITE_FIREBASE_*` for
   phone auth.
5. Build the frontend (`npm run build`), start the backend with
   `pm2 start ../deployment/ecosystem.config.js`, `pm2 save`, `pm2 startup`.
6. nginx: HTTP→HTTPS redirect, TLS 1.2/1.3, HSTS and security headers, serve
   `frontend/dist`, proxy `/api/` and `/uploads/` to `127.0.0.1:5000` with
   `X-Forwarded-*` headers (needed for `trust proxy`). Certbot for TLS.
7. Firebase console: rotate the service-account key, restrict the Web API key
   to your domain + Identity Toolkit/Token Service APIs, enable App Check.
8. First run: seed, rotate an auto-generated admin password, change
   `ADMIN_BASE`, set the section PIN, create driver accounts (PIN shown once),
   fill in store details, confirm maintenance mode is off.
9. Final checks: `.env` not committed, secrets freshly generated, Firebase key
   restricted, HTTPS-only, real `FRONTEND_URL`, admin path changed, one full
   register → order → fulfil run.

Note: every deploy after the `tokenVersion` change logs everyone out once — expected.

## 5. Delivery fee (DISTANCE_BASED_DELIVERY.md)

- **Fee = base fee + round(road km × €/km, 2)**, e.g. €2.00 + 2.7 km × €0.10 = €2.27.
  Settings: `deliveryFee`, `deliveryFeePerKm`, `freeDeliveryThreshold`,
  `maxDeliveryDistanceKm` (0 = unlimited), store coordinates.
- Free delivery when the cart reaches the threshold or a free-shipping coupon applies.
- Pipeline: normalize the address (strip Top/Stiege/Tür, `166/4` → `166`) →
  geocode via Photon → Nominatim → built-in Vienna postal-code centroids →
  road distance via OSRM, falling back to straight line × 1.25 → 1-hour
  in-memory cache.
- An address that can't be located is rejected when a max distance is set.
- Endpoints: `POST /api/delivery-distance/calculate` (public, live cart
  preview) and `POST /api/delivery-distance/geocode-store` (admin). The server
  always recalculates on order creation and stores km, base fee, distance fee
  and total on the order.

## 6. Personal data / GDPR (GDPR_DATA_POLICY.md)

- **Encrypted at rest** (AES-256-GCM, `piiCrypto.js`): customer email, phone,
  address fields; the order's customer snapshot (name, phone, email, delivery
  address/notes). Email/phone lookups use HMAC hashes. Passwords: bcrypt.
- **Retention**: customer accounts until deletion is requested (no automatic
  purge). Orders/invoices are kept for 7 years (§ 132 BAO) — deleting a
  customer sets `Order.customerId` to null, and orders can't be deleted (403).
  OTPs/reset tokens expire in 15–60 minutes.
- **Deletion request**: the customer emails the address on `/datenschutz` →
  the admin removes them under *Kunden* → Customer row gone, orders keep
  their snapshot.
- **Gaps**: no self-service delete, no confirmation email, no retention job;
  outside production a missing `ENCRYPTION_KEY` stores PII in plaintext
  (warning only).

## 7. Security status (SECURITY_TODO*.md, COMPLETED_TODOS.md)

**Code: no known open issues.** 60+ findings from several audits are fixed,
among them:
- **Auth**: HttpOnly-cookie-only JWTs, `tokenVersion` revocation, 24h admin
  tokens, admin 2FA, re-authentication before changing password/email/phone,
  a separate secret for section unlock.
- **CSRF**: double-submit tokens, logout routes included.
- **Orders/money**: server-side prices only, atomic stock and coupon-limit
  checks, 409 on concurrent status changes, coupon rollback on decline,
  coupon/fee/minimum-order re-validation on edit.
- **SSRF/XSS**: private-IP blocking (IPv4/IPv6 CIDR math) in the scraper and
  URL checks, https-only admin URLs, logos proxied server-side with SVG
  inspection and a locked-down CSP, CSV formula-injection escaping.
- **Rate limiting**: Redis-backed with in-memory fallback, a distinct key
  prefix per limiter.
- **Driver feature**: per-driver PINs, admin approval, revocable sessions
  checked on every request, a unique lowercase name (closed a
  race-condition impersonation bug), drivers see only their own orders.

**Still open (manual, outside the code):**
- [ ] #3 Restrict/rotate the Firebase Web API key, enable App Check
- [ ] #19 Set `FRONTEND_URL` to the production domain
- [ ] #20 Enforce HTTPS in nginx on the live server
- [ ] Consider a WAF/DDoS layer (e.g. Cloudflare)

## 8. Roadmap (TODO.md, COMPLETED_TODOS.md)

**Done recently**: preferred language + localized emails and pushes, one-click
reorder, low-stock alerts (≤ 15 units), full bilingual audit log, driver portal
with admin-approved logins, driver sessions and order-to-driver assignment
(choosing a driver is required when accepting an order), maintenance mode.

**Planned (v2)**: a ticket system for problems/bugs, and loyalty/reward points
(tied to coupons).

## 9. Claude Code skills

`.claude/skills/` holds Anthropic's Engineering plugin skills (Apache-2.0),
usable as `/code-review`, `/debug`, `/deploy-checklist`, `/architecture`,
`/system-design`, `/tech-debt`, `/testing-strategy`, `/documentation`,
`/incident-response` and `/standup`. `.claude/CONNECTORS.md` explains their
tool placeholders. `backend/.claude/skills` and `backend/.agents/skills` carry
Prisma Platform/Composer skills, relevant only if the app moves to Prisma's
hosted platform.

---

## Inconsistencies found while summarizing

These documents disagree with each other or with the current code. None of
them has been fixed yet:

1. **`README.md` env table** leaves out `SECTION_UNLOCK_SECRET` and
   `ENCRYPTION_KEY`, although the server refuses to start without the first,
   and production needs the second. `DEPLOYMENT_CHECKLIST.md` has them right.
2. **`DEPLOYMENT_SECURITY.md` §4** says to install `rate-limiter-flexible` for
   Redis. The code already uses `ioredis` directly; just set `REDIS_URL`.
3. **`DEPLOYMENT_SECURITY.md` §1B** contains the literal Firebase Web API key.
   Firebase web keys aren't secret, but it doesn't belong in docs; refer to
   it by name instead.
4. **`GDPR_DATA_POLICY.md`** refers to `withDecryptedOrder()` in
   `orderController.js`. It's now `withDecryptedCustomer()` in
   `controllers/orderShared.js`.
5. **`COMPLETED_TODOS.md` §4** describes a single shared driver PIN
   ("Fahrer-PIN"). This was later replaced by per-driver accounts, as
   `SECURITY_TODO_DRIVER_FEATURE.md` and `DEPLOYMENT_CHECKLIST.md` say.
6. **`SECURITY_TODO_DRIVER_FEATURE.md`** ends with a "restart the backend"
   note left over from one old dev session. It no longer applies.
7. **`frontend/README.md`** is the unedited Vite template.
8. **Line references** like `orderController.js:146` in `COMPLETED_TODOS.md`
   are stale after the controller split. Search for the `#NN` comment instead.
