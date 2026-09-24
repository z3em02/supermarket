const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');
const { getAccountingSummary, getAccountingRecords, exportAccountingData } = require('../controllers/accountingController');

const router = express.Router();

// Buchhaltung — behind the section PIN
router.use(authMiddleware, sectionUnlockMiddleware);

router.get('/summary', getAccountingSummary);
router.get('/records', getAccountingRecords);
router.get('/export', exportAccountingData);

module.exports = router;
