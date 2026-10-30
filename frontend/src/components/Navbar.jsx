import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User, LogOut, Pizza, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems, subtotal } = useCart();
  const { isConnected, isShopOpen, shopStatus } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto close mobile menu when user starts scrolling or changes location
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleScroll = () => {
      setMobileMenuOpen(false);
    };

    const handleTouchMove = (e) => {
      const menuEl = document.getElementById('mobile-drawer-menu');
      // If user starts scrolling / swiping outside or begins page scrolling
      if (!menuEl || !menuEl.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#faf5ee]/95 dark:bg-[#0c0704]/95 backdrop-blur-xl border-b border-orange-200/80 dark:border-orange-950/60 shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] transition-colors duration-300">
      {!isShopOpen && (
        <div className="w-full bg-gradient-to-r from-red-950/95 via-amber-950/95 to-red-950/95 border-b border-red-500/40 py-2 px-3 text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2 text-xs font-semibold text-red-200">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0"></span>
            <span className="truncate">
              {shopStatus?.closedMessage || 'Store is currently closed for live baking.'}
              {shopStatus?.allowPreorders && (
                <span className="text-amber-300 ml-1.5 font-bold hidden sm:inline">
                  (You can schedule an order for later today)
                </span>
              )}
            </span>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Brand Logo & Name (Touch & shrink-safe for 320px+ mobile screens) */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0 shrink">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform border border-orange-400/30 shrink-0">
              <Pizza className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 truncate">
              <span className="text-base sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors truncate block">
                Apurva <span className="text-orange-500">Pizza Hub</span>
              </span>
              <p className="hidden sm:block text-[11px] text-slate-600 dark:text-slate-400 font-medium tracking-wide truncate">
                Fresh Wood-Fired • Pathardewa
              </p>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link
              to="/"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isActive('/')
                  ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/40 shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10'
              }`}
            >
              Menu
            </Link>
            <Link
              to="/custom-pizza"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-1.5 ${
                isActive('/custom-pizza')
                  ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/40 shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10'
              }`}
            >
              <span>🎨 Pizza Studio</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30">
                Split
              </span>
            </Link>
            <Link
              to="/profile"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
                isActive('/profile')
                  ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/40 shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10'
              }`}
            >
              <span>Live Orders</span>
              {isAuthenticated && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </Link>
          </nav>

          {/* Right Action Icons & Auth */}
          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            
            {/* Live Store Open / Closed Status Badge */}
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isShopOpen
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-300'
              }`}
              title={
                isShopOpen
                  ? `Store is Open • Hours: ${shopStatus?.openingTime || '10:00'} - ${shopStatus?.closingTime || '23:00'}`
                  : (shopStatus?.closedMessage || 'Store is currently closed')
              }
            >
              <span className={`w-2 h-2 rounded-full ${isShopOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-[11px] font-bold">
                {isShopOpen ? 'Store Open' : 'Store Closed'}
              </span>
            </div>

            {/* Cart Button: compact on mobile, expanded on desktop */}
            <Link
              to="/cart"
              className={`relative flex items-center space-x-1.5 sm:space-x-2 p-2 sm:px-4 sm:py-2 rounded-xl border transition-all ${
                isActive('/cart')
                  ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/30'
                  : 'bg-orange-100/90 dark:bg-orange-500/15 border-orange-300 dark:border-orange-500/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200/90 dark:hover:bg-orange-500/25'
              }`}
              aria-label="Shopping Cart"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 bg-red-600 text-white font-extrabold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-bounce">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">Cart</span>
                <span className="text-xs font-black">₹{subtotal.toFixed(0)}</span>
              </div>
            </Link>

            {/* Day / Night Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/60 text-amber-400 hover:bg-slate-800 hover:border-amber-400/40 shadow-sm'
                  : 'bg-amber-100/90 border-amber-300 text-orange-600 hover:bg-amber-200 shadow-sm'
              }`}
              title={isDark ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
              aria-label="Toggle Day/Night mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-800" />}
            </button>

            {/* Desktop Auth State */}
            <div className="hidden md:flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
                    title="View Profile and Order History"
                  >
                    <User className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                    <span className="max-w-[100px] truncate">
                      {user?.name?.split(' ')[0] || 'Account'}
                    </span>
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-500/25 border border-orange-400/30"
                >
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden rounded-xl text-slate-700 dark:text-slate-300 hover:bg-orange-500/10 transition-colors shrink-0"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-orange-500" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu with Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop Overlay - Tapping outside closes the menu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 top-16 sm:top-20 bg-black/40 backdrop-blur-sm z-30 md:hidden"
              aria-hidden="true"
            />

            {/* Mobile Drawer Menu (Slide-in) */}
            <motion.div
              id="mobile-drawer-menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden relative z-40 border-b border-orange-200/80 dark:border-orange-950/80 bg-[#faf5ee]/98 dark:bg-[#0c0704]/98 px-4 pt-3 pb-5 space-y-2.5 shadow-2xl backdrop-blur-2xl"
            >
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl font-bold text-sm ${
                  isActive('/') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30' : 'text-slate-800 dark:text-slate-300 hover:bg-orange-500/10'
                }`}
              >
                🍕 Food Menu
              </Link>
              <Link
                to="/custom-pizza"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm ${
                  isActive('/custom-pizza') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30' : 'text-slate-800 dark:text-slate-300 hover:bg-orange-500/10'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>🎨 Pizza Studio</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    Split
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Custom</span>
              </Link>
              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm ${
                  isActive('/cart') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30' : 'text-slate-800 dark:text-slate-300 hover:bg-orange-500/10'
                }`}
              >
                <span>🛒 My Cart</span>
                <span className="text-xs bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/40 px-2.5 py-0.5 rounded-full font-bold">
                  {totalItems} items (₹{subtotal.toFixed(0)})
                </span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm ${
                  isActive('/profile') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30' : 'text-slate-800 dark:text-slate-300 hover:bg-orange-500/10'
                }`}
              >
                <span>📦 Order History & Live Tracking</span>
                {isConnected && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    Live
                  </span>
                )}
              </Link>

              {/* User Auth in Mobile Menu */}
              {isAuthenticated ? (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{user?.name}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
                      {user?.role || 'Customer'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40 font-bold text-sm transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center mt-3 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 border border-orange-400/30"
                >
                  Sign In / Register
                </Link>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
