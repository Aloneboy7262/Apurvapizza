import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import ProductCard from '../components/ProductCard';
import ThreeDFood from '../components/ThreeDFood';
import {
  Search,
  Flame,
  Sparkles,
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  Clock,
  ShieldCheck,
  ChevronDown,
  Layers,
  Award,
  Zap,
  Maximize2
} from 'lucide-react';

const CATEGORY_ICONS = {
  All: '✨',
  Pizzas: '🍕',
  Burgers: '🍔',
  Combos: '🎁',
  Sides: '🍟',
  Beverages: '🥤',
  Desserts: '🍰'
};

const QUICK_FILTER_PILLS = [
  { id: 'bestsellers', label: 'Bestsellers', icon: '🔥' },
  { id: 'cheesy', label: 'Extra Cheesy', icon: '🧀' },
  { id: 'under99', label: 'Under ₹99', icon: '🏷️' },
  { id: 'fastPrep', label: 'Fast Prep (≤ 10m)', icon: '⚡' },
  { id: 'combos', label: 'Value Combos', icon: '🎁' }
];

const Home = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState(null);

  // Added to cart notification toast
  const [toastMessage, setToastMessage] = useState(null);

  const { addToCart } = useCart();
  const { isDark } = useTheme();
  const menuRef = useRef(null);

  // Mobile detection to bypass continuous scale transformations on phones (prevents scroll lag)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll expansion animations (Desktop only for 60fps buttery scrolling on phones)
  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.22], [1, 1.04]);
  const heroRadius = useTransform(scrollYProgress, [0, 0.2], ['0px', '32px']);
  const burgerScale = useTransform(scrollYProgress, [0.12, 0.42], [0.92, 1]);
  const drinkScale = useTransform(scrollYProgress, [0.4, 0.7], [0.92, 1]);
  const menuScale = useTransform(scrollYProgress, [0.65, 0.95], [0.96, 1]);

  const { socket } = useSocket();

  useEffect(() => {
    fetchProducts();
  }, []);

  // Real-time product inventory sync (out of stock & stock decrement)
  useEffect(() => {
    if (!socket) return;
    const handleProductUpdated = (updatedProd) => {
      if (updatedProd && updatedProd._id) {
        setProducts((prev) =>
          prev.map((p) => (p._id === updatedProd._id ? { ...p, ...updatedProd } : p))
        );
      }
    };
    const handleProductsUpdated = () => {
      fetchProducts();
    };

    socket.on('product_updated', handleProductUpdated);
    socket.on('products_updated', handleProductsUpdated);

    return () => {
      socket.off('product_updated', handleProductUpdated);
      socket.off('products_updated', handleProductsUpdated);
    };
  }, [socket]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/products');
      if (res.data.success) {
        setProducts(res.data.data);
      } else {
        setError('Failed to load menu products.');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.message || 'Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const cleanSearch = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !cleanSearch ||
        product.name.toLowerCase().includes(cleanSearch) ||
        (product.description && product.description.toLowerCase().includes(cleanSearch)) ||
        (product.category && product.category.toLowerCase().includes(cleanSearch)) ||
        (product.ingredients && product.ingredients.toLowerCase().includes(cleanSearch));

      let matchesQuickFilter = true;
      if (quickFilter === 'bestsellers') {
        matchesQuickFilter = Boolean(
          product.isPopular ||
          (product.highlights && product.highlights.some((h) => /bestseller|best value|favorite|choice|special|popular|cheesy melt|tandoori/i.test(h.title))) ||
          product.basePrice >= 149
        );
      } else if (quickFilter === 'cheesy') {
        const text = `${product.name} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
        matchesQuickFilter = text.includes('cheese') || text.includes('mozzarella') || text.includes('cheesy');
      } else if (quickFilter === 'under99') {
        const price = product.discountedPrice || product.basePrice || 0;
        matchesQuickFilter = price <= 99;
      } else if (quickFilter === 'fastPrep') {
        const mins = parseInt(product.prepTime, 10);
        matchesQuickFilter = !isNaN(mins) && mins <= 10;
      } else if (quickFilter === 'combos') {
        matchesQuickFilter = product.category === 'Combos' || product.name.toLowerCase().includes('combo');
      }

      return matchesCategory && matchesSearch && matchesQuickFilter;
    });
  }, [products, selectedCategory, searchQuery, quickFilter]);

  const groupedProducts = useMemo(() => {
    if (selectedCategory !== 'All') {
      return { [selectedCategory]: filteredProducts };
    }
    const groups = {};
    filteredProducts.forEach((product) => {
      const cat = product.category || 'Other';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(product);
    });
    return groups;
  }, [filteredProducts, selectedCategory]);

  const handleOpenProduct = (product) => {
    navigate(`/product/${product._id}`);
  };

  const handleQuickAdd = (product) => {
    addToCart(product, null, [], 1);
    showToast(`Added 1x ${product.name} to cart!`);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const scrollToMenuWithCategory = (cat) => {
    setSelectedCategory(cat);
    if (menuRef.current) {
      menuRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`w-full ${isDark ? 'bg-[#080402] text-slate-100' : 'bg-[#faf5ee] text-slate-900'} overflow-x-hidden selection:bg-orange-500 selection:text-white transition-colors duration-300`}>
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 backdrop-blur-xl px-5 py-3.5 rounded-2xl shadow-xl flex items-center space-x-3 border ${
              isDark
                ? 'bg-slate-900/95 text-white border-orange-500/40 shadow-[0_10px_35px_rgba(249,115,22,0.3)]'
                : 'bg-white/95 text-slate-900 border-orange-300 shadow-[0_10px_35px_rgba(249,115,22,0.15)]'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 1. EXPANDING 3D HERO: REALISTIC ARTISAN WOOD-FIRED PIZZA  */}
      {/* ========================================================= */}
      <motion.section
        style={isMobile ? undefined : { scale: heroScale, borderRadius: heroRadius }}
        className={`relative min-h-0 lg:min-h-[85vh] w-full flex items-center justify-center overflow-hidden px-4 sm:px-8 pt-4 pb-10 sm:py-16 origin-top transition-colors duration-300 ${
          isDark
            ? 'bg-radial-gradient from-[#240e04] via-[#120703] to-[#070302]'
            : 'bg-radial-gradient from-[#fff1e5] via-[#fef5ee] to-[#faf5ee]'
        }`}
      >
        {/* Atmospheric Glow */}
        <div className={`absolute top-4 left-6 sm:top-10 sm:left-10 w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-[90px] sm:blur-[140px] pointer-events-none ${
          isDark ? 'bg-orange-600/20' : 'bg-orange-400/25'
        }`} />
        <div className={`absolute bottom-4 right-6 sm:bottom-10 sm:right-10 w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-[90px] sm:blur-[140px] pointer-events-none ${
          isDark ? 'bg-amber-600/15' : 'bg-amber-300/30'
        }`} />

        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">
          
          {/* Left Hero Typography */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-4 sm:space-y-6 text-center lg:text-left"
          >
            <div className={`inline-flex items-center space-x-2 border px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold uppercase tracking-wide backdrop-blur-md ${
              isDark
                ? 'bg-orange-500/15 border-orange-500/35 text-orange-400'
                : 'bg-orange-100/90 border-orange-300 text-orange-800'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>Wood-Fired Fast Food • Pathardewa</span>
            </div>

            <h1 className={`text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Savor The Melt. <br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Wood-Fired Live.
              </span>
            </h1>

            <p className={`text-sm sm:text-base max-w-lg mx-auto lg:mx-0 leading-relaxed font-normal ${
              isDark ? 'text-slate-200' : 'text-slate-700'
            }`}>
              Indulge in artisanal pizzas with wood-fired charred blistered crusts, molten Italian mozzarella, and fragrant herbs. Freshly baked in our authentic stone oven in Pathardewa.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-1 sm:pt-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollToMenuWithCategory('All')}
                className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm sm:text-base flex items-center space-x-2 shadow-[0_10px_30px_rgba(249,115,22,0.35)] transition-all cursor-pointer border border-orange-400/40"
              >
                <span>Order Pizza Now</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollToMenuWithCategory('Pizzas')}
                className={`px-5 sm:px-7 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base backdrop-blur-md flex items-center space-x-2 transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                    : 'bg-white hover:bg-orange-50/60 text-slate-900 border border-slate-300 shadow-sm'
                }`}
              >
                <span>Browse Pizzas</span>
              </motion.button>
            </div>

            {/* Badges */}
            <div className={`grid grid-cols-3 gap-2 sm:gap-3 pt-4 sm:pt-6 max-w-md mx-auto lg:mx-0 ${
              isDark ? 'border-t border-white/10' : 'border-t border-orange-200/80'
            }`}>
              <div className="text-center lg:text-left">
                <span className="block text-xl sm:text-2xl font-black text-orange-500">100%</span>
                <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}>
                  Pure Mozzarella
                </span>
              </div>
              <div className="text-center lg:text-left">
                <span className="block text-xl sm:text-2xl font-black text-amber-500">20 Mins</span>
                <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}>
                  Bake Time
                </span>
              </div>
              <div className="text-center lg:text-left">
                <span className="block text-xl sm:text-2xl font-black text-emerald-500">4.9 ★</span>
                <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}>
                  Customer Rating
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Realistic 3D Pizza Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="lg:col-span-6 h-[290px] sm:h-[440px] lg:h-[540px] w-full relative flex items-center justify-center"
          >
            <div className="w-full h-full">
              <ThreeDFood variant="pizza" interactive={true} />
            </div>
          </motion.div>

        </div>

        {/* Scroll Indicator */}
        <div className="hidden sm:flex absolute bottom-3 left-1/2 -translate-x-1/2 flex-col items-center text-slate-700 dark:text-slate-400 animate-bounce pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest font-extrabold mb-1">Scroll to Expand Burgers & Cold Drinks</span>
          <ChevronDown className="w-4 h-4 text-orange-500" />
        </div>
      </motion.section>

      {/* ========================================================= */}
      {/* 2. SCROLL EXPANSION 1: REALISTIC 3D GOURMET BURGER        */}
      {/* ========================================================= */}
      <motion.section
        style={isMobile ? undefined : { scale: burgerScale }}
        className={`relative min-h-0 lg:min-h-[85vh] w-full flex items-center justify-center overflow-hidden px-3 sm:px-8 py-8 sm:py-20 rounded-3xl my-3 sm:my-4 mx-auto max-w-[98%] shadow-2xl transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-[#070302] via-[#140803] to-[#0c0502] border-t border-orange-950/40'
            : 'bg-gradient-to-b from-[#faf5ee] via-[#f7ede1] to-[#f4e4d0] border border-orange-200/80 shadow-orange-500/5'
        }`}
      >
        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center">
          
          {/* Left Column: 3D Burger Canvas */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 h-[290px] sm:h-[440px] lg:h-[540px] w-full relative flex items-center justify-center order-2 lg:order-1"
          >
            <div className="w-full h-full">
              <ThreeDFood variant="burger" interactive={true} />
            </div>
          </motion.div>

          {/* Right Column: Burger Story & Details */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-4 sm:space-y-6 text-center lg:text-left order-1 lg:order-2"
          >
            <div className={`inline-flex items-center space-x-2 border px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold uppercase tracking-wide backdrop-blur-md ${
              isDark
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-amber-100/90 border-amber-300 text-amber-800'
            }`}>
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Gourmet Char-Grilled Specials</span>
            </div>

            <h2 className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Stacked Tall, <br />
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
                Extra Dripping Cheese.
              </span>
            </h2>

            <p className={`text-sm sm:text-base leading-relaxed font-normal ${
              isDark ? 'text-slate-200' : 'text-slate-700'
            }`}>
              Toasted buttered brioche buns, seasoned char-grilled patties, double layers of melted Wisconsin cheddar cheese with melting corners, crisp iceberg lettuce, and fresh vine tomatoes.
            </p>

            <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2 text-left max-w-lg mx-auto lg:mx-0">
              <div className={`flex items-center space-x-3 text-xs sm:text-sm ${
                isDark ? 'text-slate-200' : 'text-slate-800 font-medium'
              }`}>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 text-xs font-black">
                  ✓
                </div>
                <span>Fresh Brioche Bun toasted with herb butter & sesame</span>
              </div>
              <div className={`flex items-center space-x-3 text-xs sm:text-sm ${
                isDark ? 'text-slate-200' : 'text-slate-800 font-medium'
              }`}>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 text-xs font-black">
                  ✓
                </div>
                <span>Thick savory gourmet patty with Italian seasoning</span>
              </div>
              <div className={`flex items-center space-x-3 text-xs sm:text-sm ${
                isDark ? 'text-slate-200' : 'text-slate-800 font-medium'
              }`}>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 text-xs font-black">
                  ✓
                </div>
                <span>Signature Apurva House Sauce for richness</span>
              </div>
            </div>

            <div className="pt-2 sm:pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollToMenuWithCategory('Burgers')}
                className="px-7 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm sm:text-base flex items-center space-x-2 shadow-lg shadow-orange-500/30 transition-all cursor-pointer mx-auto lg:mx-0 border border-amber-400/30"
              >
                <span>View All Burgers</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>

        </div>
      </motion.section>

      {/* ========================================================= */}
      {/* 3. SCROLL EXPANSION 2: REALISTIC 3D CHILLED COLD DRINK   */}
      {/* ========================================================= */}
      <motion.section
        style={isMobile ? undefined : { scale: drinkScale }}
        className={`relative min-h-0 lg:min-h-[85vh] w-full flex items-center justify-center overflow-hidden px-3 sm:px-8 py-8 sm:py-20 rounded-3xl my-3 sm:my-4 mx-auto max-w-[98%] shadow-2xl transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-[#0c0502] via-[#09111e] to-[#060b14] border-t border-slate-900'
            : 'bg-gradient-to-b from-[#f4e4d0] via-[#e2f1f8] to-[#d6effa] border border-sky-200/80 shadow-sky-500/5'
        }`}
      >
        <div className="absolute top-1/2 left-1/3 w-72 sm:w-96 h-72 sm:h-96 bg-cyan-600/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />

        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center">
          
          {/* Left Column: Beverage Copy */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-4 sm:space-y-6 text-center lg:text-left"
          >
            <div className={`inline-flex items-center space-x-2 border px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold uppercase tracking-wide backdrop-blur-md ${
              isDark
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : 'bg-cyan-100/90 border-cyan-300 text-cyan-800'
            }`}>
              <Zap className="w-3.5 h-3.5 text-cyan-500" />
              <span>Served Below 4°C • Maximum Effervescence</span>
            </div>

            <h2 className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Ice-Cold Drinks, <br />
              <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent">
                Frosted & Refreshing.
              </span>
            </h2>

            <p className={`text-sm sm:text-base leading-relaxed font-normal ${
              isDark ? 'text-slate-200' : 'text-slate-700'
            }`}>
              Nothing pairs better with a hot slice of wood-fired pizza than an ice-cold fizzy drink. Crystal ice cubes, effervescent bubbles, and fresh lemon with fragrant mint, poured fresh below 4°C.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2 max-w-md mx-auto lg:mx-0">
              <div className={`p-3 sm:p-4 rounded-2xl ${
                isDark ? 'bg-slate-900/80 border border-slate-800' : 'bg-white/90 border border-sky-200/80 shadow-sm'
              }`}>
                <span className="block text-xl sm:text-2xl font-black text-cyan-500">&lt; 4°C</span>
                <span className={`text-[11px] sm:text-xs font-bold ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>Chilled To Perfection</span>
              </div>
              <div className={`p-3 sm:p-4 rounded-2xl ${
                isDark ? 'bg-slate-900/80 border border-slate-800' : 'bg-white/90 border border-sky-200/80 shadow-sm'
              }`}>
                <span className="block text-xl sm:text-2xl font-black text-sky-500">100% Fizz</span>
                <span className={`text-[11px] sm:text-xs font-bold ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>Maximum Carbonation</span>
              </div>
            </div>

            <div className="pt-2 sm:pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollToMenuWithCategory('Beverages')}
                className="px-7 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-sm sm:text-base flex items-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer mx-auto lg:mx-0 border border-cyan-400/30"
              >
                <span>Add Chilled Drinks</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>

          {/* Right Column: 3D Cold Drink Canvas */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 h-[290px] sm:h-[440px] lg:h-[540px] w-full relative flex items-center justify-center"
          >
            <div className="w-full h-full">
              <ThreeDFood variant="drink" interactive={true} />
            </div>
          </motion.div>

        </div>
      </motion.section>

      {/* ========================================================= */}
      {/* 4. EXPANDING FULL MENU CATALOG SECTION                    */}
      {/* ========================================================= */}
      <motion.section
        style={isMobile ? undefined : { scale: menuScale }}
        ref={menuRef}
        id="menu-section"
        className={`w-full py-8 sm:py-20 px-3 sm:px-8 transition-colors duration-300 ${
          isDark
            ? 'bg-[#0a0f1d] border-t border-slate-800'
            : 'bg-[#fffaf5] border-t border-orange-200/60'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          
          {/* Header & Live Filter Bar */}
          <div className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b ${
            isDark ? 'border-slate-800' : 'border-orange-200/70'
          }`}>
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span>
                <h3 className={`text-xl sm:text-3xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Explore Full Menu Catalog
                </h3>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                Handcrafted Pizzas, Gourmet Burgers, Sides, and Refreshing Beverages in Pathardewa
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`} />
              <input
                type="text"
                placeholder="Search pizzas, burgers, combos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all ${
                  isDark
                    ? 'bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500'
                    : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500 shadow-sm'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-md ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/30 scale-105'
                      : isDark
                      ? 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                      : 'bg-white text-slate-800 hover:text-slate-950 hover:bg-orange-50/60 border border-slate-300 shadow-sm'
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat] || '🍽️'}</span>
                  <span>{cat}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Instant Quick Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none pt-1">
            <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 pl-1 shrink-0 ${
              isDark ? 'text-amber-400' : 'text-amber-700 font-bold'
            }`}>
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Filters:
            </span>
            {QUICK_FILTER_PILLS.map((pill) => {
              const isActive = quickFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setQuickFilter(isActive ? null : pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center space-x-1.5 shadow-sm active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-orange-500/30 scale-105'
                      : isDark
                      ? 'bg-slate-800/90 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-orange-50/80 hover:text-slate-900'
                  }`}
                >
                  <span>{pill.icon}</span>
                  <span>{pill.label}</span>
                </button>
              );
            })}
            {quickFilter && (
              <button
                onClick={() => setQuickFilter(null)}
                className="text-xs text-orange-500 hover:text-orange-600 font-bold px-2 py-1 shrink-0 underline ml-2"
              >
                Clear Filter ✕
              </button>
            )}
          </div>

          {/* Loading Skeleton: 2-in-a-row on mobile */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 pt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 animate-pulse space-y-2 sm:space-y-3 shadow-sm">
                  <div className="h-32 sm:h-48 bg-slate-200 dark:bg-slate-800 rounded-xl sm:rounded-2xl w-full" />
                  <div className="h-3.5 sm:h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-2.5 sm:h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-7 sm:h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-full mt-2 sm:mt-4" />
                </div>
              ))}
            </div>
          )}

          {/* Products Grid: 2-in-a-row on mobile */}
          {!loading && !error && (
            <div className="space-y-8 sm:space-y-12 pt-2">
              {Object.keys(groupedProducts).map((catName) => {
                const catProducts = groupedProducts[catName];
                if (!catProducts || catProducts.length === 0) return null;

                return (
                  <motion.section
                    key={catName}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    <div className={`flex items-center space-x-2.5 sm:space-x-3 pb-2 border-b ${
                      isDark ? 'border-slate-800' : 'border-orange-200/80'
                    }`}>
                      <span className="text-xl sm:text-2xl">{CATEGORY_ICONS[catName] || '🍕'}</span>
                      <h4 className={`text-lg sm:text-xl font-black tracking-tight ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        {catName}
                      </h4>
                      <span className={`text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full border ${
                        isDark
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-orange-100/90 text-orange-800 border-orange-200'
                      }`}>
                        {catProducts.length} items
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                      {catProducts.map((product) => (
                        <ProductCard
                          key={product._id}
                          product={product}
                          onSelectProduct={handleOpenProduct}
                          onQuickAdd={handleQuickAdd}
                        />
                      ))}
                    </div>
                  </motion.section>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className={`text-center py-16 rounded-3xl border p-8 shadow-sm ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="w-16 h-16 bg-orange-500/10 text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Search className="w-8 h-8" />
                  </div>
                  <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    No items found matching "{searchQuery}"
                  </h4>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                    Try searching with different keywords or clear the search filter.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reset Menu Filter
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </motion.section>
    </div>
  );
};

export default Home;
