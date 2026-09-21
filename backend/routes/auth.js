const express = require('express');
const { login, createAdmin } = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', authLimiter, login);
//router.post('/create-admin', createAdmin);

module.exports = router;
