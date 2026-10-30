import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import {
  ChefHat,
  Clock,
  CheckCircle,
  Truck,
  Flame,
  Volume2,
  VolumeX,
  X,
  ChevronUp,
  ChevronDown,
  ShoppingBag,
  Bell,
  Sparkles,
  MapPin,
  ExternalLink
} from 'lucide-react';

const STATUS_STEPS = [
  { key: 'Pending', label: 'Placed', icon: Clock, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500' },
  { key: 'Preparing', label: 'Baking', icon: Flame, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500' },
  { key: 'Ready', label: 'Packed', icon: Sparkles, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-500' },
  { key: 'Out for Delivery', label: 'On Way', icon: Truck, color: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-500' },
  { key: 'Delivered', label: 'Delivered', icon: CheckCircle, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500' }
];

const ActiveOrderTracker = () => {
  const { activeOrder, dismissActiveOrder, liveAlert, setLiveAlert, isConnected, toggleSound, playStatusChime } = useSocket();
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const getStepIndex = (status) => {
    switch (status) {
      case 'Pending':
        return 0;
      case 'Preparing':
        return 1;
      case 'Ready':
        return 2;
      case 'Out for Delivery':
        return 3;
      case 'Delivered':
        return 4;
      default:
        return 0;
    }
  };

  const handleToggleSound = () => {
    const nextState = toggleSound();
    setSoundOn(nextState);
  };

  return (
    <>
      {/* 1. High-Priority Floating Live Alert Toast (Appears on status transitions) */}
      <AnimatePresence>
        {liveAlert && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-20 left-3 right-3 sm:left-auto sm:right-6 z-50 max-w-sm sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-orange-500 text-slate-900 dark:text-white rounded-3xl p-4 shadow-[0_15px_45px_rgba(249,115,22,0.25)] flex items-start space-x-3.5"
          >
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-500 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/40">
              <Bell className="w-5 h-5 animate-bounce text-amber-500 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-orange-700 dark:text-orange-400">
                  ⚡ Kitchen Order Live Update
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{liveAlert.timestamp}</span>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                Order #{liveAlert.orderId.slice(-6).toUpperCase()}
              </p>
              <div className="inline-flex items-center space-x-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 text-xs font-black border border-orange-300 dark:border-orange-500/30">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span>{liveAlert.statusLabel}</span>
              </div>
            </div>
            <button
              onClick={() => setLiveAlert(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Persistent Floating Real-Time Order Tracker Pill / Expanded HUD (Only while order is active and in-progress) */}
      <AnimatePresence>
        {activeOrder && !['Delivered', 'Completed', 'Cancelled'].includes(activeOrder.status) && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-[430px] z-40 select-none"
          >
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-orange-400/80 dark:border-orange-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_15px_45px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-slate-900 dark:text-white space-y-3.5">
              
              {/* Tracker Top Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/30">
                    <ChefHat className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                        Order #{activeOrder._id.slice(-6).toUpperCase()}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider">
                        {isConnected ? 'Live Sync' : 'Connecting'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold block">
                      {activeOrder.status === 'Pending' && '🟡 Order Placed • Queued in Kitchen'}
                      {activeOrder.status === 'Preparing' && '🔥 In Oven • Chef is baking your pizza'}
                      {activeOrder.status === 'Ready' && '📦 Packed & Baked • Ready for dispatch'}
                      {activeOrder.status === 'Out for Delivery' && '🛵 Out for Delivery • Rider heading to your doorstep'}
                      {activeOrder.status === 'Delivered' && '🟢 Delivered • Hot & fresh! Enjoy meal'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  {/* Sound Toggle */}
                  <button
                    onClick={handleToggleSound}
                    title={soundOn ? 'Kitchen Chime Active' : 'Kitchen Chime Muted'}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                  >
                    {soundOn ? <Volume2 className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>

                  {/* Expand / Minimize */}
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? 'Collapse' : 'Expand Details'}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>

                  {/* Dismiss */}
                  <button
                    onClick={dismissActiveOrder}
                    title="Dismiss Widget"
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 4-Step Animated Progress Stepper */}
              <div className="pt-1">
                <div className="relative flex items-center justify-between">
                  {/* Background Track */}
                  <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 -z-0">
                    <motion.div
                      className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(getStepIndex(activeOrder.status) / (STATUS_STEPS.length - 1)) * 100}%`
                      }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Step Nodes */}
                  {STATUS_STEPS.map((step, idx) => {
                    const isPassed = getStepIndex(activeOrder.status) >= idx;
                    const isCurrent = getStepIndex(activeOrder.status) === idx;
                    const IconComp = step.icon;

                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isCurrent
                              ? `${step.bg} text-white shadow-[0_0_15px_rgba(249,115,22,0.8)] scale-110`
                              : isPassed
                              ? `${step.bg} text-white`
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className={`text-[9px] font-bold mt-1 ${
                            isCurrent ? step.color : isPassed ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-500 dark:text-slate-500 font-medium'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expandable Order Details Drawer */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 overflow-hidden"
                  >
                    {/* Items List */}
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {activeOrder.items?.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-xs text-slate-800 dark:text-slate-300">
                          <span className="font-semibold truncate max-w-[70%]">
                            {item.quantity}x {item.name} {item.size ? `(${item.size})` : ''}
                          </span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Customer Kitchen Note if any */}
                    {activeOrder.customerNote && (
                      <div className="p-2.5 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-200 dark:border-orange-500/30 text-xs text-orange-950 dark:text-orange-200 flex items-start space-x-2">
                        <ChefHat className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-orange-700 dark:text-orange-400 block">
                            Your Kitchen Note:
                          </span>
                          <span className="font-medium italic">"{activeOrder.customerNote}"</span>
                        </div>
                      </div>
                    )}

                    {/* Delivery Address */}
                    {activeOrder.deliveryAddress && (
                      <div className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{activeOrder.deliveryAddress}</span>
                      </div>
                    )}

                    {/* Live Rider GPS Stream (Swiggy / Zomato Style Tracking) */}
                    {activeOrder.status === 'Out for Delivery' && (
                      <div className="p-3 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-cyan-950/70 rounded-2xl border border-cyan-500/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-cyan-400 font-black text-xs">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            <span>Live Rider Route</span>
                          </div>
                          <span className="text-[10px] text-cyan-300 font-mono">
                            {activeOrder.riderLiveCoords ? 'GPS Live Tracking' : 'Connecting to Driver GPS...'}
                          </span>
                        </div>

                        {/* Visual Animated Delivery Route HUD */}
                        <div className="relative h-14 bg-slate-950/80 rounded-xl border border-cyan-500/30 p-2 flex items-center justify-between px-4 overflow-hidden">
                          <div className="flex flex-col items-center z-10">
                            <span className="text-sm">🍕</span>
                            <span className="text-[9px] text-slate-400 font-bold">Kitchen</span>
                          </div>

                          {/* Animated moving bike */}
                          <div className="flex-1 mx-3 relative">
                            <div className="h-1 bg-cyan-900/50 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-cyan-400"
                                animate={{ width: ['20%', '85%', '20%'] }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                              />
                            </div>
                            <motion.div
                              className="absolute -top-3 text-lg select-none"
                              animate={{ left: ['10%', '80%', '10%'] }}
                              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              🛵
                            </motion.div>
                          </div>

                          <div className="flex flex-col items-center z-10">
                            <span className="text-sm">🏠</span>
                            <span className="text-[9px] text-slate-400 font-bold">Your Doorstep</span>
                          </div>
                        </div>

                        {/* Live ETA calculation */}
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-300">
                            ETA: <strong className="text-cyan-300">~5–8 minutes away</strong>
                          </span>
                          {activeOrder.customerCoords?.latitude && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.customerCoords.latitude},${activeOrder.customerCoords.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 text-[10px] underline"
                            >
                              <span>Open Live Map</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rider Information Card */}
                    {activeOrder.rider?.name && (
                      <div className="p-2.5 bg-cyan-50/90 dark:bg-gradient-to-r dark:from-cyan-950/70 dark:to-slate-900 rounded-2xl border border-cyan-200 dark:border-cyan-500/40 text-xs text-cyan-950 dark:text-cyan-200 flex items-center justify-between shadow-sm">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold border border-cyan-500/30 text-sm">
                            🛵
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-cyan-700 dark:text-cyan-400 block">
                              Delivery Partner Assigned
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{activeOrder.rider.name}</span>
                          </div>
                        </div>
                        {activeOrder.rider.phone && (
                          <a
                            href={`tel:${activeOrder.rider.phone}`}
                            className="px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs flex items-center space-x-1 transition-all shadow-md shadow-cyan-500/20"
                          >
                            <span>📞 Call</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Total & Link to Profile */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block font-bold">
                          Total Amount
                        </span>
                        <span className="text-base font-black text-orange-600 dark:text-orange-400">
                          ₹{activeOrder.totalAmount}
                        </span>
                      </div>

                      <Link
                        to="/profile"
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs flex items-center space-x-1.5 transition-colors shadow-md shadow-orange-500/20"
                      >
                        <span>View on Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ActiveOrderTracker;
