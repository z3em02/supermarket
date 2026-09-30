# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Hajar Supermarkt: an online supermarket for B2C customers in Austria, with
home delivery and cash/card-on-delivery payment. Bilingual (German/Arabic)
storefront, customer accounts with email/phone OTP verification, and an
admin back office for products, orders, customers, accounting and store
settings. There's also a driver-facing delivery view.

- **Backend**: Node.js, Express 5, Prisma ORM on PostgreSQL, JWT auth (HttpOnly cookies), Nodemailer, WhatsApp Cloud API (phone OTP), Redis (ioredis, rate limiting)
- **Frontend**: React 19, Vite, Tailwind CSS, React Router 7
- **Deployment**: nginx (reverse proxy + static hosting) + PM2 (cluster mode)

## Commands

```bash
# Backend (from backend/)
npm install
npm run migrate:deploy   # create/update tables from prisma/migrations (Prisma Migrate; `db push` is no longer used)
npm run migrate:dev -- --name add_x   # after editing schema.prisma: new migration, applied to the dev DB
npm run prisma:seed      # seed admin (SEED_ADMIN_EMAIL, default admin@hajar.local; SEED_ADMIN_PASSWORD or a printed random one) + sample data
npm run dev               # start API on :5000 with `node --watch` (restarts on file changes)
npm test                  # all backend unit tests (`node --test "tests/**/*.js"`)
node --test tests/orderPricing.test.js      # a single test file
node --test --test-name-pattern="coupon" "tests/**/*.js"   # tests matching a name
npm run backup            # pg_dump to BACKUP_DIR + retention + off-site copy (README §4.7)
npm run backup:restore-test   # restore newest backup into a scratch DB, check the key, drop it
npm run key:check         # does ENCRYPTION_KEY open the data? (-- --prompt: test a pasted copy)

# Frontend (from frontend/)
npm install
npm run dev                # Vite dev server on :5173
npm run build               # production build -> frontend/dist
npm run lint                # oxlint
npm test                    # frontend unit tests (`node --test "tests/**/*.test.js"`)
npm run preview

# Both at once from repo root
./start.sh   # or start.bat on Windows
```

Backend tests use Node's built-in `node:test` runner (no jest/mocha). They
cover the DB-free logic only: order pricing (`utils/orderPricing.js`),
promotions/coupons, validation, PII crypto, backup naming/retention, error-report scrubbing, delivery slots and delivery-fee
calculation (network stubbed so it uses the postal-code centroids), the
CSRF and section-PIN middleware (`sectionUnlock.test.js` swaps `lib/prisma`
for a fake via `require.cache`). `tests/api.test.js` starts the real
`server.js` as a child process with dummy secrets and an unreachable
`DATABASE_URL` (real `.env` values blanked) and checks everything decided
before the database: routing, body limits, auth/CSRF rejections, logout
cookies, CORS. Put pure logic in `utils/` rather than inline in controllers
so it can be tested this way.

Database tests: `tests/integration/orderFlows.test.js` runs the order flows
(place, status changes, edit + customer answer) through the real server on a
real Postgres and checks stock, totals and coupon usage in the database. It
runs only when `TEST_DATABASE_URL` is set (a database named `*_test`, never the
`DATABASE_URL` one; the harness refuses otherwise) and is skipped otherwise;
CI provides a Postgres service. `tests/integration/harness.cjs` (`.cjs` so the
test glob skips it) rebuilds the test database from `prisma/migrations`
(`migrate reset`) and fails on schema drift, starts `server.js` with `.env` blanked
and `offline.cjs` preloaded (no outbound fetch), empties all tables before each
test, and has helpers to create data and sign logins. Add DB-backed tests to
that one file: test files run in parallel and each test empties the tables.
README "Database tests".

Frontend tests (`frontend/tests/`) also use `node:test` and import plain
`.js` modules directly (note parsing, masking, dates, DE/AR translation key
parity) — only modules without JSX or `import.meta.env`.
`.github/workflows/ci.yml` runs backend tests plus frontend lint, tests and
build on every PR and push to `main`.

