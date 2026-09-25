const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../lib/config');
const { login, verify2FA, resend2FA, changePassword } = require('../controllers/authController');
const { authLimiter, createRateLimiter } = require('../middleware/rateLimiter');
const { authMiddleware } = require('../middleware/auth');
const { clearCsrfCookie } = require('../middleware/csrf');

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

// #38 & Finding 1.5 fix: clear cookie with full attributes and revoke admin token
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  clearCsrfCookie(res);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
