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

## Open — a real design-level gap, not a quick patch

- [ ] **Driver "identity" is just a free-text name the requester types, and the PIN is shared by every driver** — this is the core finding. There's no per-driver credential anywhere in the system: `driverLogin` (`settingsController.js`) accepts any `driverName` string alongside the one shared `driverPasscodeHash` PIN, and `driverOrAdminAuthMiddleware` later trusts whatever name was in that JWT (`req.driver.name = decoded.name`) for every subsequent authorization decision — specifically the new `assignedDriverName === req.driver.name` checks in `getOrders`/`getOrderById`/`updateOrderStatus` that are supposed to keep one driver from seeing another's deliveries.

  **Concrete attack**: anyone who knows the shared driver PIN (by design, every driver has it — it's not unique per person) can submit a login request with `driverName` set to match the name already used as `assignedDriverName` on some other driver's orders (a name they could learn by working alongside that driver, overhearing it, or just guessing a common one). If the admin approves that request — and nothing about the approval screen before this fix gave them any way to tell it apart from a legitimate request by the real "Ahmed" — the attacker's session now passes every `assignedDriverName === req.driver.name` check for that name, and can see and update every order assigned to the real Ahmed: customer address, phone, delivery notes, and the ability to mark orders delivered.

  **Why I didn't fix this outright**: the real fix is per-driver individual credentials (e.g., a unique PIN per driver name, or requiring the driver's phone number and verifying it, similar to the customer OTP flow) — a genuine feature decision about how much friction driver onboarding should have, not something to silently bolt on. The IP-address hint above raises the bar for a casual attempt but doesn't close it (spoofable, and legitimate drivers roam).

  **What I'd recommend, in order of effort**: (1) cheapest — a per-driver individual PIN instead of one shared PIN, checked against a name the admin pre-registers rather than one the driver types freely at login, so "the name" and "the credential" are the same secret instead of independent; (2) more robust — phone-number-based driver accounts reusing the existing customer OTP infrastructure. Flagging for a decision rather than picking one myself.

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
