const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductReview,
  replyToProductReview,
  getAllProductReviews,
  updateProductStock
} = require('../controllers/productController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public routes
router.get('/', getAllProducts);
router.get('/reviews/all', verifyToken, authorizeRoles('admin'), getAllProductReviews);
router.get('/:id', getProductById);
router.post('/:id/reviews', verifyToken, addProductReview);

// Admin & Staff protected routes
router.put('/:productId/reviews/:reviewId/reply', verifyToken, authorizeRoles('admin'), replyToProductReview);
router.post('/', verifyToken, authorizeRoles('admin'), createProduct);
router.put('/:id', verifyToken, authorizeRoles('admin'), updateProduct);
router.patch('/:id/stock', verifyToken, authorizeRoles('admin', 'kitchen'), updateProductStock);
router.delete('/:id', verifyToken, authorizeRoles('admin'), deleteProduct);

module.exports = router;
