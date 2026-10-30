import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  Filter,
  Eye,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ChefHat,
  RefreshCw,
  ExternalLink,
  Tag,
  ToggleLeft,
  ToggleRight,
  Upload,
  Image as ImageIcon,
  Check,
  Sparkles,
  Layers,
  Camera,
  Star,
  MessageSquareQuote,
  Flame,
  Grid,
  Info,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Truck,
  MapPin,
  Navigation,
  Locate,
  Users,
  Phone,
  PhoneCall,
  MessageCircle,
  MessageSquare,
  Mail,
  Copy,
  Download,
  UserCheck,
  Smartphone,
  Shield,
  Key,
  EyeOff,
  UserPlus,
  Package,
  Repeat,
  Ban,
  CreditCard,
  QrCode,
  ShieldCheck,
  FileText,
  Lock,
  Wallet,
  BellRing,
  Sliders,
  Send,
  ShieldAlert
} from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import api from '../services/api';
import ReceiptPrint from '../components/ReceiptPrint';
import ChangeCredentialsModal from '../components/ChangeCredentialsModal';
import { FOOD_GALLERY_PRESETS } from '../constants/foodGallery';

import { getImageUrl } from '../services/imageUtils';

const CATEGORIES = [
  'Pizzas',
  'Burgers',
  'Sandwiches',
  'Momos',
  'French Fries',
  'Pasta',
  'Cake',
  'Sides',
  'Combos',
  'Beverages',
  'Desserts'
];

const DIETARY_OPTIONS = [
  '100% Pure Veg',
  "Chef's Special",
  'Spicy Wood-Fired',
  'Jain Friendly',
  'Vegan',
  'House Favorite'
];

