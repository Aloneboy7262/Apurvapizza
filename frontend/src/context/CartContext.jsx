import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('apurva_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse cart from localStorage', e);
      return [];
    }
  });

  const [customerNote, setCustomerNote] = useState(() => {
    try {
      return localStorage.getItem('apurva_cart_note') || '';
    } catch {
      return '';
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem('apurva_applied_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Save cart to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('apurva_cart_items', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cartItems]);

  // Save kitchen note to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('apurva_cart_note', customerNote);
    } catch (e) {
      console.error('Failed to save customerNote to localStorage', e);
    }
  }, [customerNote]);

  // Save coupon to localStorage
  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem('apurva_applied_coupon', JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem('apurva_applied_coupon');
      }
    } catch (e) {
      console.error('Failed to save coupon to localStorage', e);
    }
  }, [appliedCoupon]);

  /**
   * Helper to generate a unique key for cart items based on product ID, size, and toppings
   */
  const getCartItemId = (productId, sizeName, toppings = []) => {
    const sortedToppings = [...toppings].sort().join('|');
    return `${productId}-${sizeName || 'standard'}-${sortedToppings}`;
  };

  /**
   * Add item to cart
   */
  const addToCart = (product, selectedSize = null, selectedToppings = [], quantity = 1) => {
    const sizeName = selectedSize ? selectedSize.size : null;
    const sizePrice = selectedSize 
      ? (selectedSize.discountedPrice || selectedSize.price)
      : (product.discountedPrice || product.basePrice);

    const toppingNames = selectedToppings.map(t => typeof t === 'string' ? t : t.name);
    const toppingsPrice = selectedToppings.reduce((sum, t) => {
      return sum + (typeof t === 'object' && t.price ? t.price : 0);
    }, 0);

    const unitPrice = sizePrice + toppingsPrice;
    const cartItemId = getCartItemId(product._id, sizeName, toppingNames);

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(item => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      } else {
        const newItem = {
          id: cartItemId,
          product: product._id,
          productId: product._id,
          name: product.name,
          category: product.category,
          imageURL: product.imageURL,
          size: sizeName,
          toppings: toppingNames,
          unitPrice,
          price: unitPrice,
          quantity: Math.max(1, quantity)
        };
        return [...prevItems, newItem];
      }
    });
  };

  /**
   * Add custom artisan/half-and-half pizza
   */
  const addCustomPizza = (customPizzaData) => {
    const customId = `custom-pizza-${Date.now()}`;
    const newItem = {
      id: customId,
      product: customPizzaData.productId,
      productId: customPizzaData.productId,
      name: customPizzaData.name || 'Custom Artisanal Pizza',
      category: 'Pizzas',
      imageURL: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
      size: customPizzaData.size,
      toppings: customPizzaData.toppings || [],
      unitPrice: customPizzaData.price,
      price: customPizzaData.price,
      quantity: 1,
      customPizza: {
        isCustom: true,
        crust: customPizzaData.crust,
        sauce: customPizzaData.sauce,
        mode: customPizzaData.mode,
        leftHalfToppings: customPizzaData.leftHalfToppings || [],
        rightHalfToppings: customPizzaData.rightHalfToppings || [],
        extraCheeseBurst: Boolean(customPizzaData.extraCheeseBurst)
      }
    };
    setCartItems(prev => [...prev, newItem]);
  };

  /**
   * Quick Add Helper (e.g. for Upselling sides & desserts)
   */
  const quickAdd = (item) => {
    addToCart(item, null, [], 1);
  };

  /**
   * Remove item completely from cart
   */
  const removeFromCart = (cartItemId) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId));
  };

  /**
   * Update quantity of an item
   */
  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  /**
   * Clear entire cart and customer note
   */
  const clearCart = () => {
    setCartItems([]);
    setCustomerNote('');
    setAppliedCoupon(null);
    localStorage.removeItem('apurva_cart_items');
    localStorage.removeItem('apurva_cart_note');
    localStorage.removeItem('apurva_applied_coupon');
  };

  // Calculations
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  const totalItems = cartItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0
  );

  // Recalculate discount if subtotal changes
  let discountAmount = 0;
  if (appliedCoupon && subtotal >= (appliedCoupon.minOrderAmount || 0)) {
    if (appliedCoupon.discountType === 'flat') {
      discountAmount = Math.min(appliedCoupon.discountValue, subtotal);
    } else if (appliedCoupon.discountType === 'percentage') {
      const calc = (subtotal * appliedCoupon.discountValue) / 100;
      discountAmount = appliedCoupon.maxDiscount ? Math.min(calc, appliedCoupon.maxDiscount) : calc;
      discountAmount = Math.round(discountAmount);
    }
  }

  const finalSubtotal = Math.max(0, subtotal - discountAmount);

  /**
   * Apply Coupon function
   */
  const applyCoupon = async (code) => {
    if (!code) throw new Error('Please enter a coupon code.');
    let userId = null;
    try {
      const stored = localStorage.getItem('apurva_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        userId = parsed?._id || parsed?.id || null;
      }
    } catch {}

    const res = await api.post('/coupons/validate', { code, subtotal, userId });
    if (res.data?.success) {
      setAppliedCoupon(res.data.data);
      return res.data;
    } else {
      throw new Error(res.data?.message || 'Invalid coupon code');
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const minOrderAmount = 149;
  const isMinOrderMet = subtotal >= minOrderAmount;
  const minOrderShortfall = Math.max(0, minOrderAmount - subtotal);

  const isInCart = (productId) => {
    if (!productId) return false;
    const strId = String(productId);
    return cartItems.some((item) => {
      const pId = item.productId || item.product?._id || item.product;
      return String(pId) === strId;
    });
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        customerNote,
        setCustomerNote,
        addToCart,
        addCustomPizza,
        quickAdd,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        totalItems,
        minOrderAmount,
        isMinOrderMet,
        minOrderShortfall,
        isInCart,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        discountAmount,
        finalSubtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
