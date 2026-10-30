import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ActiveOrderTracker from './components/ActiveOrderTracker';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import InstallAppBanner from './components/InstallAppBanner';
import StickyMobileCartBar from './components/StickyMobileCartBar';

// Direct import for Home to ensure instant First Contentful Paint
import Home from './pages/Home';

// Lazy-loaded secondary application views (drastically reduces initial JS bundle)
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const CustomPizzaBuilder = lazy(() => import('./pages/CustomPizzaBuilder'));

// Lazy-loaded policy & legal compliance pages
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy'));
const TermsConditions = lazy(() => import('./pages/TermsConditions'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const ContactUs = lazy(() => import('./pages/ContactUs'));

/**
 * Premium Suspense Fallback Loader
 */
const PageFallbackLoader = () => (
  <div className="min-h-[60vh] w-full flex flex-col items-center justify-center p-8 space-y-4">
    <div className="relative w-14 h-14 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-4 border-orange-500/20 animate-ping" />
      <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
    </div>
    <div className="text-center space-y-1">
      <p className="text-sm font-black tracking-wide text-orange-500 uppercase animate-pulse">
        Apurva Pizza Hub
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Loading delicious pizzas...
      </p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <ScrollToTop />
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <SocketProvider>
              <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col font-sans selection:bg-orange-500 selection:text-white transition-colors duration-300">
                {/* Consistent Navbar across all customer views */}
                <Navbar />

                {/* Global Real-time Order Tracking HUD */}
                <ActiveOrderTracker />

                {/* PWA Mobile App Installation Banner */}
                <InstallAppBanner />

                {/* Floating Sticky Mobile Cart Bar for instant conversion */}
                <StickyMobileCartBar />

                {/* Application Main Route Views with Code-Splitting Suspense */}
                <main className="flex-1 w-full max-w-full overflow-x-hidden">
                  <ErrorBoundary>
                    <Suspense fallback={<PageFallbackLoader />}>
                      <Routes>
                        {/* 1. Home & Menu Page (Instant Load) */}
                        <Route path="/" element={<Home />} />
                        <Route path="/table/:tableNumber" element={<Home />} />

                        {/* 1b. Dedicated Product Details Page */}
                        <Route path="/product/:id" element={<ProductDetails />} />

                        {/* 1c. Interactive Half & Half Pizza Studio */}
                        <Route path="/custom-pizza" element={<CustomPizzaBuilder />} />

                        {/* 2. Cart & Validation Page */}
                        <Route path="/cart" element={<Cart />} />

                        {/* 3. Checkout & Payment Page */}
                        <Route path="/checkout" element={<Checkout />} />

                        {/* 4. Dedicated Customer Login & Register */}
                        <Route path="/login" element={<Login />} />

                        {/* 5. Profile & Live Order Tracking Page */}
                        <Route path="/profile" element={<Profile />} />

                        {/* 6. Razorpay Compliance & Policy Pages */}
                        <Route path="/refund-policy" element={<RefundPolicy />} />
                        <Route path="/cancellation-refund" element={<RefundPolicy />} />
                        <Route path="/cancellation" element={<RefundPolicy />} />

                        <Route path="/shipping-policy" element={<ShippingPolicy />} />
                        <Route path="/delivery-policy" element={<ShippingPolicy />} />
                        <Route path="/delivery" element={<ShippingPolicy />} />

                        <Route path="/terms-and-conditions" element={<TermsConditions />} />
                        <Route path="/terms" element={<TermsConditions />} />

                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />

                        <Route path="/about-us" element={<AboutUs />} />
                        <Route path="/about" element={<AboutUs />} />

                        <Route path="/contact-us" element={<ContactUs />} />
                        <Route path="/contact" element={<ContactUs />} />

                        {/* Fallback route */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </main>

                {/* Rich Compliance Footer */}
                <Footer />
              </div>
            </SocketProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
