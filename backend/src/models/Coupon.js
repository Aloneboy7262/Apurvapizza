const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    discountType: {
      type: String,
      enum: ['flat', 'percentage'],
      default: 'flat'
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [1, 'Discount value must be at least 1']
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative']
    },
    maxDiscount: {
      type: Number,
      default: null // for percentage discount cap
    },
    isActive: {
      type: Boolean,
      default: true
    },
    usageCount: {
      type: Number,
      default: 0
    },
    // Total usage limit across all customers (expires when N customers use it)
    totalUsageLimit: {
      type: Number,
      default: null, // null or 0 means unlimited total uses across all customers
      min: [0, 'Total usage limit cannot be negative']
    },
    // Whether the same customer can use this coupon repeatedly
    allowRepeatUsage: {
      type: Boolean,
      default: false // false: Single-use only per customer. true: Repeat allowed up to maxUsagePerUser
    },
    // Maximum times a single user/customer can use this coupon
    maxUsagePerUser: {
      type: Number,
      default: 1, // Default 1 (if allowRepeatUsage is false, effectively 1; if true, can be 2, 3, etc. or null for unlimited)
      min: [1, 'Max usage per user must be at least 1']
    },
    // Track each redemption with user ID and order ID
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        order: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order'
        },
        usedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    expiryDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