Env setup: `cp backend/.env.example backend/.env` and `cp frontend/.env.example frontend/.env`,
then fill in `DATABASE_URL`, `JWT_SECRET` (min 32 chars — server refuses to start otherwise),
`FRONTEND_URL`, SMTP vars. Frontend's `VITE_API_URL` is normally left empty (nginx proxies `/api`).

## Architecture

### Backend: layered Express app

`server.js` wires everything: first a request-id middleware (`X-Request-Id`
on every response; logs 5xx and >2 s requests by method + path only), then
helmet, CORS (origin allow-list from
`FRONTEND_URL`, plus any `localhost:*` in dev), cookie-parser, a global
100kb JSON body limit, `trust proxy` for nginx, static `/uploads` serving
with locked-down headers, then a global `/api` rate limiter, then routes.
`/health` and `/api/health` (the one nginx forwards) run `SELECT 1` and
answer 503 when the database is down. SIGINT/SIGTERM trigger a graceful
shutdown (open requests finish, up to 8 s; PM2 `kill_timeout` is 10 s).
Monitoring and logs: README §4.8.

Each feature is `routes/<name>.js` → `controllers/<name>Controller.js`,
using Prisma directly in controllers (no repository/service layer, except
where noted below). Orders are the exception to one-controller-per-route:
`routes/orders.js` uses `orderController.js` (read/create), `orderStatusController.js`
(status changes, driver assignment) and `orderModificationController.js`
(admin edits + customer accept/decline), with shared helpers in `orderShared.js`.
Likewise `routes/settings.js` uses `settingsController.js` (store settings),
`googleReviewController.js`, `sectionPasscodeController.js` and
`driverController.js` (driver accounts + the driver login/approval flow), with
the StoreSettings defaults in `settingsShared.js`. Shared logic lives in `utils/` and `lib/`:

- `lib/prisma.js` — the shared Prisma client singleton.
- `lib/config.js`, `lib/auditLog.js` — config loading and audit-log writes (see `AuditLog` model / `/api/audit-log`).
- `lib/errorTracking.js` — optional Sentry (only when `SENTRY_DSN` is set; required in `server.js` before express). It reports every `console.error()` that carries an `Error`, so keep logging caught errors as `console.error('…:', error)`; `utils/errorEvents.js` (pure, tested) strips personal data from each report. Don't log personal data inside error messages or `console.error` strings. `GET /api/settings` carries `errorTracking`, which shows the Sentry paragraph on `/datenschutz`.
- `utils/pricingService.js` — promotion & coupon price calculation (`calculatePromotionForItem`, `validateAndCalculateCoupon`).
- `utils/orderPricing.js` — pure order math shared by `createOrder` and `editOrder` (line items, subtotals, postal-code allow-list, free delivery, totals). Change pricing here, not in the controller.
- `utils/deliverySlot.js` — delivery window/slot logic (fee model: README §5); `utils/distanceService.js` does distance-based delivery fee/eligibility, backed by `routes/deliveryDistance.js` and `routes/deliveryWindows.js`.
- `utils/piiCrypto.js` — field-level encryption for customer/order PII (policy: README §6 "Personal data & GDPR"); `scripts/encryptCustomerPii.js` and `scripts/encryptOrderSnapshotPii.js` are one-off migration scripts for encrypting existing rows. Never replace `ENCRYPTION_KEY` on a database with data (no key rotation).
- `utils/backup.js` (pure, tested) and `utils/backupTools.js` — shared by `scripts/backupDatabase.js`, `scripts/restoreTest.js` and `scripts/checkEncryptionKey.js` (README §4.7). The restore test only ever drops the `supermarket_restore_test_<time>` database it created.
- `utils/emailService.js` — Nodemailer wrapper for OTPs, order status emails, password reset; it re-exports `utils/email/` (`core.js`: transport, HTML layout, helpers; `orderEmails.js`; `accountEmails.js`). If SMTP env vars are left as placeholders, emails are skipped and logged to console instead of failing the request.
- `utils/pushService.js` — Web Push via the `web-push` library with VAPID keys (`routes/push.js`, `PushSubscription` model).
- `utils/whatsappService.js` — sends phone-verification codes through Meta's WhatsApp Cloud API (authentication template in production, plain text elsewhere — README §4.4); `resendOtp` with `type: 'phone'` sends, `verifyPhone` checks the code. Without `WHATSAPP_*` config it logs the code in dev and throws in production.
- `utils/googleScraper.js` — feeds the `GoogleReview` model (shown via `TrustindexWidget` on the frontend).
- `utils/imageProxy.js`, `utils/serialize.js`, `utils/validation.js` — image proxying, response serialization helpers, shared input validation.

