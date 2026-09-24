const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const { customerAuthMiddleware } = require('../middleware/customerAuth');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../lib/config');

// Public customer auth & verification endpoints (protected by authLimiter against brute-force)
router.post('/register', authLimiter, customerAuthController.register);
router.post('/verify-email', authLimiter, customerAuthMiddleware, customerAuthController.verifyEmail);
// Requires the customer's own JWT: the Firebase ID token proves phone possession,
// customerAuthMiddleware proves which account it should be applied to.
router.post('/verify-phone', authLimiter, customerAuthMiddleware, customerAuthController.verifyPhone);
router.post('/resend-otp', authLimiter, customerAuthMiddleware, customerAuthController.resendOtp);
router.post('/login', authLimiter, customerAuthController.login);
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization || req.header('Authorization');
  const token = req.cookies?.customer_token || (authHeader?.startsWith('Bearer ') ? authHeader.replace(/^Bearer\s+/, '').trim() : null);

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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  res.json({ message: 'Logged out successfully' });
});
router.post('/request-password-reset', authLimiter, customerAuthController.requestPasswordReset);
router.post('/reset-password', authLimiter, customerAuthController.resetPassword);

// Protected customer profile endpoints
router.get('/profile', customerAuthMiddleware, customerAuthController.getProfile);
router.put('/profile', customerAuthMiddleware, customerAuthController.updateProfile);

// Admin customer management endpoint (Kunden — behind the section PIN)
router.get('/customers', authMiddleware, sectionUnlockMiddleware, customerAuthController.listCustomers);
router.delete('/customers/:id', authMiddleware, sectionUnlockMiddleware, customerAuthController.deleteCustomer);

module.exports = router;
