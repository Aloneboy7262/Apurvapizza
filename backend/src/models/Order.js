const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      trim: true
    },
    size: {
      type: String,
      default: null // e.g. 'S: 6"', 'M: 9"', 'L: 11"'
    },
    toppings: {
      type: [String],
      default: []
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Item price cannot be negative']
    },
    isReady: {
      type: Boolean,
      default: false
    },
    customPizza: {
      isCustom: { type: Boolean, default: false },
      crust: { type: String, default: '' },
      sauce: { type: String, default: '' },
      mode: { type: String, enum: ['whole', 'half_half'], default: 'whole' },
      leftHalfToppings: { type: [String], default: [] },
      rightHalfToppings: { type: [String], default: [] },
      extraCheeseBurst: { type: Boolean, default: false }
    }
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user']
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Order must contain at least one item'
      }
    },
    itemsAmount: {
      type: Number,
      min: [0, 'Items amount cannot be negative'],
      default: 0
    },
    deliveryFee: {
      type: Number,
      min: [0, 'Delivery fee cannot be negative'],
      default: 0
    },
    platformFee: {
      type: Number,
      min: [0, 'Platform fee cannot be negative'],
      default: 5
    },
    isFreeDelivery: {
      type: Boolean,
      default: true
    },
    deliveryDistance: {
      type: Number,
      min: [0, 'Distance cannot be negative'],
      default: 0
    },
    orderType: {
      type: String,
      enum: ['delivery', 'dine_in', 'takeaway'],
      default: 'delivery'
    },
    tableNumber: {
      type: String,
      trim: true,
      default: ''
    },
    customerCoords: {
      latitude: {
        type: Number,
        required: function () {
          return !this.orderType || this.orderType === 'delivery';
        }
      },
      longitude: {
        type: Number,
        required: function () {
          return !this.orderType || this.orderType === 'delivery';
        }
      },
      accuracy: {
        type: Number,
        default: null
      }
    },
    riderLiveCoords: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null }
    },
    deliveryLocationName: {
      type: String,
      trim: true,
      default: ''
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    status: {
      type: String,
      enum: ['Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Pending'
    },
    rider: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      name: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
      assignedAt: { type: Date, default: null }
    },
    cancellationReason: {
      type: String,
      default: '',
      trim: true
    },
    cancelledBy: {
      type: String,
      default: '',
      trim: true
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    scheduledFor: {
      type: String,
      default: 'ASAP' // 'ASAP' or 'Today, 8:30 PM'
    },
    coupon: {
      code: { type: String, default: '', uppercase: true, trim: true },
      discountAmount: { type: Number, default: 0 }
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'upi', 'razorpay', 'online'],
      default: 'cod'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending'
    },
    paymentDetails: {
      transactionId: { type: String, default: '', trim: true },
      utrNumber: { type: String, default: '', trim: true },
      gatewayOrderId: { type: String, default: '', trim: true },
      gatewayPaymentId: { type: String, default: '', trim: true },
      gatewaySignature: { type: String, default: '', trim: true },
      paidAt: { type: Date, default: null },
      paymentVerifiedBy: { type: String, default: '', trim: true },
      paymentNotes: { type: String, default: '', trim: true }
    },
    customerNote: {
      type: String,
      trim: true,
      default: ''
    },
    deliveryAddress: {
      type: String,
      trim: true,
      default: ''
    },
    deliveryPhone: {
      type: String,
      trim: true,
      default: ''
    },
    deliveryOtp: {
      type: String,
      trim: true,
      default: ''
    },
    otpVerifiedAt: {
      type: Date,
      default: null
    },
    walletAmountDeducted: {
      type: Number,
      default: 0,
      min: [0, 'Wallet amount cannot be negative']
    },
    cashbackAwarded: {
      type: Number,
      default: 0,
      min: [0, 'Cashback amount cannot be negative']
    },
    codSettled: {
      type: Boolean,
      default: false
    },
    codSettledAt: {
      type: Date,
      default: null
    },
    codSettledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    taxDetails: {
      cgstRate: { type: Number, default: 2.5 },
      sgstRate: { type: Number, default: 2.5 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster lookups in KDS and admin dashboard
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
