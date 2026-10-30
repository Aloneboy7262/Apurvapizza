import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  Flame,
  Check,
  ChevronRight,
  Layers,
  Info,
  RotateCcw,
  Plus,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const SIZES = [
  { id: 'regular', name: 'Regular 7"', tag: 'Serves 1', basePrice: 199, dia: 180 },
  { id: 'medium', name: 'Medium 10"', tag: 'Serves 2-3 (Most Popular)', basePrice: 349, dia: 220, default: true },
  { id: 'large', name: 'Large 12"', tag: 'Serves 4-5', basePrice: 549, dia: 260 }
];

const CRUSTS = [
  { id: 'hand_tossed', name: 'Classic Hand Tossed', desc: 'Crispy outer crust with soft chewy center', price: 0 },
  { id: 'cheese_burst', name: 'Cheese Burst Core', desc: 'Stuffed with molten cheddar & mozzarella lava', price: 60, popular: true },
  { id: 'fresh_pan', name: 'Fresh Pan Base', desc: 'Thick, buttery crust with golden fried base', price: 30 },
  { id: 'thin_crispy', name: 'Thin & Crispy Wheat', desc: 'Ultra-light, cracker-style artisanal crust', price: 20 }
];

const SAUCES = [
  { id: 'marinara', name: 'Signature Herb Marinara', desc: 'Rich San Marzano tomatoes, basil & oregano', color: '#dc2626' },
  { id: 'peri_peri', name: 'Spicy Peri-Peri Heat', desc: 'Fiery bird-eye chili kick for spice lovers', color: '#b91c1c' },
  { id: 'makhani', name: 'Creamy Makhani Gravy', desc: 'Buttery Indian royal tomato & cashew blend', color: '#ea580c' },
  { id: 'garlic_herb', name: 'Creamy Garlic & Basil', desc: 'White garlic cream sauce, rich & mellow', color: '#f59e0b' }
];

const AVAILABLE_TOPPINGS = [
  { id: 'paneer', name: 'Fresh Malai Paneer', price: 35, color: '#fef08a', icon: '🧀' },
  { id: 'corn', name: 'Golden Sweet Corn', price: 25, color: '#facc15', icon: '🌽' },
  { id: 'capsicum', name: 'Crispy Green Bell Pepper', price: 25, color: '#22c55e', icon: '🫑' },
  { id: 'onion', name: 'Sweet Red Onions', price: 20, color: '#c084fc', icon: '🧅' },
  { id: 'mushroom', name: 'Button Mushrooms', price: 30, color: '#d6d3d1', icon: '🍄' },
  { id: 'olives', name: 'Black Sliced Olives', price: 30, color: '#334155', icon: '🫒' },
  { id: 'jalapeno', name: 'Pickled Jalapeños', price: 25, color: '#16a34a', icon: '🌶️' },
  { id: 'red_paprika', name: 'Spicy Red Paprika', price: 25, color: '#ef4444', icon: '🔥' },
  { id: 'tomato', name: 'Herb Roasted Tomatoes', price: 20, color: '#f87171', icon: '🍅' }
];

