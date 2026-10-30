import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Printer,
  X,
  TrendingUp,
  DollarSign,
  CreditCard,
  QrCode,
  ShoppingBag,
  RefreshCw,
  UtensilsCrossed,
  Truck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

const EODSummaryModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/orders/analytics/eod-report');
      if (res.data?.success) {
        setSummaryData(res.data);
      } else {
        setError('Failed to fetch EOD report data.');
      }
    } catch (err) {
      console.error('Error fetching EOD report:', err);
      setError(err.response?.data?.message || 'Could not load EOD summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const data = summaryData?.data;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white flex items-center space-x-2">
                  <span>End of Day (EOD) Operations Summary</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Live Shift Report
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {summaryData?.reportDate || new Date().toDateString()} • Apurva Pizza Hub, Pathardewa
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                title="Print Shift Summary"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print Report</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-400" />
                <p className="text-xs font-semibold">Aggregating daily receipts, cash & sales...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            ) : data ? (
              <>
                {/* Printable Report Wrapper */}
                <div id="eod-printable-area" className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Net Revenue
                      </span>
                      <span className="text-2xl font-black text-emerald-400 block">
                        ₹{data.totalSales.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Delivered Orders</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Total Orders
                      </span>
                      <span className="text-2xl font-black text-white block">
                        {data.totalOrders}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        {data.deliveredCount} Fulfilled
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Active In Prep
                      </span>
                      <span className="text-2xl font-black text-amber-400 block">
                        {data.activeCount}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Kitchen Pipeline</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Cancelled
                      </span>
                      <span className="text-2xl font-black text-rose-400 block">
                        {data.cancelledCount}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Voided tickets</span>
                    </div>
                  </div>

                  {/* Payment Reconciliations */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Payment Channel Breakdown (Cash In Till vs Digital)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-slate-400 block">Physical Cash (COD)</span>
                          <span className="text-[10px] text-slate-500">Till & Handover cash</span>
                        </div>
                        <span className="text-lg font-black text-amber-400">
                          ₹{data.payments.cash.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-slate-400 block">Store UPI QR</span>
                          <span className="text-[10px] text-slate-500">Direct VPA transfers</span>
                        </div>
                        <span className="text-lg font-black text-cyan-400">
                          ₹{data.payments.upi.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-slate-400 block">Online Gateway</span>
                          <span className="text-[10px] text-slate-500">Razorpay / NetBanking</span>
                        </div>
                        <span className="text-lg font-black text-emerald-400">
                          ₹{data.payments.online.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dining Channels & Top Sellers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Order Channels */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                        <ShoppingBag className="w-4 h-4 text-orange-400" />
                        <span>Dining Fulfillment Channels</span>
                      </h3>
                      <div className="space-y-2 pt-1 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                            <span>Dine-In Tables</span>
                          </span>
                          <span className="font-black text-white">{data.typeBreakdown.dine_in} orders</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                            <Truck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Doorstep Delivery</span>
                          </span>
                          <span className="font-black text-white">{data.typeBreakdown.delivery} orders</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                            <span>Self-Pickup / Takeaway</span>
                          </span>
                          <span className="font-black text-white">{data.typeBreakdown.takeaway} orders</span>
                        </div>
                      </div>
                    </div>

                    {/* Top Items Sold */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span>Top Selling Delicacies Today</span>
                      </h3>
                      <div className="space-y-1.5 pt-1 text-xs max-h-44 overflow-y-auto pr-1">
                        {data.topItems && data.topItems.length > 0 ? (
                          data.topItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80"
                            >
                              <span className="font-semibold text-slate-200 truncate pr-2">
                                {idx + 1}. {item.name}
                              </span>
                              <span className="font-black text-orange-400 shrink-0">
                                {item.qty} sold
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500 text-xs py-4 text-center">No items fulfilled yet today.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950/70">
            <span className="text-[11px] text-slate-500 font-mono">
              Printed on {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EODSummaryModal;
