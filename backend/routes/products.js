const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { anyAuthMiddleware, optionalAuthMiddleware } = require('../middleware/anyAuth');
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, updateStock } = require('../controllers/productController');

const router = express.Router();

// Catalog route (publicly viewable, supports customer, guest, or admin)
router.get('/catalog', optionalAuthMiddleware, getProducts);

// Admin routes
router.get('/', authMiddleware, getProducts);
router.get('/:id', authMiddleware, getProductById);
router.post('/', authMiddleware, createProduct);
router.put('/:id', authMiddleware, updateProduct);
router.delete('/:id', authMiddleware, deleteProduct);
router.patch('/:id/stock', authMiddleware, updateStock);

module.exports = router;

