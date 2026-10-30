import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import AddressModal from '../components/AddressModal';
import {
  User,
  Phone,
  MapPin,
  Clock,
  PackageCheck,
  ChefHat,
  CheckCircle,
  Truck,
  RotateCcw,
  Sparkles,
  AlertCircle,
  LogOut,
  ShoppingBag,
  Bell,
  Flame,
  Check,
  Plus,
  Trash2,
  Edit3,
  Home,
  Briefcase,
  Building,
  Key,
  Shield,
  XCircle,
  X
} from 'lucide-react';
import CustomerCredentialsModal from '../components/CustomerCredentialsModal';

const STATUS_CONFIG = {
  Pending: {
    label: 'Order Placed',
    sublabel: 'Kitchen ticket queued',
    step: 1,
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40',
    dotClass: 'bg-amber-500 dark:bg-amber-400 animate-ping'
  },
  Preparing: {
    label: 'Baking in Oven',
    sublabel: 'Chef is baking your pizza',
    step: 2,
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40',
    dotClass: 'bg-blue-600 dark:bg-blue-400 animate-pulse'
  },
  Ready: {
    label: 'Baked & Ready',
    sublabel: 'Packed & ready for dispatch',
    step: 3,
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/40',
    dotClass: 'bg-purple-600 dark:bg-purple-400 animate-pulse'
  },
  'Out for Delivery': {
    label: 'Out for Delivery',
    sublabel: 'Rider is on the way to your doorstep',
    step: 4,
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/40',
    dotClass: 'bg-cyan-600 dark:bg-cyan-400 animate-pulse'
  },
  Delivered: {
    label: 'Delivered',
    sublabel: 'Enjoy your hot meal!',
    step: 5,
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400'
  },
  Cancelled: {
    label: 'Order Cancelled',
    sublabel: 'This order was cancelled',
    step: 0,
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40',
    dotClass: 'bg-rose-600 dark:bg-rose-400'
  }
};

