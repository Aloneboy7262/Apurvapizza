import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ProductCard from '../components/ProductCard';
import { getImageUrl } from '../services/imageUtils';
import {
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Plus,
  Minus,
  Check,
  ChevronRight,
  Layers,
  Award,
  Zap,
  Star,
  ThumbsUp,
  HeartHandshake,
  Share2,
  Camera,
  Upload,
  Image as ImageIcon,
  MessageSquareQuote,
  Send,
  User,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const TOPPING_OPTIONS = [
  { id: 'cheese_burst', name: 'Extra Cheese Burst', price: 40, tag: 'Bestseller', icon: '🧀' },
  { id: 'extra_cheese', name: 'Extra Cheese', price: 40, tag: 'Must Have', icon: '🧀' },
  { id: 'paneer', name: 'Paneer Chunks', price: 30, tag: 'Popular', icon: '🧈' },
  { id: 'jalapeno', name: 'Jalapeno', price: 20, icon: '🌶️' },
  { id: 'olives', name: 'Black Olive', price: 20, icon: '🫒' },
  { id: 'capsicum', name: 'Capsicum', price: 15, icon: '🫑' },
  { id: 'mushroom', name: 'Mushroom', price: 15, icon: '🍄' },
  { id: 'red_pepper', name: 'Red / Green Pepper', price: 15, icon: '🌶️' },
  { id: 'corn', name: 'Corn', price: 15, icon: '🌽' }
];

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, totalItems, isInCart } = useCart();

  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Customization states
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Customer Review states
  const [reviewName, setReviewName] = useState(user?.name || '');
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImage, setReviewImage] = useState('');
  const [uploadingReviewImg, setUploadingReviewImg] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [enlargedReviewImage, setEnlargedReviewImage] = useState(null);
  const reviewFileInputRef = useRef(null);

  // Sync auth user name if available
  useEffect(() => {
    if (user?.name && !reviewName) {
      setReviewName(user.name);
    }
  }, [user]);

  // Is current product in cart
  const isItemInCart = product?._id ? isInCart(product._id) : false;

  // Fetch target product & catalog for suggestions
  useEffect(() => {
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productRes, catalogRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get('/products')
        ]);

        if (isMounted) {
          if (productRes.data.success) {
            const currentProd = productRes.data.data;
            setProduct(currentProd);

            // Default to medium size if available, otherwise first size
            if (Array.isArray(currentProd.sizes) && currentProd.sizes.length > 0) {
              const med = currentProd.sizes.find(
                (s) => s.size.includes('M:') || s.size.includes('9')
              );
              setSelectedSize(med || currentProd.sizes[0]);
            } else {
              setSelectedSize(null);
            }
            setSelectedToppings([]);
            setQuantity(1);
          } else {
            setError('Product not found.');
          }

          if (catalogRes.data.success) {
            setAllProducts(catalogRes.data.data);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading product details:', err);
          setError(err.response?.data?.message || 'Could not load product details.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProductData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle Topping toggle
  const toggleTopping = (topping) => {
    setSelectedToppings((prev) => {
      const exists = prev.some((t) => t.name === topping.name);
      if (exists) {
        return prev.filter((t) => t.name !== topping.name);
      }
      return [...prev, topping];
    });
  };

  const { socket } = useSocket();

  // Real-time product inventory sync (out of stock & stock decrement)
  useEffect(() => {
    if (!socket || !id) return;
    const handleProductUpdated = (updatedProd) => {
      if (updatedProd && String(updatedProd._id) === String(id)) {
        setProduct((prev) => (prev ? { ...prev, ...updatedProd } : updatedProd));
      }
    };
    socket.on('product_updated', handleProductUpdated);
    return () => {
      socket.off('product_updated', handleProductUpdated);
    };
  }, [socket, id]);

  // Pricing & Stock calculations
  const isOutOfStock =
    product?.isAvailable === false ||
    (product?.stockQuantity !== null && product?.stockQuantity !== undefined && product?.stockQuantity <= 0);

  const maxAvailable =
    product?.stockQuantity !== null && product?.stockQuantity !== undefined
      ? Math.max(0, product.stockQuantity)
      : null;

  const hasDiscount = product && product.discountedPrice && product.discountedPrice < product.basePrice;
  const currentBasePrice = selectedSize
    ? selectedSize.price
    : product?.basePrice || 0;
  const currentEffectivePrice = selectedSize
    ? (selectedSize.discountedPrice || selectedSize.price)
    : (product?.discountedPrice || product?.basePrice || 0);

  const toppingsTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const unitPrice = currentEffectivePrice + toppingsTotal;
  const totalPrice = unitPrice * quantity;
  const savingsPerItem = hasDiscount ? (currentBasePrice - currentEffectivePrice) : 0;
  const totalSavings = savingsPerItem * quantity;

  // Add to cart action
  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    addToCart(product, selectedSize, selectedToppings, quantity);
    const sizeStr = selectedSize ? ` (${selectedSize.size.split(':')[0]})` : '';
    showToast(`Added ${quantity}x ${product.name}${sizeStr} to cart! Button changed to Go to Cart.`);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Review image upload handler from gallery/camera
  const handleReviewImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Selected image exceeds 10MB limit. Please choose a smaller photo.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingReviewImg(true);
      const res = await api.post('/upload/review-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setReviewImage(res.data.data.url);
      }
    } catch (err) {
      console.error('Review image upload failed:', err);
      alert(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadingReviewImg(false);
    }
  };

  // Submit product review (with or without image)
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError(null);
    setReviewSuccess(null);

    if (!reviewName.trim()) {
      setReviewError('Please enter your name.');
      return;
    }
    if (!reviewComment.trim()) {
      setReviewError('Please write your review thoughts.');
      return;
    }

    try {
      setSubmittingReview(true);
      const res = await api.post(`/products/${product._id}/reviews`, {
        userName: reviewName.trim(),
        userEmail: user?.email || '',
        rating: reviewRating,
        comment: reviewComment.trim(),
        imageURL: reviewImage || ''
      });

      if (res.data.success) {
        setReviewSuccess('Thank you! Your review has been published.');
        setReviewComment('');
        setReviewImage('');
        if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';

        if (res.data.data?.reviews) {
          setProduct((prev) => ({
            ...prev,
            reviews: res.data.data.reviews,
            averageRating: res.data.data.averageRating,
            totalReviews: res.data.data.totalReviews
          }));
        } else {
          const refetch = await api.get(`/products/${product._id}`);
          if (refetch.data.success) setProduct(refetch.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      setReviewError(err.response?.data?.message || 'Failed to post review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatReviewDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  // Intelligent Enterprise Recommendations:
  // Complementary food items (e.g. Pizza -> Beverages & Burgers, Burger -> Drinks & Sides)
  const recommendations = useMemo(() => {
    if (!product || allProducts.length === 0) return [];
    const others = allProducts.filter((p) => p._id !== product._id);

    let preferredCategory = 'Beverages';
    if (product.category === 'Beverages') {
      preferredCategory = 'Pizzas';
    } else if (product.category === 'Burgers') {
      preferredCategory = 'Beverages';
    } else if (product.category === 'Pizzas') {
      preferredCategory = 'Beverages';
    }

    const priorityGroup = others.filter((p) => p.category === preferredCategory);
    const fallbackGroup = others.filter((p) => p.category !== preferredCategory);

    return [...priorityGroup, ...fallbackGroup].slice(0, 4);
  }, [product, allProducts]);

  // Dynamic "What This Product Contains" content based on category
  const productContents = useMemo(() => {
    if (!product) return [];

    if (product.category === 'Pizzas') {
      return [
        {
          title: 'Artisan Wood-Fired Crust',
          description:
            '24-hour slow fermented dough, hand-stretched with semolina and stone-oven baked at 450°C for bubbly leopard char blistered edges.',
          icon: '🍕'
        },
        {
          title: '100% Real Molten Mozzarella',
          description:
            'Pure whole-milk mozzarella cheese with an irresistible golden stretch, richness, and no artificial oils or cheese analogs.',
          icon: '🧀'
        },
        {
          title: 'San Marzano Herb Tomato Sauce',
          description:
            'Crushed sun-ripened tomatoes gently simmered with cold-pressed olive oil, fresh crushed garlic, and Italian sea salt.',
          icon: '🍅'
        },
        {
          title: 'Fresh Garden Herbs & Spices',
          description:
            'Aromatic sweet Italian basil, wild Mediterranean oregano, and vibrant red pepper flakes for an authentic pizzeria fragrance.',
          icon: '🌿'
        }
      ];
    }

    if (product.category === 'Burgers') {
      return [
        {
          title: 'Toasted Herb Brioche Bun',
          description:
            'Ultra-soft artisan brioche bun lightly toasted with garlic herb butter and sprinkled with golden sesame seeds.',
          icon: '🍞'
        },
        {
          title: 'Char-Grilled Gourmet Patty',
          description:
            'Savory plant-powered patty seasoned with Italian herbs, cracked black pepper, and seared to lock in juiciness.',
          icon: '🍔'
        },
        {
          title: 'Double Wisconsin Cheddar',
          description:
            'Dual layers of thick Wisconsin cheddar melted generously over the patty for a dripping, gooey bite.',
          icon: '🧀'
        },
        {
          title: 'Crunchy Hydroponic Greens',
          description:
            'Crisp iceberg lettuce leaves, thick vine-ripened tomatoes, and house pickles tossed with Apurva Secret Sauce.',
          icon: '🥬'
        }
      ];
    }

    if (product.category === 'Beverages') {
      return [
        {
          title: 'Chilled Sub-Zero (< 4°C)',
          description:
            'Stored in high-efficiency chillers and served ice-cold to ensure maximum refreshing carbonation and frost.',
          icon: '❄️'
        },
        {
          title: 'Maximum Effervescence & Fizz',
          description:
            'Poured with crystal fizzy bubbles that cleanse your palate perfectly between hot, cheesy pizza slices.',
          icon: '⚡'
        },
        {
          title: 'Fresh Citrus & Mint Accent',
          description:
            'Pairs deliciously with our authentic wood-fired crusts, spicy marinara, and char-grilled fast food.',
          icon: '🍋'
        }
      ];
    }

    return [
      {
        title: 'Authentic Kitchen Preparation',
        description: 'Made fresh to order with pure vegetarian ingredients and authentic spices in Pathardewa.',
        icon: '👨‍🍳'
      },
      {
        title: 'Zero Artificial Additives',
        description: 'No preservatives, trans-fats, or artificial food colorings. 100% wholesome satisfaction.',
        icon: '✨'
      }
    ];
  }, [product]);

  const cookingBadge = useMemo(() => {
    if (!product) return { title: 'Stone Oven', desc: 'Baked at 450°C', icon: 'Sparkles' };
    if (product.category === 'Burgers') {
      return { title: 'Freshly Grilled', desc: 'Made to Order', icon: 'Flame' };
    }
    if (product.category === 'Beverages' || product.category === 'Desserts') {
      return { title: 'Chilled & Fresh', desc: 'Served Cold', icon: 'Zap' };
    }
    if (product.category === 'Sides') {
      return { title: 'Crispy Fresh', desc: 'Freshly Fried', icon: 'Sparkles' };
    }
    return { title: 'Stone Oven', desc: 'Baked at 450°C', icon: 'Sparkles' };
  }, [product?.category]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] dark:bg-[#080402] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[70vh] bg-[var(--bg-app)] dark:bg-[#080402] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 text-center transition-colors">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-4 text-2xl">
          🍕
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Product Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md">
          {error || "The dish you're looking for doesn't exist or may have been removed."}
        </p>
        <Link
          to="/"
          className="mt-6 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm inline-flex items-center space-x-2 transition-all shadow-lg shadow-orange-500/25"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu Catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] dark:bg-[#080402] text-slate-900 dark:text-slate-100 selection:bg-orange-500 selection:text-white pb-24 sm:pb-16 transition-colors duration-300">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-900 dark:text-white px-5 py-3.5 rounded-2xl shadow-[0_10px_35px_rgba(249,115,22,0.25)] flex items-center space-x-3 border border-orange-300 dark:border-orange-500/40"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Breadcrumb & Navigation Bar */}
      <div className="border-b border-orange-200/80 dark:border-orange-950/40 bg-[#faf5ee]/90 dark:bg-[#0c0704]/80 backdrop-blur-md z-30 transition-colors sm:sticky sm:top-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-slate-700 dark:text-slate-400 overflow-x-auto scrollbar-none py-1">
            <Link to="/" className="hover:text-orange-700 dark:hover:text-orange-400 transition-colors flex items-center space-x-1 shrink-0 font-medium">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Menu</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-600 shrink-0" />
            <span className="hover:text-orange-700 dark:hover:text-orange-400 cursor-pointer shrink-0 font-medium" onClick={() => navigate('/')}>
              {product.category}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-600 shrink-0" />
            <span className="text-slate-900 dark:text-white font-extrabold truncate max-w-[160px] sm:max-w-xs shrink-0">
              {product.name}
            </span>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xs flex items-center space-x-1.5 border border-slate-200 dark:border-white/10"
              title="Share Dish Link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
            <Link
              to="/cart"
              className="px-3 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-500/15 hover:bg-orange-200 dark:hover:bg-orange-500/25 border border-orange-300 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 text-xs font-extrabold flex items-center space-x-1.5 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Cart ({totalItems})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Product Showcase Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-8 py-3 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-12 items-start">

          {/* ========================================================= */}
          {/* MOBILE ONLY: Top Header Info (Instant Visibility on Phone) */}
          {/* ========================================================= */}
          <div className="lg:hidden space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center space-x-1.5 bg-orange-100 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/30 text-orange-800 dark:text-orange-400 px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>{product.category} Special</span>
              </div>

              <span className="bg-white/95 dark:bg-slate-950/90 backdrop-blur-md px-2.5 py-0.5 rounded-xl border border-emerald-500/40 flex items-center space-x-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  {product.dietary || '100% Pure Veg'}
                </span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {product.name}
            </h1>

            <div className="flex items-baseline space-x-3 pt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                ₹{unitPrice}
              </span>
              {hasDiscount && (
                <span className="text-sm text-slate-400 dark:text-slate-500 line-through">
                  ₹{currentBasePrice + toppingsTotal}
                </span>
              )}
              {totalSavings > 0 && (
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Saving ₹{totalSavings}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Inclusive of all taxes & freshly baked packaging</p>
          </div>
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: Food Photo, Quality Badges & Visuals         */}
          {/* ========================================================= */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative w-full h-52 sm:h-72 lg:h-[460px] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_15px_45px_rgba(0,0,0,0.07)] dark:shadow-[0_15px_45px_rgba(0,0,0,0.7)] group">
              <img
                src={getImageUrl(product.imageURL)}
                alt={product.name}
                className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                  isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-105'
                }`}
                onError={(e) => {
                  e.target.src =
                    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80';
                }}
              />

              {/* Seamless Bottom Gradient Blend */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-75" />

              {/* Top Badges */}
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-2 z-10">
                {isOutOfStock ? (
                  <span className="bg-red-600 text-white text-[11px] sm:text-xs font-black px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl shadow-lg border border-red-400/50 flex items-center space-x-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"></span>
                    <span>OUT OF STOCK (Sold Out)</span>
                  </span>
                ) : maxAvailable !== null && maxAvailable <= 5 ? (
                  <span className="bg-amber-500 text-slate-950 text-[11px] sm:text-xs font-black px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg border border-amber-300 flex items-center space-x-1">
                    <span>🔥 Only {maxAvailable} left!</span>
                  </span>
                ) : null}

                {/* Dietary badge (shown on desktop image) */}
                <span className="hidden lg:flex bg-white/95 dark:bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 items-center space-x-2 shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    {product.dietary || '100% Pure Veg'}
                  </span>
                </span>

                {hasDiscount && !isOutOfStock && (
                  <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-[11px] sm:text-xs font-black px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg border border-red-400/40">
                    Save ₹{savingsPerItem}
                  </span>
                )}
              </div>

              {/* Quality Floating Tags */}
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex items-center justify-between text-xs font-bold text-white">
                <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-950/85 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-white/10 text-[11px] sm:text-xs">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400" />
                  <span>
                    {product.averageRating ? product.averageRating.toFixed(1) : '4.9'} ★ ({product.totalReviews || product.reviews?.length || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-white/10 text-orange-300 text-[11px] sm:text-xs">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                  <span>{product.prepTime || '15-20 Mins Live Bake'}</span>
                </div>
              </div>
            </div>

            {/* Quality Badges Row (Desktop Left Column) */}
            <div className="hidden lg:grid grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center space-y-1">
                {cookingBadge.icon === 'Flame' ? (
                  <Flame className="w-5 h-5 text-orange-500 dark:text-orange-400 mx-auto" />
                ) : cookingBadge.icon === 'Zap' ? (
                  <Zap className="w-5 h-5 text-cyan-500 dark:text-cyan-400 mx-auto" />
                ) : (
                  <Sparkles className="w-5 h-5 text-orange-500 dark:text-orange-400 mx-auto" />
                )}
                <span className="block text-xs font-extrabold text-slate-900 dark:text-white">{cookingBadge.title}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{cookingBadge.desc}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center space-y-1">
                <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mx-auto" />
                <span className="block text-xs font-extrabold text-slate-900 dark:text-white">Zero Preservatives</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Fresh Ingredients</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center space-y-1">
                <HeartHandshake className="w-5 h-5 text-amber-500 dark:text-amber-400 mx-auto" />
                <span className="block text-xs font-extrabold text-slate-900 dark:text-white">Pathardewa Hub</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Locally Handcrafted</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Title, Pricing, Customization & Add to Cart */}
          {/* ========================================================= */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            
            {/* Header info (Desktop Right Column) */}
            <div className="hidden lg:block space-y-3">
              <div className="inline-flex items-center space-x-2 bg-orange-100 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/30 text-orange-800 dark:text-orange-400 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>{product.category} Special</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Price display */}
              <div className="flex items-baseline space-x-3 pt-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  ₹{unitPrice}
                </span>
                {hasDiscount && (
                  <span className="text-base sm:text-lg text-slate-400 dark:text-slate-500 line-through">
                    ₹{currentBasePrice + toppingsTotal}
                  </span>
                )}
                {totalSavings > 0 && (
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 px-2.5 py-1 rounded-full">
                    Saving ₹{totalSavings}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Inclusive of all taxes & freshly baked packaging</p>
            </div>

            {/* Description & Ingredients (Shown on both Mobile and Desktop) */}
            <div className="space-y-3">
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {product.description ||
                  'Handcrafted with slow-fermented dough, 100% molten Italian mozzarella cheese, San Marzano marinara, and fresh garden herbs.'}
              </p>

              {/* Product Ingredients Highlight if specified */}
              {product.ingredients && (
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700 dark:text-orange-400 block">
                    🌿 Key Ingredients &amp; Contains
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {product.ingredients}
                  </p>
                </div>
              )}
            </div>

            {/* Customization 1: Size Selector */}
            {Array.isArray(product.sizes) && product.sizes.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                    Select Your Crust Size
                  </h3>
                  <span className="text-[11px] text-orange-700 dark:text-orange-400 font-bold">Choose 1</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {product.sizes.map((s, idx) => {
                    const isSelected = selectedSize && selectedSize.size === s.size;
                    const priceDiff = (s.discountedPrice || s.price) - (product.discountedPrice || product.basePrice);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-orange-50 dark:bg-orange-500/20 border-orange-500 text-slate-900 dark:text-white shadow-[0_4px_20px_rgba(249,115,22,0.18)] dark:shadow-[0_4px_20px_rgba(249,115,22,0.25)] ring-1 ring-orange-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-orange-300 dark:hover:border-slate-700 hover:bg-orange-50/50 dark:hover:bg-slate-800/80 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-black">{s.size}</span>
                          {isSelected && <Check className="w-4 h-4 text-orange-500 dark:text-orange-400" />}
                        </div>
                        <span className="text-xs font-extrabold text-orange-700 dark:text-orange-400 mt-2 block">
                          ₹{s.discountedPrice || s.price}
                        </span>
                        {priceDiff > 0 && (
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium block mt-0.5">
                            (+₹{priceDiff})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customization 2: Extra Topping Add-ons */}
            {(product.allowToppings || product.category === 'Pizzas') && (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                    Add Extra Toppings &amp; Crust
                  </h3>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">Optional</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TOPPING_OPTIONS.map((topping) => {
                    const isSelected = selectedToppings.some((t) => t.name === topping.name);
                    return (
                      <button
                        key={topping.id}
                        type="button"
                        onClick={() => toggleTopping(topping)}
                        className={`px-3.5 py-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-amber-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-amber-300 dark:hover:border-slate-700 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="text-base">{topping.icon}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">{topping.name}</span>
                            {topping.tag && (
                              <span className="text-[9px] uppercase tracking-wider text-orange-700 dark:text-orange-400 font-extrabold">
                                {topping.tag}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 ml-2">
                          <span className="text-xs font-black text-amber-700 dark:text-amber-400">+₹{topping.price}</span>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                              isSelected
                                ? 'bg-amber-500 border-amber-500 text-white dark:text-slate-950'
                                : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector & Desktop Add to Cart Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* Quantity buttons */}
              <div className="flex items-center justify-between sm:justify-start space-x-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center transition-colors disabled:opacity-40 border border-slate-200/80 dark:border-transparent shadow-sm"
                  disabled={quantity <= 1 || isOutOfStock}
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-black text-base text-slate-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => maxAvailable !== null ? Math.min(maxAvailable, q + 1) : Math.min(20, q + 1))}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center transition-colors border border-slate-200/80 dark:border-transparent shadow-sm disabled:opacity-40"
                  disabled={isOutOfStock || (maxAvailable !== null && quantity >= maxAvailable) || quantity >= 20}
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic Add to Cart / Go to Cart CTA */}
              {isOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-red-500 dark:text-red-400 font-bold text-base flex items-center justify-center space-x-2 border border-red-300 dark:border-red-500/30 cursor-not-allowed opacity-80 shadow-sm"
                >
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span>Out of Stock (Currently Sold Out)</span>
                </button>
              ) : isItemInCart ? (
                <div className="flex-1 flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/cart')}
                    className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-base flex items-center justify-center space-x-3 shadow-[0_10px_35px_rgba(16,185,129,0.35)] transition-all cursor-pointer border border-emerald-400/30"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    <span>Go to Cart →</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddToCart}
                    className="py-4 px-5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-orange-700 dark:text-orange-400 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all border border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer shadow-sm"
                    title="Add another item with these customizations"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add More</span>
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-base flex items-center justify-center space-x-3 shadow-[0_10px_35px_rgba(249,115,22,0.35)] transition-all cursor-pointer border border-orange-400/30"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Add to Cart • ₹{totalPrice}</span>
                </motion.button>
              )}
            </div>

            {/* Quality Badges Row (Mobile Placement: positioned below actions so it never pushes product title down) */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 lg:hidden">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center space-y-1">
                {cookingBadge.icon === 'Flame' ? (
                  <Flame className="w-4 h-4 text-orange-500 dark:text-orange-400 mx-auto" />
                ) : cookingBadge.icon === 'Zap' ? (
                  <Zap className="w-4 h-4 text-cyan-500 dark:text-cyan-400 mx-auto" />
                ) : (
                  <Sparkles className="w-4 h-4 text-orange-500 dark:text-orange-400 mx-auto" />
                )}
                <span className="block text-[11px] font-extrabold text-slate-900 dark:text-white">{cookingBadge.title}</span>
                <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">{cookingBadge.desc}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center space-y-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                <span className="block text-[11px] font-extrabold text-slate-900 dark:text-white">Zero Preservatives</span>
                <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">Fresh Ingredients</span>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center space-y-1">
                <HeartHandshake className="w-4 h-4 text-amber-500 dark:text-amber-400 mx-auto" />
                <span className="block text-[11px] font-extrabold text-slate-900 dark:text-white">Pathardewa Hub</span>
                <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">Locally Handcrafted</span>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================= */}
        {/* DISH DETAILS: "What This Product Contains" (Enterprise)   */}
        {/* ========================================================= */}
        <div className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800/80 space-y-6">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              What This Dish Contains &amp; Highlights
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 -mt-2">
            Every order at Apurva Pizza Hub is baked live in our stone oven in Pathardewa with hygienic, 100% vegetarian ingredients.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {productContents.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500/40 transition-all space-y-2.5 shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/25 dark:border-orange-500/30 flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-400 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CUSTOMER REVIEWS & RATINGS (Enterprise Feature)           */}
        {/* ========================================================= */}
        <div className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800/80 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl">⭐</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Customer Reviews &amp; Ratings
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 mt-1">
                Real feedback from hungry food lovers in Pathardewa &amp; surrounding areas.
              </p>
            </div>

            {/* Rating Summary Pill */}
            <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl w-fit shadow-sm">
              <div className="flex items-center space-x-1.5 text-amber-500 dark:text-amber-400">
                <Star className="w-5 h-5 fill-amber-400" />
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {product.averageRating ? product.averageRating.toFixed(1) : '5.0'}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">/ 5.0</span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs text-slate-700 dark:text-slate-400 font-bold">
                {product.totalReviews || product.reviews?.length || 0} Reviews
              </span>
            </div>
          </div>

          {/* Review Grid: Form on Left + Reviews List on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* 1. WRITE A REVIEW FORM */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-md dark:shadow-xl space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <MessageSquareQuote className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Write a Review</h3>
              </div>

              {reviewSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{reviewSuccess}</span>
                </div>
              )}

              {reviewError && (
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 text-red-800 dark:text-red-400 text-xs font-semibold">
                  {reviewError}
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* 1. Rating Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Your Rating
                  </label>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 rounded-lg hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            (hoverRating || reviewRating) >= star
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 ml-2">
                      {reviewRating === 5
                        ? 'Delicious! (5/5)'
                        : reviewRating === 4
                        ? 'Very Good (4/5)'
                        : reviewRating === 3
                        ? 'Good (3/5)'
                        : reviewRating === 2
                        ? 'Fair (2/5)'
                        : 'Needs Work (1/5)'}
                    </span>
                  </div>
                </div>

                {/* 2. Customer Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Your Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-medium"
                    />
                  </div>
                </div>

                {/* 3. Review Feedback Text */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Your Review *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Share your experience about taste, hot cheese stretch, crust crispiness, or fast delivery..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none font-medium"
                  />
                </div>

                {/* 4. Optional Photo Upload (Camera / Device Gallery) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">
                      Add Food Photo (Optional)
                    </label>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                      Photo or text-only review
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={reviewFileInputRef}
                    accept="image/*"
                    onChange={handleReviewImageChange}
                    className="hidden"
                  />

                  {reviewImage ? (
                    <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="relative">
                        <img
                          src={getImageUrl(reviewImage)}
                          alt="Review upload preview"
                          className="w-16 h-16 rounded-xl object-cover border border-orange-500/50 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReviewImage('');
                            if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
                          }}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          title="Remove photo & post text only"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Photo attached!</span>
                        </p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                          Click (X) to post review without image
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => reviewFileInputRef.current?.click()}
                      disabled={uploadingReviewImg}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-500/60 bg-slate-50 dark:bg-slate-950/60 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 text-slate-700 dark:text-slate-400 hover:text-orange-700 dark:hover:text-orange-400 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {uploadingReviewImg ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                          <span>Uploading photo from device...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                          <span>Upload Photo from Device / Gallery (Optional)</span>
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-1">
                    Tip: You can submit your review with an image or leave it blank to submit only with text.
                  </p>
                </div>

                {/* 5. Submit CTA */}
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingReview ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing Review...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {reviewImage ? 'Post Review with Photo' : 'Post Review (Text Only)'}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 2. REVIEWS LIST */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Customer Feedback</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    ({product.reviews?.length || 0})
                  </span>
                </h3>
              </div>

              {product.reviews && product.reviews.length > 0 ? (
                <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
                  {product.reviews
                    .slice()
                    .reverse()
                    .map((rev, idx) => (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-sm dark:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center uppercase shadow-sm">
                              {rev.userName ? rev.userName.charAt(0) : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                  {rev.userName}
                                </h4>
                                <span className="text-[10px] text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-bold flex items-center space-x-0.5 border border-emerald-300 dark:border-transparent">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Verified Customer</span>
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                                {formatReviewDate(rev.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Star Rating display */}
                          <div className="flex items-center space-x-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= rev.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-300 dark:text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Comment Text */}
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 leading-relaxed font-normal">
                          {rev.comment}
                        </p>

                        {/* Customer Attached Photo */}
                        {rev.imageURL && (
                          <div className="pt-1">
                            <img
                              src={getImageUrl(rev.imageURL)}
                              alt="Review customer photo"
                              className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-md hover:scale-105 transition-transform cursor-pointer"
                              onClick={() => setEnlargedReviewImage(getImageUrl(rev.imageURL))}
                            />
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 block font-medium">
                              Photo by customer • Click to enlarge
                            </span>
                          </div>
                        )}

                        {/* Official Restaurant Response */}
                        {rev.adminReply && rev.adminReply.comment && (
                          <div className="mt-2.5 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-l-4 border-orange-500 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                                <span>🛡️</span>
                                <span>Apurva Pizza Hub Management Response</span>
                              </span>
                              {rev.adminReply.repliedAt && (
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  {formatReviewDate(rev.adminReply.repliedAt)}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                              {rev.adminReply.comment}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 dark:text-orange-400 flex items-center justify-center mx-auto text-xl">
                    🍕
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">No reviews yet for this dish</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-400 max-w-sm mx-auto">
                    Be the first to share your experience with {product.name}! Leave a review using the form.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ========================================================= */}
        {/* ENTERPRISE SUGGESTIONS: "Frequently Paired With"          */}
        {/* ========================================================= */}
        {recommendations.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200 dark:border-slate-800/80 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🎁</span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Frequently Paired With This
                  </h3>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-400 mt-1">
                  Complete your meal with these bestselling drinks &amp; sides.
                </p>
              </div>

              <Link
                to="/"
                className="text-xs font-bold text-orange-700 dark:text-orange-400 hover:text-orange-800 flex items-center space-x-1"
              >
                <span>View Full Menu</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Suggestions 2-col on mobile, 4-col on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 pt-2">
              {recommendations.map((rec) => (
                <ProductCard
                  key={rec._id}
                  product={rec}
                  onSelectProduct={(p) => navigate(`/product/${p._id}`)}
                  onQuickAdd={(p) => {
                    addToCart(p, null, [], 1);
                    showToast(`Added 1x ${p.name} to cart!`);
                  }}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* MOBILE STICKY BOTTOM BAR (Always visible on mobile)       */}
      {/* ========================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c0704]/95 backdrop-blur-2xl border-t border-slate-200 dark:border-orange-500/30 p-3 sm:hidden shadow-[0_-10px_35px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_35px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3">
        <div className="flex flex-col pl-1">
          <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">
            Total Price ({quantity} {quantity > 1 ? 'items' : 'item'})
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            ₹{totalPrice}
          </span>
        </div>

        {isOutOfStock ? (
          <button
            type="button"
            disabled
            className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-red-500 dark:text-red-400 font-bold text-sm border border-red-300 dark:border-red-500/30 cursor-not-allowed opacity-80"
          >
            <span>Out of Stock</span>
          </button>
        ) : isItemInCart ? (
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              className="px-3 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-orange-700 dark:text-orange-400 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/cart')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm flex items-center space-x-2 shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Go to Cart →</span>
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAddToCart}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm flex items-center space-x-2 shadow-lg shadow-orange-500/30"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add to Cart</span>
          </motion.button>
        )}
      </div>

      {/* Enlarged Customer Review Photo Lightbox Modal */}
      <AnimatePresence>
        {enlargedReviewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => setEnlargedReviewImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-2xl w-full max-h-[88vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setEnlargedReviewImage(null)}
                className="absolute -top-12 right-0 p-2 text-slate-300 hover:text-white bg-slate-800/80 rounded-full transition-colors"
                title="Close photo"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={enlargedReviewImage}
                alt="Enlarged Customer Review Photo"
                className="w-full max-h-[80vh] object-contain rounded-2xl border border-slate-700 shadow-2xl"
              />
              <span className="text-xs font-semibold text-slate-300 mt-3 flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Customer Attached Photo</span>
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetails;
