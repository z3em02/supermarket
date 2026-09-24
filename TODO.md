# TODO

## Customer data security — steps

1. [x] Hide the email address in the order view so the delivery person can't see it
2. [x] Mask phone/address on the Customers admin page by default (click to reveal)
3. [x] ~~Lock the customer info card on the dashboard behind the section PIN~~ — N/A, dashboard only shows a customer count, no PII
4. [x] Verify the PIN check is enforced server-side, not just hidden in the frontend — confirmed: `bcrypt.compare` runs in `verifyPasscode` (backend/controllers/settingsController.js), only a boolean is returned, hash never reaches the frontend. Caveat: the PIN gates the *page* only — the underlying APIs (customers, accounting, etc.) are protected by JWT auth alone, by design (documented as a deterrent, not a privilege boundary)
5. [x] Add a PIN lock in front of the audit log (once step 6 exists)
6. [x] Add an audit log for admin access to customer records (who viewed/exported, when)
7. [x] Encrypt sensitive customer fields at rest (phone, address, email)
8. [ ] Confirm HTTPS is enforced everywhere in production + backend CORS locked to the real domain
9. [ ] Document a GDPR retention/deletion policy and a way to fulfill "delete my data" requests

## Other fixes
- [ ] Phone number can't be edited/replaced on a customer record — fix
- [ ] Orders view should auto-refresh when a new order is submitted

## 2nd Version
- [ ] Add a ticket system for problems and bugs
- [ ] Optional 2-factor authentication
