# Completed Tasks & Security Remediations Archive

This document archives all completed and verified tasks, bug fixes, and security remediations that were previously tracked in `SECURITY_TODO.md`, `SECURITY_TODO_2026-09-25.md`, and `TODO.md`.

---

## 1. Security Review — 2026-09-25 (Latest Hardening Pass)

Archived from `SECURITY_TODO_2026-09-25.md`:

### Fixed as part of review
- **`googleReviewsUrl` validation gap in `syncGoogleReviews`** — `backend/controllers/settingsController.js`. The `updateSettings` endpoint validates `googleReviewsUrl` against `javascript:`/`data:`/`vbscript:`/protocol-relative/non-https before persisting it, but the separate `syncGoogleReviews` endpoint (`POST /api/settings/sync-google-reviews`) wrote the same field to the DB straight from `req.body` with no validation at all. Added the identical check before the `updateData.googleReviewsUrl = cleaned` assignment.
- **Logout endpoints CSRF protection** — `backend/routes/auth.js` (`/api/auth/logout`) and `backend/routes/customerAuth.js` (`/api/customer/logout`) were mounted without auth middleware, so `requireCsrfForCookieAuth` never ran on them. Added a manual `requireCsrfForCookieAuth(req, res, usedCookieAuth)` call at the top of both handlers.
- **`setPasscode` current PIN requirement** — `backend/controllers/settingsController.js` (`setPasscode`). Removed the unlock-token bypass entirely; the current PIN is now always required to change or remove it, even from an already-unlocked session (step-up auth). Added the missing "current PIN" field to the change-PIN form in `Settings.jsx`, and a `window.prompt` for it on the remove-PIN action.

### Open items resolved & completed
- **`secure` cookie flag centralization** — `backend/lib/config.js`, `csrf.js`, `authController.js`, `customerAuthController.js`, `routes/auth.js`, `routes/customerAuth.js`. Extracted centralized `SECURE_COOKIES` constant supporting `FORCE_SECURE_COOKIES=true` and `NODE_ENV=production`. Replaced all 8 inline checks across the backend.
- **Image/logo URL private host validation (SSRF defense)** — `backend/controllers/productController.js` (`isValidImageUrl`) and `settingsController.js` (`logoUrl`, `googleReviewsUrl`). Added `isPrivateOrLocalHost(hostname)` checks blocking localhost, RFC 1918 private IPv4, IPv6 ULA/link-local/loopback, and cloud metadata IPs (`169.254.x.x`).
- **Admin-configured `logoUrl` external host beaconing** — `backend/utils/imageProxy.js`, `backend/controllers/settingsController.js`, `backend/server.js`, `frontend/src/utils/api.js`, `StoreSettingsContext.jsx`, `Settings.jsx`, `vite.config.js`. Implemented server-side logo proxying and caching. External logos are downloaded server-side, validated (size <= 2MB, MIME types, binary magic bytes, SVG script/handler inspection), saved locally under `backend/uploads/logo-<hash>.<ext>`, and served statically with hardened headers (`Content-Security-Policy: default-src 'none'`, `Cross-Origin-Resource-Policy: cross-origin`, `X-Content-Type-Options: nosniff`). Frontend normalizes and displays the locally served asset, preventing third-party tracking, visitor IP beaconing, and remote logo tampering.
- **Scraped Google rating/review-count range validation** — `backend/controllers/settingsController.js` (`syncGoogleReviews`). `scraped.rating` is coerced to `Number`, accepted only if finite and in `[0, 5]` (rounded to one decimal place); `scraped.reviewCount` is accepted only if it is a non-negative integer. Invalid values are silently skipped.
- **Customer login verification grace period** — Confirmed safe by design. Order creation in `backend/controllers/orderController.js` (lines 185–203) strictly enforces both `emailVerified` and `phoneVerified` before processing customer orders, returning 403 Forbidden with `needsVerification: true`.

---

## 2. General TODO Items

Archived from `TODO.md`:

### Customer Data Security
- **Hide email address in order view** — Customer email address hidden in the delivery person / order view to protect customer privacy.
- **Dynamic tab image (Favicon)** — Dynamic favicon in `StoreSettingsContext.jsx` configured from the store's admin logo, cached locally and served from the application origin without external host beaconing.

