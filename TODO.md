# TODO

## Customer data security — steps

1. [x] Hide the email address in the order view so the delivery person can't see it
2. [ ] the cusomter could pick prefared language so the system will communicate with him with the selected language even the notification
3. [ ] change the tab Image 

## 2nd Version
- [ ] Add a ticket system for problems and bugs
- [ ] Recurring/subscription orders — "reorder my usual weekly basket" for regulars
- [ ] Low-stock alerts for admin — proactive restocking instead of noticing out-of-stock at checkout
- [ ] Loyalty/rewards points — repeat-customer incentive, pairs with the existing coupon system


## Security follow-ups (from security review)
- [ ] Verify live server enforces HTTPS (TLS termination + HTTP→HTTPS redirect in nginx) — not verifiable from this repo, needs manual check on the actual deployment

- [ ] Consider a WAF/DDoS layer at the infra level (e.g. Cloudflare) — no protection currently visible in the app itself

## Review of uncommitted security-hardening changes (3-agent audit, 2026-09-24)

### Security
1. [ ] NOT DONE — HttpOnly cookie fix still doesn't close the XSS vector it claims to; JWT is still duplicated into `localStorage` everywhere (~30 frontend call sites). A full migration to cookie-only auth is a large, high-regression-risk rewrite across the whole frontend (every axios call needs `withCredentials: true`, every context needs re-testing) — too risky to do blindly in one pass without dedicated QA time, so I deliberately did not attempt it. What I DID do instead: added CSRF protection (#4) so the cookie channel is now safe to rely on *if/when* that migration happens — it wasn't safe before. Until the migration happens, treat the cookie as defense-in-depth only, not the primary defense; the real fix is still open
2. [x] `customerAuthMiddleware` (customerAuth.js:21) was fail-open on missing `tokenVersion` — now fail-closed like authMiddleware. Live-tested: registered a customer, confirmed their token worked (200), called the new logout endpoint, confirmed the exact same token was then rejected (401 "Session invalidated")
3. [x] SSRF IP-range filter in googleScraper.js had IPv6 gaps — now does real CIDR math (bitmask against the expanded 8-group address) instead of literal prefix matching, and decomposes IPv4-mapped/compatible IPv6 literals (dotted and hex form, bracketed or not) to re-check them against the private-IPv4 ranges too. Unit-tested 17 cases incl. every bypass the audit named (`fc01::`, `fe90::`, `::ffff:169.254.169.254`, `::ffff:a9fe:a9fe`, bracketed form) — all correctly blocked — plus real public addresses/domains confirmed NOT over-blocked
4. [x] No CSRF token anywhere — added a double-submit-cookie CSRF token (new `middleware/csrf.js`), issued alongside every session cookie, checked only on mutating requests whose auth came from the cookie (not the existing Bearer-header flow, which is already CSRF-immune and untouched). Live-tested all 4 cases: cookie-only without the header → 403; cookie-only with the correct header → passes through to the route; cookie-only with a wrong/guessed header → 403; normal Bearer-header app traffic → unaffected (200/404 as expected, no CSRF friction)
5. [x] Customer login/register cookie missing `path: '/'` — added to both register and login cookie-set calls, now consistent with the post-password-change one

### Bugs (financial-integrity — editOrder)
6. [x] `editOrder` doesn't re-validate the coupon's `minOrderValue` after items change — now re-checks active/date-range/minOrderValue against the recalculated subtotal via a shared `calculateCouponDiscountAmount` helper (extracted from pricingService.js so createOrder and editOrder never drift); also recalculates per-item promotions instead of clamping a stale aggregate. Live-tested: order with a promoted item + coupon, edited down to remove the promo item and drop below the coupon's minimum — both discounts correctly zeroed
7. [x] `editOrder` never recalculates delivery fee — now redoes the free-delivery-threshold comparison against the new subtotal, preserving the stored distance-based fee components (no re-geocoding needed). Live-tested: fee correctly preserved when the edit doesn't cross the threshold
8. [x] `editOrder` doesn't enforce store `minOrderValue` — now rejects the edit with a clear error if the new subtotal falls below it (admin must cancel/decline instead). Live-tested: an edit that dropped the subtotal below the store minimum was correctly rejected with a 400
9. [x] Double-submit race on order decline/cancel — both `updateOrderStatus` and `customerRespondToModification`'s decline path now guard the status transition with a `updateMany({where:{id, status: <observed status>}})` + count check inside the transaction, aborting with a 409 if a concurrent request already moved the order. Live-tested by firing two truly concurrent decline requests at the same order via `Promise.all` — one got 409, the other succeeded, and stock was restored exactly once (confirmed back to the exact pre-order value, not double-refunded)
10. [x] Protocol-relative URL (`//evil.com/x.jpg`) bypassed `isValidImageUrl` in productController.js — now rejected before the local-path allowance, matching settingsController.js. Live-tested: POST with `imageUrl: '//evil.example.com/x.jpg'` correctly rejected with 400

### Functionality
11. [x] Frontend logout now calls the new backend `/logout` routes (admin + customer) — best-effort, fires after local state is already cleared so it never blocks the UI. Live-tested via the customer flow (see #2)
12. [x] Geocoding outages now hard-block checkout for any store with a configured delivery-distance cap — added one 400ms-backoff retry on Nominatim (the secondary geocoder, and the one actually subject to rate limiting) before falling through to the existing local postal-code-centroid fallback and, only if that also fails, the reject. Doesn't touch the fail-closed behavior for genuinely unresolvable addresses, just gives a transient blip a second chance first
13. [x] `deleteOrder` route was commented out entirely rather than registered-and-guarded — re-registered; the controller unconditionally returns 403 + audit log, never actually deletes, so this is a pure improvement. Live-tested: DELETE now returns 403 with the retention-policy message instead of a bare 404
14. [ ] Everyone gets force-logged-out on deploy (every pre-migration session lacks `tokenVersion`) — not a bug, but flag this to whoever deploys so it isn't mistaken for one
