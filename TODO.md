# TODO

## Customer data security
- [ ] Encrypt sensitive customer fields at rest (phone, address, email)
- [ ] Mask phone/address on the Customers admin page by default (click to reveal)
- [ ] Confirm HTTPS is enforced everywhere in production + backend CORS locked to the real domain
- [ ] Add an audit log for admin access to customer records (who viewed/exported, when)
- [ ] lock the audit log with a pin
- [ ] check if the pin isnt in the frontend and just in the backend the check
- [ ] Document a GDPR retention/deletion policy and a way to fulfill "delete my data" requests
- [ ] The phone Number cant be replaced 
- [ ] The Orders view should be refreshed if a new order is submitted
- [ ] Lock the customer Info in the dashboard
- [ ] hide the email adress in the order view so the delivery guy cant see it

## 2nd Version
- [ ] add a ticket system for problems and bugs
- [ ] optional 2 faktor verfication