**Two separate auth systems**, each with its own middleware and JWT cookie:
- Admin/staff: `middleware/auth.js` + `controllers/authController.js` (`routes/auth.js`).
- Customers: `middleware/customerAuth.js` + `controllers/customerAuthController.js` (register, OTP verification, login), `customerProfileController.js`, `customerAdminController.js` (Kunden page) and `passwordResetController.js`, all on `routes/customerAuth.js`, mounted at **three** route prefixes (`/api/customer`, `/api/customer-auth`, `/api/customers` — all the same router, kept for backward compatibility).
- `middleware/anyAuth.js` accepts either token type where an endpoint is shared.
- `middleware/csrf.js` — CSRF protection for cookie-based auth.
- `middleware/sectionUnlock.js` — passcode-gated sections (see `SectionPasscodeGate.jsx` on the frontend).
- `middleware/rateLimiter.js` — Redis-backed rate limiting; `apiLimiter` is applied globally, stricter limiters are used on auth endpoints.

Driver delivery flow uses its own models (`DriverLoginRequest`, `DriverSession`)
separate from admin/customer auth — see README §7 "Driver feature review" and
`pages/DriverDeliveryView.jsx`.

Admin routes generally require `middleware/auth.js`; nearly every mutating
admin action also writes an `AuditLog` row via `lib/auditLog.js` — follow
that pattern when adding new admin write endpoints.

### Database (`backend/prisma/schema.prisma`)

Money columns (prices, discounts, fees, totals) are
`Decimal @db.Decimal(10, 2)`. `lib/prisma.js` extends the client so every
query result has those converted back to plain JS numbers — controllers and
the frontend never see `Prisma.Decimal`. Round any money arithmetic with
`roundMoney` from `utils/money.js`, not `toFixed(2)` (which rounds 6.015 down).
Non-money floats (km, coordinates, percentages, rating) stay `Float`.

Order status is the enum `OrderStatus` (seven values); the allowed changes
between them are in `utils/orderStatus.js`, copied in
`frontend/src/utils/orderStatus.js` (`tests/orderStatus.test.js` fails if the
enum, the backend list or the frontend copy drift apart). There's no
`Accounting` table (dropped by a migration); the Accounting page reads orders.

Key models: `Admin`, `Customer`, `Product`, `Category`, `Order`/`OrderItem`,
`StoreSettings`, `Coupon`/`CouponUsage`, `Promotion`,
`DeliveryWindow`, `DriverLoginRequest`/`DriverSession`, `PushSubscription`,
`GoogleReview`, `AuditLog`. Schema changes go through Prisma Migrate: edit
`schema.prisma`, then `npm run migrate:dev -- --name <what_changed>`, read the
generated `prisma/migrations/<timestamp>_<name>/migration.sql` (data
conversions: `-- --create-only`, edit the SQL, apply), and commit it with the
schema. `0_init` is the baseline from when the project left `db push`; never
edit an applied migration. The database tests rebuild from the migrations and
fail if `schema.prisma` has changes no migration contains. README "Schema
changes (migrations)", and §4.2 for baselining a database created with
`db push`.

### Frontend

