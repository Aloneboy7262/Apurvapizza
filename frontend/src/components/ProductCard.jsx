import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, SlidersHorizontal, Sparkles, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../services/imageUtils';

const ProductCard = ({ product, onSelectProduct, onQuickAdd }) => {
  const navigate = useNavigate();
  const { isInCart } = useCart();
  const itemInCart = product?._id ? isInCart(product._id) : false;

  const hasDiscount = product.discountedPrice && product.discountedPrice < product.basePrice;
  const isCustomizable = (Array.isArray(product.sizes) && product.sizes.length > 0) || product.allowToppings;

  // Compute display prices
  const displayPrice = product.discountedPrice || product.basePrice;
  const savings = hasDiscount ? product.basePrice - product.discountedPrice : 0;

  const isOutOfStock =
    product.isAvailable === false ||
    (product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity <= 0);

  const isLowStock =
    !isOutOfStock &&
    product.stockQuantity !== null &&
    product.stockQuantity !== undefined &&
    product.stockQuantity <= 5;

  const handleCardClick = () => {
    if (onSelectProduct) {
      onSelectProduct(product);
    } else {
      navigate(`/product/${product._id}`);
    }
  };

  return (
    <motion.div
      whileHover={isOutOfStock ? undefined : { y: -6, transition: { duration: 0.2 } }}
      onClick={handleCardClick}
      className={`group relative bg-white dark:bg-slate-900/95 rounded-2xl sm:rounded-3xl border ${
        isOutOfStock
          ? 'border-red-900/40 opacity-80'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-orange-500/50 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_16px_35px_rgba(249,115,22,0.18)] dark:hover:shadow-[0_20px_45px_rgba(249,115,22,0.22)]'
      } transition-all duration-300 flex flex-col overflow-hidden cursor-pointer`}
    >
      {/* Product Image Container */}
      <div className="relative h-32 sm:h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
        <img
          src={getImageUrl(product.imageURL)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
            isOutOfStock ? 'grayscale opacity-50' : 'group-hover:scale-108'
          }`}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent dark:from-slate-950 dark:opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Out of Stock Center Banner */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 z-20">
            <span className="px-3 py-1 rounded-full bg-red-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-lg border border-red-400/50 flex items-center space-x-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span>Out of Stock</span>
            </span>
            <span className="text-[10px] text-slate-300 font-semibold mt-1">Currently Sold Out</span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1 z-10">
          {/* Green Veg Dot */}
          <span className="bg-white/95 dark:bg-slate-950/85 backdrop-blur-md px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border border-emerald-500/40 flex items-center space-x-1 shadow-sm">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Veg</span>
          </span>

          {hasDiscount && (
            <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-[9px] sm:text-[11px] font-black px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-lg sm:rounded-xl shadow-md border border-red-400/30">
              Save ₹{savings}
            </span>
          )}

          {isLowStock && (
            <span className="bg-amber-500 text-slate-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg sm:rounded-xl shadow-md border border-amber-300 flex items-center space-x-1 animate-pulse">
              <span>🔥 Only {product.stockQuantity} left!</span>
            </span>
          )}
        </div>

        {/* Category Pill on right */}
        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white/95 dark:bg-black/75 backdrop-blur-md text-orange-700 dark:text-orange-300 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-white/10 shadow-sm z-10">
          {product.category}
        </span>
      </div>

      {/* Product Information Body */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className={`font-black text-sm sm:text-lg ${isOutOfStock ? 'text-slate-400' : 'text-slate-900 dark:text-white group-hover:text-orange-500'} transition-colors line-clamp-1 leading-snug`}>
            {product.name}
          </h4>

          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-normal">
            {product.description || 'Prepared fresh with quality ingredients, mozzarella, and authentic spices.'}
          </p>

          {/* Sizes preview if applicable (Desktop only for clean mobile cards) */}
          {Array.isArray(product.sizes) && product.sizes.length > 0 && (
            <div className="mt-3 hidden sm:flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Sizes:</span>
              {product.sizes.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-lg bg-orange-100/80 dark:bg-slate-800 text-[10px] font-bold text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-slate-700/80"
                >
                  {s.size.split(':')[0]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price & Action Button Footer */}
        <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-baseline justify-between sm:justify-start space-x-1 sm:space-x-1.5">
            <span className={`text-base sm:text-xl font-black ${isOutOfStock ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
              ₹{displayPrice}
            </span>
            {hasDiscount && !isOutOfStock && (
              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 line-through font-medium">
                ₹{product.basePrice}
              </span>
            )}
          </div>

          {/* Action button: Dynamic based on cart & stock state */}
          {isOutOfStock ? (
            <button
              disabled
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-red-500 dark:text-red-400 font-bold text-[11px] sm:text-xs flex items-center justify-center space-x-1 border border-red-300 dark:border-red-500/30 cursor-not-allowed opacity-80"
            >
              <span>Out of Stock</span>
            </button>
          ) : itemInCart ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/cart');
              }}
              className="w-full sm:w-auto px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center space-x-1 shadow-md shadow-emerald-500/25 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
              <span>Go to Cart →</span>
            </motion.button>
          ) : isCustomizable ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="w-full sm:w-auto px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-orange-50 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-700 text-orange-700 dark:text-orange-400 font-extrabold text-[11px] sm:text-xs flex items-center justify-center space-x-1 sm:space-x-1.5 transition-colors border border-orange-300 dark:border-orange-500/30 shadow-sm"
            >
              <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Customize</span>
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                if (onQuickAdd) {
                  onQuickAdd(product);
                } else {
                  handleCardClick();
                }
              }}
              className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center space-x-1 shadow-lg shadow-orange-500/25 transition-all"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Add</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