const CustomPizzaBuilder = () => {
  const navigate = useNavigate();
  const { addCustomPizza } = useCart();
  const { isDark } = useTheme();

  const [size, setSize] = useState(SIZES[1]); // Medium default
  const [crust, setCrust] = useState(CRUSTS[0]);
  const [sauce, setSauce] = useState(SAUCES[0]);
  const [mode, setMode] = useState('half_half'); // 'whole' or 'half_half'
  const [activeSideTab, setActiveSideTab] = useState('left'); // 'left' or 'right'
  const [leftToppings, setLeftToppings] = useState(['paneer', 'corn', 'capsicum']);
  const [rightToppings, setRightToppings] = useState(['mushroom', 'olives', 'jalapeno']);
  const [wholeToppings, setWholeToppings] = useState(['paneer', 'corn', 'capsicum']);
  const [extraCheeseBurst, setExtraCheeseBurst] = useState(true);
  const [baseProductId, setBaseProductId] = useState(null);
  const [isAddedToast, setIsAddedToast] = useState(false);
  const [splitPizzaSettings, setSplitPizzaSettings] = useState({ enabled: true, disabledMessage: '' });

  // Fetch an existing pizza product ID and split pizza settings from backend
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [prodRes, deliveryRes] = await Promise.all([
          api.get('/products').catch(() => null),
          api.get('/delivery-settings').catch(() => null)
        ]);

        if (prodRes?.data) {
          const list = prodRes.data?.data || prodRes.data || [];
          const firstPizza = list.find(p => p.category === 'Pizzas' || p.category === 'Custom') || list[0];
          if (firstPizza) {
            setBaseProductId(firstPizza._id);
          }
        }

        if (deliveryRes?.data?.data?.splitPizzaSettings) {
          setSplitPizzaSettings(deliveryRes.data.data.splitPizzaSettings);
        }
      } catch (err) {
        console.warn('Could not load base data:', err);
      }
    };
    fetchBaseData();
  }, []);

  const toggleTopping = (toppingId) => {
    if (mode === 'whole') {
      setWholeToppings(prev =>
        prev.includes(toppingId) ? prev.filter(t => t !== toppingId) : [...prev, toppingId]
      );
    } else {
      if (activeSideTab === 'left') {
        setLeftToppings(prev =>
          prev.includes(toppingId) ? prev.filter(t => t !== toppingId) : [...prev, toppingId]
        );
      } else {
        setRightToppings(prev =>
          prev.includes(toppingId) ? prev.filter(t => t !== toppingId) : [...prev, toppingId]
        );
      }
    }
  };

  const calculateTotal = () => {
    let total = size.basePrice + crust.price;
    if (extraCheeseBurst) total += 60;

    if (mode === 'whole') {
      wholeToppings.forEach(tId => {
        const t = AVAILABLE_TOPPINGS.find(item => item.id === tId);
        if (t) total += t.price;
      });
    } else {
      leftToppings.forEach(tId => {
        const t = AVAILABLE_TOPPINGS.find(item => item.id === tId);
        if (t) total += Math.round(t.price * 0.55); // Split pricing factor
      });
      rightToppings.forEach(tId => {
        const t = AVAILABLE_TOPPINGS.find(item => item.id === tId);
        if (t) total += Math.round(t.price * 0.55);
      });
    }
    return total;
  };

  const handleAddToCart = () => {
    const total = calculateTotal();
    const effectiveToppings = mode === 'whole'
      ? wholeToppings.map(id => AVAILABLE_TOPPINGS.find(t => t.id === id)?.name || id)
      : Array.from(new Set([...leftToppings, ...rightToppings])).map(id => AVAILABLE_TOPPINGS.find(t => t.id === id)?.name || id);

    addCustomPizza({
      productId: baseProductId || '650000000000000000000001',
      name: mode === 'half_half' ? 'Half & Half Artisan Pizza' : `Custom ${crust.name} Pizza`,
      price: total,
      quantity: 1,
      size: size.name,
      crust: crust.name,
      sauce: sauce.name,
      mode,
      leftHalfToppings: leftToppings.map(id => AVAILABLE_TOPPINGS.find(t => t.id === id)?.name || id),
      rightHalfToppings: rightToppings.map(id => AVAILABLE_TOPPINGS.find(t => t.id === id)?.name || id),
      toppings: effectiveToppings,
      extraCheeseBurst
    });

    setIsAddedToast(true);
    setTimeout(() => {
      setIsAddedToast(false);
      navigate('/cart');
    }, 1200);
  };

  if (splitPizzaSettings?.enabled === false) {
    return (
      <div className={`min-h-[80vh] ${isDark ? 'bg-[#080402] text-slate-100' : 'bg-[#faf5ee] text-slate-900'} flex items-center justify-center p-4`}>
        <div className={`max-w-md w-full p-8 rounded-3xl text-center space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-orange-200'} border shadow-2xl`}>
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto text-3xl">
            🍕
          </div>
          <h2 className="text-2xl font-black">Split Pizza Studio Paused</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {splitPizzaSettings.disabledMessage || 'Custom Split Pizza (Half & Half) is temporarily unavailable during kitchen peak hours.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/30 transition-all cursor-pointer"
          >
            Browse Stone-Oven Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080402] text-slate-100' : 'bg-[#faf5ee] text-slate-900'} py-6 sm:py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-black mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Pizza Studio & Half-and-Half Split</span>
          </div>
          <h1 className={`text-3xl sm:text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Build Your Dream Pizza 🍕
          </h1>
          <p className={`mt-2.5 text-xs sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
            Craft every layer from dough to oven: split styles with Half & Half, choose gourmet sauces, and load toppings your way.
          </p>
        </div>

        {/* Studio Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Canvas Column: Visual Interactive Pizza Disc */}
          <div className="lg:col-span-5 flex flex-col items-center sticky top-20 sm:top-24 z-20">
            <div className={`w-full ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-orange-200/90 shadow-xl'} backdrop-blur-xl border rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl relative overflow-hidden transition-colors`}>
              {/* Radial glow background */}
              <div
                className="absolute w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500"
                style={{ backgroundColor: sauce.color }}
              />

              {/* Pizza Visual SVG Disc */}
              <div className="relative my-4 flex items-center justify-center" style={{ width: size.dia + 40, height: size.dia + 40 }}>
                {/* Outer Crust Ring */}
                <motion.div
                  animate={{ scale: [0.98, 1, 0.98] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="rounded-full shadow-[0_20px_50px_rgba(234,88,12,0.25)] flex items-center justify-center relative"
                  style={{
                    width: size.dia,
                    height: size.dia,
                    background: 'radial-gradient(circle, #d97706 60%, #b45309 85%, #78350f 100%)',
                    border: extraCheeseBurst ? '6px solid #fbbf24' : '4px solid #92400e'
                  }}
                >
                  {/* Sauce Layer */}
                  <div
                    className="rounded-full flex items-center justify-center relative overflow-hidden transition-colors duration-500"
                    style={{
                      width: size.dia - 28,
                      height: size.dia - 28,
                      backgroundColor: sauce.color
                    }}
                  >
                    {/* Melted Mozzarella Layer */}
                    <div
                      className="absolute inset-1 rounded-full opacity-90"
                      style={{
                        background: 'radial-gradient(circle, #fef08a 30%, #fde047 80%, #eab308 100%)'
                      }}
                    />

                    {/* Half & Half Split Centerline */}
                    {mode === 'half_half' && (
                      <div className="absolute inset-y-0 left-1/2 w-0.5 border-r-2 border-dashed border-amber-900/50 z-20" />
                    )}

                    {/* Left Half Toppings Layer */}
                    <div className="absolute inset-0 flex">
                      <div className="w-1/2 h-full relative overflow-hidden p-2 flex flex-wrap content-center justify-center gap-1.5 z-10">
                        {(mode === 'half_half' ? leftToppings : wholeToppings).map((tId, idx) => {
                          const tObj = AVAILABLE_TOPPINGS.find(t => t.id === tId);
                          return (
                            <motion.span
                              key={`left-${tId}-${idx}`}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-base select-none filter drop-shadow hover:scale-125 transition-transform"
                              title={tObj?.name}
                            >
                              {tObj?.icon}
                            </motion.span>
                          );
                        })}
                      </div>

                      {/* Right Half Toppings Layer */}
                      <div className="w-1/2 h-full relative overflow-hidden p-2 flex flex-wrap content-center justify-center gap-1.5 z-10">
                        {(mode === 'half_half' ? rightToppings : wholeToppings).map((tId, idx) => {
                          const tObj = AVAILABLE_TOPPINGS.find(t => t.id === tId);
                          return (
                            <motion.span
                              key={`right-${tId}-${idx}`}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-base select-none filter drop-shadow hover:scale-125 transition-transform"
                              title={tObj?.name}
                            >
                              {tObj?.icon}
                            </motion.span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Pizza Spec Badges */}
              <div className={`w-full mt-4 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} text-center`}>
                <h3 className={`font-black ${isDark ? 'text-white' : 'text-slate-900'} text-base`}>
                  {mode === 'half_half' ? '🌓 Half & Half Split' : '🍕 Whole Uniform Pizza'}
                </h3>
                <div className="text-xs mt-1.5 flex flex-wrap items-center justify-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-orange-100 text-orange-800 border border-orange-200'}`}>
                    {size.name}
                  </span>
                  <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>•</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-orange-100 text-orange-800 border border-orange-200'}`}>
                    {crust.name}
                  </span>
                  <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>•</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-orange-100 text-orange-800 border border-orange-200'}`}>
                    {sauce.name}
                  </span>
                </div>
              </div>

              {/* Live Price Tag */}
              <div className={`w-full mt-5 p-4 rounded-2xl ${isDark ? 'bg-gradient-to-r from-orange-600/20 to-amber-600/20 border-orange-500/30' : 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300 shadow-sm'} border flex items-center justify-between`}>
                <div>
                  <div className={`text-[10px] uppercase font-black tracking-wider ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                    Estimated Total
                  </div>
                  <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    ₹{calculateTotal()}
                  </div>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-black text-sm flex items-center gap-1.5 shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Configuration Controls */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            {/* Step 1: Mode Selector (Whole vs Half & Half) */}
            <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'} border rounded-3xl p-5 sm:p-6 transition-colors`}>
              <label className={`text-xs font-black tracking-wider uppercase ${isDark ? 'text-orange-400' : 'text-orange-600'} mb-3 block`}>
                Step 1: Choose Style Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('whole')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    mode === 'whole'
                      ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-white shadow-md shadow-orange-500/10'
                      : isDark
                      ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-xl shrink-0">
                    🍕
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Whole Uniform</div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>One recipe across all slices</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('half_half')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 relative overflow-hidden cursor-pointer ${
                    mode === 'half_half'
                      ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-white shadow-md shadow-orange-500/10'
                      : isDark
                      ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-300'
                  }`}
                >
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950">
                    Hot Trend
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xl shrink-0">
                    🌓
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Half & Half (Split)</div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Two flavors in one pizza!</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Size Selection */}
            <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'} border rounded-3xl p-5 sm:p-6 transition-colors`}>
              <label className={`text-xs font-black tracking-wider uppercase ${isDark ? 'text-orange-400' : 'text-orange-600'} mb-3 block`}>
                Step 2: Pizza Size
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                      size.id === s.id
                        ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-white shadow-md'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-300'
                    }`}
                  >
                    <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.name}</div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{s.tag}</div>
                    <div className="mt-2 font-mono font-black text-orange-500 text-sm">₹{s.basePrice}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Artisanal Crust Selection */}
            <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'} border rounded-3xl p-5 sm:p-6 transition-colors`}>
              <label className={`text-xs font-black tracking-wider uppercase ${isDark ? 'text-orange-400' : 'text-orange-600'} mb-3 block`}>
                Step 3: Select Dough Crust
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CRUSTS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCrust(c)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      crust.id === c.id
                        ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-white shadow-md'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.name}</div>
                      <div className="text-xs font-mono font-black text-orange-500">
                        {c.price > 0 ? `+₹${c.price}` : 'Free'}
                      </div>
                    </div>
                    <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{c.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Sauce Selection */}
            <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'} border rounded-3xl p-5 sm:p-6 transition-colors`}>
              <label className={`text-xs font-black tracking-wider uppercase ${isDark ? 'text-orange-400' : 'text-orange-600'} mb-3 block`}>
                Step 4: Base Gourmet Sauce
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAUCES.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSauce(sc)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                      sauce.id === sc.id
                        ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-white shadow-md'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-300'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 shadow-sm" style={{ backgroundColor: sc.color }} />
                    <div>
                      <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{sc.name}</div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{sc.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 5: Toppings Selection */}
            <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'} border rounded-3xl p-5 sm:p-6 transition-colors`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <label className={`text-xs font-black tracking-wider uppercase ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                  Step 5: Pick Gourmet Toppings
                </label>

                {mode === 'half_half' && (
                  <div className={`inline-flex rounded-xl p-1 border text-xs font-bold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => setActiveSideTab('left')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        activeSideTab === 'left' ? 'bg-orange-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      👈 Left Half ({leftToppings.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSideTab('right')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        activeSideTab === 'right' ? 'bg-orange-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      👉 Right Half ({rightToppings.length})
                    </button>
                  </div>
                )}
              </div>

              {mode === 'half_half' && (
                <div className={`mb-3 px-3 py-2 rounded-xl text-[11px] border font-medium ${isDark ? 'bg-slate-950/80 border-slate-800/80 text-slate-300' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                  Editing: <strong className="text-orange-600 dark:text-orange-400">{activeSideTab === 'left' ? 'Left Half' : 'Right Half'}</strong> toppings. Switch tabs above to customize the other half.
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {AVAILABLE_TOPPINGS.map((t) => {
                  const currentList = mode === 'whole'
                    ? wholeToppings
                    : (activeSideTab === 'left' ? leftToppings : rightToppings);
                  const isSelected = currentList.includes(t.id);

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTopping(t.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/25 scale-[1.02]'
                          : isDark
                          ? 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{t.icon}</span>
                        <div className="truncate">
                          <div className={`font-black text-xs truncate ${isSelected ? 'text-white' : isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                            {t.name}
                          </div>
                          <div className={`text-[10px] font-mono font-semibold ${isSelected ? 'text-orange-100' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {mode === 'half_half' ? `+₹${Math.round(t.price * 0.55)} (half)` : `+₹${t.price}`}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-1.5 ${
                          isSelected ? 'bg-white text-orange-600 border-white' : isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 6: Extra Cheese Burst Addon */}
            <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'} border rounded-3xl p-5 flex items-center justify-between transition-colors`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xl shrink-0">
                  🧀
                </div>
                <div>
                  <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Extra Cheese Burst (+₹60)</div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Load extra mozzarella and creamy cheddar fondue lava</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={extraCheeseBurst}
                onChange={(e) => setExtraCheeseBurst(e.target.checked)}
                className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Added Toast */}
      <AnimatePresence>
        {isAddedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold shadow-2xl flex items-center gap-2 z-50"
          >
            <Check className="w-5 h-5" />
            <span>Custom Pizza Added to Cart! Redirecting...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomPizzaBuilder;
