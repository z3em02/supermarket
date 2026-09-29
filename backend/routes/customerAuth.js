const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const customerProfileController = require('../controllers/customerProfileController');
const customerAdminController = require('../controllers/customerAdminController');
const passwordResetController = require('../controllers/passwordResetController');
const { customerAuthMiddleware } = require('../middleware/customerAuth');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');
const { clearCsrfCookieUnlessOtherSession, requireCsrfForCookieAuth } = require('../middleware/csrf');

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET, SECURE_COOKIES } = require('../lib/config');

// Public customer auth & verification endpoints (protected by authLimiter against brute-force)
router.post('/register', authLimiter, customerAuthController.register);
router.post('/verify-email', authLimiter, customerAuthMiddleware, customerAuthController.verifyEmail);
// Checks the code sent to the account's phone via WhatsApp (resend-otp, type 'phone').
router.post('/verify-phone', authLimiter, customerAuthMiddleware, customerAuthController.verifyPhone);
router.post('/resend-otp', authLimiter, customerAuthMiddleware, customerAuthController.resendOtp);
router.post('/login', authLimiter, customerAuthController.login);
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization || req.header('Authorization');
  const usedCookieAuth = Boolean(req.cookies?.customer_token);
  const token = req.cookies?.customer_token || (authHeader?.startsWith('Bearer ') ? authHeader.replace(/^Bearer\s+/, '').trim() : null);

  // Not behind customerAuthMiddleware (an already-expired/invalid cookie must
  // still be able to log out and clear itself), so the CSRF check has to
  // happen here manually — otherwise a cross-site page could force this
  // cookie-only mutating request through with no auth middleware ever running.
  if (!requireCsrfForCookieAuth(req, res, usedCookieAuth)) return;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role === 'customer' && decoded.customerId) {
        await prisma.customer.update({
          where: { id: decoded.customerId },
          data: { tokenVersion: { increment: 1 } }
        });
      }
    } catch (e) {
      // Ignore invalid or expired token
    }
  }

  res.clearCookie('customer_token', {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    path: '/'
  });
  clearCsrfCookieUnlessOtherSession(req, res, 'customer_token');
  res.json({ message: 'Logged out successfully' });
});
router.post('/request-password-reset', authLimiter, passwordResetController.requestPasswordReset);
router.post('/reset-password', authLimiter, passwordResetController.resetPassword);

// Protected customer profile endpoints
router.get('/profile', customerAuthMiddleware, customerProfileController.getProfile);
router.put('/profile', customerAuthMiddleware, customerProfileController.updateProfile);

// Admin customer management endpoint (Kunden — behind the section PIN)
router.get('/customers', authMiddleware, sectionUnlockMiddleware, customerAdminController.listCustomers);
router.get('/customers/count', authMiddleware, sectionUnlockMiddleware, customerAdminController.countCustomers);
router.delete('/customers/:id', authMiddleware, sectionUnlockMiddleware, customerAdminController.deleteCustomer);

module.exports = router;