### Security Hardening (from 2026-09-24 Audit)
- **Cookie-only authentication migration** — JWT no longer duplicated into `localStorage`. Admin: added `GET /api/auth/me` session check; `AuthContext` calls it on mount instead of reading stored tokens. Customer: `CustomerAuthContext` uses `GET /api/customer/profile`. Shared instances `utils/adminAxios.js` and `utils/customerAxios.js` (`withCredentials: true`, auto-attach `X-CSRF-Token` on mutating requests). Deleted `getAuthHeaders()` in `utils/api.js`.
- **`customerAuthMiddleware` fail-closed** — Made fail-closed on missing `tokenVersion` matching `authMiddleware`.
- **SSRF IP-range filter IPv6 math** — `backend/utils/googleScraper.js` upgraded to real CIDR bitmask math against expanded 8-group addresses and decomposed IPv4-mapped/compatible IPv6 literals. Tested against all bypasses (`fc01::`, `fe90::`, `::ffff:169.254.169.254`, etc.).
- **Double-submit cookie CSRF protection** — Added `middleware/csrf.js` issuing CSRF tokens alongside session cookies, enforced on mutating requests where auth originated from cookies.
- **Customer cookie path** — Added `path: '/'` to login and register cookie setters in `customerAuthController.js`.

### Financial Integrity & Order Bugs (`editOrder`)
- **Coupon re-validation on edit** — `editOrder` re-validates `minOrderValue`, active status, and date range against recalculated subtotal via shared `calculateCouponDiscountAmount` helper (`pricingService.js`). Recalculates per-item promotions instead of clamping stale aggregates.
- **Delivery fee recalculation** — `editOrder` re-evaluates free-delivery thresholds against new subtotals while preserving distance-based fee components.
- **Store minimum order value enforcement** — `editOrder` enforces store `minOrderValue` on edited orders, returning 400 if subtotal falls below.
- **Double-submit race guard on order decline/cancel** — `updateOrderStatus` and `customerRespondToModification` decline path guard status transitions with atomic `updateMany` checking observed status inside Prisma transactions, returning 409 on conflict.
- **Protocol-relative URL blocking** — `isValidImageUrl` in `productController.js` rejects protocol-relative URLs (`//evil.com/x.jpg`).

### Functionality & Robustness
- **Frontend logout backend invocation** — Admin and customer frontend logout flows call backend `/logout` endpoints best-effort without blocking UI state clearing.
- **Geocoding retry with backoff** — Added 400ms-backoff retry for Nominatim in `distanceService.js` before falling back to postal code centroids, preventing checkout hard-blocks during transient geocoding blips.
- **Audit-logged order deletion block** — Registered `deleteOrder` route returning 403 Forbidden with statutory retention policy logging (§ 132 BAO).

---

## 3. Comprehensive Security Audit Remediations (50+ Findings)

Archived from `SECURITY_TODO.md`:

### 🔴 Critical Remediations
- **#1** — Rotated all secrets in `backend/.env` (DB password, JWT secret, email password, AES encryption key, VAPID private key) and moved them out of version control.
- **#2** — Rotated Firebase service account key in Firebase console; verified `firebase-service-account.json` remains gitignored.
- **#4** — `createOrder`: never accept `customerId` from `req.body` — always derive from the authenticated JWT (`req.customer.customerId`) (`orderController.js:146`).
- **#5** — Protected `verifyEmail` and `resendOtp` with `customerAuthMiddleware`, and validated session matches (`customerAuthController.js:163,301`).
- **#6** — `editOrder`: never use client-supplied `price`; always re-fetch the price from DB; enforce `price > 0` (`orderController.js:809`).

### 🟠 High Remediations
- **#7** — Replaced JWT secret with a cryptographically random 64-character secret.
- **#8** — Use separate dedicated secret for section-unlock tokens instead of sharing `JWT_SECRET` (`sectionUnlock.js`).
- **#9** — Support Redis-backed distributed rate limiter via `ioredis` with seamless in-memory fallback for multi-process deployments (`rateLimiter.js`).
- **#10** — Moved stock availability pre-check inside transaction in `createOrder` via atomic `decrementStockOrThrow` (`orderController.js:220`).
- **#11** — Added `logAudit()` call to `deleteCustomer` recording admin email, timestamp, and deleted customer ID (`customerAuthController.js:652`).
- **#12** — Fixed `verifyEmail` logic order: check OTP expiry before OTP match, then check attempt count (`customerAuthController.js:182`).
- **#13** — Fixed `resendOtp` lockout bypass: rate-limit per `customerId` and require current OTP expiry before resending (`customerAuthController.js:299`).
- **#14** — Validated `startDate` / `endDate` in accounting endpoints — return HTTP 400 on invalid date strings (`accountingController.js:23`).
- **#15** — Capped `limit` query param in `getAccountingRecords` to maximum 200 (`accountingController.js:126`).
- **#16** — Admin-placed orders verify supplied `customerId` exists and belongs to a verified customer (`orderController.js:146`).
- **#17** — Decrement `coupon.usedCount` and delete `CouponUsage` record when an order is declined or cancelled (`orderController.js:592`).
- **#18** — Delete `CouponUsage` record inside `deleteOrder` transaction and block deletion with 403 Forbidden (§ 132 BAO retention) (`orderController.js:710`).
- **#21** — Documented `trust proxy 1` requirement for Nginx fronting, added `TRUST_PROXY` env toggle in `DEPLOYMENT_SECURITY.md` (`server.js:49`).

