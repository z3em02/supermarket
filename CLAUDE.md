# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Hajar Supermarkt: an online supermarket for B2C customers in Austria, with
home delivery and cash/card-on-delivery payment. Bilingual (German/Arabic)
storefront, customer accounts with email/phone OTP verification, and an
admin back office for products, orders, customers, accounting and store
settings. There's also a driver-facing delivery view.

- **Backend**: Node.js, Express 5, Prisma ORM on PostgreSQL, JWT auth (HttpOnly cookies), Nodemailer, Firebase Admin (push), Redis (ioredis, rate limiting)
- **Frontend**: React 19, Vite, Tailwind CSS, React Router 7
- **Deployment**: nginx (reverse proxy + static hosting) + PM2 (cluster mode)

## Commands

```bash
# Backend (from backend/)
npm install
npx prisma db push       # sync schema to DB — this project uses `db push`, NOT `prisma migrate`
npm run prisma:seed      # seed default admin (admin@hajar.com / admin) + sample data
npm run dev               # start API on :5000 with `node --watch` (restarts on file changes)
npm test                  # all backend unit tests (`node --test "tests/**/*.js"`)
node --test tests/orderPricing.test.js      # a single test file
node --test --test-name-pattern="coupon" "tests/**/*.js"   # tests matching a name

# Frontend (from frontend/)
npm install
npm run dev                # Vite dev server on :5173
npm run build               # production build -> frontend/dist
npm run lint                # oxlint
npm run preview

# Both at once from repo root
./start.sh   # or start.bat on Windows
```

Backend tests use Node's built-in `node:test` runner (no jest/mocha). They
cover the DB-free logic only: order pricing (`utils/orderPricing.js`),
promotions/coupons, validation, PII crypto, delivery slots and delivery-fee
calculation (network stubbed so it uses the postal-code centroids). Put pure
logic in `utils/` rather than inline in controllers so it can be tested this
way. `.github/workflows/ci.yml` runs backend tests plus frontend lint + build
on every PR and push to `main`.

Env setup: `cp backend/.env.example backend/.env` and `cp frontend/.env.example frontend/.env`,
then fill in `DATABASE_URL`, `JWT_SECRET` (min 32 chars — server refuses to start otherwise),
`FRONTEND_URL`, SMTP vars. Frontend's `VITE_API_URL` is normally left empty (nginx proxies `/api`).

## Architecture

### Backend: layered Express app

`server.js` wires everything: helmet, CORS (origin allow-list from
`FRONTEND_URL`, plus any `localhost:*` in dev), cookie-parser, a global
100kb JSON body limit, `trust proxy` for nginx, static `/uploads` serving
with locked-down headers, then a global `/api` rate limiter, then routes.

Each feature is `routes/<name>.js` → `controllers/<name>Controller.js`,
using Prisma directly in controllers (no repository/service layer, except
where noted below). Shared logic lives in `utils/` and `lib/`:

- `lib/prisma.js` — the shared Prisma client singleton.
- `lib/config.js`, `lib/auditLog.js` — config loading and audit-log writes (see `AuditLog` model / `/api/audit-log`).
- `utils/pricingService.js` — promotion & coupon price calculation (`calculatePromotionForItem`, `validateAndCalculateCoupon`).
- `utils/orderPricing.js` — pure order math shared by `createOrder` and `editOrder` (line items, subtotals, postal-code allow-list, free delivery, totals). Change pricing here, not in the controller.
- `utils/deliverySlot.js` / `DISTANCE_BASED_DELIVERY.md` — delivery window/slot logic; `utils/distanceService.js` does distance-based delivery fee/eligibility, backed by `routes/deliveryDistance.js` and `routes/deliveryWindows.js`.
- `utils/piiCrypto.js` — field-level encryption for customer/order PII (see `GDPR_DATA_POLICY.md`); `scripts/encryptCustomerPii.js` and `scripts/encryptOrderSnapshotPii.js` are one-off migration scripts for encrypting existing rows.
- `utils/emailService.js` — Nodemailer wrapper for OTPs, order status emails, password reset. If SMTP env vars are left as placeholders, emails are skipped and logged to console instead of failing the request.
- `utils/pushService.js` — Web Push via the `web-push` library with VAPID keys (`routes/push.js`, `PushSubscription` model).
- `utils/firebaseAdmin.js` — verifies Firebase ID tokens for phone-number OTP verification (not used for push).
- `utils/googleScraper.js` — feeds the `GoogleReview` model (shown via `TrustindexWidget` on the frontend).
- `utils/imageProxy.js`, `utils/serialize.js`, `utils/validation.js` — image proxying, response serialization helpers, shared input validation.

