const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { anyAuthMiddleware } = require('../middleware/anyAuth');
const { couponLimiter } = require('../middleware/rateLimiter');
const {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
} = require('../controllers/couponController');

const router = express.Router();

// Customer/Public: validate coupon code against cart (rate-limited)
router.post('/validate', couponLimiter, anyAuthMiddleware, validateCoupon);

// Admin routes
router.get('/', authMiddleware, getCoupons);
router.post('/', authMiddleware, createCoupon);
router.put('/:id', authMiddleware, updateCoupon);
router.delete('/:id', authMiddleware, deleteCoupon);

module.exports = router;
