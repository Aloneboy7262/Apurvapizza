import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Phone,
  MapPin,
  CheckCircle2,
  PackageCheck,
  RotateCcw,
  LogOut,
  Navigation,
  Clock,
  Banknote,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getSocket } from '../services/socket';

const DeliveryPortal = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isGpsSharing, setIsGpsSharing] = useState(true);
  const [cashSummary, setCashSummary] = useState({ totalCashInHand: 0, unsettledOrdersCount: 0 });

  // Fetch driver orders & cash in hand summary
  const fetchAssignedOrders = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError(null);
      const [res, cashRes] = await Promise.all([
        api.get('/orders/driver/assigned'),
        api.get('/orders/driver/my-cash').catch(() => ({ data: { success: false } }))
      ]);

      if (res.data.success) {
        setOrders(res.data.data || []);
      }
      if (cashRes.data?.success) {
        setCashSummary(cashRes.data);
      }
    } catch (err) {
      console.error('Error fetching driver orders:', err);
      setError(err.response?.data?.message || 'Could not load assigned deliveries.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  // Live GPS Tracking Broadcast via Socket to Customer & Admin with Offline Resiliency
  useEffect(() => {
    if (!isGpsSharing || !navigator.geolocation) return;
    const socket = getSocket();
    if (!socket) return;

    // Find active order in 'Out for Delivery' status
    const activeOutOrder = orders.find((o) => o.status === 'Out for Delivery');
    if (!activeOutOrder) return;

    const handleConnect = () => {
      try {
        const buffered = JSON.parse(localStorage.getItem('rider_gps_buffer') || '[]');
        if (buffered.length > 0) {
          buffered.forEach((c) => socket.emit('rider_location_update', c));
          localStorage.removeItem('rider_gps_buffer');
        }
      } catch (_) {}
    };
    socket.on('connect', handleConnect);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          orderId: activeOutOrder._id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed
        };
        if (socket.connected) {
          socket.emit('rider_location_update', coords);
        } else {
          try {
            const buf = JSON.parse(localStorage.getItem('rider_gps_buffer') || '[]');
            buf.push(coords);
            if (buf.length > 20) buf.shift();
            localStorage.setItem('rider_gps_buffer', JSON.stringify(buf));
          } catch (_) {}
        }
      },
      (err) => console.warn('[Rider GPS Stream] Error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      socket.off('connect', handleConnect);
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isGpsSharing, orders]);

  useEffect(() => {
    fetchAssignedOrders();

    const socket = getSocket();
    if (socket && user?._id) {
      socket.emit('join_driver', { driverId: user._id });

      const handleOrderUpdate = (data) => {
        console.log('[Driver Portal] Live order update received:', data);
        fetchAssignedOrders();
      };

      socket.on('new_delivery_assigned', handleOrderUpdate);
      socket.on('order_status_update', handleOrderUpdate);
      socket.on('order_status_updated', handleOrderUpdate);

      return () => {
        socket.off('new_delivery_assigned', handleOrderUpdate);
        socket.off('order_status_update', handleOrderUpdate);
        socket.off('order_status_updated', handleOrderUpdate);
      };
    }
  }, [user]);

  // Handle Driver Status Update with optional Handover PIN
  const handleUpdateStatus = async (orderId, newStatus, otp = null) => {
    try {
      setUpdatingOrderId(orderId);
      setOtpError('');
      const payload = { status: newStatus };
      if (otp) {
        payload.otp = String(otp).trim();
      }

      const res = await api.patch(`/orders/${orderId}/driver-status`, payload);

      if (res.data.success) {
        setActionSuccessMsg(`Order #${orderId.slice(-6).toUpperCase()} marked as ${newStatus}!`);
        setTimeout(() => setActionSuccessMsg(''), 4000);
        setConfirmDeliveryOrder(null);
        setEnteredOtp('');
        await fetchAssignedOrders();
      }
    } catch (err) {
      console.error('Failed to update delivery status:', err);
      const msg = err.response?.data?.message || 'Failed to update delivery status.';
      setOtpError(msg);
      if (newStatus !== 'Delivered') {
        alert(msg);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const activeDeliveries = orders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
  );
  const completedDeliveries = orders.filter((o) => o.status === 'Delivered');

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black text-white tracking-wide">
                Apurva Pizza Hub
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Rider Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Welcome, <strong className="text-white">{user?.name || 'Delivery Partner'}</strong>
              {user?.phone ? ` • +91 ${user.phone}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchAssignedOrders(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
            title="Refresh Deliveries"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Success Alert Banner */}
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center space-x-2 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </motion.div>
        )}

        {/* Live GPS Broadcaster HUD & Cash in Bag Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* GPS Broadcast Pill */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <span className={`w-3 h-3 rounded-full ${isGpsSharing ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`} />
              <div>
                <span className="text-xs font-black text-white block">
                  {isGpsSharing ? '🛰️ Live GPS: Broadcasting' : '🛰️ Live GPS: Paused'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {isGpsSharing ? 'Customer sees real-time bike movement' : 'GPS sharing is currently turned off'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsGpsSharing(!isGpsSharing)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isGpsSharing
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {isGpsSharing ? 'Active' : 'Enable'}
            </button>
          </div>

          {/* Cash in Bag Summary */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/30 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl">💰</span>
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">
                  Today's COD Cash in Bag
                </span>
                <span className="text-base font-black text-white font-mono">
                  ₹{Number(cashSummary?.totalCashInHand || 0).toFixed(2)}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {cashSummary?.unsettledOrdersCount || 0} Orders
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Active Deliveries</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'active'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {activeDeliveries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Completed Today</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'completed'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {completedDeliveries.length}
            </span>
          </button>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">Loading assigned deliveries...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800/60 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm font-bold text-red-200">{error}</p>
            <button
              onClick={() => fetchAssignedOrders(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty States */}
        {!loading && !error && activeTab === 'active' && activeDeliveries.length === 0 && (
          <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">No Active Deliveries Right Now</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When kitchen staff assigns pizzas or sides to your rider account, they will automatically appear here with live notification!
            </p>
          </div>
        )}

        {!loading && !error && activeTab === 'completed' && completedDeliveries.length === 0 && (
          <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">No Completed Deliveries Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Delivered orders for today will be logged here for delivery verification and billing summary.
            </p>
          </div>
        )}

        {/* Deliveries List */}
        {!loading && !error && (
          <div className="space-y-4">
            {(activeTab === 'active' ? activeDeliveries : completedDeliveries).map((order) => {
              const isCOD = order.paymentMethod === 'cod';
              const isPaid = order.paymentStatus === 'paid';
              const stringId = order._id.toString();
              const shortId = stringId.slice(-6).toUpperCase();
              const customerName = order.user?.name || 'Customer';
              const customerPhone = order.deliveryPhone || order.user?.phone || '';
              const customerAddress = order.deliveryAddress || order.user?.address || 'Pathardewa Local Area';

              return (
                <motion.div
                  key={stringId}
                  layout
                  className={`p-5 rounded-3xl border transition-all ${
                    order.status === 'Delivered'
                      ? 'bg-slate-900/50 border-slate-800/80 opacity-80'
                      : 'bg-slate-900/90 border-cyan-500/30 shadow-xl shadow-cyan-950/20'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-black text-cyan-400">
                        #{shortId}
                      </span>
                      <span className="text-xs text-slate-400">
                        • Placed {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          order.status === 'Out for Delivery'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                            : order.status === 'Delivered'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {order.status}
                      </span>

                      {/* Payment Pill */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center space-x-1 ${
                          isCOD
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        <Banknote className="w-3 h-3" />
                        <span>{isCOD ? 'Cash on Delivery' : 'Online UPI Paid'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Customer Information & Navigation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 py-3.5">
                    {/* Customer Contact */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
                          Customer Contact
                        </span>
                        <h4 className="text-base font-black text-white mt-0.5">{customerName}</h4>
                      </div>

                      {customerPhone ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <a
                            href={`tel:${customerPhone}`}
                            className="h-11 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/25 active:scale-95"
                          >
                            <Phone className="w-4 h-4" />
                            <span>Call Customer</span>
                          </a>

                          <a
                            href={`https://wa.me/91${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${customerName}! Your Apurva Pizza Hub delivery partner is outside your location with Order #${shortId}. Please share your 4-digit Delivery PIN: ${order.deliveryOtp || '****'} to collect your hot pizza!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-11 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/25 active:scale-95"
                          >
                            <span>💬 WhatsApp "Outside"</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No phone number provided</p>
                      )}
                    </div>

                    {/* Delivery Address & GPS Coordinates */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-orange-400 flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Destination Address ({order.deliveryDistance ? `${order.deliveryDistance} KM` : '<5 KM'})</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-100 font-semibold mt-1 leading-snug break-words">
                          {customerAddress}
                        </p>

                        {/* Customer Live GPS Coordinates */}
                        {order.customerCoords?.latitude && order.customerCoords?.longitude ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1">
                              <Navigation className="w-2.5 h-2.5 text-cyan-400" />
                              <span>GPS: {order.customerCoords.latitude.toFixed(5)}, {order.customerCoords.longitude.toFixed(5)}</span>
                            </span>
                            {order.customerCoords.accuracy && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                (±{Math.round(order.customerCoords.accuracy)}m)
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className="pt-1">
                        <a
                          href={
                            order.customerCoords?.latitude && order.customerCoords?.longitude
                              ? `https://www.google.com/maps/dir/?api=1&destination=${order.customerCoords.latitude},${order.customerCoords.longitude}`
                              : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customerAddress)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/25 active:scale-95"
                        >
                          <Navigation className="w-4 h-4 text-cyan-300" />
                          <span>Start Google Maps Navigation</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Checklist & Cash Notice */}
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-2.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
                      Order Food Items Checklist
                    </span>
                    <div className="divide-y divide-slate-800/60">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs">
                          <span className="text-slate-200 font-bold">
                            {item.quantity || 1}x {item.name || item.product?.name || 'Item'}
                            {item.size ? ` (${item.size})` : ''}
                          </span>
                          <span className="font-mono text-slate-400 font-semibold">
                            ₹{(Number(item.price) || 0) * (Number(item.quantity) || 1)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Cash Collection Banner */}
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isCOD
                        ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                        : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{isCOD ? '💵' : '✅'}</span>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider block">
                            {isCOD ? 'Cash on Delivery (Collect Before Handover)' : 'Order is Fully Prepaid Online'}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            {isCOD ? 'Customer must pay cash' : 'Zero cash needed - verified online payment'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 block">Amount:</span>
                        <span className="text-lg font-black font-mono text-white">
                          ₹{Number(order.totalAmount || 0).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Driver Handover & Progression Actions */}
                  {order.status !== 'Delivered' && (
                    <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                      {order.status !== 'Out for Delivery' && (
                        <button
                          type="button"
                          disabled={updatingOrderId === stringId}
                          onClick={() => handleUpdateStatus(stringId, 'Out for Delivery')}
                          className="h-12 px-6 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-600/30 cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          <Truck className="w-4 h-4" />
                          <span>🏍️ Start Ride (Out for Delivery)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setConfirmDeliveryOrder(order)}
                        className="h-12 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {isCOD
                            ? `✓ Handover & Collect ₹${Number(order.totalAmount || 0).toFixed(0)} Cash`
                            : '✓ Confirm Handover to Customer'}
                        </span>
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Handover & OTP Modal */}
      <AnimatePresence>
        {confirmDeliveryOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-cyan-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Verify Handover & Complete</h3>
                  <p className="text-xs text-slate-400">
                    Order #{confirmDeliveryOrder._id.slice(-6).toUpperCase()} • {confirmDeliveryOrder.user?.name || 'Customer'}
                  </p>
                </div>
              </div>

              {confirmDeliveryOrder.paymentMethod === 'cod' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center space-x-2.5">
                  <Banknote className="w-5 h-5 shrink-0 text-amber-400" />
                  <div>
                    <span className="block font-black text-amber-200 uppercase text-[10px] tracking-wider">Cash on Delivery</span>
                    <span>Please collect exact cash: ₹{Number(confirmDeliveryOrder.totalAmount || 0).toFixed(0)}</span>
                  </div>
                </div>
              )}

              {/* Handover OTP Input */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Customer 4-Digit Handover PIN <span className="text-cyan-400">*</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Ask the customer for the 4-digit security PIN displayed on their active order screen.
                </p>
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  placeholder="• • • •"
                  value={enteredOtp}
                  onChange={(e) => {
                    setEnteredOtp(e.target.value.replace(/\D/g, ''));
                    setOtpError('');
                  }}
                  className="w-full text-center text-3xl font-mono tracking-widest py-3 px-4 rounded-2xl bg-slate-950 border border-cyan-500/40 text-cyan-300 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />
                {otpError && (
                  <p className="text-xs font-bold text-red-400 flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{otpError}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
                {/* Emergency Counter Bypass */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Bypass Handover PIN? Use only if customer's phone is uncharged or unavailable.")) {
                      handleUpdateStatus(confirmDeliveryOrder._id, 'Delivered', confirmDeliveryOrder.deliveryOtp);
                    }
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-amber-400 underline cursor-pointer"
                >
                  ⚡ Phone Unavailable? Bypass PIN
                </button>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeliveryOrder(null);
                      setEnteredOtp('');
                      setOtpError('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updatingOrderId === confirmDeliveryOrder._id || (!enteredOtp && Boolean(confirmDeliveryOrder.deliveryOtp))}
                    onClick={() => handleUpdateStatus(confirmDeliveryOrder._id, 'Delivered', enteredOtp)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {updatingOrderId === confirmDeliveryOrder._id ? 'Verifying...' : 'Verify & Deliver'}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryPortal;
