# TODO

## Customer data security — steps

1. [x] Hide the email address in the order view so the delivery person can't see it
2. [x] Mask phone/address on the Customers admin page by default (click to reveal)
3. [x] ~~Lock the customer info card on the dashboard behind the section PIN~~ — N/A, dashboard only shows a customer count, no PII
4. [x] Verify the PIN check is enforced server-side, not just hidden in the frontend — confirmed: `bcrypt.compare` runs in `verifyPasscode` (backend/controllers/settingsController.js), only a boolean is returned, hash never reaches the frontend. Caveat: the PIN gates the *page* only — the underlying APIs (customers, accounting, etc.) are protected by JWT auth alone, by design (documented as a deterrent, not a privilege boundary)
5. [x] Add a PIN lock in front of the audit log (once step 6 exists)
6. [x] Add an audit log for admin access to customer records (who viewed/exported, when)
7. [x] Encrypt sensitive customer fields at rest (phone, address, email)
8. [x] Confirm HTTPS is enforced everywhere in production + backend CORS locked to the real domain — code-level check passed (CORS locked to FRONTEND_URL in prod, HSTS on, no hardcoded http:// in prod paths). Live server TLS/nginx config not verifiable from here — check manually on the actual deployment
9. [x] Document a GDPR retention/deletion policy and a way to fulfill "delete my data" requests — see [GDPR_DATA_POLICY.md](GDPR_DATA_POLICY.md)

## Bug fixes (from live testing)
- [x] Print/report on customer account page showed raw encrypted ciphertext for name/phone — `GET /api/orders/my-orders` never decrypted the order snapshot fields; fixed
- [x] Admin status changes emailed the customer on every transition — now only emails on "accepted"; other changes surface via the in-app timeline and push
- [x] Cart drawer auto-opened on every "add to cart" — replaced with a small toast + cart badge count instead

## Other fixes
- [x] Phone number can't be edited/replaced on a customer record — verified fixed via live API test (register → change phone → persists correctly); likely resolved as a side effect of the encryption refactor rewriting this exact code path
- [x] Orders view should auto-refresh when a new order is submitted — polls every 20s while the page is open

## 2nd Version
- [ ] Add a ticket system for problems and bugs
- [x] Optional 2-factor authentication — admin login now requires a 6-digit code emailed on every login (password + email code), before issuing the session. Sessions last 30 days once verified ("stay logged in"). Live-tested full flow: password → email code → dashboard, wrong-code rejection, resend, single-use enforcement
- [ ] Recurring/subscription orders — "reorder my usual weekly basket" for regulars
- [ ] Low-stock alerts for admin — proactive restocking instead of noticing out-of-stock at checkout
- [ ] Loyalty/rewards points — repeat-customer incentive, pairs with the existing coupon system
- [x] Order tracking (in-app) — live progress timeline (Angenommen → Wird vorbereitet → Unterwegs → Geliefert) on the customer account page, updates automatically via 15s polling. Live-tested end-to-end: order created, admin changed status, timeline updated without a manual refresh
- [x] Order tracking (browser push notifications) — added `web-push` + VAPID keys, a `PushSubscription` table, a minimal service worker (`public/sw.js`), and an opt-in banner on the customer account page. Pushed on order creation, status changes, and modifications. Live-tested: VAPID key endpoint, service worker registration, subscription save, and the push-send code path (graceful error handling confirmed against a malformed test key)

## Security follow-ups (from security review)
1. [x] Run `npm audit` on backend and frontend — frontend: 0 vulnerabilities. Backend: 2 moderate (uuid buffer-bounds issue), transitively pinned deep inside firebase-admin's own dependency tree (`@google-cloud/storage` → `google-auth-library@9.15.1` → `gaxios@6.7.1`), not fixable even with `npm audit fix --force` since no firebase-admin release yet moves that pin. Not exploitable through this app's usage (we never call `uuid` directly, Firebase Admin doesn't expose the vulnerable path to user input) — revisit when firebase-admin ships an update
2. [x] Encrypt `Order.customerName/customerPhone/customerEmail` snapshot fields at rest (currently plaintext, unlike the `Customer` table equivalents) — migrated existing orders after a fresh pg_dump backup; live-tested reads (CSV export, accounting summary, orders list) and the write path (order creation reached deep business validation without error)
3. [ ] Verify live server enforces HTTPS (TLS termination + HTTP→HTTPS redirect in nginx) — not verifiable from this repo, needs manual check on the actual deployment
4. [x] Upgrade the section PIN into a real API boundary — `/passcode/verify` and `/passcode` (setup) now issue a short-lived (8h) signed unlock token, sent as `X-Section-Unlock` on every admin API call (frontend/src/utils/adminAxios.js), checked by `sectionUnlockMiddleware` on every Kunden/Buchhaltung/Aktionen/Settings route. Live-tested all three states: no PIN configured → open, PIN set + no token → 403, PIN set + valid token → 200; confirmed Orders/Products (never gated) still work with just the JWT
5. [ ] Consider a WAF/DDoS layer at the infra level (e.g. Cloudflare) — no protection currently visible in the app itself
6. [x] Enforce strong customer passwords (8+ chars, upper+lower+digit+special) on register, password reset and profile password change — added `isStrongPassword` in backend/utils/validation.js (source of truth) and frontend/src/utils/validation.js (matching client-side hint); live-tested weak password rejected (400), strong password accepted (201)
