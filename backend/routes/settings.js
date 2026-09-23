const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');
const {
  getSettings,
  updateSettings,
  getGoogleReviews,
  createGoogleReview,
  deleteGoogleReview,
  syncGoogleReviews,
  getPasscodeStatus,
  setPasscode,
  verifyPasscode
} = require('../controllers/settingsController');

const router = express.Router();

// Guards brute-forcing the 4-8 digit section passcode.
const passcodeVerifyLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Zu viele Versuche. Bitte warten Sie 10 Minuten / Too many attempts. Please try again after 10 minutes.'
});

// Store Settings
router.get('/', getSettings);
router.put('/', authMiddleware, updateSettings);

// Section passcode (Settings/Accounting/Customers/Promotions gate)
router.get('/passcode-status', authMiddleware, getPasscodeStatus);
router.put('/passcode', authMiddleware, setPasscode);
router.post('/passcode/verify', authMiddleware, passcodeVerifyLimiter, verifyPasscode);

// Google Reviews
router.get('/reviews', getGoogleReviews);
router.post('/reviews', authMiddleware, createGoogleReview);
router.delete('/reviews/:id', authMiddleware, deleteGoogleReview);
router.post('/sync-google-reviews', authMiddleware, syncGoogleReviews);

module.exports = router;
