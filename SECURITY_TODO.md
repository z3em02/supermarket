# Security & Bug Audit — TODO
**Audit date:** 2026-09-24 | **Total findings:** 50 (6 Critical · 15 High · 18 Medium · 11 Low)

---

## 🔴 Critical

- [x] **#1** — Rotate ALL secrets in `backend/.env` (DB password, JWT secret, email password, AES encryption key, VAPID private key) and move them out of version control
- [x] **#2** — Rotate Firebase service account key in Firebase console; ensure `firebase-service-account.json` stays gitignored and is never committed again (Key rotated to cb9baeb8... and verified)
- [ ] **#3** — Rotate Firebase Web API key (`frontend/.env`); add Firebase App Check or authorized domain restrictions to prevent SMS flooding / quota exhaustion *(Action in Firebase Console)*
- [x] **#4** — `createOrder`: never accept `customerId` from `req.body` — always derive from the authenticated JWT (`req.customer.customerId`) — `orderController.js:146`
- [x] **#5** — Protect `verifyEmail` and `resendOtp` with `customerAuthMiddleware`, and validate that the session matches — `customerAuthController.js:163,301`
- [x] **#6** — `editOrder`: never use client-supplied `price`; always re-fetch the price from DB; enforce `price > 0` — `orderController.js:809`

---

## 🟠 High

- [x] **#7** — Replace JWT secret with a cryptographically random 64-char string (not the default placeholder) — `backend/.env:9`
- [x] **#8** — Use a separate dedicated secret for section-unlock tokens instead of the same `JWT_SECRET` — `sectionUnlock.js`
- [x] **#9** — Support Redis-backed distributed rate limiter via `ioredis` with seamless in-memory fallback for multi-process / load-balanced deployments — `rateLimiter.js`
- [x] **#10** — Move the stock availability pre-check inside the transaction in `createOrder`, or remove it and rely solely on the atomic `decrementStockOrThrow` guard — `orderController.js:220`
- [x] **#11** — Add a `logAudit()` call to `deleteCustomer` recording the admin email, timestamp, and deleted customer ID — `customerAuthController.js:652`
- [x] **#12** — Fix `verifyEmail` logic order: check OTP expiry BEFORE the OTP match, then check attempt count — `customerAuthController.js:182`
- [x] **#13** — Fix `resendOtp` OTP lockout bypass: rate-limit per `customerId` (not just IP), or require the current OTP to be expired before allowing a resend — `customerAuthController.js:299`
- [x] **#14** — Validate `startDate` / `endDate` in accounting endpoints — return HTTP 400 on invalid date strings — `accountingController.js:23`
- [x] **#15** — Cap the `limit` query param in `getAccountingRecords` to a maximum of 200 — `accountingController.js:126`
- [x] **#16** — Admin-placed orders must verify the supplied `customerId` actually exists and belongs to a verified customer; never accept arbitrary IDs — `orderController.js:146`
- [x] **#17** — Decrement `coupon.usedCount` and delete the `CouponUsage` record when an order is declined or cancelled — `orderController.js:592`
- [x] **#18** — Delete the `CouponUsage` record inside the `deleteOrder` transaction and disallow order history deletion with 403 Forbidden (§ 132 BAO retention) — `orderController.js:710`
- [ ] **#19** — Fix `FRONTEND_URL` in `backend/.env` to the real production domain, not `localhost:5173` — `server.js:31` *(Deployment config — see DEPLOYMENT_SECURITY.md)*
- [ ] **#20** — Enforce HTTPS: configure nginx with HTTP→HTTPS redirect and TLS termination — `server.js:91` *(Nginx config on server — see DEPLOYMENT_SECURITY.md)*
- [x] **#21** — Document that `trust proxy 1` requires nginx to always be in front; added TRUST_PROXY env toggle and documented in DEPLOYMENT_SECURITY.md — `server.js:49`

---

