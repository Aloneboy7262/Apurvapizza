const express = require('express');
const router = express.Router();
const {
  getPublicPaymentSettings,
  getAdminPaymentSettings,
  updatePaymentSettings,
  createRazorpayOrder,
  verifyRazorpayPayment
} = require('../controllers/paymentController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public endpoint for customer checkout
router.get('/', getPublicPaymentSettings);

// Admin-only management endpoints
router.get('/admin', verifyToken, authorizeRoles('admin'), getAdminPaymentSettings);
router.put('/', verifyToken, authorizeRoles('admin'), updatePaymentSettings);

// Razorpay checkout endpoints
router.post('/razorpay/create-order', verifyToken, createRazorpayOrder);
router.post('/razorpay/verify', verifyToken, verifyRazorpayPayment);

module.exports = router;
