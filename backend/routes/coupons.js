const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { anyAuthMiddleware } = require('../middleware/anyAuth');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');
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

// Admin routes (Aktionen & Gutscheine — behind the section PIN)
router.get('/', authMiddleware, sectionUnlockMiddleware, getCoupons);
router.post('/', authMiddleware, sectionUnlockMiddleware, createCoupon);
router.put('/:id', authMiddleware, sectionUnlockMiddleware, updateCoupon);
router.delete('/:id', authMiddleware, sectionUnlockMiddleware, deleteCoupon);

module.exports = router;
