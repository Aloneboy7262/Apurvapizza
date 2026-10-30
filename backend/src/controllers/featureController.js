const FeatureSetting = require('../models/FeatureSetting');
const Order = require('../models/Order');
const User = require('../models/User');
const orderPipelineService = require('../services/orderPipelineService');
const notificationService = require('../services/notificationService');

/**
 * @desc    Get public feature flags (safe for customer checkout/profile)
 * @route   GET /api/features/public
 * @access  Public
 */
exports.getPublicFeatureSettings = async (req, res, next) => {
  try {
    const settings = await FeatureSetting.getOrCreateSettings();
    return res.status(200).json({
      success: true,
      data: settings.getPublicSettings()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get full feature settings (including credentials)
 * @route   GET /api/features/admin
 * @access  Private (Admin Only)
 */
exports.getAdminFeatureSettings = async (req, res, next) => {
  try {
    const settings = await FeatureSetting.getOrCreateSettings();
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update feature settings
 * @route   PUT /api/features
 * @access  Private (Admin Only)
 */
exports.updateFeatureSettings = async (req, res, next) => {
  try {
    let settings = await FeatureSetting.getOrCreateSettings();

    const {
      whatsappAlerts,
      smsAlerts,
      handoverOtp,
      silentPrint,
      customerWallet
    } = req.body;

    if (whatsappAlerts && typeof whatsappAlerts === 'object') {
      settings.whatsappAlerts = { ...settings.whatsappAlerts.toObject(), ...whatsappAlerts };
    }
    if (smsAlerts && typeof smsAlerts === 'object') {
      settings.smsAlerts = { ...settings.smsAlerts.toObject(), ...smsAlerts };
    }
    if (handoverOtp && typeof handoverOtp === 'object') {
      settings.handoverOtp = { ...settings.handoverOtp.toObject(), ...handoverOtp };
    }
    if (silentPrint && typeof silentPrint === 'object') {
      settings.silentPrint = { ...settings.silentPrint.toObject(), ...silentPrint };
    }
    if (customerWallet && typeof customerWallet === 'object') {
      settings.customerWallet = { ...settings.customerWallet.toObject(), ...customerWallet };
    }

    await settings.save();

    // Broadcast updated feature flags to all connected clients & dashboards
    const io = req.app.get('io');
    if (io) {
      io.emit('feature_settings_updated', settings.getPublicSettings());
    }

    return res.status(200).json({
      success: true,
      message: 'Feature controls and automation settings updated successfully.',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Customer Handover OTP & Complete Delivery
 * @route   POST /api/features/verify-otp
 * @access  Private (Admin or Kitchen)
 */
exports.verifyDeliveryOtp = async (req, res, next) => {
  try {
    const { orderId, otp, bypass } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required.'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order #${orderId} not found.`
      });
    }

    const settings = await FeatureSetting.getOrCreateSettings();
    const io = req.app.get('io');

    // If OTP verification is enabled and not bypassed
    if (settings.handoverOtp.enabled) {
      // Check if only COD requires OTP
      const requiresOtp = !settings.handoverOtp.requireForCodOnly || order.paymentMethod === 'cod';

      if (requiresOtp) {
        if (bypass) {
          if (!settings.handoverOtp.allowAdminBypass && req.user.role !== 'admin') {
            return res.status(403).json({
              success: false,
              message: 'Admin manual OTP bypass is disabled.'
            });
          }
          console.log(`[HandoverOTP] Order #${orderId} delivery verified via Admin Bypass by ${req.user.name}`);
        } else {
          const submittedOtp = String(otp || '').trim();
          const expectedOtp = String(order.deliveryOtp || '').trim();

          if (!submittedOtp || submittedOtp !== expectedOtp) {
            return res.status(400).json({
              success: false,
              message: 'Invalid Handover OTP PIN. Please check customer phone and try again.'
            });
          }
        }
      }
    }

    // Mark OTP verified timestamp
    order.otpVerifiedAt = new Date();
    await order.save();

    // Transition lifecycle to Delivered through pipeline
    const deliveredOrder = await orderPipelineService.transitionStatus(
      order._id,
      'Delivered',
      io,
      req.user.role || 'staff'
    );

    return res.status(200).json({
      success: true,
      message: 'Customer OTP verified successfully. Order marked as Delivered!',
      data: deliveredOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Test WhatsApp / SMS notification dispatch
 * @route   POST /api/features/test-notification
 * @access  Private (Admin Only)
 */
exports.sendTestNotification = async (req, res, next) => {
  try {
    const { phone, channel } = req.body;
    const targetPhone = phone || '+91 73796 82620';
    const io = req.app.get('io');

    const sampleOrder = {
      _id: 'sample_67890',
      totalAmount: 499,
      deliveryPhone: targetPhone,
      deliveryOtp: '1234',
      user: { name: 'Store Admin' },
      itemsAmount: 450,
      cashbackAwarded: 25
    };

    await notificationService.sendOrderNotification(sampleOrder, 'Pending', io);

    return res.status(200).json({
      success: true,
      message: `Test ${channel || 'alert'} successfully dispatched to ${targetPhone}!`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin Manual Adjustment of Customer Hub Wallet
 * @route   POST /api/features/wallet/adjust
 * @access  Private (Admin Only)
 */
exports.adjustCustomerWallet = async (req, res, next) => {
  try {
    const { userId, amount, type, reason } = req.body;

    if (!userId || !amount || !['credit', 'debit'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'userId, positive amount, and type (credit/debit) are required.'
      });
    }

    const numAmount = Math.max(1, Number(amount));
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer account not found.'
      });
    }

    if (type === 'credit') {
      user.walletBalance = (user.walletBalance || 0) + numAmount;
    } else {
      user.walletBalance = Math.max(0, (user.walletBalance || 0) - numAmount);
    }

    user.walletHistory.push({
      amount: numAmount,
      type,
      reason: reason || `Manual ${type} by Store Admin`,
      date: new Date()
    });

    await user.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${user._id}`).emit('wallet_updated', {
        walletBalance: user.walletBalance
      });
    }

    return res.status(200).json({
      success: true,
      message: `Customer wallet successfully ${type === 'credit' ? 'credited' : 'debited'} by ₹${numAmount}. New balance: ₹${user.walletBalance}`,
      data: {
        walletBalance: user.walletBalance,
        walletHistory: user.walletHistory
      }
    });
  } catch (error) {
    next(error);
  }
};
