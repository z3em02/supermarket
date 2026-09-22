const express = require('express');
const { authMiddleware } = require('../middleware/auth');
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

// Admin routes
router.get('/', authMiddleware, getPromotions);
router.post('/', authMiddleware, createPromotion);
router.put('/:id', authMiddleware, updatePromotion);
router.delete('/:id', authMiddleware, deletePromotion);

module.exports = router;
