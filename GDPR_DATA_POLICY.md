# GDPR Data Policy (internal)

Internal reference for how Hajar Supermarkt handles customer personal data under the GDPR/DSGVO. The public-facing summary and legal basis for each processing purpose is in [Datenschutz.jsx](frontend/src/pages/Datenschutz.jsx) (`/datenschutz`).

## What we store

| Data | Where | Encrypted at rest? |
|---|---|---|
| Name, email, phone, address | `Customer` table | Yes — email/phone/address fields (see [piiCrypto.js](backend/utils/piiCrypto.js)) |
| Order history, delivery address/notes, order-time name/phone/email snapshot | `Order` table | Yes — `customerName`/`customerPhone`/`customerEmail`/`deliveryAddress`/`deliveryNotes` (see note below) |
| Password | `Customer.password` | Hashed (bcrypt), not reversible |

**Note:** `Order.customerName/customerPhone/customerEmail/deliveryAddress/deliveryNotes`
are an encrypted snapshot taken at order time, kept separately from the
encrypted `Customer` record specifically so invoices remain readable even
after a customer's account is deleted (see Retention below). New orders are
encrypted on write (`orderController.js`) and decrypted on read
(`withDecryptedOrder()` in `orderController.js`/`accountingController.js`).
Older rows created before encryption was added are backfilled by
`backend/scripts/encryptOrderSnapshotPii.js`, which is safe to re-run.

## Retention periods

- **Customer account (name, email, phone, address, password):** kept until the customer requests deletion, or the account has been inactive and unverified for an extended period (no automatic purge job currently — deletion is manual/on-request only).
- **Orders / invoices:** retained indefinitely regardless of account deletion. Austrian tax law (§ 132 BAO) requires business records to be kept for **7 years**. This is why deleting a `Customer` does not delete their `Order` rows — the foreign key is set to null (`onDelete: SetNull` in `schema.prisma`), not cascaded.
- **OTP codes / reset tokens:** short-lived (15–60 minutes), cleared on use or expiry.

## How to fulfill a "delete my data" request

1. Customer emails the address shown on `/datenschutz` (or the admin directly) asking for deletion — this is the channel already documented in the public privacy policy (§6, "Recht auf Löschung").
2. Admin opens **Kunden** in the admin panel, finds the customer, and clicks **Entfernen** (or calls `DELETE /api/customer-auth/customers/:id`).
3. This deletes the `Customer` row (name, encrypted email/phone/address, password) entirely. Their past orders remain in the system (required for tax records) but are no longer linked to a live account — the order still shows the name/phone/email as they were at order time, per the retention note above.
4. There is currently no automatic confirmation email sent to the customer when this happens — consider adding one if this becomes a frequent request.

## Known gaps / follow-ups

- No self-service "delete my account" button in the customer-facing account page — deletion is admin-mediated only. Acceptable for GDPR compliance (a request channel exists) but adds friction; worth revisiting if request volume grows.
- No automatic retention-expiry job (e.g. auto-purging unverified accounts after N months of inactivity).
- `piiCrypto.js` only *requires* `ENCRYPTION_KEY` to be set when `NODE_ENV=production`; outside production a missing/misconfigured key silently falls back to storing PII as plaintext (now logged loudly as a warning at startup, but still worth double-checking `NODE_ENV`/`ENCRYPTION_KEY` are both set correctly on any real deployment).
