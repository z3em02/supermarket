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
