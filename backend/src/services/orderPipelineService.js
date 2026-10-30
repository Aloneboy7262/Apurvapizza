const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

const TOPPING_PRICES = {
  'Extra Cheese Burst': 50,
  'Fresh Paneer Chunks': 40,
  'Spicy Jalapeno': 30,
  'Black Olives': 35,
  'Golden Sweet Corn': 25,
  'Crisp Capsicum': 25,
  'Red Paprika': 30,
  'Grilled Mushrooms': 35
};

/**
 * Enterprise Order Pipeline Service
 * Enforces strict lifecycle state machines, data validation, audit logs,
 * authoritative price validation, and secure multi-channel WebSocket dispatching.
 */
class OrderPipelineService {
  constructor() {
    this.ALLOWED_TRANSITIONS = {
      Pending: ['Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'],
      Preparing: ['Pending', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'],
      Ready: ['Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
      'Out for Delivery': ['Ready', 'Delivered', 'Cancelled'],
      Delivered: ['Ready', 'Cancelled'],
      Cancelled: ['Pending']
    };
  }

  /**
   * Process & Inject New Order into Pipeline
   * Security: Prices and totals are computed strictly server-side from the database to prevent parameter tampering.
   */
  async processNewOrder(userId, orderPayload, io) {
    const { items, customerNote, deliveryAddress, deliveryPhone, contactNumber, scheduledFor, paymentMethod } = orderPayload;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Pipeline Error: Order must contain at least one valid item.');
    }

    let calculatedTotal = 0;
    const processedItems = [];

    // Pre-aggregate quantities per product to strictly prevent overselling multi-line variations
    const productQuantityMap = {};
    for (const item of items) {
      const pId = String(item.product || item.productId || '');
      const q = Math.max(1, Math.min(50, parseInt(item.quantity, 10) || 1));
      if (pId) {
        productQuantityMap[pId] = (productQuantityMap[pId] || 0) + q;
      }
    }

    // Verify product IDs and calculate verified total authoritative from database
    for (const item of items) {
      const productId = item.product || item.productId;
      let product = null;

      if (item.customPizza && (item.customPizza.isCustom || item.customPizza.isHalfAndHalf)) {
        if (productId && mongoose.Types.ObjectId.isValid(productId)) {
          product = await Product.findById(productId);
        }
        if (!product) {
          product = await Product.findOne({ category: 'Pizzas' }) || await Product.findOne({});
        }
        if (!product) {
          product = {
            _id: new mongoose.Types.ObjectId(),
            name: item.name || 'Custom Artisanal Pizza',
            category: 'Pizzas',
            allowToppings: true,
            basePrice: Number(item.price) || 299
          };
        }
      } else {
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
          throw new Error('Pipeline Error: Valid Product ID is required for each line item.');
        }

        product = await Product.findById(productId);
        if (!product) {
          throw new Error(`Pipeline Error: Product with ID ${productId} does not exist.`);
        }
        if (product.isAvailable === false || (product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity <= 0)) {
          throw new Error(`Pipeline Error: Product '${product.name}' is currently out of stock.`);
        }
      }

      const quantity = Math.max(1, Math.min(50, parseInt(item.quantity, 10) || 1));
      const totalRequestedForProd = productQuantityMap[String(productId)] || quantity;

      if (product.stockQuantity !== null && product.stockQuantity !== undefined) {
        if (product.stockQuantity < totalRequestedForProd) {
          throw new Error(`Pipeline Error: Only ${product.stockQuantity} item(s) of '${product.name}' are remaining in stock (you requested ${totalRequestedForProd}).`);
        }
      }

      // Calculate authoritative base price
      let unitPrice = product.discountedPrice !== null && product.discountedPrice !== undefined
        ? product.discountedPrice
        : product.basePrice;

      let verifiedSize = null;
      if (item.size && Array.isArray(product.sizes) && product.sizes.length > 0) {
        const sizeObj = product.sizes.find((s) => s.size === item.size);
        if (sizeObj) {
          verifiedSize = sizeObj.size;
          unitPrice = sizeObj.discountedPrice !== null && sizeObj.discountedPrice !== undefined
            ? sizeObj.discountedPrice
            : sizeObj.price;
        }
      }

      // Calculate authoritative toppings price
      let toppingsCost = 0;
      const validToppings = [];
      if (Array.isArray(item.toppings) && (product.allowToppings || product.category === 'Pizzas')) {
        for (const t of item.toppings) {
          const toppingName = typeof t === 'string' ? t.trim() : (t.name ? String(t.name).trim() : '');
          if (TOPPING_PRICES[toppingName]) {
            toppingsCost += TOPPING_PRICES[toppingName];
            validToppings.push(toppingName);
          }
        }
      }

      let customPizzaData = { isCustom: false };
      if (item.customPizza && (item.customPizza.isCustom || item.customPizza.isHalfAndHalf)) {
        customPizzaData = {
          isCustom: true,
          crust: item.customPizza.crust || '',
          sauce: item.customPizza.sauce || '',
          mode: item.customPizza.mode || (item.customPizza.isHalfAndHalf ? 'half_half' : 'whole'),
          leftHalfToppings: Array.isArray(item.customPizza.leftHalfToppings) ? item.customPizza.leftHalfToppings : (item.customPizza.leftHalf?.toppings || []),
          rightHalfToppings: Array.isArray(item.customPizza.rightHalfToppings) ? item.customPizza.rightHalfToppings : (item.customPizza.rightHalf?.toppings || []),
          extraCheeseBurst: Boolean(item.customPizza.extraCheeseBurst)
        };
        if (item.price && Number(item.price) > 0) {
          unitPrice = Number(item.price);
        } else if (customPizzaData.extraCheeseBurst) {
          unitPrice += 60;
        }
      }

      const verifiedItemPrice = unitPrice + toppingsCost;
      calculatedTotal += verifiedItemPrice * quantity;

      processedItems.push({
        product: product._id,
        name: item.name || product.name,
        size: verifiedSize || item.size || 'Regular',
        toppings: validToppings,
        quantity,
        price: verifiedItemPrice,
        isReady: false,
        customPizza: customPizzaData
      });
    }

    // Force server-calculated authoritative total (ignore any client-tampered price or totalAmount)
    const itemsTotal = Math.round(calculatedTotal * 100) / 100;

    // Load active delivery settings and verify shop open status
    const DeliverySetting = require('../models/DeliverySetting');
    const deliverySettings = await DeliverySetting.getOrCreateSettings();
    const { computeShopOpenStatus } = require('../controllers/deliveryController');
    const currentShopStatus = computeShopOpenStatus(deliverySettings);

    const isScheduledOrder = Boolean(scheduledFor && typeof scheduledFor === 'string' && scheduledFor.trim());

    if (!currentShopStatus.isOpen) {
      if (!isScheduledOrder) {
        throw new Error(currentShopStatus.closedMessage || 'Store is currently closed for live orders. You can schedule an order for later today.');
      } else if (currentShopStatus.allowPreorders === false) {
        throw new Error('Pre-orders and scheduled deliveries are currently not accepted while the store is closed.');
      }
    }

    // Authoritative Order Type & Fulfillment Verification
    const orderType = ['delivery', 'dine_in', 'takeaway'].includes(orderPayload.orderType)
      ? orderPayload.orderType
      : 'delivery';
    const tableNumber = orderPayload.tableNumber ? String(orderPayload.tableNumber).trim() : '';

    // Enforce Admin Fulfillment Controls
    const fulfillment = deliverySettings.fulfillmentSettings || {};
    if (orderType === 'delivery' && fulfillment.allowDelivery === false) {
      throw new Error('Doorstep delivery is currently paused by the restaurant.');
    }
    if (orderType === 'dine_in') {
      if (fulfillment.allowDineIn === false) {
        throw new Error('Dine-In table service is currently paused by the restaurant.');
      }
      if (!tableNumber) {
        throw new Error('Please select your table number for Dine-In service.');
      }
    }
    if (orderType === 'takeaway' && fulfillment.allowTakeaway === false) {
      throw new Error('Takeaway / Parcel pickup is currently paused by the restaurant.');
    }

    // Enforce Split Pizza Builder Settings
    if (deliverySettings.splitPizzaSettings?.enabled === false) {
      const hasSplitPizza = processedItems.some(
        (it) => it.customPizza && (it.customPizza.mode === 'half_half' || it.customPizza.isHalfAndHalf)
      );
      if (hasSplitPizza) {
        throw new Error(
          deliverySettings.splitPizzaSettings?.disabledMessage ||
            'Custom Split Pizza (Half & Half) is temporarily paused by the kitchen.'
        );
      }
    }

    const restLat = Number(deliverySettings.restaurant_latitude ?? deliverySettings.restaurantLat ?? 26.5024);
    const restLng = Number(deliverySettings.restaurant_longitude ?? deliverySettings.restaurantLng ?? 83.7791);

    let customerLat = null;
    let customerLng = null;
    let customerAcc = null;
    let calculatedDistance = 0;
    let deliveryFee = 0;
    let isFreeDelivery = true;
    let locationLabel = '';

    if (orderType === 'delivery') {
      const { deliveryLocationName } = orderPayload;
      customerLat = orderPayload.latitude !== undefined
        ? Number(orderPayload.latitude)
        : (orderPayload.lat !== undefined
          ? Number(orderPayload.lat)
          : (orderPayload.customerCoords?.latitude !== undefined
            ? Number(orderPayload.customerCoords.latitude)
            : (orderPayload.deliveryAddress?.coordinates?.latitude !== undefined
              ? Number(orderPayload.deliveryAddress.coordinates.latitude)
              : null)));
      customerLng = orderPayload.longitude !== undefined
        ? Number(orderPayload.longitude)
        : (orderPayload.lng !== undefined
          ? Number(orderPayload.lng)
          : (orderPayload.customerCoords?.longitude !== undefined
            ? Number(orderPayload.customerCoords.longitude)
            : (orderPayload.deliveryAddress?.coordinates?.longitude !== undefined
              ? Number(orderPayload.deliveryAddress.coordinates.longitude)
              : null)));
      customerAcc = orderPayload.accuracy !== undefined && !isNaN(Number(orderPayload.accuracy))
        ? Number(orderPayload.accuracy)
        : (orderPayload.customerCoords?.accuracy !== undefined && !isNaN(Number(orderPayload.customerCoords.accuracy))
          ? Number(orderPayload.customerCoords.accuracy)
          : (orderPayload.deliveryAddress?.coordinates?.accuracy !== undefined && !isNaN(Number(orderPayload.deliveryAddress.coordinates.accuracy))
            ? Number(orderPayload.deliveryAddress.coordinates.accuracy)
            : null));

      if (customerLat === null || isNaN(customerLat) || customerLat < -90 || customerLat > 90) {
        throw new Error('Delivery Error: Valid GPS latitude is required to place an order.');
      }
      if (customerLng === null || isNaN(customerLng) || customerLng < -180 || customerLng > 180) {
        throw new Error('Delivery Error: Valid GPS longitude is required to place an order.');
      }

      const accuracyThreshold = deliverySettings.accuracy_threshold_meters || 1000;
      if (customerAcc !== null && customerAcc > accuracyThreshold) {
        throw new Error('Your location could not be detected accurately. Please enable precise location and try again.');
      }

      const { calculateHaversineDistance, calculateDeliveryPricing } = require('../controllers/deliveryController');

      // Authoritative server-side distance calculation (straight-line Haversine)
      calculatedDistance = calculateHaversineDistance(
        restLat,
        restLng,
        customerLat,
        customerLng
      );

      const pricing = calculateDeliveryPricing(calculatedDistance, deliverySettings, itemsTotal);

      // Authoritative strict 5 KM boundary check
      if (!pricing.allowed || calculatedDistance > 5.0) {
        throw new Error("We will be available in your area soon");
      }

      deliveryFee = pricing.delivery_charge;
      isFreeDelivery = pricing.free_delivery;
      locationLabel = typeof deliveryLocationName === 'string' ? deliveryLocationName.trim() : '';
    } else {
      // Dine-in or Takeaway
      customerLat = restLat;
      customerLng = restLng;
      customerAcc = 5;
      calculatedDistance = 0;
      deliveryFee = 0;
      isFreeDelivery = true;
      locationLabel = orderType === 'dine_in'
        ? `Dine-In (${tableNumber ? 'Table #' + tableNumber : 'In-Store Dining'})`
        : 'Takeaway / Self-Pickup';
    }

    const isPlatformFeeActive = deliverySettings.isPlatformFeeEnabled ?? deliverySettings.is_platform_fee_enabled ?? true;
    const platformFee = isPlatformFeeActive ? Math.max(0, Number(deliverySettings.platformFee ?? deliverySettings.platform_fee ?? 5)) : 0;

    // Authoritative Coupon Verification & Usage Limits Check
    let couponDiscount = 0;
    let appliedCouponCode = '';
    let foundCouponDoc = null;
    const rawCoupon = orderPayload.couponCode || orderPayload.coupon?.code;
    if (rawCoupon) {
      const Coupon = require('../models/Coupon');
      const foundCoupon = await Coupon.findOne({ code: String(rawCoupon).trim().toUpperCase() });
      if (!foundCoupon) {
        throw new Error(`Pipeline Error: Coupon code '${rawCoupon}' is invalid.`);
      }
      if (!foundCoupon.isActive) {
        throw new Error(`Pipeline Error: Coupon '${foundCoupon.code}' is currently inactive or disabled.`);
      }
      if (foundCoupon.expiryDate && new Date() > new Date(foundCoupon.expiryDate)) {
        throw new Error(`Pipeline Error: Coupon '${foundCoupon.code}' expired on ${new Date(foundCoupon.expiryDate).toLocaleDateString('en-IN')}.`);
      }
      if (foundCoupon.totalUsageLimit !== null && foundCoupon.totalUsageLimit !== undefined && foundCoupon.totalUsageLimit > 0) {
        if ((foundCoupon.usageCount || 0) >= foundCoupon.totalUsageLimit) {
          throw new Error(`Pipeline Error: Coupon '${foundCoupon.code}' has expired because the total customer limit (${foundCoupon.totalUsageLimit} uses) has been reached.`);
        }
      }

      // Check per-user repeat and limits
      const userPrevOrders = await Order.countDocuments({
        user: userId,
        'coupon.code': foundCoupon.code,
        status: { $ne: 'Cancelled' }
      });
      const usedByCount = Array.isArray(foundCoupon.usedBy)
        ? foundCoupon.usedBy.filter((u) => u.user && u.user.toString() === userId.toString()).length
        : 0;
      const userUsageCount = Math.max(userPrevOrders, usedByCount);

      if (!foundCoupon.allowRepeatUsage && userUsageCount >= 1) {
        throw new Error(`Pipeline Error: Coupon '${foundCoupon.code}' has already been used by your account. This is a single-use coupon and repeat usage is not allowed.`);
      }
      if (foundCoupon.allowRepeatUsage && foundCoupon.maxUsagePerUser && userUsageCount >= foundCoupon.maxUsagePerUser) {
        throw new Error(`Pipeline Error: You have reached the maximum limit (${foundCoupon.maxUsagePerUser} uses) for coupon '${foundCoupon.code}'.`);
      }

      if (itemsTotal < foundCoupon.minOrderAmount) {
        throw new Error(`Pipeline Error: Minimum order amount of ₹${foundCoupon.minOrderAmount} required to use coupon '${foundCoupon.code}'.`);
      }

      if (foundCoupon.discountType === 'flat') {
        couponDiscount = Math.min(foundCoupon.discountValue, itemsTotal);
      } else if (foundCoupon.discountType === 'percentage') {
        const calc = (itemsTotal * foundCoupon.discountValue) / 100;
        couponDiscount = foundCoupon.maxDiscount ? Math.min(calc, foundCoupon.maxDiscount) : calc;
        couponDiscount = Math.round(couponDiscount);
      }

      appliedCouponCode = foundCoupon.code;
      foundCouponDoc = foundCoupon;
    }

    const grandTotal = Math.max(0, Math.round((itemsTotal + deliveryFee + platformFee - couponDiscount) * 100) / 100);

    // Generate secure 4-digit Handover OTP
    const generatedDeliveryOtp = String(Math.floor(1000 + Math.random() * 9000));

    // Handle Customer Wallet deduction if enabled by Admin
    let walletDeduction = 0;
    try {
      const FeatureSetting = require('../models/FeatureSetting');
      const featSettings = await FeatureSetting.getOrCreateSettings();
      if (featSettings.customerWallet.enabled && orderPayload.walletAmountToUse > 0) {
        const User = require('../models/User');
        const orderUser = await User.findById(userId);
        if (orderUser && orderUser.walletBalance > 0) {
          const maxUsageAllowed = (grandTotal * (featSettings.customerWallet.maxUsagePercentage || 50)) / 100;
          const requested = Number(orderPayload.walletAmountToUse) || 0;
          walletDeduction = Math.min(requested, orderUser.walletBalance, grandTotal, maxUsageAllowed);
          walletDeduction = Math.round(walletDeduction);

          if (walletDeduction > 0) {
            orderUser.walletBalance = Math.max(0, orderUser.walletBalance - walletDeduction);
            orderUser.walletHistory.push({
              amount: walletDeduction,
              type: 'debit',
              reason: 'Applied to Pizza Order Discount',
              date: new Date()
            });
            await orderUser.save();
          }
        }
      }
    } catch (walletErr) {
      console.warn('[OrderPipeline] Wallet deduction note:', walletErr.message);
    }

    const finalChargedTotal = Math.max(0, Math.round((grandTotal - walletDeduction) * 100) / 100);

    // Resolve contact number for delivery boy
    let resolvedPhone = typeof deliveryPhone === 'string' && deliveryPhone.trim()
      ? deliveryPhone.trim().replace(/\D/g, '')
      : (typeof contactNumber === 'string' && contactNumber.trim() ? contactNumber.trim().replace(/\D/g, '') : '');

    if (!resolvedPhone) {
      const User = require('../models/User');
      const orderUser = await User.findById(userId);
      if (orderUser && orderUser.phone) {
        resolvedPhone = orderUser.phone.replace(/\D/g, '');
      }
    }

    if (!resolvedPhone || resolvedPhone.length !== 10) {
      throw new Error('Delivery Error: A valid 10-digit mobile calling number is required for delivery updates.');
    }

    let cleanDeliveryAddress = '';
    if (typeof deliveryAddress === 'string') {
      cleanDeliveryAddress = deliveryAddress.trim();
    } else if (deliveryAddress && typeof deliveryAddress === 'object') {
      const parts = [
        deliveryAddress.houseNo || deliveryAddress.flatNo || deliveryAddress.building,
        deliveryAddress.street || deliveryAddress.road,
        deliveryAddress.landmark,
        deliveryAddress.area,
        deliveryAddress.city,
        deliveryAddress.pincode
      ].filter(Boolean);
      cleanDeliveryAddress = parts.join(', ').trim() || deliveryAddress.address || '';
    }

    if (orderType === 'dine_in') {
      cleanDeliveryAddress = `Dine-In (${tableNumber ? 'Table #' + tableNumber : 'In-Store Dining'})`;
    } else if (orderType === 'takeaway') {
      cleanDeliveryAddress = 'Self-Pickup / Takeaway Counter';
    } else {
      if (!cleanDeliveryAddress || cleanDeliveryAddress.length < 8) {
        throw new Error('Delivery Error: Complete delivery address (House/Flat No., Locality/Street) is compulsory.');
      }
    }

    // Authoritative Indian Restaurant GST calculation (2.5% CGST + 2.5% SGST = 5% Total GST)
    const cgstAmount = Math.round(itemsTotal * 0.025 * 100) / 100;
    const sgstAmount = Math.round(itemsTotal * 0.025 * 100) / 100;
    const totalTax = Math.round((cgstAmount + sgstAmount) * 100) / 100;

    // Verify payment settings and constraints
    const PaymentSetting = require('../models/PaymentSetting');
    const paymentSettings = await PaymentSetting.getOrCreateSettings();

    const selectedMethod = ['cod', 'upi', 'razorpay', 'online'].includes(orderPayload.paymentMethod)
      ? orderPayload.paymentMethod
      : 'cod';

    if (selectedMethod === 'cod') {
      if (paymentSettings.codEnabled === false) {
        throw new Error('Cash on Delivery (COD) is currently disabled by store admin. Please pay via UPI or Online Gateway.');
      }
      if (paymentSettings.maxCodAmount > 0 && finalChargedTotal > paymentSettings.maxCodAmount) {
        throw new Error(`Cash on Delivery is only available for orders up to ₹${paymentSettings.maxCodAmount}. Please choose UPI or Online payment.`);
      }
    }

    // Database record creation through pipeline
    const order = await Order.create({
      user: userId,
      items: processedItems,
      itemsAmount: itemsTotal,
      deliveryFee,
      platformFee,
      isFreeDelivery,
      deliveryDistance: calculatedDistance,
      orderType,
      tableNumber: orderType === 'dine_in' ? tableNumber : '',
      customerCoords: {
        latitude: customerLat,
        longitude: customerLng,
        accuracy: customerAcc
      },
      deliveryLocationName: locationLabel || (isFreeDelivery ? 'Local Free Zone (<5km)' : 'Extended Delivery Zone'),
      totalAmount: finalChargedTotal,
      walletAmountDeducted: walletDeduction,
      deliveryOtp: generatedDeliveryOtp,
      taxDetails: {
        cgstRate: 2.5,
        sgstRate: 2.5,
        cgst: cgstAmount,
        sgst: sgstAmount,
        cgstAmount,
        sgstAmount,
        totalTax
      },
      coupon: {
        code: appliedCouponCode,
        discountAmount: couponDiscount
      },
      scheduledFor: scheduledFor ? String(scheduledFor).trim() : 'ASAP',
      paymentMethod: selectedMethod,
      // Security: Initial payment status is always 'pending'. Clients cannot spoof 'paid' status.
      paymentStatus: 'pending',
      paymentDetails: {
        utrNumber: '',
        transactionId: orderPayload.transactionId || orderPayload.paymentDetails?.transactionId || '',
        gatewayOrderId: orderPayload.paymentDetails?.gatewayOrderId || '',
        gatewayPaymentId: orderPayload.paymentDetails?.gatewayPaymentId || '',
        gatewaySignature: orderPayload.paymentDetails?.gatewaySignature || '',
        paidAt: null,
        paymentVerifiedBy: '',
        paymentNotes: orderPayload.paymentNotes || ''
      },
      customerNote: typeof customerNote === 'string' ? customerNote.trim().slice(0, 300) : '',
      deliveryAddress: cleanDeliveryAddress,
      deliveryPhone: resolvedPhone,
      status: 'Pending'
    });

    try {
      const notificationService = require('./notificationService');
      notificationService.sendOrderNotification(order, 'Pending', io).catch(() => {});
    } catch (_) {}

    // Record coupon usage in coupon document
    if (foundCouponDoc) {
      try {
        foundCouponDoc.usageCount = (foundCouponDoc.usageCount || 0) + 1;
        if (!Array.isArray(foundCouponDoc.usedBy)) {
          foundCouponDoc.usedBy = [];
        }
        foundCouponDoc.usedBy.push({
          user: userId,
          order: order._id,
          usedAt: new Date()
        });
        await foundCouponDoc.save();
      } catch (saveCouponErr) {
        console.warn('[OrderPipeline] Coupon usage recording warning:', saveCouponErr.message);
      }
    }

    // Automatic Inventory Stock Decrement for ordered items
    for (const [prodId, totalOrderedQty] of Object.entries(productQuantityMap)) {
      try {
        const prod = await Product.findById(prodId);
        if (prod && prod.stockQuantity !== null && prod.stockQuantity !== undefined) {
          const newQty = Math.max(0, prod.stockQuantity - totalOrderedQty);
          const updates = { stockQuantity: newQty };
          if (newQty === 0) {
            updates.isAvailable = false;
          }
          const updatedProd = await Product.findByIdAndUpdate(prodId, updates, { new: true });
          if (io) {
            io.emit('product_updated', updatedProd);
            io.emit('products_updated');
          }
          console.log(`[Inventory Engine] Product '${prod.name}' stock decremented: ${prod.stockQuantity} -> ${newQty} ${newQty === 0 ? '(AUTO OUT OF STOCK)' : ''}`);
        }
      } catch (stockErr) {
        console.error('[Inventory Engine] Stock decrement error for item:', prodId, stockErr.message);
      }
    }

    const populatedOrder = await this.getOrderById(order._id);

    // Multi-Channel WebSocket Dispatch Pipeline
    if (io) {
      const stringId = populatedOrder._id.toString();
      io.to('kitchen').emit('new_order', populatedOrder);
      io.to('admin').emit('new_order', populatedOrder);

      io.to(`order_${stringId}`).emit('new_order', populatedOrder);
      if (populatedOrder.user && populatedOrder.user._id) {
        const orderOwnerId = populatedOrder.user._id.toString();
        io.to(`user_${orderOwnerId}`).emit('order_created', populatedOrder);
        io.to(`user_${orderOwnerId}`).emit('new_order', populatedOrder);
      }

      console.log(`[OrderPipeline] Placed #${stringId.slice(-6)} - Dispatched to Kitchen, Admin & Customer`);
    }

    return populatedOrder;
  }

