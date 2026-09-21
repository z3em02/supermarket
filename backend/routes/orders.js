const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { anyAuthMiddleware } = require('../middleware/anyAuth');
const { customerAuthMiddleware } = require('../middleware/customerAuth');
const { 
  getOrders, 
  getOrderById, 
  createOrder, 
  getCustomerOrders, 
  updateOrderStatus, 
  deleteOrder,
  editOrder,
  customerRespondToModification
} = require('../controllers/orderController');

const router = express.Router();

// Customer order routes
router.get('/my-orders', customerAuthMiddleware, getCustomerOrders);
router.put('/:id/customer-response', customerAuthMiddleware, customerRespondToModification);

// Admin routes
router.get('/', authMiddleware, getOrders);
router.get('/:id', authMiddleware, getOrderById);
router.put('/:id/status', authMiddleware, updateOrderStatus);
router.put('/:id/edit', authMiddleware, editOrder);
router.delete('/:id', authMiddleware, deleteOrder);

// Order creation route (Customer, Guest, Admin)
router.post('/', anyAuthMiddleware, createOrder);

module.exports = router;