Single Vite React app serving both the public storefront and the admin
dashboard (no separate admin build). Structure:
- `pages/` — route-level components (storefront: `LandingPage` (also served at `/catalog` and `/shop`); customer: `CustomerLogin/Register/Account`; admin: `Dashboard`, `Catalogs` (categories), `Products`, `Orders`, `Customers`, `Accounting`, `Settings`, `Promotions`, `AuditLog`; driver: `DriverDeliveryView`). A large page keeps its parts in a lowercase folder of the same name (`pages/orders/`, `pages/settings/`, `pages/landing/`, `pages/account/`, `pages/promotions/`, `pages/driver/`, `pages/customers/`, `pages/products/`): components and hooks used only by that page. The page file holds the state and handlers; hooks like `useDriverAccounts` hold state that must survive tab switches, so they're called in the page, not in the tab.
- `context/` — `AuthContext` (admin) and `CustomerAuthContext` (customer) are separate, mirroring the backend's two auth systems; also `LanguageContext` (DE/AR, strings in `context/translations/`), `ThemeContext`, `StoreSettingsContext`.
- `utils/adminAxios.js` vs `utils/customerAxios.js` — separate axios instances per auth system (cookie-based, with CSRF handling via `utils/csrf.js`).
- `config/adminPath.js` — the admin login is served at an obscured path (`ADMIN_BASE`, currently `/console-eb68a2f3/...`) rather than `/admin`; change this constant before deploying a fork. This is not real secrecy on its own — see the comment in that file.
- `components/ProtectedRoute.jsx` — route guarding based on the relevant auth context.
- `components/SectionPasscodeGate.jsx` — pairs with backend `middleware/sectionUnlock.js`.
- `components/ui/` — shared primitives (`Button`, `IconButton`, `Card`, `Badge`, `Input`, `Select`, `Switch`, `Modal`, `Drawer`, `EmptyState`, `Skeleton*`, `Pagination`); use them for new UI. Tap targets are 44px; compact controls use the custom `coarse:` variant (touch screens) to grow, e.g. `min-h-9 coarse:min-h-11`. `context/FeedbackContext.jsx` provides `useToast()` / `useConfirm()` — never `alert()`/`window.confirm()`.
- Colours are semantic Tailwind tokens (`primary`, `brand`, `success`, `warning`, `danger`, `info`, `promo`), not palette names; order-status styling comes only from `utils/orderStatusBadge.js`. Tailwind is v3.4 — v4-only classes silently do nothing. Rules: README §10 "Design system".
- `pages/orders/OrderDrawer.jsx` is the single per-order view (tabs in `Order*Tab.jsx`); its writes send `expectedUpdatedAt` so the backend can answer 409 on stale edits.

### Deployment

`deployment/ecosystem.config.js` (PM2, cluster mode, `instances: 'max'`, port 5000)
and `deployment/nginx.conf` (serves `frontend/dist`, proxies `/api/*` to the
backend, rate-limits auth endpoints). Backend has no build step. See
README §4 for the deployment steps and hardening, and README §6 for the
PII/data-retention policy that the `piiCrypto`/`encrypt*Pii.js` code
implements.

## Notes

- Numbered comments in the code like `// #28 fix: ...` in `server.js` reference
  entries in README §7 "Fix log" — check there for the reasoning behind a
  given hardening measure before changing it. `README.md` is the project's
  only documentation file — add new docs there as a section, not as a new `.md`.
- `.claude/skills/` (repo root) holds a copy of Anthropic's Engineering plugin
  skills (`code-review`, `debug`, `deploy-checklist`, `architecture`, etc.) —
  see `.claude/skills/README.md` for the source and how to update them.
- `backend/.claude/skills/` (also mirrored under `backend/.agents/skills/`)
  has Prisma Composer / Prisma Platform skills — only relevant if this repo
  is later moved onto Prisma's hosted platform; the current deployment is
  plain PostgreSQL + Prisma ORM + nginx/PM2, not Prisma Platform.