### 🟡 Medium Remediations
- **#22** — Shortened admin JWT lifetime to 24h and implemented token revocation via `tokenVersion` stored in DB (`authController.js:9`).
- **#23** — On customer password reset, invalidate all existing JWT sessions via `tokenVersion` bump (`customerAuthController.js:127`).
- **#24** — Aligned OTP expiry and attempt check order so correct-but-expired codes behave consistently (`customerAuthController.js:186`).
- **#25** — Moved `editOrder` stock pre-check inside transaction to avoid stale reads under concurrency (`orderController.js:824`).
- **#26** — Re-apply coupon and promotion discounts when recalculating order total in `editOrder` (`orderController.js:791`).
- **#27** — Changed geocoding failure fallback to `isWithinMaxDistance: false` — reject orders with unresolvable addresses instead of silently accepting (`distanceService.js:345`).
- **#28** — Set explicit JSON body size limit: `express.json({ limit: '100kb' })` (`server.js:45`).
- **#29** — Validated `preferredLanguage` against allowlist `['de', 'ar', 'en']` before storing (`customerAuthController.js:34`).
- **#30** — Validated `imageUrl` and `logoUrl` are valid HTTP(S) URLs; reject `javascript:` and `data:` schemes (`productController.js:104`, `settingsController.js:150`).
- **#31** — Validated `mapEmbedUrl` must start with `https://www.google.com/maps/embed` before storing (`settingsController.js:165`).
- **#32** — Blocked `goo.gl` and `g.page` shortlinks in Google scraper URL allowlist to prevent SSRF via redirect (`googleScraper.js:55`).
- **#33** — Deleted `createAdmin` controller and its import entirely (`routes/auth.js:18`).
- **#34** — Added order status allowlist in `updateOrderStatus`; reject any unexpected status string (`orderController.js:538`).
- **#35** — Configured `PrismaClient` with error and warning logging (`lib/prisma.js`).
- **#36** — Added `requireTLS: true` to nodemailer SMTP transport config to prevent STRIPTLS attacks (`emailService.js:61`).
- **#37** — Fixed `CustomerAccount.jsx` polling to clear interval when token is null (`CustomerAccount.jsx:142`).
- **#38** — Added HttpOnly cookie support for JWT storage (`cookie-parser`, `res.cookie` in auth/customerAuth, cookie auth middleware extraction, and logout route).
- **#39** — Moved token attachment into `adminAxios` interceptor; removed manual `Authorization` header construction in `Dashboard.jsx`.
- **#40** — Replaced unsalted SHA-256 email/phone lookup hashes with HMAC-SHA-256 using `ENCRYPTION_KEY` as HMAC key (`piiCrypto.js:44`).

### 🟢 Low Remediations
- **#41** — Removed `createAdmin` completely as unused/insecure (`authController.js:162`).
- **#42** — Added graceful failure path to SKU collision retry loop: return clear 500 error after 5 failed attempts (`productController.js:86`).
- **#43** — Confirmed Puppeteer launched with correct sandbox flags for Linux deployment user (`googleScraper.js`).
- **#44** — Cached and reused nodemailer transport instance instead of creating a new one per send (`emailService.js:56`).
- **#45** — Resolved coupon rollback issue before re-enabling `deleteOrder` route (`routes/orders.js:27`).
- **#46** — Added `onDelete: Cascade` to `Accounting → Order` relation in Prisma schema (`schema.prisma:176`).
- **#47** — Added `onDelete: Cascade` to `OrderItem → Order` relation in Prisma schema (`schema.prisma:159`).
- **#48** — Added `deliveryNotes` to `CUSTOMER_PUBLIC_SELECT` so delivery instructions appear in admin order views (`serialize.js:5`).
- **#49** — Fixed `normalizeAustrianPhone`: do not treat bare `43`-prefixed local numbers as country-coded (`validation.js:11`).
- **#50** — Cached `storeSettings.sectionPasscodeHash` to avoid DB query on every gated request (`sectionUnlock.js:14`).

