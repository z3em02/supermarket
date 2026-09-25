# Security review — 2026-09-25 (2-agent pass)

Two independent agents reviewed the codebase from different angles: one deep-dived
the localStorage→cookie-only auth migration, the CSRF double-submit flow, the
`admin-auth-expired` redirect fix, the `ADMIN_BASE` path rename, and the dynamic
favicon feature (all from this session); the other did a fresh broad OWASP-style
pass (rate limiting, IDOR, injection surface, secrets hygiene, order/pricing,
customer auth) explicitly told to skip anything already listed as done in
`SECURITY_TODO.md`/`TODO.md`.

Overall verdict from both agents: **no new critical or high-severity findings**.
The codebase is in good shape post the prior hardening passes. One confirmed
validation-gap bug was found and has been fixed as part of this pass; the rest
are low-priority hardening notes, most of them explicit design trade-offs worth
being aware of rather than bugs.

## Fixed as part of this review

- [x] **`googleReviewsUrl` validation gap in `syncGoogleReviews`** — `backend/controllers/settingsController.js`. The `updateSettings` endpoint validates `googleReviewsUrl` against `javascript:`/`data:`/`vbscript:`/protocol-relative/non-https before persisting it (a fix from a prior pass), but the separate `syncGoogleReviews` endpoint (`POST /api/settings/sync-google-reviews`) wrote the same field to the DB straight from `req.body` with no validation at all — a way to plant a stored-XSS payload in a field that's already locked down everywhere else it's written. Added the identical check before the `updateData.googleReviewsUrl = cleaned` assignment. Not live-tested end-to-end (the endpoint also does a real Google-scrape network call before reaching this code path, which isn't practical to exercise in this environment) — verified by code inspection and syntax-check only; the added logic is a direct copy of the already-tested guard in `updateSettings`.

- [x] **Logout endpoints aren't behind auth middleware, so CSRF protection never applies to them** — `backend/routes/auth.js` (`/api/auth/logout`) and `backend/routes/customerAuth.js` (`/api/customer/logout`) were mounted without `authMiddleware`/`customerAuthMiddleware`, so `requireCsrfForCookieAuth` never ran on them. Added a manual `requireCsrfForCookieAuth(req, res, usedCookieAuth)` call at the top of both handlers (kept outside full auth middleware deliberately — an already-expired/invalid cookie must still be able to log out and clear itself). Live-tested both: a forged cross-site-style request (cookie auto-attached, no `X-CSRF-Token` header) now gets 403 and the session survives; the real frontend flow (cookie + CSRF header) still gets 200 and correctly invalidates the session (`/me`/`/profile` returns 401 afterward).

- [x] **`setPasscode` lets a section-unlock token holder change/remove the PIN without re-entering the current PIN** — `backend/controllers/settingsController.js` (`setPasscode`). Turned out to be worse than the original note suggested: the frontend (`Settings.jsx`) never even had a "current PIN" input field, so in real usage the unlock-token bypass was the *only* path ever taken — the `currentPasscode` branch was effectively dead code. Removed the unlock-token bypass entirely; the current PIN is now always required to change or remove it, even from an already-unlocked session (step-up auth: proves you know the PIN right now, not just that you unlocked recently). Added the missing "current PIN" field to the change-PIN form in `Settings.jsx`, and a `window.prompt` for it on the remove-PIN action. Live-tested all cases via the real cookie+CSRF flow: wrong current PIN → 403 and PIN unchanged; missing current PIN → 400; correct current PIN → 200 and the change/removal takes effect — including from a session that already held a valid (and, per the old code, previously-sufficient) unlock token.

## Open — worth doing, low priority

- [ ] **`secure` cookie flag is conditioned on `NODE_ENV === 'production'`** — `token`/`customer_token`/`csrf_token` cookies (wherever they're set — `authController.js`, `customerAuthController.js`, `csrf.js`). Correct for local dev, but if a staging/preview deployment is ever internet-reachable over plain HTTP without `NODE_ENV=production` set, the session cookie would ride unencrypted. Just a deployment-config reminder — verify any non-prod-but-public environment either sets `NODE_ENV=production` or terminates TLS with `secure` forced true regardless of env.

- [ ] **Image/logo URL fields only block dangerous *schemes*, not dangerous *hosts*** — `backend/controllers/productController.js` (`isValidImageUrl`) and `settingsController.js` (`logoUrl`). Any `http://`/`https://` URL is accepted, including ones pointing at internal/private hosts (e.g. `http://169.254.169.254/`, `http://localhost:5432`). This is only exploitable as real SSRF if the backend ever fetches these URLs itself (e.g. for thumbnailing/re-encoding) — neither agent found such a server-side fetch; today these URLs are only ever handed to the browser to render (`<img>`/`<link rel="icon">`), where an internal-host URL just fails to load, no server-side request happens. Low-priority; only matters if a server-side image-fetch feature is added later.

- [ ] **Admin-configured `logoUrl` still lets every visitor's browser request an arbitrary external host** — `frontend/src/context/StoreSettingsContext.jsx` (new dynamic-favicon effect) plus the pre-existing `<img src={logoUrl}>` usages. Scheme validation (`javascript:`/`data:`/`vbscript:`/protocol-relative all blocked, confirmed in `settingsController.js`) closes the code-execution angle, but a malicious/compromised admin session can still point the logo at an attacker-controlled `https://` host, which fires a request (with the visitor's IP/UA) from every single site visitor's browser — a minor tracking/beaconing vector and a trivial way to swap in a spoofed logo. This is expected behavior for an admin-controlled asset URL (same trade-off any CMS makes) — noting it here rather than proposing a fix, since locking it down further (e.g. an allowlist of image hosts) would be a real UX regression for a legitimate use case.

- [ ] **Scraped Google rating/review-count written to DB without range/type validation** — `backend/controllers/settingsController.js` (`syncGoogleReviews`). `scraped.rating`/`scraped.reviewCount` from `googleScraper.js`'s DOM-scraping go straight into the DB with no check that rating is a finite number in [0, 5] or that reviewCount is a non-negative integer. Not user-controlled directly, but if the scraper's DOM parsing is ever fooled by a Google page-layout change, garbage could reach the public `/api/settings` response. Cosmetic risk, not a security hole.

- [ ] **Customer login doesn't require `emailVerified`/`phoneVerified` before issuing a session** — `backend/controllers/customerAuthController.js` (login). An attacker who registers using someone else's email/phone (not yet proven to belong to them) can still log in and use the account before OTP verification completes. Likely an intentional grace-period design (register → browse while verifying) — worth explicitly confirming that unverified accounts can't place real orders or do anything sensitive before verification, since that's the actual risk surface, not the login itself.

## Reviewed, no issue found

- CSRF double-submit implementation (`backend/middleware/csrf.js`) — correct `httpOnly:false`/`sameSite:'lax'` on the CSRF cookie, strict server-side comparison, only enforced when auth came via cookie (header-based auth is naturally CSRF-immune). No bypass found.
- `admin-auth-expired` event-bus fix — no stale-session gap; `ProtectedRoute` reacts correctly to `setUser(null)`; no privileged endpoint is polled after a session is known dead. (One non-security note: an admin with unsaved form/modal state loses it on the redirect with no "session expired" messaging — a UX/data-loss nicety, not a security gap.)
- `ADMIN_BASE` path rename — cleanly done; no backend route/CORS/middleware decision depends on the old literal `/secret/admin` string; no stale reference in `frontend/public/sw.js` or elsewhere in the live app.
- `localStorage` usage — confirmed clean; only non-sensitive caches (`adminUser`/`customer_user`, name/email only) and unrelated UI prefs remain; no JWT or bearer-token value stored client-side anywhere.
- Order/customer IDOR spot-checks — `customerRespondToModification`, `getCustomerOrders` correctly scope to the authenticated customer; admin-only order/customer routes are correctly gated behind `authMiddleware` + section-unlock, not customer-reachable.
- Password reset flow — no user-enumeration, hashed random token at rest, 60-minute expiry, `tokenVersion` bump invalidates existing sessions on reset.
- Rate limiting — login, register, verify-email/phone, resend-otp, password reset, coupon validation, passcode verify, and 2FA all have dedicated limiters. No gap found among classic brute-force targets.
- Injection surface — no raw SQL (`$queryRaw`/`$executeRaw`), `eval`, `new Function`, or shell exec calls anywhere in `backend/`. No file-upload endpoints exist (image/logo fields are URL-only).
- Secrets/config hygiene — `.env.example` only has placeholders; `backend/lib/config.js` enforces `JWT_SECRET`/`SECTION_UNLOCK_SECRET` ≥32 chars, distinctness, and a strict hex `ENCRYPTION_KEY` format in production.
