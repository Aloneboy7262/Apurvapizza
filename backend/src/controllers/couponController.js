const Coupon = require('../models/Coupon');

const DEFAULT_COUPONS = [
  {
    code: 'WELCOME50',
    description: 'Flat ₹50 OFF on orders above ₹249',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 249,
    isActive: true
  },
  {
    code: 'CRUST20',
    description: '20% OFF (up to ₹100) on orders above ₹399',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 399,
    maxDiscount: 100,
    isActive: true
  },
  {
    code: 'FEAST100',
    description: 'Flat ₹100 OFF on party orders above ₹699',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 699,
    isActive: true
  }
];

// Seed default coupons if collection empty
const seedDefaultCouponsIfEmpty = async () => {
  try {
    const count = await Coupon.countDocuments();
    if (count === 0) {
      await Coupon.insertMany(DEFAULT_COUPONS);
      console.log('[Coupons] Default promo codes seeded successfully!');
    }
  } catch (err) {
    console.warn('[Coupons] Seed warning:', err.message);
  }
};
seedDefaultCouponsIfEmpty();

/**
 * Public: Get all active coupons (filters out coupons that reached total limit or expired)
 */
const getActiveCoupons = async (req, res, next) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      $and: [
        {
          $or: [
            { totalUsageLimit: null },
            { totalUsageLimit: 0 },
            { totalUsageLimit: { $exists: false } },
            { $expr: { $lt: ['$usageCount', '$totalUsageLimit'] } }
          ]
        },
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $exists: false } },
            { expiryDate: { $gt: now } }
          ]
        }
      ]
    }).sort({ minOrderAmount: 1 });

    res.status(200).json({
      success: true,
      data: coupons
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public/Auth: Validate a coupon against subtotal, total limit, and per-user repeat limits
 */
const validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal, cartTotal, userId } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code.' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ success: false, message: `Coupon ${coupon.code} is currently disabled or inactive.` });
    }

    // Check expiry date
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({
        success: false,
        message: `Coupon ${coupon.code} expired on ${new Date(coupon.expiryDate).toLocaleDateString('en-IN')}.`
      });
    }

    // Check total customer limit across all users
    const hasTotalLimit = coupon.totalUsageLimit !== null && coupon.totalUsageLimit !== undefined && coupon.totalUsageLimit > 0;
    if (hasTotalLimit && (coupon.usageCount || 0) >= coupon.totalUsageLimit) {
      return res.status(400).json({
        success: false,
        message: `Coupon ${coupon.code} has expired (maximum total limit of ${coupon.totalUsageLimit} customer uses reached).`
      });
    }

    // Check per-user usage and repeat limits
    const resolvedUserId = req.user?._id || userId;
    let userUses = 0;
    if (resolvedUserId) {
      try {
        const Order = require('../models/Order');
        const userOrderCount = await Order.countDocuments({
          user: resolvedUserId,
          'coupon.code': coupon.code,
          status: { $ne: 'Cancelled' }
        });
        const usedByCount = Array.isArray(coupon.usedBy)
          ? coupon.usedBy.filter((u) => u.user && u.user.toString() === resolvedUserId.toString()).length
          : 0;
        userUses = Math.max(userOrderCount, usedByCount);

        // If repeat usage is not allowed: single use only per customer
        if (!coupon.allowRepeatUsage && userUses >= 1) {
          return res.status(400).json({
            success: false,
            message: `Coupon ${coupon.code} has already been used by your account. This is a single-use coupon and repeat usage is not allowed.`
          });
        }

        // If repeat is allowed, check maximum per-user limit
        if (coupon.allowRepeatUsage && coupon.maxUsagePerUser && userUses >= coupon.maxUsagePerUser) {
          return res.status(400).json({
            success: false,
            message: `You have reached the maximum limit (${coupon.maxUsagePerUser} uses) for coupon ${coupon.code}.`
          });
        }
      } catch (checkErr) {
        console.warn('[validateCoupon] User usage check warning:', checkErr.message);
      }
    }

    const orderSubtotal = Number(subtotal !== undefined ? subtotal : cartTotal) || 0;
    if (orderSubtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Add ₹${(coupon.minOrderAmount - orderSubtotal).toFixed(0)} more to apply ${coupon.code} (Min. Order ₹${coupon.minOrderAmount})`
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === 'flat') {
      discountAmount = Math.min(coupon.discountValue, orderSubtotal);
    } else if (coupon.discountType === 'percentage') {
      const calcDiscount = (orderSubtotal * coupon.discountValue) / 100;
      discountAmount = coupon.maxDiscount
        ? Math.min(calcDiscount, coupon.maxDiscount)
        : calcDiscount;
      discountAmount = Math.round(discountAmount);
    }

    res.status(200).json({
      success: true,
      message: `🎉 Coupon ${coupon.code} applied successfully! You saved ₹${discountAmount}.`,
      data: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount,
        discountAmount,
        finalSubtotal: Math.max(0, orderSubtotal - discountAmount),
        allowRepeatUsage: Boolean(coupon.allowRepeatUsage),
        maxUsagePerUser: coupon.maxUsagePerUser || 1,
        totalUsageLimit: coupon.totalUsageLimit || null,
        userUses,
        remainingUses: coupon.allowRepeatUsage && coupon.maxUsagePerUser
          ? Math.max(0, coupon.maxUsagePerUser - userUses)
          : (!coupon.allowRepeatUsage ? Math.max(0, 1 - userUses) : 'Unlimited')
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all coupons with full limit statistics
 */
const getAllCouponsAdmin = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: coupons
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create coupon with customer limits & repeat rules
 */
const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      totalUsageLimit,
      allowRepeatUsage,
      maxUsagePerUser,
      expiryDate,
      isActive
    } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({ success: false, message: 'Coupon code and discount value are required.' });
    }

    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Coupon '${code.trim().toUpperCase()}' already exists.` });
    }

    const isRepeatAllowed = Boolean(allowRepeatUsage);
    let resolvedMaxPerUser = 1;
    if (isRepeatAllowed) {
      resolvedMaxPerUser = maxUsagePerUser !== undefined && maxUsagePerUser !== null && maxUsagePerUser !== ''
        ? Math.max(1, Number(maxUsagePerUser))
        : null;
    }

    const resolvedTotalLimit = totalUsageLimit !== undefined && totalUsageLimit !== null && totalUsageLimit !== ''
      ? Math.max(1, Number(totalUsageLimit))
      : null;

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      description: description || `Save on orders above ₹${minOrderAmount || 0}`,
      discountType: discountType || 'flat',
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      totalUsageLimit: resolvedTotalLimit,
      allowRepeatUsage: isRepeatAllowed,
      maxUsagePerUser: resolvedMaxPerUser,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isActive: isActive !== false
    });

    res.status(201).json({
      success: true,
      message: `Coupon ${coupon.code} created successfully!`,
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update existing coupon
 */
const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      totalUsageLimit,
      allowRepeatUsage,
      maxUsagePerUser,
      expiryDate,
      isActive
    } = req.body;

    if (code && code.trim().toUpperCase() !== coupon.code) {
      const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: `Coupon code '${code.trim().toUpperCase()}' is already taken.` });
      }
      coupon.code = code.trim().toUpperCase();
    }

    if (description !== undefined) coupon.description = description.trim();
    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountValue !== undefined && !isNaN(Number(discountValue))) {
      coupon.discountValue = Number(discountValue);
    }
    if (minOrderAmount !== undefined) {
      coupon.minOrderAmount = Math.max(0, Number(minOrderAmount) || 0);
    }
    if (maxDiscount !== undefined) {
      coupon.maxDiscount = maxDiscount ? Math.max(0, Number(maxDiscount)) : null;
    }

    if (allowRepeatUsage !== undefined) {
      coupon.allowRepeatUsage = Boolean(allowRepeatUsage);
    }

    if (coupon.allowRepeatUsage) {
      if (maxUsagePerUser !== undefined && maxUsagePerUser !== null && maxUsagePerUser !== '') {
        coupon.maxUsagePerUser = Math.max(1, Number(maxUsagePerUser));
      } else {
        coupon.maxUsagePerUser = null; // Unlimited per user when repeat allowed and field empty
      }
    } else {
      coupon.maxUsagePerUser = 1; // Locked to 1 when repeat usage is disabled
    }

    if (totalUsageLimit !== undefined) {
      coupon.totalUsageLimit = totalUsageLimit !== null && totalUsageLimit !== ''
        ? Math.max(1, Number(totalUsageLimit))
        : null;
    }

    if (expiryDate !== undefined) {
      coupon.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }

    if (isActive !== undefined) {
      coupon.isActive = Boolean(isActive);
    }

    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.code} updated successfully!`,
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Toggle coupon active status
 */
const toggleCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }
    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.code} is now ${coupon.isActive ? 'Active' : 'Inactive'}`,
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete coupon
 */
const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }
    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.code} deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveCoupons,
  validateCoupon,
  getAllCouponsAdmin,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon
};
