const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      enum: ['Home', 'Work', 'Other'],
      default: 'Home'
    },
    label: {
      type: String,
      trim: true,
      default: ''
    },
    contactNumber: {
      type: String,
      trim: true,
      default: ''
    },
    houseNo: {
      type: String,
      trim: true,
      default: ''
    },
    area: {
      type: String,
      trim: true,
      default: ''
    },
    landmark: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: 'Pathardewa'
    },
    state: {
      type: String,
      trim: true,
      default: 'Uttar Pradesh'
    },
    pincode: {
      type: String,
      trim: true,
      default: ''
    },
    formattedAddress: {
      type: String,
      required: [true, 'Formatted address is required'],
      trim: true
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    phone: {
      type: String,
      trim: true,
      sparse: true
    },

    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Exclude from queries by default
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'kitchen', 'driver'],
      default: 'customer'
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    addresses: [addressSchema],
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, 'Wallet balance cannot be negative']
    },
    walletHistory: [
      {
        amount: { type: Number, required: true },
        type: { type: String, enum: ['credit', 'debit'], required: true },
        reason: { type: String, default: '' },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
        date: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