const Profile = () => {
  const {
    user,
    isAuthenticated,
    logout,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
  } = useAuth();
  const { socket, isConnected, trackOrder, activeOrder } = useSocket();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Success message passed from checkout redirect
  const [successBanner, setSuccessBanner] = useState(location.state?.successMessage || null);

  // Store automation features (Wallet, Handover OTP)
  const [featureSettings, setFeatureSettings] = useState(null);

  // Zomato / Swiggy Google Maps Location Picker Modal state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingAddressData, setEditingAddressData] = useState(null);
  const [addressToast, setAddressToast] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);

  // Order Cancellation state
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  const handleCancelOrderSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingOrder) return;
    try {
      setIsSubmittingCancel(true);
      setCancelError('');
      const res = await api.put(`/orders/${cancellingOrder._id}/cancel`, {
        reason: cancelReason.trim() || 'Cancelled by customer'
      });
      if (res.data.success) {
        setCancelSuccessMsg('Your order has been cancelled successfully.');
        setOrders((prev) =>
          prev.map((o) => (o._id === cancellingOrder._id ? res.data.data : o))
        );
        setTimeout(() => {
          setCancellingOrder(null);
          setCancelReason('');
          setCancelSuccessMsg('');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setCancelError(err.response?.data?.message || 'Could not cancel order.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const showToast = (message) => {
    setAddressToast(message);
    setTimeout(() => {
      setAddressToast(null);
    }, 3500);
  };

  const handleOpenAddModal = () => {
    setEditingAddressData(null);
    setIsLocationModalOpen(true);
  };

  const handleOpenEditModal = (addr) => {
    setEditingAddressData(addr);
    setIsLocationModalOpen(true);
  };

  const handleSaveModalAddress = async (payload) => {
    if (editingAddressData && editingAddressData._id) {
      await updateAddress(editingAddressData._id, payload);
      showToast('Address updated successfully!');
    } else {
      await addAddress(payload);
      showToast('New delivery address saved to your profile!');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      setActionLoadingId(addressId);
      await deleteAddress(addressId);
      showToast('Address removed successfully.');
    } catch (err) {
      console.error('Failed to delete address:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      setActionLoadingId(addressId);
      await setDefaultAddress(addressId);
      showToast('Default delivery address updated.');
    } catch (err) {
      console.error('Failed to set default address:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Fetch orders from /api/orders/me through pipeline
  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      let res;
      try {
        res = await api.get('/orders/me');
      } catch (e) {
        res = await api.get('/orders/my-orders');
      }

      if (res.data.success) {
        const orderList = res.data.data || [];
        setOrders(orderList);

        // Join socket tracking room for every order
        orderList.forEach((order) => {
          trackOrder(String(order._id));
        });
      } else {
        setError('Failed to load orders.');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (showLoading) setError(err.response?.data?.message || 'Could not load your orders.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders(true);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    api.get('/features/public').then((res) => {
      if (res.data?.success && res.data.data) {
        setFeatureSettings(res.data.data);
      }
    }).catch((err) => {
      console.warn('Could not fetch feature settings in Profile:', err);
    });
  }, []);

  // Real-time Socket Listener for instant order status transitions
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data) => {
      console.log('[Profile Real-time Pipeline] Status update received:', data);
      const targetOrderId = String(data.orderId || data.order?._id || '');
      const newStatus = data.status || data.order?.status;

      if (!targetOrderId || !newStatus) return;

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          String(order._id) === targetOrderId
            ? { ...order, status: newStatus, ...(data.order || {}) }
            : order
        )
      );
    };

    const handleNewOrder = (newOrder) => {
      if (!newOrder) return;
      if (user && String(newOrder.user?._id || newOrder.user) === String(user._id)) {
        setOrders((prev) => [newOrder, ...prev.filter((o) => String(o._id) !== String(newOrder._id))]);
        trackOrder(String(newOrder._id));
      }
    };

    socket.on('order_status_update', handleStatusUpdate);
    socket.on('order_status_updated', handleStatusUpdate);
    socket.on('new_order', handleNewOrder);
    socket.on('order_created', handleNewOrder);

    return () => {
      socket.off('order_status_update', handleStatusUpdate);
      socket.off('order_status_updated', handleStatusUpdate);
      socket.off('new_order', handleNewOrder);
      socket.off('order_created', handleNewOrder);
    };
  }, [socket, user, trackOrder]);

  // Keep state in sync if activeOrder changes globally
  useEffect(() => {
    if (activeOrder) {
      setOrders((prev) =>
        prev.map((ord) => (String(ord._id) === String(activeOrder._id) ? { ...ord, ...activeOrder } : ord))
      );
    }
  }, [activeOrder]);


  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-16 bg-[var(--bg-app)] dark:bg-[#080402] transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900/90 backdrop-blur-2xl p-8 sm:p-12 rounded-3xl border border-slate-200/90 dark:border-orange-500/30 shadow-[0_15px_40px_rgba(0,0,0,0.06)] dark:shadow-2xl text-center max-w-md w-full"
        >
          <div className="w-16 h-16 bg-orange-500/15 text-orange-500 dark:text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/30 shadow-lg shadow-orange-500/20">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Sign In to View Orders</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            Please log in with your phone number to check your past orders and track current orders in real time.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/30 transition-all border border-orange-400/30"
          >
            Log In / Register
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] dark:bg-[#080402] text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Success Banner if redirected from checkout */}
        {successBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 rounded-3xl text-emerald-800 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md backdrop-blur-md"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-sm font-bold">{successBanner}</span>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              {location.state?.whatsappUrl && (
                <a
                  href={location.state.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md transition-all"
                >
                  <span>💬 WhatsApp Confirmation</span>
                </a>
              )}
              <button
                onClick={() => setSuccessBanner(null)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-2"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}

        {/* Address Toast Banner */}
        {addressToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-orange-50 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-500/50 rounded-2xl text-orange-900 dark:text-orange-200 text-xs flex items-center justify-between shadow-md"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
              <span className="font-bold">{addressToast}</span>
            </div>
            <button
              onClick={() => setAddressToast(null)}
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-white ml-3"
            >
              Close
            </button>
          </motion.div>
        )}

        {/* Customer Profile Header Card (Luxury Adaptive Glassmorphism) */}
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-orange-500/20 p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.05)] dark:shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-orange-500/30">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {user?.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                  Customer
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                  <span>+91 {user?.phone}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                  <span className="max-w-xs truncate">{user?.address || 'No default address set'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-orange-500/20 border border-orange-400/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Address</span>
            </button>
            <button
              onClick={() => setIsCredentialsModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              title="Security & Password"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Password & Security</span>
            </button>
            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Customer Hub Wallet Card (Only rendered when featureSettings?.customerWallet?.enabled is TRUE) */}
        {featureSettings?.customerWallet?.enabled && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900/60 backdrop-blur-xl rounded-3xl border border-amber-500/30 p-5 sm:p-7 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xl shadow-md">
                  💰
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Apurva Hub Wallet & Cashback
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Earn {featureSettings.customerWallet.cashbackPercentage}% cashback on delivered orders. Redeem credits directly at checkout!
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white dark:bg-slate-900/90 border border-amber-500/30 px-5 py-3 rounded-2xl shadow-sm">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Available Balance</span>
                  <span className="text-2xl font-black text-amber-500 dark:text-amber-400 font-mono">
                    ₹{Number(user?.walletBalance || 0).toFixed(2)}
                  </span>
                </div>
                <Link
                  to="/"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:from-orange-600 transition-all"
                >
                  Order Pizza
                </Link>
              </div>
            </div>

            {/* Wallet Transaction History snippet if available */}
            {user?.walletHistory && user.walletHistory.length > 0 && (
              <div className="pt-3 border-t border-amber-500/20">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Recent Wallet Activity:</span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {user.walletHistory.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-amber-500/10">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${item.type === 'credit' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{item.description}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono font-bold ${item.type === 'credit' ? 'text-emerald-500' : 'text-red-400'}`}>
                          {item.type === 'credit' ? '+' : '-'}₹{item.amount}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SAVED DELIVERY ADDRESSES (Zomato & Swiggy Style)                           */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-orange-500/20 p-5 sm:p-7 shadow-[0_4px_25px_rgba(0,0,0,0.05)] dark:shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Saved Delivery Addresses
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {user?.addresses?.length || 0}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Manage your saved home, work, and custom addresses for fast delivery
              </p>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white border border-orange-400/30 text-xs font-bold transition-all shadow-md shadow-orange-500/20 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Add New Address</span>
            </button>
          </div>

          {/* Address Cards Grid */}
          {user?.addresses && user.addresses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {user.addresses.map((addr) => {
                const isHome = addr.tag === 'Home';
                const isWork = addr.tag === 'Work';
                const TagIcon = isHome ? Home : isWork ? Briefcase : Building;

                return (
                  <div
                    key={addr._id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      addr.isDefault
                        ? 'bg-orange-50/60 dark:bg-slate-900/90 border-orange-400/80 dark:border-orange-500/50 shadow-[0_4px_20px_rgba(249,115,22,0.08)] dark:shadow-[0_4px_20px_rgba(249,115,22,0.1)]'
                        : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Card Top: Tag + Default Badge + Action Buttons */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1.5 font-bold ${
                              isHome
                                ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30'
                                : isWork
                                ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
                                : 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30'
                            }`}
                          >
                            <TagIcon className="w-3.5 h-3.5" />
                            <span>{addr.label || addr.tag}</span>
                          </span>

                          {addr.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Default</span>
                            </span>
                          )}
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditModal(addr)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent transition-colors cursor-pointer shadow-sm"
                            title="Edit Address"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr._id)}
                            disabled={actionLoadingId === addr._id}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/80 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-transparent transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                            title="Delete Address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Address Information */}
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {addr.houseNo ? `${addr.houseNo}, ` : ''}{addr.area}
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                          {addr.landmark ? `Near ${addr.landmark}, ` : ''}{addr.city}, {addr.state} {addr.pincode ? `- ${addr.pincode}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer: Set Default Button */}
                    {!addr.isDefault && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                        <button
                          onClick={() => handleSetDefaultAddress(addr._id)}
                          disabled={actionLoadingId === addr._id}
                          className="text-xs font-bold text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoadingId === addr._id ? 'Updating...' : 'Set as Default Address'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : user?.address ? (
            /* Legacy single-line address fallback with Upgrade CTA */
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-orange-300 dark:border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                    Address on Record
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {user.address}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  Save structured addresses (Home, Work) for quicker one-click checkout.
                </p>
              </div>

              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shrink-0 flex items-center space-x-1.5 shadow-md shadow-orange-500/25 border border-orange-400/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Structured Address</span>
              </button>
            </div>
          ) : (
            /* Empty State */
            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 dark:text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Saved Delivery Addresses</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Add your home or work address for seamless one-click ordering and fast delivery.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-2 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all border border-orange-400/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Address</span>
              </button>
            </div>
          )}
        </div>

        {/* Orders Section Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <PackageCheck className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Live Orders & Order History
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <div
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isConnected
                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
              />
              <span className="text-[11px] font-bold">{isConnected ? 'Live Order Tracking' : 'Syncing'}</span>
            </div>

            <button
              onClick={() => fetchOrders(true)}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/40 transition-colors shadow-sm cursor-pointer"
              title="Refresh Orders"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-4">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-full"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-3xl p-6 text-center shadow-sm">
            <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-red-700 dark:text-red-200">{error}</p>
            <button
              onClick={() => fetchOrders(true)}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty Orders State */}
        {!loading && !error && orders.length === 0 && (
          <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm dark:shadow-xl">
            <ShoppingBag className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Orders Placed Yet</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              When you order hot pizzas and sides, they will appear here with live kitchen tracking and instant status transitions.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-500/25 border border-orange-400/30"
            >
              Explore Menu & Order
            </Link>
          </div>
        )}

        {/* Orders List */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
              const isDelivered = order.status === 'Delivered';

              return (
                <motion.div
                  key={order._id}
                  layout
                  className={`bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border transition-all overflow-hidden shadow-sm dark:shadow-xl ${
                    !isDelivered
                      ? 'border-orange-400/70 dark:border-orange-500/40 shadow-[0_4px_25px_rgba(249,115,22,0.1)] dark:shadow-[0_10px_35px_rgba(249,115,22,0.12)]'
                      : 'border-slate-200/90 dark:border-slate-800'
                  }`}
                >
                  {/* Card Header: Order ID & Live Status Badge */}
                  <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                          Order #{order._id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-slate-400 dark:text-slate-600">•</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500" />
                          <span>{formatDate(order.createdAt)}</span>
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1 flex flex-wrap items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
                        <span className="truncate max-w-sm sm:max-w-md">{order.deliveryAddress || 'Address on record'}</span>
                        {order.customerCoords?.latitude && order.customerCoords?.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${order.customerCoords.latitude},${order.customerCoords.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-800 dark:text-orange-400 hover:text-orange-950 dark:hover:text-white border border-orange-500/30 text-[10px] font-mono font-bold transition-all"
                            title="Open direct GPS coordinates in Google Maps"
                          >
                            🛰️ GPS: {order.customerCoords.latitude.toFixed(4)}, {order.customerCoords.longitude.toFixed(4)}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Live Status & Payment Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {order.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                          <span>✓ PAID</span>
                          <span className="opacity-75">({order.paymentMethod?.toUpperCase() || 'ONLINE'})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
                          <span>PAY ON DELIVERY</span>
                          <span className="opacity-75 font-mono">₹{order.totalAmount}</span>
                        </span>
                      )}
                      <div
                        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-black tracking-wide ${statusCfg.badgeClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusCfg.dotClass}`}></span>
                        <span>{statusCfg.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5-Step Visual Progress Stepper */}
                  <div className="px-5 py-5 bg-slate-50/40 dark:bg-slate-900/30 border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="relative flex items-center justify-between max-w-2xl mx-auto">
                      {/* Connecting Line */}
                      <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 -z-0">
                        <motion.div
                          className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${((statusCfg.step - 1) / 4) * 100}%`
                          }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>

                      {/* Step 1: Placed */}
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                            statusCfg.step >= 1
                              ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-300 mt-1">Placed</span>
                      </div>

                      {/* Step 2: Preparing */}
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                            statusCfg.step >= 2
                              ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {statusCfg.step > 2 ? <Check className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-300 mt-1">Baking</span>
                      </div>

                      {/* Step 3: Ready */}
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                            statusCfg.step >= 3
                              ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {statusCfg.step > 3 ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-300 mt-1">Packed</span>
                      </div>

                      {/* Step 4: Out for Delivery */}
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                            statusCfg.step >= 4
                              ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {statusCfg.step > 4 ? <Check className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-300 mt-1">On Way</span>
                      </div>

                      {/* Step 5: Delivered */}
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                            statusCfg.step >= 5
                              ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-300 mt-1">Delivered</span>
                      </div>
                    </div>

                    {/* Rider Information Pill if Assigned */}
                    {order.rider?.name && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-cyan-50/80 dark:bg-cyan-950/30 p-2.5 rounded-2xl border border-cyan-200 dark:border-cyan-500/30">
                        <div className="flex items-center space-x-2">
                          <span className="text-base">🛵</span>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-cyan-700 dark:text-cyan-400 block">
                              Assigned Delivery Partner
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{order.rider.name}</span>
                          </div>
                        </div>
                        {order.rider.phone && (
                          <a
                            href={`tel:${order.rider.phone}`}
                            className="px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs flex items-center space-x-1 transition-all shadow-md shadow-cyan-500/20"
                          >
                            <span>📞 Call Rider</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Delivery Handover PIN Display (When handoverOtp is enabled) */}
                    {featureSettings?.handoverOtp?.enabled && order.deliveryOtp && order.status !== 'Cancelled' && (
                      <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/40 flex items-center justify-between shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                            <Key className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">
                              Delivery Handover PIN
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400">
                              {order.otpVerifiedAt
                                ? '✓ Verified upon handover'
                                : 'Share this 4-digit PIN with the delivery boy upon arrival'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-4 py-2 rounded-xl bg-white dark:bg-slate-950 border-2 border-amber-500 text-amber-600 dark:text-amber-400 font-mono font-black text-xl tracking-[0.25em] shadow-inner inline-block">
                            {order.deliveryOtp}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Items Breakdown */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="space-y-0.5 max-w-[75%]">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {item.quantity}x {item.name}
                            </span>
                            {item.size && (
                              <span className="text-orange-700 dark:text-orange-400 font-bold block text-[11px]">
                                Size: {item.size}
                              </span>
                            )}
                            {item.toppings && item.toppings.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {item.toppings.map((t, tidx) => (
                                  <span
                                    key={tidx}
                                    className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-bold border border-slate-200 dark:border-slate-700"
                                  >
                                    + {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Customer / Kitchen Note */}
                    {order.customerNote && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-2xl border border-orange-200 dark:border-orange-500/30 text-xs flex items-start space-x-2 text-orange-950 dark:text-orange-200">
                        <ChefHat className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-orange-700 dark:text-orange-300">Kitchen Note:</span>
                          <p className="font-medium italic text-slate-800 dark:text-slate-300">"{order.customerNote}"</p>
                        </div>
                      </div>
                    )}

                    {/* Order Total Footer */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                          Total Amount
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          Method: <strong className="uppercase text-slate-700 dark:text-slate-300">{order.paymentMethod || 'COD'}</strong> • Status: <strong className={order.paymentStatus === 'paid' ? 'text-emerald-600 dark:text-emerald-400 uppercase' : 'text-amber-600 dark:text-amber-400 uppercase'}>{order.paymentStatus || 'Pending'}</strong>
                          {order.paymentDetails?.utrNumber && (
                            <span className="ml-1 font-mono text-[10px] text-orange-600 dark:text-orange-400">(UTR: {order.paymentDetails.utrNumber})</span>
                          )}
                          {order.walletAmountDeducted > 0 && (
                            <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              💳 Hub Wallet Applied: -₹{order.walletAmountDeducted}
                            </span>
                          )}
                          {order.cashbackAwarded > 0 && (
                            <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              🎁 Cashback Earned: +₹{order.cashbackAwarded}
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                        ₹{order.totalAmount}
                      </span>
                    </div>

                    {/* Cancellation Action or Banner */}
                    {order.status === 'Cancelled' ? (
                      <div className="mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-xs flex items-center justify-between text-rose-800 dark:text-rose-300">
                        <div className="flex items-center space-x-2">
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          <div>
                            <span className="font-extrabold block">Order Cancelled</span>
                            <span className="text-[11px] text-rose-600 dark:text-rose-400">
                              {order.cancellationReason || 'Order was cancelled.'}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Cancelled
                        </span>
                      </div>
                    ) : order.status !== 'Delivered' ? (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setCancellingOrder(order);
                            setCancelReason('');
                            setCancelError('');
                            setCancelSuccessMsg('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-400/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm hover:border-rose-500"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Order</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* Zomato / Swiggy Style Delivery Address Modal */}
      <AddressModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSave={handleSaveModalAddress}
        initialAddress={editingAddressData}
      />

      {/* Customer Account Credentials & Password Modal */}
      <CustomerCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
      />

      {/* Customer Cancel Order Confirmation Modal */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-500/30">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Cancel Order</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Order #{cancellingOrder._id.slice(-6).toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {cancelError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{cancelError}</span>
                </div>
              )}

              {cancelSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{cancelSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleCancelOrderSubmit} className="space-y-3.5">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Are you sure you want to cancel this order? Any applied promo discount code and reserved items will be restored automatically.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for Cancellation (Optional)
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Ordered by mistake, Changed plan, etc."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingCancel}
                    onClick={() => setCancellingOrder(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCancel}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <span>{isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
