const express = require('express');
const { authMiddleware, driverOrAdminAuthMiddleware } = require('../middleware/auth');
const { anyAuthMiddleware } = require('../middleware/anyAuth');
const { customerAuthMiddleware } = require('../middleware/customerAuth');
const { 
  getOrders, 
  getOrderById, 
  createOrder, 
  getCustomerOrders, 
  updateOrderStatus,
  assignOrderDriver,
  deleteOrder,
  editOrder,
  customerRespondToModification
} = require('../controllers/orderController');

const router = express.Router();

// Customer order routes
router.get('/my-orders', customerAuthMiddleware, getCustomerOrders);
router.put('/:id/customer-response', customerAuthMiddleware, customerRespondToModification);

// Admin & Driver routes
router.get('/', driverOrAdminAuthMiddleware, getOrders);
router.get('/:id', driverOrAdminAuthMiddleware, getOrderById);
router.put('/:id/status', driverOrAdminAuthMiddleware, updateOrderStatus);
router.put('/:id/assign-driver', authMiddleware, assignOrderDriver);
router.put('/:id/edit', authMiddleware, editOrder);
// Registered (not removed) so its 403 + audit-log retention-policy response
// actually runs instead of callers hitting a bare 404 — see deleteOrder.
router.delete('/:id', authMiddleware, deleteOrder);

// Order creation route (Customer, Guest, Admin)
router.post('/', anyAuthMiddleware, createOrder);

module.exports = router;

