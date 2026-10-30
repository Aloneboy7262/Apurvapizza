const mongoose = require('mongoose');
const Order = require('../models/Order');
const orderPipelineService = require('../services/orderPipelineService');

// @desc    Create a new order through Pipeline
// @route   POST /api/orders
// @access  Private (Customer/Admin)
const createOrder = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await orderPipelineService.processNewOrder(req.user._id, req.body, io);

    res.status(201).json({
      success: true,
      message: 'Order injected into pipeline and queued for kitchen successfully.',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's orders through Pipeline
// @route   GET /api/orders/my-orders or /api/orders/me
// @access  Private (Customer)
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderPipelineService.getCustomerOrders(req.user._id);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders through Pipeline (with filters for status and date)
// @route   GET /api/orders
// @access  Private (Admin / Kitchen)
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderPipelineService.getAllOrders(req.query);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order details through Pipeline
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format.'
      });
    }

    const order = await orderPipelineService.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order #${req.params.id} was not found.`
      });
    }

    // Strict Role-Based Access Control & IDOR Defense
    const isStaff = ['admin', 'kitchen'].includes(req.user.role);
    const orderOwnerId = order.user?._id?.toString() || order.user?.toString();
    const isOwner = Boolean(orderOwnerId && orderOwnerId === req.user._id.toString());
    const isAssignedDriver = req.user.role === 'driver' && (
      (order.rider?.user && order.rider.user.toString() === req.user._id.toString()) ||
      order.status === 'Out for Delivery'
    );

    if (!isStaff && !isOwner && !isAssignedDriver) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You do not have permission to view this order.'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status via Lifecycle Pipeline
