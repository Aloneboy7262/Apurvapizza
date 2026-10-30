const mongoose = require('mongoose');

const paymentSettingSchema = new mongoose.Schema(
  {
    // Cash On Delivery
    codEnabled: {
      type: Boolean,
      default: true
    },
    maxCodAmount: {
      type: Number,
      default: 2000,
      min: [0, 'Maximum COD amount cannot be negative']
    },

    // Dynamic UPI QR Settings (Disabled; store will use Razorpay UPI gateway)
    upiQrEnabled: {
      type: Boolean,
      default: false
    },
    upiId: {
      type: String,
      trim: true,
      default: ''
    },
    upiPayeeName: {
      type: String,
      trim: true,
      default: 'Apurva Pizza Hub'
    },
    upiCustomQrUrl: {
      type: String,
      trim: true,
      default: ''
    },
    upiInstructions: {
      type: String,
      trim: true,
      default: ''
    },

    // Online Payment Gateway (Razorpay UPI & Cards)
    onlineGatewayEnabled: {
      type: Boolean,
      default: false
    },
    gatewayProvider: {
      type: String,
      enum: ['razorpay', 'phonepe'],
      default: 'razorpay'
    },
    razorpayKeyId: {
      type: String,
      trim: true,
      default: ''
    },
    razorpayKeySecret: {
      type: String,
      trim: true,
      default: ''
    },
    razorpayMode: {
      type: String,
      enum: ['test', 'live'],
      default: 'test'
    },

    // Convenience or digital payment fee
    convenienceFee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

/**
 * Singleton Pattern: Retrieve or initialize default payment settings
 */
paymentSettingSchema.statics.getOrCreateSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

/**
 * Public Sanitized View (Strips Secret Keys)
 */
paymentSettingSchema.methods.getPublicSettings = function () {
  return {
    codEnabled: this.codEnabled,
    maxCodAmount: this.maxCodAmount,
    upiQrEnabled: this.upiQrEnabled,
    upiId: this.upiId || '',
    upiPayeeName: this.upiPayeeName || 'Apurva Pizza Hub',
    upiCustomQrUrl: this.upiCustomQrUrl || '',
    upiInstructions: this.upiInstructions || '',
    onlineGatewayEnabled: this.onlineGatewayEnabled && Boolean(this.razorpayKeyId),
    gatewayProvider: this.gatewayProvider,
    razorpayKeyId: this.onlineGatewayEnabled ? this.razorpayKeyId : '',
    razorpayMode: this.razorpayMode,
    convenienceFee: this.convenienceFee || 0
  };
};

const PaymentSetting = mongoose.model('PaymentSetting', paymentSettingSchema);

module.exports = PaymentSetting;
