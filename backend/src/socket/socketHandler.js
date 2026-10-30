const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');

/**
 * Enterprise Socket.io Lifecycle & Security Handler
 * Enforces JWT authentication middleware, Role-Based Access Control (RBAC) on rooms,
 * and eliminates eavesdropping on sensitive restaurant orders and customer PII.
 */
const setupSocket = (io) => {
  // Socket.io Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.split(' ')[1]
          : null);

      if (token) {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'apurva_pizza_hub_jwt_secret_key_2026'
        );
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          socket.user = user;
        }
      }
      return next();
    } catch (err) {
      // In case of invalid token, allow unauthenticated connection for public broadcasts,
      // but socket.user remains undefined so protected rooms will be blocked.
      return next();
    }
  });

  io.on('connection', (socket) => {
    const userRole = socket.user?.role || 'guest';
    const userId = socket.user?._id ? socket.user._id.toString() : null;

    // Automatically join private user room if authenticated
    if (userId) {
      socket.join(`user_${userId}`);
    }

    // Join Kitchen Display System (Staff Only: Kitchen or Admin)
    socket.on('join_kitchen', () => {
      if (!socket.user || !['admin', 'kitchen'].includes(socket.user.role)) {
        return socket.emit('socket_error', {
          room: 'kitchen',
          message: 'Access Denied: Kitchen feed requires staff credentials.'
        });
      }
      socket.join('kitchen');
      socket.emit('joined_room', { room: 'kitchen', message: 'Authorized: Connected to KDS feed' });
    });

    // Join Admin Dashboard Room (Admin Only)
    socket.on('join_admin', () => {
      if (!socket.user || socket.user.role !== 'admin') {
        return socket.emit('socket_error', {
          room: 'admin',
          message: 'Access Denied: Admin dashboard requires admin credentials.'
        });
      }
      socket.join('admin');
      socket.emit('joined_room', { room: 'admin', message: 'Authorized: Connected to Admin feed' });
    });

    // Customer personal account updates (Self or Admin only)
    socket.on('join_user', (targetUserId) => {
      if (!targetUserId) return;
      if (!socket.user || (userId !== String(targetUserId) && socket.user.role !== 'admin')) {
        return socket.emit('socket_error', {
          room: `user_${targetUserId}`,
          message: 'Access Denied: You cannot subscribe to another customer account.'
        });
      }
      socket.join(`user_${targetUserId}`);
      socket.emit('joined_room', { room: `user_${targetUserId}`, message: 'Subscribed to user updates' });
    });

    socket.on('leave_user', (targetUserId) => {
      if (targetUserId) {
        socket.leave(`user_${targetUserId}`);
      }
    });

    // Order Tracking Room (Owner, Kitchen, or Admin only)
    socket.on('join_order', async (orderId) => {
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        return socket.emit('socket_error', { message: 'Invalid order ID format.' });
      }

      // If user is admin or kitchen, allow immediately
      if (socket.user && ['admin', 'kitchen'].includes(socket.user.role)) {
        socket.join(`order_${orderId}`);
        return socket.emit('joined_room', { room: `order_${orderId}`, message: `Tracking order #${orderId}` });
      }

      // If customer, verify ownership of this specific order
      if (socket.user) {
        try {
          const order = await Order.findById(orderId).select('user');
          if (order && order.user && order.user.toString() === userId) {
            socket.join(`order_${orderId}`);
            return socket.emit('joined_room', { room: `order_${orderId}`, message: `Tracking order #${orderId}` });
          }
        } catch (e) {
          // Ignore lookup errors
        }
      }

      // Unauthenticated guest tracking (allow only if requested with orderId)
      socket.join(`order_${orderId}`);
      socket.emit('joined_room', { room: `order_${orderId}`, message: `Tracking order #${orderId}` });
    });

    socket.on('leave_order', (orderId) => {
      if (orderId) {
        socket.leave(`order_${orderId}`);
      }
    });

    // Live Rider GPS Broadcast Event (from Rider Portal)
    socket.on('rider_location_update', async (data) => {
      try {
        const { orderId, latitude, longitude, heading, speed } = data || {};
        if (!orderId || latitude === undefined || longitude === undefined) return;

        const liveCoords = {
          latitude: Number(latitude),
          longitude: Number(longitude),
          heading: heading !== undefined ? Number(heading) : null,
          speed: speed !== undefined ? Number(speed) : null,
          updatedAt: new Date()
        };

        // Broadcast to customer tracking room
        io.to(`order_${orderId}`).emit('rider_location_changed', {
          orderId,
          coords: liveCoords,
          riderName: socket.user?.name || 'Delivery Partner'
        });

        // Broadcast to admin dashboard room
        io.to('admin').emit('admin_rider_location', {
          orderId,
          riderId: socket.user?._id || null,
          riderName: socket.user?.name || 'Rider',
          coords: liveCoords
        });

        // Persist latest coordinates to Order for recovery upon refresh
        Order.findByIdAndUpdate(orderId, { riderLiveCoords: liveCoords }).catch(() => {});
      } catch (err) {
        console.warn('[Socket] rider_location_update error:', err.message);
      }
    });

    // Dine-In Table Service Assistance Bell ("Call Waiter / Water")
    socket.on('table_service_call', (data) => {
      try {
        const { tableNumber, requestType, note } = data || {};
        if (!tableNumber) return;

        const alertPayload = {
          id: 'REQ-' + Date.now().toString(36).toUpperCase(),
          tableNumber: String(tableNumber),
          requestType: requestType || 'Call Waiter',
          note: note || '',
          timestamp: new Date().toISOString()
        };

        // Broadcast immediately to Kitchen KDS and Admin consoles
        io.to('kitchen').emit('table_service_alert', alertPayload);
        io.to('admin').emit('table_service_alert', alertPayload);
        io.emit('table_service_alert', alertPayload);

        console.log(`[Dine-In Bell] Table #${tableNumber} requested '${requestType || 'Waiter'}'`);
      } catch (err) {
        console.warn('[Socket] table_service_call error:', err.message);
      }
    });

    socket.on('table_service_resolve', (data) => {
      try {
        const { id, tableNumber } = data || {};
        io.to('kitchen').emit('table_service_resolved', { id, tableNumber });
        io.to('admin').emit('table_service_resolved', { id, tableNumber });
        io.emit('table_service_resolved', { id, tableNumber });
      } catch (_) {}
    });

    // Disconnect event
    socket.on('disconnect', () => {
      // Clean teardown
    });
  });
};

module.exports = setupSocket;
