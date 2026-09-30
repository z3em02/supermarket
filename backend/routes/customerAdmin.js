// Admin customer management (the Kunden page, behind the section PIN),
// mounted at /api/customers. A customer's own login, verification and
// profile are routes/customerAuth.js at /api/customer.
const express = require('express');
const router = express.Router();
const customerAdminController = require('../controllers/customerAdminController');
const { authMiddleware } = require('../middleware/auth');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');

router.get('/', authMiddleware, sectionUnlockMiddleware, customerAdminController.listCustomers);
router.get('/count', authMiddleware, sectionUnlockMiddleware, customerAdminController.countCustomers);
router.delete('/:id', authMiddleware, sectionUnlockMiddleware, customerAdminController.deleteCustomer);

module.exports = router;