## 🟡 Medium

- [x] **#22** — Shorten admin JWT lifetime to 8–24h and implement a token revocation mechanism (e.g. token version stored in DB) — `authController.js:9`
- [x] **#23** — On customer password reset, invalidate all existing JWT sessions (e.g. `tokenVersion` field in `Customer`, increment on password change) — `customerAuthController.js:127`
- [x] **#24** — Align OTP expiry and attempt check order so that correct-but-expired codes behave consistently and don't skip attempt increment — `customerAuthController.js:186`
- [x] **#25** — Move `editOrder` stock pre-check inside the transaction to avoid stale reads under concurrency — `orderController.js:824`
- [x] **#26** — Re-apply coupon and promotion discounts when recalculating the order total in `editOrder` — currently the new total ignores discounts and overcharges customers — `orderController.js:791`
- [x] **#27** — Change geocoding failure fallback to `isWithinMaxDistance: false` — reject orders with unresolvable addresses instead of silently accepting them — `distanceService.js:345`
- [x] **#28** — Set an explicit JSON body size limit: `express.json({ limit: '100kb' })` — `server.js:45`
- [x] **#29** — Validate `preferredLanguage` against an allowlist `['de', 'ar', 'en']` before storing — `customerAuthController.js:34`
- [x] **#30** — Validate `imageUrl` and `logoUrl` are valid `https://` URLs; reject `javascript:` and `data:` schemes — `productController.js:104`, `settingsController.js:150`
- [x] **#31** — Validate `mapEmbedUrl` must start with `https://www.google.com/maps/embed` before storing — `settingsController.js:165`
- [x] **#32** — Block `goo.gl` and `g.page` shortlinks in the Google scraper URL allowlist to prevent SSRF via redirect — `googleScraper.js:55`
- [x] **#33** — Delete the `createAdmin` controller and its import entirely — don't just comment out the route — `routes/auth.js:18`
- [x] **#34** — Add an order status whitelist in `updateOrderStatus`; reject any status string not in the allowed set — `orderController.js:538`
- [x] **#35** — Configure `PrismaClient` with error and warning logging: `new PrismaClient({ log: ['error', 'warn'] })` — `lib/prisma.js`
- [x] **#36** — Add `requireTLS: true` to the nodemailer SMTP transport config to prevent STRIPTLS attacks — `emailService.js:61`
- [x] **#37** — Fix `CustomerAccount.jsx` polling: clear the interval when `token` becomes null (not just on unmount) — `CustomerAccount.jsx:142`
- [x] **#38** — Added HttpOnly cookie support for JWT storage (`cookie-parser`, `res.cookie` in auth/customerAuth, cookie auth middleware extraction, and logout route) to protect against XSS token theft — `server.js`, `middleware/auth.js`, `middleware/customerAuth.js`
- [x] **#39** — Move token attachment into the `adminAxios` interceptor; remove manual `Authorization` header construction in `Dashboard.jsx` — `Dashboard.jsx:36`
- [x] **#40** — Replace unsalted SHA-256 email/phone lookup hashes with HMAC-SHA-256 using `ENCRYPTION_KEY` as the HMAC key — `piiCrypto.js:44`

---

## 🟢 Low

