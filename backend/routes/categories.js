const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { optionalAuthMiddleware } = require('../middleware/anyAuth');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

// Public / customer / admin accessible
router.get('/', optionalAuthMiddleware, getCategories);
router.get('/:id', optionalAuthMiddleware, getCategoryById);

// Admin only routes
router.post('/', authMiddleware, createCategory);
router.put('/:id', authMiddleware, updateCategory);
router.delete('/:id', authMiddleware, deleteCategory);

module.exports = router;