### 🛡️ Independent Security Audit Remediations (Follow-Up Audit)
- **#51 (Finding 1.1)** — Passcode reset requires verification of current passcode or section unlock, rate-limited via `passcodeVerifyLimiter`, audit logged, and cache invalidated (`settingsController.js:192`, `routes/settings.js:20`).
- **#52 (Finding 1.2 & 1.7)** — Converted `anyAuthMiddleware` and `optionalAuthMiddleware` to check DB `tokenVersion` for customer and admin sessions, and inspect HttpOnly cookies (`middleware/anyAuth.js:15-60`).
- **#53 (Finding 1.3)** — Added `tokenVersion` to `Admin` model in Prisma schema, verified in `authMiddleware`, and incremented on password change and logout (`schema.prisma:14`, `authController.js:105,170`, `middleware/auth.js:17`).
- **#54 (Finding 1.5)** — Secured `/logout` cookie deletion: passed `{ httpOnly: true, secure: ..., sameSite: 'lax', path: '/' }` and revoked token in DB (`routes/auth.js:23`, `routes/customerAuth.js:23`).
- **#55 (Finding 2.1)** — Encrypted order snapshot `deliveryAddress` and `deliveryNotes` with AES-256-GCM at rest, with backwards-compatible decryption (`orderController.js:22,435`, `accountingController.js:13`).
- **#56 (Finding 2.2)** — Added startup validation assertion for `ENCRYPTION_KEY` (64-char hex string) in `backend/lib/config.js` across environments (`lib/config.js:25`).
- **#57 (Finding 3.1 & 3.3)** — Eliminated Stored XSS in settings by enforcing strict `https://` URLs for `mapUrl` and `googleReviewsUrl`, and rejecting protocol-relative URLs (`//`) (`settingsController.js:154-180`).
- **#58 (Finding 3.2)** — Blocked Blind SSRF in Google Scraper by enabling Puppeteer request interception and blocking private/loopback/cloud-metadata IP ranges on all navigations and redirects (`googleScraper.js:26,95`).
- **#59 (Finding 3.4)** — Neutralized CSV formula injection in accounting data export by prefixing formula triggers (`=`, `+`, `-`, `@`) with a single quote (`accountingController.js:226`).
- **#60 (Finding 4.1 / #6)** — Enforced authoritative DB pricing in `editOrder`, removing client `it.price` overrides completely (`orderController.js:828`).
- **#61 (Finding 4.3)** — Required re-authentication (`currentPassword`) before modifying customer password, email, or phone number in profile update; re-issued fresh session JWT and cookie upon password change (`customerAuthController.js:528,604`, `CustomerAccount.jsx:1126`).
- **#62 (Finding 4.4)** — Hardened Redis distributed rate limiter against immortal keys using atomic pipeline and automatic TTL recovery (`rateLimiter.js:80-95`).

---

## 4. Feature Improvements & Roadmap Implementations — 2026-09-25

- **Customer Preferred Language & Localized Communications** (`CustomerAccount.jsx`, `customerAuthController.js`, `orderController.js`, `emailService.js`):
  - Added dedicated Preferred Language selection (`Deutsch`, `العربية`) in the customer profile tab of `CustomerAccount.jsx`.
  - Saving the profile updates both backend `preferredLanguage` column and frontend active language session (`LanguageContext`).
  - Localized transactional customer communications: order confirmation emails, order status notifications, order modification alerts, password reset emails, and push notifications are delivered in the customer's selected language.
- **Repeat / Reorder Past Basket** (`CustomerAccount.jsx`):
  - Added single-click **"Erneut bestellen" / "إعادة الطلب ↺"** button to customer order history cards in `CustomerAccount.jsx`.
  - Intelligently cross-checks current real-time inventory against past order items, merges in-stock items into `customer_cart`, skips out-of-stock items, provides localized feedback on availability, and redirects to shop for checkout.
- **Proactive Low-Stock Admin Alerts** (`Dashboard.jsx`, `Products.jsx`):
  - Added a real-time proactive low-stock alert banner to the Admin Dashboard whenever products fall to or below the safety threshold (<= 15 units).
  - Linked to `Products.jsx` with automatic `?stock=low` URL filter support for 1-click review and inventory restock.
- **Comprehensive Audit Logging & Bilingual UI Redesign** (`AuditLog.jsx`, `auditLogController.js`, `authController.js`, `productController.js`, `orderController.js`, `settingsController.js`, `couponController.js`, `promotionController.js`):
  - Instrument full audit logging across all critical mutations: Admin login (2FA), password changes, product creation/updating/deletion/stock adjustments, order status updates & modifications, store settings & section PIN adjustments, coupon & promotion lifecycle.
  - Complete overhaul of `AuditLog.jsx`: bilingual German (`de`) and Arabic (`ar`) support with RTL alignment, search across admin email / action / details, category filtering (Auth, Orders, Catalog, Customers, Promotions, Accounting, Settings), real-time KPI statistics cards, and styled timeline badges.
