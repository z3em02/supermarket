const express = require('express');
const { authMiddleware } = require('../middleware/auth');
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

// Admin
router.get('/', authMiddleware, getDeliveryWindows);
router.post('/', authMiddleware, createDeliveryWindow);
router.put('/:id', authMiddleware, updateDeliveryWindow);
router.delete('/:id', authMiddleware, deleteDeliveryWindow);

module.exports = router;
