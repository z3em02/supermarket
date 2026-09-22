const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const { customerAuthMiddleware } = require('../middleware/customerAuth');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public customer auth & verification endpoints (protected by authLimiter against brute-force)
router.post('/register', authLimiter, customerAuthController.register);
router.post('/verify-email', authLimiter, customerAuthController.verifyEmail);
router.post('/verify-phone', authLimiter, customerAuthController.verifyPhone);
router.post('/resend-otp', authLimiter, customerAuthController.resendOtp);
router.post('/login', authLimiter, customerAuthController.login);

// Protected customer profile endpoints
router.get('/profile', customerAuthMiddleware, customerAuthController.getProfile);
router.put('/profile', customerAuthMiddleware, customerAuthController.updateProfile);

// Admin customer management endpoint
router.get('/customers', authMiddleware, customerAuthController.listCustomers);
router.delete('/customers/:id', authMiddleware, customerAuthController.deleteCustomer);

module.exports = router;
