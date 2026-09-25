const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

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
  credentials: true
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


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;