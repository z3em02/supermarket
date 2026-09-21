const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { 
  getSettings, 
  updateSettings,
  getGoogleReviews,
  createGoogleReview,
  deleteGoogleReview,
  syncGoogleReviews
} = require('../controllers/settingsController');

const router = express.Router();

// Store Settings
router.get('/', getSettings);
router.put('/', authMiddleware, updateSettings);

// Google Reviews
router.get('/reviews', getGoogleReviews);
router.post('/reviews', authMiddleware, createGoogleReview);
router.delete('/reviews/:id', authMiddleware, deleteGoogleReview);
router.post('/sync-google-reviews', authMiddleware, syncGoogleReviews);

module.exports = router;
