const mongoose = require('mongoose');

const featureSettingSchema = new mongoose.Schema(
  {
    // 1. WhatsApp Order Alerts & Notifications
    whatsappAlerts: {
      enabled: {
        type: Boolean,
        default: false
      },
      provider: {
        type: String,
        enum: ['whatsapp_cloud_api', 'twilio', 'custom_webhook'],
        default: 'whatsapp_cloud_api'
      },
      apiKey: {
        type: String,
        trim: true,
        default: ''
      },
      phoneNumberId: {
        type: String,
        trim: true,
        default: ''
      },
      businessPhone: {
        type: String,
        trim: true,
        default: '+91 73796 82620'
      },
      notifyOnPlaced: {
        type: Boolean,
        default: true
      },
      notifyOnPreparing: {
        type: Boolean,
        default: true
      },
      notifyOnDispatched: {
        type: Boolean,
        default: true
      },
      notifyOnDelivered: {
        type: Boolean,
        default: true
      }
    },

    // 2. SMS Alerts & Notifications
    smsAlerts: {
      enabled: {
        type: Boolean,
        default: false
      },
      provider: {
        type: String,
        enum: ['fast2sms', 'twilio', 'msg91'],
        default: 'fast2sms'
      },
      apiKey: {
        type: String,
        trim: true,
        default: ''
      },
      senderId: {
        type: String,
        trim: true,
        default: 'APURVA'
      }
    },

    // 3. Delivery Handover OTP System
    handoverOtp: {
      enabled: {
        type: Boolean,
        default: true // Active by default to protect food delivery & cash collection
      },
      requireForCodOnly: {
        type: Boolean,
        default: false // If true, only COD orders require OTP
      },
      allowAdminBypass: {
        type: Boolean,
        default: true // Allows admin to override in emergency (e.g. customer phone battery died)
      }
    },

    // 4. Kitchen Silent Thermal Auto-Print
    silentPrint: {
      enabled: {
        type: Boolean,
        default: false // Disabled by default; togglable in Admin & KDS
      },
      copies: {
        type: Number,
        default: 1,
        min: 1,
        max: 3
      },
      printOnStatus: {
        type: String,
        enum: ['Pending', 'Preparing'],
        default: 'Preparing'
      }
    },

    // 5. Customer Digital Wallet & Cashback System
    customerWallet: {
      enabled: {
        type: Boolean,
        default: false // Disabled initially as requested by owner
      },
      cashbackPercentage: {
        type: Number,
        default: 5,
        min: 0,
        max: 50
      },
      cashbackTrigger: {
        type: String,
        enum: ['all_orders', 'prepaid_only'],
        default: 'all_orders'
      },
      maxUsagePercentage: {
        type: Number,
        default: 50, // Max 50% of order can be paid with wallet
        min: 1,
        max: 100
      }
    }
  },
  {
    timestamps: true
  }
);

/**
 * Singleton Pattern: Retrieve or initialize default feature settings
 */
featureSettingSchema.statics.getOrCreateSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

/**
 * Public Sanitized Projection (Strips private API keys)
 */
featureSettingSchema.methods.getPublicSettings = function () {
  return {
    handoverOtp: {
      enabled: this.handoverOtp.enabled,
      requireForCodOnly: this.handoverOtp.requireForCodOnly
    },
    silentPrint: {
      enabled: this.silentPrint.enabled,
      copies: this.silentPrint.copies,
      printOnStatus: this.silentPrint.printOnStatus
    },
    customerWallet: {
      enabled: this.customerWallet.enabled,
      cashbackPercentage: this.customerWallet.cashbackPercentage,
      cashbackTrigger: this.customerWallet.cashbackTrigger,
      maxUsagePercentage: this.customerWallet.maxUsagePercentage
    },
    whatsappAlerts: {
      enabled: this.whatsappAlerts.enabled
    },
    smsAlerts: {
      enabled: this.smsAlerts.enabled
    }
  };
};

module.exports = mongoose.model('FeatureSetting', featureSettingSchema);
