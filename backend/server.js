// .env first, then error tracking before express: Sentry (when SENTRY_DSN is
// set) has to instrument Node's http module before anything loads it.
// quiet: dotenv prints "injected env" via console.error, which would land in
// the error log (and in error tracking) on every start.
require('dotenv').config({ quiet: true });
const errorTracking = require('./lib/errorTracking');

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const prisma = require('./lib/prisma');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const accountingRoutes = require('./routes/accounting');
const customerAuthRoutes = require('./routes/customerAuth');
const pushRoutes = require('./routes/push');
const settingsRoutes = require('./routes/settings');
const auditLogRoutes = require('./routes/auditLog');
const couponRoutes = require('./routes/coupons');
const promotionRoutes = require('./routes/promotions');
const deliveryWindowRoutes = require('./routes/deliveryWindows');
const deliveryDistanceRoutes = require('./routes/deliveryDistance');

const app = express();
const PORT = process.env.PORT || 5000;

// Every response carries an X-Request-Id. Server errors (5xx) and slow
// requests are logged with it, so a report ("it failed at 14:02") can be
// matched to a log line. Only method + path: bodies and query strings can
// hold personal data (search terms, addresses).
const SLOW_REQUEST_MS = 2000;
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  errorTracking.setRequestId(req.id);
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
    if (res.statusCode >= 500 || ms >= SLOW_REQUEST_MS) {
      console.warn(`[request] ${req.id} ${req.method} ${req.path} -> ${res.statusCode} in ${ms} ms`);
    }
    // While shutting down (see shutdown below), close the connection as soon
    // as its request is done instead of waiting for the client to close it.
    if (shuttingDown) setImmediate(() => server.closeIdleConnections());
  });
  next();
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(u => u.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Outside production, allow any localhost port (Vite dynamic ports)
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  // X-Server-Time: the Orders page's polling cursor (see getOrders).
  // X-Request-Id: lets the frontend show an id to quote in an error report.
  exposedHeaders: ['X-Server-Time', 'X-Request-Id']
}));

const cookieParser = require('cookie-parser');

// #28 fix: enforce explicit request body size limits to prevent parser memory exhaustion
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
// #38 fix: enable cookie parsing for HttpOnly JWT support
app.use(cookieParser());

// #21: Trust proxy (e.g. nginx in front). Can be disabled with TRUST_PROXY=false
if (process.env.TRUST_PROXY !== 'false') {
  app.set('trust proxy', 1);
}

// Serve uploaded/cached images (e.g. locally cached logos) with hardened headers
const uploadsDir = path.join(__dirname, 'uploads');
const staticUploadsConfig = {
  maxAge: '7d',
  immutable: true,
  dotfiles: 'ignore',
  index: false,
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
};
app.use('/uploads', express.static(uploadsDir, staticUploadsConfig));
app.use('/api/uploads', express.static(uploadsDir, staticUploadsConfig));

const { apiLimiter } = require('./middleware/rateLimiter');

// Global API rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/customer', customerAuthRoutes);
app.use('/api/customer-auth', customerAuthRoutes);
app.use('/api/customers', customerAuthRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/delivery-windows', deliveryWindowRoutes);
app.use('/api/delivery-distance', deliveryDistanceRoutes);


// Health check for uptime monitors: 200 only when the database answers too,
// 503 when it doesn't. /api/health is the one reachable through nginx (which
// proxies only /api/ and /uploads/); /health is for checks on the server itself.
const HEALTH_DB_TIMEOUT_MS = 2000;
const healthCheck = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  let timer;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer within ${HEALTH_DB_TIMEOUT_MS} ms`)), HEALTH_DB_TIMEOUT_MS);
      })
    ]);
    res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(`Health check: database not reachable (${String(err?.message || err).split('\n').pop().trim()})`);
    res.status(503).json({ status: 'error', database: 'down', timestamp: new Date().toISOString() });
  } finally {
    clearTimeout(timer);
  }
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Client errors raised before any route runs — malformed JSON, a body over
  // the 100kb limit, an unsupported charset — come from body-parser with a
  // 4xx status and expose=true; answer with that status, not a 500.
  const status = err.status || err.statusCode;
  if (err.expose && status >= 400 && status < 500) {
    return res.status(status).json({ error: status === 413 ? 'Request body too large' : 'Invalid request body' });
  }
  // The Error itself, not err.stack: console prints its stack either way, and
  // error tracking needs the object to report it as an exception.
  console.error(`Unhandled server error [${req.id}] ${req.method} ${req.path}:`, err);
  res.status(500).json({ error: 'Internal server error', requestId: req.id });
});

// Start server. In production HOST=127.0.0.1 (deployment/ecosystem.config.js)
// keeps the API reachable only through nginx: with trust proxy on, a backend
// port reachable from outside would believe a client-supplied
// X-Forwarded-For and let every request pick a fresh rate-limit identity.
const HOST = process.env.HOST;
const onListening = () => {
  console.log(`Server running on ${HOST || 'all interfaces'}, port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
};
const server = HOST ? app.listen(PORT, HOST, onListening) : app.listen(PORT, onListening);

// Graceful shutdown. PM2 sends SIGINT when it reloads or stops a worker
// (systemd/Docker send SIGTERM): stop taking new connections, let requests
// already running finish, then close the database pool. Without this, every
// deploy cut off whatever was in flight, e.g. an order being placed. PM2's
// kill_timeout (deployment/ecosystem.config.js) is longer than this timeout.
const SHUTDOWN_TIMEOUT_MS = 8000;
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received: closing HTTP server, letting open requests finish`);
  setTimeout(() => {
    console.warn(`Requests still open after ${SHUTDOWN_TIMEOUT_MS} ms; exiting anyway`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    await errorTracking.flush();
    console.log('HTTP server closed');
    process.exit(0);
  });
  // Idle keep-alive connections would otherwise hold close() open.
  server.closeIdleConnections();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;