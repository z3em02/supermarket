const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');
const {
  getPromotions,
  getActivePromotions,
  createPromotion,
  updatePromotion,
  deletePromotion
} = require('../controllers/promotionController');

const router = express.Router();

// Public: get active promotions for catalog and product displays
router.get('/active', getActivePromotions);

// Admin routes (Aktionen — behind the section PIN)
router.get('/', authMiddleware, sectionUnlockMiddleware, getPromotions);
router.post('/', authMiddleware, sectionUnlockMiddleware, createPromotion);
router.put('/:id', authMiddleware, sectionUnlockMiddleware, updatePromotion);
router.delete('/:id', authMiddleware, sectionUnlockMiddleware, deletePromotion);

module.exports = router;
