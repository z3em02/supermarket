const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET, SECURE_COOKIES } = require('../lib/config');
const { login, verify2FA, resend2FA, changePassword } = require('../controllers/authController');
const { authLimiter, createRateLimiter } = require('../middleware/rateLimiter');
const { authMiddleware } = require('../middleware/auth');
const { clearCsrfCookie, requireCsrfForCookieAuth } = require('../middleware/csrf');

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
router.put('/change-password', authMiddleware, changePassword);

// Session check for cookie-only auth: the frontend no longer stores the JWT
// itself (can't — it's HttpOnly), so it calls this on load to learn whether
// the browser's cookie still represents a valid session, and who it is.
router.get('/me', authMiddleware, (req, res) => {
  res.json({ id: req.admin.id, email: req.admin.email, name: req.admin.name });
});

// #38 & Finding 1.5 fix: clear cookie with full attributes and revoke admin token
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  const usedCookieAuth = Boolean(req.cookies?.token);
  const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

  // Not behind authMiddleware (an already-expired/invalid cookie must still
  // be able to log out and clear itself), so the CSRF check has to happen
  // here manually — otherwise a cross-site page could force this cookie-only
  // mutating request through with no auth middleware ever running it.
  if (!requireCsrfForCookieAuth(req, res, usedCookieAuth)) return;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role === 'admin' && decoded.id) {
        await prisma.admin.update({
          where: { id: decoded.id },
          data: { tokenVersion: { increment: 1 } }
        });
      }
    } catch (e) {
      // Token may be already expired or malformed; proceed with clearing cookie
    }
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    path: '/'
  });
  clearCsrfCookie(res);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
