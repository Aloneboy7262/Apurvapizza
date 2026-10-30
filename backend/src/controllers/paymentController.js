const crypto = require('crypto');
const Razorpay = require('razorpay');
const PaymentSetting = require('../models/PaymentSetting');
const Order = require('../models/Order');

// @desc    Get public payment settings (Sanitized for Customer Checkout)
// @route   GET /api/payment-settings
// @access  Public
const getPublicPaymentSettings = async (req, res, next) => {
  try {
    const settings = await PaymentSetting.getOrCreateSettings();
    res.status(200).json({
      success: true,
      data: settings.getPublicSettings()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get complete payment settings (Includes API keys)
// @route   GET /api/payment-settings/admin
// @access  Private (Admin only)
const getAdminPaymentSettings = async (req, res, next) => {
  try {
    const settings = await PaymentSetting.getOrCreateSettings();
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment settings
// @route   PUT /api/payment-settings
// @access  Private (Admin only)
const updatePaymentSettings = async (req, res, next) => {
  try {
    const settings = await PaymentSetting.getOrCreateSettings();
    const io = req.app.get('io');

    const {
      codEnabled,
      maxCodAmount,
      upiQrEnabled,
      upiId,
      upiPayeeName,
      upiCustomQrUrl,
      upiInstructions,
      onlineGatewayEnabled,
      gatewayProvider,
      razorpayKeyId,
      razorpayKeySecret,
      razorpayMode,
      convenienceFee
    } = req.body;

    if (codEnabled !== undefined) settings.codEnabled = Boolean(codEnabled);
    if (maxCodAmount !== undefined) settings.maxCodAmount = Math.max(0, Number(maxCodAmount) || 0);

    if (upiQrEnabled !== undefined) settings.upiQrEnabled = Boolean(upiQrEnabled);
    if (upiId !== undefined) settings.upiId = String(upiId).trim();
    if (upiPayeeName !== undefined) settings.upiPayeeName = String(upiPayeeName).trim();
    if (upiCustomQrUrl !== undefined) settings.upiCustomQrUrl = String(upiCustomQrUrl).trim();
    if (upiInstructions !== undefined) settings.upiInstructions = String(upiInstructions).trim();

    if (onlineGatewayEnabled !== undefined) settings.onlineGatewayEnabled = Boolean(onlineGatewayEnabled);
    if (gatewayProvider !== undefined) settings.gatewayProvider = gatewayProvider;
    if (razorpayKeyId !== undefined) settings.razorpayKeyId = String(razorpayKeyId).trim();
    if (razorpayKeySecret !== undefined && razorpayKeySecret !== '') {
      settings.razorpayKeySecret = String(razorpayKeySecret).trim();
    }
    if (razorpayMode !== undefined) settings.razorpayMode = razorpayMode;
    if (convenienceFee !== undefined) settings.convenienceFee = Math.max(0, Number(convenienceFee) || 0);

    await settings.save();

    if (io) {
      io.emit('payment_settings_updated', settings.getPublicSettings());
    }

    res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully.',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Razorpay Order for client checkout modal
// @route   POST /api/payments/razorpay/create-order
// @access  Private (Customer)
const createRazorpayOrder = async (req, res, next) => {
  try {
    const settings = await PaymentSetting.getOrCreateSettings();
    if (!settings.onlineGatewayEnabled || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
      return res.status(400).json({
        success: false,
        message: 'Online payment gateway is currently disabled by store admin.'
      });
    }

    const { amount, receipt } = req.body;
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid order amount is required.'
      });
    }

    const instance = new Razorpay({
      key_id: settings.razorpayKeyId,
      key_secret: settings.razorpayKeySecret
    });

    const options = {
      amount: Math.round(numericAmount * 100), // Razorpay accepts amounts in paise
      currency: 'INR',
      receipt: receipt ? String(receipt).slice(0, 40) : `order_rcpt_${Date.now()}`
    };

    const razorpayOrder = await instance.orders.create(options);

    res.status(200).json({
      success: true,
      keyId: settings.razorpayKeyId,
      order: razorpayOrder
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    next(error);
  }
};

// @desc    Verify Razorpay payment signature and mark order paid
// @route   POST /api/payments/razorpay/verify
// @access  Private (Customer / Admin)
const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const settings = await PaymentSetting.getOrCreateSettings();
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay verification parameters.'
      });
    }

    const bodyToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', settings.razorpayKeySecret)
      .update(bodyToSign)
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid cryptographic signature.'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order #${orderId} was not found.`
      });
    }

    // IDOR Protection: Verify caller is owner or admin
    const isOwner = req.user && order.user && order.user.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to verify payment for this order.'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Order has already been verified and marked as paid.',
        data: order
      });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot process payment for a cancelled order.'
      });
    }
    order.paymentStatus = 'paid';
    order.paymentMethod = 'razorpay';
    order.paymentDetails = {
      transactionId: razorpay_payment_id,
      utrNumber: razorpay_payment_id,
      gatewayOrderId: razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignature: razorpay_signature,
      paidAt: new Date(),
      paymentVerifiedBy: 'razorpay_signature',
      paymentNotes: 'Verified via Razorpay HMAC signature'
    };

    await order.save();

    const io = req.app.get('io');
    if (io) {
      const payload = {
        orderId: order._id.toString(),
        paymentStatus: 'paid',
        paymentMethod: 'razorpay',
        paymentDetails: order.paymentDetails
      };
      io.to(`order_${order._id}`).emit('order_payment_updated', payload);
      io.to('kitchen').emit('order_payment_updated', payload);
      io.to('admin').emit('order_payment_updated', payload);
      if (order.user) {
        io.to(`user_${order.user.toString()}`).emit('order_payment_updated', payload);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Razorpay payment verified and order marked as paid.',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicPaymentSettings,
  getAdminPaymentSettings,
  updatePaymentSettings,
  createRazorpayOrder,
  verifyRazorpayPayment
};
