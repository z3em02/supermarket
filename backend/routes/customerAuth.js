const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const { customerAuthMiddleware } = require('../middleware/customerAuth');
const { authMiddleware } = require('../middleware/auth');

// Public customer auth & verification endpoints
router.post('/register', customerAuthController.register);
router.post('/verify-email', customerAuthController.verifyEmail);
router.post('/verify-phone', customerAuthController.verifyPhone);
router.post('/resend-otp', customerAuthController.resendOtp);
router.post('/login', customerAuthController.login);

// Protected customer profile endpoints
router.get('/profile', customerAuthMiddleware, customerAuthController.getProfile);
router.put('/profile', customerAuthMiddleware, customerAuthController.updateProfile);

// Admin customer management endpoint
router.get('/customers', authMiddleware, customerAuthController.listCustomers);
router.delete('/customers/:id', authMiddleware, customerAuthController.deleteCustomer);

module.exports = router;
