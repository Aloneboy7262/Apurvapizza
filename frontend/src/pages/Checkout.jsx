import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import MapboxDeliveryPicker from '../components/MapboxDeliveryPicker';
import {
  MapPin,
  Lock,
  Phone,
  User,
  ShoppingBag,
  ChefHat,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Home,
  Briefcase,
  Building,
  Plus,
  Check,
  Locate,
  Sparkles,
  Clock,
  Calendar,
  QrCode,
  Copy,
  ShieldCheck,
  Wallet,
  Zap,
  UtensilsCrossed
} from 'lucide-react';

const SCHEDULE_SLOTS = [
  'Today, 1:00 PM - 1:45 PM (Lunch)',
  'Today, 2:15 PM - 3:00 PM (Afternoon)',
  'Today, 7:00 PM - 7:45 PM (Early Dinner)',
  'Today, 8:15 PM - 9:00 PM (Dinner Rush)',
  'Today, 9:30 PM - 10:15 PM (Late Night)'
];

const Checkout = () => {
  const { user, isAuthenticated, login, register, addAddress } = useAuth();
  const {
    cartItems,
    customerNote,
    setCustomerNote,
    subtotal,
    totalItems,
    clearCart,
    appliedCoupon,
    discountAmount,
    finalSubtotal,
    removeCoupon
  } = useCart();
  const { isShopOpen, shopStatus } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tableQuery = searchParams.get('table');

  const mapboxPickerRef = useRef(null);

  // Order Mode: 'delivery' | 'dine_in' | 'takeaway'
  const [orderType, setOrderType] = useState(() => {
    if (tableQuery) return 'dine_in';
    return localStorage.getItem('apurva_order_type') || 'delivery';
  });
  const [tableNumber, setTableNumber] = useState(() => {
    if (tableQuery) return tableQuery;
    return localStorage.getItem('apurva_table_number') || '1';
  });

  // Delivery Timing
  const [deliveryTiming, setDeliveryTiming] = useState('asap'); // 'asap' | 'scheduled'
  const [scheduledSlot, setScheduledSlot] = useState(SCHEDULE_SLOTS[0]);

  // Auth tabs
  const [authTab, setAuthTab] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Address selection & form state
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addrTag, setAddrTag] = useState('Home');
  const [addrLabel, setAddrLabel] = useState('');
  const [addrContactNumber, setAddrContactNumber] = useState('');
  const [addrHouseNo, setAddrHouseNo] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrCity, setAddrCity] = useState('Pathardewa');
  const [addrState, setAddrState] = useState('Uttar Pradesh');
  const [addrPincode, setAddrPincode] = useState('274404');
  const [saveAsDefaultAddress, setSaveAsDefaultAddress] = useState(true);

  // Payment method & Admin Controls (COD / Pay at Counter only - no UTR / direct QR)
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [paymentSettings, setPaymentSettings] = useState(null);

  // Feature automation (Wallet & Cashback)
  const [featureSettings, setFeatureSettings] = useState(null);
  const [useWallet, setUseWallet] = useState(false);

  // Delivery settings & verification
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'verified' | 'error'
  const [gpsLocationData, setGpsLocationData] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Dynamic fulfillment rules from admin settings
  const allowDelivery = deliverySettings?.fulfillmentSettings?.allowDelivery !== false;
  const allowDineIn = deliverySettings?.fulfillmentSettings?.allowDineIn !== false;
  const allowTakeaway = deliverySettings?.fulfillmentSettings?.allowTakeaway !== false;
  const configuredTableCount = Math.max(1, Math.min(deliverySettings?.tableSettings?.tableCount || 12, 100));
  const configuredTablePrefix = deliverySettings?.tableSettings?.tablePrefix !== undefined
    ? deliverySettings.tableSettings.tablePrefix
    : 'Table ';

  // Scroll to top and fetch delivery & payment settings on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchSettings = async () => {
      try {
        const [deliveryRes, paymentRes, featuresRes] = await Promise.all([
          api.get('/delivery-settings').catch(() => ({ data: { success: false } })),
          api.get('/payment-settings').catch(() => ({ data: { success: false } })),
          api.get('/features/public').catch(() => ({ data: { success: false } }))
        ]);

        if (deliveryRes.data?.success) {
          setDeliverySettings(deliveryRes.data.data);
        }
        if (paymentRes.data?.success && paymentRes.data.data) {
          setPaymentSettings(paymentRes.data.data);
          setPaymentMethod('cod');
        }
        if (featuresRes.data?.success && featuresRes.data.data) {
          setFeatureSettings(featuresRes.data.data);
        }
      } catch (err) {
        console.warn('Could not fetch settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // Auto-fallback if currently selected fulfillment mode is disabled by admin
  useEffect(() => {
    if (!deliverySettings?.fulfillmentSettings) return;
    const { allowDelivery = true, allowDineIn = true, allowTakeaway = true } = deliverySettings.fulfillmentSettings;
    if (orderType === 'delivery' && !allowDelivery) {
      if (allowDineIn) setOrderType('dine_in');
      else if (allowTakeaway) setOrderType('takeaway');
    } else if (orderType === 'dine_in' && !allowDineIn) {
      if (allowDelivery) setOrderType('delivery');
      else if (allowTakeaway) setOrderType('takeaway');
    } else if (orderType === 'takeaway' && !allowTakeaway) {
      if (allowDelivery) setOrderType('delivery');
      else if (allowDineIn) setOrderType('dine_in');
    }
  }, [deliverySettings, orderType]);

  /**
   * Handle location selected from Mapbox picker
   */
  const handleLocationSelected = (result) => {
    if (!result) return;
    const isDeliverable = Boolean(result.isDeliverable);
    setGpsStatus(isDeliverable ? 'verified' : 'error');

    setGpsLocationData({
      allowed: isDeliverable,
      distance_km: result.distanceKm,
      free_delivery: result.freeDelivery,
      delivery_charge: result.deliveryCharge,
      latitude: result.latitude,
      longitude: result.longitude,
      accuracy: result.accuracy || null,
      message: isDeliverable ? '' : `Delivery not available in your area (${result.distanceKm} KM away).`
    });

    setUserCoords({ lat: result.latitude, lng: result.longitude, accuracy: result.accuracy || null });

    // Auto-fill area and postal details detected from map pin into form
    if (result.area) {
      setAddrArea(result.area);
    } else if (result.formattedAddress) {
      setAddrArea(result.formattedAddress);
    }
    if (result.pincode) {
      setAddrPincode(result.pincode);
    }
    if (result.city) {
      setAddrCity(result.city);
    }
    if (result.state) {
      setAddrState(result.state);
    }
    // We intentionally keep addrHouseNo empty so the customer MUST enter their exact House / Flat number!
  };

  // Sync saved addresses on user change
  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0) {
      const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
      setDeliveryAddress(def.formattedAddress);
      setSelectedAddressId(def._id);
      setAddrContactNumber(def.contactNumber || def.receiverPhone || user.phone || '');
      setIsAddingNewAddress(false);
      if (def.latitude && def.longitude) {
        setUserCoords({ lat: def.latitude, lng: def.longitude });
      }
    } else {
      setIsAddingNewAddress(true);
      if (user) {
        if (user.phone) setAddrContactNumber(user.phone);
        if (user.address) setAddrArea(user.address);
      }
    }
  }, [user]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!loginPhone || !loginPassword) {
      setAuthError('Please enter both phone number and password.');
      return;
    }

    try {
      setAuthLoading(true);
      await login(loginPhone.trim(), loginPassword);
    } catch (err) {
      console.error('Login error:', err);
      setAuthError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!regName || !regPhone || !regPassword) {
      setAuthError('Please fill in your name, 10-digit phone, and password.');
      return;
    }
    if (regPhone.trim().length !== 10) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setAuthLoading(true);
      await register({
        name: regName.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        role: 'customer'
      });
    } catch (err) {
      console.error('Registration error:', err);
      setAuthError(err.response?.data?.message || 'Registration failed. Phone might already be in use.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setOrderError('');
    setFieldErrors({});

    const newFieldErrors = {};

    // 1. Mandatory Location Pinning & Verification on Map (Only for Doorstep Delivery)
    if (orderType === 'delivery') {
      if (!gpsLocationData || gpsLocationData.latitude === undefined || gpsLocationData.longitude === undefined || gpsStatus !== 'verified') {
        setOrderError('⚠️ Delivery Map Pin Compulsory: Please click "Locate Me" or tap your delivery pin on the map to verify service area.');
        if (mapboxPickerRef.current?.triggerDetect) {
          mapboxPickerRef.current.triggerDetect();
        }
        const mapEl = document.getElementById('delivery-map-section');
        if (mapEl) {
          mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      if (!gpsLocationData.allowed) {
        setOrderError(
          gpsLocationData.message ||
            `Sorry, we will be available in your area soon (${gpsLocationData.distance_km} KM away). Our delivery radius is ${deliverySettings?.max_delivery_radius_km || 5} KM.`
        );
        return;
      }
    }

    // 2. Mandatory Calling Mobile Number (10 Digits)
    const rawPhone = (addrContactNumber || '').trim().replace(/\D/g, '') || (user?.phone || '').trim().replace(/\D/g, '');
    if (!rawPhone || rawPhone.length !== 10) {
      newFieldErrors.contactNumber = true;
      setFieldErrors(newFieldErrors);
      setOrderError('⚠️ Mobile Number Compulsory: Please enter a valid 10-digit mobile number for order updates.');
      const phoneInput = document.getElementById('checkout-contact-phone');
      if (phoneInput) {
        phoneInput.focus();
        phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    const resolvedContactNumber = rawPhone;

    // 3. Mandatory House / Flat / Floor Number & Area (Only for delivery)
    if (orderType === 'delivery') {
      if (isAddingNewAddress || !selectedAddressId) {
        if (!addrHouseNo || !addrHouseNo.trim()) {
          newFieldErrors.houseNo = true;
          setFieldErrors(newFieldErrors);
          setOrderError('⚠️ House / Flat No. Compulsory: Please enter your House, Flat, Floor, or Building number.');
          const houseInput = document.getElementById('checkout-house-no');
          if (houseInput) {
            houseInput.focus();
            houseInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        if (!addrArea || !addrArea.trim()) {
          newFieldErrors.area = true;
          setFieldErrors(newFieldErrors);
          setOrderError('⚠️ Street / Locality Compulsory: Please enter your Road, Area, or Locality.');
          const areaInput = document.getElementById('checkout-area');
          if (areaInput) {
            areaInput.focus();
            areaInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      }
    } else if (orderType === 'dine_in') {
      if (!tableNumber || !String(tableNumber).trim()) {
        setOrderError('⚠️ Table Number Compulsory: Please enter or select your Table Number.');
        return;
      }
    }

    let finalAddress = '';
    if (isAddingNewAddress || !selectedAddressId) {
      finalAddress = `${addrHouseNo.trim()}, ${addrArea.trim()}${
        addrLandmark.trim() ? ', Near ' + addrLandmark.trim() : ''
      }, ${addrCity.trim() || 'Pathardewa'}, ${addrState.trim() || 'Uttar Pradesh'} - ${addrPincode.trim() || '274404'}`;

      if (saveAsDefaultAddress && user) {
        try {
          await addAddress({
            tag: addrTag,
            label: addrTag === 'Other' ? addrLabel.trim() || 'Other' : addrTag,
            contactNumber: resolvedContactNumber,
            receiverPhone: resolvedContactNumber,
            houseNo: addrHouseNo.trim(),
            area: addrArea.trim(),
            landmark: addrLandmark.trim(),
            city: addrCity.trim() || 'Pathardewa',
            state: addrState.trim() || 'Uttar Pradesh',
            pincode: addrPincode.trim() || '274404',
            formattedAddress: finalAddress,
            isDefault: true
          });
        } catch (addrErr) {
          console.warn('Could not save structured address:', addrErr);
        }
      }
    } else {
      finalAddress = (deliveryAddress || '').trim();
    }

    if (orderType === 'delivery') {
      if (!allowDelivery) {
        setOrderError('Doorstep delivery is temporarily disabled by store management.');
        return;
      }
      if (!finalAddress || finalAddress.length < 8) {
        setOrderError('⚠️ Complete delivery address is compulsory for doorstep delivery. Please check your address inputs.');
        return;
      }
      const minRequired = deliverySettings?.defaultMinOrderAmount || 149;
      if (subtotal < minRequired) {
        setOrderError(`A minimum order of ₹${minRequired} is required for delivery.`);
        return;
      }
    } else if (orderType === 'dine_in') {
      if (!allowDineIn) {
        setOrderError('Dine-In service is temporarily disabled by store management.');
        return;
      }
      if (!tableNumber || !String(tableNumber).trim()) {
        setOrderError('⚠️ Please select or type your Table Number for Dine-In.');
        return;
      }
    } else if (orderType === 'takeaway') {
      if (!allowTakeaway) {
        setOrderError('Takeaway / Pickup service is temporarily disabled by store management.');
        return;
      }
    }

    if (!isShopOpen && deliveryTiming !== 'scheduled') {
      setOrderError(
        shopStatus?.closedMessage ||
          'Store is currently closed for live orders. Please choose a scheduled delivery time slot.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const resolvedDeliveryFee = orderType === 'delivery' ? Number(gpsLocationData?.delivery_charge || 0) : 0;
      const isPlatformFeeActive = deliverySettings?.isPlatformFeeEnabled ?? deliverySettings?.is_platform_fee_enabled ?? (gpsLocationData?.isPlatformFeeEnabled ?? gpsLocationData?.is_platform_fee_enabled ?? true);
      const resolvedPlatformFee = isPlatformFeeActive
        ? Number(deliverySettings?.platformFee ?? deliverySettings?.platform_fee ?? (gpsLocationData?.platformFee ?? gpsLocationData?.platform_fee ?? 5))
        : 0;
      const effectiveSubtotal = finalSubtotal !== undefined ? finalSubtotal : subtotal;
      const preWalletGrandTotal = Math.max(0, Math.round((effectiveSubtotal + resolvedDeliveryFee + resolvedPlatformFee) * 100) / 100);

      // Wallet deduction calculation
      let walletAmountDeducted = 0;
      if (useWallet && featureSettings?.customerWallet?.enabled && user && Number(user.walletBalance) > 0) {
        const maxPercent = featureSettings.customerWallet.maxUsagePercentage || 50;
        const maxAllowed = Math.round(((preWalletGrandTotal * maxPercent) / 100) * 100) / 100;
        walletAmountDeducted = Math.min(Number(user.walletBalance), maxAllowed);
      }
      const finalGrandTotal = Math.max(0, Math.round((preWalletGrandTotal - walletAmountDeducted) * 100) / 100);

      // Payment validation (Cash / Counter / Rider UPI)
      if (paymentSettings?.codEnabled === false) {
        setOrderError('Pay on Delivery / Counter is currently disabled by store management.');
        setIsSubmitting(false);
        return;
      }
      if (paymentSettings?.maxCodAmount > 0 && finalGrandTotal > paymentSettings.maxCodAmount) {
        setOrderError(`Order total ₹${finalGrandTotal} exceeds maximum limit of ₹${paymentSettings.maxCodAmount}.`);
        setIsSubmitting(false);
        return;
      }

      const payload = {
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : '',
        items: cartItems.map((item) => ({
          product: item.productId || item.product,
          name: item.name,
          size: item.size || null,
          toppings: item.toppings || [],
          quantity: item.quantity,
          price: item.price,
          customPizza: item.customPizza || null
        })),
        itemsAmount: subtotal,
        couponCode: appliedCoupon?.code || null,
        deliveryFee: resolvedDeliveryFee,
        platformFee: resolvedPlatformFee,
        deliveryDistance: orderType === 'delivery' ? (gpsLocationData?.distance_km || 0) : 0,
        latitude: orderType === 'delivery' ? (gpsLocationData?.latitude || 26.5024) : 26.5024,
        longitude: orderType === 'delivery' ? (gpsLocationData?.longitude || 83.7791) : 83.7791,
        accuracy: orderType === 'delivery' ? (gpsLocationData?.accuracy || null) : 5,
        lat: orderType === 'delivery' ? (gpsLocationData?.latitude || 26.5024) : 26.5024,
        lng: orderType === 'delivery' ? (gpsLocationData?.longitude || 83.7791) : 83.7791,
        customerCoords: {
          latitude: orderType === 'delivery' ? (gpsLocationData?.latitude || 26.5024) : 26.5024,
          longitude: orderType === 'delivery' ? (gpsLocationData?.longitude || 83.7791) : 83.7791,
          accuracy: orderType === 'delivery' ? (gpsLocationData?.accuracy || null) : 5
        },
        deliveryLocationName: orderType === 'delivery'
          ? (addrArea || (gpsLocationData?.free_delivery ? 'Local Free Zone (<5km)' : 'Extended Delivery Zone'))
          : (orderType === 'dine_in' ? `Dine-In Table #${tableNumber}` : 'Takeaway Store Counter'),
        totalAmount: finalGrandTotal,
        walletAmountToUse: walletAmountDeducted,
        paymentMethod: 'cod',
        utrNumber: '',
        scheduledFor: deliveryTiming === 'scheduled' ? scheduledSlot : 'ASAP',
        customerNote: customerNote || '',
        deliveryAddress: orderType === 'delivery'
          ? `${finalAddress} [GPS: ${(gpsLocationData?.latitude || 0).toFixed(6)}, ${(gpsLocationData?.longitude || 0).toFixed(6)}]`
          : (orderType === 'dine_in' ? `Dine-In (Table #${tableNumber})` : 'Self-Pickup Takeaway Counter'),
        deliveryPhone: resolvedContactNumber,
        contactNumber: resolvedContactNumber
      };

      const res = await api.post('/orders', payload);

      if (res.data.success) {
        const createdOrder = res.data.data;
        clearCart();
        const whatsappMsg = encodeURIComponent(
          `Hi Apurva Pizza Hub! Just placed Order #${createdOrder._id.slice(-6).toUpperCase()} for ₹${createdOrder.totalAmount}. Please confirm my fresh wood-fired pizza order! 🍕`
        );
        const supportPhone = (import.meta.env.VITE_SUPPORT_PHONE || '').replace(/\D/g, '');
        const whatsappUrl = supportPhone
          ? `https://wa.me/${supportPhone}?text=${whatsappMsg}`
          : null;

        navigate('/profile', {
          state: {
            successMessage: `🎉 Order #${createdOrder._id.slice(-6).toUpperCase()} placed successfully! Our kitchen has received your ticket.`,
            newOrderId: createdOrder._id,
            whatsappUrl
          }
        });
      } else {
        setOrderError(res.data.message || 'Failed to place order.');
      }
    } catch (err) {
      console.error('Order submission error:', err);
      setOrderError(err.response?.data?.message || 'Error processing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 bg-[var(--bg-app)] dark:bg-[#080402] transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/90 dark:border-orange-500/20 shadow-2xl text-center max-w-md w-full"
        >
          <ShoppingBag className="w-12 h-12 text-orange-500 dark:text-orange-400 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Your Cart is Empty</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            Add hot wood-fired pizzas to your cart before proceeding to checkout.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/30 transition-all border border-orange-400/30"
          >
            Explore Menu
          </Link>
        </motion.div>
      </div>
    );
  }

  const dynamicMinOrder = gpsLocationData?.minOrderAmount || deliverySettings?.defaultMinOrderAmount || 149;
  if (subtotal < dynamicMinOrder) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 bg-[var(--bg-app)] dark:bg-[#080402] transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-red-200 dark:border-red-500/30 shadow-2xl text-center max-w-md w-full"
        >
          <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Minimum Order Not Met</h2>
          <p className="text-xs text-red-700 dark:text-red-300 font-medium mt-2">
            A minimum order of ₹{dynamicMinOrder} is required for delivery in this location. Current subtotal is ₹{subtotal.toFixed(0)} (Add ₹{(dynamicMinOrder - subtotal).toFixed(0)} more).
          </p>
          <Link
            to="/cart"
            className="mt-6 inline-flex px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/30 transition-all"
          >
            Return to Cart
          </Link>
        </motion.div>
      </div>
    );
  }

  const effectiveSubtotal = finalSubtotal !== undefined ? finalSubtotal : subtotal;
  const resolvedDeliveryFee = Number(gpsLocationData?.delivery_charge || 0);
  const isPlatformFeeActive = deliverySettings?.isPlatformFeeEnabled ?? deliverySettings?.is_platform_fee_enabled ?? (gpsLocationData?.isPlatformFeeEnabled ?? gpsLocationData?.is_platform_fee_enabled ?? true);
  const resolvedPlatformFee = isPlatformFeeActive
    ? Number(deliverySettings?.platformFee ?? deliverySettings?.platform_fee ?? (gpsLocationData?.platformFee ?? gpsLocationData?.platform_fee ?? 5))
    : 0;
  const preWalletTotal = Math.max(0, Math.round((effectiveSubtotal + resolvedDeliveryFee + resolvedPlatformFee) * 100) / 100);
  const maxWalletUsagePercent = featureSettings?.customerWallet?.maxUsagePercentage || 50;
  const maxWalletAllowed = Math.round(((preWalletTotal * maxWalletUsagePercent) / 100) * 100) / 100;
  const applicableWalletAmount = (featureSettings?.customerWallet?.enabled && user && Number(user.walletBalance) > 0)
    ? Math.min(Number(user.walletBalance), maxWalletAllowed)
    : 0;
  const walletDeduction = useWallet ? applicableWalletAmount : 0;
  const finalGrandTotal = Math.max(0, Math.round((preWalletTotal - walletDeduction) * 100) / 100);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--bg-app)] dark:bg-[#080402] text-slate-900 dark:text-slate-100 py-6 sm:py-8 px-3 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Modern Clean Header */}
        <div className="flex items-center space-x-3">
          <Link
            to="/cart"
            className="p-2.5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:text-orange-500 hover:border-orange-500/40 transition-colors shadow-sm shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
              <span>Checkout</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 font-sans shrink-0">
                Fast Delivery
              </span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">
              Review delivery location and order details
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. UNAUTHENTICATED: Login / Register Form                                 */}
        {/* ========================================================================= */}
        {!isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-white dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-200/90 dark:border-orange-500/30 shadow-2xl overflow-hidden p-6 sm:p-8"
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-orange-500/20 text-orange-500 dark:text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-orange-500/30 shadow-lg shadow-orange-500/20">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Sign In to Place Your Order
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Link this order to your account to track real-time kitchen status
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl mb-6 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setAuthError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  authTab === 'login'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setAuthError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  authTab === 'register'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-500/50 rounded-2xl text-xs text-red-700 dark:text-red-200 font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            {authTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-slate-500 dark:placeholder-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-slate-500 dark:placeholder-slate-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 border border-orange-400/30 cursor-pointer"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Log In & Continue</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Verma"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-slate-500 dark:placeholder-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number (10 Digits)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-slate-500 dark:placeholder-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Password (Min. 6 Characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Create a password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-slate-500 dark:placeholder-slate-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 border border-orange-400/30 cursor-pointer"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register & Continue</span>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* 2. AUTHENTICATED: Clean Streamlined Checkout Flow                          */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left 7 Columns: Delivery Location & Details */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Subtle User Status Pill */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs shadow-sm min-w-0">
                <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-300 font-medium min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="truncate block">Ordering as <b className="text-slate-900 dark:text-white font-bold">{user?.name}</b> (+91 {user?.phone})</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                  ✓ Verified
                </span>
              </div>

              {/* 0. Order Fulfillment Mode (Delivery vs Dine-In vs Takeaway) */}
              <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800/80 p-4 shadow-xl min-w-0">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <UtensilsCrossed className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Order Fulfillment Mode
                    </span>
                  </div>
                  {orderType === 'dine_in' && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold shrink-0">
                      🍽️ Dine-In Table Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                  <button
                    type="button"
                    disabled={!allowDelivery}
                    onClick={() => {
                      if (!allowDelivery) return;
                      setOrderType('delivery');
                      localStorage.setItem('apurva_order_type', 'delivery');
                    }}
                    className={`p-2 sm:p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
                      !allowDelivery
                        ? 'opacity-40 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                        : orderType === 'delivery'
                        ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-400 font-black shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 font-bold'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">🛵</span>
                    <span className="text-[11px] sm:text-xs font-bold leading-tight break-words text-center">Doorstep Delivery</span>
                    {!allowDelivery && (
                      <span className="text-[9px] font-black uppercase text-red-500 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.2 rounded">Paused</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!allowDineIn}
                    onClick={() => {
                      if (!allowDineIn) return;
                      setOrderType('dine_in');
                      localStorage.setItem('apurva_order_type', 'dine_in');
                    }}
                    className={`p-2 sm:p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
                      !allowDineIn
                        ? 'opacity-40 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                        : orderType === 'dine_in'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-300 font-black shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 font-bold'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">🍽️</span>
                    <span className="text-[11px] sm:text-xs font-bold leading-tight break-words text-center">Dine-In (Table)</span>
                    {!allowDineIn && (
                      <span className="text-[9px] font-black uppercase text-red-500 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.2 rounded">Paused</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!allowTakeaway}
                    onClick={() => {
                      if (!allowTakeaway) return;
                      setOrderType('takeaway');
                      localStorage.setItem('apurva_order_type', 'takeaway');
                    }}
                    className={`p-2 sm:p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
                      !allowTakeaway
                        ? 'opacity-40 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                        : orderType === 'takeaway'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-300 font-black shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 font-bold'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">🥡</span>
                    <span className="text-[11px] sm:text-xs font-bold leading-tight break-words text-center">Takeaway / Pickup</span>
                    {!allowTakeaway && (
                      <span className="text-[9px] font-black uppercase text-red-500 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.2 rounded">Paused</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Dine-In Table Selector Card */}
              {orderType === 'dine_in' && (
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-purple-500/40 p-5 shadow-xl space-y-4">
                  <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 text-lg">
                      🍽️
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white">
                        Select Your Table Number
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Pizzas will be served hot directly to your table at Apurva Pizza Hub
                      </p>
                    </div>
                  </div>

                  {/* Quick Table Selection Buttons */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                      Choose Table ({configuredTableCount} Tables Available):
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                      {Array.from({ length: configuredTableCount }, (_, i) => i + 1).map((num) => {
                        const tableLabel = `${configuredTablePrefix}${num}`;
                        const isSelected = tableNumber === tableLabel || tableNumber === String(num) || tableNumber === `T-${num}`;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              setTableNumber(tableLabel);
                              localStorage.setItem('apurva_table_number', tableLabel);
                            }}
                            className={`py-2 rounded-xl border text-center font-black text-xs transition-all ${
                              isSelected
                                ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30 scale-105'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-400'
                            }`}
                          >
                            {configuredTablePrefix.trim() || 'T-'}{num}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual Table Number Input */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Or type custom table / booth:</span>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => {
                        setTableNumber(e.target.value);
                        localStorage.setItem('apurva_table_number', e.target.value);
                      }}
                      placeholder={`e.g. ${configuredTablePrefix}1 or Family Booth`}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 w-full sm:max-w-[200px]"
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
                    <span>✨</span>
                    <span>No delivery fee for in-store dine-in orders. Free Wi-Fi available at all tables.</span>
                  </div>
                </div>
              )}

              {/* Takeaway Card */}
              {orderType === 'takeaway' && (
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-blue-500/40 p-5 shadow-xl space-y-3">
                  <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 text-lg">
                      🥡
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white">
                        Self-Pickup Takeaway Counter
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Pick up your freshly packed pizza box from our main market counter
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <span>⏱️</span>
                    <span>Estimated kitchen preparation time: <strong>15–20 minutes</strong>. We'll send an SMS when packed!</span>
                  </div>
                </div>
              )}

              {/* Delivery Address & Map Card */}
              {orderType === 'delivery' && (
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800/80 p-4 sm:p-5 shadow-xl space-y-4 max-w-full overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 min-w-0">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-500 dark:text-orange-400 flex items-center justify-center border border-orange-500/30 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h2 className="text-base font-black text-slate-900 dark:text-white truncate">
                          Delivery Address
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          Doorstep delivery from our Pathardewa kitchen
                        </p>
                      </div>
                    </div>

                    {user?.addresses && user.addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewAddress(!isAddingNewAddress)}
                        className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                      >
                        {isAddingNewAddress ? (
                          <>
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Use Saved Address</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add New Address</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                {/* Mapbox Delivery Location Picker with Ref */}
                <MapboxDeliveryPicker
                  ref={mapboxPickerRef}
                  deliverySettings={deliverySettings}
                  initialCoords={userCoords}
                  initialAddress={deliveryAddress}
                  onLocationSelect={handleLocationSelected}
                  cartSubtotal={subtotal}
                />

                {/* Saved Addresses Selector (if available and not adding new) */}
                {user?.addresses && user.addresses.length > 0 && !isAddingNewAddress ? (
                  <div className="space-y-3 pt-2 min-w-0 max-w-full overflow-hidden">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Select Saved Address:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-full">
                      {user.addresses.map((addr) => {
                        const isSelected = selectedAddressId === addr._id || deliveryAddress === addr.formattedAddress;
                        const TagIcon = addr.tag === 'Home' ? Home : addr.tag === 'Work' ? Briefcase : Building;
                        return (
                          <button
                            key={addr._id}
                            type="button"
                            onClick={() => {
                              setSelectedAddressId(addr._id);
                              setDeliveryAddress(addr.formattedAddress);
                              setAddrContactNumber(addr.contactNumber || addr.receiverPhone || user?.phone || '');
                              setIsAddingNewAddress(false);
                              if (addr.latitude && addr.longitude) {
                                setUserCoords({ lat: addr.latitude, lng: addr.longitude });
                              }
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer min-w-0 w-full max-w-full overflow-hidden ${
                              isSelected
                                ? 'bg-orange-50 dark:bg-orange-500/15 border-orange-500 text-slate-900 dark:text-white shadow-md ring-1 ring-orange-500'
                                : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${isSelected ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                              <TagIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="flex items-center justify-between gap-1.5 min-w-0">
                                <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                  {addr.label || addr.tag}
                                </span>
                                {isSelected ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1 shrink-0">
                                    <Check className="w-3 h-3" /> Selected
                                  </span>
                                ) : addr.isDefault ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shrink-0">
                                    Default
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium break-words line-clamp-2 mt-1">
                                {addr.houseNo ? `${addr.houseNo}, ` : ''}{addr.area}
                              </p>
                              {addr.landmark && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 break-words line-clamp-1 mt-0.5">
                                  Near {addr.landmark}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Delivery Boy Contact Number */}
                    <div className="pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <label className="text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
                          <span className="break-words">Calling Number for Delivery Partner <span className="text-red-500 font-extrabold">* (Compulsory)</span></span>
                        </label>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">10-digit mobile</span>
                      </div>
                      <input
                        id="checkout-contact-phone"
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        value={addrContactNumber}
                        onChange={(e) => {
                          setAddrContactNumber(e.target.value.replace(/\D/g, ''));
                          if (fieldErrors.contactNumber) setFieldErrors({ ...fieldErrors, contactNumber: false });
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-xs text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none font-medium transition-all ${
                          fieldErrors.contactNumber
                            ? 'border-red-500 ring-2 ring-red-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                        }`}
                      />
                      {fieldErrors.contactNumber && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">
                          ⚠️ 10-digit mobile calling number is compulsory for delivery updates.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Structured Address Form */
                  <div className="space-y-3.5 pt-2">
                    {/* Tag Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-1.5">
                        Address Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'Home', label: 'Home', icon: Home },
                          { id: 'Work', label: 'Work', icon: Briefcase },
                          { id: 'Other', label: 'Other', icon: Building }
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = addrTag === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setAddrTag(item.id)}
                              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {addrTag === 'Other' && (
                        <input
                          type="text"
                          placeholder="e.g. Friend's Flat, Office 2"
                          value={addrLabel}
                          onChange={(e) => setAddrLabel(e.target.value)}
                          className="mt-2 w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                      )}
                    </div>

                    {/* House No & Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-1">
                          House / Flat / Floor No. <span className="text-red-500 font-extrabold">* (Compulsory)</span>
                        </label>
                        <input
                          id="checkout-house-no"
                          type="text"
                          required
                          placeholder="e.g. Flat 304, House No. 12"
                          value={addrHouseNo}
                          onChange={(e) => {
                            setAddrHouseNo(e.target.value);
                            if (fieldErrors.houseNo) setFieldErrors({ ...fieldErrors, houseNo: false });
                          }}
                          className={`w-full max-w-full box-border px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-xs text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none font-medium transition-all ${
                            fieldErrors.houseNo
                              ? 'border-red-500 ring-2 ring-red-500/20'
                              : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                          }`}
                        />
                        {fieldErrors.houseNo && (
                          <p className="text-[10px] font-bold text-red-500 mt-1">
                            ⚠️ House / Flat / Building No. is compulsory.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-1">
                          Area / Locality / Street <span className="text-red-500 font-extrabold">* (Compulsory)</span>
                        </label>
                        <input
                          id="checkout-area"
                          type="text"
                          required
                          placeholder="e.g. Murarchhapar, Main Road"
                          value={addrArea}
                          onChange={(e) => {
                            setAddrArea(e.target.value);
                            if (fieldErrors.area) setFieldErrors({ ...fieldErrors, area: false });
                          }}
                          className={`w-full max-w-full box-border px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-xs text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none font-medium transition-all ${
                            fieldErrors.area
                              ? 'border-red-500 ring-2 ring-red-500/20'
                              : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                          }`}
                        />
                        {fieldErrors.area && (
                          <p className="text-[10px] font-bold text-red-500 mt-1">
                            ⚠️ Area / Locality / Street is compulsory.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Landmark & Calling Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-1">
                          Nearby Landmark (Optional)
                        </label>
                        <input
                          id="checkout-landmark"
                          type="text"
                          placeholder="e.g. Near SBI ATM"
                          value={addrLandmark}
                          onChange={(e) => setAddrLandmark(e.target.value)}
                          className="w-full max-w-full box-border px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-1">
                          Delivery Partner Calling Phone <span className="text-red-500 font-extrabold">* (Compulsory)</span>
                        </label>
                        <input
                          id="checkout-contact-phone"
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10-digit number"
                          value={addrContactNumber}
                          onChange={(e) => {
                            setAddrContactNumber(e.target.value.replace(/\D/g, ''));
                            if (fieldErrors.contactNumber) setFieldErrors({ ...fieldErrors, contactNumber: false });
                          }}
                          className={`w-full max-w-full box-border px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-xs text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none font-medium transition-all ${
                            fieldErrors.contactNumber
                              ? 'border-red-500 ring-2 ring-red-500/20'
                              : 'border-slate-200 dark:border-slate-800 focus:border-orange-500'
                          }`}
                        />
                        {fieldErrors.contactNumber && (
                          <p className="text-[10px] font-bold text-red-500 mt-1">
                            ⚠️ 10-digit calling number is compulsory.
                          </p>
                        )}
                      </div>
                    </div>

                    <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={saveAsDefaultAddress}
                        onChange={(e) => setSaveAsDefaultAddress(e.target.checked)}
                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        Save this address to profile for future orders
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

              {/* Kitchen Note Preview */}
              <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800/80 p-5 shadow-xl space-y-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-500 dark:text-orange-400 flex items-center justify-center">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      Cooking Request / Kitchen Note (Optional)
                    </h3>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="e.g. Extra oregano, less spicy, well done crust..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-orange-500 font-medium resize-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              {/* Delivery Timing Card */}
              <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800/80 p-5 shadow-xl space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-500 dark:text-orange-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      Delivery Timing
                    </h3>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">
                      Choose immediate delivery or pre-order for today
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryTiming('asap')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      deliveryTiming === 'asap'
                        ? 'bg-orange-50 dark:bg-orange-500/15 border-orange-500 text-slate-900 dark:text-white shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 dark:text-white">
                      <span>⚡ ASAP Delivery</span>
                    </div>
                    <span className="text-[11px] text-orange-700 dark:text-orange-400 font-semibold block mt-0.5">30-40 mins</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryTiming('scheduled')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      deliveryTiming === 'scheduled'
                        ? 'bg-orange-50 dark:bg-orange-500/15 border-orange-500 text-slate-900 dark:text-white shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 dark:text-white">
                      <span>📅 Schedule Today</span>
                    </div>
                    <span className="text-[11px] text-orange-700 dark:text-orange-400 font-semibold block mt-0.5">Select time slot</span>
                  </button>
                </div>

                {deliveryTiming === 'scheduled' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2 space-y-1.5"
                  >
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-300">
                      Choose Preferred Delivery Slot:
                    </label>
                    <select
                      value={scheduledSlot}
                      onChange={(e) => setScheduledSlot(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-medium"
                    >
                      {SCHEDULE_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      ✓ Your pizza will be prepared fresh in the stone oven right before this time slot.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800/80 p-5 shadow-xl space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-500 dark:text-orange-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 dark:text-white">
                      Payment Method
                    </h2>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* OPTION 1: Flexible Pay on Delivery / Counter (Cash or Rider UPI) */}
                  {paymentSettings?.codEnabled !== false ? (
                    <label className={`flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2.5 p-4 rounded-2xl border-2 transition-all cursor-pointer min-w-0 ${
                      paymentSettings?.maxCodAmount > 0 && finalGrandTotal > paymentSettings.maxCodAmount
                        ? 'opacity-60 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 cursor-not-allowed'
                        : 'border-orange-500/80 bg-orange-50/80 dark:bg-orange-950/20 shadow-md'
                    }`}>
                      <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                        <input
                          type="radio"
                          name="payment"
                          checked={true}
                          readOnly
                          className="w-4 h-4 text-orange-600 focus:ring-orange-500 cursor-pointer mt-0.5 sm:mt-0 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block break-words">
                              {orderType === 'delivery'
                                ? 'Cash or UPI on Delivery'
                                : orderType === 'dine_in'
                                ? 'Pay at Table / Cash Register'
                                : 'Pay at Parcel Counter (Cash / UPI)'}
                            </span>
                            {paymentSettings?.maxCodAmount > 0 && finalGrandTotal > paymentSettings.maxCodAmount && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30 shrink-0">
                                Above Max ₹{paymentSettings.maxCodAmount}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block break-words mt-0.5">
                            {orderType === 'delivery'
                              ? 'Pay by cash or scan delivery rider QR code upon doorstep arrival'
                              : orderType === 'dine_in'
                              ? 'Pay comfortably with cash or UPI QR at your table or counter'
                              : 'Pay with cash or UPI at store counter when picking up your fresh parcel'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-lg border border-orange-300 dark:border-orange-500/30 shrink-0 self-start sm:self-center">
                        Active
                      </span>
                    </label>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 min-w-0">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <span className="shrink-0">💵</span>
                        <span className="break-words">Pay on Delivery is currently disabled by store management.</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        Disabled
                      </span>
                    </div>
                  )}

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Razorpay UPI online gateway will be integrated soon. Enjoy 100% genuine pay on order receipt!</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Right 5 Columns: Order Summary & Place Order */}
            <div className="lg:col-span-5 space-y-5 min-w-0">
              <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800/80 p-5 sm:p-6 shadow-xl space-y-4 lg:sticky lg:top-24 min-w-0">
                <h3 className="text-sm font-black text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>Order Summary</span>
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-bold shrink-0">{totalItems} items</span>
                </h3>

                {/* Items Mini-List */}
                <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/80">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start gap-2 text-xs pt-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="font-bold text-slate-900 dark:text-white block break-words">
                          {item.quantity}x {item.name}
                        </span>
                        {item.size && (
                          <span className="text-[11px] text-orange-700 dark:text-orange-400 font-semibold block">
                            Size: {item.size}
                          </span>
                        )}
                        {item.toppings && item.toppings.length > 0 && (
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 block break-words">
                            +{item.toppings.join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-orange-600 dark:text-orange-400 shrink-0">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bill Breakdown */}
                <div className="space-y-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0">₹{subtotal.toFixed(0)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex flex-wrap items-center justify-between gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                      <span className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span>Coupon Discount</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-500/30 truncate max-w-[120px]">
                          {appliedCoupon.code}
                        </span>
                      </span>
                      <span className="font-bold shrink-0">-₹{Number(discountAmount || 0).toFixed(0)}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-1 text-slate-700 dark:text-slate-300 font-medium">
                    <span>{orderType === 'delivery' ? 'Delivery Fee' : 'Service & Packing'}</span>
                    {orderType !== 'delivery' ? (
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-right truncate max-w-[180px]">
                        FREE ({orderType === 'dine_in' ? `Table #${tableNumber}` : 'Takeaway'})
                      </span>
                    ) : gpsStatus !== 'verified' ? (
                      <span className="text-slate-500 dark:text-slate-400 italic">Location Needed</span>
                    ) : !gpsLocationData?.allowed ? (
                      <span className="font-bold text-red-600 dark:text-red-400">Not Deliverable</span>
                    ) : gpsLocationData?.free_delivery || resolvedDeliveryFee === 0 ? (
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">FREE</span>
                    ) : (
                      <span className="font-bold text-orange-600 dark:text-orange-400 shrink-0">₹{resolvedDeliveryFee}</span>
                    )}
                  </div>

                  {resolvedPlatformFee > 0 && (
                    <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span>Platform Fee</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Standard)</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0">₹{resolvedPlatformFee}</span>
                    </div>
                  )}

                  {deliveryTiming === 'scheduled' && orderType === 'delivery' && (
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      <span>Scheduled Slot</span>
                      <span className="font-bold truncate max-w-[170px]">{scheduledSlot}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-1 text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      <span>GST (5% Restaurant Tax)</span>
                      <span className="text-[9px] text-slate-400 hidden xs:inline">(CGST 2.5% + SGST 2.5%)</span>
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">Included in Price</span>
                  </div>

                  {/* Hub Wallet Balance Application (Only rendered if customerWallet.enabled is true) */}
                  {featureSettings?.customerWallet?.enabled && user && Number(user.walletBalance) > 0 && (
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <span className="text-xl shrink-0">💰</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            Apply Hub Wallet Credit
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            Available: ₹{Number(user.walletBalance).toFixed(2)} (Save up to ₹{applicableWalletAmount.toFixed(0)})
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => setUseWallet(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"
                      />
                    </div>
                  )}

                  {useWallet && walletDeduction > 0 && (
                    <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span>Hub Wallet Credit Applied</span>
                      <span className="shrink-0">-₹{walletDeduction.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline gap-2 min-w-0">
                    <span className="text-sm font-black text-slate-900 dark:text-white">Total Payable</span>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-400 shrink-0">
                      ₹{finalGrandTotal.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {orderError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/50 rounded-2xl text-xs text-red-700 dark:text-red-200 font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
                    <span>{orderError}</span>
                  </div>
                )}

                {/* SINGLE PRIMARY ACTION BUTTON */}
                {!gpsLocationData || !gpsLocationData.latitude || gpsStatus !== 'verified' ? (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (mapboxPickerRef.current?.triggerDetect) {
                          mapboxPickerRef.current.triggerDetect();
                        }
                        const mapEl = document.getElementById('delivery-map-section');
                        if (mapEl) {
                          mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-orange-400/30"
                    >
                      <Locate className="w-4 h-4 animate-pulse" />
                      <span>Confirm Delivery Location on Map</span>
                    </button>
                    <p className="text-[11px] text-center text-slate-600 dark:text-slate-400 font-medium">
                      Tap map or select a locality to verify delivery range & proceed
                    </p>
                  </div>
                ) : !gpsLocationData.allowed ? (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 px-5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-90 shadow-sm"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                      <span>Sorry, we will be available in your area soon</span>
                    </button>
                    <p className="text-[11px] text-center text-slate-600 dark:text-slate-400">
                      We currently deliver within {deliverySettings?.max_delivery_radius_km || 5} KM from Pathardewa.
                    </p>
                  </div>
                ) : !isShopOpen && deliveryTiming !== 'scheduled' ? (
                  <div className="space-y-2">
                    <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-500/40 text-red-800 dark:text-red-200 text-xs space-y-1.5">
                      <div className="flex items-center space-x-2 font-bold text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                        <span>Store Currently Closed for Live Baking</span>
                      </div>
                      <p className="text-[11px] text-red-700/80 dark:text-red-300/80 leading-relaxed">
                        {shopStatus?.closedMessage || 'Our daily hours are 10:00 AM – 11:00 PM.'}
                      </p>
                      {shopStatus?.allowPreorders && (
                        <button
                          type="button"
                          onClick={() => setDeliveryTiming('scheduled')}
                          className="mt-1 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Switch to Scheduled Delivery for Later Today</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 px-5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                    >
                      <Clock className="w-4 h-4 text-slate-500 dark:text-slate-500" />
                      <span>Store Closed • Reopens at {shopStatus?.openingTime || '10:00'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 text-white font-black text-base shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 border border-orange-400/30 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sending to Kitchen...</span>
                      </>
                    ) : (
                      <div className="flex items-center justify-center gap-2 truncate">
                        <span className="truncate">{deliveryTiming === 'scheduled' ? 'SCHEDULE ORDER' : 'PLACE ORDER'}</span>
                        <span>•</span>
                        <span className="shrink-0">₹{finalGrandTotal.toFixed(0)}</span>
                      </div>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                  <span>Wood-fired & baked fresh to order</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Checkout;
