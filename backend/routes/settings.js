const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');
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
  verifyPasscode,
  listDrivers,
  createDriver,
  updateDriver,
  resetDriverPin,
  deleteDriver,
  driverLogin,
  pollDriverLoginRequest,
  driverLogout,
  listDriverLoginRequests,
  approveDriverLoginRequest,
  rejectDriverLoginRequest,
  listActiveDriverSessions,
  logoutDriverSession
} = require('../controllers/settingsController');

const router = express.Router();

// Guards brute-forcing PIN-setting endpoints in general (section passcode,
// resetting a driver's PIN). Own prefix so this doesn't share a Redis
// bucket with unrelated limiters that default to the same 'rl' prefix
// (2FA verify, driver login, delivery-distance lookups) — without it,
// heavy traffic on one of those could silently exhaust another's budget.
const passcodeVerifyLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  prefix: 'rl:pin-manage',
  message: 'Zu viele Versuche. Bitte warten Sie 10 Minuten / Too many attempts. Please try again after 10 minutes.'
});

const driverLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'rl:driver-login',
  message: 'Zu viele Login-Versuche. Bitte warten Sie 15 Minuten / Too many login attempts. Please try again after 15 minutes.'
});

// Driver's browser polls this every few seconds while waiting for admin
// approval — generous enough for that, not for anything else.
const driverPollLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 150,
  prefix: 'rl:driver-poll',
  message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.'
});

// Store Settings (Settings page — behind the section PIN; the passcode
// routes themselves stay outside the gate, since they're how it gets unlocked)
router.get('/', getSettings);
router.put('/', authMiddleware, sectionUnlockMiddleware, updateSettings);

// Section passcode (Settings/Accounting/Customers/Promotions gate)
router.get('/passcode-status', authMiddleware, getPasscodeStatus);
router.put('/passcode', authMiddleware, passcodeVerifyLimiter, setPasscode);
router.post('/passcode/verify', authMiddleware, passcodeVerifyLimiter, verifyPasscode);

// Driver accounts (managed in Settings, behind the section PIN gate since a
// driver's PIN is a real credential — same sensitivity class as the section
// PIN itself, unlike the read-only settings routes above).
router.get('/drivers', authMiddleware, sectionUnlockMiddleware, listDrivers);
router.post('/drivers', authMiddleware, sectionUnlockMiddleware, passcodeVerifyLimiter, createDriver);
router.put('/drivers/:id', authMiddleware, sectionUnlockMiddleware, updateDriver);
router.post('/drivers/:id/reset-pin', authMiddleware, sectionUnlockMiddleware, passcodeVerifyLimiter, resetDriverPin);
router.delete('/drivers/:id', authMiddleware, sectionUnlockMiddleware, deleteDriver);

router.post('/driver/login', driverLoginLimiter, driverLogin);
router.get('/driver/login-poll/:pollToken', driverPollLimiter, pollDriverLoginRequest);
router.post('/driver/logout', driverLogout);

// Admin-side approval queue for pending driver logins (Dashboard)
router.get('/driver-login-requests', authMiddleware, listDriverLoginRequests);
router.post('/driver-login-requests/:id/approve', authMiddleware, approveDriverLoginRequest);
router.post('/driver-login-requests/:id/reject', authMiddleware, rejectDriverLoginRequest);

// Admin-side view of who's currently logged in as a driver, and the ability
// to force one out early (Dashboard)
router.get('/driver-sessions', authMiddleware, listActiveDriverSessions);
router.post('/driver-sessions/:id/logout', authMiddleware, logoutDriverSession);

// Google Reviews (managed from the Settings page)
router.get('/reviews', getGoogleReviews);
router.post('/reviews', authMiddleware, sectionUnlockMiddleware, createGoogleReview);
router.delete('/reviews/:id', authMiddleware, sectionUnlockMiddleware, deleteGoogleReview);
router.post('/sync-google-reviews', authMiddleware, sectionUnlockMiddleware, syncGoogleReviews);

module.exports = router;