// @route   PATCH /api/orders/:id/status
// @access  Private (Admin / Kitchen)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (typeof status !== 'string' || !status.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Status must be a non-empty string value.'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format.'
      });
    }

    const io = req.app.get('io');
    const updatedOrder = await orderPipelineService.transitionStatus(
      req.params.id,
      status.trim(),
      io,
      req.user?.role
    );

    res.status(200).json({
      success: true,
      message: `Order #${req.params.id.slice(-6)} transitioned to ${status.trim()}.`,
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order (Admin only)
// @route   DELETE /api/orders/:id
// @access  Private (Admin)
const deleteOrder = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format.'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with id of ${req.params.id}`
      });
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Order removed from pipeline and database.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive sales analytics (Everyday, Weekly, Yearly)
// @route   GET /api/orders/analytics/sales
// @access  Private (Admin / Kitchen)
const getSalesAnalytics = async (req, res, next) => {
  try {
    const allOrders = await Order.find({}).sort({ createdAt: 1 }).lean();

    // Separate valid (active / completed) orders from cancelled orders
    const orders = allOrders.filter((o) => o.status !== 'Cancelled');
    const cancelledOrders = allOrders.filter((o) => o.status === 'Cancelled');
    const cancelledLoss = cancelledOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    // Day of week calculation (Start of this week Monday)
    const dayOfWeek = (now.getDay() + 6) % 7; // 0: Mon, 6: Sun
    const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);

    const startOfThisYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);

    // 1. Overall Totals
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const totalOrdersCount = orders.length;

    // Payment method & status breakdown
    const cashOrders = orders.filter((o) => o.paymentMethod === 'cod');
    const cashRevenue = cashOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const onlineOrders = orders.filter((o) => o.paymentMethod !== 'cod');
    const onlineRevenue = onlineOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
    const paidRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const pendingPaymentOrders = orders.filter((o) => o.paymentStatus === 'pending');
    const pendingPaymentAmount = pendingPaymentOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // 2. Everyday Metrics (Today, Yesterday)
    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= startOfToday);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const yesterdayOrders = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= startOfYesterday && d < startOfToday;
    });
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // Last 30 Days (Daily Breakdown)
    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      dailyMap[key] = { date: key, label, revenue: 0, orderCount: 0 };
    }

    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dailyMap[key]) {
        dailyMap[key].revenue += Number(o.totalAmount) || 0;
        dailyMap[key].orderCount += 1;
      }
    });

    const dailyData = Object.values(dailyMap);

    // 3. Weekly Metrics (This Week, Last 8 Weeks Breakdown)
    const thisWeekOrders = orders.filter((o) => new Date(o.createdAt) >= startOfThisWeek);
    const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // Last 8 weeks
    const weeklyData = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(startOfThisWeek.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

      const label = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
      const wOrders = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= weekStart && d <= weekEnd;
      });
      const wRev = wOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      weeklyData.push({
        weekLabel: label,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        revenue: wRev,
        orderCount: wOrders.length
      });
    }

    // Days of week distribution (Mon to Sun)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayWiseData = dayNames.map((name) => ({ day: name, revenue: 0, orderCount: 0 }));
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const idx = (d.getDay() + 6) % 7;
      dayWiseData[idx].revenue += Number(o.totalAmount) || 0;
      dayWiseData[idx].orderCount += 1;
    });

    // 4. Yearly Metrics (This Year, 12 Months Jan-Dec)
    const thisYearOrders = orders.filter((o) => new Date(o.createdAt) >= startOfThisYear);
    const thisYearRevenue = thisYearOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const currentYear = now.getFullYear();
    const monthlyData = monthNames.map((name, idx) => ({
      month: name,
      year: currentYear,
      revenue: 0,
      orderCount: 0
    }));

    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlyData[m].revenue += Number(o.totalAmount) || 0;
        monthlyData[m].orderCount += 1;
      }
    });

    // 5. Top Selling Products
    const productStats = {};
    orders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item) => {
          const name = item.name || 'Unnamed Item';
          if (!productStats[name]) {
            productStats[name] = { name, quantity: 0, totalRevenue: 0 };
          }
          productStats[name].quantity += Number(item.quantity) || 1;
          productStats[name].totalRevenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        });
      }
    });

    const topSellingItems = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrdersCount,
          avgOrderValue: totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0,
          cashRevenue,
          cashOrdersCount: cashOrders.length,
          onlineRevenue,
          onlineOrdersCount: onlineOrders.length,
          paidRevenue,
          paidOrdersCount: paidOrders.length,
          pendingPaymentAmount,
          pendingOrdersCount: pendingPaymentOrders.length,
          cancelledLoss,
          cancelledOrdersCount: cancelledOrders.length
        },
        everyday: {
          todayRevenue,
          todayOrdersCount: todayOrders.length,
          yesterdayRevenue,
          yesterdayOrdersCount: yesterdayOrders.length,
          dailyData
        },
        weekly: {
          thisWeekRevenue,
          thisWeekOrdersCount: thisWeekOrders.length,
          weeklyData,
          dayWiseData
        },
        yearly: {
          year: currentYear,
          thisYearRevenue,
          thisYearOrdersCount: thisYearOrders.length,
          monthlyData
        },
        topSellingItems
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign delivery rider to order
// @route   PUT /api/orders/:id/assign-rider
// @access  Private (Admin / Kitchen)
const assignRider = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await orderPipelineService.assignRider(req.params.id, req.body, io);
    res.status(200).json({
      success: true,
      message: `Rider ${order.rider?.name} assigned to Order #${order._id.toString().slice(-6).toUpperCase()}`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle item ready status in KDS checklist
// @route   PUT /api/orders/:id/items/:itemId/toggle-ready
// @access  Private (Kitchen / Admin)
const toggleItemReady = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await orderPipelineService.toggleItemReady(req.params.id, req.params.itemId, io);
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer or Staff Order Cancellation
// @route   PUT /api/orders/:id/cancel
// @access  Private (Customer / Admin / Kitchen)
const cancelOrder = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { reason } = req.body;
    const order = await orderPipelineService.cancelOrder(req.params.id, req.user, reason, io);
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get orders assigned to logged in driver
// @route   GET /api/orders/driver/assigned
// @access  Private (Driver / Admin)
const getDriverOrders = async (req, res, next) => {
  try {
    const orders = await orderPipelineService.getDriverOrders(req.user._id);
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver update assigned order status
// @route   PATCH /api/orders/:id/driver-status
// @access  Private (Driver / Admin)
const updateDriverOrderStatus = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { status, otp } = req.body;
    const order = await orderPipelineService.updateDriverOrderStatus(req.params.id, req.user._id, status, io, otp);
    res.status(200).json({
      success: true,
      message: `Delivery status updated to '${status}'.`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order payment status (e.g., mark as paid, refunded, update UTR)
// @route   PATCH /api/orders/:id/payment-status
// @access  Private (Admin / Kitchen)
const updateOrderPaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentNotes, utrNumber } = req.body;

    const allowedStatuses = ['pending', 'paid', 'refunded', 'failed'];
    if (paymentStatus && !allowedStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status '${paymentStatus}'. Must be one of [${allowedStatuses.join(', ')}]`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order #${id} was not found.`
      });
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    if (!order.paymentDetails) {
      order.paymentDetails = {};
    }

    if (paymentStatus === 'paid' && !order.paymentDetails.paidAt) {
      order.paymentDetails.paidAt = new Date();
    }

    if (utrNumber !== undefined) {
      order.paymentDetails.utrNumber = String(utrNumber).trim();
      order.paymentDetails.transactionId = String(utrNumber).trim();
    }

    if (paymentNotes !== undefined) {
      order.paymentDetails.paymentNotes = String(paymentNotes).trim();
    }

    order.paymentDetails.paymentVerifiedBy = req.user.role || 'admin';

    await order.save();

    const io = req.app.get('io');
    if (io) {
      const payload = {
        orderId: order._id.toString(),
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
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
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} payment updated to '${order.paymentStatus}'.`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unsettled COD cash summary across all riders
// @route   GET /api/orders/cod-reconciliation
// @access  Private (Admin)
const getCODReconciliation = async (req, res, next) => {
  try {
    const unsettledOrders = await Order.find({
      paymentMethod: 'cod',
      status: 'Delivered',
      codSettled: { $ne: true }
    }).populate('rider.user', 'name phone').sort({ createdAt: -1 });

    const riderMap = {};
    let grandTotalUnsettled = 0;

    for (const ord of unsettledOrders) {
      const rKey = ord.rider?.user?._id ? ord.rider.user._id.toString() : (ord.rider?.name || 'Counter/Unassigned');
      const rName = ord.rider?.user?.name || ord.rider?.name || 'Counter / Unassigned';
      const rPhone = ord.rider?.user?.phone || ord.rider?.phone || '';

      if (!riderMap[rKey]) {
        riderMap[rKey] = {
          riderId: ord.rider?.user?._id || null,
          riderKey: rKey,
          riderName: rName,
          riderPhone: rPhone,
          totalCash: 0,
          ordersCount: 0,
          orders: []
        };
      }

      const amt = Number(ord.totalAmount) || 0;
      riderMap[rKey].totalCash = Math.round((riderMap[rKey].totalCash + amt) * 100) / 100;
      riderMap[rKey].unsettledCash = riderMap[rKey].totalCash;
      riderMap[rKey].ordersCount += 1;
      riderMap[rKey].orders.push({
        _id: ord._id,
        orderNumber: ord._id.toString().slice(-6).toUpperCase(),
        totalAmount: amt,
        deliveredAt: ord.updatedAt || ord.createdAt,
        customerName: ord.user?.name || 'Walk-in',
        deliveryAddress: ord.deliveryAddress
      });

      grandTotalUnsettled = Math.round((grandTotalUnsettled + amt) * 100) / 100;
    }

    const ridersList = Object.values(riderMap);

    res.status(200).json({
      success: true,
      grandTotalUnsettled,
      totalUnsettledOrders: unsettledOrders.length,
      riders: ridersList,
      data: {
        grandTotalUnsettled,
        totalUnsettledOrders: unsettledOrders.length,
        riders: ridersList
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Settle and clear COD cash ledger for a rider
// @route   POST /api/orders/cod-settle
// @access  Private (Admin)
const settleRiderCOD = async (req, res, next) => {
  try {
    const { riderId, orderIds, note } = req.body;
    let query = { paymentMethod: 'cod', status: 'Delivered', codSettled: { $ne: true } };

    if (Array.isArray(orderIds) && orderIds.length > 0) {
      query._id = { $in: orderIds };
    } else if (riderId) {
      query['rider.user'] = riderId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either riderId or orderIds array is required to settle COD cash.'
      });
    }

    const ordersToSettle = await Order.find(query);
    if (!ordersToSettle || ordersToSettle.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No unsettled COD orders found for the given criteria.'
      });
    }

    const settledTotal = ordersToSettle.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const settledIds = ordersToSettle.map((o) => o._id);

    await Order.updateMany(
      { _id: { $in: settledIds } },
      {
        $set: {
          codSettled: true,
          codSettledAt: new Date(),
          codSettledBy: req.user._id
        }
      }
    );

    const receipt = {
      settledAmount: Math.round(settledTotal * 100) / 100,
      ordersCount: settledIds.length,
      settledOrderIds: settledIds,
      settledAt: new Date(),
      settledByAdmin: req.user.name || 'Admin',
      note: note || 'Cash handed over to store counter',
      settlementRef: 'SETTLE-' + Date.now().toString(36).toUpperCase()
    };

    res.status(200).json({
      success: true,
      message: `Successfully settled ₹${settledTotal.toFixed(2)} across ${settledIds.length} COD order(s).`,
      settlementReceipt: receipt,
      data: receipt
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current rider's pending cash in hand
// @route   GET /api/orders/driver/my-cash
// @access  Private (Driver / Admin)
const getMyRiderCODStatus = async (req, res, next) => {
  try {
    const orders = await Order.find({
      'rider.user': req.user._id,
      paymentMethod: 'cod',
      status: 'Delivered',
      codSettled: { $ne: true }
    }).sort({ createdAt: -1 });

    const totalCashInHand = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    res.status(200).json({
      success: true,
      totalCashInHand: Math.round(totalCashInHand * 100) / 100,
      unsettledOrdersCount: orders.length,
      orders: orders.map((o) => ({
        _id: o._id,
        orderNumber: o._id.toString().slice(-6).toUpperCase(),
        totalAmount: o.totalAmount,
        deliveredAt: o.updatedAt,
        deliveryAddress: o.deliveryAddress
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get End-of-Day (EOD) Sales & Operations Summary
// @route   GET /api/orders/analytics/eod-report
// @access  Private (Admin, Kitchen)
const getEODSummary = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const orders = await Order.find({ createdAt: { $gte: todayStart } })
      .populate('user', 'name phone')
      .populate('rider.user', 'name phone')
      .sort({ createdAt: -1 });

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.status === 'Delivered');
    const cancelledOrders = orders.filter((o) => o.status === 'Cancelled');
    const activeOrders = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status));

    const totalSales = deliveredOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
    const totalTaxes = deliveredOrders.reduce((acc, o) => acc + (Number(o.taxDetails?.totalTax) || 0), 0);

    // Payment breakdown
    let cashSales = 0;
    let upiSales = 0;
    let onlineSales = 0;

    deliveredOrders.forEach((o) => {
      const amt = Number(o.totalAmount) || 0;
      if (o.paymentMethod === 'cod') cashSales += amt;
      else if (o.paymentMethod === 'upi') upiSales += amt;
      else onlineSales += amt;
    });

    // Dine-In vs Delivery vs Takeaway
    const typeBreakdown = {
      delivery: orders.filter((o) => !o.orderType || o.orderType === 'delivery').length,
      dine_in: orders.filter((o) => o.orderType === 'dine_in').length,
      takeaway: orders.filter((o) => o.orderType === 'takeaway').length
    };

    // Item sales breakdown
    const itemMap = {};
    deliveredOrders.forEach((o) => {
      o.items?.forEach((it) => {
        const name = it.customPizza ? 'Custom Half-&-Half Pizza' : (it.name || 'Artisan Pizza');
        itemMap[name] = (itemMap[name] || 0) + (Number(it.quantity) || 1);
      });
    });

    res.status(200).json({
      success: true,
      reportDate: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      data: {
        totalOrders,
        deliveredCount: deliveredOrders.length,
        cancelledCount: cancelledOrders.length,
        activeCount: activeOrders.length,
        totalSales: Math.round(totalSales * 100) / 100,
        totalTaxes: Math.round(totalTaxes * 100) / 100,
        payments: {
          cash: Math.round(cashSales * 100) / 100,
          upi: Math.round(upiSales * 100) / 100,
          online: Math.round(onlineSales * 100) / 100
        },
        typeBreakdown,
        topItems: Object.entries(itemMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 8)
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getSalesAnalytics,
  assignRider,
  toggleItemReady,
  cancelOrder,
  getDriverOrders,
  updateDriverOrderStatus,
  updateOrderPaymentStatus,
  getCODReconciliation,
  settleRiderCOD,
  getMyRiderCODStatus,
  getEODSummary
};

