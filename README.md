# Hajar Supermarkt

An online supermarket for private (B2C) customers in Austria, with home
delivery and cash/card-on-delivery payment. Bilingual German/Arabic storefront,
customer accounts with email/phone OTP verification, and an admin back office
for products, orders, customers, accounting and store settings.

## Tech stack

- **Backend**: Node.js, Express 5, Prisma ORM on PostgreSQL, JWT auth, Nodemailer
- **Frontend**: React 19, Vite, Tailwind CSS, React Router 7
- **Deployment**: nginx (reverse proxy + static hosting) + PM2 (process manager, cluster mode)

## Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database (local install, or a managed provider like Neon/Supabase/RDS)
- An SMTP account for sending emails (e.g. a Gmail account with a
  [App Password](https://myaccount.google.com/apppasswords) — requires
  2-Step Verification to be enabled)

## Environment variables

Copy the example files and fill in real values. **Never commit your `.env` files.**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`**

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` or `production`. In production, dev-only helpers (on-screen OTP codes, verbose OTP logging) are disabled. |
| `PORT` | Port the Express server listens on (default `5000`). |
| `DATABASE_URL` | PostgreSQL connection string. |
| `JWT_SECRET` | Random secret, **at least 32 characters** (`openssl rand -base64 48`). The server refuses to start without one. |
| `FRONTEND_URL` | Public URL of the deployed frontend. Used for CORS and for links inside emails (order status, password reset) — must be the real domain in production, not `localhost`. |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_FROM` | SMTP credentials for transactional email (OTPs, order confirmations/status updates, password reset). If left as placeholder values, emails are skipped and logged to the console instead of failing the request. |

**`frontend/.env`**

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend base URL. Leave **empty** when nginx proxies `/api` on the same domain as the frontend (the standard deployment in this repo). Only set it to an absolute URL if the backend is hosted on a separate subdomain. |

## Local setup

```bash
# Backend
cd backend
npm install
npx prisma db push      # sync the database schema (this project doesn't use `prisma migrate`)
npm run prisma:seed     # optional: creates a default admin + sample categories/products
npm run dev              # starts the API on http://localhost:5000

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev               # starts Vite on http://localhost:5173
```

Or use the bundled convenience scripts from the repo root (`start.sh` / `start.bat`)
to launch both at once.

The seed script creates a default admin login: **admin@hajar.com / admin**.
**Change this password immediately** if you run the seed against anything
other than a throwaway local database — admin login is at `/secret/admin/login`.

### Schema changes

This project syncs its schema with `npx prisma db push` rather than
`prisma migrate`. After editing `backend/prisma/schema.prisma`, run:

```bash
cd backend
npx prisma db push
```

## Building for production

```bash
cd frontend
npm run build   # outputs static files to frontend/dist
```

The backend needs no build step — it runs directly with Node.

## Deployment (nginx + PM2)

1. On the server, clone the repo, install dependencies in `backend/` and
   `frontend/`, set up `backend/.env` for production (see table above —
   double-check `FRONTEND_URL` and `JWT_SECRET`), and run `npx prisma db push`
   against the production database.
2. Build the frontend: `cd frontend && npm run build`.
3. Start the backend with PM2 using the provided config:
   ```bash
   cd backend
   pm2 start ../deployment/ecosystem.config.js
   pm2 save
   ```
   This runs the API in cluster mode (`instances: 'max'`) on port 5000.
4. Copy `deployment/nginx.conf` to `/etc/nginx/sites-available/supermarket.conf`,
   symlink it into `sites-enabled`, update `server_name` and the SSL certificate
   paths for your domain, then reload nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/supermarket.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
   nginx serves the built frontend from `frontend/dist`, proxies `/api/*` to
   the backend on port 5000, and applies rate limiting to the
   login/register/verification endpoints.
5. Point DNS at the server and obtain a TLS certificate (e.g. via Certbot) for
   the paths referenced in `nginx.conf`.

## Project structure

```
backend/       Express API, Prisma schema, controllers, routes, email templates
frontend/      React storefront + admin dashboard (Vite)
deployment/    nginx.conf and PM2 ecosystem.config.js for production
```
