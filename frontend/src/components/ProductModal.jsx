import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getImageUrl } from '../services/imageUtils';

const TOPPING_OPTIONS = [
  { id: 'cheese_burst', name: 'Extra Cheese Burst', price: 40, tag: 'Bestseller' },
  { id: 'extra_cheese', name: 'Extra Cheese', price: 40, tag: 'Must Have' },
  { id: 'paneer', name: 'Paneer Chunks', price: 30, tag: 'Popular' },
  { id: 'jalapeno', name: 'Jalapeno', price: 20 },
  { id: 'olives', name: 'Black Olive', price: 20 },
  { id: 'capsicum', name: 'Capsicum', price: 15 },
  { id: 'mushroom', name: 'Mushroom', price: 15 },
  { id: 'red_pepper', name: 'Red / Green Pepper', price: 15 },
  { id: 'corn', name: 'Corn', price: 15 }
];

const ProductModal = ({ product, isOpen, onClose, onAddToCart }) => {
  if (!isOpen || !product) return null;

  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  const canHaveToppings = product.allowToppings || product.category === 'Pizzas';

  // Default to first size (or Medium if available, else first)
  const [selectedSize, setSelectedSize] = useState(() => {
    if (!hasSizes) return null;
    const medium = product.sizes.find(s => s.size.includes('M:') || s.size.includes('9'));
    return medium || product.sizes[0];
  });

  const [selectedToppings, setSelectedToppings] = useState([]);
  const [quantity, setQuantity] = useState(1);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      if (hasSizes) {
        const medium = product.sizes.find(s => s.size.includes('M:') || s.size.includes('9'));
        setSelectedSize(medium || product.sizes[0]);
      } else {
        setSelectedSize(null);
      }
      setSelectedToppings([]);
      setQuantity(1);
    }
  }, [product]);

  // Handle Topping Toggle
  const toggleTopping = (topping) => {
    setSelectedToppings(prev => {
      const exists = prev.some(t => t.name === topping.name);
      if (exists) {
        return prev.filter(t => t.name !== topping.name);
      } else {
        return [...prev, topping];
      }
    });
  };

  const isOutOfStock =
    product.isAvailable === false ||
    (product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity <= 0);

  const maxAvailable =
    product.stockQuantity !== null && product.stockQuantity !== undefined
      ? Math.max(0, product.stockQuantity)
      : null;

  const currentBasePrice = selectedSize
    ? selectedSize.price
    : product.basePrice;

  const currentEffectivePrice = selectedSize
    ? (selectedSize.discountedPrice || selectedSize.price)
    : (product.discountedPrice || product.basePrice);

  const toppingsTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const singleItemPrice = currentEffectivePrice + toppingsTotal;
  const totalPrice = singleItemPrice * quantity;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, selectedSize, selectedToppings, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col border border-slate-200 dark:border-orange-500/30 text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/80 dark:bg-black/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-black/90 backdrop-blur-md transition-all border border-slate-200 dark:border-white/10 shadow-sm"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image Banner */}
        <div className="relative h-52 sm:h-64 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-t-3xl shrink-0">
          <img
            src={getImageUrl(product.imageURL)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80';
            }}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 z-10">
              <span className="px-4 py-1.5 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg border border-red-400/50 flex items-center space-x-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span>Out of Stock</span>
              </span>
              <span className="text-xs text-slate-300 font-semibold mt-1">Currently Sold Out</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-500 text-white mb-1 shadow-md">
                {product.category}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-snug drop-shadow-md">
                {product.name}
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          {product.description && (
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {product.description}
            </p>
          )}

          {/* Size Selection (if applicable) */}
          {hasSizes && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  1. Select Crust & Size <span className="text-orange-500">*</span>
                </h4>
                <span className="text-[11px] text-orange-800 dark:text-orange-400 font-bold bg-orange-100/90 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 px-2 py-0.5 rounded-md">
                  Choose 1
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {product.sizes.map((s) => {
                  const isSelected = selectedSize?.size === s.size;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`relative p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/20 shadow-md shadow-orange-500/15 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-850/60 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <span className={`block font-black text-xs sm:text-sm ${isSelected ? 'text-orange-700 dark:text-orange-300' : 'text-slate-900 dark:text-white'}`}>
                          {s.size}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                          {s.size.includes('S:') ? 'Serves 1' : s.size.includes('M:') ? 'Serves 2' : 'Serves 3-4'}
                        </span>
                      </div>
                      <div className="mt-2">
                        {s.discountedPrice ? (
                          <div className="flex items-baseline space-x-1.5">
                            <span className="text-xs sm:text-sm font-extrabold text-orange-700 dark:text-orange-400">
                              ₹{s.discountedPrice}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-500 line-through">
                              ₹{s.price}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                            ₹{s.price}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-sm">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra Toppings Section */}
          {canHaveToppings && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {hasSizes ? '2. Add Extra Toppings' : 'Customise Toppings'}
                  </h4>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Optional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {TOPPING_OPTIONS.map((topping) => {
                  const isChecked = selectedToppings.some(t => t.name === topping.name);
                  return (
                    <label
                      key={topping.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/15 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTopping(topping)}
                          className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-semibold block">{topping.name}</span>
                          {topping.tag && (
                            <span className="text-[10px] text-orange-700 dark:text-orange-400 font-bold uppercase tracking-wider">
                              ★ {topping.tag}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                        +₹{topping.price}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity and Dynamic Price Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block uppercase font-bold tracking-wider">Quantity</span>
                {maxAvailable !== null && !isOutOfStock && maxAvailable <= 5 && (
                  <span className="text-[10px] font-bold text-amber-500">
                    (Only {maxAvailable} left)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3 mt-1.5">
                <button
                  type="button"
                  disabled={isOutOfStock || quantity <= 1}
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold active:scale-95 transition-all shadow-sm disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-extrabold text-base text-slate-900 dark:text-white w-5 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={isOutOfStock || (maxAvailable !== null && quantity >= maxAvailable)}
                  onClick={() => setQuantity(prev => maxAvailable !== null ? Math.min(maxAvailable, prev + 1) : prev + 1)}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold active:scale-95 transition-all shadow-sm disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dynamic Total calculation */}
            <div className="text-right">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider block">Total</span>
              <div className="flex items-baseline justify-end space-x-2 mt-0.5">
                {currentBasePrice > currentEffectivePrice && !isOutOfStock && (
                  <span className="text-xs text-slate-500 dark:text-slate-500 line-through">
                    ₹{(currentBasePrice + toppingsTotal) * quantity}
                  </span>
                )}
                <span className={`text-2xl font-black ${isOutOfStock ? 'text-slate-400 line-through' : 'text-orange-700 dark:text-orange-400'}`}>
                  ₹{totalPrice}
                </span>
              </div>
              {selectedToppings.length > 0 && !isOutOfStock && (
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  {selectedToppings.length} topping(s) included
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Sticky Add to Cart CTA */}
        <div className="sticky bottom-0 p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 rounded-b-3xl">
          {isOutOfStock ? (
            <button
              type="button"
              disabled
              className="w-full py-4 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-red-500 dark:text-red-400 font-bold text-base border border-red-300 dark:border-red-500/30 cursor-not-allowed opacity-80 flex items-center justify-center space-x-2"
            >
              <span>Out of Stock (Currently Sold Out)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 text-white font-black text-base shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all flex items-center justify-between border border-orange-400/30 cursor-pointer"
            >
              <span>Add to Cart</span>
              <span>₹{totalPrice}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProductModal;
