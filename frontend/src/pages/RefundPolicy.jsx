import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import PolicyLayout, { MarkdownContent } from '../components/PolicyLayout';
import api from '../services/api';

export default function RefundPolicy() {
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPolicy = async () => {
      try {
        const res = await api.get('/policies/refund-policy');
        if (res.data?.success && res.data.data) {
          setContent(res.data.data.content);
          setUpdatedAt(res.data.data.updatedAt);
        }
      } catch (err) {
        console.warn('Could not fetch refund policy from API, using default:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  return (
    <PolicyLayout
      title="Cancellation & Refund Policy"
      badgeText="Razorpay Verified Standard"
      icon={RefreshCw}
      description="Transparent rules on order cancellations, quality issues, and automated 5–7 business days refund settlements."
      updatedAt={updatedAt}
    >
      {/* Razorpay Highlight Banner: 5-7 Business Days Settlement */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 space-y-2">
        <div className="flex items-center space-x-2.5 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Guaranteed 5 to 7 Business Days Refund Turnaround</span>
        </div>
        <p className="text-xs text-emerald-700 dark:text-emerald-400/90 leading-relaxed pl-7">
          All approved refunds for online gateway orders (Credit/Debit Cards, Net Banking, UPI, Wallets) are initiated back to the original source payment method within 24 hours and reflect in your account within <strong>5 to 7 business days</strong> as per standard RBI and banking settlement procedures.
        </p>
      </div>

      {/* 3 Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center font-bold text-xs">
            ⚡
          </div>
          <h4 className="text-xs font-black text-slate-900 dark:text-white">5-Min Free Cancel</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Cancel before the kitchen begins baking in the stone oven
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center font-bold text-xs">
            🍕
          </div>
          <h4 className="text-xs font-black text-slate-900 dark:text-white">Quality Guarantee</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            100% replacement or refund for damaged or wrong orders
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center font-bold text-xs">
            🛡️
          </div>
          <h4 className="text-xs font-black text-slate-900 dark:text-white">Original Source</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Money returns to your bank account or UPI automatically
          </p>
        </div>
      </div>

      {/* Dynamic Policy Markdown Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading policy details...</div>
      ) : (
        <div className="pt-2">
          {/* If API content exists, render it; otherwise default text is rendered by PolicyLayout */}
          <MarkdownContent content={content} />
        </div>
      )}
    </PolicyLayout>
  );
}
