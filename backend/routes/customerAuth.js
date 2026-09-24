const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const { customerAuthMiddleware } = require('../middleware/customerAuth');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');

// Public customer auth & verification endpoints (protected by authLimiter against brute-force)
router.post('/register', authLimiter, customerAuthController.register);
router.post('/verify-email', authLimiter, customerAuthController.verifyEmail);
// Requires the customer's own JWT: the Firebase ID token proves phone possession,
// customerAuthMiddleware proves which account it should be applied to.
router.post('/verify-phone', authLimiter, customerAuthMiddleware, customerAuthController.verifyPhone);
router.post('/resend-otp', authLimiter, customerAuthController.resendOtp);
router.post('/login', authLimiter, customerAuthController.login);
router.post('/request-password-reset', authLimiter, customerAuthController.requestPasswordReset);
router.post('/reset-password', authLimiter, customerAuthController.resetPassword);

// Protected customer profile endpoints
router.get('/profile', customerAuthMiddleware, customerAuthController.getProfile);
router.put('/profile', customerAuthMiddleware, customerAuthController.updateProfile);

// Admin customer management endpoint (Kunden — behind the section PIN)
router.get('/customers', authMiddleware, sectionUnlockMiddleware, customerAuthController.listCustomers);
router.delete('/customers/:id', authMiddleware, sectionUnlockMiddleware, customerAuthController.deleteCustomer);

module.exports = router;