**Two separate auth systems**, each with its own middleware and JWT cookie:
- Admin/staff: `middleware/auth.js` + `controllers/authController.js` (`routes/auth.js`).
- Customers: `middleware/customerAuth.js` + `controllers/customerAuthController.js`, mounted at **three** route prefixes (`/api/customer`, `/api/customer-auth`, `/api/customers` — all the same router, kept for backward compatibility).
- `middleware/anyAuth.js` accepts either token type where an endpoint is shared.
- `middleware/csrf.js` — CSRF protection for cookie-based auth.
- `middleware/sectionUnlock.js` — passcode-gated sections (see `SectionPasscodeGate.jsx` on the frontend).
- `middleware/rateLimiter.js` — Redis-backed rate limiting; `apiLimiter` is applied globally, stricter limiters are used on auth endpoints.

Driver delivery flow uses its own models (`DriverLoginRequest`, `DriverSession`)
separate from admin/customer auth — see `SECURITY_TODO_DRIVER_FEATURE.md` and
`pages/DriverDeliveryView.jsx`.

Admin routes generally require `middleware/auth.js`; nearly every mutating
admin action also writes an `AuditLog` row via `lib/auditLog.js` — follow
that pattern when adding new admin write endpoints.

### Database (`backend/prisma/schema.prisma`)

Money columns (prices, discounts, fees, totals, `Accounting.amount`) are
`Decimal @db.Decimal(10, 2)`. `lib/prisma.js` extends the client so every
query result has those converted back to plain JS numbers — controllers and
the frontend never see `Prisma.Decimal`. Round any money arithmetic with
`roundMoney` from `utils/money.js`, not `toFixed(2)` (which rounds 6.015 down).
Non-money floats (km, coordinates, percentages, rating) stay `Float`.

Key models: `Admin`, `Customer`, `Product`, `Category`, `Order`/`OrderItem`,
`Accounting`, `StoreSettings`, `Coupon`/`CouponUsage`, `Promotion`,
`DeliveryWindow`, `DriverLoginRequest`/`DriverSession`, `PushSubscription`,
`GoogleReview`, `AuditLog`. Schema changes: edit `schema.prisma`, then
`npx prisma db push` (not `prisma migrate` — there's no migrations directory
to keep in sync).

### Frontend

Single Vite React app serving both the public storefront and the admin
dashboard (no separate admin build). Structure:
- `pages/` — route-level components (storefront: `LandingPage`, `Catalog(s)`; customer: `CustomerLogin/Register/Account`; admin: `Dashboard`, `Products`, `Orders`, `Customers`, `Accounting`, `Settings`, `Promotions`, `AuditLog`; driver: `DriverDeliveryView`).
- `context/` — `AuthContext` (admin) and `CustomerAuthContext` (customer) are separate, mirroring the backend's two auth systems; also `LanguageContext` (DE/AR), `ThemeContext`, `StoreSettingsContext`.
- `utils/adminAxios.js` vs `utils/customerAxios.js` — separate axios instances per auth system (cookie-based, with CSRF handling via `utils/csrf.js`).
- `config/adminPath.js` — the admin login is served at an obscured path (`ADMIN_BASE`, currently `/console-eb68a2f3/...`) rather than `/admin`; change this constant before deploying a fork. This is not real secrecy on its own — see the comment in that file.
- `components/ProtectedRoute.jsx` — route guarding based on the relevant auth context.
- `components/SectionPasscodeGate.jsx` — pairs with backend `middleware/sectionUnlock.js`.

### Deployment

`deployment/ecosystem.config.js` (PM2, cluster mode, `instances: 'max'`, port 5000)
and `deployment/nginx.conf` (serves `frontend/dist`, proxies `/api/*` to the
backend, rate-limits auth endpoints). Backend has no build step. See
`DEPLOYMENT_SECURITY.md` for hardening notes and `GDPR_DATA_POLICY.md` for
the PII/data-retention policy that the `piiCrypto`/`encrypt*Pii.js` code
implements.

## Notes

- Numbered comments in the code like `// #28 fix: ...` in `server.js` reference
  entries in `COMPLETED_TODOS.md` / `SECURITY_TODO*.md` — check those files
  for the reasoning behind a given hardening measure before changing it.
- `backend/.claude/skills/` (also mirrored under `backend/.agents/skills/`)
  has Prisma Composer / Prisma Platform skills — only relevant if this repo
  is later moved onto Prisma's hosted platform; the current deployment is
  plain PostgreSQL + Prisma ORM + nginx/PM2, not Prisma Platform.
