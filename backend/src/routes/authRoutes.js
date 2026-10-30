const express = require('express');
const router = express.Router();
const {
  checkPhone,
  register,
  login,
  loginWithOtp,
  sendOtp,
  verifyOtp,
  resetPassword,
  getMe,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getAllUsers,
  createStaffUser,
  deleteStaffUser,
  updateUserRole,
  changeCredentials,
  getDrivers
} = require('../controllers/authController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  loginLimiter,
  otpLimiter,
  verifyOtpLimiter,
  passwordResetLimiter
} = require('../middleware/rateLimiter');

// Public auth routes with endpoint-specific brute-force rate limiters
router.post('/check-phone', checkPhone);
router.post('/register', loginLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/login-otp', verifyOtpLimiter, loginWithOtp);

// Dedicated OTP endpoints for Login, Registration & Forgot Password
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);
router.post('/reset-password', passwordResetLimiter, resetPassword);


// Protected user routes (accessible to all authenticated roles: customer, admin, kitchen)
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-credentials', verifyToken, changeCredentials);

// Admin & Kitchen user and staff management routes
router.get('/users', verifyToken, authorizeRoles('admin'), getAllUsers);
router.get('/drivers', verifyToken, authorizeRoles('admin', 'kitchen'), getDrivers);
router.post('/staff-users', verifyToken, authorizeRoles('admin'), createStaffUser);
router.delete('/staff-users/:id', verifyToken, authorizeRoles('admin'), deleteStaffUser);
router.patch('/users/:id/role', verifyToken, authorizeRoles('admin'), updateUserRole);

// Protected address management routes (Zomato / Swiggy style)
router.post('/addresses', verifyToken, addAddress);
router.put('/addresses/:addressId', verifyToken, updateAddress);
router.delete('/addresses/:addressId', verifyToken, deleteAddress);
router.patch('/addresses/:addressId/default', verifyToken, setDefaultAddress);

module.exports = router;
