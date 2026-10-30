import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { getImageUrl } from '../services/imageUtils';
import api from '../services/api';
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  ChefHat,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Tag,
  Check,
  X,
  Loader2,
  Gift,
  Clock
} from 'lucide-react';

const POPULAR_ADDONS = [
  {
    _id: 'addon_garlic_bread',
    name: 'Cheesy Garlic Bread',
    category: 'Sides',
    basePrice: 99,
    price: 99,
    imageURL: 'https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=600&q=80'
  },
  {
    _id: 'addon_coke',
    name: 'Chilled Coca-Cola',
    category: 'Beverages',
    basePrice: 45,
    price: 45,
    imageURL: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'
  },
  {
    _id: 'addon_fries',
    name: 'Peri Peri French Fries',
    category: 'Fries',
    basePrice: 79,
    price: 79,
    imageURL: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80'
  },
  {
    _id: 'addon_cake',
    name: 'Chocolate Lava Cake',
    category: 'Cakes',
    basePrice: 89,
    price: 89,
    imageURL: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80'
  }
];

const Cart = () => {
  const {
    cartItems,
    customerNote,
    setCustomerNote,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    totalItems,
    isMinOrderMet,
    minOrderAmount,
    minOrderShortfall,
    addToCart,
    quickAdd,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
    finalSubtotal,
    isInCart
  } = useCart();
  const { isShopOpen, shopStatus, socket } = useSocket();

  const navigate = useNavigate();

  // Live Catalog state for real-time stock verification
  const [productsMap, setProductsMap] = useState({});

  // Coupon input state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState(null); // { type: 'success' | 'error', text: '' }
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [deliverySettings, setDeliverySettings] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Fetch active coupons, catalog, & delivery settings for accurate pricing
    const fetchInitData = async () => {
      try {
        const [couponsRes, productsRes, deliveryRes] = await Promise.all([
          api.get('/coupons'),
          api.get('/products'),
          api.get('/delivery-settings').catch(() => null)
        ]);
        if (couponsRes.data?.success) {
          setAvailableCoupons(couponsRes.data.data || []);
        }
        if (deliveryRes?.data?.success) {
          setDeliverySettings(deliveryRes.data.data || null);
        }
        if (productsRes.data?.success && Array.isArray(productsRes.data.data)) {
          const map = {};
          productsRes.data.data.forEach((p) => {
            map[p._id] = p;
          });
          setProductsMap(map);
        }
      } catch (err) {
        console.warn('Could not fetch cart initialization data:', err);
      }
    };
    fetchInitData();
  }, []);

  // Listen to socket product stock updates in real-time
  useEffect(() => {
    if (!socket) return;
    const handleProductUpdated = (updatedProd) => {
      if (updatedProd && updatedProd._id) {
        setProductsMap((prev) => ({ ...prev, [updatedProd._id]: updatedProd }));
      }
    };
    socket.on('product_updated', handleProductUpdated);
    return () => {
      socket.off('product_updated', handleProductUpdated);
    };
  }, [socket]);

  // Check if any cart items are out of stock or requested quantity exceeds stock
  const hasOutOfStockItems = cartItems.some((item) => {
    const p = productsMap[item.product || item.productId];
    if (!p) return false;
    return (
      p.isAvailable === false ||
      (p.stockQuantity !== null && p.stockQuantity !== undefined && (p.stockQuantity <= 0 || item.quantity > p.stockQuantity))
    );
  });

  const handleApplyCoupon = async (codeToApply) => {
    const targetCode = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!targetCode) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await applyCoupon(targetCode);
      setCouponMsg({ type: 'success', text: res.message || `Coupon ${targetCode} applied!` });
      setCouponCodeInput('');
    } catch (err) {
      setCouponMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Invalid or expired coupon'
      });
    } finally {
      setCouponLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[82vh] flex flex-col items-center justify-center px-4 py-16 bg-[var(--bg-app)] dark:bg-[#080402] transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900/80 backdrop-blur-xl p-8 sm:p-12 rounded-3xl border border-slate-200/90 dark:border-orange-500/20 shadow-2xl text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-orange-500/15 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-orange-500/30 shadow-lg shadow-orange-500/20">
            <ShoppingBag className="w-10 h-10 text-orange-500 dark:text-orange-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Your Cart is Empty</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            Looks like you haven't added any cheesy wood-fired pizzas or gourmet burgers to your cart yet.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 transition-all border border-orange-400/30"
          >
            🍕 Explore Full Menu
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] dark:bg-[#080402] text-slate-900 dark:text-slate-100 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="p-2.5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:text-orange-500 hover:border-orange-500/40 transition-colors shadow-sm"
              title="Return to Menu"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Review Your Cart
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your basket
              </p>
            </div>
          </div>

          <button
            onClick={clearCart}
            className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline px-3 py-1.5 cursor-pointer"
          >
            Clear Cart
          </button>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Cart Items & Smart Upselling */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Items List Card */}
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-orange-500/20 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-orange-50/30 dark:hover:bg-slate-850/50"
                >
                  {/* Item Image and Details */}
                  <div className="flex items-center space-x-3.5 sm:space-x-4 flex-1 w-full sm:w-auto">
                    <img
                      src={getImageUrl(item.imageURL)}
                      alt={item.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug truncate">
                        {item.name}
                      </h3>

                      {/* Size Badge */}
                      {item.size && (
                        <div className="inline-flex items-center space-x-1">
                          <span className="px-2 py-0.5 rounded-md bg-orange-100/80 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400 text-[11px] font-bold border border-orange-200 dark:border-orange-500/30">
                            Size: {item.size}
                          </span>
                        </div>
                      )}

                      {/* Toppings Chips */}
                      {item.toppings && item.toppings.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {item.toppings.map((top, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                            >
                              + {top}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold pt-0.5">
                        ₹{item.price} per unit
                      </div>

                      {(() => {
                        const prod = productsMap[item.product || item.productId];
                        const isOutOfStock = prod && (prod.isAvailable === false || (prod.stockQuantity !== null && prod.stockQuantity !== undefined && prod.stockQuantity <= 0));
                        const isOverStock = prod && prod.stockQuantity !== null && prod.stockQuantity !== undefined && prod.stockQuantity > 0 && item.quantity > prod.stockQuantity;
                        if (isOutOfStock) {
                          return (
                            <div className="pt-1">
                              <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 font-bold text-[10px] border border-red-300 dark:border-red-500/40 inline-flex items-center space-x-1">
                                <span>❌ Out of Stock - Please remove to proceed</span>
                              </span>
                            </div>
                          );
                        }
                        if (isOverStock) {
                          return (
                            <div className="pt-1">
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 font-bold text-[10px] border border-amber-300 dark:border-amber-500/40 inline-flex items-center space-x-1">
                                <span>⚠️ Only {prod.stockQuantity} available in stock</span>
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Quantity Modifier and Total */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-3 sm:space-x-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white active:scale-95 font-bold transition-all cursor-pointer shadow-sm"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-black text-sm text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white active:scale-95 font-bold transition-all cursor-pointer shadow-sm"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="text-base font-black text-orange-600 dark:text-orange-400">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ========================================================================= */}
            {/* SMART CART UPSELLING: CHEFS RECOMMEND ADDING                              */}
            {/* ========================================================================= */}
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-500 dark:text-orange-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Complete Your Feast (Sides & Drinks)
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      Popular pairings handpicked by our wood-fired pizza chefs
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100/90 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
                  Best Value
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {POPULAR_ADDONS.map((addon) => {
                  const added = isInCart(addon._id);
                  return (
                    <div
                      key={addon._id}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-orange-400 transition-all flex flex-col justify-between space-y-2"
                    >
                      <img
                        src={addon.imageURL}
                        alt={addon.name}
                        className="w-full h-20 rounded-xl object-cover"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block truncate leading-tight">
                          {addon.name}
                        </span>
                        <span className="font-extrabold text-xs text-orange-600 dark:text-orange-400 block mt-0.5">
                          ₹{addon.price}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => quickAdd(addon)}
                        className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                          added
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                        }`}
                      >
                        {added ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kitchen Note / Cooking Instructions */}
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xl space-y-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-500 dark:text-orange-400 flex items-center justify-center">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    Special Cooking Request (Optional)
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Passed live to the pizza chef (e.g. extra crispy crust, less spicy)
                  </p>
                </div>
              </div>

              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="e.g. Extra crispy crust, less oregano, please slice into 8 pieces..."
                rows={2}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-orange-500 transition-all resize-none font-medium placeholder-slate-500 dark:placeholder-slate-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Right Column: Order Summary & Coupon Engine */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-orange-500/20 p-5 sm:p-6 shadow-xl space-y-4 lg:sticky lg:top-24">
              
              {/* ========================================================================= */}
              {/* PROMO CODE & COUPON ENGINE                                                */}
              {/* ========================================================================= */}
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">Apply Coupon Code</span>
                  </div>
                  {appliedCoupon && (
                    <button
                      onClick={removeCoupon}
                      className="text-[11px] font-bold text-red-500 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-black text-slate-900 dark:text-white block">
                          {appliedCoupon.code} Applied!
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                          {appliedCoupon.description || `Saving ₹${discountAmount}`}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                      -₹{discountAmount}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white uppercase placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 font-bold"
                      />
                      <button
                        type="button"
                        disabled={couponLoading || !couponCodeInput.trim()}
                        onClick={() => handleApplyCoupon()}
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs transition-all cursor-pointer shrink-0"
                      >
                        {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                      </button>
                    </div>

                    {couponMsg && (
                      <p className={`text-[11px] font-medium ${couponMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {couponMsg.text}
                      </p>
                    )}

                    {/* Available coupon pill shortcuts */}
                    {availableCoupons.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {availableCoupons.slice(0, 4).map((cp) => (
                          <button
                            key={cp._id}
                            type="button"
                            onClick={() => handleApplyCoupon(cp.code)}
                            className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-orange-100/80 dark:bg-orange-500/10 hover:bg-orange-200/90 dark:hover:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30 text-orange-800 dark:text-orange-300 transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <span>🏷️ {cp.code}</span>
                            <span className="opacity-75">
                              (₹{cp.discountType === 'flat' ? cp.discountValue : `${cp.discountValue}%`} OFF)
                            </span>
                            {!cp.allowRepeatUsage && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold ml-0.5">
                                1x
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bill Details */}
              {(() => {
                const isPlatformFeeActive = deliverySettings?.isPlatformFeeEnabled ?? deliverySettings?.is_platform_fee_enabled ?? true;
                const platformFeeAmount = isPlatformFeeActive ? Math.max(0, Number(deliverySettings?.platformFee ?? deliverySettings?.platform_fee ?? 5)) : 0;
                const cartEstimatedTotal = Math.max(0, Math.round((finalSubtotal + platformFeeAmount) * 100) / 100);

                return (
                  <div className="space-y-2.5 text-xs">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white">Order Bill Summary</h2>
                    
                    <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                      <span>Item Subtotal ({totalItems} items)</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{subtotal.toFixed(0)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Coupon Discount ({appliedCoupon?.code})</span>
                        <span>-₹{discountAmount}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                      <span>Delivery Partner Fee</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">FREE (&lt;5km)</span>
                    </div>

                    {isPlatformFeeActive && platformFeeAmount > 0 && (
                      <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                        <span>Platform Fee</span>
                        <span className="font-bold text-slate-900 dark:text-white">₹{platformFeeAmount}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                      <span>Taxes & Packaging Charges</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">₹0 (Included)</span>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                      <div>
                        <span className="text-sm font-black text-slate-900 dark:text-white block">Total Amount</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Inclusive of all taxes</span>
                      </div>
                      <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                        ₹{cartEstimatedTotal.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Checkout Button */}
              <div className="pt-2">
                {!isShopOpen && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-500/40 rounded-2xl text-[11px] text-red-800 dark:text-red-200 flex items-start space-x-2">
                    <Clock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="leading-tight">
                      <span className="font-bold text-red-700 dark:text-red-300 block mb-0.5">Store Currently Closed</span>
                      <span>
                        {shopStatus?.closedMessage || 'Our daily hours are 10:00 AM – 11:00 PM.'}
                        {shopStatus?.allowPreorders && (
                          <span className="text-amber-700 dark:text-amber-300 font-semibold ml-1">
                            You can schedule your order at checkout!
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!isMinOrderMet || hasOutOfStockItems}
                  onClick={() => navigate('/checkout')}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-base shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    isMinOrderMet && !hasOutOfStockItems
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 text-white shadow-orange-500/30 active:scale-[0.98] border border-orange-400/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-none'
                  }`}
                >
                  {hasOutOfStockItems ? (
                    <span>Remove Out of Stock Items to Checkout</span>
                  ) : isMinOrderMet ? (
                    <>
                      <span>Proceed to Checkout</span>
                      <span>•</span>
                      <span>₹{finalSubtotal.toFixed(0)}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <span>Min. ₹{minOrderAmount} Required to Checkout</span>
                  )}
                </button>

                {hasOutOfStockItems ? (
                  <p className="text-[11px] text-center text-red-500 dark:text-red-400 font-semibold mt-2">
                    ⚠️ Some items in your cart are currently out of stock or exceed inventory. Please remove or adjust them to proceed.
                  </p>
                ) : !isMinOrderMet ? (
                  <p className="text-[11px] text-center text-red-500 dark:text-red-400 font-semibold mt-2">
                    Add ₹{minOrderShortfall.toFixed(0)} more to enable checkout button.
                  </p>
                ) : null}
              </div>

              <div className="bg-orange-50 dark:bg-orange-500/10 rounded-2xl p-3 border border-orange-200 dark:border-orange-500/20 flex items-center space-x-2.5 text-xs text-orange-800 dark:text-orange-300">
                <Sparkles className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                <p className="text-[11px] font-medium leading-relaxed">
                  Fast & Contactless Delivery in Pathardewa. You can pinpoint your doorstep on the interactive map next!
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Cart;
