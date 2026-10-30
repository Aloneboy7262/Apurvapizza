import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  Printer,
  CheckCircle,
  Play,
  Check,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Flame,
  LayoutDashboard,
  TrendingUp,
  Calendar,
  BarChart3,
  X,
  Award,
  Key,
  Truck,
  Phone,
  Lock,
  CheckCircle2,
  Menu,
  MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import api from '../services/api';
import ReceiptPrint from '../components/ReceiptPrint';
import ChangeCredentialsModal from '../components/ChangeCredentialsModal';

const Kitchen = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('active'); // 'active' | 'Pending' | 'Preparing' | 'Ready' | 'Delivered'
  const [mobileTab, setMobileTab] = useState('Pending'); // Mobile column tab
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-Print & Feature Settings state
  const [featureSettings, setFeatureSettings] = useState(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);

  // KDS Handover OTP Verification state
  const [kdsOtpModal, setKdsOtpModal] = useState(null); // { orderId, order }
  const [kdsInputOtp, setKdsInputOtp] = useState('');
  const [kdsVerifyingOtp, setKdsVerifyingOtp] = useState(false);
  const [kdsOtpError, setKdsOtpError] = useState('');

  // Kitchen Rush Mode State (+15 min extra prep time broadcasted live)
  const [rushMode, setRushMode] = useState(false);
  const [rushMinutes, setRushMinutes] = useState(15);
  const [togglingRush, setTogglingRush] = useState(false);

  // Rider dispatch modal state
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [driversList, setDriversList] = useState([]);
  const [dispatching, setDispatching] = useState(false);
  const lastAnnouncedOverdueRef = useRef(new Map());

  // Kitchen Order Cancellation Modal state
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [kitchenCancelReason, setKitchenCancelReason] = useState('Kitchen Out of Stock / Cannot Fulfill');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Kitchen Sales Analytics Modal state
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [salesTab, setSalesTab] = useState('everyday'); // 'everyday' | 'weekly' | 'yearly'
  const [loadingSales, setLoadingSales] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Shop Open / Close state for KDS
  const [shopStatus, setShopStatus] = useState({
    isOpen: true,
    openMode: 'auto',
    manualStatus: 'open',
    openingTime: '10:00',
    closingTime: '23:00'
  });
  const [togglingShop, setTogglingShop] = useState(false);
  const [tableAlerts, setTableAlerts] = useState([]);

  const handleToggleShopFromKitchen = async () => {
    try {
      setTogglingShop(true);
      const nextManualStatus = shopStatus.isOpen ? 'closed' : 'open';
      const res = await api.post('/delivery-settings/shop-status', {
        openMode: 'manual',
        manualStatus: nextManualStatus
      });
      if (res.data.success) {
        setShopStatus(res.data.data);
      }
    } catch (err) {
      console.error('Failed to toggle store status from KDS:', err);
      alert(err.response?.data?.message || 'Failed to toggle store status.');
    } finally {
      setTogglingShop(false);
    }
  };

  const fetchSalesAnalytics = async () => {
    try {
      setLoadingSales(true);
      const res = await api.get('/orders/analytics/sales');
      if (res.data.success) {
        setSalesData(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch sales analytics for kitchen:', err.message);
    } finally {
      setLoadingSales(false);
    }
  };


  // Web Audio Synthesizer for high-pitch Kitchen Bell chime
  const playKitchenBell = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Two-tone pleasant kitchen ding (800Hz then 1200Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.9);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  // Web Speech API Voice Order Announcer
  const speakOrder = (order) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const orderNum = (order._id || '').slice(-4).toUpperCase();
      let typeStr = 'Doorstep Home Delivery';
      if (order.orderType === 'dine_in' || order.tableNumber) {
        typeStr = `Dine In, Table ${order.tableNumber || '1'}`;
      } else if (order.orderType === 'takeaway') {
        typeStr = 'Parcel order, Counter pickup';
      }
      const itemsStr = (order.items || []).map((it) => `${it.quantity} ${it.name}`).join(', ');
      const textToSpeak = `New Kitchen Ticket ${orderNum}. ${typeStr}. Items: ${itemsStr}`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const testSpeech = () => {
    speakOrder({
      _id: 'DEMO108',
      orderType: 'dine_in',
      tableNumber: '4',
      items: [
        { quantity: 1, name: 'Wood-Fired Margherita' },
        { quantity: 2, name: 'Cold Coffee' }
      ]
    });
  };

  // Prominent Indian English Order Type Badge (Table Service, Parcel / Takeaway, Doorstep Delivery)
  const renderOrderTypeBadge = (order) => {
    if (order.orderType === 'dine_in' || order.tableNumber) {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-purple-500/25 text-purple-200 border border-purple-500/60 font-black text-[11px] flex items-center gap-1.5 shadow-sm">
          <span>🍽️</span> TABLE {order.tableNumber || '1'} (DINE-IN)
        </span>
      );
    }
    if (order.orderType === 'takeaway') {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/25 text-amber-200 border border-amber-500/60 font-black text-[11px] flex items-center gap-1.5 shadow-sm">
          <span>🥡</span> PARCEL / TAKEAWAY
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/25 text-cyan-200 border border-cyan-500/60 font-black text-[11px] flex items-center gap-1.5 shadow-sm">
        <span>🛵</span> DOORSTEP DELIVERY
      </span>
    );
  };

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Voice escalation for overdue tickets (>= 15 mins in kitchen)
  useEffect(() => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    const checkAndSpeakOverdue = () => {
      const now = Date.now();
      const overdueList = orders.filter(
        (o) => (o.status === 'Pending' || o.status === 'Preparing') && getElapsedMinutes(o.createdAt) >= 15
      );

      for (const order of overdueList) {
        const lastSpoken = lastAnnouncedOverdueRef.current.get(order._id) || 0;
        // Announce at most once every 3.5 minutes per overdue order
        if (now - lastSpoken > 210000) {
          lastAnnouncedOverdueRef.current.set(order._id, now);
          const orderNum = (order._id || '').slice(-4).toUpperCase();
          const elapsed = getElapsedMinutes(order.createdAt);
          const text = `Urgent Kitchen Alert! Order ${orderNum} has exceeded ${elapsed} minutes. Please expedite immediately!`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.05;
          utterance.lang = 'en-IN';
          window.speechSynthesis.speak(utterance);
          break; // Announce one ticket per cycle to avoid overlapping audio
        }
      }
    };

    const overdueTimer = setInterval(checkAndSpeakOverdue, 20000);
    return () => clearInterval(overdueTimer);
  }, [orders, voiceEnabled]);

  // Fetch initial orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders for KDS:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliverySettings = async () => {
    try {
      const res = await api.get('/delivery-settings');
      if (res.data?.success) {
        setRushMode(Boolean(res.data.data.kitchenRushMode));
        setRushMinutes(res.data.data.kitchenRushExtraMinutes || 15);
        if (res.data.data.computedShopStatus || res.data.data.shopStatus) {
          setShopStatus(res.data.data.computedShopStatus || res.data.data.shopStatus);
        }
      }
    } catch (err) {
      console.warn('Could not fetch delivery settings for KDS:', err);
    }
  };

  const fetchFeatureSettings = async () => {
    try {
      const res = await api.get('/features/public');
      if (res.data?.success && res.data.data) {
        setFeatureSettings(res.data.data);
        if (res.data.data.silentPrint?.enabled) {
          setAutoPrintEnabled(true);
        }
      }
    } catch (err) {
      console.warn('Could not fetch feature settings for KDS:', err.message);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/auth/drivers');
      if (res.data?.success) {
        setDriversList(res.data.data || []);
      }
    } catch (err) {
      console.warn('Could not fetch drivers list:', err.message);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDeliverySettings();
    fetchFeatureSettings();
    fetchDrivers();

    // Socket.io Connection
    const socket = getSocket();

    // Join the 'kitchen' room on backend
    socket.emit('join_kitchen');

    // Handler for real-time new incoming orders
    const handleNewOrder = (order) => {
      console.log('[KDS] New order received via socket:', order);
      playKitchenBell();
      speakOrder(order);

      setOrders((prev) => {
        const exists = prev.some((o) => o._id === order._id);
        if (exists) return prev;
        return [order, ...prev];
      });

      // Silent Auto-Print on Pending if configured
      if (autoPrintEnabled && featureSettings?.silentPrint?.printOnStatus === 'Pending') {
        setSelectedPrintOrder(order);
      }

      setNewOrderIds((prev) => new Set([...prev, order._id]));
      setTimeout(() => {
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(order._id);
          return next;
        });
      }, 10000);
    };

    // Handler for status updates made by other stations
    const handleStatusUpdate = (payload) => {
      const { orderId, status, order } = payload;
      setOrders((prev) =>
        prev.map((o) => {
          if (o._id === orderId) {
            return order ? order : { ...o, status };
          }
          return o;
        })
      );
    };

    // Rush mode live broadcast
    const handleRushMode = (payload) => {
      setRushMode(Boolean(payload.kitchenRushMode));
      if (payload.kitchenRushExtraMinutes) {
        setRushMinutes(payload.kitchenRushExtraMinutes);
      }
    };

    // Item checklist toggle
    const handleItemToggled = (payload) => {
      const { orderId, itemId, isReady, order } = payload;
      setOrders((prev) =>
        prev.map((o) => {
          if (o._id === orderId) {
            if (order) return order;
            return {
              ...o,
              items: o.items.map((it) => (it._id === itemId ? { ...it, isReady } : it))
            };
          }
          return o;
        })
      );
    };

    const handleShopStatus = (data) => {
      if (data) setShopStatus(data);
    };

    const handlePaymentUpdated = (payload) => {
      const { orderId, paymentStatus, paymentMethod, paymentDetails } = payload;
      setOrders((prev) =>
        prev.map((o) => {
          if (o._id === orderId) {
            return {
              ...o,
              paymentStatus,
              paymentMethod: paymentMethod || o.paymentMethod,
              paymentDetails: paymentDetails || o.paymentDetails
            };
          }
          return o;
        })
      );
    };

    const handleTableServiceAlert = (alertData) => {
      setTableAlerts((prev) => [alertData, ...prev.filter((a) => a.id !== alertData.id)]);
      if (soundEnabled) {
        try { playKitchenBell(); } catch (_) {}
      }
      if (voiceEnabled && window.speechSynthesis) {
        try {
          const text = `Attention Kitchen! Table ${alertData.tableNumber} requested ${alertData.requestType}!`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch (_) {}
      }
    };

    const handleTableServiceResolved = ({ id, tableNumber }) => {
      setTableAlerts((prev) => prev.filter((a) => a.id !== id && a.tableNumber !== String(tableNumber)));
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_status_update', handleStatusUpdate);
    socket.on('order_status_updated', handleStatusUpdate);
    socket.on('order_payment_updated', handlePaymentUpdated);
    socket.on('kitchen:rush_mode', handleRushMode);
    socket.on('order_item_toggled', handleItemToggled);
    socket.on('shop:status_update', handleShopStatus);
    socket.on('table_service_alert', handleTableServiceAlert);
    socket.on('table_service_resolved', handleTableServiceResolved);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_status_update', handleStatusUpdate);
      socket.off('order_status_updated', handleStatusUpdate);
      socket.off('order_payment_updated', handlePaymentUpdated);
      socket.off('kitchen:rush_mode', handleRushMode);
      socket.off('order_item_toggled', handleItemToggled);
      socket.off('shop:status_update', handleShopStatus);
      socket.off('table_service_alert', handleTableServiceAlert);
      socket.off('table_service_resolved', handleTableServiceResolved);
    };
  }, [soundEnabled, voiceEnabled]);

  // One-click Mark Paid for Kitchen Cashier
  const handleMarkOrderPaid = async (orderId) => {
    try {
      const res = await api.patch(`/orders/${orderId}/payment-status`, {
        paymentStatus: 'paid',
        paymentNotes: 'Marked paid by Kitchen/Cashier'
      });
      if (res.data.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, paymentStatus: 'paid' } : o))
        );
      }
    } catch (err) {
      console.error('Failed to mark order as paid:', err);
      alert(err.response?.data?.message || 'Failed to update payment status.');
    }
  };

  // Prominent Payment Status Badge Component for KDS Tickets
  const renderPaymentBadge = (order) => {
    const isPaid = order.paymentStatus === 'paid';
    const method = (order.paymentMethod || 'cod').toLowerCase();

    if (isPaid) {
      return (
        <div className="my-2 px-2.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-[11px] font-black flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PAID ({method.toUpperCase()})</span>
          </span>
          <span className="text-[9px] text-emerald-400/90 font-bold uppercase tracking-wider">Do Not Collect Cash</span>
        </div>
      );
    }

    return (
      <div className="my-2 px-2.5 py-1.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-300 text-[11px] font-black flex items-center justify-between shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>{order.orderType === 'dine_in' ? 'PAY AT TABLE' : order.orderType === 'takeaway' ? 'PAY AT COUNTER' : 'CASH ON DELIVERY'}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-white font-extrabold text-xs">COLLECT ₹{Number(order.totalAmount).toFixed(0)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMarkOrderPaid(order._id);
            }}
            title="Click to confirm cash received"
            className="px-2 py-0.5 rounded bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 transition-colors cursor-pointer"
          >
            Mark Paid
          </button>
        </div>
      </div>
    );
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    // Handover OTP Check for Delivered status
    if (newStatus === 'Delivered' && featureSettings?.handoverOtp?.enabled) {
      const order = orders.find((o) => o._id === orderId);
      const isCod = order?.paymentMethod === 'cod';
      const requiresOtp = !featureSettings.handoverOtp.requireForCodOnly || isCod;
      if (requiresOtp && !order?.otpVerifiedAt) {
        setKdsOtpModal({ orderId, order });
        setKdsInputOtp('');
        setKdsOtpError('');
        return;
      }
    }

    try {
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );

      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });

      // Silent Auto-Print on status transition (e.g. Preparing)
      if (autoPrintEnabled && newStatus === (featureSettings?.silentPrint?.printOnStatus || 'Preparing')) {
        const orderToPrint = orders.find((o) => o._id === orderId) || res.data?.data;
        if (orderToPrint) {
          setSelectedPrintOrder(orderToPrint);
        }
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      fetchOrders();
    }
  };

  // Verify KDS Handover OTP
  const handleVerifyKdsOtp = async (e) => {
    if (e) e.preventDefault();
    if (!kdsOtpModal) return;
    if (!kdsInputOtp || kdsInputOtp.trim().length !== 4) {
      setKdsOtpError('Please enter a valid 4-digit PIN.');
      return;
    }
    try {
      setKdsVerifyingOtp(true);
      setKdsOtpError('');
      const res = await api.post('/features/verify-otp', {
        orderId: kdsOtpModal.orderId,
        otp: kdsInputOtp.trim(),
        bypass: false
      });
      if (res.data?.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === kdsOtpModal.orderId ? res.data.data : o))
        );
        setKdsOtpModal(null);
        setKdsInputOtp('');
      }
    } catch (err) {
      setKdsOtpError(err.response?.data?.message || 'Invalid Handover PIN.');
    } finally {
      setKdsVerifyingOtp(false);
    }
  };

  // Counter Staff Emergency Bypass
  const handleBypassKdsOtp = async () => {
    if (!kdsOtpModal) return;
    const reason = window.prompt(
      'Counter Staff Bypass: Enter reason for delivering without customer PIN:',
      'Verified directly at kitchen counter'
    );
    if (!reason) return;
    try {
      setKdsVerifyingOtp(true);
      setKdsOtpError('');
      const res = await api.post('/features/verify-otp', {
        orderId: kdsOtpModal.orderId,
        bypass: true,
        bypassReason: reason
      });
      if (res.data?.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === kdsOtpModal.orderId ? res.data.data : o))
        );
        setKdsOtpModal(null);
        setKdsInputOtp('');
      }
    } catch (err) {
      setKdsOtpError(err.response?.data?.message || 'Failed to bypass PIN.');
    } finally {
      setKdsVerifyingOtp(false);
    }
  };

  // Toggle Rush Mode
  const handleToggleRushMode = async () => {
    try {
      setTogglingRush(true);
      const res = await api.post('/delivery-settings/rush-mode', {
        kitchenRushMode: !rushMode,
        kitchenRushExtraMinutes: rushMinutes
      });
      if (res.data?.success) {
        setRushMode(res.data.data.kitchenRushMode);
      }
    } catch (err) {
      console.error('Failed to toggle rush mode:', err);
    } finally {
      setTogglingRush(false);
    }
  };

  // Item bumping / toggle ready
  const handleToggleItemReady = async (orderId, itemId) => {
    try {
      setOrders((prev) =>
        prev.map((o) => {
          if (o._id === orderId) {
            return {
              ...o,
              items: o.items.map((it) => (it._id === itemId ? { ...it, isReady: !it.isReady } : it))
            };
          }
          return o;
        })
      );

      await api.put(`/orders/${orderId}/items/${itemId}/toggle-ready`);
    } catch (err) {
      console.error('Failed to toggle item ready status:', err);
      fetchOrders();
    }
  };

  // Assign Rider Submit
  const handleAssignRiderSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!dispatchOrder) return;
    if (!riderName.trim()) {
      alert('Please enter a delivery rider name.');
      return;
    }

    try {
      setDispatching(true);
      const res = await api.put(`/orders/${dispatchOrder._id}/assign-rider`, {
        name: riderName.trim(),
        phone: riderPhone.trim()
      });
      if (res.data.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === dispatchOrder._id ? res.data.data : o))
        );
        setDispatchOrder(null);
        setRiderName('');
        setRiderPhone('');
      }
    } catch (err) {
      console.error('Failed to assign rider:', err);
      alert(err.response?.data?.message || 'Failed to assign rider.');
    } finally {
      setDispatching(false);
    }
  };

  // Kitchen Order Cancellation Submission
  const handleConfirmCancelKitchen = async (e) => {
    if (e) e.preventDefault();
    if (!cancellingOrder) return;
    try {
      setIsSubmittingCancel(true);
      const res = await api.put(`/orders/${cancellingOrder._id}/cancel`, {
        reason: kitchenCancelReason || 'Cancelled by Kitchen Staff'
      });
      setOrders((prev) =>
        prev.map((o) =>
          o._id === cancellingOrder._id
            ? { ...o, status: 'Cancelled', cancellationReason: kitchenCancelReason }
            : o
        )
      );
      setCancellingOrder(null);
    } catch (err) {
      console.error('Failed to cancel order from kitchen:', err);
      alert(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Filter orders for display
  const pendingOrders = orders.filter((o) => o.status === 'Pending');
  const preparingOrders = orders.filter((o) => o.status === 'Preparing');
  const readyOrders = orders.filter((o) => o.status === 'Ready' || o.status === 'Out for Delivery');
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered');
  const overdueOrders = orders.filter(
    (o) => (o.status === 'Pending' || o.status === 'Preparing') && Math.floor((new Date() - new Date(o.createdAt)) / 60000) >= 15
  );

  // Elapsed time formatter
  const getElapsedMinutes = (dateString) => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 60000);
    return Math.max(0, diff);
  };

  // High-visibility prep-time urgency system
  const getUrgencyLevel = (mins) => {
    if (mins >= 15) return 'critical';
    if (mins >= 8) return 'warning';
    return 'fresh';
  };

  const getUrgencyCardStyle = (mins, isNew, defaultBorder = 'border-slate-800') => {
    if (mins >= 15) {
      return 'border-red-500 bg-gradient-to-b from-red-950/40 via-slate-900/95 to-slate-900 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse hover:border-red-400';
    }
    if (mins >= 8) {
      return 'border-amber-500/70 bg-gradient-to-b from-amber-950/25 via-slate-900/95 to-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:border-amber-400';
    }
    if (isNew) {
      return 'border-amber-400 bg-amber-950/30 animate-pulse';
    }
    return `${defaultBorder} bg-slate-900/90 hover:border-slate-700 shadow-md`;
  };

  const getUrgencyBadge = (mins) => {
    if (mins >= 15) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-red-500/30 text-red-200 border border-red-500/70 text-[10px] font-black animate-pulse flex items-center gap-1 shadow-[0_0_12px_rgba(239,68,68,0.5)]">
          <Flame className="w-3.5 h-3.5 text-red-400 animate-bounce" /> {mins}m OVERDUE - EXPEDITE!
        </span>
      );
    }
    if (mins >= 8) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-500/60 text-[10px] font-black flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> {mins}m CAUTION
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {mins}m Fresh
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col select-none">
      {/* KDS Header Bar */}
      <header className="h-14 md:h-16 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-md px-3 md:px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2.5 md:space-x-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
            <ChefHat className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 md:space-x-2">
              <h1 className="text-sm md:text-base font-black tracking-tight text-white whitespace-nowrap">
                Apurva KDS
              </h1>
              <span className="text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                LIVE
              </span>
              {overdueOrders.length > 0 && (
                <span className="text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/30 text-red-200 border border-red-500/70 animate-pulse flex items-center gap-1 shadow-md shadow-red-500/40 whitespace-nowrap">
                  <Flame className="w-3 h-3 text-red-400" /> {overdueOrders.length}
                </span>
              )}
            </div>
            <p className="hidden sm:block text-[10px] text-slate-400">Kitchen Display System & Expediter Station</p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            <span className="text-xs font-semibold text-slate-300">Pending:</span>
            <span className="text-xs font-black text-amber-400">{pendingOrders.length}</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-xs font-semibold text-slate-300">Cooking:</span>
            <span className="text-xs font-black text-blue-400">{preparingOrders.length}</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-semibold text-slate-300">Ready:</span>
            <span className="text-xs font-black text-emerald-400">{readyOrders.length}</span>
          </div>
        </div>

        {/* Desktop Controls & Clock */}
        <div className="hidden md:flex items-center space-x-2">
          {/* Real-time Clock */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 text-slate-300 font-mono text-xs border border-slate-700/40">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span>
              {currentTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playKitchenBell();
            }}
            title={soundEnabled ? 'Kitchen Bell Enabled' : 'Kitchen Bell Muted'}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Voice Order Announcer Toggle */}
          <button
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (!voiceEnabled) testSpeech();
            }}
            title={voiceEnabled ? 'Voice Order Announcer: ON (Speaks new incoming tickets)' : 'Voice Order Announcer: OFF'}
            className={`p-2.5 sm:px-3 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              voiceEnabled
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
          >
            <span className="text-sm">🗣️</span>
            <span className="hidden sm:inline">
              {voiceEnabled ? 'Voice: ON' : 'Voice: OFF'}
            </span>
          </button>

          {/* Test Voice Button */}
          {voiceEnabled && (
            <button
              onClick={testSpeech}
              title="Test Voice Announcement"
              className="p-2 sm:px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>🔈</span>
              <span className="hidden md:inline text-[11px]">Test</span>
            </button>
          )}

          {/* Auto-Print Toggle */}
          <button
            onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
            title={autoPrintEnabled ? 'Silent Auto-Printing Enabled (80mm receipts automatically print on cooking)' : 'Auto-Printing Disabled'}
            className={`p-2.5 sm:px-3 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              autoPrintEnabled
                ? 'bg-purple-500/25 text-purple-300 border-purple-500/60 shadow-lg shadow-purple-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
          >
            <Printer className={`w-4 h-4 ${autoPrintEnabled ? 'text-purple-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              {autoPrintEnabled ? '🖨️ Auto-Print: ON' : '🖨️ Auto-Print: OFF'}
            </span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Tablet Fullscreen"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchOrders}
            title="Refresh Orders"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          {/* Kitchen Rush Mode (+15m) Toggle */}
          <button
            onClick={handleToggleRushMode}
            disabled={togglingRush}
            title={rushMode ? "Rush Mode Active (+15 min extra prep time broadcasted live to customers)" : "Activate Rush Mode (+15 min extra prep time broadcasted live)"}
            className={`p-2.5 sm:px-3 rounded-xl border text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
              rushMode
                ? 'bg-red-500/25 text-red-300 border-red-500/60 shadow-lg shadow-red-500/30 animate-pulse'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
            }`}
          >
            <Flame className={`w-4 h-4 ${rushMode ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">
              {rushMode ? `🚨 RUSH (+${rushMinutes}m)` : `🔥 Rush Mode`}
            </span>
          </button>

          {/* Shop Open / Closed Status Display (Toggle restricted to Admin) */}
          {isAdmin ? (
            <button
              onClick={handleToggleShopFromKitchen}
              disabled={togglingShop}
              title={
                shopStatus?.isOpen
                  ? `Store OPEN (${shopStatus?.openMode === 'auto' ? `${shopStatus?.openingTime}-${shopStatus?.closingTime}` : 'Manual'}) - Click to Force Close`
                  : 'Store CLOSED - Click to Force Open Store'
              }
              className={`p-2.5 sm:px-3 rounded-xl border text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                shopStatus?.isOpen
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-red-950/70 border-red-500/50 text-red-300 hover:bg-red-900/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${shopStatus?.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
              <span className="hidden sm:inline">
                {shopStatus?.isOpen ? 'STORE OPEN' : 'STORE CLOSED'}
              </span>
            </button>
          ) : (
            <div
              title={`Store is currently ${shopStatus?.isOpen ? 'OPEN' : 'CLOSED'} (Admin managed)`}
              className={`p-2.5 sm:px-3 rounded-xl border text-xs font-black transition-all flex items-center space-x-1.5 shadow-sm ${
                shopStatus?.isOpen
                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-950/50 border-red-500/30 text-red-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${shopStatus?.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
              <span className="hidden sm:inline">
                {shopStatus?.isOpen ? 'STORE OPEN' : 'STORE CLOSED'}
              </span>
            </div>
          )}

          {/* Sales & Kitchen Production Stats (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => {
                setShowSalesModal(true);
                fetchSalesAnalytics();
              }}
              title="View Everyday, Weekly & Yearly Sales Data"
              className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Sales & Stats</span>
            </button>
          )}

          {/* Go to Admin Dashboard if admin */}
          {isAdmin && (
            <button
              onClick={() => navigate('/dashboard')}
              title="Switch to Admin Dashboard"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center space-x-1.5 text-xs font-semibold"
            >
              <LayoutDashboard className="w-4 h-4 text-orange-400" />
              <span className="hidden xl:inline">Admin</span>
            </button>
          )}

          {/* Account Security & Password */}
          <button
            onClick={() => setIsSecurityModalOpen(true)}
            title="Account Security & Password"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer"
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Security</span>
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Sign Out"
            className="p-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Fast Header Controls (< md screens) */}
        <div className="flex md:hidden items-center space-x-1.5">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playKitchenBell();
            }}
            title={soundEnabled ? 'Kitchen Bell Enabled' : 'Kitchen Bell Muted'}
            className={`p-2 rounded-xl border transition-all ${
              soundEnabled ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={handleToggleRushMode}
            disabled={togglingRush}
            title="Toggle Rush Mode"
            className={`p-2 rounded-xl border transition-all ${
              rushMode ? 'bg-red-500/25 text-red-300 border-red-500/60 animate-pulse' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            <Flame className="w-4 h-4" />
          </button>

          <button
            onClick={fetchOrders}
            title="Refresh Orders"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            title="More Options"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Actions Drawer / Modal */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 z-10 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <ChefHat className="w-5 h-5 text-amber-500" />
                  <h3 className="font-black text-white text-base">Kitchen Display Station</h3>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of Quick Controls */}
              <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
                <button
                  onClick={() => {
                    setVoiceEnabled(!voiceEnabled);
                    if (!voiceEnabled) testSpeech();
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 text-center ${
                    voiceEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <span className="text-xl">🗣️</span>
                  <span>{voiceEnabled ? 'Voice: ON' : 'Voice: OFF'}</span>
                </button>

                <button
                  onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 text-center ${
                    autoPrintEnabled ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Printer className="w-5 h-5 text-purple-400" />
                  <span>{autoPrintEnabled ? 'Auto-Print: ON' : 'Auto-Print: OFF'}</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-3 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 flex flex-col items-center justify-center space-y-1.5 text-center"
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
                </button>

                {isAdmin ? (
                  <button
                    onClick={handleToggleShopFromKitchen}
                    disabled={togglingShop}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 text-center ${
                      shopStatus?.isOpen ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'
                    }`}
                  >
                    <span className="text-xl">{shopStatus?.isOpen ? '🟢' : '🔴'}</span>
                    <span>Store: {shopStatus?.isOpen ? 'OPEN' : 'CLOSED'}</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-400 flex flex-col items-center justify-center space-y-1.5 text-center">
                    <span className="text-xl">{shopStatus?.isOpen ? '🟢' : '🔴'}</span>
                    <span>Store: {shopStatus?.isOpen ? 'OPEN' : 'CLOSED'}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowSalesModal(true);
                      fetchSalesAnalytics();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center space-x-2 text-xs font-bold"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>View Sales & Analytics</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate('/dashboard');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center justify-center space-x-2 text-xs font-bold"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Switch to Admin Panel</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsSecurityModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center justify-center space-x-2 text-xs font-bold"
                >
                  <Key className="w-4 h-4" />
                  <span>Security & Password</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 flex items-center justify-center space-x-2 text-xs font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dine-In Table Call Assistance Banner */}
      {tableAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-3 md:px-4 py-2.5 flex flex-wrap items-center justify-between shadow-2xl border-b border-amber-300/50 sticky top-14 md:top-16 z-35 animate-pulse">
          <div className="flex items-center space-x-3">
            <span className="text-xl md:text-2xl animate-bounce">🔔</span>
            <div>
              <span className="font-black text-xs md:text-sm uppercase tracking-wide">
                Dine-In Table Call: Table #{tableAlerts[0].tableNumber}
              </span>
              <span className="ml-2 font-bold text-[10px] md:text-xs bg-black/40 px-2 py-0.5 rounded-full border border-white/20">
                {tableAlerts[0].requestType}
              </span>
              {tableAlerts[0].note && (
                <span className="ml-2 text-[10px] md:text-xs italic text-amber-100 hidden sm:inline">
                  "{tableAlerts[0].note}"
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-1 sm:mt-0">
            <button
              onClick={() => {
                const currentAlert = tableAlerts[0];
                const sock = getSocket();
                if (sock) {
                  sock.emit('table_service_resolve', {
                    id: currentAlert.id,
                    tableNumber: currentAlert.tableNumber
                  });
                }
                setTableAlerts((prev) => prev.slice(1));
              }}
              className="px-3 md:px-4 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-black shadow-lg hover:bg-slate-100 transition-all cursor-pointer flex items-center space-x-1"
            >
              <span>✓ Attended</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Kanban Tab Selector (Visible only on < md screens) */}
      <div className="md:hidden flex items-center justify-around bg-slate-900/95 border-b border-slate-800/80 p-2 gap-1.5 sticky top-14 z-30 backdrop-blur-md">
        <button
          onClick={() => setMobileTab('Pending')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1 ${
            mobileTab === 'Pending'
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 bg-slate-950/60 border border-slate-800/60 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
          <span className="truncate">1. Naya</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-[10px] font-black shrink-0">
            {pendingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab('Preparing')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1 ${
            mobileTab === 'Preparing'
              ? 'bg-blue-500/25 text-blue-300 border border-blue-500/60 shadow-lg shadow-blue-500/20'
              : 'text-slate-400 bg-slate-950/60 border border-slate-800/60 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
          <span className="truncate">2. Bhatti</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-500/30 text-[10px] font-black shrink-0">
            {preparingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab('Ready')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1 ${
            mobileTab === 'Ready'
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 bg-slate-950/60 border border-slate-800/60 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="truncate">3. Tayar</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-[10px] font-black shrink-0">
            {readyOrders.length}
          </span>
        </button>
      </div>

      {/* Main Kanban Content Area */}
      <div className="flex-1 p-2 md:p-4 overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0 md:min-w-[760px] h-full">
          {/* ========================================================= */}
          {/* COLUMN 1: PENDING / NEW INCOMING ORDERS                   */}
          {/* ========================================================= */}
          <div className={`${mobileTab === 'Pending' ? 'flex' : 'hidden md:flex'} flex-col bg-slate-900/50 rounded-2xl border border-amber-500/20 p-3 h-full backdrop-blur-sm`}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/20">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]"></span>
                <h2 className="font-black text-sm uppercase tracking-wider text-amber-400">
                  1. Naya Order / Incoming KOT
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                {pendingOrders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {pendingOrders.map((order) => {
                  const isNew = newOrderIds.has(order._id);
                  const waitMinutes = getElapsedMinutes(order.createdAt);

                  return (
                    <motion.div
                      key={order._id}
                      initial={{ opacity: 0, y: -40, scale: 0.9 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        boxShadow: isNew
                          ? '0 0 25px rgba(245, 158, 11, 0.8)'
                          : '0 4px 20px rgba(0, 0, 0, 0.4)'
                      }}
                      exit={{ opacity: 0, scale: 0.8, x: 50 }}
                      transition={{ duration: 0.4, type: 'spring' }}
                      className={`glass-panel rounded-2xl p-4 border transition-all ${getUrgencyCardStyle(waitMinutes, isNew, 'border-amber-500/30')}`}
                    >
                      {/* Top Urgency Color Stripe */}
                      <div className={`h-1.5 w-full rounded-full mb-2.5 ${
                        waitMinutes >= 15
                          ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse'
                          : waitMinutes >= 8
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`} />

                      {/* Ticket Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-base font-black text-white">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                          {getUrgencyBadge(waitMinutes)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {renderOrderTypeBadge(order)}
                          <button
                            onClick={() => setSelectedPrintOrder(order)}
                            title="Print 80mm KOT Receipt"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="text-[11px] text-slate-400 py-1.5 flex justify-between">
                        <span className="font-medium text-slate-300">
                          {order.user?.name || 'Walk-in Guest'}
                        </span>
                        <span className="font-mono text-orange-400 font-bold">
                          📞 {order.deliveryPhone || 'Calling # not provided'}
                        </span>
                      </div>

                      {/* Delivery Handover PIN */}
                      {order.deliveryOtp && (
                        <div className="py-1 px-2 mb-1 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[10px]">
                          <span className="text-slate-300 font-bold flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                            <span>Handover PIN:</span>
                          </span>
                          <span className={`font-mono font-black ${order.otpVerifiedAt ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {order.deliveryOtp} {order.otpVerifiedAt ? '✓ Verified' : ''}
                          </span>
                        </div>
                      )}

                      {/* Delivery Address & Distance Pill */}
                      {order.deliveryAddress && (
                        <div className="text-[10px] text-slate-300 py-1 border-t border-slate-800/80">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-slate-400 font-semibold">📍 Destination:</span>
                            {order.deliveryDistance !== undefined && order.deliveryDistance !== null && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                Number(order.deliveryFee) === 0
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              }`}>
                                {order.deliveryDistance} km {Number(order.deliveryFee) === 0 ? '(Free <5km)' : `(Fee: ₹${order.deliveryFee})`}
                              </span>
                            )}
                          </div>
                          <div className="truncate text-slate-400 font-medium">
                            {order.deliveryAddress}
                          </div>
                          {order.customerCoords?.latitude && order.customerCoords?.longitude && (
                            <div className="mt-1 pt-1 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                              <span className="font-mono text-slate-400">
                                🛰️ {order.customerCoords.latitude.toFixed(4)}, {order.customerCoords.longitude.toFixed(4)}
                              </span>
                              <a
                                href={`https://www.google.com/maps?q=${order.customerCoords.latitude},${order.customerCoords.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:text-blue-300 font-bold"
                              >
                                Maps ↗
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Customer Note Highlight in BOLD RED */}
                      {order.customerNote && (
                        <div className="my-2 p-2.5 rounded-xl bg-red-950/80 border-2 border-red-500 text-red-200 text-xs font-black shadow-md flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                          <div>
                            <span className="text-[10px] uppercase tracking-wider block text-red-400 font-extrabold">
                              Special Instructions / Rasoi Hidayat:
                            </span>
                            <span className="text-white text-xs font-black">
                              {order.customerNote}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Payment Status Instruction Badge */}
                      {renderPaymentBadge(order)}

                      {/* Items Ordered List with Bumping / Item Checklist */}
                      <div className="my-3 space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={item._id || idx}
                            onClick={() => handleToggleItemReady(order._id, item._id)}
                            className={`rounded-xl p-2.5 border transition-all cursor-pointer ${
                              item.isReady
                                ? 'bg-emerald-950/60 border-emerald-500/50 shadow-sm'
                                : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                            }`}
                            title="Click to bump / mark item ready"
                          >
                            <div className="flex items-start justify-between">
                              <span className={`font-black text-sm flex items-center space-x-2 ${
                                item.isReady ? 'text-emerald-300 line-through' : 'text-white'
                              }`}>
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                  item.isReady
                                    ? 'bg-emerald-500/30 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {item.quantity}x
                                </span>
                                <span>{item.name}</span>
                              </span>
                              <div className="flex items-center space-x-1.5">
                                {item.isReady ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Ready
                                  </span>
                                ) : (
                                  item.size && (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[10px] font-bold">
                                      {item.size}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Toppings list */}
                            {item.toppings && item.toppings.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {item.toppings.map((top, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-500/30 text-[9px] font-semibold"
                                  >
                                    + {top}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Custom Pizza Builder Details */}
                            {item.customPizza && (
                              <div className="mt-2 p-2 rounded-xl bg-orange-950/50 border border-orange-500/30 text-[10px] space-y-1">
                                <div className="flex items-center justify-between font-bold text-orange-300">
                                  <span>🎨 Custom Studio {item.customPizza.isHalfAndHalf ? '(Half & Half)' : ''}</span>
                                  {item.customPizza.extraCheeseBurst && (
                                    <span className="px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[9px]">
                                      🧀 Extra Cheese Burst
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-300 text-[10px] space-y-0.5">
                                  <div><span className="text-slate-400">Crust:</span> {item.customPizza.crust} • <span className="text-slate-400">Sauce:</span> {item.customPizza.sauce}</div>
                                  {item.customPizza.isHalfAndHalf ? (
                                    <>
                                      <div><span className="text-amber-400 font-bold">Left Half:</span> {item.customPizza.leftHalf?.toppings?.length ? item.customPizza.leftHalf.toppings.join(', ') : 'Base Mozzarella'}</div>
                                      <div><span className="text-amber-400 font-bold">Right Half:</span> {item.customPizza.rightHalf?.toppings?.length ? item.customPizza.rightHalf.toppings.join(', ') : 'Base Mozzarella'}</div>
                                    </>
                                  ) : (
                                    <div><span className="text-amber-400 font-bold">Toppings:</span> {item.customPizza.leftHalf?.toppings?.length ? item.customPizza.leftHalf.toppings.join(', ') : 'Base Mozzarella'}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons: Cancel or Accept & Start Cooking */}
                      <div className="flex items-center space-x-2 pt-1">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setCancellingOrder(order);
                            setKitchenCancelReason('Kitchen Out of Stock / Cannot Fulfill');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer shrink-0"
                          title="Cancel Order"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleUpdateStatus(order._id, 'Preparing')}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>🔥 Bhatti Chalu / Start Cooking</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {pendingOrders.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center">
                  <CheckCircle className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-400">All Incoming Orders Caught Up</p>
                  <p className="text-[10px] text-slate-600 mt-1">New incoming tickets will slide in automatically.</p>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 2: PREPARING / IN THE OVEN                         */}
          {/* ========================================================= */}
          <div className={`${mobileTab === 'Preparing' ? 'flex' : 'hidden md:flex'} flex-col bg-slate-900/50 rounded-2xl border border-blue-500/20 p-3 h-full backdrop-blur-sm`}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-500/20">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></span>
                <h2 className="font-black text-sm uppercase tracking-wider text-blue-400">
                  2. Bhatti / Cooking Station
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-black">
                {preparingOrders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {preparingOrders.map((order) => {
                  const waitMinutes = getElapsedMinutes(order.createdAt);

                  return (
                    <motion.div
                      key={order._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, x: 50 }}
                      transition={{ duration: 0.3 }}
                      className={`glass-panel rounded-2xl p-4 border transition-all ${getUrgencyCardStyle(waitMinutes, false, 'border-blue-500/40')}`}
                    >
                      {/* Top Urgency Color Stripe */}
                      <div className={`h-1.5 w-full rounded-full mb-2.5 ${
                        waitMinutes >= 15
                          ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse'
                          : waitMinutes >= 8
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`} />

                      {/* Ticket Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-base font-black text-white">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                          {getUrgencyBadge(waitMinutes)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {renderOrderTypeBadge(order)}
                          <button
                            onClick={() => setSelectedPrintOrder(order)}
                            title="Print 80mm KOT Receipt"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Customer Note Highlight in BOLD RED */}
                      {order.customerNote && (
                        <div className="my-2 p-2 rounded-xl bg-red-950/80 border-2 border-red-500 text-red-200 text-xs font-black flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9px] uppercase tracking-wider block text-red-400 font-extrabold">
                              Special Instructions / Rasoi Hidayat:
                            </span>
                            <span className="text-white text-xs font-black">
                              {order.customerNote}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Payment Status Instruction Badge */}
                      {renderPaymentBadge(order)}

                      {/* Items Ordered List with Bumping / Item Checklist */}
                      <div className="my-3 space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={item._id || idx}
                            onClick={() => handleToggleItemReady(order._id, item._id)}
                            className={`rounded-xl p-2.5 border transition-all cursor-pointer ${
                              item.isReady
                                ? 'bg-emerald-950/60 border-emerald-500/50 shadow-sm'
                                : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                            }`}
                            title="Click to bump / mark item ready"
                          >
                            <div className="flex items-start justify-between">
                              <span className={`font-black text-sm flex items-center space-x-2 ${
                                item.isReady ? 'text-emerald-300 line-through' : 'text-white'
                              }`}>
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                  item.isReady
                                    ? 'bg-emerald-500/30 text-emerald-300'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {item.quantity}x
                                </span>
                                <span>{item.name}</span>
                              </span>
                              <div className="flex items-center space-x-1.5">
                                {item.isReady ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Ready
                                  </span>
                                ) : (
                                  item.size && (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[10px] font-bold">
                                      {item.size}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {item.toppings && item.toppings.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.toppings.map((top, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-500/30 text-[9px] font-semibold"
                                  >
                                    + {top}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Custom Pizza Builder Details */}
                            {item.customPizza && (
                              <div className="mt-2 p-2 rounded-xl bg-orange-950/50 border border-orange-500/30 text-[10px] space-y-1">
                                <div className="flex items-center justify-between font-bold text-orange-300">
                                  <span>🎨 Custom Studio {item.customPizza.isHalfAndHalf ? '(Half & Half)' : ''}</span>
                                  {item.customPizza.extraCheeseBurst && (
                                    <span className="px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[9px]">
                                      🧀 Extra Cheese Burst
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-300 text-[10px] space-y-0.5">
                                  <div><span className="text-slate-400">Crust:</span> {item.customPizza.crust} • <span className="text-slate-400">Sauce:</span> {item.customPizza.sauce}</div>
                                  {item.customPizza.isHalfAndHalf ? (
                                    <>
                                      <div><span className="text-amber-400 font-bold">Left Half:</span> {item.customPizza.leftHalf?.toppings?.length ? item.customPizza.leftHalf.toppings.join(', ') : 'Base Mozzarella'}</div>
                                      <div><span className="text-amber-400 font-bold">Right Half:</span> {item.customPizza.rightHalf?.toppings?.length ? item.customPizza.rightHalf.toppings.join(', ') : 'Base Mozzarella'}</div>
                                    </>
                                  ) : (
                                    <div><span className="text-amber-400 font-bold">Toppings:</span> {item.customPizza.leftHalf?.toppings?.length ? item.customPizza.leftHalf.toppings.join(', ') : 'Base Mozzarella'}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons: Cancel or Mark Ready */}
                      <div className="flex items-center space-x-2 pt-1">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setCancellingOrder(order);
                            setKitchenCancelReason('Kitchen Out of Stock / Cannot Fulfill');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer shrink-0"
                          title="Cancel Order"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleUpdateStatus(order._id, 'Ready')}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>✓ Tayar / Pack & Ready</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {preparingOrders.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center">
                  <Clock className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-400">No Orders Currently Cooking</p>
                  <p className="text-[10px] text-slate-600 mt-1">Accept pending tickets to start cooking.</p>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 3: READY / EXPEDITE                                */}
          {/* ========================================================= */}
          <div className={`${mobileTab === 'Ready' ? 'flex' : 'hidden md:flex'} flex-col bg-slate-900/50 rounded-2xl border border-emerald-500/20 p-3 h-full backdrop-blur-sm`}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-500/20">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
                <h2 className="font-black text-sm uppercase tracking-wider text-emerald-400">
                  3. Pack & Ready / Handover Station
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                {readyOrders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {readyOrders.map((order) => (
                  <motion.div
                    key={order._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, x: 50 }}
                    transition={{ duration: 0.3 }}
                    className="glass-panel rounded-2xl p-4 border border-emerald-500/40 bg-slate-900/90 hover:border-emerald-400 shadow-lg"
                  >
                    {/* Ticket Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-base font-black text-white">
                          #{order._id.slice(-6).toUpperCase()}
                        </span>
                        {order.status === 'Out for Delivery' ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1">
                            <Truck className="w-3 h-3" /> ON WAY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            READY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {renderOrderTypeBadge(order)}
                        <button
                          onClick={() => setSelectedPrintOrder(order)}
                          title="Print 80mm KOT Receipt"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 py-1.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-200 truncate max-w-[65%]">
                        {order.user?.name || 'Customer'}
                      </span>
                      <span className="text-orange-400 font-mono font-bold">
                        {order.orderType === 'dine_in' ? `🍽️ Table ${order.tableNumber || ''}` : (order.deliveryAddress ? '🛵 Delivery' : '🥡 Takeaway')}
                      </span>
                    </div>

                    {order.rider?.name && (
                      <div className="my-2 p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">🛵</span>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-cyan-400 block">Rider Assigned</span>
                            <span className="font-bold text-white text-xs">{order.rider.name}</span>
                          </div>
                        </div>
                        {order.rider.phone && (
                          <a
                            href={`tel:${order.rider.phone}`}
                            className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 border border-cyan-500/30 text-[10px] font-bold"
                          >
                            📞 Call
                          </a>
                        )}
                      </div>
                    )}

                    {/* Payment Status Instruction Badge */}
                    {renderPaymentBadge(order)}

                    {/* Items summary */}
                    <div className="my-2.5 space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs text-slate-300 flex flex-col font-medium py-0.5">
                          <div className="flex justify-between items-center">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-slate-500 text-[10px]">{item.size || ''}</span>
                          </div>
                          {item.customPizza && (
                            <span className="text-[9px] text-orange-400 font-normal">
                              🎨 Custom {item.customPizza.isHalfAndHalf ? 'Half & Half' : ''} {item.customPizza.extraCheeseBurst ? '+ Cheese Burst' : ''}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons: Assign Rider / Delivered */}
                    <div className="space-y-2 pt-1">
                      {order.deliveryAddress && order.status !== 'Out for Delivery' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDispatchOrder(order);
                            setRiderName(order.rider?.name || '');
                            setRiderPhone(order.rider?.phone || '');
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Assign Rider & Dispatch</span>
                        </button>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleUpdateStatus(order._id, 'Delivered')}
                        className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer ${
                          order.status === 'Out for Delivery'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700'
                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>
                          {order.status === 'Out for Delivery'
                            ? 'Mark Order Delivered'
                            : order.orderType === 'dine_in'
                            ? '🍽️ Table Served / Complete'
                            : order.orderType === 'takeaway'
                            ? '🥡 Parcel Handover Complete'
                            : 'Complete Handover'}
                        </span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setCancellingOrder(order);
                          setKitchenCancelReason('Kitchen Out of Stock / Cannot Fulfill');
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-500/20 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                        title="Cancel this order"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel Order</span>
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {readyOrders.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center">
                  <CheckCircle className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-400">No Orders Waiting for Handover</p>
                  <p className="text-[10px] text-slate-600 mt-1">Ready orders appear here for pickup.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Print Modal & Hidden Print View */}
      {selectedPrintOrder && (
        <ReceiptPrint
          order={selectedPrintOrder}
          onClose={() => setSelectedPrintOrder(null)}
        />
      )}

      {/* KDS Delivery Handover OTP Verification Modal */}
      <AnimatePresence>
        {kdsOtpModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Handover PIN Verification</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Order #{kdsOtpModal.orderId.slice(-6).toUpperCase()} • Customer: {kdsOtpModal.order?.user?.name || 'Walk-in'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setKdsOtpModal(null);
                    setKdsInputOtp('');
                    setKdsOtpError('');
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200">
                Ask the customer at the counter or doorstep for their 4-digit Delivery PIN before completing this order.
              </div>

              {kdsOtpError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold">
                  {kdsOtpError}
                </div>
              )}

              <form onSubmit={handleVerifyKdsOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
                    Enter 4-Digit Customer PIN
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    autoFocus
                    placeholder="• • • •"
                    value={kdsInputOtp}
                    onChange={(e) => setKdsInputOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[1em] text-3xl font-mono font-black py-3 rounded-2xl bg-slate-950 border-2 border-amber-500/50 text-amber-400 placeholder-slate-700 focus:outline-none focus:border-amber-400"
                  />
                  {kdsOtpModal.order?.deliveryOtp && (
                    <p className="text-[11px] text-slate-500 text-center mt-1.5">
                      Counter Reference PIN: <span className="font-mono font-bold text-slate-300">{kdsOtpModal.order.deliveryOtp}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={kdsVerifyingOtp || kdsInputOtp.length !== 4}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 cursor-pointer"
                  >
                    {kdsVerifyingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirm PIN & Complete Handover</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBypassKdsOtp}
                    disabled={kdsVerifyingOtp}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Counter Emergency Bypass (No PIN)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rider Dispatch Modal */}
      <AnimatePresence>
        {dispatchOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-cyan-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
                    🛵
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Assign Delivery Rider</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Order #{dispatchOrder._id.slice(-6).toUpperCase()} • ₹{dispatchOrder.totalAmount}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDispatchOrder(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Destination preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>📍 Destination:</span>
                  <span className="text-orange-400 font-medium truncate max-w-xs">{dispatchOrder.deliveryAddress}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Customer: {dispatchOrder.user?.name || 'Customer'} (📞 {dispatchOrder.deliveryPhone || 'Not provided'})
                </div>
              </div>

              {/* Quick Rider Selection Presets */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                  Quick In-House Riders:
                </label>
                <div className="flex flex-wrap gap-2">
                  {driversList.length > 0 ? (
                    driversList.map((r) => (
                      <button
                        key={r._id || r.name}
                        type="button"
                        onClick={() => {
                          setRiderName(r.name);
                          setRiderPhone(r.phone || '');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700"
                      >
                        + {r.name}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No registered riders found. Enter details below.</span>
                  )}
                </div>
              </div>

              <form onSubmit={handleAssignRiderSubmit} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Rider Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Verma"
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Rider Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={riderPhone}
                    onChange={(e) => setRiderPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setDispatchOrder(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={dispatching}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-black shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>{dispatching ? 'Dispatching...' : 'Dispatch Order 🛵'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kitchen Order Cancellation Modal */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    Cancel Order #{cancellingOrder._id.slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {cancellingOrder.user?.name || 'Walk-in'} • 📞 {cancellingOrder.deliveryPhone || 'Not provided'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-xs text-red-200 mb-4">
                Cancelling this order will automatically restock items, release applied coupons, and notify the customer in real-time.
              </div>

              <form onSubmit={handleConfirmCancelKitchen} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Select Cancellation Reason
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 mb-2">
                    {[
                      'Kitchen Out of Stock / Cannot Fulfill',
                      'Kitchen Rush / Extreme Peak Delay',
                      'Customer Requested Cancellation via Phone',
                      'Incorrect Delivery Location / Too Far',
                      'Kitchen Emergency / Equipment Issue'
                    ].map((quickReason) => (
                      <button
                        key={quickReason}
                        type="button"
                        onClick={() => setKitchenCancelReason(quickReason)}
                        className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          kitchenCancelReason === quickReason
                            ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                        }`}
                      >
                        • {quickReason}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Or type custom reason..."
                    value={kitchenCancelReason}
                    onChange={(e) => setKitchenCancelReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setCancellingOrder(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCancel}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-black shadow-lg shadow-red-500/25 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kitchen Sales & Production Analytics Modal */}
      <AnimatePresence>
        {showSalesModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-orange-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base tracking-tight">
                      Kitchen Sales & Production Intelligence
                    </h3>
                    <p className="text-xs text-slate-400">
                      Live Everyday, Weekly, and Yearly sales tracking
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchSalesAnalytics}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Refresh Stats"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingSales ? 'animate-spin text-orange-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowSalesModal(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Timeframe Tabs */}
              <div className="flex bg-slate-950 p-2 gap-2 border-b border-slate-800">
                <button
                  onClick={() => setSalesTab('everyday')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    salesTab === 'everyday'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Everyday Sale</span>
                </button>

                <button
                  onClick={() => setSalesTab('weekly')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    salesTab === 'weekly'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Weekly Sale</span>
                </button>

                <button
                  onClick={() => setSalesTab('yearly')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    salesTab === 'yearly'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Yearly Sale</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                {/* 1. EVERYDAY SALE TAB */}
                {salesTab === 'everyday' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Kitchen Revenue</span>
                        <div className="text-2xl font-black text-white mt-1">
                          ₹{(salesData?.everyday?.todayRevenue ?? 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-orange-400 font-semibold mt-0.5">
                          {salesData?.everyday?.todayOrdersCount ?? 0} tickets cooked today
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Yesterday's Total</span>
                        <div className="text-2xl font-black text-slate-300 mt-1">
                          ₹{(salesData?.everyday?.yesterdayRevenue ?? 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          {salesData?.everyday?.yesterdayOrdersCount ?? 0} tickets fulfilled
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Average Ticket</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1">
                          ₹{salesData?.summary?.avgOrderValue ?? 0}
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          Per order throughput
                        </div>
                      </div>
                    </div>

                    {/* 30-Day Daily Chart */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Last 30 Days Kitchen Orders & Sales
                      </h4>
                      <div className="overflow-x-auto pb-2">
                        <div className="min-w-[650px] flex items-end justify-between gap-1.5 h-36 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                          {(() => {
                            const daily = salesData?.everyday?.dailyData || [];
                            const maxRev = Math.max(...daily.map((d) => d.revenue), 1000);
                            return daily.map((d, idx) => {
                              const heightPct = Math.max(8, Math.round((d.revenue / maxRev) * 100));
                              return (
                                <div
                                  key={idx}
                                  className="flex-1 flex flex-col items-center justify-end group relative cursor-pointer"
                                >
                                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-slate-700 text-white text-[9px] py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-lg">
                                    {d.label}: ₹{d.revenue} ({d.orderCount} ord)
                                  </div>
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full rounded-t-sm transition-all ${
                                      d.revenue > 0 ? 'bg-gradient-to-t from-orange-600 to-amber-400' : 'bg-slate-800'
                                    }`}
                                  />
                                  <span className="text-[8px] text-slate-500 mt-1">
                                    {d.label.split(' ')[0]}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. WEEKLY SALE TAB */}
                {salesTab === 'weekly' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">This Week's Revenue</span>
                        <div className="text-2xl font-black text-white mt-1">
                          ₹{(salesData?.weekly?.thisWeekRevenue ?? 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-orange-400 font-semibold mt-0.5">
                          {salesData?.weekly?.thisWeekOrdersCount ?? 0} orders this week
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Average (This Week)</span>
                        <div className="text-2xl font-black text-slate-300 mt-1">
                          ₹{Math.round((salesData?.weekly?.thisWeekRevenue ?? 0) / 7).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          Daily average revenue
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Historical Weeks</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1">
                          {salesData?.weekly?.weeklyData?.length || 8} Weeks
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          Multi-week volume data
                        </div>
                      </div>
                    </div>

                    {/* Day-of-Week Kitchen Prep Peak Chart */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Day-of-Week Orders (Kitchen Prep Insights)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                        {(() => {
                          const dayWise = salesData?.weekly?.dayWiseData || [];
                          const maxOrders = Math.max(...dayWise.map((d) => d.orderCount), 1);
                          return dayWise.map((day, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-orange-400">{day.day}</span>
                                <span className="text-[10px] text-slate-400">{day.orderCount} ord</span>
                              </div>
                              <div className="text-sm font-black text-white mt-1.5">₹{day.revenue}</div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                  style={{ width: `${Math.round((day.orderCount / maxOrders) * 100)}%` }}
                                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full"
                                />
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. YEARLY SALE TAB */}
                {salesTab === 'yearly' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Year {salesData?.yearly?.year || new Date().getFullYear()} Revenue
                        </span>
                        <div className="text-2xl font-black text-white mt-1">
                          ₹{(salesData?.yearly?.thisYearRevenue ?? 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-orange-400 font-semibold mt-0.5">
                          {salesData?.yearly?.thisYearOrdersCount ?? 0} annual tickets
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Average</span>
                        <div className="text-2xl font-black text-slate-300 mt-1">
                          ₹{Math.round((salesData?.yearly?.thisYearRevenue ?? 0) / (new Date().getMonth() + 1)).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          Average per active month
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Lifetime Sales</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1">
                          ₹{(salesData?.summary?.totalRevenue ?? 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          {salesData?.summary?.totalOrdersCount ?? 0} total orders
                        </div>
                      </div>
                    </div>

                    {/* 12-Month Grid */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        12 Months Kitchen Order Volume ({salesData?.yearly?.year || new Date().getFullYear()})
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                        {(() => {
                          const months = salesData?.yearly?.monthlyData || [];
                          const maxRev = Math.max(...months.map((m) => m.revenue), 1000);
                          return months.map((m, idx) => {
                            const heightPct = Math.max(10, Math.round((m.revenue / maxRev) * 100));
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-between h-32"
                              >
                                <span className="text-[11px] font-bold text-orange-400">{m.month}</span>
                                <div className="w-full flex-1 flex items-end justify-center my-1.5">
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-3/4 rounded-t-sm ${
                                      m.revenue > 0 ? 'bg-gradient-to-t from-orange-600 to-amber-400' : 'bg-slate-800'
                                    }`}
                                  />
                                </div>
                                <div className="text-[9px] font-bold text-white">₹{m.revenue}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* TOP 10 KITCHEN ITEMS PREPARED */}
                {salesData?.topSellingItems && salesData.topSellingItems.length > 0 && (
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center space-x-2 mb-3">
                      <Award className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Top 10 Most Ordered Menu Items (Kitchen Prep Priority)
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                      {salesData.topSellingItems.map((prod, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 ${
                                idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">{prod.name}</div>
                              <div className="text-[10px] text-slate-400">{prod.quantity} cooked</div>
                            </div>
                          </div>
                          <div className="text-xs font-bold text-amber-400 shrink-0 ml-1">
                            ₹{prod.totalRevenue}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Credentials & Security Modal */}
      <ChangeCredentialsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </div>
  );
};


export default Kitchen;