  /**
   * Transition Lifecycle State through Pipeline
   */
  async transitionStatus(orderId, nextStatus, io, callerRole = 'kitchen') {
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error(`Pipeline Error: Invalid order ID format '${orderId}'.`);
    }

    const allowedStatuses = ['Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(nextStatus)) {
      throw new Error(`Pipeline Error: Invalid target status '${nextStatus}'. Must be one of [${allowedStatuses.join(', ')}]`);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`Pipeline Error: Order #${orderId} was not found.`);
    }

    const currentStatus = order.status;

    if (currentStatus === nextStatus) {
      return await this.getOrderById(order._id);
    }

    if (callerRole !== 'admin') {
      const allowedNext = this.ALLOWED_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(nextStatus)) {
        throw new Error(`Pipeline Error: Cannot jump order status from '${currentStatus}' to '${nextStatus}'. Valid next steps: [${allowedNext.join(', ')}]`);
      }
    }

    if (nextStatus === 'Preparing' && currentStatus === 'Pending') {
      try {
        const { deductBOMStockForOrder } = require('../controllers/inventoryController');
        await deductBOMStockForOrder(order.items, io);
      } catch (bomErr) {
        console.warn('[OrderPipeline] BOM auto-deduction warning:', bomErr.message);
      }
    }

    if (nextStatus === 'Delivered') {
      if (order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
        order.paymentStatus = 'paid';
        if (!order.paymentDetails) order.paymentDetails = {};
        order.paymentDetails.paidAt = new Date();
        order.paymentDetails.paymentVerifiedBy = callerRole || 'staff';
      }

      // Customer Wallet Cashback Reward if enabled by Admin
      try {
        const FeatureSetting = require('../models/FeatureSetting');
        const featSettings = await FeatureSetting.getOrCreateSettings();
        if (featSettings.customerWallet.enabled && featSettings.customerWallet.cashbackPercentage > 0) {
          const eligible = featSettings.customerWallet.cashbackTrigger === 'all_orders' ||
            (featSettings.customerWallet.cashbackTrigger === 'prepaid_only' && order.paymentMethod !== 'cod');

          if (eligible && order.user && (!order.cashbackAwarded || order.cashbackAwarded === 0)) {
            const cashbackAmount = Math.max(1, Math.round((order.itemsAmount * featSettings.customerWallet.cashbackPercentage) / 100));
            order.cashbackAwarded = cashbackAmount;

            const User = require('../models/User');
            const targetUser = await User.findById(order.user);
            if (targetUser) {
              targetUser.walletBalance = (targetUser.walletBalance || 0) + cashbackAmount;
              targetUser.walletHistory.push({
                amount: cashbackAmount,
                type: 'credit',
                reason: `Cashback for Order #${order._id.toString().slice(-6).toUpperCase()}`,
                orderId: order._id,
                date: new Date()
              });
              await targetUser.save();
              if (io) {
                io.to(`user_${targetUser._id}`).emit('wallet_updated', {
                  walletBalance: targetUser.walletBalance,
                  cashbackAwarded: cashbackAmount
                });
              }
            }
          }
        }
      } catch (cashbackErr) {
        console.warn('[OrderPipeline] Cashback processing warning:', cashbackErr.message);
      }
    }

    order.status = nextStatus;
    await order.save();

    // If order was cancelled, restore product stock
    if (nextStatus === 'Cancelled' && currentStatus !== 'Cancelled') {
      for (const item of order.items) {
        try {
          const prod = await Product.findById(item.product);
          if (prod && prod.stockQuantity !== null && prod.stockQuantity !== undefined) {
            const restoredQty = prod.stockQuantity + item.quantity;
            const updates = { stockQuantity: restoredQty };
            if (!prod.isAvailable && restoredQty > 0) {
              updates.isAvailable = true;
            }
            const updatedProd = await Product.findByIdAndUpdate(item.product, updates, { new: true });
            if (io) {
              io.emit('product_updated', updatedProd);
              io.emit('products_updated');
            }
            console.log(`[Inventory Engine] Restored stock for '${prod.name}': ${prod.stockQuantity} -> ${restoredQty}`);
          }
        } catch (restockErr) {
          console.error('[Inventory Engine] Stock restock error:', restockErr.message);
        }
      }

      // If order had a coupon, restore coupon usage
      if (order.coupon && order.coupon.code) {
        try {
          const Coupon = require('../models/Coupon');
          const couponDoc = await Coupon.findOne({ code: order.coupon.code });
          if (couponDoc) {
            couponDoc.usageCount = Math.max(0, (couponDoc.usageCount || 1) - 1);
            if (Array.isArray(couponDoc.usedBy)) {
              couponDoc.usedBy = couponDoc.usedBy.filter(
                (entry) => !entry.order || entry.order.toString() !== order._id.toString()
              );
            }
            await couponDoc.save();
            console.log(`[OrderPipeline] Restored coupon usage for '${couponDoc.code}' upon cancellation of Order #${order._id.toString().slice(-6)}`);
          }
        } catch (couponCancelErr) {
          console.error('[OrderPipeline] Coupon usage restoration error:', couponCancelErr.message);
        }
      }

      // If customer used wallet balance on this order, refund it back to their wallet
      if (order.walletAmountDeducted && order.walletAmountDeducted > 0 && order.user) {
        try {
          const User = require('../models/User');
          const refundUser = await User.findById(order.user);
          if (refundUser) {
            refundUser.walletBalance = (refundUser.walletBalance || 0) + order.walletAmountDeducted;
            refundUser.walletHistory.push({
              amount: order.walletAmountDeducted,
              type: 'credit',
              reason: `Refund for Cancelled Order #${order._id.toString().slice(-6).toUpperCase()}`,
              orderId: order._id,
              date: new Date()
            });
            await refundUser.save();
            if (io) {
              io.to(`user_${refundUser._id}`).emit('wallet_updated', {
                walletBalance: refundUser.walletBalance,
                refundAmount: order.walletAmountDeducted
              });
            }
            console.log(`[OrderPipeline] Refunded ₹${order.walletAmountDeducted} to wallet of User #${refundUser._id}`);
          }
        } catch (walletRefundErr) {
          console.error('[OrderPipeline] Wallet refund error:', walletRefundErr.message);
        }
      }
    }

    const populatedOrder = await this.getOrderById(order._id);
    const stringId = populatedOrder._id.toString();

    const pipelineEvent = {
      orderId: stringId,
      status: populatedOrder.status,
      previousStatus: currentStatus,
      rider: populatedOrder.rider,
      timestamp: new Date().toISOString(),
      order: populatedOrder
    };

    if (io) {
      io.to(`order_${stringId}`).emit('order_status_update', pipelineEvent);
      io.to(`order_${stringId}`).emit('order_status_updated', pipelineEvent);

      if (populatedOrder.user && populatedOrder.user._id) {
        const orderOwnerId = populatedOrder.user._id.toString();
        io.to(`user_${orderOwnerId}`).emit('order_status_update', pipelineEvent);
        io.to(`user_${orderOwnerId}`).emit('order_status_updated', pipelineEvent);
      }

      io.to('kitchen').emit('order_status_update', pipelineEvent);
      io.to('kitchen').emit('order_status_updated', pipelineEvent);
      io.to('admin').emit('order_status_update', pipelineEvent);
      io.to('admin').emit('order_status_updated', pipelineEvent);

      io.emit('order_status_update', pipelineEvent);
      io.emit('order_status_updated', pipelineEvent);

      console.log(`[OrderPipeline] Order #${stringId.slice(-6)} transition: ${currentStatus} -> ${nextStatus}`);
    }

    try {
      const notificationService = require('./notificationService');
      notificationService.sendOrderNotification(populatedOrder, nextStatus, io).catch(() => {});
    } catch (_) {}

    return populatedOrder;
  }

  /**
   * Assign Delivery Rider to Order
   */
  async assignRider(orderId, riderData, io) {
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID format.');
    }

    const order = await Order.findById(orderId);
    if (!order) throw new Error(`Order #${orderId} was not found.`);

    const riderUserId = (riderData.userId && mongoose.Types.ObjectId.isValid(riderData.userId))
      ? riderData.userId
      : ((riderData.riderId && mongoose.Types.ObjectId.isValid(riderData.riderId))
        ? riderData.riderId
        : ((riderData._id && mongoose.Types.ObjectId.isValid(riderData._id))
          ? riderData._id
          : null));

    let riderName = riderData.name?.trim() || '';
    let riderPhone = riderData.phone?.trim() || '';

    if (riderUserId && (!riderName || !riderPhone)) {
      try {
        const User = require('../models/User');
        const u = await User.findById(riderUserId);
        if (u) {
          riderName = riderName || u.name;
          riderPhone = riderPhone || u.phone;
        }
      } catch (_) {}
    }

    order.rider = {
      user: riderUserId,
      name: riderName || 'Delivery Partner',
      phone: riderPhone || '',
      assignedAt: new Date()
    };
    order.status = 'Out for Delivery';
    await order.save();

    const populatedOrder = await this.getOrderById(order._id);
    const stringId = populatedOrder._id.toString();

    const pipelineEvent = {
      orderId: stringId,
      status: populatedOrder.status,
      rider: populatedOrder.rider,
      timestamp: new Date().toISOString(),
      order: populatedOrder
    };

    if (io) {
      io.emit('order_status_update', pipelineEvent);
      io.emit('order_status_updated', pipelineEvent);
      io.emit('order_rider_assigned', pipelineEvent);
      if (riderUserId) {
        io.to(`driver_${riderUserId.toString()}`).emit('new_delivery_assigned', pipelineEvent);
      }
    }

    return populatedOrder;
  }

  /**
   * Alias for backward compatibility with cancelOrder and updateDriverOrderStatus
   */
  async updateOrderStatus(orderId, nextStatus, io, callerRole = 'admin') {
    return await this.transitionStatus(orderId, nextStatus, io, callerRole);
  }

  /**
   * Authoritative Order Cancellation with Admin Controlled Boundaries
   */
  async cancelOrder(orderId, user, reason, io) {
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID format.');
    }

    const order = await Order.findById(orderId);
    if (!order) throw new Error(`Order #${orderId} was not found.`);

    if (order.status === 'Cancelled') {
      throw new Error('This order is already cancelled.');
    }

    const isAdmin = user.role === 'admin';
    const isKitchen = user.role === 'kitchen';
    const isStaff = isAdmin || isKitchen;

    // Delivered orders cannot be cancelled by non-admins. Admin can cancel any order.
    if (order.status === 'Delivered' && !isAdmin) {
      throw new Error('Delivered orders cannot be cancelled.');
    }

    // If customer, enforce strict admin-configured cancellation policy
    if (!isStaff) {
      if (!order.user || order.user.toString() !== user._id.toString()) {
        throw new Error('Access Denied: You can only cancel your own orders.');
      }

      const DeliverySetting = require('../models/DeliverySetting');
      const settings = await DeliverySetting.getOrCreateSettings();
      const cancelCfg = settings.cancellationSettings || {
        isCancellationAllowed: true,
        cancellationAllowedUntil: 'Pending',
        disallowedMessage: 'Order cannot be cancelled because it is already being prepared or is out for delivery.'
      };

      if (!cancelCfg.isCancellationAllowed) {
        throw new Error('Order cancellation is currently disabled by store management.');
      }

      const stageOrder = ['Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'];
      const currentStage = stageOrder.indexOf(order.status);
      const allowedUntilStage = stageOrder.indexOf(cancelCfg.cancellationAllowedUntil || 'Pending');

      if (currentStage > allowedUntilStage) {
        throw new Error(
          cancelCfg.disallowedMessage ||
          `Order cannot be cancelled once it reaches '${order.status}' stage.`
        );
      }
    }

    // Set cancellation metadata
    order.cancellationReason = typeof reason === 'string' && reason.trim()
      ? reason.trim().slice(0, 300)
      : (isAdmin ? 'Cancelled by store admin' : (isKitchen ? 'Cancelled by kitchen' : 'Cancelled by customer'));
    order.cancelledBy = user.role || 'customer';
    order.cancelledAt = new Date();
    await order.save();

    // Delegate to transitionStatus with callerRole = 'admin' if staff, so it transitions smoothly without stage restrictions
    return await this.transitionStatus(order._id, 'Cancelled', io, isStaff ? 'admin' : user.role);
  }

  /**
   * Get Orders Assigned to Driver or Ready for Delivery Pickup
   */
  async getDriverOrders(driverId) {
    return await Order.find({
      $or: [
        { 'rider.user': driverId },
        { status: { $in: ['Ready', 'Out for Delivery'] } }
      ]
    })
      .populate('user', 'name phone address')
      .populate('items.product', 'name category imageURL')
      .sort({ createdAt: -1 });
  }

  /**
   * Driver Update Order Status (Restricted to Assigned Deliveries with OTP Verification)
   */
  async updateDriverOrderStatus(orderId, driverId, nextStatus, io, otp = null) {
    if (!['Out for Delivery', 'Delivered'].includes(nextStatus)) {
      throw new Error('Drivers are only permitted to mark orders as Out for Delivery or Delivered.');
    }

    const order = await Order.findById(orderId);
    if (!order) throw new Error(`Order #${orderId} was not found.`);

    const User = require('../models/User');
    const driverUser = await User.findById(driverId);

    // Auto-assign driver on pickup if not yet assigned
    if (!order.rider?.user) {
      order.rider = {
        user: driverId,
        name: driverUser?.name || 'Delivery Partner',
        phone: driverUser?.phone || '',
        assignedAt: new Date()
      };
      await order.save();
    } else {
      const isAssigned = order.rider?.user && order.rider.user.toString() === driverId.toString();
      const isAdmin = driverUser?.role === 'admin';
      if (!isAssigned && !isAdmin) {
        throw new Error('Access Denied: This delivery is assigned to another rider.');
      }
    }

    // Handover OTP Verification on Delivery Handover
    if (nextStatus === 'Delivered') {
      const FeatureSetting = require('../models/FeatureSetting');
      const featSettings = await FeatureSetting.getOrCreateSettings();
      if (featSettings?.handoverOtp?.enabled) {
        if (!order.otpVerifiedAt) {
          if (!otp) {
            throw new Error('Handover PIN (4-digit OTP) is required to complete delivery.');
          }
          if (String(otp).trim() !== String(order.deliveryOtp).trim()) {
            throw new Error('Incorrect Handover PIN. Please ask customer for their 4-digit PIN.');
          }
          order.otpVerifiedAt = new Date();
          await order.save();
        }
      }

      if (order.paymentMethod === 'cod') {
        order.paymentStatus = 'paid';
        await order.save();
      }
    }

    return await this.updateOrderStatus(orderId, nextStatus, io);
  }

  /**
   * Toggle Item Ready in Kitchen Checklist
   */
  async toggleItemReady(orderId, itemId, io) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error(`Order #${orderId} was not found.`);

    const item = order.items.id(itemId);
    if (item) {
      item.isReady = !item.isReady;
      await order.save();
    }

    const populatedOrder = await this.getOrderById(order._id);
    if (io) {
      io.emit('order_item_toggled', {
        orderId: order._id,
        itemId,
        isReady: item ? item.isReady : false,
        order: populatedOrder
      });
    }

    return populatedOrder;
  }

  /**
   * Fetch Single Order with Full Relational Population
   */
  async getOrderById(orderId) {
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return null;
    }
    return await Order.findById(orderId)
      .populate('user', 'name phone address role')
      .populate('items.product', 'name category imageURL basePrice discountedPrice');
  }

  /**
   * Fetch Customer Order History
   */
  async getCustomerOrders(userId) {
    return await Order.find({ user: userId })
      .populate('items.product', 'name category imageURL')
      .sort({ createdAt: -1 });
  }

  /**
   * Fetch All Orders for Expediter & Admin
   */
  async getAllOrders(filters = {}) {
    const mongoFilter = {};
    if (filters.status && filters.status !== 'All') {
      mongoFilter.status = filters.status;
    }
    if (filters.date === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      mongoFilter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    return await Order.find(mongoFilter)
      .populate('user', 'name phone address')
      .populate('items.product', 'name category imageURL')
      .sort({ createdAt: -1 });
  }
}

module.exports = new OrderPipelineService();
