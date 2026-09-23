const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const prisma = require('./lib/prisma');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const accountingRoutes = require('./routes/accounting');
const customerAuthRoutes = require('./routes/customerAuth');
const settingsRoutes = require('./routes/settings');
const couponRoutes = require('./routes/coupons');
const promotionRoutes = require('./routes/promotions');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin === process.env.FRONTEND_URL) return callback(null, true);
    // Outside production, allow any localhost port — Vite picks a different
    // one (5174, 5175, ...) whenever 5173 is already taken by another running
    // dev server, so a fixed port list breaks as soon as two are running.
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for nginx
app.set('trust proxy', 1);

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
app.use('/api/settings', settingsRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/promotions', promotionRoutes);


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