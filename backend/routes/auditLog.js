const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { listAuditLog } = require('../controllers/auditLogController');

const router = express.Router();

router.get('/', authMiddleware, listAuditLog);

module.exports = router;
