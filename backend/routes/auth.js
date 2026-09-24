const express = require('express');
const { login, verify2FA, resend2FA, createAdmin } = require('../controllers/authController');
const { authLimiter, createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Guards brute-forcing the 6-digit 2FA code specifically (separate from the
// broader authLimiter on /login, since a single login can retry this a few times).
const twoFactorLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Zu viele Versuche. Bitte warten Sie 10 Minuten / Too many attempts. Please try again after 10 minutes.'
});

router.post('/login', authLimiter, login);
router.post('/verify-2fa', authLimiter, twoFactorLimiter, verify2FA);
router.post('/resend-2fa', authLimiter, resend2FA);
//router.post('/create-admin', createAdmin);

module.exports = router;
