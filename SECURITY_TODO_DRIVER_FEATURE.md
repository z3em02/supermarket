# Security review — driver login/assignment feature (2026-09-25)

Code-review pass (not fully live-tested this round — the dev backend was running
under the user's own terminal for most of this pass, which held a file lock that
blocked regenerating the Prisma client after a schema change; see the note at the
bottom) covering everything added for driver login approval, driver sessions, and
order-to-driver assignment: `settingsController.js` (driver login/poll/sessions),
`middleware/auth.js` (`driverOrAdminAuthMiddleware`), `orderController.js`
(`getOrders`/`getOrderById`/`updateOrderStatus`/`assignOrderDriver`),
`routes/settings.js`, `routes/orders.js`, `Dashboard.jsx`, `Orders.jsx`,
`DriverDeliveryView.jsx`.

## Fixed as part of this review

- [x] **Admin-facing pending-requests list exposed `pollToken`** — `listDriverLoginRequests` (`settingsController.js`) did a bare `findMany` with no `select`, returning every column including `pollToken` — the one value that, held by anyone, can complete that specific driver's login and mint them a session. Only the admin's own browser could see it (endpoint is `authMiddleware`-gated), so this wasn't directly exploitable by an outsider, but it's unnecessary exposure — an admin session compromised via XSS could now also silently approve-and-steal a driver session it didn't need to see. Added an explicit `select` returning only `id`, `driverName`, `ipAddress`, `createdAt`.
- [x] **No signal at all to help an admin catch impersonation at approval time** — see the open finding below for why this matters. Added `ipAddress` capture on `DriverLoginRequest` (new nullable column, `req.ip` — `trust proxy` was already configured for the existing rate limiter, so this is accurate behind a reverse proxy too) and display it in the Dashboard's pending-approval row, plus a one-line note under the section header explaining that the driver-entered name doesn't prove identity. This is a mitigation, not a fix — see below.

## Fixed — per-driver accounts (later session)

- [x] **Driver "identity" was just a free-text name the requester types, and the PIN was shared by every driver** — fixed by implementing recommendation (1) from below. Added a `Driver` model (`schema.prisma`): `name` (unique), `pinHash`, `active`. `driverLogin` (`settingsController.js`) now looks up the submitted name against this table and checks the PIN against *that driver's own* hash, instead of one shared `driverPasscodeHash` — an attacker who doesn't know a specific driver's individual PIN can no longer submit a login request under that driver's name at all, closing the impersonation path described below at its root (the approval-queue IP hint from the fix above is no longer the only defense). Unknown-name and wrong-PIN both return the same generic error, so a login attempt can't be used to enumerate registered driver names.

  `Order.assignedDriverName` deliberately stayed a plain string (not a `driverId` foreign key) — renaming a driver only affects future assignments, past orders keep the name assigned at the time, the same snapshot approach `Order.customerName` already uses elsewhere in this schema. `driverOrAdminAuthMiddleware` now also re-checks `Driver.active` on every request (not just at login), so deactivating a driver from Settings kills their current session immediately rather than just blocking their next login — verified live: revoking mid-session got the very next request a 401 despite a still-validly-signed JWT.

  Admin-facing management (Settings -> Fahrerkonten): create a driver (with an admin-supplied PIN or a randomly generated one shown once, never stored in plaintext), rename, activate/deactivate, reset PIN, delete (only once deactivated, as a cheap guard against deleting someone mid-shift). All gated behind `authMiddleware` + `sectionUnlockMiddleware`, same sensitivity class as the section PIN itself.

  Verified live end-to-end (unlike the note below for the IP-capture fix): create → login with correct/wrong/unknown credentials → admin approval → cookie session → immediate effect of deactivation → delete-guard → successful delete, plus a real-browser pass (Settings driver list + PIN-reveal banner, and the driver login form's now-required name field).

## Reviewed, no issue found

- CSRF: all mutating driver-session/login-request endpoints go through `authMiddleware`'s existing `requireCsrfForCookieAuth` check; the driver-facing endpoints (`driver/login`, `driver/login-poll/:pollToken`) are intentionally public/unauthenticated (a driver has no session yet) and aren't cookie-authenticated, so CSRF doesn't apply to them.
- Rate limiting: `driver/login` (10/15min) and `driver/login-poll` (150/5min, sized for a driver's own 3s poll interval) both have dedicated limiters; approve/reject/logout are admin-only and already behind full auth.
- XSS: `driverName` is rendered exclusively through JSX (`{reqItem.driverName}`, `{session.driverName}`, `<option>{name}</option>`, etc.) across `Dashboard.jsx`/`Orders.jsx`/`DriverDeliveryView.jsx` — no `dangerouslySetInnerHTML` anywhere in the new code, so React's default escaping applies. Confirmed via grep.
- IDOR on orders: `getOrderById`/`updateOrderStatus` both 404 a driver requesting an order that isn't `assignedDriverName === req.driver.name`, verified this session by direct API calls (driver token got 404 on both GET and PUT against another driver's order, 200 on their own).
- Session revocation: `driverOrAdminAuthMiddleware` checks the live `DriverSession` row (`revokedAt`, `expiresAt`) on every request rather than trusting the JWT signature alone, so an admin's force-logout actually takes effect before the 24h token would otherwise expire — verified this session (revoked session → next request 401, even though the JWT itself was still validly signed).
- `assignOrderDriver` (order-to-driver assignment) is admin-only (`authMiddleware`, not driver-reachable) — a driver can't reassign their own or anyone else's order.

## Note on this pass's testing

Live end-to-end testing (the two-tab / revoke-and-watch-redirect style verification
used earlier this session) wasn't repeated for the `ipAddress` capture and `select`
fixes above, because the backend dev server was running under a separate terminal
session for most of this review and holds a file lock that blocks `prisma generate`
after the schema change. The new `ipAddress` column was pushed to the database
successfully (`prisma db push` confirmed "database is now in sync"), but the
running backend process has the old Prisma Client loaded in memory and needs a
restart to actually read/write that column. **Restart the backend before relying
on the IP-address hint showing up in the Dashboard.**
