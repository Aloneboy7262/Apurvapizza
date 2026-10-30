import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SocketContext = createContext();

// Socket connects through the same-origin reverse proxy at /socket.io
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * Web Audio Melodic Chime for Real-Time Kitchen Updates
 * Triple-tone pleasant restaurant chime (C5 -> E5 -> G5)
 */
export const playOrderChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const chords = [523.25, 659.25, 783.99]; // C5, E5, G5 Major Chime
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.22, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.7);
    });
  } catch (e) {
    console.warn('Audio chime warning:', e);
  }
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [liveAlert, setLiveAlert] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [riderLiveLocation, setRiderLiveLocation] = useState(null);
  const soundEnabledRef = useRef(true);
  const [shopStatus, setShopStatus] = useState({
    isOpen: true,
    openMode: 'auto',
    manualStatus: 'open',
    openingTime: '10:00',
    closingTime: '23:00',
    closedMessage: 'We are currently closed for orders. Our daily hours are 10:00 AM – 11:00 PM.',
    allowPreorders: true
  });

  const fetchShopStatus = useCallback(async () => {
    try {
      const res = await api.get('/delivery-settings/shop-status');
      if (res.data.success && res.data.data) {
        setShopStatus(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch shop status:', err);
    }
  }, []);

  // Fetch shop status on mount
  useEffect(() => {
    fetchShopStatus();
  }, [fetchShopStatus]);

  // Initialize Socket.io Connection with auth token
  useEffect(() => {
    const token = localStorage.getItem('apurva_auth_token');
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 25,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket.io Pipeline] Connected as client: ${socketInstance.id}`);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`[Socket.io Pipeline] Disconnected: ${reason}`);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn(`[Socket.io Pipeline] Connection warning:`, error.message);
      setIsConnected(false);
    });

    socketInstance.on('shop:status_update', (data) => {
      console.log('[Socket] Shop status update received:', data);
      if (data) {
        setShopStatus(data);
      }
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Fetch logged in customer's orders and find most recent active order
  const fetchCustomerOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setAllOrders([]);
      setActiveOrder(null);
      return;
    }

    try {
      let res;
      try {
        res = await api.get('/orders/me');
      } catch (e) {
        res = await api.get('/orders/my-orders');
      }

      if (res.data?.success) {
        const orderList = res.data.data || [];
        setAllOrders(orderList);

        // Find latest in-progress active order (Pending, Preparing, Ready, Out for Delivery)
        const active = orderList.find(
          (o) => o.status === 'Pending' || o.status === 'Preparing' || o.status === 'Ready' || o.status === 'Out for Delivery'
        );

        // When order is complete (Delivered/Completed/Cancelled), do not show tracking system
        if (active) {
          setActiveOrder(active);
        } else {
          setActiveOrder(null);
        }
      }
    } catch (err) {
      console.warn('[SocketContext] Could not fetch customer orders:', err.message);
    }
  }, [isAuthenticated]);

  // When user signs in or socket connects, sync token and join user room and fetch orders
  useEffect(() => {
    if (!socket) return;

    const token = localStorage.getItem('apurva_auth_token');
    socket.auth = { token };

    if (!isAuthenticated || !user?._id) {
      setAllOrders([]);
      setActiveOrder(null);
      return;
    }

    const stringUserId = String(user._id);
    socket.emit('join_user', stringUserId);
    console.log(`[Socket.io Pipeline] Emitted join_user for ${stringUserId}`);

    fetchCustomerOrders();

    return () => {
      socket.emit('leave_user', stringUserId);
    };
  }, [socket, isAuthenticated, user, fetchCustomerOrders]);

  // Global Real-Time Listener for Pipeline Events
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (payload) => {
      console.log('⚡ [Socket.io Global Pipeline] Received order status update:', payload);
      const targetOrderId = String(payload.orderId || payload.order?._id || '');
      const newStatus = payload.status || payload.order?.status;

      if (!targetOrderId || !newStatus) return;

      // Update in allOrders list
      setAllOrders((prev) =>
        prev.map((ord) =>
          String(ord._id) === targetOrderId ? { ...ord, status: newStatus, ...(payload.order || {}) } : ord
        )
      );

      // Check if this update matches activeOrder or customer's orders
      const isCompleteStatus = ['Delivered', 'Completed', 'Cancelled'].includes(newStatus);

      setActiveOrder((currentActive) => {
        // If order completed/delivered/cancelled, remove tracking system from downside
        if (isCompleteStatus) {
          if (currentActive && String(currentActive._id) === targetOrderId) {
            return null;
          }
          return currentActive;
        }

        if (!currentActive) {
          // If customer has no active order but this order is theirs and not complete, adopt it
          if (payload.order?.user?._id && String(payload.order.user._id) === String(user?._id)) {
            return payload.order;
          }
          return null;
        }

        if (String(currentActive._id) === targetOrderId) {
          return {
            ...currentActive,
            status: newStatus,
            ...(payload.order || {})
          };
        }
        return currentActive;
      });

      // Play pleasant audio chime
      if (soundEnabledRef.current) {
        playOrderChime();
      }

      // Display luxury global toast alert
      const statusLabels = {
        Pending: 'Order Queued',
        Preparing: 'Baking in Oven 🔥',
        Ready: 'Baked & Ready for Dispatch 📦',
        Delivered: 'Delivered & Enjoy! 🎉'
      };

      setLiveAlert({
        orderId: targetOrderId,
        status: newStatus,
        statusLabel: statusLabels[newStatus] || newStatus,
        previousStatus: payload.previousStatus || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });

      // Clear alert after 7 seconds
      setTimeout(() => {
        setLiveAlert((curr) => (curr?.orderId === targetOrderId ? null : curr));
      }, 7000);
    };

    const handleNewOrder = (newOrder) => {
      if (!newOrder) return;
      console.log('⚡ [Socket.io Global Pipeline] New order confirmed:', newOrder);

      if (user && newOrder.user && String(newOrder.user._id || newOrder.user) === String(user._id)) {
        setActiveOrder(newOrder);
        setAllOrders((prev) => [newOrder, ...prev.filter((o) => String(o._id) !== String(newOrder._id))]);
        if (soundEnabledRef.current) {
          playOrderChime();
        }
      }
    };

    const handleRiderLocation = (data) => {
      if (data?.coords) {
        setRiderLiveLocation(data.coords);
        setActiveOrder((prev) =>
          prev && String(prev._id) === String(data.orderId)
            ? { ...prev, riderLiveCoords: data.coords }
            : prev
        );
      }
    };

    socket.on('order_status_update', handleStatusUpdate);
    socket.on('order_status_updated', handleStatusUpdate);
    socket.on('new_order', handleNewOrder);
    socket.on('order_created', handleNewOrder);
    socket.on('rider_location_changed', handleRiderLocation);

    return () => {
      socket.off('order_status_update', handleStatusUpdate);
      socket.off('order_status_updated', handleStatusUpdate);
      socket.off('new_order', handleNewOrder);
      socket.off('order_created', handleNewOrder);
      socket.off('rider_location_changed', handleRiderLocation);
    };
  }, [socket, user]);

  const trackOrder = (orderId) => {
    if (socket && orderId) {
      socket.emit('join_order', String(orderId));
    }
  };

  const untrackOrder = (orderId) => {
    if (socket && orderId) {
      socket.emit('leave_order', String(orderId));
    }
  };

  const dismissActiveOrder = () => {
    setActiveOrder(null);
  };

  const toggleSound = () => {
    soundEnabledRef.current = !soundEnabledRef.current;
    if (soundEnabledRef.current) {
      playOrderChime();
    }
    return soundEnabledRef.current;
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeOrder,
        setActiveOrder,
        riderLiveLocation,
        allOrders,
        setAllOrders,
        liveAlert,
        setLiveAlert,
        trackOrder,
        untrackOrder,
        fetchCustomerOrders,
        dismissActiveOrder,
        toggleSound,
        playStatusChime: playOrderChime,
        shopStatus,
        isShopOpen: shopStatus.isOpen,
        fetchShopStatus
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
