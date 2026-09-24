const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');
const { listAuditLog } = require('../controllers/auditLogController');

const router = express.Router();

router.get('/', authMiddleware, sectionUnlockMiddleware, listAuditLog);

module.exports = router;
