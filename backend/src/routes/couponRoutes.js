const express = require('express');
const router = express.Router();
const {
  getActiveCoupons,
  validateCoupon,
  getAllCouponsAdmin,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon
} = require('../controllers/couponController');
const { verifyToken, optionalAuth, authorizeRoles } = require('../middleware/auth');

// Public endpoints
router.get('/', getActiveCoupons);
router.post('/validate', optionalAuth, validateCoupon);

// Protected admin endpoints
router.get('/all', verifyToken, authorizeRoles('admin'), getAllCouponsAdmin);
router.post('/', verifyToken, authorizeRoles('admin'), createCoupon);
router.put('/:id', verifyToken, authorizeRoles('admin'), updateCoupon);
router.patch('/:id/toggle', verifyToken, authorizeRoles('admin'), toggleCoupon);
router.delete('/:id', verifyToken, authorizeRoles('admin'), deleteCoupon);

module.exports = router;
