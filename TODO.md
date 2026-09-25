# TODO

> For the full log of completed and verified items, see [COMPLETED_TODOS.md](COMPLETED_TODOS.md).

## Customer & UI Features
- [ ] The customer could pick preferred language so the system will communicate with them in the selected language (including notifications)

## 2nd Version
- [ ] Add a ticket system for problems and bugs
- [ ] Recurring/subscription orders — "reorder my usual weekly basket" for regulars
- [ ] Low-stock alerts for admin — proactive restocking instead of noticing out-of-stock at checkout
- [ ] Loyalty/rewards points — repeat-customer incentive, pairs with the existing coupon system

## Deployment & Infrastructure Follow-Ups
- [ ] Verify live server enforces HTTPS (TLS termination + HTTP→HTTPS redirect in nginx) — not verifiable from this repo, needs manual check on the actual deployment (see `DEPLOYMENT_SECURITY.md`)
- [ ] Consider a WAF/DDoS layer at the infra level (e.g. Cloudflare) — no protection currently visible in the app itself
- [ ] Everyone gets force-logged-out on deploy (every pre-migration session lacks `tokenVersion`) — not a bug, but flag this to whoever deploys so it isn't mistaken for one
