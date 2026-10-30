const express = require('express');
const router = express.Router();
const {
  getPublicFeatureSettings,
  getAdminFeatureSettings,
  updateFeatureSettings,
  verifyDeliveryOtp,
  sendTestNotification,
  adjustCustomerWallet
} = require('../controllers/featureController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public route for customer storefront
router.get('/public', getPublicFeatureSettings);

// Admin-only management routes
router.get('/admin', verifyToken, authorizeRoles('admin'), getAdminFeatureSettings);
router.put('/', verifyToken, authorizeRoles('admin'), updateFeatureSettings);
router.post('/test-notification', verifyToken, authorizeRoles('admin'), sendTestNotification);
router.post('/wallet/adjust', verifyToken, authorizeRoles('admin'), adjustCustomerWallet);

// Staff (Admin or Kitchen) Handover OTP verification
router.post('/verify-otp', verifyToken, authorizeRoles('admin', 'kitchen'), verifyDeliveryOtp);

module.exports = router;
