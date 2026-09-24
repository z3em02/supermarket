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

## Other fixes
- [x] Phone number can't be edited/replaced on a customer record — verified fixed via live API test (register → change phone → persists correctly); likely resolved as a side effect of the encryption refactor rewriting this exact code path
- [x] Orders view should auto-refresh when a new order is submitted — polls every 20s while the page is open

## 2nd Version
- [ ] Add a ticket system for problems and bugs
- [ ] Optional 2-factor authentication
