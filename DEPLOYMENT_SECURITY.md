# Deployment & Security Configuration Guide

This guide documents infrastructure-level security requirements and console actions to finalize production security.

---

## 1. Firebase Console Actions (Required Manual Steps)

### A. Rotate Service Account Key (Audit Finding #2)
1. Go to the [Firebase Console](https://console.firebase.google.com/) -> **Project Settings** -> **Service accounts**.
2. Under **Firebase Admin SDK**, click **Generate new private key**.
3. Download the JSON key file and place it on your production server at `backend/firebase-service-account.json`.
4. Delete the old key in the Firebase Console so the compromised key is deactivated.
5. Ensure `backend/firebase-service-account.json` remains gitignored (confirmed in `.gitignore`).

### B. Restrict and Rotate Firebase Web API Key (Audit Finding #3)
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials) for project `supermarket-c2377`.
2. Locate the **Browser key (auto created by Firebase)** matching `AIzaSyCJ6AeDV8Sb6vKEdM3zlfntCgoJZP-VqVQ`.
3. Under **Application restrictions**, select **Websites** and add your production domain:
   - `https://yourdomain.com/*`
   - `https://*.yourdomain.com/*`
4. Under **API restrictions**, restrict the key to only:
   - *Identity Toolkit API*
   - *Token Service API*
5. Enable **Firebase App Check** (reCAPTCHA Enterprise or v3) for Phone Auth to prevent automated SMS abuse and quota exhaustion.

---

## 2. Nginx Production Configuration (Audit Findings #19, #20, #21)

Place the following configuration in `/etc/nginx/sites-available/supermarket` on your Linux server:

```nginx
# 1. HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

# 2. HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (e.g. Let's Encrypt Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend Static Files
    root /var/www/supermarket/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        # Crucial for Express 'trust proxy 1' (Rate limiting and IP detection)
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 5M;
    }
}
```

---

## 3. Production Environment Variables (`backend/.env`)

When deploying to production, set:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
TRUST_PROXY=true
DATABASE_URL=postgresql://user:password@localhost:5432/supermarket
JWT_SECRET=<64-char-random-hex>
SECTION_UNLOCK_SECRET=<64-char-random-hex-different-from-jwt>
ENCRYPTION_KEY=<64-char-random-hex>
```

---

## 4. Multi-Instance Rate Limiting (Redis) (Audit Finding #9)

If you scale the backend across multiple Node processes or multiple servers behind a load balancer, install `ioredis` and `rate-limiter-flexible` and configure `REDIS_URL=redis://localhost:6379`. For a single Node process or PM2 cluster with sticky sessions, the built-in sliding window rate limiter is already fully functional.
