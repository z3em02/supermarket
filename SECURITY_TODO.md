# Security & Bug Audit — Open Items

> All 59 completed and verified security audit remediations have been moved to [COMPLETED_TODOS.md](COMPLETED_TODOS.md).

---

## 📋 Open Manual & Deployment Actions

The remaining open security items require manual actions in external cloud consoles or on the production hosting server (see [DEPLOYMENT_SECURITY.md](DEPLOYMENT_SECURITY.md) for full setup guides):

- [ ] **#3** — Rotate Firebase Web API key (`frontend/.env`); add Firebase App Check or authorized domain restrictions to prevent SMS flooding / quota exhaustion *(Action in Firebase & Google Cloud Console — see Section 1.B of DEPLOYMENT_SECURITY.md)*
- [ ] **#19** — Fix `FRONTEND_URL` in `backend/.env` to the real production domain, not `localhost:5173` *(Production environment variable — see Section 3 of DEPLOYMENT_SECURITY.md)*
- [ ] **#20** — Enforce HTTPS: configure Nginx with HTTP→HTTPS redirect, security headers, and TLS termination *(Nginx server configuration — see Section 2 of DEPLOYMENT_SECURITY.md)*
