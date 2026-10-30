const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getSalesAnalytics,
  assignRider,
  toggleItemReady,
  cancelOrder,
  getDriverOrders,
  updateDriverOrderStatus,
  updateOrderPaymentStatus,
  getCODReconciliation,
  settleRiderCOD,
  getMyRiderCODStatus,
  getEODSummary
} = require('../controllers/orderController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { orderLimiter } = require('../middleware/rateLimiter');

// All order endpoints require authentication
router.use(verifyToken);

// Sales Analytics (Admin only)
router.get('/analytics/sales', authorizeRoles('admin'), getSalesAnalytics);
router.get('/analytics/eod-report', authorizeRoles('admin'), getEODSummary);

// COD Cash Reconciliation & Shift Settlement
router.get('/cod-reconciliation', authorizeRoles('admin'), getCODReconciliation);
router.post('/cod-settle', authorizeRoles('admin'), settleRiderCOD);
router.get('/driver/my-cash', authorizeRoles('driver', 'admin'), getMyRiderCODStatus);

// Create order (Customer / Admin with rate limiter)
router.post('/', orderLimiter, createOrder);

// Customer specific order history
router.get('/my-orders', getMyOrders);
router.get('/me', getMyOrders);

// Driver Portal endpoints (Driver / Admin)
router.get('/driver/assigned', authorizeRoles('driver', 'admin'), getDriverOrders);
router.patch('/:id/driver-status', authorizeRoles('driver', 'admin'), updateDriverOrderStatus);

// Admin & Kitchen order management
router.get('/', authorizeRoles('admin', 'kitchen'), getAllOrders);

// Single order details
router.get('/:id', getOrderById);

// Order Cancellation (Customer can cancel eligible orders; Admin / Kitchen staff override)
router.put('/:id/cancel', cancelOrder);

// Update order status (Admin / Kitchen)
router.patch('/:id/status', authorizeRoles('admin', 'kitchen'), updateOrderStatus);

// Update order payment status (Admin only)
router.patch('/:id/payment-status', authorizeRoles('admin'), updateOrderPaymentStatus);

// Assign Rider & Dispatch (Admin / Kitchen)
router.put('/:id/assign-rider', authorizeRoles('admin', 'kitchen'), assignRider);

// Kitchen Item Checklist Toggle (Kitchen / Admin)
router.put('/:id/items/:itemId/toggle-ready', authorizeRoles('admin', 'kitchen'), toggleItemReady);

// Delete order (Admin only)
router.delete('/:id', authorizeRoles('admin'), deleteOrder);

module.exports = router;
