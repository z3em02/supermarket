const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAccountingSummary, getAccountingRecords, exportAccountingData } = require('../controllers/accountingController');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get('/summary', getAccountingSummary);
router.get('/records', getAccountingRecords);
router.get('/export', exportAccountingData);

module.exports = router;
