import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Phone, ShieldAlert, ArrowRight, ChefHat, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThreeDFood from '../components/ThreeDFood';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successRole, setSuccessRole] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await login(phone.trim(), password);
      setSuccessRole(user.role);

      // Smooth redirection based on role
      setTimeout(() => {
        if (user.role === 'admin') {
          navigate('/dashboard');
        } else if (user.role === 'kitchen') {
          navigate('/kitchen');
        } else if (user.role === 'driver' || user.role === 'rider') {
          navigate('/rider');
        }
      }, 700);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please verify your credentials.';
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#070b14] overflow-hidden flex items-center justify-center p-4">
      {/* 3D Interactive Canvas Background */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <ThreeDFood variant="split" interactive={true} />
      </div>

      {/* Subtle radial gradient overlay for depth and contrast */}
      <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent via-[#070b14]/50 to-[#070b14]/90 pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-panel-glow rounded-3xl p-8 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-white">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-red-500 mx-auto flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4 border border-orange-400/30"
            >
              <ChefHat className="w-8 h-8 text-white drop-shadow" />
            </motion.div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              Apurva Pizza Hub
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-widest">
                Unified Staff
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Single Login for Admin, Kitchen Chef & Delivery Rider
            </p>

            {/* Quick Staff Scope Badges */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
                🛡️ Admin
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                👨‍🍳 Kitchen
              </span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
                🛵 Delivery Rider
              </span>
            </div>
          </div>

          {/* Error Message Notification */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 shadow-lg">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{errorMessage}</div>
                </div>
              </motion.div>
            )}

            {successRole && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Authorized as <strong>{successRole.toUpperCase()}</strong>. Entering portal...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 pl-1">
                Staff Username or Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter staff username or phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/70 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 pl-1">
                Access Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Enter access password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/70 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Liquid Motion Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 border border-orange-400/30 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Sign In to Console</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </motion.button>
          </form>

          {/* Link to Customer Storefront */}
          <div className="mt-5 pt-3 border-t border-slate-800 text-center">
            <a
              href={import.meta.env.VITE_CUSTOMER_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5173` : '/')}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-orange-400 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Looking for customer food ordering?</span>
              <span className="font-bold text-orange-400 underline">Open Customer App &rarr;</span>
            </a>
          </div>
        </div>

        {/* Security watermark footer */}
        <p className="text-center text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Powered by Apurva Unified POS & 3D Interactive Engine
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
