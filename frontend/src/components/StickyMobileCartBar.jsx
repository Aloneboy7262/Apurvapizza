import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

const StickyMobileCartBar = () => {
  const { totalItems, subtotal, finalSubtotal, discountAmount } = useCart();
  const { isDark } = useTheme();
  const location = useLocation();

  // Hide on Cart and Checkout pages where full cart details are already visible
  const isHiddenPage = ['/cart', '/checkout'].includes(location.pathname);

  if (totalItems <= 0 || isHiddenPage) {
    return null;
  }

  const displayTotal = finalSubtotal || subtotal;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-40 sm:max-w-md pointer-events-auto"
      >
        <Link
          to="/cart"
          className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all group ${
            isDark
              ? 'bg-slate-900/95 border-orange-500/40 shadow-[0_12px_40px_rgba(249,115,22,0.35)] text-white hover:border-orange-400'
              : 'bg-white/95 border-orange-400 shadow-[0_12px_40px_rgba(249,115,22,0.25)] text-slate-900 hover:border-orange-500'
          }`}
        >
          {/* Left: Cart items count & subtotal */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {totalItems}
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-black tracking-tight text-orange-500">
                  ₹{displayTotal}
                </span>
                {discountAmount > 0 && (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> -₹{discountAmount}
                  </span>
                )}
              </div>
              <p className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {totalItems} {totalItems === 1 ? 'item added' : 'items added'}
              </p>
            </div>
          </div>

          {/* Right: Checkout CTA button */}
          <div className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-md shadow-orange-500/30 group-hover:shadow-orange-500/50 group-hover:translate-x-0.5 transition-all">
            <span>View Cart</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};

export default StickyMobileCartBar;
