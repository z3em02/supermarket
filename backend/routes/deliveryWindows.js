const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { sectionUnlockMiddleware } = require('../middleware/sectionUnlock');
const {
  getDeliveryWindows,
  getActiveDeliveryWindows,
  createDeliveryWindow,
  updateDeliveryWindow,
  deleteDeliveryWindow
} = require('../controllers/deliveryWindowController');

const router = express.Router();

// Public — used by the customer-facing checkout time picker
router.get('/active', getActiveDeliveryWindows);

// Admin (managed from the Settings page — behind the section PIN)
router.get('/', authMiddleware, sectionUnlockMiddleware, getDeliveryWindows);
router.post('/', authMiddleware, sectionUnlockMiddleware, createDeliveryWindow);
router.put('/:id', authMiddleware, sectionUnlockMiddleware, updateDeliveryWindow);
router.delete('/:id', authMiddleware, sectionUnlockMiddleware, deleteDeliveryWindow);

module.exports = router;