const COMMON_HIGHLIGHT_PRESETS = [
  { title: 'Wood-Fired Crust', icon: '🔥', description: 'Baked at 450°C stone oven' },
  { title: '100% Pure Mozzarella', icon: '🧀', description: 'Rich creamy stretch' },
  { title: 'Hand-Tossed Dough', icon: '🍕', description: 'Fermented for 24 hours' },
  { title: 'Farm-Fresh Veggies', icon: '🥦', description: 'Crisp handpicked toppings' },
  { title: 'Secret House Sauce', icon: '🥫', description: 'San Marzano herb blend' },
  { title: "Chef's Signature", icon: '👨‍🍳', description: 'Artisanal secret recipe' },
  { title: 'Crispy & Golden', icon: '✨', description: 'Perfect wood-charred blisters' },
  { title: 'Spicy Paprika Heat', icon: '🌶️', description: 'Tantalizing chili kick' }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  }
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Strict RBAC: Non-admin staff cannot access the admin console
  if (user && user.role !== 'admin') {
    return <Navigate to={user.role === 'kitchen' ? '/kitchen' : '/rider'} replace />;
  }

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'menu' | 'orders'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('everyday'); // 'everyday' | 'weekly' | 'yearly'

  // Menu filters & modals
  const [menuCategory, setMenuCategory] = useState('All');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'gallery' | 'url'
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState('All');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const cardFileInputRef = useRef(null);
  const [targetProductForCardUpload, setTargetProductForCardUpload] = useState(null);
  const [uploadingCardId, setUploadingCardId] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);

  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Pizzas',
    basePrice: '',
    discountedPrice: '',
    imageURL: '',
    images: [],
    description: '',
    prepTime: '20 Mins',
    ingredients: '',
    dietary: '100% Pure Veg',
    allowToppings: false,
    isAvailable: true,
    sizes: [],
    highlights: []
  });

  // Orders filters & modal
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);

  // Admin Order Cancellation modal state
  const [adminCancelOrderModal, setAdminCancelOrderModal] = useState(null);
  const [adminCancelReason, setAdminCancelReason] = useState('Cancelled by Store Admin');
  const [isAdminCancelling, setIsAdminCancelling] = useState(false);

  // Delivery & Distance Settings state
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [deliveryRadiusForm, setDeliveryRadiusForm] = useState({
    freeDeliveryRadiusKm: 5,
    minPurchaseForFreeDelivery: 400,
    baseDeliveryCharge: 20,
    extraChargePerKm: 10,
    accuracyThresholdMeters: 1000,
    maxDeliveryRadiusKm: 15,
    defaultMinOrderAmount: 149,
    isPlatformFeeEnabled: true,
    platformFee: 5,
    restaurantLat: 26.567247,
    restaurantLng: 83.943995,
    locations: [],
    cancellationSettings: {
      isCancellationAllowed: true,
      cancellationAllowedUntil: 'Pending',
      disallowedMessage: 'Order cannot be cancelled because it is already being prepared or is out for delivery.'
    },
    fulfillmentSettings: {
      allowDelivery: true,
      allowDineIn: true,
      allowTakeaway: true
    },
    tableSettings: {
      tableCount: 12,
      tablePrefix: 'Table '
    },
    splitPizzaSettings: {
      enabled: true,
      disabledMessage: 'Custom Split Pizza (Half & Half) is temporarily unavailable during kitchen peak hours.'
    }
  });
  const [isSavingDeliverySettings, setIsSavingDeliverySettings] = useState(false);
  const [isCapturingBaseLocation, setIsCapturingBaseLocation] = useState(false);
  const [deliverySettingsSavedMsg, setDeliverySettingsSavedMsg] = useState('');
  const [locationSearchFilter, setLocationSearchFilter] = useState('');

  // Order Cancellation Policy state
  const [isSavingCancellationPolicy, setIsSavingCancellationPolicy] = useState(false);
  const [cancellationPolicySavedMsg, setCancellationPolicySavedMsg] = useState('');

  // Registered drivers list for assignment
  const [driversList, setDriversList] = useState([]);
  const [adminRiderUserId, setAdminRiderUserId] = useState('');

  // Add / Edit Location modal state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    distanceKm: '',
    minOrderAmount: 149,
    isDeliverable: true
  });

  // Users & Leads state
  const [usersList, setUsersList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all'); // 'all' | 'customer' | 'staff' | 'kitchen' | 'admin'
  const [copiedPhone, setCopiedPhone] = useState(null);
  const [copyAllStatus, setCopyAllStatus] = useState(false);

  // Staff Account Management state (Kitchen & Admin creation)
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffFormError, setStaffFormError] = useState('');
  const [staffFormSuccess, setStaffFormSuccess] = useState('');
  const [staffForm, setStaffForm] = useState({
    name: '',
    username: '',
    phone: '',
    password: '',
    role: 'kitchen' // 'kitchen' | 'admin'
  });
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Customer Product Reviews state
  const [allReviews, setAllReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [activeReviewReplyModal, setActiveReviewReplyModal] = useState(null);
  const [reviewReplyText, setReviewReplyText] = useState('');
  const [isSubmittingReviewReply, setIsSubmittingReviewReply] = useState(false);
  const [reviewRatingFilter, setReviewRatingFilter] = useState('All');
  const [reviewReplyFilter, setReviewReplyFilter] = useState('All');
  const [reviewSearchTerm, setReviewSearchTerm] = useState('');

  // Customer Contact Us Inquiries state
  const [contactMessages, setContactMessages] = useState([]);
  const [loadingContactMessages, setLoadingContactMessages] = useState(false);
  const [activeInquiryModal, setActiveInquiryModal] = useState(null);
  const [inquiryReplyText, setInquiryReplyText] = useState('');
  const [isSubmittingInquiryReply, setIsSubmittingInquiryReply] = useState(false);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('All');
  const [inquirySearchTerm, setInquirySearchTerm] = useState('');

  // Coupons Management state
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage', // 'percentage' | 'flat'
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    totalUsageLimit: '',
    allowRepeatUsage: false,
    maxUsagePerUser: '1',
    expiryDate: ''
  });

  // Master Payment Controls state
  const [paymentSettings, setPaymentSettings] = useState({
    codEnabled: true,
    maxCodAmount: 2000,
    onlineGatewayEnabled: false,
    gatewayProvider: 'razorpay',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    razorpayMode: 'test',
    convenienceFee: 0
  });
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [paymentSettingsSavedMsg, setPaymentSettingsSavedMsg] = useState('');
  const [paymentSettingsError, setPaymentSettingsError] = useState('');
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('All');

  // Dedicated Platform Fee quick save state
  const [isSavingPlatformFee, setIsSavingPlatformFee] = useState(false);
  const [platformFeeSavedMsg, setPlatformFeeSavedMsg] = useState('');

  // Store Legal & Razorpay Compliance CMS state
  const [policyData, setPolicyData] = useState({
    contact: {
      businessName: 'Apurva Pizza Hub',
      legalEntityName: 'Apurva Pizza Hub & Fast Food',
      supportEmail: 'support@apurvapizzahub.com',
      supportPhone: '+91 73796 82620',
      operatingAddress: 'Main Market Road, Near State Bank of India (SBI), Pathardewa, Deoria, Uttar Pradesh - 274404',
      city: 'Pathardewa',
      state: 'Uttar Pradesh',
      pincode: '274404',
      operatingHours: '10:00 AM – 11:00 PM (Monday to Sunday)'
    },
    refundPolicy: '',
    shippingPolicy: '',
    termsAndConditions: '',
    privacyPolicy: '',
    aboutUs: ''
  });
  const [activePolicySubTab, setActivePolicySubTab] = useState('contact'); // 'contact' | 'refund' | 'shipping' | 'terms' | 'privacy' | 'about'
  const [savingPolicies, setSavingPolicies] = useState(false);
  const [policySavedMsg, setPolicySavedMsg] = useState('');
  const [policyError, setPolicyError] = useState('');

  // Master Feature Controls state (Wallet, Handover OTP, Auto-Print, WhatsApp/SMS)
  const [featureSettings, setFeatureSettings] = useState({
    whatsappAlerts: {
      enabled: false,
      provider: 'whatsapp_cloud_api',
      apiKey: '',
      phoneNumberId: '',
      businessPhone: '+91 73796 82620',
      notifyOnPlaced: true,
      notifyOnPreparing: true,
      notifyOnDispatched: true,
      notifyOnDelivered: true
    },
    smsAlerts: {
      enabled: false,
      provider: 'fast2sms',
      apiKey: '',
      senderId: 'APURVA'
    },
    handoverOtp: {
      enabled: true,
      requireForCodOnly: false,
      allowAdminBypass: true
    },
    silentPrint: {
      enabled: false,
      copies: 1,
      printOnStatus: 'Preparing'
    },
    customerWallet: {
      enabled: false, // Disabled by default as requested
      cashbackPercentage: 5,
      cashbackTrigger: 'all_orders',
      maxUsagePercentage: 50
    }
  });
  const [savingFeatureSettings, setSavingFeatureSettings] = useState(false);
  const [featureSavedMsg, setFeatureSavedMsg] = useState('');
  const [featureError, setFeatureError] = useState('');

  // Handover OTP Verification Modal in Orders table
  const [otpVerifyModal, setOtpVerifyModal] = useState(null); // { orderId, order }
  const [inputOtp, setInputOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpModalError, setOtpModalError] = useState('');

  // Testing WhatsApp/SMS state
  const [testNotificationPhone, setTestNotificationPhone] = useState('+91 73796 82620');
  const [sendingTestAlert, setSendingTestAlert] = useState(false);
  const [testAlertSuccess, setTestAlertSuccess] = useState('');

  // Admin Manual Wallet Adjustment state
  const [walletUserPhone, setWalletUserPhone] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletAction, setWalletAction] = useState('credit'); // 'credit' | 'debit'
  const [walletReason, setWalletReason] = useState('Store Loyalty Reward');
  const [adjustingWallet, setAdjustingWallet] = useState(false);
  const [walletAdjustSuccess, setWalletAdjustSuccess] = useState('');

  // Rider assignment modal in Admin Orders tab
  const [adminDispatchOrder, setAdminDispatchOrder] = useState(null);
  const [adminRiderName, setAdminRiderName] = useState('');
  const [adminRiderPhone, setAdminRiderPhone] = useState('');
  const [adminDispatching, setAdminDispatching] = useState(false);

  // Shop Open / Close state
  const [shopStatus, setShopStatus] = useState({
    isOpen: true,
    openMode: 'auto',
    manualStatus: 'open',
    openingTime: '10:00',
    closingTime: '23:00',
    closedMessage: 'We are currently closed for orders. Our daily hours are 10:00 AM – 11:00 PM.',
    allowPreorders: true
  });
  const [isShopStatusModalOpen, setIsShopStatusModalOpen] = useState(false);
  const [isSubmittingShopStatus, setIsSubmittingShopStatus] = useState(false);
  const [shopStatusSuccessMsg, setShopStatusSuccessMsg] = useState('');

  // Inventory (BOM) state
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('All');
  const [inventorySearch, setInventorySearch] = useState('');
  const [restockModalItem, setRestockModalItem] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockNotes, setRestockNotes] = useState('Batch restock shipment');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // COD Reconciliation state
  const [codReconciliationData, setCodReconciliationData] = useState(null);
  const [loadingCodData, setLoadingCodData] = useState(false);
  const [settleModalRider, setSettleModalRider] = useState(null);
  const [settleNotes, setSettleNotes] = useState('Cash handover confirmed by Store Cashier');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  const [lastSettlementSlip, setLastSettlementSlip] = useState(null);

  // Table QR Tent Cards Generator state
  const [isTableQrModalOpen, setIsTableQrModalOpen] = useState(false);
  const [qrSelectedTable, setQrSelectedTable] = useState('1');

  // GST Tax Invoice modal state
  const [taxInvoiceOrder, setTaxInvoiceOrder] = useState(null);

  const handleUpdateShopStatus = async (customPayload) => {
    try {
      setIsSubmittingShopStatus(true);
      setShopStatusSuccessMsg('');
      const payload = customPayload || {
        openMode: shopStatus.openMode,
        manualStatus: shopStatus.manualStatus,
        openingTime: shopStatus.openingTime,
        closingTime: shopStatus.closingTime,
        closedMessage: shopStatus.closedMessage,
        allowPreorders: shopStatus.allowPreorders
      };

      const res = await api.post('/delivery-settings/shop-status', payload);
      if (res.data.success) {
        setShopStatus(res.data.data);
        setShopStatusSuccessMsg(res.data.message || 'Store status updated successfully!');
        setTimeout(() => setShopStatusSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update shop status:', err);
      alert(err.response?.data?.message || 'Failed to update store status.');
    } finally {
      setIsSubmittingShopStatus(false);
    }
  };

  const handleQuickToggleShopOpen = async () => {
    const nextManualStatus = shopStatus.isOpen ? 'closed' : 'open';
    const updated = {
      openMode: 'manual',
      manualStatus: nextManualStatus,
      openingTime: shopStatus.openingTime,
      closingTime: shopStatus.closingTime,
      closedMessage: shopStatus.closedMessage,
      allowPreorders: shopStatus.allowPreorders
    };
    await handleUpdateShopStatus(updated);
  };

  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await api.get('/coupons');
      if (res.data.success) {
        setCoupons(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch coupons:', err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleToggleCoupon = async (couponId) => {
    try {
      const res = await api.patch(`/coupons/${couponId}/toggle`);
      if (res.data.success) {
        setCoupons((prev) =>
          prev.map((c) => (c._id === couponId ? res.data.data : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle coupon status:', err);
      alert(err.response?.data?.message || 'Failed to toggle coupon.');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await api.delete(`/coupons/${couponId}`);
      if (res.data.success) {
        setCoupons((prev) => prev.filter((c) => c._id !== couponId));
      }
    } catch (err) {
      console.error('Failed to delete coupon:', err);
      alert(err.response?.data?.message || 'Failed to delete coupon.');
    }
  };

  const handleOpenCreateCouponModal = () => {
    setEditingCouponId(null);
    setCouponForm({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderAmount: '',
      maxDiscount: '',
      totalUsageLimit: '',
      allowRepeatUsage: false,
      maxUsagePerUser: '1',
      expiryDate: ''
    });
    setCouponError('');
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCouponModal = (coupon) => {
    setEditingCouponId(coupon._id);
    setCouponForm({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue !== undefined ? String(coupon.discountValue) : '',
      minOrderAmount: coupon.minOrderAmount !== undefined ? String(coupon.minOrderAmount) : '',
      maxDiscount: coupon.maxDiscount !== undefined && coupon.maxDiscount !== null ? String(coupon.maxDiscount) : '',
      totalUsageLimit: coupon.totalUsageLimit !== undefined && coupon.totalUsageLimit !== null ? String(coupon.totalUsageLimit) : '',
      allowRepeatUsage: Boolean(coupon.allowRepeatUsage),
      maxUsagePerUser: coupon.maxUsagePerUser !== undefined && coupon.maxUsagePerUser !== null ? String(coupon.maxUsagePerUser) : '1',
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : ''
    });
    setCouponError('');
    setIsCouponModalOpen(true);
  };

  const handleCreateCouponSubmit = async (e) => {
    e.preventDefault();
    setCouponError('');
    if (!couponForm.code || !couponForm.discountValue) {
      setCouponError('Please enter coupon code and discount value.');
      return;
    }

    try {
      setIsSubmittingCoupon(true);
      const isRepeat = Boolean(couponForm.allowRepeatUsage);
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description.trim(),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        minOrderAmount: couponForm.minOrderAmount ? Number(couponForm.minOrderAmount) : 0,
        maxDiscount: couponForm.maxDiscount ? Number(couponForm.maxDiscount) : null,
        totalUsageLimit: couponForm.totalUsageLimit ? Math.max(1, Number(couponForm.totalUsageLimit)) : null,
        allowRepeatUsage: isRepeat,
        maxUsagePerUser: isRepeat ? (couponForm.maxUsagePerUser ? Math.max(1, Number(couponForm.maxUsagePerUser)) : null) : 1,
        expiryDate: couponForm.expiryDate ? new Date(couponForm.expiryDate) : null,
        isActive: true
      };

      if (editingCouponId) {
        const res = await api.put(`/coupons/${editingCouponId}`, payload);
        if (res.data.success) {
          setCoupons((prev) =>
            prev.map((c) => (c._id === editingCouponId ? res.data.data : c))
          );
          setIsCouponModalOpen(false);
          setEditingCouponId(null);
        }
      } else {
        const res = await api.post('/coupons', payload);
        if (res.data.success) {
          setCoupons((prev) => [res.data.data, ...prev]);
          setIsCouponModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to save coupon:', err);
      setCouponError(err.response?.data?.message || 'Failed to save coupon.');
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleSavePlatformFeeOnly = async () => {
    try {
      setIsSavingPlatformFee(true);
      setPlatformFeeSavedMsg('');
      const feeVal = Math.max(0, Number(deliveryRadiusForm.platformFee || 0));
      const isEnabled = Boolean(deliveryRadiusForm.isPlatformFeeEnabled);
      const payload = {
        isPlatformFeeEnabled: isEnabled,
        is_platform_fee_enabled: isEnabled,
        platformFee: feeVal,
        platform_fee: feeVal
      };
      const res = await api.put('/delivery-settings', payload);
      if (res.data.success) {
        setDeliverySettings(res.data.data);
        setDeliveryRadiusForm((prev) => ({
          ...prev,
          isPlatformFeeEnabled: res.data.data.isPlatformFeeEnabled ?? res.data.data.is_platform_fee_enabled ?? prev.isPlatformFeeEnabled,
          platformFee: res.data.data.platformFee ?? res.data.data.platform_fee ?? prev.platformFee
        }));
        setPlatformFeeSavedMsg(`✅ Platform fee ${isEnabled ? `set to ₹${feeVal}` : 'disabled'}!`);
        setTimeout(() => setPlatformFeeSavedMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update platform fee:', err);
      alert(err.response?.data?.message || 'Failed to update platform fee.');
    } finally {
      setIsSavingPlatformFee(false);
    }
  };

  const handleSaveCancellationPolicy = async () => {
    try {
      setIsSavingCancellationPolicy(true);
      setCancellationPolicySavedMsg('');
      const res = await api.put('/delivery-settings', {
        cancellationSettings: deliveryRadiusForm.cancellationSettings
      });
      if (res.data.success) {
        setDeliverySettings(res.data.data);
        setCancellationPolicySavedMsg('Order cancellation rules updated successfully!');
        setTimeout(() => setCancellationPolicySavedMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to save cancellation policy:', err);
      alert(err.response?.data?.message || 'Failed to save cancellation policy.');
    } finally {
      setIsSavingCancellationPolicy(false);
    }
  };

  const handleAdminAssignRiderSubmit = async (e) => {
    e.preventDefault();
    if (!adminDispatchOrder) return;
    if (!adminRiderName.trim()) {
      alert('Please enter a delivery rider name.');
      return;
    }

    try {
      setAdminDispatching(true);
      const res = await api.put(`/orders/${adminDispatchOrder._id}/assign-rider`, {
        userId: adminRiderUserId || undefined,
        name: adminRiderName.trim(),
        phone: adminRiderPhone.trim()
      });
      if (res.data.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === adminDispatchOrder._id ? res.data.data : o))
        );
        setAdminDispatchOrder(null);
        setAdminRiderName('');
        setAdminRiderPhone('');
        setAdminRiderUserId('');
      }
    } catch (err) {
      console.error('Failed to assign rider:', err);
      alert(err.response?.data?.message || 'Failed to assign rider.');
    } finally {
      setAdminDispatching(false);
    }
  };

  // Save Store Payment Controls
  const handleSavePaymentSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingPaymentSettings(true);
      setPaymentSettingsSavedMsg('');
      setPaymentSettingsError('');
      const res = await api.put('/payment-settings', paymentSettings);
      if (res.data.success) {
        setPaymentSettings(res.data.data);
        setPaymentSettingsSavedMsg('Store payment controls updated & published successfully!');
        setTimeout(() => setPaymentSettingsSavedMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to save payment settings:', err);
      setPaymentSettingsError(err.response?.data?.message || 'Failed to save payment settings.');
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  // Save Store Policies & Contact Details
  const handleSavePolicies = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingPolicies(true);
      setPolicySavedMsg('');
      setPolicyError('');
      const res = await api.put('/policies', policyData);
      if (res.data.success) {
        setPolicyData(res.data.data);
        setPolicySavedMsg('Legal policies & store contact details updated successfully!');
        setTimeout(() => setPolicySavedMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to save policies:', err);
      setPolicyError(err.response?.data?.message || 'Failed to update store policies.');
    } finally {
      setSavingPolicies(false);
    }
  };

  // Reset policies to Razorpay compliant standard templates
  const handleResetPoliciesToDefault = async () => {
    if (!window.confirm('Reset all policies to standard Razorpay-approved templates? Any manual edits will be replaced with compliant defaults.')) {
      return;
    }
    try {
      setSavingPolicies(true);
      setPolicySavedMsg('');
      setPolicyError('');
      const res = await api.post('/policies/reset');
      if (res.data.success) {
        setPolicyData(res.data.data);
        setPolicySavedMsg('All store policies successfully reset to Razorpay-approved templates!');
        setTimeout(() => setPolicySavedMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to reset policies:', err);
      setPolicyError(err.response?.data?.message || 'Failed to reset policies.');
    } finally {
      setSavingPolicies(false);
    }
  };

  // -------------------------------------------------------------
  // Customer Product Review Reply Operations
  // -------------------------------------------------------------
  const handleReplyReviewSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!activeReviewReplyModal || !reviewReplyText.trim()) return;
    try {
      setIsSubmittingReviewReply(true);
      const res = await api.put(
        `/products/${activeReviewReplyModal.productId}/reviews/${activeReviewReplyModal.reviewId}/reply`,
        {
          comment: reviewReplyText.trim(),
          replyText: reviewReplyText.trim()
        }
      );
      if (res.data?.success) {
        setAllReviews((prev) =>
          prev.map((r) =>
            (r._id === activeReviewReplyModal.reviewId || r.reviewId === activeReviewReplyModal.reviewId)
              ? {
                  ...r,
                  adminReply: {
                    comment: reviewReplyText.trim(),
                    repliedAt: new Date(),
                    repliedBy: 'Apurva Pizza Hub Management'
                  }
                }
              : r
          )
        );
        setActiveReviewReplyModal(null);
        setReviewReplyText('');
        alert('Official response published successfully! Customers can now view your reply.');
      }
    } catch (err) {
      console.error('Failed to submit review reply:', err);
      alert(err.response?.data?.message || 'Failed to submit review reply.');
    } finally {
      setIsSubmittingReviewReply(false);
    }
  };

  // -------------------------------------------------------------
  // Customer Contact Inquiries Operations
  // -------------------------------------------------------------
  const handleReplyInquirySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!activeInquiryModal) return;
    try {
      setIsSubmittingInquiryReply(true);
      const res = await api.put(`/policies/contact/messages/${activeInquiryModal._id}/reply`, {
        responseText: inquiryReplyText.trim() || 'Resolved and attended by Management',
        status: 'resolved'
      });
      if (res.data?.success) {
        setContactMessages((prev) =>
          prev.map((m) => (m._id === activeInquiryModal._id ? res.data.data : m))
        );
        setActiveInquiryModal(null);
        setInquiryReplyText('');
        alert('Customer inquiry marked as resolved with response notes!');
      }
    } catch (err) {
      console.error('Failed to respond to inquiry:', err);
      alert(err.response?.data?.message || 'Failed to update inquiry.');
    } finally {
      setIsSubmittingInquiryReply(false);
    }
  };

  const handleDeleteContactMessage = async (msgId) => {
    if (!window.confirm('Delete this inquiry from records?')) return;
    try {
      const res = await api.delete(`/policies/contact/messages/${msgId}`);
      if (res.data?.success) {
        setContactMessages((prev) => prev.filter((m) => m._id !== msgId));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete inquiry message.');
    }
  };

  // Mark an order paid from Admin Orders Table
  const handleMarkOrderPaid = async (orderId) => {
    try {
      const res = await api.patch(`/orders/${orderId}/payment-status`, {
        paymentStatus: 'paid',
        paymentNotes: 'Marked paid by Store Admin'
      });
      if (res.data.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, paymentStatus: 'paid' } : o))
        );
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
      alert(err.response?.data?.message || 'Failed to mark as paid.');
    }
  };

  // Save Feature Settings (Wallet, Handover OTP, Auto-Print, WhatsApp/SMS)
  const handleSaveFeatureSettings = async (customPayload) => {
    try {
      setSavingFeatureSettings(true);
      setFeatureSavedMsg('');
      setFeatureError('');
      const payload = customPayload || featureSettings;
      const res = await api.put('/features', payload);
      if (res.data?.success) {
        setFeatureSettings(res.data.data);
        setFeatureSavedMsg('Feature automation settings saved and applied successfully!');
        setTimeout(() => setFeatureSavedMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to save feature settings:', err);
      setFeatureError(err.response?.data?.message || 'Failed to save feature settings.');
    } finally {
      setSavingFeatureSettings(false);
    }
  };

  // Trigger test WhatsApp or SMS
  const handleSendTestNotification = async (channel = 'whatsapp') => {
    if (!testNotificationPhone) {
      alert('Please enter a phone number to test alerts.');
      return;
    }
    try {
      setSendingTestAlert(true);
      setTestAlertSuccess('');
      setFeatureError('');
      const res = await api.post('/features/test-notification', {
        channel,
        phone: testNotificationPhone
      });
      if (res.data?.success) {
        setTestAlertSuccess(res.data.message || 'Test notification sent successfully!');
        setTimeout(() => setTestAlertSuccess(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send test alert.');
    } finally {
      setSendingTestAlert(false);
    }
  };

  // Verify Handover OTP
  const handleVerifyOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!otpVerifyModal) return;
    if (!inputOtp || inputOtp.trim().length !== 4) {
      setOtpModalError('Please enter a valid 4-digit Handover PIN.');
      return;
    }
    try {
      setVerifyingOtp(true);
      setOtpModalError('');
      const res = await api.post('/features/verify-otp', {
        orderId: otpVerifyModal.orderId,
        otp: inputOtp.trim(),
        bypass: false
      });
      if (res.data?.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === otpVerifyModal.orderId ? res.data.data : o))
        );
        if (selectedOrderDetails && selectedOrderDetails._id === otpVerifyModal.orderId) {
          setSelectedOrderDetails(res.data.data);
        }
        setOtpVerifyModal(null);
        setInputOtp('');
      }
    } catch (err) {
      setOtpModalError(err.response?.data?.message || 'Invalid Handover PIN. Please check customer phone.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Admin Emergency Bypass Handover OTP
  const handleAdminBypassOtp = async () => {
    if (!otpVerifyModal) return;
    const reason = window.prompt(
      'Admin Emergency Bypass: Reason for delivering without Customer PIN (e.g. customer phone discharged, verified in person):',
      'Verified directly by counter staff'
    );
    if (!reason) return;
    try {
      setVerifyingOtp(true);
      setOtpModalError('');
      const res = await api.post('/features/verify-otp', {
        orderId: otpVerifyModal.orderId,
        bypass: true,
        bypassReason: reason
      });
      if (res.data?.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === otpVerifyModal.orderId ? res.data.data : o))
        );
        if (selectedOrderDetails && selectedOrderDetails._id === otpVerifyModal.orderId) {
          setSelectedOrderDetails(res.data.data);
        }
        setOtpVerifyModal(null);
        setInputOtp('');
      }
    } catch (err) {
      setOtpModalError(err.response?.data?.message || 'Failed to bypass OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Admin Manual Wallet Adjustment
  const handleAdjustUserWallet = async (e) => {
    if (e) e.preventDefault();
    if (!walletUserPhone || !walletAmount) {
      alert('Please enter user phone number and amount.');
      return;
    }
    try {
      setAdjustingWallet(true);
      setWalletAdjustSuccess('');
      const res = await api.post('/features/wallet/adjust', {
        phone: walletUserPhone.trim(),
        amount: Number(walletAmount),
        action: walletAction,
        reason: walletReason
      });
      if (res.data?.success) {
        setWalletAdjustSuccess(`Success: ${res.data.message} New Balance: ₹${res.data.data.walletBalance}`);
        setWalletAmount('');
        setTimeout(() => setWalletAdjustSuccess(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to adjust user wallet.');
    } finally {
      setAdjustingWallet(false);
    }
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [ordersRes, productsRes, analyticsRes, deliveryRes, usersRes, couponsRes, paymentRes, policyRes, featuresRes] = await Promise.all([
        api.get('/orders'),
        api.get('/products'),
        api.get('/orders/analytics/sales').catch((err) => {
          console.warn('Analytics endpoint note:', err.message);
          return { data: { success: false } };
        }),
        api.get('/delivery-settings').catch((err) => {
          console.warn('Delivery settings endpoint note:', err.message);
          return { data: { success: false } };
        }),
        api.get('/auth/users').catch((err) => {
          console.warn('Users endpoint note:', err.message);
          return { data: { success: false, data: [] } };
        }),
        api.get('/coupons').catch((err) => {
          console.warn('Coupons endpoint note:', err.message);
          return { data: { success: false, data: [] } };
        }),
        api.get('/payment-settings/admin').catch((err) => {
          console.warn('Payment settings endpoint note:', err.message);
          return { data: { success: false } };
        }),
        api.get('/policies').catch((err) => {
          console.warn('Policy endpoint note:', err.message);
          return { data: { success: false } };
        }),
        api.get('/features/admin').catch((err) => {
          console.warn('Features endpoint note:', err.message);
          return { data: { success: false } };
        }),
        api.get('/inventory').catch((err) => {
          console.warn('Inventory endpoint note:', err.message);
          return { data: { success: false } };
        }),
        api.get('/orders/cod-reconciliation').catch((err) => {
          console.warn('COD reconciliation endpoint note:', err.message);
          return { data: { success: false } };
        })
      ]);

      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data);
      }
      if (productsRes.data.success) {
        setProducts(productsRes.data.data);
      }
      if (analyticsRes.data?.success) {
        setSalesAnalytics(analyticsRes.data.data);
      }
      if (usersRes.data?.success) {
        setUsersList(usersRes.data.data || []);
      }
      if (couponsRes.data?.success) {
        setCoupons(couponsRes.data.data || []);
      }
      if (paymentRes.data?.success && paymentRes.data.data) {
        setPaymentSettings(paymentRes.data.data);
      }
      if (policyRes?.data?.success && policyRes.data.data) {
        setPolicyData(policyRes.data.data);
      }
      if (featuresRes?.data?.success && featuresRes.data.data) {
        setFeatureSettings(featuresRes.data.data);
      }
      const inventoryRes = arguments?.[0] || null; // fallback
      if (ordersRes && Array.isArray(ordersRes.data?.data)) {
        // Fetch inventory directly
        api.get('/inventory').then((r) => {
          if (r.data?.success) setInventoryItems(r.data.data || []);
        }).catch(() => {});
        // Fetch COD reconciliation directly
        api.get('/orders/cod-reconciliation').then((r) => {
          if (r.data?.success) setCodReconciliationData(r.data.data);
        }).catch(() => {});
        // Fetch product reviews for review management
        api.get('/products/reviews/all').then((r) => {
          if (r.data?.success) setAllReviews(r.data.data || []);
        }).catch(() => {});
        // Fetch contact messages for inquiry responses
        api.get('/policies/contact/messages').then((r) => {
          if (r.data?.success) setContactMessages(r.data.data || []);
        }).catch(() => {});
      }
      if (deliveryRes.data?.success) {
        const dData = deliveryRes.data.data;
        if (dData.computedShopStatus || dData.shopStatus) {
          setShopStatus(dData.computedShopStatus || dData.shopStatus);
        }
        setDeliverySettings(dData);
        setDeliveryRadiusForm({
          freeDeliveryRadiusKm: dData.free_delivery_radius ?? dData.freeDeliveryRadiusKm ?? 5,
          minPurchaseForFreeDelivery: dData.min_purchase_for_free_delivery ?? dData.minPurchaseForFreeDelivery ?? 400,
          baseDeliveryCharge: dData.base_delivery_charge ?? 20,
          extraChargePerKm: dData.extra_charge_per_km ?? dData.extraChargePerKm ?? 10,
          accuracyThresholdMeters: dData.accuracy_threshold_meters ?? 1000,
          maxDeliveryRadiusKm: dData.max_delivery_radius_km ?? dData.maxDeliveryRadiusKm ?? 15,
          defaultMinOrderAmount: dData.defaultMinOrderAmount ?? 149,
          isPlatformFeeEnabled: dData.isPlatformFeeEnabled ?? dData.is_platform_fee_enabled ?? true,
          platformFee: dData.platformFee ?? dData.platform_fee ?? 5,
          restaurantLat: dData.restaurant_latitude ?? dData.restaurantLat ?? 26.567247,
          restaurantLng: dData.restaurant_longitude ?? dData.restaurantLng ?? 83.943995,
          locations: dData.locations || [],
          cancellationSettings: dData.cancellationSettings || {
            isCancellationAllowed: true,
            cancellationAllowedUntil: 'Pending',
            disallowedMessage: 'Order cannot be cancelled because it is already being prepared or is out for delivery.'
          },
          fulfillmentSettings: dData.fulfillmentSettings || {
            allowDelivery: true,
            allowDineIn: true,
            allowTakeaway: true
          },
          tableSettings: dData.tableSettings || {
            tableCount: 12,
            tablePrefix: 'Table '
          },
          splitPizzaSettings: dData.splitPizzaSettings || {
            enabled: true,
            disabledMessage: 'Custom Split Pizza (Half & Half) is temporarily unavailable during kitchen peak hours.'
          }
        });
      }

      // Fetch drivers list
      try {
        const driversRes = await api.get('/auth/drivers');
        if (driversRes.data?.success) {
          setDriversList(driversRes.data.data || []);
        }
      } catch (dErr) {
        // Non-blocking
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Raw Inventory (BOM) API helpers
  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const res = await api.get('/inventory');
      if (res.data?.success) {
        setInventoryItems(res.data.data || []);
      }
    } catch (err) {
      console.warn('Failed to load inventory:', err.message);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleRestockSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!restockModalItem || !restockQuantity || Number(restockQuantity) <= 0) {
      alert('Please enter a valid restock quantity greater than 0.');
      return;
    }
    try {
      setIsSubmittingRestock(true);
      const res = await api.post(`/inventory/${restockModalItem._id}/restock`, {
        quantity: Number(restockQuantity),
        notes: restockNotes || 'Restock batch'
      });
      if (res.data?.success) {
        setInventoryItems((prev) =>
          prev.map((it) => (it._id === restockModalItem._id ? res.data.data : it))
        );
        alert(`Successfully added +${restockQuantity} ${restockModalItem.unit} to ${restockModalItem.name}!`);
        setRestockModalItem(null);
        setRestockQuantity('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to restock item.');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Rider COD Settlement API helpers
  const fetchCodReconciliation = async () => {
    try {
      setLoadingCodData(true);
      const res = await api.get('/orders/cod-reconciliation');
      if (res.data?.success) {
        setCodReconciliationData(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load COD reconciliation data:', err.message);
    } finally {
      setLoadingCodData(false);
    }
  };

  const handleSettleRiderCOD = async (e) => {
    if (e) e.preventDefault();
    if (!settleModalRider) return;
    try {
      setIsSubmittingSettlement(true);
      const res = await api.post('/orders/cod-settle', {
        riderName: settleModalRider.riderName,
        riderPhone: settleModalRider.riderPhone,
        notes: settleNotes || 'Shift settlement cleared'
      });
      if (res.data?.success) {
        setLastSettlementSlip({
          ...res.data.data,
          riderName: settleModalRider.riderName,
          riderPhone: settleModalRider.riderPhone,
          settledAt: new Date().toLocaleString('en-IN')
        });
        alert(`COD Settlement complete! ₹${res.data.data.settledAmount} cleared for ${settleModalRider.riderName}.`);
        setSettleModalRider(null);
        fetchCodReconciliation();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to settle rider COD.');
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Export Full Accounting Report (CSV)
  const handleExportAccountingCSV = () => {
    if (!orders || orders.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const headers = [
      'Date & Time',
      'Order ID',
      'Customer Name',
      'Customer Phone',
      'Fulfillment Type',
      'Table Number',
      'Items Ordered',
      'Subtotal (INR)',
      'Coupon Code',
      'Discount (INR)',
      'Delivery Fee (INR)',
      'CGST 2.5% (INR)',
      'SGST 2.5% (INR)',
      'Total GST (INR)',
      'Total Amount (INR)',
      'Payment Method',
      'Payment Status',
      'COD Settled',
      'Order Status'
    ];

    const rows = orders.map((o) => {
      const dateStr = new Date(o.createdAt).toLocaleString('en-IN');
      const orderId = o._id;
      const customerName = (o.user?.name || 'Walk-in Guest').replace(/,/g, ' ');
      const customerPhone = o.deliveryPhone || o.user?.phone || 'N/A';
      const fulfillmentType = o.orderType === 'dine_in' ? 'Dine-In' : (o.orderType === 'takeaway' ? 'Takeaway' : 'Delivery');
      const tableNo = o.tableNumber || (o.orderType === 'dine_in' ? 'Counter' : 'N/A');
      const itemsStr = (o.items || []).map((it) => `${it.quantity}x ${it.name} (${it.size || 'Reg'})`).join('; ').replace(/,/g, ' ');
      const subtotal = Number(o.itemsPrice || o.totalAmount - (o.deliveryFee || 0)).toFixed(2);
      const couponCode = o.coupon?.code || 'None';
      const discount = Number(o.coupon?.discountAmount || 0).toFixed(2);
      const deliveryFee = Number(o.deliveryFee || 0).toFixed(2);
      const cgst = Number(o.taxDetails?.cgst || 0).toFixed(2);
      const sgst = Number(o.taxDetails?.sgst || 0).toFixed(2);
      const totalTax = Number(o.taxDetails?.totalTax || 0).toFixed(2);
      const total = Number(o.totalAmount || 0).toFixed(2);
      const paymentMethod = (o.paymentMethod || 'COD').toUpperCase();
      const paymentStatus = (o.paymentStatus || 'pending').toUpperCase();
      const codSettled = o.codSettled ? 'YES' : 'NO';
      const status = o.status;

      return [
        `"${dateStr}"`,
        `"${orderId}"`,
        `"${customerName}"`,
        `"${customerPhone}"`,
        `"${fulfillmentType}"`,
        `"${tableNo}"`,
        `"${itemsStr}"`,
        subtotal,
        `"${couponCode}"`,
        discount,
        deliveryFee,
        cgst,
        sgst,
        totalTax,
        total,
        `"${paymentMethod}"`,
        `"${paymentStatus}"`,
        `"${codSettled}"`,
        `"${status}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Apurva_Pizza_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  useEffect(() => {
    fetchData();

    // Socket.io Real-Time Synchronization for Orders & Kitchen Pipeline
    const socket = getSocket();
    socket.emit('join_admin');

    const handleNewOrder = (newOrder) => {
      if (!newOrder || !newOrder._id) return;
      setOrders((prev) => {
        const exists = prev.some((o) => o._id === newOrder._id);
        if (exists) return prev;
        return [newOrder, ...prev];
      });
    };

    const handleStatusUpdate = (payload) => {
      const orderId = payload.orderId || payload.order?._id;
      const status = payload.status || payload.order?.status;
      if (!orderId || !status) return;

      setOrders((prev) =>
        prev.map((o) => {
          if (o._id === orderId) {
            return payload.order ? payload.order : { ...o, status };
          }
          return o;
        })
      );

      setSelectedOrderDetails((prev) => {
        if (prev && prev._id === orderId) {
          return payload.order ? payload.order : { ...prev, status };
        }
        return prev;
      });
    };

    const handleShopStatusUpdate = (data) => {
      if (data) {
        setShopStatus(data);
      }
    };

    const handleProductUpdated = (updatedProd) => {
      if (updatedProd && updatedProd._id) {
        setProducts((prev) =>
          prev.map((p) => (p._id === updatedProd._id ? { ...p, ...updatedProd } : p))
        );
        setSelectedProductDetails((prev) =>
          prev && prev._id === updatedProd._id ? { ...prev, ...updatedProd } : prev
        );
      }
    };

    const handleProductsUpdated = () => {
      fetchData();
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

    socket.on('new_order', handleNewOrder);
    socket.on('order_status_update', handleStatusUpdate);
    socket.on('order_status_updated', handleStatusUpdate);
    socket.on('order_payment_updated', handlePaymentUpdated);
    socket.on('shop:status_update', handleShopStatusUpdate);
    socket.on('product_updated', handleProductUpdated);
    socket.on('products_updated', handleProductsUpdated);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_status_update', handleStatusUpdate);
      socket.off('order_status_updated', handleStatusUpdate);
      socket.off('order_payment_updated', handlePaymentUpdated);
      socket.off('shop:status_update', handleShopStatusUpdate);
      socket.off('product_updated', handleProductUpdated);
      socket.off('products_updated', handleProductsUpdated);
    };
  }, []);

  // Today's metrics calculation
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((o) => new Date(o.createdAt) >= startOfToday);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'Pending').length;
  const preparingCount = orders.filter((o) => o.status === 'Preparing').length;
  const readyCount = orders.filter((o) => o.status === 'Ready').length;
  const deliveredCount = orders.filter((o) => o.status === 'Delivered').length;
  const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

  // -------------------------------------------------------------
  // Users & Leads Operations
  // -------------------------------------------------------------
  const handleCopyPhone = (phoneNumber) => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(phoneNumber);
    setCopiedPhone(phoneNumber);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleCopyAllPhones = () => {
    const validPhones = usersList
      .filter((u) => u.phone && /^[0-9]{10}$/.test(u.phone.replace(/\D/g, '')))
      .map((u) => u.phone.replace(/\D/g, ''));

    if (validPhones.length === 0) return;
    navigator.clipboard.writeText(validPhones.join(', '));
    setCopyAllStatus(true);
    setTimeout(() => setCopyAllStatus(false), 2500);
  };

  const handleExportLeadsCSV = () => {
    const validUsers = usersList.filter((u) => u.phone);
    if (validUsers.length === 0) return;

    const headers = ['Name', 'Phone', 'Email', 'Role', 'Total Orders', 'Total Spent (INR)', 'Registration Date', 'Address'];
    const rows = validUsers.map((u) => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${u.phone}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${u.role || 'customer'}"`,
      u.orderCount || 0,
      u.totalSpent || 0,
      `"${new Date(u.createdAt).toLocaleDateString('en-IN')}"`,
      `"${(u.address || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `apurva_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // Staff Account Operations (Kitchen & Admin Creation)
  // -------------------------------------------------------------
  const handleOpenCreateStaffModal = () => {
    setStaffForm({
      name: '',
      username: '',
      phone: '',
      password: '',
      role: 'kitchen'
    });
    setStaffFormError('');
    setStaffFormSuccess('');
    setShowStaffPassword(false);
    setIsStaffModalOpen(true);
  };

  const handleCreateStaffAccount = async (e) => {
    e.preventDefault();
    setStaffFormError('');
    setStaffFormSuccess('');

    if (!staffForm.name.trim()) {
      setStaffFormError('Please enter full name of the staff member.');
      return;
    }

    if (!staffForm.username.trim() && !staffForm.phone.trim()) {
      setStaffFormError('Please provide a login username or mobile number.');
      return;
    }

    if (staffForm.password.trim().length < 6) {
      setStaffFormError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmittingStaff(true);
      const res = await api.post('/auth/staff-users', {
        name: staffForm.name.trim(),
        username: staffForm.username.trim(),
        phone: staffForm.phone.trim(),
        password: staffForm.password.trim(),
        role: staffForm.role
      });

      if (res.data?.success) {
        setStaffFormSuccess(
          `✅ Account created successfully! Role: ${staffForm.role === 'kitchen' ? 'Kitchen KDS' : 'Administrator'}. Credentials are ready for login.`
        );
        // Refresh users list
        const usersRes = await api.get('/auth/users');
        if (usersRes.data?.success) {
          setUsersList(usersRes.data.data || []);
        }
        setTimeout(() => {
          setIsStaffModalOpen(false);
          setStaffFormSuccess('');
        }, 1800);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create staff account.';
      setStaffFormError(msg);
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleDeleteStaffAccount = async (staffId, staffName, staffRole) => {
    const isSelf = user && (user._id === staffId || user.phone === staffId);
    if (isSelf) {
      alert('Security Alert: You cannot delete your own currently active account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove staff account "${staffName}" (${staffRole.toUpperCase()})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.delete(`/auth/staff-users/${staffId}`);
      if (res.data?.success) {
        setUsersList((prev) => prev.filter((u) => u._id !== staffId));
        alert(res.data.message || `Staff account "${staffName}" has been removed.`);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete staff account.');
    }
  };

  const handleUpdateUserRole = async (userId, newRole, userName) => {
    try {
      const res = await api.patch(`/auth/users/${userId}/role`, { role: newRole });
      if (res.data?.success) {
        setUsersList((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
        );
        alert(`Account for "${userName || 'User'}" role successfully updated to ${newRole.toUpperCase()}!`);
      }
    } catch (err) {
      console.error('Failed to update user role:', err);
      alert(err.response?.data?.message || 'Failed to update user role.');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const q = userSearchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.address && u.address.toLowerCase().includes(q));

    const matchesRole =
      userRoleFilter === 'all' ||
      (userRoleFilter === 'customer' && (u.role === 'customer' || !u.role)) ||
      (userRoleFilter === 'driver' && u.role === 'driver') ||
      (userRoleFilter === 'staff' && (u.role === 'admin' || u.role === 'kitchen' || u.role === 'driver')) ||
      (userRoleFilter === 'kitchen' && u.role === 'kitchen') ||
      (userRoleFilter === 'admin' && u.role === 'admin');

    return matchesQuery && matchesRole;
  });

  const customerLeadsCount = usersList.filter((u) => u.role === 'customer' || !u.role || (u.phone && /^[0-9]{10}$/.test(u.phone))).length;
  const staffAccountsCount = usersList.filter((u) => u.role === 'admin' || u.role === 'kitchen').length;
  const customersWithOrdersCount = usersList.filter((u) => (u.orderCount || 0) > 0).length;
  const totalLeadsRevenue = usersList.reduce((sum, u) => sum + (Number(u.totalSpent) || 0), 0);

  // -------------------------------------------------------------
  // Product Form & CRUD Operations with Local Upload & Complete Details
  // -------------------------------------------------------------
  const handleProcessImageUpload = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Selected image exceeds 10MB limit. Please choose a smaller photo.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingImage(true);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.data) {
        const newUrl = res.data.data.url;
        setProductForm((prev) => {
          const currentImages = prev.images || (prev.imageURL ? [prev.imageURL] : []);
          const merged = currentImages.includes(newUrl) ? currentImages : [...currentImages, newUrl];
          return {
            ...prev,
            images: merged,
            imageURL: prev.imageURL || newUrl
          };
        });
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert(err.response?.data?.message || 'Failed to upload image from device.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProcessMultipleImages = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f && f.type.startsWith('image/'));
    if (files.length === 0) return;

    if (files.some((f) => f.size > 10 * 1024 * 1024)) {
      alert('One or more images exceed 10MB limit. Please choose smaller photos.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    try {
      setUploadingImage(true);
      const res = await api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.data) {
        const newUrls = res.data.data.map((item) => item.url);
        setProductForm((prev) => {
          const currentImages = prev.images || (prev.imageURL ? [prev.imageURL] : []);
          const merged = [...currentImages, ...newUrls.filter((u) => !currentImages.includes(u))];
          return {
            ...prev,
            images: merged,
            imageURL: prev.imageURL || merged[0] || ''
          };
        });
      }
    } catch (err) {
      console.warn('Multiple upload fallback to single upload:', err);
      for (const file of files) {
        await handleProcessImageUpload(file);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSetCoverImage = (imgUrl) => {
    setProductForm((prev) => ({
      ...prev,
      imageURL: imgUrl
    }));
  };

  const handleRemoveImage = (imgUrl) => {
    setProductForm((prev) => {
      const remaining = (prev.images || []).filter((u) => u !== imgUrl);
      const nextCover = prev.imageURL === imgUrl ? (remaining[0] || '') : prev.imageURL;
      return {
        ...prev,
        images: remaining,
        imageURL: nextCover
      };
    });
  };

  const handleImageFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 1) {
      handleProcessMultipleImages(files);
    } else if (files && files[0]) {
      handleProcessImageUpload(files[0]);
    }
  };

  const handleDropImage = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 1) {
      handleProcessMultipleImages(files);
    } else if (files && files[0] && files[0].type.startsWith('image/')) {
      handleProcessImageUpload(files[0]);
    }
  };

  // Direct 1-Click photo update from product cards in menu list
  const handleDirectCardImageUpload = async (e) => {
    const file = e.target.files?.[0];
    const prodId = targetProductForCardUpload;
    if (!file || !prodId) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Selected image exceeds 10MB limit. Please choose a smaller photo.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingCardId(prodId);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadRes.data.success) {
        const newUrl = uploadRes.data.data.url;
        const updateRes = await api.put(`/products/${prodId}`, { imageURL: newUrl });
        if (updateRes.data.success) {
          setProducts((prev) =>
            prev.map((p) => (p._id === prodId ? updateRes.data.data : p))
          );
          if (selectedProductDetails?._id === prodId) {
            setSelectedProductDetails(updateRes.data.data);
          }
        }
      }
    } catch (err) {
      console.error('Direct photo upload failed:', err);
      alert(err.response?.data?.message || 'Failed to update photo from device.');
    } finally {
      setUploadingCardId(null);
      setTargetProductForCardUpload(null);
      if (cardFileInputRef.current) cardFileInputRef.current.value = '';
    }
  };

  const handleAddSize = () => {
    setProductForm((prev) => ({
      ...prev,
      sizes: [...(prev.sizes || []), { size: '', price: '', discountedPrice: '' }]
    }));
  };

  const handleUpdateSize = (index, field, value) => {
    setProductForm((prev) => {
      const updated = [...(prev.sizes || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, sizes: updated };
    });
  };

  const handleRemoveSize = (index) => {
    setProductForm((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
  };

  // Highlights handlers
  const handleAddHighlightPreset = (preset) => {
    setProductForm((prev) => {
      const exists = (prev.highlights || []).some((h) => h.title === preset.title);
      if (exists) return prev;
      return {
        ...prev,
        highlights: [
          ...(prev.highlights || []),
          { title: preset.title, description: preset.description || '', icon: preset.icon || '✨' }
        ]
      };
    });
  };

  const handleAddCustomHighlight = () => {
    setProductForm((prev) => ({
      ...prev,
      highlights: [...(prev.highlights || []), { title: '', description: '', icon: '✨' }]
    }));
  };

  const handleUpdateHighlight = (index, field, value) => {
    setProductForm((prev) => {
      const updated = [...(prev.highlights || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, highlights: updated };
    });
  };

  const handleRemoveHighlight = (index) => {
    setProductForm((prev) => ({
      ...prev,
      highlights: (prev.highlights || []).filter((_, i) => i !== index)
    }));
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setImageInputMode('upload');
    setProductForm({
      name: '',
      category: 'Pizzas',
      basePrice: '',
      discountedPrice: '',
      imageURL: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      description: '',
      prepTime: '20 Mins',
      ingredients: '',
      dietary: '100% Pure Veg',
      allowToppings: true,
      isAvailable: true,
      stockQuantity: '',
      isUnlimitedStock: true,
      sizes: [
        { size: 'Regular (7")', price: '', discountedPrice: '' },
        { size: 'Medium (9")', price: '', discountedPrice: '' },
        { size: 'Large (11")', price: '', discountedPrice: '' }
      ],
      highlights: [
        { title: 'Wood-Fired Crust', icon: '🔥', description: 'Artisanal stone oven bake' },
        { title: '100% Pure Mozzarella', icon: '🧀', description: 'Rich creamy stretch' }
      ]
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setImageInputMode('upload');
    const isUnlim = prod.stockQuantity === null || prod.stockQuantity === undefined;
    const initialImages = (prod.images && prod.images.length > 0)
      ? prod.images
      : (prod.imageURL ? [prod.imageURL] : []);
    setProductForm({
      name: prod.name,
      category: prod.category,
      basePrice: prod.basePrice,
      discountedPrice: prod.discountedPrice || '',
      imageURL: prod.imageURL,
      images: initialImages,
      description: prod.description || '',
      prepTime: prod.prepTime || '20 Mins',
      ingredients: prod.ingredients || '',
      dietary: prod.dietary || '100% Pure Veg',
      allowToppings: !!prod.allowToppings,
      isAvailable: prod.isAvailable !== false,
      stockQuantity: !isUnlim ? String(prod.stockQuantity) : '',
      isUnlimitedStock: isUnlim,
      sizes: prod.sizes && prod.sizes.length > 0 ? prod.sizes : [],
      highlights: prod.highlights && prod.highlights.length > 0 ? prod.highlights : []
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const allImages = (productForm.images && productForm.images.length > 0)
        ? productForm.images
        : (productForm.imageURL ? [productForm.imageURL.trim()] : []);
      const cover = productForm.imageURL?.trim() || allImages[0] || '';

      if (!cover) {
        alert('Please choose an image from your device, gallery presets, or provide an image link.');
        return;
      }

      let cleanStockQuantity = null;
      if (!productForm.isUnlimitedStock && productForm.stockQuantity !== '' && productForm.stockQuantity !== null) {
        cleanStockQuantity = Math.max(0, parseInt(productForm.stockQuantity, 10) || 0);
      }

      const isAvail = cleanStockQuantity === 0 ? false : Boolean(productForm.isAvailable);

      const payload = {
        name: productForm.name.trim(),
        category: productForm.category,
        basePrice: parseFloat(productForm.basePrice),
        discountedPrice: productForm.discountedPrice ? parseFloat(productForm.discountedPrice) : null,
        imageURL: cover,
        images: allImages,
        description: productForm.description.trim(),
        prepTime: productForm.prepTime ? productForm.prepTime.trim() : '20 Mins',
        ingredients: productForm.ingredients ? productForm.ingredients.trim() : '',
        dietary: productForm.dietary ? productForm.dietary.trim() : '100% Pure Veg',
        allowToppings: productForm.allowToppings,
        stockQuantity: cleanStockQuantity,
        isAvailable: isAvail,
        highlights: (productForm.highlights || []).filter((h) => h.title && h.title.trim()),
        sizes: (productForm.sizes || [])
          .filter((s) => s.size && s.price)
          .map((s) => ({
            size: s.size.trim(),
            price: parseFloat(s.price),
            discountedPrice: s.discountedPrice ? parseFloat(s.discountedPrice) : null
          }))
      };

      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct._id}`, payload);
        if (res.data.success) {
          setProducts((prev) =>
            prev.map((p) => (p._id === editingProduct._id ? res.data.data : p))
          );
          if (selectedProductDetails && selectedProductDetails._id === editingProduct._id) {
            setSelectedProductDetails(res.data.data);
          }
        }
      } else {
        const res = await api.post('/products', payload);
        if (res.data.success) {
          setProducts((prev) => [res.data.data, ...prev]);
        }
      }

      setIsProductModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the menu?`)) return;
    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        setProducts((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleToggleProductAvailability = async (prod) => {
    try {
      const updated = !prod.isAvailable;
      let newStock = prod.stockQuantity;
      // If enabling a product that had 0 stock, reset to null (unlimited) so it can be ordered
      if (updated && prod.stockQuantity === 0) {
        newStock = null;
      }
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => (p._id === prod._id ? { ...p, isAvailable: updated, stockQuantity: newStock } : p))
      );
      await api.put(`/products/${prod._id}`, { isAvailable: updated, stockQuantity: newStock });
    } catch (err) {
      fetchData();
    }
  };

  const handleQuickStockDelta = async (prod, delta) => {
    try {
      const current = prod.stockQuantity !== null && prod.stockQuantity !== undefined ? prod.stockQuantity : 10;
      const nextStock = Math.max(0, current + delta);
      const isAvail = nextStock > 0;
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => (p._id === prod._id ? { ...p, stockQuantity: nextStock, isAvailable: isAvail } : p))
      );
      if (selectedProductDetails && selectedProductDetails._id === prod._id) {
        setSelectedProductDetails((prev) => ({ ...prev, stockQuantity: nextStock, isAvailable: isAvail }));
      }
      await api.patch(`/products/${prod._id}/stock`, {
        stockQuantity: nextStock,
        isAvailable: isAvail
      });
    } catch (err) {
      console.error('Quick stock error:', err);
      fetchData();
    }
  };

  const handlePromptSetStock = async (prod) => {
    const currentStr = prod.stockQuantity !== null && prod.stockQuantity !== undefined ? String(prod.stockQuantity) : 'unlimited';
    const input = window.prompt(
      `Enter exact available stock count for "${prod.name}" (or type 'unlimited'):`,
      currentStr
    );
    if (input === null) return;
    const trimmed = input.trim().toLowerCase();
    try {
      if (trimmed === 'unlimited' || trimmed === '') {
        setProducts((prev) =>
          prev.map((p) => (p._id === prod._id ? { ...p, stockQuantity: null, isAvailable: true } : p))
        );
        if (selectedProductDetails && selectedProductDetails._id === prod._id) {
          setSelectedProductDetails((prev) => ({ ...prev, stockQuantity: null, isAvailable: true }));
        }
        await api.patch(`/products/${prod._id}/stock`, { stockQuantity: null, isAvailable: true });
      } else {
        const num = Math.max(0, parseInt(trimmed, 10) || 0);
        const isAvail = num > 0;
        setProducts((prev) =>
          prev.map((p) => (p._id === prod._id ? { ...p, stockQuantity: num, isAvailable: isAvail } : p))
        );
        if (selectedProductDetails && selectedProductDetails._id === prod._id) {
          setSelectedProductDetails((prev) => ({ ...prev, stockQuantity: num, isAvailable: isAvail }));
        }
        await api.patch(`/products/${prod._id}/stock`, { stockQuantity: num, isAvailable: isAvail });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stock');
      fetchData();
    }
  };

  // -------------------------------------------------------------
  // Order Operations
  // -------------------------------------------------------------
  const handleConfirmAdminCancel = async (e) => {
    if (e) e.preventDefault();
    if (!adminCancelOrderModal) return;
    try {
      setIsAdminCancelling(true);
      const res = await api.put(`/orders/${adminCancelOrderModal._id}/cancel`, {
        reason: adminCancelReason || 'Cancelled by Store Admin'
      });
      setOrders((prev) =>
        prev.map((o) =>
          o._id === adminCancelOrderModal._id
            ? { ...o, status: 'Cancelled', cancellationReason: adminCancelReason }
            : o
        )
      );
      if (selectedOrderDetails && selectedOrderDetails._id === adminCancelOrderModal._id) {
        setSelectedOrderDetails((prev) => ({
          ...prev,
          status: 'Cancelled',
          cancellationReason: adminCancelReason
        }));
      }
      setAdminCancelOrderModal(null);
    } catch (err) {
      console.error('Failed to cancel order by admin:', err);
      alert(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setIsAdminCancelling(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    if (newStatus === 'Cancelled') {
      const order = orders.find((o) => o._id === orderId);
      if (order) {
        setAdminCancelOrderModal(order);
        setAdminCancelReason('Cancelled by Store Admin');
        return;
      }
    }

    // Handover OTP Check for Delivered status
    if (newStatus === 'Delivered' && featureSettings?.handoverOtp?.enabled) {
      const order = orders.find((o) => o._id === orderId);
      const isCod = order?.paymentMethod === 'cod';
      const requiresOtp = !featureSettings.handoverOtp.requireForCodOnly || isCod;
      if (requiresOtp && !order?.otpVerifiedAt) {
        setOtpVerifyModal({ orderId, order });
        setInputOtp('');
        setOtpModalError('');
        return;
      }
    }

    try {
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrderDetails && selectedOrderDetails._id === orderId) {
        setSelectedOrderDetails((prev) => ({ ...prev, status: newStatus }));
      }
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });

      // Silent / Auto Print trigger
      if (featureSettings?.silentPrint?.enabled && newStatus === (featureSettings.silentPrint.printOnStatus || 'Preparing')) {
        const orderToPrint = orders.find((o) => o._id === orderId) || res.data?.data;
        if (orderToPrint) {
          setSelectedPrintOrder(orderToPrint);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchData();
    }
  };

  // -------------------------------------------------------------
  // Delivery Settings & Distance Operations
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Delivery Settings & Distance Operations
  // -------------------------------------------------------------
  const handleSaveDeliverySettings = async (customLocations = null) => {
    try {
      setIsSavingDeliverySettings(true);
      setDeliverySettingsSavedMsg('');

      const payload = {
        freeDeliveryRadiusKm: Number(deliveryRadiusForm.freeDeliveryRadiusKm),
        free_delivery_radius: Number(deliveryRadiusForm.freeDeliveryRadiusKm),
        minPurchaseForFreeDelivery: Number(deliveryRadiusForm.minPurchaseForFreeDelivery ?? 400),
        min_purchase_for_free_delivery: Number(deliveryRadiusForm.minPurchaseForFreeDelivery ?? 400),
        base_delivery_charge: Number(deliveryRadiusForm.baseDeliveryCharge ?? 20),
        extraChargePerKm: Number(deliveryRadiusForm.extraChargePerKm),
        extra_charge_per_km: Number(deliveryRadiusForm.extraChargePerKm),
        accuracy_threshold_meters: Number(deliveryRadiusForm.accuracyThresholdMeters ?? 1000),
        maxDeliveryRadiusKm: Number(deliveryRadiusForm.maxDeliveryRadiusKm),
        max_delivery_radius_km: Number(deliveryRadiusForm.maxDeliveryRadiusKm),
        defaultMinOrderAmount: Number(deliveryRadiusForm.defaultMinOrderAmount),
        isPlatformFeeEnabled: Boolean(deliveryRadiusForm.isPlatformFeeEnabled),
        is_platform_fee_enabled: Boolean(deliveryRadiusForm.isPlatformFeeEnabled),
        platformFee: Math.max(0, Number(deliveryRadiusForm.platformFee || 0)),
        platform_fee: Math.max(0, Number(deliveryRadiusForm.platformFee || 0)),
        restaurantLat: Number(deliveryRadiusForm.restaurantLat),
        restaurantLng: Number(deliveryRadiusForm.restaurantLng),
        restaurant_latitude: Number(deliveryRadiusForm.restaurantLat),
        restaurant_longitude: Number(deliveryRadiusForm.restaurantLng),
        locations: customLocations !== null ? customLocations : deliveryRadiusForm.locations,
        fulfillmentSettings: deliveryRadiusForm.fulfillmentSettings || {
          allowDelivery: true,
          allowDineIn: true,
          allowTakeaway: true
        },
        tableSettings: {
          tableCount: Math.max(1, Math.min(100, Number(deliveryRadiusForm.tableSettings?.tableCount || 12))),
          tablePrefix: String(deliveryRadiusForm.tableSettings?.tablePrefix ?? 'Table ').trim() || 'Table '
        },
        splitPizzaSettings: {
          enabled: deliveryRadiusForm.splitPizzaSettings?.enabled !== false,
          disabledMessage: String(deliveryRadiusForm.splitPizzaSettings?.disabledMessage || '').trim() ||
            'Custom Split Pizza (Half & Half) is temporarily paused by the kitchen.'
        }
      };

      const res = await api.put('/delivery-settings', payload);
      if (res.data.success) {
        setDeliverySettings(res.data.data);
        setDeliveryRadiusForm((prev) => ({
          ...prev,
          ...res.data.data,
          baseDeliveryCharge: res.data.data.base_delivery_charge ?? prev.baseDeliveryCharge,
          accuracyThresholdMeters: res.data.data.accuracy_threshold_meters ?? prev.accuracyThresholdMeters,
          isPlatformFeeEnabled: res.data.data.isPlatformFeeEnabled ?? res.data.data.is_platform_fee_enabled ?? prev.isPlatformFeeEnabled,
          platformFee: res.data.data.platformFee ?? res.data.data.platform_fee ?? prev.platformFee
        }));
        setDeliverySettingsSavedMsg('✅ Delivery settings, radius & charges saved successfully!');
        setTimeout(() => setDeliverySettingsSavedMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to save delivery settings:', err);
      alert(err.response?.data?.message || 'Failed to save delivery settings.');
    } finally {
      setIsSavingDeliverySettings(false);
    }
  };

  /**
   * 1-Click Action to capture owner's current GPS coordinates as restaurant base
   */
  const handleCaptureRestaurantBaseLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsCapturingBaseLocation(true);
    setDeliverySettingsSavedMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = Math.round(pos.coords.latitude * 10000) / 10000;
          const lng = Math.round(pos.coords.longitude * 10000) / 10000;
          const accuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;

          const res = await api.post('/delivery-settings/capture-base-location', {
            restaurant_latitude: lat,
            restaurant_longitude: lng,
            accuracy
          });

          if (res.data?.success) {
            setDeliveryRadiusForm((prev) => ({
              ...prev,
              restaurantLat: lat,
              restaurantLng: lng
            }));
            setDeliverySettingsSavedMsg(`📍 Restaurant Base GPS captured and saved: ${lat}, ${lng}!`);
            setTimeout(() => setDeliverySettingsSavedMsg(''), 5000);
            alert(`📍 Restaurant GPS Base Location saved successfully: Lat ${lat}, Lng ${lng} (±${accuracy}m accuracy). All delivery calculations will now use these coordinates.`);
          }
        } catch (err) {
          console.error('Failed to capture base location:', err);
          alert(err.response?.data?.message || 'Failed to capture restaurant location.');
        } finally {
          setIsCapturingBaseLocation(false);
        }
      },
      (err) => {
        setIsCapturingBaseLocation(false);
        alert('Could not retrieve browser GPS location: ' + err.message + '. Please ensure location permission is allowed.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleOpenAddLocation = () => {
    setEditingLocationIndex(null);
    setLocationForm({
      name: '',
      distanceKm: '',
      minOrderAmount: deliveryRadiusForm.defaultMinOrderAmount || 149,
      isDeliverable: true
    });
    setIsLocationModalOpen(true);
  };

  const handleOpenEditLocation = (loc, index) => {
    setEditingLocationIndex(index);
    setLocationForm({
      name: loc.name,
      distanceKm: loc.distanceKm,
      minOrderAmount: loc.minOrderAmount ?? (deliveryRadiusForm.defaultMinOrderAmount || 149),
      isDeliverable: loc.isDeliverable !== false
    });
    setIsLocationModalOpen(true);
  };

  const handleSaveLocationForm = async (e) => {
    e.preventDefault();
    if (!locationForm.name.trim()) {
      alert('Location name is required');
      return;
    }
    const dist = parseFloat(locationForm.distanceKm);
    if (isNaN(dist) || dist < 0) {
      alert('Valid distance in km is required');
      return;
    }

    const updatedLocations = [...(deliveryRadiusForm.locations || [])];
    const newLocObj = {
      name: locationForm.name.trim(),
      distanceKm: dist,
      minOrderAmount: Number(locationForm.minOrderAmount) || deliveryRadiusForm.defaultMinOrderAmount || 149,
      isDeliverable: locationForm.isDeliverable
    };

    if (editingLocationIndex !== null && editingLocationIndex >= 0) {
      updatedLocations[editingLocationIndex] = newLocObj;
    } else {
      updatedLocations.push(newLocObj);
    }

    setDeliveryRadiusForm((prev) => ({
      ...prev,
      locations: updatedLocations
    }));

    setIsLocationModalOpen(false);
    await handleSaveDeliverySettings(updatedLocations);
  };

  const handleDeleteLocation = async (index, name) => {
    if (!window.confirm(`Delete location "${name}" from delivery list?`)) return;
    const updated = (deliveryRadiusForm.locations || []).filter((_, i) => i !== index);
    setDeliveryRadiusForm((prev) => ({ ...prev, locations: updated }));
    await handleSaveDeliverySettings(updated);
  };

  const handleToggleLocationDeliverable = async (index) => {
    const updated = [...(deliveryRadiusForm.locations || [])];
    updated[index] = {
      ...updated[index],
      isDeliverable: !updated[index].isDeliverable
    };
    setDeliveryRadiusForm((prev) => ({ ...prev, locations: updated }));
    await handleSaveDeliverySettings(updated);
  };

  // Filtered orders list (100% crash-proof & null-safe)
  const filteredOrders = (orders || []).filter((o) => {
    if (!o) return false;
    const matchesStatus =
      orderStatusFilter === 'All' || o.status === orderStatusFilter;
    const term = (orderSearch || '').toLowerCase().trim();
    const orderIdStr = String(o._id || '').toLowerCase();
    const userPhoneStr = String(o.user?.phone || '');
    const deliveryPhoneStr = String(o.deliveryPhone || '');
    const userNameStr = String(o.user?.name || '').toLowerCase();
    const txnIdStr = String(o.paymentDetails?.transactionId || '').toLowerCase();
    
    const matchesSearch =
      !term ||
      orderIdStr.includes(term) ||
      userPhoneStr.includes(term) ||
      deliveryPhoneStr.includes(term) ||
      userNameStr.includes(term) ||
      txnIdStr.includes(term);

    let matchesPayment = true;
    if (orderPaymentFilter === 'Paid') {
      matchesPayment = o.paymentStatus === 'paid';
    } else if (orderPaymentFilter === 'Pending') {
      matchesPayment = o.paymentStatus === 'pending';
    } else if (orderPaymentFilter === 'COD') {
      matchesPayment = o.paymentMethod === 'cod';
    } else if (orderPaymentFilter === 'UPI') {
      matchesPayment = o.paymentMethod === 'upi';
    } else if (orderPaymentFilter === 'Razorpay') {
      matchesPayment = o.paymentMethod === 'razorpay' || o.paymentMethod === 'online';
    }

    return matchesStatus && matchesSearch && matchesPayment;
  });

  // Filtered products list
  const filteredProducts = (products || []).filter((p) => {
    if (!p) return false;
    if (menuCategory === 'All') return true;
    return p.category === menuCategory;
  });

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070b14] text-slate-100 flex flex-col md:flex-row select-none">
      {/* ========================================================= */}
      {/* SIDEBAR NAVIGATION                                       */}
      {/* ========================================================= */}
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center font-black">
            🍕
          </div>
          <span className="font-black text-sm tracking-tight">Apurva Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Responsive Fixed / Sticky Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen inset-y-0 left-0 z-40 w-64 shrink-0 bg-slate-900/95 border-r border-slate-800 backdrop-blur-xl flex flex-col justify-between p-5 overflow-y-auto transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 pb-6 border-b border-slate-800 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-black text-sm text-white tracking-tight">
                Apurva Pizza Hub
              </h2>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setActiveTab('overview');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Sales & Analytics</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('menu');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'menu'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Menu & Combos</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {products.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('orders');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'orders'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Orders Management</span>
              {pendingCount > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('delivery');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'delivery'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Delivery & Distance</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {deliveryRadiusForm.locations?.length || 0}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('users');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users & Staff</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {usersList.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('reviews');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'reviews'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Reviews & Ratings</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {allReviews.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('inquiries');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'inquiries'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Customer Inquiries</span>
              {contactMessages.filter((m) => (m.status || '').toLowerCase() === 'pending').length > 0 ? (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black">
                  {contactMessages.filter((m) => (m.status || '').toLowerCase() === 'pending').length}
                </span>
              ) : (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {contactMessages.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('coupons');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'coupons'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Coupons & Promos</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {coupons.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('payments');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'payments'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Payment Controls</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                {paymentSettings.onlineGatewayEnabled ? 'Gateway' : 'UPI/COD'}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('policies');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'policies'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Policies & Compliance</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
                Razorpay
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('features');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'features'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Feature Automation</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                {featureSettings?.customerWallet?.enabled ? 'Wallet ON' : '4 Tools'}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('inventory');
                setSidebarOpen(false);
                fetchInventory();
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Raw Inventory (BOM)</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {inventoryItems.length || 14}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('cod');
                setSidebarOpen(false);
                fetchCodReconciliation();
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cod'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Rider COD Settlement</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                Cash
              </span>
            </button>
          </nav>

          {/* Quick Switch to KDS */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={() => navigate('/kitchen')}
              className="w-full py-3 px-3.5 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/50 hover:to-indigo-600/50 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-black flex items-center justify-between transition-all"
            >
              <div className="flex items-center space-x-2">
                <ChefHat className="w-4 h-4 text-blue-400" />
                <span>Open Kitchen KDS</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <div className="text-xs font-bold text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">{user?.role}</div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setIsSecurityModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/50 text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN VIEWPORT                                             */}
      {/* ========================================================= */}
      <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white capitalize">
              {activeTab === 'overview' && 'Business Analytics & Daily Sales'}
              {activeTab === 'menu' && 'Menu & Combos Catalog'}
              {activeTab === 'orders' && 'Real-Time Order Expediter'}
              {activeTab === 'delivery' && 'Delivery Radius & Location Settings'}
              {activeTab === 'users' && 'Customers & Marketing Leads'}
              {activeTab === 'reviews' && 'Customer Reviews & Star Ratings'}
              {activeTab === 'inquiries' && 'Customer Inquiries & Helpdesk'}
              {activeTab === 'coupons' && 'Coupons & Promo Codes Management'}
              {activeTab === 'payments' && 'Payment Controls & Gateway Master'}
              {activeTab === 'policies' && 'Legal Policies & Razorpay Compliance CMS'}
              {activeTab === 'features' && 'Store Automation & Feature Controls'}
              {activeTab === 'inventory' && 'Raw Inventory & Recipe Bill-of-Materials (BOM)'}
              {activeTab === 'cod' && 'Rider Cash-on-Delivery Handover & Settlement'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'inventory'
                ? 'Recipe-level auto-deductions upon kitchen preparation, real-time dough and cheese stock levels, and supplier restock logs'
                : activeTab === 'cod'
                ? 'Reconciliation ledger tracking physical cash collected per rider with instant shift settlement receipts'
                : activeTab === 'delivery'
                ? 'Configure Order Fulfillment (Dine-In, Delivery, Takeaway), Table numbering system, Split Pizza, and delivery radius'
                : activeTab === 'users'
                ? 'Customer profiles with privacy-masked phone numbers and staff account credentials'
                : activeTab === 'reviews'
                ? 'Manage customer product reviews, ratings, photos, and publish official store replies'
                : activeTab === 'inquiries'
                ? 'Review customer Contact Us messages, support inquiries, and staff resolution notes'
                : activeTab === 'coupons'
                ? 'Create, manage, and toggle promotional coupons and festive discount codes'
                : activeTab === 'payments'
                ? 'Configure Cash-on-Delivery, Pay at Counter, and Razorpay UPI & Cards Gateway'
                : activeTab === 'policies'
                ? 'Manage store contact info, Refund & Cancellation terms, Shipping policy, Terms & Conditions, and Privacy Policy for Razorpay verification'
                : activeTab === 'features'
                ? 'Master controls for Customer Wallet & Cashback, Delivery Handover PIN (OTP), Kitchen Silent Printing, and WhatsApp/SMS Alerts'
                : 'Live automated updates from Pathardewa, Deoria Cloud POS'}
            </p>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Table QR Tent Cards Generator Button */}
            <button
              onClick={() => setIsTableQrModalOpen(true)}
              title="Generate & Print Dine-In Table QR Tent Cards"
              className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Table QRs</span>
            </button>

            {/* Export Accounting CSV Button */}
            <button
              onClick={handleExportAccountingCSV}
              title="Download Full Accounting Orders Ledger as CSV"
              className="py-2.5 px-3 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={fetchData}
              title="Refresh Data"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center space-x-2 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Live Store Status Indicator & Toggle Pill */}
            <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-2xl">
              <button
                onClick={() => setIsShopStatusModalOpen(true)}
                title="Configure Operating Hours & Auto/Manual Shop Settings"
                className={`py-1.5 px-3 rounded-xl border text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
                  shopStatus.isOpen
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-red-950/70 border-red-500/50 text-red-300 hover:bg-red-900/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${shopStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                <span>{shopStatus.isOpen ? 'STORE OPEN' : 'STORE CLOSED'}</span>
                <span className="text-[10px] opacity-75 font-mono uppercase hidden sm:inline">
                  [{shopStatus.openMode}]
                </span>
              </button>

              <button
                onClick={handleQuickToggleShopOpen}
                disabled={isSubmittingShopStatus}
                title={shopStatus.isOpen ? "Click to Force Close Store" : "Click to Force Open Store"}
                className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  shopStatus.isOpen
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {shopStatus.isOpen ? (
                  <ToggleRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-red-400" />
                )}
              </button>
            </div>

            <button
              onClick={() => setIsSecurityModalOpen(true)}
              title="Security & Password"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Security</span>
            </button>

            {activeTab === 'menu' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenCreateProduct}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-orange-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Menu Item</span>
              </motion.button>
            )}

            {activeTab === 'delivery' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenAddLocation}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-orange-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Delivery Area</span>
              </motion.button>
            )}

            {activeTab === 'coupons' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setCouponForm({
                    code: '',
                    description: '',
                    discountType: 'percentage',
                    discountValue: '',
                    minOrderAmount: '',
                    maxDiscount: '',
                    expiryDate: ''
                  });
                  setCouponError('');
                  setIsCouponModalOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Coupon</span>
              </motion.button>
            )}

            {activeTab === 'users' && (
              <div className="flex items-center space-x-2">
                <div className="py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-1.5 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Customer Phone PII Masked</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportLeadsCSV}
                  className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                  title="Download CSV spreadsheet of all registered customer leads"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & SALES METRICS                               */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Today's Revenue */}
              <motion.div
                variants={cardItemVariants}
                className="glass-panel p-5 rounded-2xl border border-orange-500/30 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Today's Revenue
                  </span>
                  <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">₹{todayRevenue.toFixed(2)}</div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{todayOrders.length} orders placed today</span>
                </div>
              </motion.div>

              {/* Metric 2: Active / Cooking */}
              <motion.div
                variants={cardItemVariants}
                className="glass-panel p-5 rounded-2xl border border-blue-500/30 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    In Kitchen / Cooking
                  </span>
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <ChefHat className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{preparingCount + pendingCount}</div>
                <div className="text-[11px] text-amber-400 font-semibold mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{pendingCount} pending acceptance</span>
                </div>
              </motion.div>

              {/* Metric 3: Ready & Dispatched */}
              <motion.div
                variants={cardItemVariants}
                className="glass-panel p-5 rounded-2xl border border-emerald-500/30 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Ready & Completed
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{readyCount + deliveredCount}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">
                  {readyCount} waiting pickup • {deliveredCount} delivered
                </div>
              </motion.div>

              {/* Metric 4: Average Order Value */}
              <motion.div
                variants={cardItemVariants}
                className="glass-panel p-5 rounded-2xl border border-slate-700 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Average Order Value
                  </span>
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                    <Tag className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">₹{avgOrderValue.toFixed(2)}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">
                  Across all active orders
                </div>
              </motion.div>
            </div>

            {/* ========================================================= */}
            {/* COMPREHENSIVE SALES ANALYTICS (EVERYDAY, WEEKLY, YEARLY)  */}
            {/* ========================================================= */}
            <motion.div
              variants={cardItemVariants}
              className="glass-panel rounded-2xl p-6 border border-orange-500/20 bg-slate-900/90 shadow-xl space-y-6"
            >
              {/* Header & Mode Switcher */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-white text-base tracking-tight">
                      Sales & Revenue Intelligence
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Track everyday sales, weekly trends, and annual performance
                  </p>
                </div>

                {/* Timeframe Pill Switcher */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setAnalyticsTimeframe('everyday')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      analyticsTimeframe === 'everyday'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Everyday Sale</span>
                  </button>

                  <button
                    onClick={() => setAnalyticsTimeframe('weekly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      analyticsTimeframe === 'weekly'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Weekly Sale</span>
                  </button>

                  <button
                    onClick={() => setAnalyticsTimeframe('yearly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      analyticsTimeframe === 'yearly'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Yearly Sale</span>
                  </button>
                </div>
              </div>

              {/* TIMEFRAME 1: EVERYDAY SALE */}
              {analyticsTimeframe === 'everyday' && (
                <div className="space-y-6">
                  {/* KPI Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Today's Total Sale</div>
                      <div className="text-xl font-black text-white mt-1">
                        ₹{(salesAnalytics?.everyday?.todayRevenue ?? todayRevenue).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-orange-400 mt-0.5">
                        {salesAnalytics?.everyday?.todayOrdersCount ?? todayOrders.length} orders fulfilled today
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Yesterday's Total Sale</div>
                      <div className="text-xl font-black text-slate-300 mt-1">
                        ₹{(salesAnalytics?.everyday?.yesterdayRevenue ?? 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {salesAnalytics?.everyday?.yesterdayOrdersCount ?? 0} orders fulfilled
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Day-over-Day Comparison</div>
                      {(() => {
                        const tRev = salesAnalytics?.everyday?.todayRevenue ?? todayRevenue;
                        const yRev = salesAnalytics?.everyday?.yesterdayRevenue ?? 0;
                        const diff = tRev - yRev;
                        const isUp = diff >= 0;
                        const pct = yRev > 0 ? Math.round((Math.abs(diff) / yRev) * 100) : (tRev > 0 ? 100 : 0);
                        return (
                          <div>
                            <div className={`text-xl font-black mt-1 flex items-center gap-1 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isUp ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                              <span>{isUp ? `+₹${diff.toFixed(2)}` : `-₹${Math.abs(diff).toFixed(2)}`}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {isUp ? `+${pct}% higher than yesterday` : `-${pct}% compared to yesterday`}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 30-Day Daily Chart */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Last 30 Days Daily Sales Performance
                      </h4>
                      <span className="text-[10px] text-slate-400">Scroll horizontally on mobile</span>
                    </div>

                    <div className="overflow-x-auto pb-2">
                      <div className="min-w-[700px] flex items-end justify-between gap-2 h-44 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                        {(() => {
                          const daily = salesAnalytics?.everyday?.dailyData || [];
                          const maxRev = Math.max(...daily.map((d) => d.revenue), 1000);
                          return daily.map((d, idx) => {
                            const heightPct = Math.max(8, Math.round((d.revenue / maxRev) * 100));
                            return (
                              <div
                                key={idx}
                                className="flex-1 flex flex-col items-center justify-end group relative cursor-pointer"
                              >
                                {/* Tooltip */}
                                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-orange-500/40 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                  <div className="font-bold">{d.label}</div>
                                  <div className="text-orange-400">₹{d.revenue} ({d.orderCount} orders)</div>
                                </div>

                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-full rounded-t-md transition-all ${
                                    d.revenue > 0
                                      ? 'bg-gradient-to-t from-orange-600 to-amber-400 group-hover:from-orange-500 group-hover:to-amber-300 shadow-md shadow-orange-500/20'
                                      : 'bg-slate-800'
                                  }`}
                                />
                                <span className="text-[9px] text-slate-500 mt-2 truncate w-full text-center">
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

              {/* TIMEFRAME 2: WEEKLY SALE */}
              {analyticsTimeframe === 'weekly' && (
                <div className="space-y-6">
                  {/* KPI Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">This Week's Revenue</div>
                      <div className="text-xl font-black text-white mt-1">
                        ₹{(salesAnalytics?.weekly?.thisWeekRevenue ?? 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-orange-400 mt-0.5">
                        {salesAnalytics?.weekly?.thisWeekOrdersCount ?? 0} orders this week
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Daily Average (This Week)</div>
                      <div className="text-xl font-black text-slate-300 mt-1">
                        ₹{Math.round((salesAnalytics?.weekly?.thisWeekRevenue ?? 0) / 7).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Average revenue per day
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Weeks Monitored</div>
                      <div className="text-xl font-black text-emerald-400 mt-1">
                        {salesAnalytics?.weekly?.weeklyData?.length || 8} Weeks Trend
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Historical trend available
                      </div>
                    </div>
                  </div>

                  {/* Day-of-Week Distribution (Mon to Sun) */}
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                      Day-of-Week Sales Distribution (Peak Pizza Days)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                      {(() => {
                        const dayWise = salesAnalytics?.weekly?.dayWiseData || [];
                        const maxDayRev = Math.max(...dayWise.map((d) => d.revenue), 100);
                        return dayWise.map((day, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-orange-400">{day.day}</span>
                              <span className="text-[10px] text-slate-500">{day.orderCount} orders</span>
                            </div>
                            <div className="text-sm font-black text-white mt-2">₹{day.revenue}</div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div
                                style={{ width: `${Math.round((day.revenue / maxDayRev) * 100)}%` }}
                                className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full"
                              />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* 8-Week Trend Breakdown */}
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                      8-Week Historical Performance
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const weeks = salesAnalytics?.weekly?.weeklyData || [];
                        const maxWeekRev = Math.max(...weeks.map((w) => w.revenue), 500);
                        return weeks.map((w, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4"
                          >
                            <div className="w-36 sm:w-48 text-xs font-semibold text-slate-300 truncate">
                              {w.weekLabel}
                            </div>
                            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden hidden sm:block">
                              <div
                                style={{ width: `${Math.round((w.revenue / maxWeekRev) * 100)}%` }}
                                className="bg-orange-500 h-full rounded-full"
                              />
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-white text-xs">₹{w.revenue}</span>
                              <span className="text-[10px] text-slate-500 ml-2">({w.orderCount} orders)</span>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* TIMEFRAME 3: YEARLY SALE */}
              {analyticsTimeframe === 'yearly' && (
                <div className="space-y-6">
                  {/* KPI Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">
                        Year {salesAnalytics?.yearly?.year || new Date().getFullYear()} Total Revenue
                      </div>
                      <div className="text-xl font-black text-white mt-1">
                        ₹{(salesAnalytics?.yearly?.thisYearRevenue ?? 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-orange-400 mt-0.5">
                        {salesAnalytics?.yearly?.thisYearOrdersCount ?? 0} annual orders
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Monthly Average</div>
                      <div className="text-xl font-black text-slate-300 mt-1">
                        ₹{Math.round((salesAnalytics?.yearly?.thisYearRevenue ?? 0) / (new Date().getMonth() + 1)).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Average revenue per month
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Average Order Value</div>
                      <div className="text-xl font-black text-emerald-400 mt-1">
                        ₹{salesAnalytics?.summary?.avgOrderValue ?? avgOrderValue.toFixed(0)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Across all recorded transactions
                      </div>
                    </div>
                  </div>

                  {/* 12-Month Bar Chart */}
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                      12 Months Revenue Breakdown ({salesAnalytics?.yearly?.year || new Date().getFullYear()})
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                      {(() => {
                        const months = salesAnalytics?.yearly?.monthlyData || [];
                        const maxMonthRev = Math.max(...months.map((m) => m.revenue), 1000);
                        return months.map((m, idx) => {
                          const heightPct = Math.max(10, Math.round((m.revenue / maxMonthRev) * 100));
                          return (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center justify-between h-36"
                            >
                              <span className="text-[11px] font-bold text-orange-400">{m.month}</span>
                              <div className="w-full flex-1 flex items-end justify-center my-2">
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-4/5 rounded-t-md transition-all ${
                                    m.revenue > 0 ? 'bg-gradient-to-t from-orange-600 to-amber-400 shadow-md' : 'bg-slate-800/80'
                                  }`}
                                />
                              </div>
                              <div className="text-center w-full">
                                <div className="text-[10px] font-bold text-white truncate">₹{m.revenue}</div>
                                <div className="text-[9px] text-slate-500">{m.orderCount} ord</div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* TOP 10 SELLING PRODUCTS LEADERBOARD */}
              {salesAnalytics?.topSellingItems && salesAnalytics.topSellingItems.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center space-x-2 mb-3">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Top 10 Selling Products
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {salesAnalytics.topSellingItems.map((prod, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                              idx === 0
                                ? 'bg-amber-500 text-slate-950'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950'
                                : idx === 2
                                ? 'bg-orange-700 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{prod.name}</div>
                            <div className="text-[10px] text-slate-400">{prod.quantity} units sold</div>
                          </div>
                        </div>
                        <div className="text-xs font-black text-amber-400 shrink-0 ml-2">
                          ₹{prod.totalRevenue}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Recent Orders Overview */}
            <motion.div variants={cardItemVariants} className="glass-panel rounded-2xl p-6 border border-slate-800">

              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="font-bold text-white text-base">Recent Live Orders</h3>
                  <p className="text-xs text-slate-400">Real-time status updates</p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center space-x-1"
                >
                  <span>View All Orders</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Order #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {orders.slice(0, 6).map((order) => (
                      <tr key={order._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          #{order._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{order.user?.name || 'Walk-in'}</div>
                          <div className="text-[10px] text-orange-400 font-mono font-medium">📞 {order.deliveryPhone || order.user?.phone || 'N/A'}</div>
                          {order.deliveryOtp && (
                            <div className="mt-0.5">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${
                                order.otpVerifiedAt
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}>
                                <Lock className="w-2 h-2" />
                                <span>PIN: {order.deliveryOtp}</span>
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          ₹{Number(order.totalAmount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              order.status === 'Pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : order.status === 'Preparing'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : order.status === 'Ready'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedPrintOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Print 80mm Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: MENU & COMBOS MANAGEMENT                               */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setMenuCategory('All')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  menuCategory === 'All'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                All Categories ({products.length})
              </button>
              {CATEGORIES.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setMenuCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      menuCategory === cat
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Hidden File Input for Direct Card Photo Upload */}
            <input
              type="file"
              ref={cardFileInputRef}
              accept="image/*"
              onChange={handleDirectCardImageUpload}
              className="hidden"
            />

            {/* Menu Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((prod) => (
                <div
                  key={prod._id}
                  className="glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Item Image with Direct 1-Click Upload Overlay */}
                    <div className="h-44 w-full relative overflow-hidden bg-slate-800 group/cardimg">
                      <img
                        src={getImageUrl(prod.imageURL)}
                        alt={prod.name}
                        className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${
                          !prod.isAvailable ? 'grayscale opacity-50' : ''
                        }`}
                        onError={(e) => {
                          e.target.src =
                            'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute top-3 left-3 z-10">
                        <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-orange-300 border border-white/10 uppercase tracking-wider">
                          {prod.category}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 z-10">
                        {(!prod.isAvailable || (prod.stockQuantity !== null && prod.stockQuantity !== undefined && prod.stockQuantity <= 0)) ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md border bg-red-950/90 text-red-300 border-red-500/60 shadow-lg flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                            <span>OUT OF STOCK (0 left)</span>
                          </span>
                        ) : prod.stockQuantity !== null && prod.stockQuantity !== undefined && prod.stockQuantity <= 5 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md border bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-lg flex items-center space-x-1">
                            <span>🔥 ONLY {prod.stockQuantity} LEFT</span>
                          </span>
                        ) : prod.stockQuantity !== null && prod.stockQuantity !== undefined ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md border bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm">
                            📦 {prod.stockQuantity} IN STOCK
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md border bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm">
                            ⚡ IN STOCK (Unlimited)
                          </span>
                        )}
                      </div>

                      {/* Direct Local Image Upload Overlay */}
                      <div
                        className={`absolute inset-0 bg-black/65 backdrop-blur-[2px] transition-opacity flex flex-col items-center justify-center p-3 text-center ${
                          uploadingCardId === prod._id
                            ? 'opacity-100 z-20'
                            : 'opacity-0 group-hover/cardimg:opacity-100 z-10'
                        }`}
                      >
                        {uploadingCardId === prod._id ? (
                          <div className="flex flex-col items-center space-y-1.5 text-white">
                            <RefreshCw className="w-6 h-6 animate-spin text-orange-400" />
                            <span className="text-xs font-bold text-orange-300">Updating photo...</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetProductForCardUpload(prod._id);
                              cardFileInputRef.current?.click();
                            }}
                            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-orange-500/30 transition-all cursor-pointer border border-orange-400/40"
                            title="Directly click and upload product photo from device / gallery"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Change Photo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-white text-base leading-tight">
                          {prod.name}
                        </h4>
                        {prod.dietary && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                            {prod.dietary}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {prod.description || 'Delicious freshly prepared specialty from Apurva Pizza Hub.'}
                      </p>

                      {/* Pricing & Ratings */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-lg font-black text-white">
                            ₹{prod.discountedPrice || prod.basePrice}
                          </span>
                          {prod.discountedPrice && (
                            <span className="text-xs text-slate-500 line-through">
                              ₹{prod.basePrice}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-amber-400 text-xs font-bold bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{prod.averageRating ? prod.averageRating.toFixed(1) : '4.9'}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({prod.totalReviews || prod.reviews?.length || 0})
                          </span>
                        </div>
                      </div>

                      {/* Highlights Chips */}
                      {prod.highlights && prod.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {prod.highlights.slice(0, 3).map((h, hIdx) => (
                            <span
                              key={hIdx}
                              className="px-1.5 py-0.5 rounded-md bg-orange-500/10 text-[10px] text-orange-300 font-medium border border-orange-500/20 flex items-center space-x-1"
                            >
                              <span>{h.icon || '✨'}</span>
                              <span className="truncate max-w-[120px]">{h.title}</span>
                            </span>
                          ))}
                          {prod.highlights.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-400">
                              +{prod.highlights.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Sizes badges */}
                      {prod.sizes && prod.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {prod.sizes.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-semibold border border-slate-700"
                            >
                              {s.size}: ₹{s.discountedPrice || s.price}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Quick Stock & Inventory Manager */}
                  <div className="mx-4 mb-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <Package className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="text-[11px] text-slate-400 font-semibold">Stock:</span>
                        <span
                          className={`text-xs font-black truncate ${
                            !prod.isAvailable || (prod.stockQuantity !== null && prod.stockQuantity <= 0)
                              ? 'text-red-400'
                              : prod.stockQuantity !== null && prod.stockQuantity <= 5
                              ? 'text-amber-400'
                              : prod.stockQuantity !== null
                              ? 'text-emerald-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {prod.stockQuantity !== null && prod.stockQuantity !== undefined
                            ? `${prod.stockQuantity} units`
                            : 'Unlimited'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {prod.stockQuantity !== null && prod.stockQuantity !== undefined ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickStockDelta(prod, -1)}
                              disabled={prod.stockQuantity <= 0}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-black text-xs flex items-center justify-center transition-all cursor-pointer border border-slate-700"
                              title="Decrease stock by 1"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStockDelta(prod, 1)}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center transition-all cursor-pointer border border-slate-700"
                              title="Increase stock by 1"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptSetStock(prod)}
                              className="px-2 py-0.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 font-bold text-[10px] border border-orange-500/30 transition-all cursor-pointer"
                              title="Set exact stock count"
                            >
                              Set
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePromptSetStock(prod)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] border border-slate-700 transition-all cursor-pointer flex items-center space-x-1"
                            title="Set a stock limit for this product"
                          >
                            <span>Set Limit</span>
                          </button>
                        )}
                      </div>
                    </div>

                  {/* Actions Footer */}
                  <div className="p-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleProductAvailability(prod)}
                      className={`text-[11px] font-bold flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                        prod.isAvailable
                          ? 'text-emerald-400 hover:bg-emerald-950/30'
                          : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {prod.isAvailable ? (
                        <ToggleRight className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-500" />
                      )}
                      <span>{prod.isAvailable ? 'Enabled' : 'Disabled'}</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedProductDetails(prod)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white transition-colors"
                        title="View Complete Product Details & Customer Reviews"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditProduct(prod)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Edit Complete Item Specifications"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod._id, prod.name)}
                        className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: ORDERS MANAGEMENT                                      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
                {['All', 'Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setOrderStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      orderStatusFilter === status
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Filters & Search */}
              <div className="flex items-center space-x-2">
                <select
                  value={orderPaymentFilter}
                  onChange={(e) => setOrderPaymentFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs font-semibold focus:outline-none focus:border-orange-500"
                >
                  <option value="All">All Payments</option>
                  <option value="Paid">✓ Paid Only</option>
                  <option value="Pending">⏳ Pending / Unpaid</option>
                  <option value="COD">💵 Cash On Delivery</option>
                  <option value="UPI">📱 Direct UPI QR</option>
                  <option value="Razorpay">⚡ Online Gateway</option>
                </select>

                {/* Search box */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, name, phone..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Order ID</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Items Summary</th>
                      <th className="py-3.5 px-4">Total (₹)</th>
                      <th className="py-3.5 px-4">Payment & Verification</th>
                      <th className="py-3.5 px-4">Status & Progression</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {(filteredOrders || []).map((order) => {
                      if (!order) return null;
                      const orderIdStr = String(order._id || '');
                      const shortOrderId = orderIdStr ? orderIdStr.slice(-6).toUpperCase() : 'N/A';
                      const createdDate = order.createdAt ? new Date(order.createdAt) : null;
                      const itemsList = Array.isArray(order.items) ? order.items : [];
                      const customerName = order.user?.name || 'Walk-in';
                      const rawCallingPhone = order.deliveryPhone ? String(order.deliveryPhone).trim() : '';
                      const maskedCallingPhone = rawCallingPhone
                        ? (rawCallingPhone.length >= 4
                            ? `${rawCallingPhone.slice(0, 2)}••••••${rawCallingPhone.slice(-2)}`
                            : '••••••••••')
                        : null;
                      const totalFormatted = Number(order.totalAmount || 0).toFixed(2);
                      const isPaid = order.paymentStatus === 'paid';
                      const currentStatus = order.status || 'Pending';

                      return (
                        <tr key={orderIdStr || Math.random()} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            #{shortOrderId}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-400">
                            {createdDate ? createdDate.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short'
                            }) : 'N/A'}{' '}
                            {createdDate ? createdDate.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{customerName}</div>
                            {maskedCallingPhone ? (
                              <div className="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1">
                                <span>📞</span>
                                <span>{maskedCallingPhone}</span>
                                <span className="text-[9px] text-slate-500 font-sans">(Protected)</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 font-mono">📞 Not Provided</div>
                            )}
                            {order.deliveryOtp && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                  order.otpVerifiedAt
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                }`}>
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>PIN: {order.deliveryOtp}</span>
                                  {order.otpVerifiedAt && <span className="ml-0.5 text-emerald-400">✓</span>}
                                </span>
                              </div>
                            )}
                            {order.rider?.name && (
                              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[9px] font-semibold">
                                <Truck className="w-2.5 h-2.5 text-blue-400" />
                                <span>{order.rider.name}</span>
                              </div>
                            )}
                            {order.customerCoords?.latitude != null && order.customerCoords?.longitude != null && (
                              <div className="mt-1">
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${order.customerCoords.latitude},${order.customerCoords.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono transition-colors"
                                  title="Open Turn-by-Turn Navigation in Google Maps"
                                >
                                  <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>{Number(order.customerCoords.latitude).toFixed(4)}, {Number(order.customerCoords.longitude).toFixed(4)} ↗</span>
                                </a>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate">
                            {itemsList.length > 0
                              ? itemsList.map((i) => `${i.quantity || 1}x ${i.name || i.product?.name || 'Item'}`).join(', ')
                              : 'No items listed'}
                          </td>
                          <td className="py-3.5 px-4 font-black text-white text-sm">
                            ₹{totalFormatted}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isPaid
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {isPaid ? 'PAID' : 'PENDING'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                  {order.paymentMethod || 'COD'}
                                </span>
                              </div>
                              {!isPaid && currentStatus !== 'Cancelled' && (
                                <button
                                  onClick={() => handleMarkOrderPaid(order._id)}
                                  className="mt-1 px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[9px] font-bold transition-all w-fit cursor-pointer"
                                  title="Confirm and mark this order as Paid"
                                >
                                  ✓ Mark Paid
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={currentStatus}
                              onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                              className={`border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none ${
                                currentStatus === 'Cancelled'
                                  ? 'bg-red-950/70 border-red-500/40 text-red-300'
                                  : 'bg-slate-900 border-slate-700 text-white focus:border-orange-500'
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Preparing">Preparing</option>
                              <option value="Ready">Ready</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {currentStatus !== 'Cancelled' && (
                              <button
                                onClick={() => {
                                  setAdminCancelOrderModal(order);
                                  setAdminCancelReason('Cancelled by Store Admin');
                                }}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-red-600/30 text-slate-300 hover:text-red-400 border border-slate-700/60 transition-colors cursor-pointer"
                                title="Cancel Order"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setAdminDispatchOrder(order);
                                setAdminRiderName(order.rider?.name || '');
                                setAdminRiderPhone(order.rider?.phone || '');
                              }}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700/60 transition-colors"
                              title={order.rider?.name ? "Update Rider" : "Assign Delivery Rider"}
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedPrintOrder(order)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Print 80mm Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setTaxInvoiceOrder(order)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300 border border-slate-700/60 transition-colors cursor-pointer"
                              title="Official GST Tax Invoice"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedOrderDetails(order)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Inspect Order"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredOrders.length === 0 && (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-xs font-bold text-slate-400">No orders match the selected filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: DELIVERY & DISTANCE SETTINGS                           */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            {/* Success notification banner */}
            {deliverySettingsSavedMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{deliverySettingsSavedMsg}</span>
                </div>
              </motion.div>
            )}

            {/* Store Status notification banner */}
            {shopStatusSuccessMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{shopStatusSuccessMsg}</span>
                </div>
              </motion.div>
            )}

            {/* Store Operating Hours & Live Status Hero Card */}
            <div className={`p-6 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
              shopStatus?.isOpen
                ? 'bg-gradient-to-r from-emerald-950/50 via-slate-900/90 to-emerald-950/30 border-emerald-500/40'
                : 'bg-gradient-to-r from-red-950/50 via-slate-900/90 to-red-950/30 border-red-500/40'
            }`}>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-start space-x-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    shopStatus?.isOpen
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-red-500/10'
                  }`}>
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        shopStatus?.isOpen
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-red-500/20 text-red-300 border-red-500/40'
                      }`}>
                        {shopStatus?.isOpen ? '🟢 STORE IS CURRENTLY OPEN' : '🔴 STORE IS CURRENTLY CLOSED'}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">
                        Mode: <strong className="text-white uppercase">{shopStatus?.openMode === 'auto' ? 'Automatic Schedule' : 'Manual Override'}</strong>
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-white mt-1.5">
                      {shopStatus?.openMode === 'auto'
                        ? `Daily Operating Hours: ${shopStatus?.openingTime || '10:00'} – ${shopStatus?.closingTime || '23:00'}`
                        : `Manual Control: Store is ${shopStatus?.isOpen ? 'FORCED OPEN' : 'FORCED CLOSED'}`}
                    </h2>

                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      {shopStatus?.isOpen
                        ? 'Customers can place live orders, pizzas are sent directly to the kitchen KDS, and checkout is fully active.'
                        : (shopStatus?.closedMessage || 'Store is currently closed for live orders.')}
                    </p>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto">
                  <button
                    onClick={handleQuickToggleShopOpen}
                    disabled={isSubmittingShopStatus}
                    className={`px-5 py-3 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      shopStatus?.isOpen
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-500/20 border border-red-400/30'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 border border-emerald-400/30'
                    }`}
                  >
                    {shopStatus?.isOpen ? (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        <span>Emergency Close Store</span>
                      </>
                    ) : (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        <span>Force Open Store Now</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsShopStatusModalOpen(true)}
                    className="px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-orange-400" />
                    <span>Configure Operating Hours</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery Area Limit & Free Delivery Policy Hero Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-amber-950/30 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                        Active Delivery Policy
                      </span>
                      <span className="text-xs text-slate-400 font-bold">Smart Geo-Fencing & Cart Tiering</span>
                    </div>
                    <h2 className="text-xl font-black text-white mt-1">
                      Max Area: {deliveryRadiusForm.maxDeliveryRadiusKm || 15} km • Free Delivery on ₹{deliveryRadiusForm.minPurchaseForFreeDelivery || 400}+
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Delivery area is limited to <strong className="text-orange-400">{deliveryRadiusForm.maxDeliveryRadiusKm || 15} KM</strong> (customers further away will see: <span className="text-red-400 font-semibold">"Sorry, we are not deliverable in your area"</span>). Free Delivery applies within <strong className="text-emerald-400">{deliveryRadiusForm.freeDeliveryRadiusKm || 5} KM</strong> or on orders of <strong className="text-emerald-400">₹{deliveryRadiusForm.minPurchaseForFreeDelivery || 400} and above</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 shrink-0 w-full lg:w-auto">
                  <div className="bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Limit</span>
                    <span className="text-lg font-black text-white mt-0.5 block">
                      {deliveryRadiusForm.maxDeliveryRadiusKm || 15} KM
                    </span>
                    <span className="text-[10px] text-orange-400 font-semibold">Geo-Fenced</span>
                  </div>
                  <div className="bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800/80 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Min for Free Delivery</span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                      ₹{deliveryRadiusForm.minPurchaseForFreeDelivery || 400}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Cart Value</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Fulfillment & Dine-In Table Management Card */}
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-lg">
                    🍽️
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>Order Fulfillment & Dine-In Table System</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Admin Controls
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Enable or disable Dine-In, Takeaway, and Delivery, configure restaurant table numbering, and manage Split Pizza.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveDeliverySettings()}
                  disabled={isSavingDeliverySettings}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-60 cursor-pointer self-start sm:self-auto"
                >
                  {isSavingDeliverySettings ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Fulfillment & Tables</span>
                    </>
                  )}
                </button>
              </div>

              {/* 1. Fulfillment Mode Toggles (Delivery, Dine-In, Takeaway) */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  1. Active Customer Checkout Fulfillment Options
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Delivery Toggle */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    (deliveryRadiusForm.fulfillmentSettings?.allowDelivery ?? true)
                      ? 'bg-slate-950/70 border-orange-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">🛵</span>
                        <span className="text-xs font-extrabold text-white">Doorstep Delivery</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deliveryRadiusForm.fulfillmentSettings?.allowDelivery ?? true}
                          onChange={(e) =>
                            setDeliveryRadiusForm((prev) => ({
                              ...prev,
                              fulfillmentSettings: {
                                ...(prev.fulfillmentSettings || {}),
                                allowDelivery: e.target.checked
                              }
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Rider doorstep dispatch with GPS geofencing & distance calculation.
                    </p>
                    <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (deliveryRadiusForm.fulfillmentSettings?.allowDelivery ?? true)
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {(deliveryRadiusForm.fulfillmentSettings?.allowDelivery ?? true) ? 'Active at Checkout' : 'Paused / Disabled'}
                    </span>
                  </div>

                  {/* Dine-In Toggle */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    (deliveryRadiusForm.fulfillmentSettings?.allowDineIn ?? true)
                      ? 'bg-slate-950/70 border-purple-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">🍽️</span>
                        <span className="text-xs font-extrabold text-white">Dine-In Table Service</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deliveryRadiusForm.fulfillmentSettings?.allowDineIn ?? true}
                          onChange={(e) =>
                            setDeliveryRadiusForm((prev) => ({
                              ...prev,
                              fulfillmentSettings: {
                                ...(prev.fulfillmentSettings || {}),
                                allowDineIn: e.target.checked
                              }
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Customers sitting at restaurant tables choose table number at checkout.
                    </p>
                    <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (deliveryRadiusForm.fulfillmentSettings?.allowDineIn ?? true)
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {(deliveryRadiusForm.fulfillmentSettings?.allowDineIn ?? true) ? 'Active at Checkout' : 'Paused / Disabled'}
                    </span>
                  </div>

                  {/* Takeaway / Parcel Toggle */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    (deliveryRadiusForm.fulfillmentSettings?.allowTakeaway ?? true)
                      ? 'bg-slate-950/70 border-blue-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">🥡</span>
                        <span className="text-xs font-extrabold text-white">Parcel / Takeaway</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deliveryRadiusForm.fulfillmentSettings?.allowTakeaway ?? true}
                          onChange={(e) =>
                            setDeliveryRadiusForm((prev) => ({
                              ...prev,
                              fulfillmentSettings: {
                                ...(prev.fulfillmentSettings || {}),
                                allowTakeaway: e.target.checked
                              }
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Self-pickup parcel orders packed for takeaway at store counter.
                    </p>
                    <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (deliveryRadiusForm.fulfillmentSettings?.allowTakeaway ?? true)
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {(deliveryRadiusForm.fulfillmentSettings?.allowTakeaway ?? true) ? 'Active at Checkout' : 'Paused / Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Restaurant Table Numbering System & Live Preview */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-purple-500/20 space-y-4">
                <div className="flex items-center space-x-2">
                  <Grid className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    2. Dine-In Table Numbering System & Layout
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Total Restaurant Tables (1 to 100)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={deliveryRadiusForm.tableSettings?.tableCount ?? 12}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1));
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          tableSettings: {
                            ...(prev.tableSettings || {}),
                            tableCount: val
                          }
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Defines the number of selectable table pills rendered during customer checkout.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Table Label Prefix
                    </label>
                    <input
                      type="text"
                      value={deliveryRadiusForm.tableSettings?.tablePrefix ?? 'Table '}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          tableSettings: {
                            ...(prev.tableSettings || {}),
                            tablePrefix: e.target.value
                          }
                        }))
                      }
                      placeholder="e.g. Table , T-, Booth , Cabin "
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Label formatted on KOT receipts & tickets (e.g. "Table 1" or "T-1").
                    </p>
                  </div>
                </div>

                {/* Live Visual Preview Grid of Tables */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Live Customer Checkout Table Buttons Preview:
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
                      {parseInt(deliveryRadiusForm?.tableSettings?.tableCount, 10) || 12} Tables Configured
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    {Array.from(
                      { length: Math.min(100, Math.max(1, parseInt(deliveryRadiusForm?.tableSettings?.tableCount, 10) || 12)) },
                      (_, i) => i + 1
                    ).map((tNum) => (
                      <span
                        key={tNum}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                      >
                        {(deliveryRadiusForm?.tableSettings?.tablePrefix ?? 'Table ')}{tNum}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Split Pizza (Half & Half) Kitchen Controls */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-base">
                      🌓
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        3. Custom Split Pizza (Half & Half) Kitchen Controls
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Enable or temporarily pause the interactive Half & Half pizza builder during peak kitchen rush hours.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={deliveryRadiusForm.splitPizzaSettings?.enabled ?? true}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          splitPizzaSettings: {
                            ...(prev.splitPizzaSettings || {}),
                            enabled: e.target.checked
                          }
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    <span className="ml-2 text-xs font-bold text-slate-300">
                      {(deliveryRadiusForm.splitPizzaSettings?.enabled ?? true) ? 'Builder Active' : 'Builder Paused'}
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Customer Pause Notice Message
                  </label>
                  <input
                    type="text"
                    disabled={deliveryRadiusForm.splitPizzaSettings?.enabled ?? true}
                    value={
                      deliveryRadiusForm.splitPizzaSettings?.disabledMessage ??
                      'Custom Split Pizza (Half & Half) is temporarily unavailable during kitchen peak hours.'
                    }
                    onChange={(e) =>
                      setDeliveryRadiusForm((prev) => ({
                        ...prev,
                        splitPizzaSettings: {
                          ...(prev.splitPizzaSettings || {}),
                          disabledMessage: e.target.value
                        }
                      }))
                    }
                    placeholder="e.g. Split Pizza is paused due to heavy oven rush. Please order standard pizzas."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {(deliveryRadiusForm.splitPizzaSettings?.enabled ?? true)
                      ? 'The builder is currently live for customers.'
                      : 'Customers attempting to access Half & Half Builder will see this friendly pause notice.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Global Delivery & Radius Configuration Form Card */}
            <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Delivery Distance Rules</h3>
                    <p className="text-xs text-slate-400">Set distance thresholds, pricing, and origin coordinates</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveDeliverySettings()}
                  disabled={isSavingDeliverySettings}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSavingDeliverySettings ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Delivery Rules</span>
                    </>
                  )}
                </button>
              </div>

              {/* 6 Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Free Delivery Radius */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-2">
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Free Delivery Radius (km)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={deliveryRadiusForm.freeDeliveryRadiusKm}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          freeDeliveryRadiusKm: e.target.value
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      km
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Orders under this distance get 100% Free Delivery (default 5 KM).
                  </p>
                </div>

                {/* 2. Base Delivery Fee */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-orange-500/30 space-y-2">
                  <label className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                    Base Delivery Fee beyond 5km (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={deliveryRadiusForm.baseDeliveryCharge}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          baseDeliveryCharge: e.target.value
                        }))
                      }
                      className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-orange-500/40 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Initial base fee for 5.1–6.0 KM (default ₹20).
                  </p>
                </div>

                {/* 3. Extra Charge per km */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-orange-300 uppercase tracking-wider block">
                    Extra Fee per km beyond base (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={deliveryRadiusForm.extraChargePerKm}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          extraChargePerKm: e.target.value
                        }))
                      }
                      className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Additional charge for each km after 6.0 KM (default ₹10/km).
                  </p>
                </div>

                {/* 4. GPS Accuracy Limit */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Max GPS Accuracy Error (m)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="50"
                      min="10"
                      value={deliveryRadiusForm.accuracyThresholdMeters}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          accuracyThresholdMeters: e.target.value
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      m
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Rejects inaccurate GPS fixes worse than this (default 1000m).
                  </p>
                </div>

                {/* 5. Delivery Area Limit (Interactive Increase / Decrease Controls) */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-orange-500/40 space-y-2.5 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                      Delivery Area Limit (km)
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      Hard Cutoff
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          maxDeliveryRadiusKm: Math.max(1, Number(prev.maxDeliveryRadiusKm || 15) - 1)
                        }))
                      }
                      className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 hover:border-orange-500 text-white font-black text-lg flex items-center justify-center transition-all hover:bg-orange-500/20 active:scale-95"
                      title="Decrease Delivery Area by 1 KM"
                    >
                      −
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={deliveryRadiusForm.maxDeliveryRadiusKm}
                        onChange={(e) =>
                          setDeliveryRadiusForm((prev) => ({
                            ...prev,
                            maxDeliveryRadiusKm: Math.max(1, Number(e.target.value) || 1)
                          }))
                        }
                        className="w-full text-center px-3 py-2 rounded-xl bg-slate-900 border border-orange-500/50 text-base font-black text-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        km
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          maxDeliveryRadiusKm: Number(prev.maxDeliveryRadiusKm || 15) + 1
                        }))
                      }
                      className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 hover:border-orange-500 text-white font-black text-lg flex items-center justify-center transition-all hover:bg-orange-500/20 active:scale-95"
                      title="Increase Delivery Area by 1 KM"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Preset Buttons for Radius */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[5, 8, 10, 15, 20, 25].map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() =>
                          setDeliveryRadiusForm((prev) => ({
                            ...prev,
                            maxDeliveryRadiusKm: km
                          }))
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          Number(deliveryRadiusForm.maxDeliveryRadiusKm) === km
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {km}km
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Customers beyond this radius are blocked: <span className="text-red-400 font-semibold">"Sorry, we are not deliverable in your area"</span>.
                  </p>
                </div>

                {/* 6. Minimum Purchase for Free Delivery */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                      Min Purchase for Free Delivery (₹)
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Reward
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="50"
                      min="0"
                      value={deliveryRadiusForm.minPurchaseForFreeDelivery ?? 400}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          minPurchaseForFreeDelivery: Math.max(0, Number(e.target.value) || 0)
                        }))
                      }
                      className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono"
                    />
                  </div>

                  {/* Quick Preset Buttons for Min Purchase */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[0, 249, 299, 399, 499, 699].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() =>
                          setDeliveryRadiusForm((prev) => ({
                            ...prev,
                            minPurchaseForFreeDelivery: amt
                          }))
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          Number(deliveryRadiusForm.minPurchaseForFreeDelivery) === amt
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {amt === 0 ? 'Off' : `₹${amt}`}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Carts meeting this amount get 100% Free Delivery inside the allowed area.
                  </p>
                </div>

                {/* 7. Default Min Order Amount */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Default Min Order (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={deliveryRadiusForm.defaultMinOrderAmount}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          defaultMinOrderAmount: e.target.value
                        }))
                      }
                      className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Minimum food cart total required before order checkout is permitted.
                  </p>
                </div>

                {/* 8. Platform Fee (Enable/Disable & Editable Charges) */}
                <div className={`p-4 rounded-2xl border transition-all space-y-3 sm:col-span-2 lg:col-span-1 ${
                  deliveryRadiusForm.isPlatformFeeEnabled
                    ? 'bg-slate-950/90 border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-75'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Platform Fee Option</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          isPlatformFeeEnabled: !prev.isPlatformFeeEnabled
                        }))
                      }
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                        deliveryRadiusForm.isPlatformFeeEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${deliveryRadiusForm.isPlatformFeeEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>{deliveryRadiusForm.isPlatformFeeEnabled ? 'ENABLED' : 'DISABLED'}</span>
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Charge per Order (Editable):</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        disabled={!deliveryRadiusForm.isPlatformFeeEnabled}
                        value={deliveryRadiusForm.platformFee ?? 5}
                        onChange={(e) =>
                          setDeliveryRadiusForm((prev) => ({
                            ...prev,
                            platformFee: Math.max(0, Number(e.target.value) || 0)
                          }))
                        }
                        className={`w-full pl-7 pr-3.5 py-2.5 rounded-xl border text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono transition-all ${
                          deliveryRadiusForm.isPlatformFeeEnabled
                            ? 'bg-slate-900 border-indigo-500/40'
                            : 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons for Platform Fee */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">Quick Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[0, 2, 3, 5, 7, 10, 15, 20].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          disabled={!deliveryRadiusForm.isPlatformFeeEnabled}
                          onClick={() =>
                            setDeliveryRadiusForm((prev) => ({
                              ...prev,
                              platformFee: amt
                            }))
                          }
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                            !deliveryRadiusForm.isPlatformFeeEnabled
                              ? 'opacity-40 cursor-not-allowed bg-slate-900 text-slate-500 border border-slate-800'
                              : Number(deliveryRadiusForm.platformFee) === amt
                              ? 'bg-indigo-500 text-white shadow-sm ring-1 ring-white/20'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 gap-2">
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {deliveryRadiusForm.isPlatformFeeEnabled
                        ? `Adds ₹${deliveryRadiusForm.platformFee ?? 5} platform fee per order to customer checkout.`
                        : 'Platform fee is currently disabled (customers pay ₹0 platform fee).'}
                    </p>
                    <button
                      type="button"
                      disabled={isSavingPlatformFee}
                      onClick={handleSavePlatformFeeOnly}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shrink-0 transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSavingPlatformFee ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Save Fee</span>
                    </button>
                  </div>

                  {platformFeeSavedMsg && (
                    <div className="text-[10px] text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-center shadow-sm">
                      {platformFeeSavedMsg}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Cancellation Rules & Policy Card (Admin Controlled) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/90 border border-slate-800 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>Customer Order Cancellation Policy</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Admin Control
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Set whether customers are allowed to cancel orders and configure until which preparation stage cancellations are permitted.
                      </p>
                    </div>
                  </div>

                  {/* Toggle On/Off */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={deliveryRadiusForm.cancellationSettings?.isCancellationAllowed ?? true}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          cancellationSettings: {
                            ...(prev.cancellationSettings || {}),
                            isCancellationAllowed: e.target.checked
                          }
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                    <span className="ml-2 text-xs font-bold text-slate-300">
                      {deliveryRadiusForm.cancellationSettings?.isCancellationAllowed ? 'Allowed' : 'Disabled'}
                    </span>
                  </label>
                </div>

                {/* Cancellation Cutoff Selector */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                      Cutoff Stage: Until when can customers cancel their order?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        {
                          val: 'Pending',
                          label: 'Pending Only',
                          desc: 'Cannot cancel once kitchen starts baking (Preparing)'
                        },
                        {
                          val: 'Preparing',
                          label: 'Until Preparing',
                          desc: 'Cannot cancel once packed & ready (Ready)'
                        },
                        {
                          val: 'Ready',
                          label: 'Until Ready',
                          desc: 'Cannot cancel once rider is dispatched (Out for Delivery)'
                        }
                      ].map((opt) => {
                        const isSelected = (deliveryRadiusForm.cancellationSettings?.cancellationAllowedUntil || 'Pending') === opt.val;
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            disabled={!deliveryRadiusForm.cancellationSettings?.isCancellationAllowed}
                            onClick={() =>
                              setDeliveryRadiusForm((prev) => ({
                                ...prev,
                                cancellationSettings: {
                                  ...(prev.cancellationSettings || {}),
                                  cancellationAllowedUntil: opt.val
                                }
                              }))
                            }
                            className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                              !deliveryRadiusForm.cancellationSettings?.isCancellationAllowed
                                ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                                : isSelected
                                ? 'bg-rose-500/20 text-white border-rose-500/50 ring-1 ring-rose-500/30'
                                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                            }`}
                          >
                            <span className="text-xs font-black block">{opt.label}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 leading-snug">
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Late Cancellation Rejection Message
                    </label>
                    <input
                      type="text"
                      disabled={!deliveryRadiusForm.cancellationSettings?.isCancellationAllowed}
                      value={
                        deliveryRadiusForm.cancellationSettings?.disallowedMessage ??
                        'Order cannot be cancelled because it is already being prepared or is out for delivery.'
                      }
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          cancellationSettings: {
                            ...(prev.cancellationSettings || {}),
                            disallowedMessage: e.target.value
                          }
                        }))
                      }
                      placeholder="e.g. Order cannot be cancelled once pizza baking has started."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 text-xs font-medium disabled:opacity-40"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {deliveryRadiusForm.cancellationSettings?.isCancellationAllowed
                        ? `Customers can cancel orders while in '${deliveryRadiusForm.cancellationSettings?.cancellationAllowedUntil || 'Pending'}' status. Stock & promo coupons are automatically restored upon cancellation.`
                        : 'Customer cancellation is currently turned OFF. Only store admins can cancel orders.'}
                    </p>
                    <button
                      type="button"
                      disabled={isSavingCancellationPolicy}
                      onClick={handleSaveCancellationPolicy}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shrink-0 transition-all cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSavingCancellationPolicy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save Cancellation Policy</span>
                    </button>
                  </div>

                  {cancellationPolicySavedMsg && (
                    <div className="text-[10px] text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-center shadow-sm">
                      {cancellationPolicySavedMsg}
                    </div>
                  )}
                </div>
              </div>

              {/* Restaurant Origin Coordinates */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-400" />
                      <span>Restaurant Base GPS Coordinates (Saved in DB)</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All customer delivery distances and charges are calculated straight-line from these base coordinates.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureRestaurantBaseLocation}
                    disabled={isCapturingBaseLocation}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs flex items-center space-x-2 shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-50 self-start sm:self-auto border border-orange-400/30"
                  >
                    {isCapturingBaseLocation ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Detecting Device GPS...</span>
                      </>
                    ) : (
                      <>
                        <Locate className="w-3.5 h-3.5" />
                        <span>📍 Capture & Save My Current GPS Location</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">restaurant_latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={deliveryRadiusForm.restaurantLat}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          restaurantLat: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">restaurant_longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={deliveryRadiusForm.restaurantLng}
                      onChange={(e) =>
                        setDeliveryRadiusForm((prev) => ({
                          ...prev,
                          restaurantLng: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Locations / Villages Table Card */}
            <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white">Configured Delivery Areas & Villages</h3>
                  <p className="text-xs text-slate-400">
                    Pre-set localities around Pathardewa with their exact distance & minimum order
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search village / area..."
                      value={locationSearchFilter}
                      onChange={(e) => setLocationSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddLocation}
                    className="px-3.5 py-2 rounded-xl bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/40 text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-400" />
                    <span>Add Area</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Village / Locality Name</th>
                      <th className="py-3 px-4">Distance from Pizza Hub</th>
                      <th className="py-3 px-4">Delivery Fee Status</th>
                      <th className="py-3 px-4">Min. Order Value</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {(deliveryRadiusForm?.locations || [])
                      .filter((loc) =>
                        loc && (!locationSearchFilter ||
                        (loc.name && String(loc.name).toLowerCase().includes(locationSearchFilter.toLowerCase())))
                      )
                      .map((loc, idx) => {
                        const locDist = Number(loc?.distanceKm || 0);
                        const freeDist = Number(deliveryRadiusForm?.freeDeliveryRadiusKm || 5);
                        const extraCharge = Number(deliveryRadiusForm?.extraChargePerKm || 10);
                        const isFree = locDist <= freeDist;
                        const calculatedFee = isFree
                          ? 0
                          : Math.ceil((locDist - freeDist) * extraCharge);

                        return (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-2">
                              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                              <span>{loc.name}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                              {loc.distanceKm} km
                            </td>
                            <td className="py-3.5 px-4">
                              {isFree ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                                  <span>🟢 ₹0 (FREE DELIVERY)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-black">
                                  <span>🚚 ₹{calculatedFee} Fee</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-200">
                              ₹{loc.minOrderAmount || deliveryRadiusForm.defaultMinOrderAmount || 149}
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleLocationDeliverable(idx)}
                                className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                                  loc.isDeliverable !== false
                                    ? 'text-emerald-400 hover:bg-emerald-950/40'
                                    : 'text-slate-500 hover:bg-slate-800'
                                }`}
                              >
                                {loc.isDeliverable !== false ? (
                                  <ToggleRight className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-slate-600" />
                                )}
                                <span>{loc.isDeliverable !== false ? 'Deliverable' : 'Suspended'}</span>
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditLocation(loc, idx)}
                                title="Edit Location"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLocation(idx, loc.name)}
                                title="Delete Location"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {deliveryRadiusForm.locations?.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No delivery locations configured. Click "Add Area" above to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ------------------------------------------------------------- */}
        {/* TAB 5: USERS & STAFF MANAGEMENT (CUSTOMERS, KITCHEN & ADMIN)  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Registered Accounts</p>
                    <h3 className="text-2xl font-black text-white mt-1">{usersList.length}</h3>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                  <span>{customerLeadsCount} Customer Mobile Leads</span>
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kitchen & Staff Access</p>
                    <h3 className="text-2xl font-black text-blue-400 mt-1">{staffAccountsCount}</h3>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <ChefHat className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">KDS Chefs & Admins</span>
                  <button
                    type="button"
                    onClick={handleOpenCreateStaffModal}
                    className="text-[10px] font-bold text-orange-400 hover:text-orange-300 underline cursor-pointer"
                  >
                    + Add New
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ordering Customers</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1">{customersWithOrdersCount}</h3>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Placed at least 1 order</span>
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lifetime Lead Sales</p>
                    <h3 className="text-2xl font-black text-white mt-1">₹{totalLeadsRevenue.toLocaleString('en-IN')}</h3>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Combined sales from customer leads</span>
                </p>
              </motion.div>
            </div>

            {/* Filter, Search & Create Staff Bar */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, username (@chef), mobile number, or address..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Filter:</span>
                {[
                  { id: 'all', label: 'All Accounts' },
                  { id: 'customer', label: 'Customers' },
                  { id: 'driver', label: 'Riders 🛵' },
                  { id: 'kitchen', label: 'Kitchen 👨‍🍳' },
                  { id: 'admin', label: 'Admins 🛡️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setUserRoleFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      userRoleFilter === tab.id
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                {/* Create Staff Account Button */}
                <button
                  type="button"
                  onClick={handleOpenCreateStaffModal}
                  className="ml-auto lg:ml-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Create Staff Account</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Registered Users & Staff Accounts</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 hidden sm:block">
                  Kitchen staff accounts have access to live KDS order ticket display
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Account / User</th>
                      <th className="py-3.5 px-4">Contact & Login ID</th>
                      <th className="py-3.5 px-4">Orders & Scope</th>
                      <th className="py-3.5 px-4">Location / Station</th>
                      <th className="py-3.5 px-4 text-right">Registered / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {filteredUsers.map((u) => {
                      const cleanPhone = (u.phone || '').replace(/\D/g, '');
                      const isIndianPhone = cleanPhone.length === 10;
                      const isStaffUser = u.role === 'admin' || u.role === 'kitchen';
                      const initials = (u.name || 'U')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      const isCopied = copiedPhone === u.phone;

                      const whatsappText = encodeURIComponent(
                        `Hello ${u.name || 'Customer'}! Warm greetings from Apurva Pizza Hub 🍕 Check out our fresh wood-fired pizzas, garlic breads & combos! Order online anytime for superfast delivery.`
                      );

                      return (
                        <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Account Name & Role Badge */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md ${
                                  u.role === 'admin'
                                    ? 'bg-gradient-to-tr from-red-600 to-rose-500'
                                    : u.role === 'kitchen'
                                    ? 'bg-gradient-to-tr from-blue-600 to-cyan-500'
                                    : u.role === 'driver'
                                    ? 'bg-gradient-to-tr from-cyan-600 to-blue-600'
                                    : 'bg-gradient-to-tr from-orange-600 to-amber-500'
                                }`}
                              >
                                {u.role === 'admin' ? '🛡️' : u.role === 'kitchen' ? '👨‍🍳' : u.role === 'driver' ? '🛵' : initials}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{u.name || 'Customer'}</span>
                                  <span
                                    className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                      u.role === 'admin'
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        : u.role === 'kitchen'
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : u.role === 'driver'
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}
                                  >
                                    {u.role === 'kitchen' ? 'Kitchen KDS' : u.role === 'admin' ? 'Admin' : u.role === 'driver' ? 'Rider 🛵' : 'Customer'}
                                  </span>
                                </div>
                                {u.username && (
                                  <div className="text-[11px] text-orange-400 font-mono font-medium">
                                    @{u.username}
                                  </div>
                                )}
                                {u.email && <div className="text-[11px] text-slate-400">{u.email}</div>}
                              </div>
                            </div>
                          </td>

                          {/* Contact & Login ID */}
                          <td className="py-3.5 px-4">
                            {u.phone ? (
                              isStaffUser ? (
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-bold text-white tracking-wide text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                    {isIndianPhone ? `+91 ${cleanPhone}` : u.phone}
                                  </span>

                                  {/* Quick Copy Phone */}
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPhone(cleanPhone || u.phone)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    title="Copy staff phone number"
                                  >
                                    {isCopied ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {isIndianPhone && (
                                    <a
                                      href={`tel:+91${cleanPhone}`}
                                      className="p-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-500/40 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                                      title="Call staff directly"
                                    >
                                      <PhoneCall className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <span
                                    className="font-mono font-bold text-amber-300 tracking-wide text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800/80 flex items-center gap-1.5 shadow-sm"
                                    title="Customer phone is masked in compliance with privacy & anti-scraping policy"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{u.phone}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                    Protected
                                  </span>
                                </div>
                              )
                            ) : u.username ? (
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 w-fit">
                                <Key className="w-3 h-3 text-orange-400" />
                                <span>Login: {u.username}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-xs">No login contact</span>
                            )}
                          </td>

                          {/* Orders & Scope */}
                          <td className="py-3.5 px-4">
                            {isStaffUser ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    u.role === 'admin'
                                      ? 'bg-red-500/10 text-red-300 border-red-500/20'
                                      : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                  }`}
                                >
                                  {u.role === 'admin' ? '🛡️ Full System Control' : '🍳 Live KDS Display Access'}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-1.5">
                                  {u.orderCount > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                                      {u.orderCount} {u.orderCount === 1 ? 'Order' : 'Orders'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[10px]">
                                      Lead (0 Orders)
                                    </span>
                                  )}
                                  <span className="font-bold text-white">₹{u.totalSpent || 0}</span>
                                </div>
                                {u.lastOrderDate && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    Last: {new Date(u.lastOrderDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Delivery Address / Station */}
                          <td className="py-3.5 px-4 min-w-[200px] max-w-[320px]">
                            {u.address ? (
                              <div className="group relative flex items-start gap-1.5 text-xs text-slate-300">
                                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                                <span className="break-words line-clamp-2 hover:line-clamp-none select-text cursor-default" title={u.address}>
                                  {u.address}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(u.address);
                                    setCopiedPhone(`addr_${u._id}`);
                                    setTimeout(() => setCopiedPhone(null), 2000);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity shrink-0 cursor-pointer ml-auto"
                                  title="Copy address"
                                >
                                  {copiedPhone === `addr_${u._id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">
                                {isStaffUser ? 'Central Hub' : 'No address saved'}
                              </span>
                            )}
                          </td>

                          {/* Registered / Actions */}
                          <td className="py-3.5 px-4 text-right text-slate-400 font-medium text-[11px] whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2.5">
                              {/* Assign / Change Role Selector (any user ID to rider, kitchen, admin, or customer) */}
                              {u.username !== 'admin' && (
                                <select
                                  value={u.role || 'customer'}
                                  onChange={(e) => handleUpdateUserRole(u._id, e.target.value, u.name)}
                                  className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 hover:border-orange-500 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer transition-colors"
                                  title="Assign ID to Rider, Kitchen Staff, Admin, or revoke back to Customer"
                                >
                                  <option value="customer">👤 Customer</option>
                                  <option value="driver">🛵 Delivery Rider</option>
                                  <option value="kitchen">👨‍🍳 Kitchen Staff</option>
                                  <option value="admin">🛡️ Administrator</option>
                                </select>
                              )}

                              <span className="hidden sm:inline">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'Recently'}
                              </span>

                              {/* Delete / Revoke Staff button (not available for default root accounts or yourself) */}
                              {isStaffUser && u.username !== 'admin' && u.username !== 'kitchen' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaffAccount(u._id, u.name, u.role)}
                                  title={`Revoke ${u.name}'s ${u.role} access`}
                                  className="p-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs">
                  {userSearchQuery
                    ? `No customers found matching "${userSearchQuery}". Try clearing search.`
                    : 'No customer accounts registered yet.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: COUPONS & PROMOS                                       */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Coupons</div>
                  <div className="text-2xl font-black text-white mt-1">{coupons.length}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Active Promos</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {coupons.filter(c => c.isActive).length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Redemptions</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Coupons Table */}
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-orange-400" />
                  <h3 className="font-bold text-white text-sm">Configured Promo Codes</h3>
                </div>
                <button
                  onClick={handleOpenCreateCouponModal}
                  className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Code</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Coupon Code</th>
                      <th className="py-3.5 px-4">Discount</th>
                      <th className="py-3.5 px-4">Min. Cart</th>
                      <th className="py-3.5 px-4">Max Cap</th>
                      <th className="py-3.5 px-4">Total Users Limit</th>
                      <th className="py-3.5 px-4">Repeat Use Rule</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {coupons.map((coupon) => (
                      <tr key={coupon._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-black text-xs tracking-wider">
                            <Tag className="w-3 h-3 text-orange-400" />
                            <span>{coupon.code}</span>
                          </div>
                          {coupon.description && (
                            <div className="text-[10px] text-slate-400 mt-1 max-w-xs truncate">
                              {coupon.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {coupon.discountType === 'percentage' ? (
                            <span className="text-amber-400 font-black">{coupon.discountValue}% OFF</span>
                          ) : (
                            <span className="text-emerald-400 font-black">₹{coupon.discountValue} FLAT</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-300">
                          ₹{coupon.minOrderAmount || 0}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-400">
                          {coupon.maxDiscount ? `₹${coupon.maxDiscount}` : 'No cap'}
                        </td>
                        <td className="py-3.5 px-4">
                          {coupon.totalUsageLimit ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                                <span className={coupon.usageCount >= coupon.totalUsageLimit ? 'text-red-400' : 'text-slate-200'}>
                                  {coupon.usageCount || 0} / {coupon.totalUsageLimit} used
                                </span>
                                {coupon.usageCount >= coupon.totalUsageLimit && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 uppercase font-black">
                                    Limit Reached
                                  </span>
                                )}
                              </div>
                              <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${coupon.usageCount >= coupon.totalUsageLimit ? 'bg-red-500' : 'bg-orange-500'}`}
                                  style={{ width: `${Math.min(100, Math.round(((coupon.usageCount || 0) / coupon.totalUsageLimit) * 100))}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] font-semibold">
                              {coupon.usageCount || 0} used (Unlimited)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {!coupon.allowRepeatUsage ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
                              <span>1x Single Use (No Repeat)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              <Repeat className="w-2.5 h-2.5" />
                              <span>Repeat: {coupon.maxUsagePerUser ? `Max ${coupon.maxUsagePerUser}x / user` : 'Unlimited per user'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {coupon.totalUsageLimit && coupon.usageCount >= coupon.totalUsageLimit ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-950/60 text-red-400 border border-red-500/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                              <span>Expired</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleCoupon(coupon._id)}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                coupon.isActive
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${coupon.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                              <span>{coupon.isActive ? 'Active' : 'Disabled'}</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEditCouponModal(coupon)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                              title="Edit Coupon Limits"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon._id)}
                              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-500/30 transition-colors cursor-pointer"
                              title="Delete Coupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {coupons.length === 0 && (
                <div className="py-12 text-center text-slate-500">
                  <Tag className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                  <p className="text-xs font-bold text-slate-400">No promo coupons created yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">Create codes like WELCOME50 or CRUST20 to incentivize orders.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 7: MASTER PAYMENT CONTROLS & GATEWAY                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/40 border border-orange-500/30 shadow-2xl relative overflow-hidden">
              <div className="max-w-2xl">
                <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider">
                  💳 Payment Gateway & Settlement Controls
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Payment Methods & Gateway Settings
                </h2>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Configure Cash-on-Delivery, Pay at Counter, and Razorpay API credentials for online payments & Razorpay UPI. All changes reflect live at customer checkout instantly.
                </p>
              </div>

              {/* Status Alert Messages */}
              {paymentSettingsSavedMsg && (
                <div className="mt-4 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{paymentSettingsSavedMsg}</span>
                </div>
              )}
              {paymentSettingsError && (
                <div className="mt-4 p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{paymentSettingsError}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSavePaymentSettings} className="space-y-6">
              {/* Grid with 2 Columns: Settings on Left, Status Summary on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Columns: Controls */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* CARD 1: Cash on Delivery (COD) Settings */}
                  <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                          💵
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-white">Cash on Delivery & Pay at Counter</h3>
                          <p className="text-[11px] text-slate-400">Allow customers to pay via cash or counter UPI upon arrival / pickup</p>
                        </div>
                      </div>
                      
                      {/* COD Toggle */}
                      <button
                        type="button"
                        onClick={() => setPaymentSettings({ ...paymentSettings, codEnabled: !paymentSettings.codEnabled })}
                        className={`flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          paymentSettings.codEnabled
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {paymentSettings.codEnabled ? 'Active / Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Maximum COD Order Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={paymentSettings.maxCodAmount}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, maxCodAmount: e.target.value })}
                          placeholder="e.g. 2000 (0 for unlimited)"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Orders above this amount will require online payment or UPI to prevent fake orders.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Convenience / Packaging Fee (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={paymentSettings.convenienceFee || 0}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, convenienceFee: e.target.value })}
                          placeholder="e.g. 0"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Extra nominal handling fee applied to customer checkout (optional).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: Online Payment Gateway (Razorpay & Razorpay UPI) */}
                  <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                          ⚡
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-white">Razorpay Online Gateway (UPI, Cards & NetBanking)</h3>
                          <p className="text-[11px] text-slate-400">Automated instant payment verification with Razorpay UPI intent & QR</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPaymentSettings({ ...paymentSettings, onlineGatewayEnabled: !paymentSettings.onlineGatewayEnabled })}
                        className={`flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          paymentSettings.onlineGatewayEnabled
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {paymentSettings.onlineGatewayEnabled ? 'Gateway Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-purple-300">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        <span>Ready for Razorpay UPI</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Manual UPI QR with 12-digit UTR has been completely removed. Once you enter your Razorpay Key ID & Key Secret below, customers can pay using Google Pay, PhonePe, Paytm, BHIM UPI, or Cards with 100% automated instant verification.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Gateway Environment Mode
                        </label>
                        <select
                          value={paymentSettings.razorpayMode}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayMode: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-orange-500"
                        >
                          <option value="test">Test Mode (Sandbox / Testing)</option>
                          <option value="live">Live Production Mode</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Razorpay Key ID
                        </label>
                        <input
                          type="text"
                          value={paymentSettings.razorpayKeyId}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayKeyId: e.target.value })}
                          placeholder="rzp_test_... or rzp_live_..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Razorpay Key Secret (Server Only)
                      </label>
                      <div className="relative">
                        <input
                          type={showRazorpaySecret ? 'text' : 'password'}
                          value={paymentSettings.razorpayKeySecret}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayKeySecret: e.target.value })}
                          placeholder="Enter your cryptographic Razorpay Secret Key"
                          className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                        >
                          {showRazorpaySecret ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        🔒 Stored securely on the backend server for cryptographic signature verification. Never exposed to browsers.
                      </p>
                    </div>
                  </div>

                </div>

                {/* Right Column: Active Payment Status Widget */}
                <div className="space-y-6">
                  <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-orange-400 bg-orange-500/15 px-3 py-1 rounded-full border border-orange-500/30 inline-block">
                      ⚡ Active Payment Methods
                    </span>

                    <div className="space-y-3 text-xs">
                      {/* COD Status */}
                      <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-base">💵</span>
                          <div>
                            <span className="font-bold text-white block">Cash on Delivery</span>
                            <span className="text-[10px] text-slate-400">Pay on doorstep arrival</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          paymentSettings.codEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {paymentSettings.codEnabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      {/* Razorpay UPI Status */}
                      <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-base">⚡</span>
                          <div>
                            <span className="font-bold text-white block">Razorpay UPI & Cards</span>
                            <span className="text-[10px] text-slate-400">
                              {paymentSettings.onlineGatewayEnabled ? `Active (${paymentSettings.razorpayMode})` : 'Offline / Keys Needed'}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          paymentSettings.onlineGatewayEnabled
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {paymentSettings.onlineGatewayEnabled ? 'Online' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="text-left text-[11px] text-slate-400 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/80 space-y-1.5 leading-relaxed">
                      <div className="font-bold text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Security Hardened</span>
                      </div>
                      <p>
                        Manual UTR submissions have been permanently removed. Orders will be verified either automatically via Razorpay webhooks or settled as Cash on Delivery with rider handover.
                      </p>
                    </div>
                  </div>

                  {/* Save Settings Button */}
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={savingPaymentSettings}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{savingPaymentSettings ? 'Saving Settings...' : 'Save & Publish Payment Settings'}</span>
                  </motion.button>
                </div>

              </div>
            </form>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 8: POLICIES & RAZORPAY COMPLIANCE CMS                     */}
        {/* ============================================================= */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-blue-500/30 shadow-2xl relative overflow-hidden">
              <div className="max-w-3xl">
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
                  🛡️ Razorpay Website Compliance & Legal CMS
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Store Policies & Merchant Identity Management
                </h2>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Customize your official store policies required for Razorpay merchant verification. All changes reflect live instantly across customer policy pages and the storefront footer.
                </p>
              </div>

              {/* Status Alert Messages */}
              {policySavedMsg && (
                <div className="mt-4 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{policySavedMsg}</span>
                </div>
              )}
              {policyError && (
                <div className="mt-4 p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{policyError}</span>
                </div>
              )}
            </div>

            {/* Razorpay Merchant Onboarding Checklist Card */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Razorpay Website Verification Checklist</h3>
                    <p className="text-[11px] text-slate-400">Mandatory criteria checked by Razorpay compliance reviewers for live activation</p>
                  </div>
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  100% Ready for Verification
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white block">Contact Us Page Live</span>
                    <span className="text-[11px] text-slate-400">Phone, email, address, timings & map</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white block">5–7 Days Refund Clause</span>
                    <span className="text-[11px] text-slate-400">Clearly stated turnaround to original mode</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white block">30–45 Mins Delivery Window</span>
                    <span className="text-[11px] text-slate-400">Local delivery zones & pricing</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white block">Terms & Privacy Published</span>
                    <span className="text-[11px] text-slate-400">Deoria jurisdiction & PCI-DSS notice</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white block">Storefront Footer Links</span>
                    <span className="text-[11px] text-slate-400">All 6 policy links visible on every page</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white block">Payment Controls Active</span>
                    <span className="text-[11px] text-slate-400">COD toggle & Razorpay credentials ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Policy Management Form */}
            <form onSubmit={handleSavePolicies} className="space-y-6">
              
              {/* Sub-tab Navigation */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
                {[
                  { id: 'contact', label: '📞 Contact & Outlet Info' },
                  { id: 'refund', label: '🔄 Cancellation & Refund' },
                  { id: 'shipping', label: '🚚 Shipping & Delivery' },
                  { id: 'terms', label: '📄 Terms & Conditions' },
                  { id: 'privacy', label: '🔒 Privacy Policy' },
                  { id: 'about', label: '🍕 About Us Story' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivePolicySubTab(tab.id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                      activePolicySubTab === tab.id
                        ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sub-Tab 1: Contact & Outlet Details */}
              {activePolicySubTab === 'contact' && (
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
                  <div className="pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-extrabold text-white">Contact Us & Registered Operating Address</h3>
                    <p className="text-[11px] text-slate-400">
                      Razorpay verifies physical registered address, phone number, support email, and operating hours.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Brand / Trade Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={policyData.contact?.businessName || ''}
                        onChange={(e) => setPolicyData({
                          ...policyData,
                          contact: { ...policyData.contact, businessName: e.target.value }
                        })}
                        placeholder="e.g. Apurva Pizza Hub"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Legal Entity / Registered Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={policyData.contact?.legalEntityName || ''}
                        onChange={(e) => setPolicyData({
                          ...policyData,
                          contact: { ...policyData.contact, legalEntityName: e.target.value }
                        })}
                        placeholder="e.g. Apurva Pizza Hub & Fast Food"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Customer Care Phone / WhatsApp *
                      </label>
                      <input
                        type="text"
                        required
                        value={policyData.contact?.supportPhone || ''}
                        onChange={(e) => setPolicyData({
                          ...policyData,
                          contact: { ...policyData.contact, supportPhone: e.target.value }
                        })}
                        placeholder="e.g. +91 73796 82620"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Customer Support Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={policyData.contact?.supportEmail || ''}
                        onChange={(e) => setPolicyData({
                          ...policyData,
                          contact: { ...policyData.contact, supportEmail: e.target.value }
                        })}
                        placeholder="e.g. support@apurvapizzahub.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Complete Physical Operating Address *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={policyData.contact?.operatingAddress || ''}
                        onChange={(e) => setPolicyData({
                          ...policyData,
                          contact: { ...policyData.contact, operatingAddress: e.target.value }
                        })}
                        placeholder="e.g. Main Market Road, Near SBI Bank, Pathardewa, Deoria, Uttar Pradesh - 274404"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        City / Town
                      </label>
                      <input
                        type="text"
                        value={policyData.contact?.city || ''}
                        onChange={(e) => setPolicyData({
                          ...policyData,
                          contact: { ...policyData.contact, city: e.target.value }
                        })}
                        placeholder="e.g. Pathardewa"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        State & PIN Code
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={policyData.contact?.state || ''}
                          onChange={(e) => setPolicyData({
                            ...policyData,
                            contact: { ...policyData.contact, state: e.target.value }
                          })}
                          placeholder="e.g. Uttar Pradesh"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500"
                        />
                        <input
                          type="text"
                          value={policyData.contact?.pincode || ''}
                          onChange={(e) => setPolicyData({
                            ...policyData,
                            contact: { ...policyData.contact, pincode: e.target.value }
                          })}
                          placeholder="e.g. 274404"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Operating & Kitchen Hours
                      </label>
                      <input
                        type="text"
                        value={policyData.contact?.operatingHours || ''}
                        onChange={(e) => setPolicyData({
                          ...policyData,
                          contact: { ...policyData.contact, operatingHours: e.target.value }
                        })}
                        placeholder="e.g. 10:00 AM – 11:00 PM (Monday to Sunday)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Cancellation & Refund Policy */}
              {activePolicySubTab === 'refund' && (
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-300 space-y-1">
                      <span className="font-extrabold block">Razorpay Merchant Verification Requirement:</span>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        The policy must clearly state: (1) Cancellation window (e.g. before food preparation), (2) Quality / damage refund scenarios, and (3) The exact turnaround time: <strong>"Refunds will be processed to the original payment mode within 5 to 7 business days"</strong>.
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-white uppercase tracking-wider">
                        Policy Markdown Content
                      </label>
                      <span className="text-[11px] text-slate-500">Supports standard markdown (# headers, * lists, **bold**)</span>
                    </div>
                    <textarea
                      rows={18}
                      value={policyData.refundPolicy || ''}
                      onChange={(e) => setPolicyData({ ...policyData, refundPolicy: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Shipping & Delivery Policy */}
              {activePolicySubTab === 'shipping' && (
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
                  <div className="p-3.5 rounded-2xl bg-orange-950/40 border border-orange-500/30 flex items-start space-x-2.5">
                    <Truck className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-orange-300 space-y-1">
                      <span className="font-extrabold block">Razorpay Shipping Requirement:</span>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Must specify your delivery coverage zones (Pathardewa, Tarkulwa, Deoria pin code 274404), shipping fees / free delivery policy, and standard estimated delivery timeline of <strong>30 to 45 minutes</strong>.
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-white uppercase tracking-wider">
                        Policy Markdown Content
                      </label>
                      <span className="text-[11px] text-slate-500">Supports standard markdown</span>
                    </div>
                    <textarea
                      rows={18}
                      value={policyData.shippingPolicy || ''}
                      onChange={(e) => setPolicyData({ ...policyData, shippingPolicy: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: Terms & Conditions */}
              {activePolicySubTab === 'terms' && (
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
                  <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-start space-x-2.5">
                    <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-300 space-y-1">
                      <span className="font-extrabold block">Terms & Conditions Guidelines:</span>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Outlines the ordering agreement, pricing in INR including taxes, coupon conditions, and governing jurisdiction in Deoria, Uttar Pradesh.
                      </p>
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={18}
                      value={policyData.termsAndConditions || ''}
                      onChange={(e) => setPolicyData({ ...policyData, termsAndConditions: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Sub-Tab 5: Privacy Policy */}
              {activePolicySubTab === 'privacy' && (
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start space-x-2.5">
                    <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-300 space-y-1">
                      <span className="font-extrabold block">Data Security & Payment Privacy:</span>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        States that card credentials and UPI PINs are processed via PCI-DSS compliant payment gateways (Razorpay) and are never stored on Apurva Pizza Hub servers.
                      </p>
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={18}
                      value={policyData.privacyPolicy || ''}
                      onChange={(e) => setPolicyData({ ...policyData, privacyPolicy: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Sub-Tab 6: About Us */}
              {activePolicySubTab === 'about' && (
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-white uppercase tracking-wider">
                        About Us & Brand Story Content
                      </label>
                      <span className="text-[11px] text-slate-500">Highlighted on the public storefront</span>
                    </div>
                    <textarea
                      rows={18}
                      value={policyData.aboutUs || ''}
                      onChange={(e) => setPolicyData({ ...policyData, aboutUs: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons: Save, Reset & Live Links */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={savingPolicies}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs shadow-xl shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{savingPolicies ? 'Saving Policies...' : 'Save & Publish All Policies'}</span>
                  </motion.button>

                  <button
                    type="button"
                    onClick={handleResetPoliciesToDefault}
                    disabled={savingPolicies}
                    className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    Reset to Razorpay Defaults
                  </button>
                </div>

                {/* Live Page Preview Quick Links */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
                  <span>Test Live Pages:</span>
                  <a
                    href={`${import.meta.env.VITE_CUSTOMER_URL || ''}/contact-us`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-orange-500 text-slate-300 hover:text-orange-400 transition-colors"
                  >
                    Contact Us ↗
                  </a>
                  <a
                    href={`${import.meta.env.VITE_CUSTOMER_URL || ''}/refund-policy`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-orange-500 text-slate-300 hover:text-orange-400 transition-colors"
                  >
                    Refund Policy ↗
                  </a>
                  <a
                    href={`${import.meta.env.VITE_CUSTOMER_URL || ''}/shipping-policy`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-orange-500 text-slate-300 hover:text-orange-400 transition-colors"
                  >
                    Shipping Policy ↗
                  </a>
                </div>
              </div>

            </form>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 9: STORE AUTOMATION & MASTER FEATURE CONTROLS             */}
        {/* ============================================================= */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                      ⚙️ Master Business Automations
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      featureSettings?.customerWallet?.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {featureSettings?.customerWallet?.enabled ? 'Wallet: Active' : 'Wallet: Disabled (Default)'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                    Store Automation & Feature Controls
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Granular toggle switches to control your Customer Digital Wallet, Delivery Handover OTP verification, Silent Thermal Kitchen Printing, and WhatsApp/SMS Alerts. Changes activate live instantly.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveFeatureSettings()}
                  disabled={savingFeatureSettings}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {savingFeatureSettings ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Save All Settings</span>
                </button>
              </div>

              {/* Status Notifications */}
              {featureSavedMsg && (
                <div className="mt-4 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{featureSavedMsg}</span>
                </div>
              )}
              {featureError && (
                <div className="mt-4 p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{featureError}</span>
                </div>
              )}
            </div>

            {/* Quick 4-Feature Status Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">1. Customer Wallet</span>
                  <Wallet className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-black ${featureSettings?.customerWallet?.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {featureSettings?.customerWallet?.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...featureSettings,
                        customerWallet: {
                          ...featureSettings.customerWallet,
                          enabled: !featureSettings.customerWallet?.enabled
                        }
                      };
                      setFeatureSettings(updated);
                      handleSaveFeatureSettings(updated);
                    }}
                    className="cursor-pointer"
                  >
                    {featureSettings?.customerWallet?.enabled ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Cashback & Balance at Checkout</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">2. Handover OTP</span>
                  <Lock className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-black ${featureSettings?.handoverOtp?.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {featureSettings?.handoverOtp?.enabled ? 'ACTIVE' : 'OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...featureSettings,
                        handoverOtp: {
                          ...featureSettings.handoverOtp,
                          enabled: !featureSettings.handoverOtp?.enabled
                        }
                      };
                      setFeatureSettings(updated);
                      handleSaveFeatureSettings(updated);
                    }}
                    className="cursor-pointer"
                  >
                    {featureSettings?.handoverOtp?.enabled ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">4-Digit PIN on Delivery</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">3. Silent Printing</span>
                  <Printer className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-black ${featureSettings?.silentPrint?.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {featureSettings?.silentPrint?.enabled ? 'AUTO-PRINT ON' : 'MANUAL ONLY'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...featureSettings,
                        silentPrint: {
                          ...featureSettings.silentPrint,
                          enabled: !featureSettings.silentPrint?.enabled
                        }
                      };
                      setFeatureSettings(updated);
                      handleSaveFeatureSettings(updated);
                    }}
                    className="cursor-pointer"
                  >
                    {featureSettings?.silentPrint?.enabled ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">80mm Thermal Receipt Automation</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">4. Live Alerts</span>
                  <BellRing className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-black ${(featureSettings?.whatsappAlerts?.enabled || featureSettings?.smsAlerts?.enabled) ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {featureSettings?.whatsappAlerts?.enabled ? 'WHATSAPP ON' : featureSettings?.smsAlerts?.enabled ? 'SMS ON' : 'OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...featureSettings,
                        whatsappAlerts: {
                          ...featureSettings.whatsappAlerts,
                          enabled: !featureSettings.whatsappAlerts?.enabled
                        }
                      };
                      setFeatureSettings(updated);
                      handleSaveFeatureSettings(updated);
                    }}
                    className="cursor-pointer"
                  >
                    {featureSettings?.whatsappAlerts?.enabled ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">WhatsApp & SMS Status Notifications</p>
              </div>
            </div>

            {/* ========================================================= */}
            {/* FEATURE 1: CUSTOMER DIGITAL WALLET & CASHBACK SYSTEM      */}
            {/* ========================================================= */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-extrabold text-white">Customer Digital Wallet & Cashback System</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        featureSettings?.customerWallet?.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {featureSettings?.customerWallet?.enabled ? 'Active on Storefront' : 'Disabled (Hidden from Customers)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Enable or disable customer wallet credits. Keep it disabled now, and toggle it ON when you want customers to see wallet balances and earn cashback.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-300">
                    {featureSettings?.customerWallet?.enabled ? 'Wallet Active' : 'Wallet Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeatureSettings((prev) => ({
                        ...prev,
                        customerWallet: {
                          ...prev.customerWallet,
                          enabled: !prev.customerWallet?.enabled
                        }
                      }));
                    }}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      featureSettings?.customerWallet?.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        featureSettings?.customerWallet?.enabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {!featureSettings?.customerWallet?.enabled ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start space-x-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-sm mb-0.5">Customer Wallet is Currently Disabled</span>
                    <p className="text-amber-300/80 leading-relaxed">
                      All wallet features (Hub Wallet widget in Profile, "Apply Wallet Balance" checkbox at Checkout, and Cashback awards) are completely hidden from customers. Turn this switch ON whenever you are ready to launch customer cashback rewards.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-sm mb-0.5">Customer Wallet is Live!</span>
                    <p className="text-emerald-300/80 leading-relaxed">
                      Customers will now see their Hub Wallet balance card on the Profile page, earn automated cashback on delivered orders, and can deduct wallet balance at Checkout up to the configured limit.
                    </p>
                  </div>
                </div>
              )}

              {/* Wallet Configuration Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Cashback Reward (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={featureSettings?.customerWallet?.cashbackPercentage ?? 5}
                      onChange={(e) =>
                        setFeatureSettings((prev) => ({
                          ...prev,
                          customerWallet: {
                            ...prev.customerWallet,
                            cashbackPercentage: Math.max(0, Number(e.target.value))
                          }
                        }))
                      }
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Percentage of order total credited as cashback</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Cashback Trigger Condition
                  </label>
                  <select
                    value={featureSettings?.customerWallet?.cashbackTrigger || 'all_orders'}
                    onChange={(e) =>
                      setFeatureSettings((prev) => ({
                        ...prev,
                        customerWallet: {
                          ...prev.customerWallet,
                          cashbackTrigger: e.target.value
                        }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="all_orders">Award on All Delivered Orders (COD + Online)</option>
                    <option value="paid_online_only">Award Only for Prepaid Online Orders (UPI/Card)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">When to credit customer cashback</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Max Balance Redemption Per Order
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={featureSettings?.customerWallet?.maxUsagePercentage ?? 50}
                      onChange={(e) =>
                        setFeatureSettings((prev) => ({
                          ...prev,
                          customerWallet: {
                            ...prev.customerWallet,
                            maxUsagePercentage: Math.max(1, Math.min(100, Number(e.target.value)))
                          }
                        }))
                      }
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Max % of bill payable via wallet credits</p>
                </div>
              </div>

              {/* Direct Customer Wallet Adjust Tool */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Direct Customer Wallet Adjuster (Credit / Debit Balance)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Manually reward loyalty points, issue refund credits, or adjust wallet balance for any registered customer phone.
                </p>

                {walletAdjustSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{walletAdjustSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Customer Phone</label>
                    <input
                      type="text"
                      placeholder="10-digit Phone"
                      value={walletUserPhone}
                      onChange={(e) => setWalletUserPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Action</label>
                    <select
                      value={walletAction}
                      onChange={(e) => setWalletAction(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="credit">➕ Credit (+ Add to Wallet)</option>
                      <option value="debit">➖ Debit (- Deduct from Wallet)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Reason / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Festive Bonus"
                      value={walletReason}
                      onChange={(e) => setWalletReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAdjustUserWallet}
                      disabled={adjustingWallet}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {adjustingWallet ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Apply Balance</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* FEATURE 2: DELIVERY PARTNER HANDOVER OTP                  */}
            {/* ========================================================= */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-extrabold text-white">Delivery Partner Handover PIN (OTP)</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        featureSettings?.handoverOtp?.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {featureSettings?.handoverOtp?.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Prevents fake deliveries by generating a secure 4-digit PIN for each active order that staff/admin verifies upon doorstep or counter handover.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-300">
                    {featureSettings?.handoverOtp?.enabled ? 'OTP Required' : 'OTP Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeatureSettings((prev) => ({
                        ...prev,
                        handoverOtp: {
                          ...prev.handoverOtp,
                          enabled: !prev.handoverOtp?.enabled
                        }
                      }));
                    }}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      featureSettings?.handoverOtp?.enabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        featureSettings?.handoverOtp?.enabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Handover Workflow Steps Graphic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black flex items-center justify-center">1</span>
                  <h5 className="text-xs font-black text-white">Order Placement</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    System creates 4-digit PIN (e.g. 4821) visible on customer profile and WhatsApp alert.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black flex items-center justify-center">2</span>
                  <h5 className="text-xs font-black text-white">Doorstep Arrival</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Delivery partner or counter staff delivers fresh pizza box directly to the customer.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black flex items-center justify-center">3</span>
                  <h5 className="text-xs font-black text-white">PIN Verification</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Staff inputs the 4-digit PIN in Admin Dashboard or Kitchen KDS before marking Delivered.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black flex items-center justify-center">4</span>
                  <h5 className="text-xs font-black text-white">Order Closed</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Order transitions to Delivered, customer receives confirmation, and cashback is awarded.
                  </p>
                </div>
              </div>

              {/* Handover Policy Sub-toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-white block">Require PIN Only for Cash on Delivery (COD)</span>
                    <span className="text-[11px] text-slate-400">Prepaid orders skip PIN prompt if enabled</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(featureSettings?.handoverOtp?.requireForCodOnly)}
                    onChange={(e) =>
                      setFeatureSettings((prev) => ({
                        ...prev,
                        handoverOtp: {
                          ...prev.handoverOtp,
                          requireForCodOnly: e.target.checked
                        }
                      }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-700 bg-slate-900"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-white block">Allow Emergency Admin Bypass</span>
                    <span className="text-[11px] text-slate-400">Allows store staff to bypass PIN if customer phone battery is discharged</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(featureSettings?.handoverOtp?.allowAdminBypass)}
                    onChange={(e) =>
                      setFeatureSettings((prev) => ({
                        ...prev,
                        handoverOtp: {
                          ...prev.handoverOtp,
                          allowAdminBypass: e.target.checked
                        }
                      }))
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-700 bg-slate-900"
                  />
                </label>
              </div>
            </div>

            {/* ========================================================= */}
            {/* FEATURE 3: KITCHEN COUNTER SILENT / AUTO THERMAL PRINTING  */}
            {/* ========================================================= */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-extrabold text-white">Kitchen Counter Silent / Auto Thermal Printing</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        featureSettings?.silentPrint?.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {featureSettings?.silentPrint?.enabled ? 'Auto-Print Active' : 'Manual Print Only'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatically opens 80mm thermal receipts when orders arrive or transition status, speeding up kitchen expediting without manual clicks.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-300">
                    {featureSettings?.silentPrint?.enabled ? 'Auto-Print ON' : 'Auto-Print OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeatureSettings((prev) => ({
                        ...prev,
                        silentPrint: {
                          ...prev.silentPrint,
                          enabled: !prev.silentPrint?.enabled
                        }
                      }));
                    }}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      featureSettings?.silentPrint?.enabled ? 'bg-purple-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        featureSettings?.silentPrint?.enabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Print Trigger Order Status
                  </label>
                  <select
                    value={featureSettings?.silentPrint?.printOnStatus || 'Preparing'}
                    onChange={(e) =>
                      setFeatureSettings((prev) => ({
                        ...prev,
                        silentPrint: {
                          ...prev.silentPrint,
                          printOnStatus: e.target.value
                        }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Preparing">Trigger on 'Preparing' (When Kitchen accepts order)</option>
                    <option value="Pending">Trigger on 'Pending' (Immediately when new order arrives)</option>
                    <option value="Ready">Trigger on 'Ready' (For dispatch packaging)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">Automatic receipt modal triggers on this status change</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Receipt Copies Count
                  </label>
                  <select
                    value={featureSettings?.silentPrint?.copies || 1}
                    onChange={(e) =>
                      setFeatureSettings((prev) => ({
                        ...prev,
                        silentPrint: {
                          ...prev.silentPrint,
                          copies: Number(e.target.value)
                        }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="1">1 Copy (Kitchen Kitchen Order Ticket - KOT)</option>
                    <option value="2">2 Copies (1 KOT + 1 Customer Delivery Receipt)</option>
                    <option value="3">3 Copies (Kitchen + Rider + Customer)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">Number of copies formatted for 80mm POS printers</p>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* FEATURE 4: AUTOMATED WHATSAPP & SMS NOTIFICATIONS         */}
            {/* ========================================================= */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/80 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Automated WhatsApp & SMS Customer Alerts</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sends real-time order lifecycle alerts (Placed, Baking, Dispatched, Delivered with PIN) directly to customer mobile.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-300">
                    {featureSettings?.whatsappAlerts?.enabled ? 'WhatsApp Alerts ON' : 'WhatsApp Alerts OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeatureSettings((prev) => ({
                        ...prev,
                        whatsappAlerts: {
                          ...prev.whatsappAlerts,
                          enabled: !prev.whatsappAlerts?.enabled
                        }
                      }));
                    }}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      featureSettings?.whatsappAlerts?.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        featureSettings?.whatsappAlerts?.enabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* WhatsApp Provider & Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    WhatsApp Provider
                  </label>
                  <select
                    value={featureSettings?.whatsappAlerts?.provider || 'whatsapp_cloud_api'}
                    onChange={(e) =>
                      setFeatureSettings((prev) => ({
                        ...prev,
                        whatsappAlerts: {
                          ...prev.whatsappAlerts,
                          provider: e.target.value
                        }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="whatsapp_cloud_api">Meta Official WhatsApp Cloud API</option>
                    <option value="custom_webhook">Custom Webhook / UltraMsg / Wati</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    API Key / System Token
                  </label>
                  <input
                    type="password"
                    placeholder="Enter Meta Cloud API Bearer Token"
                    value={featureSettings?.whatsappAlerts?.apiKey || ''}
                    onChange={(e) =>
                      setFeatureSettings((prev) => ({
                        ...prev,
                        whatsappAlerts: {
                          ...prev.whatsappAlerts,
                          apiKey: e.target.value
                        }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1048592019485"
                    value={featureSettings?.whatsappAlerts?.phoneNumberId || ''}
                    onChange={(e) =>
                      setFeatureSettings((prev) => ({
                        ...prev,
                        whatsappAlerts: {
                          ...prev.whatsappAlerts,
                          phoneNumberId: e.target.value
                        }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* WhatsApp Notification Triggers Checkboxes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Notification Lifecycle Stages
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'notifyOnPlaced', label: 'Order Placed (PIN)', desc: 'Order ID, items & PIN' },
                    { key: 'notifyOnPreparing', label: 'Preparing (Baking)', desc: 'Pizza entered oven' },
                    { key: 'notifyOnDispatched', label: 'Dispatched (Rider)', desc: 'Rider name & ETA' },
                    { key: 'notifyOnDelivered', label: 'Delivered (Receipt)', desc: 'Completion & cashback' }
                  ].map((stage) => (
                    <label key={stage.key} className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(featureSettings?.whatsappAlerts?.[stage.key])}
                        onChange={(e) =>
                          setFeatureSettings((prev) => ({
                            ...prev,
                            whatsappAlerts: {
                              ...prev.whatsappAlerts,
                              [stage.key]: e.target.checked
                            }
                          }))
                        }
                        className="w-4 h-4 mt-0.5 rounded text-emerald-500 focus:ring-emerald-400 border-slate-700 bg-slate-900"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">{stage.label}</span>
                        <span className="text-[10px] text-slate-400">{stage.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* SMS Gateway (Fast2SMS) Settings */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      SMS Alerts Gateway (Fast2SMS / DLT)
                    </h4>
                    <p className="text-[11px] text-slate-400">Fallback SMS alerts in case customer is offline from WhatsApp</p>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <span className="text-xs text-slate-400">Enable SMS:</span>
                    <input
                      type="checkbox"
                      checked={Boolean(featureSettings?.smsAlerts?.enabled)}
                      onChange={(e) =>
                        setFeatureSettings((prev) => ({
                          ...prev,
                          smsAlerts: {
                            ...prev.smsAlerts,
                            enabled: e.target.checked
                          }
                        }))
                      }
                      className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 border-slate-700 bg-slate-900"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Fast2SMS API Key
                    </label>
                    <input
                      type="password"
                      placeholder="Enter Fast2SMS API Key"
                      value={featureSettings?.smsAlerts?.apiKey || ''}
                      onChange={(e) =>
                        setFeatureSettings((prev) => ({
                          ...prev,
                          smsAlerts: {
                            ...prev.smsAlerts,
                            apiKey: e.target.value
                          }
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Sender ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. APURVA"
                      value={featureSettings?.smsAlerts?.senderId || 'APURVA'}
                      onChange={(e) =>
                        setFeatureSettings((prev) => ({
                          ...prev,
                          smsAlerts: {
                            ...prev.smsAlerts,
                            senderId: e.target.value
                          }
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Live Test Alert Console */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Live Notification Testing Tool
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Send a live test alert to your phone number to verify WhatsApp API credentials and message delivery templates.
                </p>

                {testAlertSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{testAlertSuccess}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      placeholder="e.g. +91 73796 82620"
                      value={testNotificationPhone}
                      onChange={(e) => setTestNotificationPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleSendTestNotification('whatsapp')}
                      disabled={sendingTestAlert}
                      className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {sendingTestAlert ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                      <span>Test WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendTestNotification('sms')}
                      disabled={sendingTestAlert}
                      className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {sendingTestAlert ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                      <span>Test SMS</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 10: RAW INVENTORY & RECIPE BILL-OF-MATERIALS (BOM)       */}
        {/* ============================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/40 border border-orange-500/30 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold mb-3">
                    <Package className="w-3.5 h-3.5" />
                    <span>Live Recipe BOM Auto-Deduction</span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Raw Inventory & Recipe Bill-of-Materials (BOM)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Whenever an order moves to <strong className="text-blue-300">"Preparing"</strong> in the Kitchen KDS, dough balls, mozzarella cheese, pizza sauce, and delivery boxes are automatically deducted from stock.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchInventory}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingInventory ? 'animate-spin text-orange-400' : ''}`} />
                    <span>Refresh Stock</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold block mb-1">Total Monitored Ingredients</span>
                <span className="text-2xl font-black text-white">{inventoryItems.length}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Dough, Cheese, Sauces, Boxes, Veggies</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-red-500/30 bg-red-950/10">
                <span className="text-xs text-red-400 font-bold block mb-1">Low Stock Alerts</span>
                <span className="text-2xl font-black text-red-400">
                  {inventoryItems.filter((i) => i.currentStock <= i.minStockAlert).length}
                </span>
                <span className="text-[10px] text-red-400/80 block mt-1">Below minimum reorder threshold</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 bg-emerald-950/10">
                <span className="text-xs text-emerald-400 font-bold block mb-1">Healthy Stock</span>
                <span className="text-2xl font-black text-emerald-400">
                  {inventoryItems.filter((i) => i.currentStock > i.minStockAlert).length}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-1">Optimal operational reserves</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold block mb-1">Estimated Valuation</span>
                <span className="text-2xl font-black text-amber-400">
                  ₹{inventoryItems.reduce((acc, it) => acc + (it.currentStock * (it.costPerUnit || 0)), 0).toFixed(0)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Total raw inventory on-hand</span>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['All', 'Dough & Base', 'Cheese & Dairy', 'Sauces & Seasoning', 'Veggie Toppings', 'Packaging Boxes'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setInventoryCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      inventoryCategoryFilter === cat
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ingredient or code..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Item & Code</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">Threshold</th>
                      <th className="py-3 px-4">Unit Cost</th>
                      <th className="py-3 px-4">Health Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {inventoryItems
                      .filter((it) => {
                        const matchesCat = inventoryCategoryFilter === 'All' || it.category === inventoryCategoryFilter;
                        const q = inventorySearch.toLowerCase();
                        const matchesQ = !q || it.name.toLowerCase().includes(q) || (it.itemCode && it.itemCode.toLowerCase().includes(q));
                        return matchesCat && matchesQ;
                      })
                      .map((it) => {
                        const isLow = it.currentStock <= it.minStockAlert;
                        const isOut = it.currentStock <= 0;
                        const pct = Math.min(100, Math.round((it.currentStock / (it.minStockAlert * 3)) * 100));

                        return (
                          <tr key={it._id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-sm">{it.name}</div>
                              <span className="text-[10px] font-mono text-slate-500 uppercase">{it.itemCode}</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold border border-slate-700">
                                {it.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-black text-white text-sm">
                                {Number(it.currentStock).toFixed(1)} <span className="text-xs font-normal text-slate-400">{it.unit}</span>
                              </div>
                              <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full ${
                                    isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${Math.max(5, pct)}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                              {it.minStockAlert} {it.unit}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                              ₹{it.costPerUnit || 0}
                            </td>
                            <td className="py-3.5 px-4">
                              {isOut ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black uppercase">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase flex items-center gap-1 w-fit">
                                  <span>⚠️</span> Low Stock
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase">
                                  Healthy
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  setRestockModalItem(it);
                                  setRestockQuantity('');
                                  setRestockNotes('Supplier restock delivery');
                                }}
                                className="py-1.5 px-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-bold transition-all cursor-pointer"
                              >
                                + Restock
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 11: RIDER COD RECONCILIATION & CASH SETTLEMENT           */}
        {/* ============================================================= */}
        {activeTab === 'cod' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Rider Cash Reconciliation Ledger</span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Rider COD Handover & Shift Settlement
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Track physical cash collected by each delivery rider for Cash-on-Delivery orders. Once the rider hands over cash at the counter, click "Settle & Clear Cash" to reconcile and generate a settlement slip.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchCodReconciliation}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCodData ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>Refresh Ledger</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 bg-amber-950/10">
                <span className="text-xs text-amber-300 font-bold block mb-1">Unsettled Cash in Bags</span>
                <span className="text-2xl font-black text-amber-300">
                  ₹{Number(codReconciliationData?.grandTotalUnsettled ?? codReconciliationData?.totalCashInBag ?? 0).toFixed(0)}
                </span>
                <span className="text-[10px] text-amber-400/80 block mt-1">Pending physical handover to counter</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 bg-emerald-950/10">
                <span className="text-xs text-emerald-400 font-bold block mb-1">Total Settled Cash</span>
                <span className="text-2xl font-black text-emerald-400">
                  ₹{Number(codReconciliationData?.totalSettledCash || 0).toFixed(0)}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-1">Handed over & cleared in register</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold block mb-1">Active COD Riders</span>
                <span className="text-2xl font-black text-white">
                  {codReconciliationData?.riders?.length || 0}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Delivering orders on field</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold block mb-1">Total Unsettled Orders</span>
                <span className="text-2xl font-black text-cyan-400">
                  {codReconciliationData?.totalUnsettledOrders ?? codReconciliationData?.totalOrdersDelivered ?? 0}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Delivered via Cash-on-Delivery</span>
              </div>
            </div>

            {/* Rider Cash Reconciliation Table */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span>Rider Daily Cash Ledgers</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Instant shift reconciliation
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Rider Info</th>
                      <th className="py-3 px-4">Delivered Orders</th>
                      <th className="py-3 px-4">Total Cash Collected</th>
                      <th className="py-3 px-4">Cash in Bag (Unsettled)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {codReconciliationData?.riders && codReconciliationData.riders.length > 0 ? (
                      codReconciliationData.riders.map((r, idx) => {
                        const unsettled = Number(r.unsettledCash ?? r.totalCash ?? 0);
                        const ordersCount = r.ordersCount ?? r.orderCount ?? 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                <span>🛵</span>
                                <span>{r.riderName}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">📞 {r.riderPhone || 'No phone'}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                              {ordersCount} orders
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                              ₹{Number(r.totalCollected ?? r.totalCash ?? 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`font-mono text-base font-black ${
                                unsettled > 0 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                ₹{unsettled.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {unsettled > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase">
                                  Cash Pending
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase">
                                  Settled & Clear
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSettleModalRider(r);
                                  setSettleNotes(`Handover cleared for ${r.riderName}`);
                                }}
                                disabled={unsettled <= 0}
                                className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                🤝 Settle & Clear Cash
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-500">
                          No COD orders assigned to riders currently.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Last Settlement Slip Card if available */}
            {lastSettlementSlip && (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Last Settlement Verified: {lastSettlementSlip.riderName}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{lastSettlementSlip.settledAt}</span>
                </div>
                <div className="text-xs text-slate-300">
                  Amount Handed Over: <strong className="text-white font-mono text-sm">₹{lastSettlementSlip.settledAmount}</strong> across <strong className="text-white">{lastSettlementSlip.settledOrdersCount}</strong> orders.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 12: CUSTOMER PRODUCT REVIEWS & STAR RATINGS               */}
        {/* ============================================================= */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Customer Ratings & Store Responses</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Customer Product Reviews
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    View real reviews, star ratings, and review photos submitted by customers. Publish official store responses that appear publicly on the storefront under menu items.
                  </p>
                </div>

                <button
                  onClick={fetchData}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Refresh Reviews</span>
                </button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-bold block mb-1">Total Reviews</span>
                <span className="text-2xl font-black text-white">{allReviews.length}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Across all menu items</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 bg-amber-950/10 shadow-md">
                <span className="text-xs text-amber-300 font-bold block mb-1">Average Star Rating</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-black text-amber-400">
                    {allReviews.length > 0
                      ? (allReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / allReviews.length).toFixed(1)
                      : '5.0'}
                  </span>
                  <div className="flex text-amber-400 text-sm">
                    {'★'.repeat(5)}
                  </div>
                </div>
                <span className="text-[10px] text-amber-400/80 block mt-1">Storewide customer score</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 bg-emerald-950/10 shadow-md">
                <span className="text-xs text-emerald-400 font-bold block mb-1">5-Star Super Ratings</span>
                <span className="text-2xl font-black text-emerald-400">
                  {allReviews.filter((r) => Number(r.rating) === 5).length}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-1">Highest customer praise</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-bold block mb-1">Unreplied Reviews</span>
                <span className="text-2xl font-black text-orange-400">
                  {allReviews.filter((r) => !r.adminReply?.comment).length}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Pending official store reply</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
                {['All', '5', '4', '3', '2', '1'].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRatingFilter(star)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      reviewRatingFilter === star
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {star === 'All' ? 'All Ratings' : `${star} ★`}
                  </button>
                ))}

                <div className="h-4 w-px bg-slate-700 mx-1" />

                {['All', 'unreplied', 'replied'].map((rep) => (
                  <button
                    key={rep}
                    onClick={() => setReviewReplyFilter(rep)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      reviewReplyFilter === rep
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {rep === 'All' ? 'All Replies' : rep === 'unreplied' ? 'Needs Reply' : 'Replied'}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reviewer, pizza, comment..."
                  value={reviewSearchTerm}
                  onChange={(e) => setReviewSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Reviews Cards List */}
            <div className="space-y-4">
              {allReviews
                .filter((r) => {
                  const matchesRating =
                    reviewRatingFilter === 'All' || String(r.rating) === reviewRatingFilter;
                  const matchesReply =
                    reviewReplyFilter === 'All' ||
                    (reviewReplyFilter === 'replied' ? !!r.adminReply?.comment : !r.adminReply?.comment);
                  const term = reviewSearchTerm.toLowerCase().trim();
                  const matchesSearch =
                    !term ||
                    (r.userName && r.userName.toLowerCase().includes(term)) ||
                    (r.productName && r.productName.toLowerCase().includes(term)) ||
                    (r.comment && r.comment.toLowerCase().includes(term));
                  return matchesRating && matchesReply && matchesSearch;
                })
                .map((rev) => {
                  const revId = rev._id || rev.reviewId;
                  const hasReply = !!rev.adminReply?.comment;
                  return (
                    <div
                      key={revId || Math.random()}
                      className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3.5 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                            {(rev.userName || 'Customer').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-sm">
                                {rev.userName || 'Customer'}
                              </span>
                              <div className="flex text-amber-400 text-xs">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <span key={i} className={i < (rev.rating || 5) ? 'text-amber-400' : 'text-slate-600'}>
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {new Date(rev.createdAt || Date.now()).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Product Pill */}
                        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                          {rev.productImage && (
                            <img
                              src={getImageUrl(rev.productImage)}
                              alt={rev.productName || 'Product'}
                              className="w-7 h-7 rounded-lg object-cover"
                            />
                          )}
                          <div className="text-left">
                            <span className="font-bold text-white text-xs block leading-tight">
                              {rev.productName || 'Menu Item'}
                            </span>
                            <span className="text-[10px] text-orange-400">
                              {rev.productCategory || 'Pizzas'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Review Comment Text */}
                      <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                        "{rev.comment || 'Great taste and fast delivery!'}"
                      </p>

                      {/* Attached Review Photo if any */}
                      {(rev.imageURL || rev.photo) && (
                        <div className="pt-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1.5">
                            Customer Attached Photo:
                          </span>
                          <a
                            href={getImageUrl(rev.imageURL || rev.photo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={getImageUrl(rev.imageURL || rev.photo)}
                              alt="Review attachment"
                              className="w-24 h-24 object-cover rounded-xl border border-slate-700 hover:scale-105 transition-all shadow-md"
                            />
                          </a>
                        </div>
                      )}

                      {/* Store Reply Block or Action Button */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {hasReply ? (
                          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Official Store Response ({rev.adminReply.repliedBy || 'Management'})</span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(rev.adminReply.repliedAt || Date.now()).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 italic">
                              "{rev.adminReply.comment}"
                            </p>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            No response posted yet. Write a response to show customers their feedback is valued.
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActiveReviewReplyModal({
                              productId: rev.productId,
                              reviewId: rev._id || rev.reviewId,
                              ...rev
                            });
                            setReviewReplyText(rev.adminReply?.comment || '');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-orange-500/20 transition-all shrink-0 cursor-pointer self-start sm:self-auto"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{hasReply ? 'Edit Response' : 'Reply to Review'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              {allReviews.length === 0 && (
                <div className="py-16 text-center text-slate-500 glass-panel rounded-2xl border border-slate-800">
                  <Star className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-40" />
                  <p className="text-xs font-bold text-slate-400">No customer reviews received yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Customer reviews submitted on product pages will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 13: CUSTOMER INQUIRIES & HELPDESK (CONTACT US)           */}
        {/* ============================================================= */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-blue-500/30 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold mb-3">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Helpdesk & Support Inquiries</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Customer Contact Inquiries
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Messages submitted by customers using the storefront Contact Us form. Review issues, mark inquiries resolved, and save internal resolution notes.
                  </p>
                </div>

                <button
                  onClick={fetchData}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
                  <span>Refresh Inquiries</span>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-bold block mb-1">Total Inquiries</span>
                <span className="text-2xl font-black text-white">{contactMessages.length}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Submitted from Contact page</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 bg-amber-950/10 shadow-md">
                <span className="text-xs text-amber-300 font-bold block mb-1">Pending Inquiries</span>
                <span className="text-2xl font-black text-amber-400">
                  {contactMessages.filter((m) => (m.status || '').toLowerCase() === 'pending').length}
                </span>
                <span className="text-[10px] text-amber-400/80 block mt-1">Needs attention / reply</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 bg-emerald-950/10 shadow-md">
                <span className="text-xs text-emerald-400 font-bold block mb-1">Resolved Inquiries</span>
                <span className="text-2xl font-black text-emerald-400">
                  {contactMessages.filter((m) => (m.status || '').toLowerCase() === 'resolved').length}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-1">Closed with response notes</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-2">
                {['All', 'pending', 'resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setInquiryStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      inquiryStatusFilter === st
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'All' ? 'All Inquiries' : st === 'pending' ? 'Pending Only' : 'Resolved'}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, message..."
                  value={inquirySearchTerm}
                  onChange={(e) => setInquirySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Inquiries List */}
            <div className="space-y-4">
              {contactMessages
                .filter((m) => {
                  const statusStr = (m.status || 'pending').toLowerCase();
                  const matchesStatus =
                    inquiryStatusFilter === 'All' ||
                    (inquiryStatusFilter === 'pending' ? statusStr === 'pending' : statusStr === 'resolved');
                  const term = inquirySearchTerm.toLowerCase().trim();
                  const matchesSearch =
                    !term ||
                    (m.name && m.name.toLowerCase().includes(term)) ||
                    (m.email && m.email.toLowerCase().includes(term)) ||
                    (m.phone && m.phone.includes(term)) ||
                    (m.subject && m.subject.toLowerCase().includes(term)) ||
                    (m.message && m.message.toLowerCase().includes(term));
                  return matchesStatus && matchesSearch;
                })
                .map((msg) => {
                  const isPending = (msg.status || 'pending').toLowerCase() === 'pending';
                  return (
                    <div
                      key={msg._id}
                      className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md ${
                            isPending ? 'bg-amber-600' : 'bg-emerald-600'
                          }`}>
                            {(msg.name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-sm">{msg.name || 'Customer'}</span>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  isPending
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {isPending ? 'Pending' : 'Resolved'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              {msg.email && <span>✉️ {msg.email}</span>}
                              {msg.phone && <span>📞 {msg.phone}</span>}
                              <span>• {new Date(msg.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Contact & Action Buttons */}
                        <div className="flex items-center space-x-2 self-start sm:self-auto">
                          {msg.phone && (
                            <a
                              href={`tel:${msg.phone}`}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all"
                              title="Call customer directly"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveInquiryModal(msg);
                              setInquiryReplyText(msg.adminResponse || '');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{msg.adminResponse ? 'Update Notes' : 'Respond / Resolve'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContactMessage(msg._id)}
                            className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
                            title="Delete inquiry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subject & Message Body */}
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                        {msg.subject && (
                          <span className="font-bold text-white text-xs block">
                            Subject: {msg.subject}
                          </span>
                        )}
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {msg.message}
                        </p>
                      </div>

                      {/* Staff Resolution Notes if any */}
                      {msg.adminResponse && (
                        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Resolution Notes ({msg.respondedBy || 'Admin'})</span>
                            </span>
                            {msg.respondedAt && (
                              <span className="text-[10px] text-slate-400">
                                {new Date(msg.respondedAt).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-200 italic">
                            "{msg.adminResponse}"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

              {contactMessages.length === 0 && (
                <div className="py-16 text-center text-slate-500 glass-panel rounded-2xl border border-slate-800">
                  <Mail className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-40" />
                  <p className="text-xs font-bold text-slate-400">No customer contact messages yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    When customers submit questions via the Contact page, they will show up here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: ADD / EDIT PRODUCT                               */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* MODAL 1: ADD / EDIT PRODUCT                               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto shadow-2xl space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {editingProduct ? 'Edit Menu Item & Details' : 'Add New Menu Item'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configure complete product specifications, local photo & custom variations
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hidden File Input for Device/Gallery Upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              <form onSubmit={handleSaveProduct} className="space-y-5">
                {/* 1. Item Name & Category */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apurva Royal Cheese Burst"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Pricing & Prep Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Base Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="e.g. 199"
                      value={productForm.basePrice}
                      onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Offer Price (₹, optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 179"
                      value={productForm.discountedPrice}
                      onChange={(e) => setProductForm({ ...productForm, discountedPrice: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Prep Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 15-20 Mins"
                      value={productForm.prepTime}
                      onChange={(e) => setProductForm({ ...productForm, prepTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 3. Product Photo: Local Device / Gallery Dropzone OR Food Gallery Presets OR Web Link */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                        <span>Product Photo & Presentation</span>
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Choose photo locally from device/phone gallery, pick from food presets, or provide a URL
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setImageInputMode('upload')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          imageInputMode === 'upload'
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        From Device
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('gallery')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          imageInputMode === 'gallery'
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Food Gallery
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('url')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          imageInputMode === 'url'
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Web Link
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Local Device / Gallery Upload with Drag & Drop */}
                  {imageInputMode === 'upload' && (
                    <div className="space-y-3">
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDropImage}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                          isDragOver
                            ? 'border-orange-500 bg-orange-500/15'
                            : 'border-slate-700/80 hover:border-orange-500/60 bg-slate-900/50 hover:bg-slate-900'
                        }`}
                      >
                        {uploadingImage ? (
                          <div className="py-2 flex flex-col items-center space-y-2">
                            <RefreshCw className="w-7 h-7 animate-spin text-orange-500" />
                            <span className="text-xs font-bold text-orange-400">
                              Uploading photo from device...
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-inner">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-200">
                                Click to browse or drag & drop photo here
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Select from computer files or phone gallery (JPEG, PNG, WEBP, up to 10MB)
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {productForm.imageURL && (
                        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <img
                              src={getImageUrl(productForm.imageURL)}
                              alt="Attached Preview"
                              className="w-14 h-14 rounded-xl object-cover border border-slate-700 shadow-md shrink-0"
                              onError={(e) => {
                                e.target.src =
                                  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';
                              }}
                            />
                            <div className="text-left overflow-hidden">
                              <p className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>Photo ready for product</span>
                              </p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[280px] sm:max-w-md mt-0.5">
                                {productForm.imageURL}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold text-xs shrink-0 transition-colors border border-slate-700"
                          >
                            Replace
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Curated Food Photo Gallery Presets */}
                  {imageInputMode === 'gallery' && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {['All', 'Pizzas', 'Burgers', 'Combos', 'Sides', 'Beverages', 'Desserts'].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setGalleryCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                              galleryCategoryFilter === cat
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                        {FOOD_GALLERY_PRESETS.filter(
                          (preset) =>
                            galleryCategoryFilter === 'All' || preset.category === galleryCategoryFilter
                        ).map((preset, idx) => {
                          const isSelected = productForm.imageURL === preset.url;
                          return (
                            <div
                              key={idx}
                              onClick={() =>
                                setProductForm((prev) => ({
                                  ...prev,
                                  imageURL: preset.url
                                }))
                              }
                              className={`relative group rounded-xl overflow-hidden border cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-orange-500 ring-2 ring-orange-500/50 shadow-md'
                                  : 'border-slate-800 hover:border-orange-500/40 bg-slate-900'
                              }`}
                            >
                              <div className="h-20 w-full overflow-hidden bg-slate-950">
                                <img
                                  src={preset.url}
                                  alt={preset.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                              <div className="p-1.5 bg-slate-900/90 text-left">
                                <p className="text-[10px] font-bold text-slate-200 truncate">
                                  {preset.name}
                                </p>
                                <span className="text-[9px] text-orange-400 uppercase font-semibold">
                                  {preset.category}
                                </span>
                              </div>
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Direct Web Link */}
                  {imageInputMode === 'url' && (
                    <div className="space-y-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={productForm.imageURL}
                        onChange={(e) => setProductForm({ ...productForm, imageURL: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors"
                      />
                      {productForm.imageURL && (
                        <div className="flex items-center space-x-3 bg-slate-900 p-2 rounded-xl border border-slate-800 w-fit">
                          <img
                            src={getImageUrl(productForm.imageURL)}
                            alt="Preview"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                          />
                          <span className="text-[11px] text-slate-400">Live Preview</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Complete Product Details: Dietary & Ingredients */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Dietary Classification / Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 100% Pure Veg, Chef's Special"
                      value={productForm.dietary}
                      onChange={(e) => setProductForm({ ...productForm, dietary: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {DIETARY_OPTIONS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setProductForm({ ...productForm, dietary: tag })}
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                            productForm.dietary === tag
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Ingredients & What it Contains
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mozzarella, Fior di Latte, Basil, Cherry Tomatoes, EVOO"
                      value={productForm.ingredients}
                      onChange={(e) => setProductForm({ ...productForm, ingredients: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Comma-separated list of ingredients displayed to the customer
                    </p>
                  </div>
                </div>

                {/* 5. Detailed Description */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Detailed Product Description & Taste Profile
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Rich description highlighting wood-fired baking, charred crust blisters, cheese pull stretch, and freshness..."
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>

                {/* 6. Key Highlights & Special Badges Manager */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Product Highlights & Special Badges</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Feature badges shown on the customer storefront (e.g. Wood-Fired, 100% Mozzarella)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomHighlight}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-400" />
                      <span>Custom Badge</span>
                    </button>
                  </div>

                  {/* Quick Preset Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_HIGHLIGHT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddHighlightPreset(preset)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-orange-500/20 text-slate-300 hover:text-orange-300 border border-slate-800 text-[10px] font-semibold flex items-center space-x-1 transition-colors"
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.title}</span>
                        <Plus className="w-2.5 h-2.5 text-slate-500" />
                      </button>
                    ))}
                  </div>

                  {/* Active Highlights List */}
                  {productForm.highlights && productForm.highlights.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {productForm.highlights.map((h, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 text-xs"
                        >
                          <input
                            type="text"
                            placeholder="Emoji"
                            value={h.icon || '✨'}
                            onChange={(e) => handleUpdateHighlight(idx, 'icon', e.target.value)}
                            className="w-12 text-center px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                          />
                          <input
                            type="text"
                            placeholder="Highlight Title (e.g. Wood-Fired Crust)"
                            value={h.title}
                            onChange={(e) => handleUpdateHighlight(idx, 'title', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                          />
                          <input
                            type="text"
                            placeholder="Brief description (optional)"
                            value={h.description || ''}
                            onChange={(e) => handleUpdateHighlight(idx, 'description', e.target.value)}
                            className="hidden sm:block flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveHighlight(idx)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      No highlights added. Click the chips above to add key features.
                    </p>
                  )}
                </div>

                {/* 7. Crust / Size Variations Manager */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-orange-500" />
                        <span>Size & Crust Variations (Optional)</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Add customizable sizes with specific prices (e.g. Regular, Medium, Large)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-400" />
                      <span>Add Size</span>
                    </button>
                  </div>

                  {productForm.sizes && productForm.sizes.length > 0 ? (
                    <div className="space-y-2">
                      {productForm.sizes.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 text-xs"
                        >
                          <input
                            type="text"
                            placeholder="e.g. Regular (7-inch)"
                            value={s.size}
                            onChange={(e) => handleUpdateSize(idx, 'size', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                          />
                          <div className="w-24 relative">
                            <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="Price"
                              value={s.price}
                              onChange={(e) => handleUpdateSize(idx, 'price', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          <div className="w-24 relative">
                            <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="Offer"
                              value={s.discountedPrice || ''}
                              onChange={(e) => handleUpdateSize(idx, 'discountedPrice', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSize(idx)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      No specific size variations added. Base price will be used.
                    </p>
                  )}
                </div>

                {/* 8. Inventory & Stock Quantity Management */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Inventory & Stock Quantity
                      </span>
                    </div>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={productForm.isUnlimitedStock}
                        onChange={(e) => {
                          const isUnlim = e.target.checked;
                          setProductForm({
                            ...productForm,
                            isUnlimitedStock: isUnlim,
                            stockQuantity: isUnlim ? '' : (productForm.stockQuantity || '10')
                          });
                        }}
                        className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-cyan-400">Unlimited Stock</span>
                    </label>
                  </div>

                  {!productForm.isUnlimitedStock ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Available Stock Quantity (Units)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={productForm.stockQuantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              const numVal = parseInt(val, 10);
                              setProductForm({
                                ...productForm,
                                stockQuantity: val,
                                isAvailable: numVal > 0 ? (productForm.isAvailable !== false) : false
                              });
                            }}
                            placeholder="e.g. 20"
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500 font-bold"
                          />
                        </div>
                        <div className="flex items-center space-x-1.5 pt-0 sm:pt-4">
                          {[5, 10, 25, 50, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setProductForm({
                                  ...productForm,
                                  stockQuantity: String(preset),
                                  isAvailable: true
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-extrabold text-slate-200 border border-slate-700 transition-all cursor-pointer"
                            >
                              +{preset}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-400 font-medium flex items-center space-x-1">
                        <span>⚡ When customer orders are placed, this quantity will automatically decrement. When it reaches 0, the item will immediately show as "OUT OF STOCK" across the online store.</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      This item has unlimited inventory and will remain available until manually disabled.
                    </p>
                  )}
                </div>

                {/* 9. Settings Toggles */}
                <div className="flex flex-wrap items-center gap-6 pt-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={productForm.allowToppings}
                      onChange={(e) => setProductForm({ ...productForm, allowToppings: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Allow Custom Toppings</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={productForm.isAvailable}
                      onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold text-emerald-400">In Stock / Available for Orders</span>
                  </label>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-orange-500/20"
                  >
                    {editingProduct ? 'Save & Update Item' : 'Add Item to Menu'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 2: COMPLETE PRODUCT DETAILS INSPECTOR               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedProductDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 max-h-[92vh] overflow-y-auto shadow-2xl space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🍕</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-white text-lg">
                        {selectedProductDetails.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                        {selectedProductDetails.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Product ID: {selectedProductDetails._id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProductDetails(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photo & Quick Specs Banner */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                <div className="md:col-span-5 relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 group">
                  <img
                    src={getImageUrl(selectedProductDetails.imageURL)}
                    alt={selectedProductDetails.name}
                    className="w-full h-52 object-cover"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black backdrop-blur-md ${
                        selectedProductDetails.isAvailable
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-950/80 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {selectedProductDetails.isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}
                    </span>
                    {selectedProductDetails.dietary && (
                      <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        {selectedProductDetails.dietary}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetProductForCardUpload(selectedProductDetails._id);
                      cardFileInputRef.current?.click();
                    }}
                    className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-orange-500/30 transition-all border border-orange-400/40"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Change Photo</span>
                  </button>
                </div>

                <div className="md:col-span-7 space-y-3.5">
                  {/* Price Block */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Base / Regular Price
                      </span>
                      <div className="flex items-baseline space-x-2 mt-0.5">
                        <span className="text-2xl font-black text-white">
                          ₹{selectedProductDetails.discountedPrice || selectedProductDetails.basePrice}
                        </span>
                        {selectedProductDetails.discountedPrice && (
                          <span className="text-sm text-slate-500 line-through">
                            ₹{selectedProductDetails.basePrice}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedProductDetails.discountedPrice && (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                        Save ₹{selectedProductDetails.basePrice - selectedProductDetails.discountedPrice}
                      </span>
                    )}
                  </div>

                  {/* Stock Quantity Status & Quick Adjuster in Inspector */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Inventory Stock
                      </span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span
                          className={`text-base font-black ${
                            !selectedProductDetails.isAvailable || (selectedProductDetails.stockQuantity !== null && selectedProductDetails.stockQuantity <= 0)
                              ? 'text-red-400'
                              : selectedProductDetails.stockQuantity !== null
                              ? 'text-emerald-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {selectedProductDetails.stockQuantity !== null && selectedProductDetails.stockQuantity !== undefined
                            ? `${selectedProductDetails.stockQuantity} units available`
                            : 'Unlimited Stock'}
                        </span>
                        {(!selectedProductDetails.isAvailable || (selectedProductDetails.stockQuantity !== null && selectedProductDetails.stockQuantity <= 0)) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickStockDelta(selectedProductDetails, -1)}
                        disabled={selectedProductDetails.stockQuantity === null || selectedProductDetails.stockQuantity <= 0}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-black text-xs flex items-center justify-center border border-slate-700 cursor-pointer"
                        title="Decrease stock by 1"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickStockDelta(selectedProductDetails, 1)}
                        disabled={selectedProductDetails.stockQuantity === null}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-black text-xs flex items-center justify-center border border-slate-700 cursor-pointer"
                        title="Increase stock by 1"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePromptSetStock(selectedProductDetails)}
                        className="px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-bold text-xs border border-orange-500/40 cursor-pointer"
                      >
                        Set Stock
                      </button>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Bake & Prep Time</span>
                      <span className="text-white font-bold">{selectedProductDetails.prepTime || '20 Mins'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Custom Toppings</span>
                      <span className="text-orange-400 font-bold">
                        {selectedProductDetails.allowToppings ? 'Allowed & Customizable' : 'Standard Prep Only'}
                      </span>
                    </div>
                  </div>

                  {/* Ingredients */}
                  {selectedProductDetails.ingredients && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Ingredients & Contents
                      </span>
                      <p className="text-xs text-slate-200">
                        {selectedProductDetails.ingredients}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Detailed Description & Story
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {selectedProductDetails.description || 'No detailed description specified.'}
                </p>
              </div>

              {/* Highlights & Badges */}
              {selectedProductDetails.highlights && selectedProductDetails.highlights.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Product Highlights ({selectedProductDetails.highlights.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedProductDetails.highlights.map((h, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                      >
                        <span className="text-lg">{h.icon || '✨'}</span>
                        <div>
                          <span className="font-bold text-white block">{h.title}</span>
                          {h.description && (
                            <span className="text-[10px] text-slate-400">{h.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Crust & Size Variations */}
              {selectedProductDetails.sizes && selectedProductDetails.sizes.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Available Size Variations ({selectedProductDetails.sizes.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {selectedProductDetails.sizes.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex justify-between items-center"
                      >
                        <span className="font-bold text-white">{s.size}</span>
                        <div className="text-right">
                          <span className="font-black text-orange-400 block">
                            ₹{s.discountedPrice || s.price}
                          </span>
                          {s.discountedPrice && (
                            <span className="text-[10px] text-slate-500 line-through">
                              ₹{s.price}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Reviews & Feedback Section */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <MessageSquareQuote className="w-4 h-4 text-orange-400" />
                    <h4 className="text-xs font-bold text-white">Customer Reviews & Photos</h4>
                  </div>
                  <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{selectedProductDetails.averageRating ? selectedProductDetails.averageRating.toFixed(1) : '4.9'}</span>
                    <span className="text-[10px] text-slate-400">
                      ({selectedProductDetails.totalReviews || selectedProductDetails.reviews?.length || 0} reviews)
                    </span>
                  </div>
                </div>

                {selectedProductDetails.reviews && selectedProductDetails.reviews.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedProductDetails.reviews.map((rev, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center">
                              {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="text-xs font-bold text-white">{rev.userName}</span>
                            <span className="text-[10px] text-slate-500">
                              {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN') : ''}
                            </span>
                          </div>
                          <div className="flex items-center space-x-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-slate-300">{rev.comment}</p>

                        {rev.imageURL && (
                          <div className="pt-1 flex items-center space-x-2">
                            <img
                              src={getImageUrl(rev.imageURL)}
                              alt="Review Photo"
                              className="w-16 h-16 rounded-xl object-cover border border-slate-700 cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => window.open(getImageUrl(rev.imageURL), '_blank')}
                            />
                            <span className="text-[10px] text-slate-500">
                              Customer photo • Click to view full size
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">
                    No customer reviews posted yet for this menu item.
                  </p>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditProduct(selectedProductDetails);
                    setSelectedProductDetails(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 transition-all flex items-center space-x-1.5 shadow-md shadow-orange-500/20"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Specifications</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProductDetails(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 2: ORDER DETAILS INSPECTOR                          */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <h3 className="font-mono font-bold text-white text-base">
                    Order #{selectedOrderDetails._id.slice(-6).toUpperCase()}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">
                    {selectedOrderDetails.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white text-sm">{selectedOrderDetails.user?.name || 'Walk-in Guest'}</span>
                      {selectedOrderDetails.user?.phone && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Account Phone: {String(selectedOrderDetails.user.phone).slice(0, 2)}••••••{String(selectedOrderDetails.user.phone).slice(-2)} (Masked)
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Calling Number (Delivery)
                      </div>
                      {selectedOrderDetails.deliveryPhone ? (
                        <a
                          href={`tel:${selectedOrderDetails.deliveryPhone}`}
                          className="text-orange-400 hover:text-orange-300 font-mono font-black text-sm flex items-center gap-1 justify-end mt-0.5 hover:underline"
                        >
                          <span>📞</span>
                          <span>{selectedOrderDetails.deliveryPhone}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">None provided</span>
                      )}
                    </div>
                  </div>
                  {selectedOrderDetails.deliveryAddress && (
                    <div className="text-slate-300">
                      <span className="text-slate-400 font-semibold">Address: </span>
                      {selectedOrderDetails.deliveryAddress}
                    </div>
                  )}
                  {selectedOrderDetails.deliveryDistance !== undefined && selectedOrderDetails.deliveryDistance !== null && (
                    <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">
                        📍 Distance: <strong className="text-white">{selectedOrderDetails.deliveryDistance} km</strong> {selectedOrderDetails.deliveryLocationName ? `(${selectedOrderDetails.deliveryLocationName})` : ''}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        Number(selectedOrderDetails.deliveryFee) === 0
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      }`}>
                        {Number(selectedOrderDetails.deliveryFee) === 0 ? '🟢 FREE DELIVERY (<5km)' : `Delivery Fee: ₹${selectedOrderDetails.deliveryFee}`}
                      </span>
                    </div>
                  )}
                  {selectedOrderDetails.customerCoords?.latitude && selectedOrderDetails.customerCoords?.longitude && (
                    <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">
                        🛰️ GPS: <strong className="text-slate-200 font-mono">{selectedOrderDetails.customerCoords.latitude.toFixed(4)}, {selectedOrderDetails.customerCoords.longitude.toFixed(4)}</strong>
                        {selectedOrderDetails.customerCoords.accuracy && (
                          <span className="text-[10px] text-slate-500 ml-1">(±{Math.round(selectedOrderDetails.customerCoords.accuracy)}m)</span>
                        )}
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${selectedOrderDetails.customerCoords.latitude},${selectedOrderDetails.customerCoords.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold hover:bg-blue-500/30"
                      >
                        Open Maps ↗
                      </a>
                    </div>
                  )}
                </div>

                {selectedOrderDetails.customerNote && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 font-bold">
                    Special Kitchen Request: {selectedOrderDetails.customerNote}
                  </div>
                )}

                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-2.5 bg-slate-800/80 font-bold text-slate-300">Items Ordered</div>
                  <div className="divide-y divide-slate-800 p-2.5 space-y-2">
                    {selectedOrderDetails.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start pt-1">
                        <div>
                          <div className="font-bold text-white">
                            {item.quantity}x {item.name}
                          </div>
                          {item.size && <div className="text-[10px] text-slate-400">Size: {item.size}</div>}
                          {item.toppings && item.toppings.length > 0 && (
                            <div className="text-[10px] text-orange-400">+ {item.toppings.join(', ')}</div>
                          )}
                        </div>
                        <div className="font-bold text-white">
                          ₹{Number(item.price) * Number(item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-white">
                      ₹{Number(selectedOrderDetails.itemsAmount || (selectedOrderDetails.items || []).reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Delivery Fee ({selectedOrderDetails.deliveryDistance ? `${selectedOrderDetails.deliveryDistance}km` : 'Standard'}):</span>
                    <span className={`font-bold ${Number(selectedOrderDetails.deliveryFee) === 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {Number(selectedOrderDetails.deliveryFee) > 0 ? `₹${Number(selectedOrderDetails.deliveryFee).toFixed(2)}` : 'FREE (₹0.00)'}
                    </span>
                  </div>
                  {Number(selectedOrderDetails.platformFee || 0) > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Platform Fee:</span>
                      <span className="font-bold text-white">₹{Number(selectedOrderDetails.platformFee).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 text-sm font-black text-white border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="text-base text-orange-400">₹{Number(selectedOrderDetails.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                {selectedOrderDetails.status !== 'Cancelled' && (
                  <button
                    onClick={() => {
                      setAdminCancelOrderModal(selectedOrderDetails);
                      setAdminCancelReason('Cancelled by Store Admin');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-red-300 bg-red-950/60 hover:bg-red-900/80 border border-red-500/30 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5 text-red-400" />
                    <span>Cancel Order</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedPrintOrder(selectedOrderDetails);
                    setSelectedOrderDetails(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => {
                    setTaxInvoiceOrder(selectedOrderDetails);
                    setSelectedOrderDetails(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>GST Tax Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: ADMIN CANCEL ORDER CONFIRMATION                   */}
      {/* ========================================================= */}
      <AnimatePresence>
        {adminCancelOrderModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-white"
            >
              <button
                type="button"
                onClick={() => setAdminCancelOrderModal(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    Admin Order Cancellation
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order #{adminCancelOrderModal._id.slice(-6).toUpperCase()} • Status: <span className="font-bold text-orange-400">{adminCancelOrderModal.status}</span>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-xs text-red-200 mb-4 leading-relaxed">
                As Store Administrator, you have full authority to cancel any order. Items will be automatically restored to inventory, applied promo discount limits released, and live WebSocket cancellation alerts sent to Kitchen and Customer.
              </div>

              <form onSubmit={handleConfirmAdminCancel} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Cancellation Reason
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 mb-2">
                    {[
                      'Cancelled by Store Admin',
                      'Customer Requested Immediate Cancellation',
                      'Payment Issue / Disputed Charge',
                      'Unreachable Phone / Incorrect Address',
                      'Out of Delivery Range / Boundary Exceeded'
                    ].map((reasonOption) => (
                      <button
                        key={reasonOption}
                        type="button"
                        onClick={() => setAdminCancelReason(reasonOption)}
                        className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          adminCancelReason === reasonOption
                            ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                        }`}
                      >
                        • {reasonOption}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Enter custom cancellation reason..."
                    value={adminCancelReason}
                    onChange={(e) => setAdminCancelReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setAdminCancelOrderModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={isAdminCancelling}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-black shadow-lg shadow-red-500/25 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isAdminCancelling ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: DELIVERY HANDOVER OTP VERIFICATION                */}
      {/* ========================================================= */}
      <AnimatePresence>
        {otpVerifyModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-white"
            >
              <button
                type="button"
                onClick={() => {
                  setOtpVerifyModal(null);
                  setInputOtp('');
                  setOtpModalError('');
                }}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    Delivery Handover Verification
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order #{otpVerifyModal.orderId.slice(-6).toUpperCase()} • Customer: <span className="font-bold text-white">{otpVerifyModal.order?.user?.name || 'Walk-in'}</span>
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 mb-4 leading-relaxed">
                <p className="font-semibold mb-1">🔐 4-Digit Handover PIN Required</p>
                Please ask the customer at the counter or doorstep for their 4-digit Handover PIN to confirm receipt before marking as Delivered.
              </div>

              {otpModalError && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{otpModalError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 text-center">
                    Enter Customer 4-Digit PIN
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    autoFocus
                    placeholder="• • • •"
                    value={inputOtp}
                    onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[1em] text-3xl font-mono font-black py-3 rounded-2xl bg-slate-950 border-2 border-amber-500/50 text-amber-400 placeholder-slate-700 focus:outline-none focus:border-amber-400"
                  />
                  {otpVerifyModal.order?.deliveryOtp && (
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                      Admin Quick Reference: <span className="font-mono font-bold text-slate-300">{otpVerifyModal.order.deliveryOtp}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={verifyingOtp || inputOtp.length !== 4}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {verifyingOtp ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Verify PIN & Complete Delivery</span>
                  </button>

                  {featureSettings?.handoverOtp?.allowAdminBypass && (
                    <button
                      type="button"
                      onClick={handleAdminBypassOtp}
                      disabled={verifyingOtp}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Emergency Bypass (Customer Phone Discharged)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOtpVerifyModal(null);
                      setInputOtp('');
                      setOtpModalError('');
                    }}
                    className="w-full py-2 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT DELIVERY LOCATION                       */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-slate-100"
            >
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      {editingLocationIndex !== null ? 'Edit Delivery Area' : 'Add Delivery Area'}
                    </h3>
                    <p className="text-[11px] text-slate-400">Pathardewa regional delivery network</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLocationForm} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Village / Locality Name <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Murarchhapar, Tarkulwa Road, Bagaha"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Distance (km) <span className="text-orange-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        placeholder="e.g. 3.2"
                        value={locationForm.distanceKm}
                        onChange={(e) =>
                          setLocationForm((prev) => ({ ...prev, distanceKm: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500 text-xs font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                        km
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Min Order Value (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        placeholder="149"
                        value={locationForm.minOrderAmount}
                        onChange={(e) =>
                          setLocationForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))
                        }
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Distance & Charge Preview */}
                {locationForm.distanceKm !== '' && !isNaN(Number(locationForm.distanceKm)) && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Delivery Charge Calculation Preview:
                    </span>
                    {Number(locationForm.distanceKm) <= Number(deliveryRadiusForm.freeDeliveryRadiusKm || 5) ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Eligible for 100% FREE DELIVERY (Under 5km threshold)</span>
                      </span>
                    ) : (
                      <span className="text-orange-400 font-bold flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        <span>
                          Delivery Fee: ₹
                          {Math.ceil(
                            (Number(locationForm.distanceKm) - Number(deliveryRadiusForm.freeDeliveryRadiusKm || 5)) *
                              Number(deliveryRadiusForm.extraChargePerKm || 10)
                          )}{' '}
                          (5km Free + {(Number(locationForm.distanceKm) - Number(deliveryRadiusForm.freeDeliveryRadiusKm || 5)).toFixed(1)} km extra)
                        </span>
                      </span>
                    )}
                  </div>
                )}

                <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={locationForm.isDeliverable}
                    onChange={(e) =>
                      setLocationForm((prev) => ({ ...prev, isDeliverable: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-700 bg-slate-950 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    Actively open for delivery orders
                  </span>
                </label>

                <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 cursor-pointer shadow-lg shadow-orange-500/20"
                  >
                    {editingLocationIndex !== null ? 'Update Area' : 'Add Area'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: CREATE STAFF / KITCHEN / ADMIN ACCOUNT             */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isStaffModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-100"
            >
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                      staffForm.role === 'kitchen'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}
                  >
                    {staffForm.role === 'kitchen' ? <ChefHat className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Create Staff Account</h3>
                    <p className="text-[11px] text-slate-400">
                      {staffForm.role === 'kitchen' ? 'Kitchen Display System (KDS) access' : 'Full Administrator access'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateStaffAccount} className="p-5 space-y-4 text-xs">
                {staffFormError && (
                  <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{staffFormError}</span>
                  </div>
                )}

                {staffFormSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{staffFormSuccess}</span>
                  </div>
                )}

                {/* Role Selection Cards */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Select Account Role <span className="text-orange-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setStaffForm((prev) => ({ ...prev, role: 'kitchen' }))}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        staffForm.role === 'kitchen'
                          ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xl">👨‍🍳</span>
                        {staffForm.role === 'kitchen' && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        )}
                      </div>
                      <div className="font-bold text-xs text-white">Kitchen Staff</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                        Live order prep (KDS) & tickets
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStaffForm((prev) => ({ ...prev, role: 'driver' }))}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        staffForm.role === 'driver'
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/20 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xl">🛵</span>
                        {staffForm.role === 'driver' && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                      </div>
                      <div className="font-bold text-xs text-white">Delivery Rider</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                        Rider Portal, GPS Nav & PIN
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStaffForm((prev) => ({ ...prev, role: 'admin' }))}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        staffForm.role === 'admin'
                          ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-500/20 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xl">🛡️</span>
                        {staffForm.role === 'admin' && (
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        )}
                      </div>
                      <div className="font-bold text-xs text-white">Administrator</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                        Full access: Catalog, roles & settings
                      </div>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Staff Member Name <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chef Rajesh, Manager Aman"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
                  />
                </div>

                {/* Username & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Login Username <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. chef_rajesh, admin2"
                      value={staffForm.username}
                      onChange={(e) =>
                        setStaffForm((prev) => ({
                          ...prev,
                          username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Used to log into staff console</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Mobile Number (Optional)
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Can also log in with this phone</p>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Login Password <span className="text-orange-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showStaffPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters strong password"
                      value={staffForm.password}
                      onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Avoid simple numbers like 123456 or single names</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStaff}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {isSubmittingStaff ? (
                      <span>Creating...</span>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create {staffForm.role === 'kitchen' ? 'Kitchen' : 'Admin'} Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: CREATE COUPON                                      */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isCouponModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {editingCouponId ? `Edit Coupon: ${couponForm.code}` : 'Create Promo Coupon'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {editingCouponId
                        ? 'Update discount rates, customer repeat rules, and limits'
                        : 'Offer percentage or flat discounts with custom usage & repeat limits'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCouponModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {couponError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{couponError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCouponSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {/* Code & Discount Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FESTIVE20"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Discount Type
                    </label>
                    <select
                      value={couponForm.discountType}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, discountType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500 text-xs font-semibold"
                    >
                      <option value="percentage">Percentage (% OFF)</option>
                      <option value="flat">Flat Amount (₹ OFF)</option>
                    </select>
                  </div>
                </div>

                {/* Discount Value, Min Cart, Max Cap */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder={couponForm.discountType === 'percentage' ? '20 (%)' : '50 (₹)'}
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, discountValue: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Min. Cart (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 299"
                      value={couponForm.minOrderAmount}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, minOrderAmount: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Max Cap (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={couponForm.discountType === 'flat'}
                      placeholder={couponForm.discountType === 'flat' ? 'N/A' : 'e.g. 100'}
                      value={couponForm.maxDiscount}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, maxDiscount: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs font-semibold disabled:opacity-40"
                    />
                  </div>
                </div>

                {/* Total Usage Limit across all users */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-orange-400" />
                      <span>Total Users Limit (Expires after N uses)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50 (Leave blank for Unlimited)"
                      value={couponForm.totalUsageLimit}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, totalUsageLimit: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs font-semibold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Coupon automatically expires once {couponForm.totalUsageLimit ? `${couponForm.totalUsageLimit} customers` : 'N customers'} redeem it.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Expiry Date (Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={couponForm.expiryDate}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500 text-xs font-semibold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Optional calendar cutoff date for seasonal discounts.
                    </p>
                  </div>
                </div>

                {/* Customer Repeat Use Rule & Per-User Limit */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Customer Repeat Use Option</span>
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Can the same customer redeem this coupon more than once?
                      </p>
                    </div>

                    <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setCouponForm(prev => ({ ...prev, allowRepeatUsage: false, maxUsagePerUser: '1' }))}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          !couponForm.allowRepeatUsage
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Single Use Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setCouponForm(prev => ({ ...prev, allowRepeatUsage: true }))}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          couponForm.allowRepeatUsage
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Repeat Allowed
                      </button>
                    </div>
                  </div>

                  {couponForm.allowRepeatUsage ? (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      <label className="block text-[11px] font-bold text-slate-300">
                        How Many Times Can a Single Customer Use This Coupon?
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 3 (Leave blank for Unlimited repeat use)"
                        value={couponForm.maxUsagePerUser}
                        onChange={(e) => setCouponForm(prev => ({ ...prev, maxUsagePerUser: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                      />
                      <p className="text-[10px] text-emerald-400">
                        {couponForm.maxUsagePerUser
                          ? `✅ Each customer is allowed at most ${couponForm.maxUsagePerUser} redemption(s).`
                          : '✅ Customers can reuse this coupon unlimited times until total limit or expiry.'}
                      </p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>
                        <strong>Single use per customer:</strong> Each customer can use this coupon <strong>only 1 time</strong>. Any repeated attempts will be rejected.
                      </span>
                    </div>
                  )}
                </div>

                {/* Offer Description */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Customer Offer Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat ₹50 OFF on orders above ₹249"
                    value={couponForm.description}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCouponModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCoupon}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>
                      {isSubmittingCoupon
                        ? 'Saving...'
                        : (editingCouponId ? 'Update Coupon Code' : 'Save & Activate Code')}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: DISPATCH / ASSIGN RIDER                            */}
      {/* ========================================================= */}
      <AnimatePresence>
        {adminDispatchOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Assign Delivery Rider</h3>
                    <p className="text-xs text-slate-400">
                      Order #{adminDispatchOrder._id.slice(-6).toUpperCase()} • ₹{Number(adminDispatchOrder.totalAmount).toFixed(0)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAdminDispatchOrder(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Order quick recap */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="font-semibold">Customer:</span>
                  <span className="font-bold text-white">{adminDispatchOrder.user?.name || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-semibold">Phone:</span>
                  <span className="font-mono text-orange-400">{adminDispatchOrder.deliveryPhone || adminDispatchOrder.user?.phone || 'N/A'}</span>
                </div>
                <div className="text-slate-400 text-[11px] truncate pt-1 border-t border-slate-800/60">
                  📍 {adminDispatchOrder.deliveryAddress?.street || 'Local delivery'}
                </div>
              </div>

              {/* Quick Select Presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Delivery Rider or Hub Fleet
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {driversList.length > 0 ? (
                    driversList.map((preset) => (
                      <button
                        key={preset._id || preset.name}
                        type="button"
                        onClick={() => {
                          setAdminRiderName(preset.name);
                          setAdminRiderPhone(preset.phone || '');
                          if (preset._id) setAdminRiderUserId(preset._id);
                        }}
                        className="p-2 text-left rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 transition-all cursor-pointer"
                      >
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          <Truck className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{preset.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{preset.phone || 'No phone'}</div>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-2 text-xs text-slate-500 bg-slate-800/40 rounded-xl border border-slate-800">
                      No active riders found. Enter rider details manually below.
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleAdminAssignRiderSubmit} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Rider Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter rider name"
                    value={adminRiderName}
                    onChange={(e) => setAdminRiderName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Rider Phone Number (For Customer & Dispatch)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={adminRiderPhone}
                    onChange={(e) => setAdminRiderPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAdminDispatchOrder(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adminDispatching}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>{adminDispatching ? 'Dispatching...' : 'Dispatch & Set Out for Delivery'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: SHOP OPEN / CLOSE & OPERATING HOURS                */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isShopStatusModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    shopStatus.isOpen
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Store Operating Hours & Status</h3>
                    <p className="text-xs text-slate-400">Automatic schedule or manual open/close override</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsShopStatusModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Status Pill */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                shopStatus.isOpen
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/30 text-red-200'
              }`}>
                <div className="flex items-center space-x-2.5">
                  <span className={`w-3 h-3 rounded-full ${shopStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">
                      {shopStatus.isOpen ? 'Store is Currently OPEN' : 'Store is Currently CLOSED'}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {shopStatus.openMode === 'auto'
                        ? `Operating daily: ${shopStatus.openingTime} – ${shopStatus.closingTime}`
                        : `Manual mode active (${shopStatus.manualStatus})`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickToggleShopOpen}
                  disabled={isSubmittingShopStatus}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    shopStatus.isOpen
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/40'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {shopStatus.isOpen ? 'Force Close' : 'Force Open'}
                </button>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Operating Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShopStatus(prev => ({ ...prev, openMode: 'auto' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      shopStatus.openMode === 'auto'
                        ? 'bg-orange-500/20 border-orange-500/50 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <span className="font-bold text-xs">Automatic Schedule</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Opens & closes automatically based on configured hours
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShopStatus(prev => ({ ...prev, openMode: 'manual' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      shopStatus.openMode === 'manual'
                        ? 'bg-orange-500/20 border-orange-500/50 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <ToggleRight className="w-4 h-4 text-orange-400" />
                      <span className="font-bold text-xs">Manual Override</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Always stays open or closed until you toggle it
                    </p>
                  </button>
                </div>
              </div>

              {/* Manual mode selector */}
              {shopStatus.openMode === 'manual' && (
                <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Manual Store State
                  </label>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-white cursor-pointer">
                      <input
                        type="radio"
                        name="manualStatus"
                        value="open"
                        checked={shopStatus.manualStatus === 'open'}
                        onChange={(e) => setShopStatus(prev => ({ ...prev, manualStatus: e.target.value }))}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>🟢 Forced Open</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs font-semibold text-white cursor-pointer">
                      <input
                        type="radio"
                        name="manualStatus"
                        value="closed"
                        checked={shopStatus.manualStatus === 'closed'}
                        onChange={(e) => setShopStatus(prev => ({ ...prev, manualStatus: e.target.value }))}
                        className="text-red-500 focus:ring-red-500"
                      />
                      <span>🔴 Forced Closed</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Automatic hours inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Daily Opening Time (24h)
                  </label>
                  <input
                    type="time"
                    value={shopStatus.openingTime || '10:00'}
                    onChange={(e) => setShopStatus(prev => ({ ...prev, openingTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Daily Closing Time (24h)
                  </label>
                  <input
                    type="time"
                    value={shopStatus.closingTime || '23:00'}
                    onChange={(e) => setShopStatus(prev => ({ ...prev, closingTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Closed message */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Customer Message When Closed
                </label>
                <textarea
                  rows={2}
                  value={shopStatus.closedMessage || ''}
                  onChange={(e) => setShopStatus(prev => ({ ...prev, closedMessage: e.target.value }))}
                  placeholder="e.g. We are currently closed for orders. Our daily hours are 10:00 AM – 11:00 PM."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs resize-none"
                />
              </div>

              {/* Preorders checkbox */}
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shopStatus.allowPreorders !== false}
                  onChange={(e) => setShopStatus(prev => ({ ...prev, allowPreorders: e.target.checked }))}
                  className="rounded border-slate-700 text-orange-500 focus:ring-orange-500"
                />
                <span>Allow customers to schedule deliveries for later today when closed</span>
              </label>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsShopStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingShopStatus}
                  onClick={async () => {
                    await handleUpdateShopStatus();
                    setIsShopStatusModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingShopStatus ? 'Saving...' : 'Save Store Hours & Status'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: RESTOCK RAW INGREDIENT                             */}
      {/* ========================================================= */}
      <AnimatePresence>
        {restockModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-orange-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Restock Ingredient</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {restockModalItem.name} ({restockModalItem.itemCode})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRestockModalItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Current Stock:</span>
                <span className="font-black text-white text-sm">
                  {restockModalItem.currentStock} {restockModalItem.unit}
                </span>
              </div>

              <form onSubmit={handleRestockSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Quantity to Add ({restockModalItem.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 50"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Restock Notes / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fresh daily morning batch from dairy"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRestockModalItem(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRestock}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSubmittingRestock ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Confirm Restock</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: SETTLE RIDER COD CASH                              */}
      {/* ========================================================= */}
      <AnimatePresence>
        {settleModalRider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Settle Shift COD Cash</h3>
                    <p className="text-xs text-slate-400">
                      Rider: <strong className="text-white">{settleModalRider.riderName}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSettleModalRider(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-1">
                <span className="text-xs text-emerald-300 font-bold block">Cash to Receive & Clear</span>
                <span className="text-3xl font-black text-white font-mono">
                  ₹{Number(settleModalRider.unsettledCash).toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Across {settleModalRider.orderCount} COD delivered orders
                </span>
              </div>

              <form onSubmit={handleSettleRiderCOD} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Settlement Notes / Handover Verification
                  </label>
                  <input
                    type="text"
                    required
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSettleModalRider(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSettlement}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSubmittingSettlement ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Confirm Handover & Clear</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: DINE-IN TABLE QR TENT CARDS GENERATOR              */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isTableQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Table QR Tent Card Generator</h3>
                    <p className="text-xs text-slate-400">
                      Contactless table ordering cards for Dine-In guests
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTableQrModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Table Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Dine-In Table Number:
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQrSelectedTable(String(num))}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        qrSelectedTable === String(num)
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      T-{num}
                    </button>
                  ))}
                </div>
              </div>

              {/* High-Resolution Printable Tent Card Preview */}
              <div id="printable-tent-card" className="p-6 rounded-2xl bg-white text-slate-900 text-center border-4 border-amber-500 space-y-3 shadow-xl">
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-amber-600 uppercase tracking-widest">
                    🍕 APURVA PIZZA HUB
                  </div>
                  <div className="text-lg font-black text-slate-900 tracking-tight">
                    Wood-Fired Pizza & Fast Food
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Pathardewa, Deoria (U.P.) • Contactless Dine-In Ordering
                  </div>
                </div>

                <div className="my-2 p-3 bg-amber-50 rounded-2xl border-2 border-amber-400 inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `${window.location.protocol}//${window.location.hostname}:5173/?table=${qrSelectedTable}`
                    )}`}
                    alt={`Table ${qrSelectedTable} QR`}
                    className="w-44 h-44 mx-auto rounded-lg"
                  />
                  <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                    TABLE #{qrSelectedTable}
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-700 space-y-1">
                  <p>1. Open Camera or Google Lens & Scan QR</p>
                  <p>2. Choose Your Pizza, Combos & Beverages</p>
                  <p className="text-amber-700">3. Served Fresh & Piping Hot to Table #{qrSelectedTable}!</p>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono flex items-center justify-between px-2">
                  <span>📶 Free Guest Wi-Fi: ApurvaGuest</span>
                  <span>🔒 Direct Kitchen POS Link</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTableQrModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    const cardHtml = document.getElementById('printable-tent-card').innerHTML;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Table ${qrSelectedTable} QR Tent Card - Apurva Pizza Hub</title>
                          <style>
                            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 90vh; margin: 0; background: #fafafa; }
                            .card { border: 3px solid #f59e0b; padding: 24px; border-radius: 16px; background: white; text-align: center; max-width: 360px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                            img { width: 200px; height: 200px; margin: 12px auto; display: block; }
                          </style>
                        </head>
                        <body>
                          <div class="card">${cardHtml}</div>
                          <script>window.onload = function() { window.print(); }<\/script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 text-slate-950 font-black text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-950" />
                  <span>Print Table #{qrSelectedTable} Tent Card</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: OFFICIAL GST TAX INVOICE (INDIAN RESTAURANT FORMAT) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {taxInvoiceOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Official GST Tax Invoice</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Invoice #INV-APH-{taxInvoiceOrder._id.slice(-6).toUpperCase()} • GSTIN: 09AAHCA1234F1Z5
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTaxInvoiceOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Printable Invoice Container */}
              <div id="printable-gst-invoice" className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-300 text-xs space-y-4 font-sans shadow-sm">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      APURVA PIZZA HUB & FAST FOOD
                    </h2>
                    <p className="text-[11px] text-slate-600">Main Market Road, Near SBI Bank, Pathardewa, Deoria (U.P.) - 274404</p>
                    <p className="text-[11px] text-slate-600 font-bold">Phone: +91 73796 82620 • Email: contact@apurvapizzahub.com</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-mono font-bold text-slate-800">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">GSTIN: 09AAHCA1234F1Z5</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">FSSAI: 22723115000142</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">SAC: 996331</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded bg-slate-900 text-white text-xs font-black uppercase">
                      TAX INVOICE
                    </span>
                    <div className="mt-1 text-[11px] text-slate-600">
                      <div>Date: <strong className="text-slate-900">{new Date(taxInvoiceOrder.createdAt).toLocaleDateString('en-IN')}</strong></div>
                      <div>Time: <strong className="text-slate-900">{new Date(taxInvoiceOrder.createdAt).toLocaleTimeString('en-IN')}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Bill To & Fulfillment Info */}
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Billed To (Customer):</span>
                    <div className="font-bold text-slate-900 text-sm">{taxInvoiceOrder.user?.name || 'Walk-in Guest'}</div>
                    <div className="font-mono text-slate-700">📞 {taxInvoiceOrder.deliveryPhone || taxInvoiceOrder.user?.phone || 'No phone'}</div>
                    {taxInvoiceOrder.deliveryAddress && (
                      <div className="text-[11px] text-slate-600 mt-0.5">{taxInvoiceOrder.deliveryAddress}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Order Details:</span>
                    <div className="font-mono font-bold text-slate-900">Order ID: #{taxInvoiceOrder._id.slice(-6).toUpperCase()}</div>
                    <div className="font-bold text-orange-600 uppercase">
                      {taxInvoiceOrder.orderType === 'dine_in'
                        ? `🍽️ Dine-In (Table ${taxInvoiceOrder.tableNumber || '1'})`
                        : (taxInvoiceOrder.orderType === 'takeaway' ? '🥡 Counter Takeaway' : '🛵 Doorstep Delivery')}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Payment: <strong className="uppercase">{(taxInvoiceOrder.paymentMethod || 'COD')}</strong> ({taxInvoiceOrder.paymentStatus === 'paid' ? 'PAID' : 'COLLECT CASH'})
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Item Description</th>
                      <th className="py-2 px-2">SAC</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Rate (₹)</th>
                      <th className="py-2 px-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {taxInvoiceOrder.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-2 font-bold text-slate-900">
                          {it.name} {it.size ? `(${it.size})` : ''}
                          {it.customPizza && (
                            <div className="text-[10px] font-normal text-amber-700">
                              Custom Pizza {it.customPizza.isHalfAndHalf ? '(Half & Half)' : ''} {it.customPizza.extraCheeseBurst ? '+ Cheese Burst' : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-500 text-[10px]">996331</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-800">{it.quantity}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-700">₹{Number(it.price).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">₹{Number(it.price * it.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tax & Total Calculation Breakdown */}
                <div className="pt-2 border-t-2 border-slate-300 flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Food Subtotal:</span>
                      <span className="font-mono font-bold text-slate-800">
                        ₹{Number(taxInvoiceOrder.itemsPrice || (taxInvoiceOrder.totalAmount - (taxInvoiceOrder.deliveryFee || 0))).toFixed(2)}
                      </span>
                    </div>

                    {Number(taxInvoiceOrder.coupon?.discountAmount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Coupon Discount ({taxInvoiceOrder.coupon.code}):</span>
                        <span className="font-mono">-₹{Number(taxInvoiceOrder.coupon.discountAmount).toFixed(2)}</span>
                      </div>
                    )}

                    {Number(taxInvoiceOrder.deliveryFee || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery & Packing Fee:</span>
                        <span className="font-mono font-bold text-slate-800">₹{Number(taxInvoiceOrder.deliveryFee).toFixed(2)}</span>
                      </div>
                    )}

                    {/* GST 5% Breakdown (CGST 2.5% + SGST 2.5%) */}
                    <div className="pt-1.5 border-t border-slate-200 space-y-1">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>CGST (2.5%):</span>
                        <span className="font-mono font-bold text-slate-800">
                          ₹{Number(taxInvoiceOrder.taxDetails?.cgst || ((taxInvoiceOrder.totalAmount * 0.05) / 2)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>SGST (2.5%):</span>
                        <span className="font-mono font-bold text-slate-800">
                          ₹{Number(taxInvoiceOrder.taxDetails?.sgst || ((taxInvoiceOrder.totalAmount * 0.05) / 2)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center text-sm font-black text-slate-900">
                      <span>Net Total Payable:</span>
                      <span className="text-base font-mono">₹{Number(taxInvoiceOrder.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 text-center leading-relaxed">
                  <p>Restaurant Service without ITC as per Notification No. 11/2017-Central Tax (Rate). All disputes subject to Deoria, Uttar Pradesh jurisdiction.</p>
                  <p className="font-bold text-slate-700 mt-0.5">Thank you for dining with Apurva Pizza Hub! Taste the stone-fired difference.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTaxInvoiceOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    const invoiceHtml = document.getElementById('printable-gst-invoice').innerHTML;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>GST Tax Invoice #INV-APH-${taxInvoiceOrder._id.slice(-6).toUpperCase()}</title>
                          <style>
                            body { font-family: sans-serif; padding: 20px; max-width: 720px; margin: 0 auto; color: #111827; }
                            table { width: 100%; border-collapse: collapse; }
                            th, td { padding: 6px; }
                          </style>
                        </head>
                        <body>
                          ${invoiceHtml}
                          <script>window.onload = function() { window.print(); }<\/script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Tax Invoice (A4 / Thermal)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Reply to Customer Review */}
      <AnimatePresence>
        {activeReviewReplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Reply to Customer Review</h3>
                    <p className="text-xs text-slate-400">
                      Product: {activeReviewReplyModal.productName || 'Menu Item'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveReviewReplyModal(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Original Review Snapshot */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{activeReviewReplyModal.userName || 'Customer'}</span>
                  <div className="flex text-amber-400 text-xs">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={i < (activeReviewReplyModal.rating || 5) ? 'text-amber-400' : 'text-slate-600'}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-slate-300 italic">
                  "{activeReviewReplyModal.comment}"
                </p>
              </div>

              <form onSubmit={handleReplyReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Official Store Response *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reviewReplyText}
                    onChange={(e) => setReviewReplyText(e.target.value)}
                    placeholder="Write a warm, professional reply thanking the customer or addressing their feedback..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-orange-500 leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    This reply will be published publicly under the product review on customer-facing pages.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveReviewReplyModal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReviewReply || !reviewReplyText.trim()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReviewReply ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Publish Response</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Respond / Resolve Customer Inquiry */}
      <AnimatePresence>
        {activeInquiryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Customer Inquiry Resolution</h3>
                    <p className="text-xs text-slate-400">
                      From: {activeInquiryModal.name || 'Customer'} {activeInquiryModal.phone ? `(${activeInquiryModal.phone})` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInquiryModal(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message Details */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
                {activeInquiryModal.subject && (
                  <div className="font-bold text-white">Subject: {activeInquiryModal.subject}</div>
                )}
                <p className="text-slate-300 leading-relaxed">
                  "{activeInquiryModal.message}"
                </p>
                <div className="text-[10px] text-slate-500">
                  Received on {new Date(activeInquiryModal.createdAt || Date.now()).toLocaleDateString('en-IN')}
                </div>
              </div>

              <form onSubmit={handleReplyInquirySubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Staff Resolution Notes / Response *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={inquiryReplyText}
                    onChange={(e) => setInquiryReplyText(e.target.value)}
                    placeholder="Enter notes on how this inquiry was resolved (e.g. Called customer on phone, resolved delivery inquiry and offered complimentary garlic bread)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveInquiryModal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInquiryReply || !inquiryReplyText.trim()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingInquiryReply ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save & Mark Resolved</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 80mm Thermal Receipt Preview & Print Component            */}
      {/* ========================================================= */}
      {selectedPrintOrder && (
        <ReceiptPrint
          order={selectedPrintOrder}
          onClose={() => setSelectedPrintOrder(null)}
        />
      )}

      {/* Change Credentials & Security Modal */}
      <ChangeCredentialsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
