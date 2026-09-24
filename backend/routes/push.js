const express = require('express');
const { customerAuthMiddleware } = require('../middleware/customerAuth');
const { getVapidPublicKey, subscribe, unsubscribe } = require('../controllers/pushController');

const router = express.Router();

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', customerAuthMiddleware, subscribe);
router.post('/unsubscribe', customerAuthMiddleware, unsubscribe);

module.exports = router;
