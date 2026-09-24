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
1. [ ] HttpOnly cookie fix doesn't close the XSS vector it claims to — JWT still duplicated into `localStorage` everywhere (adminAxios.js, Orders.jsx, Settings.jsx, ~30 call sites); stop storing the token in localStorage once cookie auth is confirmed working, or the cookie adds no real protection
2. [x] `customerAuthMiddleware` (customerAuth.js:21) was fail-open on missing `tokenVersion` — now fail-closed like authMiddleware. Live-tested: registered a customer, confirmed their token worked (200), called the new logout endpoint, confirmed the exact same token was then rejected (401 "Session invalidated")
3. [ ] SSRF IP-range filter in googleScraper.js has IPv6 gaps — `fc00::/7`/`fe80::/10` only match literal prefixes not the full CIDR range, and IPv4-mapped IPv6 literals (`::ffff:169.254.169.254`) aren't decomposed/blocked at all
4. [ ] No CSRF token anywhere — cookie auth relies solely on `SameSite=Lax`; add a CSRF token if cookie auth is kept as a real auth channel
5. [x] Customer login/register cookie missing `path: '/'` — added to both register and login cookie-set calls, now consistent with the post-password-change one

### Bugs (financial-integrity — editOrder)
6. [x] `editOrder` doesn't re-validate the coupon's `minOrderValue` after items change — now re-checks active/date-range/minOrderValue against the recalculated subtotal via a shared `calculateCouponDiscountAmount` helper (extracted from pricingService.js so createOrder and editOrder never drift); also recalculates per-item promotions instead of clamping a stale aggregate. Live-tested: order with a promoted item + coupon, edited down to remove the promo item and drop below the coupon's minimum — both discounts correctly zeroed
7. [x] `editOrder` never recalculates delivery fee — now redoes the free-delivery-threshold comparison against the new subtotal, preserving the stored distance-based fee components (no re-geocoding needed). Live-tested: fee correctly preserved when the edit doesn't cross the threshold
8. [x] `editOrder` doesn't enforce store `minOrderValue` — now rejects the edit with a clear error if the new subtotal falls below it (admin must cancel/decline instead). Live-tested: an edit that dropped the subtotal below the store minimum was correctly rejected with a 400
9. [ ] Double-submit race on order decline/cancel — stock restore and coupon-usage rollback aren't guarded by a status-matching WHERE inside the transaction; a double-click/retry can double-refund stock and coupon usage
10. [x] Protocol-relative URL (`//evil.com/x.jpg`) bypassed `isValidImageUrl` in productController.js — now rejected before the local-path allowance, matching settingsController.js. Live-tested: POST with `imageUrl: '//evil.example.com/x.jpg'` correctly rejected with 400

### Functionality
11. [x] Frontend logout now calls the new backend `/logout` routes (admin + customer) — best-effort, fires after local state is already cleared so it never blocks the UI. Live-tested via the customer flow (see #2)
12. [ ] Geocoding outages now hard-block checkout for any store with a configured delivery-distance cap, where it used to fail open with an approximate fee — consider a retry or a softer fallback before fully rejecting
13. [x] `deleteOrder` route was commented out entirely rather than registered-and-guarded — re-registered; the controller unconditionally returns 403 + audit log, never actually deletes, so this is a pure improvement. Live-tested: DELETE now returns 403 with the retention-policy message instead of a bare 404
14. [ ] Everyone gets force-logged-out on deploy (every pre-migration session lacks `tokenVersion`) — not a bug, but flag this to whoever deploys so it isn't mistaken for one
