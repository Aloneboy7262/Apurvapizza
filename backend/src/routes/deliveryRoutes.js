const express = require('express');
const router = express.Router();
const {
  getDeliverySettings,
  updateDeliverySettings,
  captureBaseLocation,
  verifyLocation,
  calculateDelivery,
  toggleRushMode,
  getShopStatus,
  updateShopStatus
} = require('../controllers/deliveryController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public endpoints
router.get('/', getDeliverySettings);
router.get('/shop-status', getShopStatus);
router.post('/calculate', calculateDelivery);
router.post('/verify-location', verifyLocation);

// Protected admin & kitchen management endpoints
router.put('/', verifyToken, authorizeRoles('admin'), updateDeliverySettings);
router.post('/capture-base-location', verifyToken, authorizeRoles('admin'), captureBaseLocation);
router.post('/rush-mode', verifyToken, authorizeRoles('admin', 'kitchen'), toggleRushMode);
router.post('/shop-status', verifyToken, authorizeRoles('admin'), updateShopStatus);

module.exports = router;