- [x] **#41** — Add password strength validation to `createAdmin` (Resolved: `createAdmin` was removed completely as unused/insecure) — `authController.js:162`
- [x] **#42** — Add a graceful failure path to the SKU collision retry loop: after 5 failed attempts, return a clear 500 error — `productController.js:86`
- [x] **#43** — Confirm Puppeteer is launched with correct sandbox flags for the Linux deployment user — document the requirement — `googleScraper.js`
- [x] **#44** — Cache and reuse the nodemailer transport instance instead of creating a new one per email send — `emailService.js:56`
- [x] **#45** — Fix the coupon rollback issue (#18) BEFORE re-enabling the `deleteOrder` route (Resolved: order deletion permanently blocked with 403) — `routes/orders.js:27`
- [x] **#46** — Add `onDelete: Cascade` to the `Accounting → Order` relation in Prisma schema — `schema.prisma:176`
- [x] **#47** — Add `onDelete: Cascade` to the `OrderItem → Order` relation in Prisma schema — `schema.prisma:159`
- [x] **#48** — Add `deliveryNotes` to `CUSTOMER_PUBLIC_SELECT` so delivery instructions appear in admin order views — `serialize.js:5`
- [x] **#49** — Fix `normalizeAustrianPhone`: do not treat bare `43`-prefixed local numbers as already country-coded — `validation.js:11`
- [x] **#50** — Cache `storeSettings.sectionPasscodeHash` (e.g. 60s TTL) to avoid a DB query on every gated request — `sectionUnlock.js:14`

---

## 🛡️ Independent Security Audit Remediations (Follow-Up Audit)

- [x] **#51 (Finding 1.1 - High)** — Passcode reset requires verification of current passcode or section unlock, rate-limited via `passcodeVerifyLimiter`, audit logged, and cache invalidated — `settingsController.js:192`, `routes/settings.js:20`
- [x] **#52 (Finding 1.2 & 1.7 - High)** — Converted `anyAuthMiddleware` and `optionalAuthMiddleware` to check DB `tokenVersion` for customer and admin sessions, and inspect HttpOnly cookies — `middleware/anyAuth.js:15-60`
- [x] **#53 (Finding 1.3 - High)** — Added `tokenVersion` to `Admin` model in Prisma schema, verified in `authMiddleware`, and incremented on password changes and logout — `schema.prisma:14`, `authController.js:105,170`, `middleware/auth.js:17`
- [x] **#54 (Finding 1.5 - Medium)** — Secured `/logout` cookie deletion: passed `{ httpOnly: true, secure: ..., sameSite: 'lax', path: '/' }` and revoked token in DB — `routes/auth.js:23`, `routes/customerAuth.js:23`
- [x] **#55 (Finding 2.1 - Medium)** — Encrypted order snapshot `deliveryAddress` and `deliveryNotes` with AES-256-GCM at rest, with backwards-compatible decryption — `orderController.js:22,435`, `accountingController.js:13`
- [x] **#56 (Finding 2.2 - Medium)** — Added startup validation assertion for `ENCRYPTION_KEY` (64-char hex string) in `backend/lib/config.js` across environments — `lib/config.js:25`
- [x] **#57 (Finding 3.1 & 3.3 - High)** — Eliminated Stored XSS in settings by enforcing strict `https://` URLs for `mapUrl` and `googleReviewsUrl`, and rejecting protocol-relative URLs (`//`) — `settingsController.js:154-180`
- [x] **#58 (Finding 3.2 - High)** — Blocked Blind SSRF in Google Scraper by enabling Puppeteer request interception and blocking private/loopback/cloud-metadata IP ranges on all navigations and redirects — `googleScraper.js:26,95`
- [x] **#59 (Finding 3.4 - Medium)** — Neutralized CSV formula injection in accounting data export by prefixing formula triggers (`=`, `+`, `-`, `@`) with a single quote — `accountingController.js:226`
- [x] **#60 (Finding 4.1 / #6 - High)** — Enforced authoritative DB pricing in `editOrder`, removing client `it.price` overrides completely — `orderController.js:828`
- [x] **#61 (Finding 4.3 - Medium)** — Required re-authentication (`currentPassword`) before modifying customer password, email, or phone number in profile update; re-issued fresh session JWT and cookie upon password change — `customerAuthController.js:528,604`, `CustomerAccount.jsx:1126`
- [x] **#62 (Finding 4.4 - Low)** — Hardened Redis distributed rate limiter against immortal keys using atomic pipeline and automatic TTL recovery — `rateLimiter.js:80-95`
