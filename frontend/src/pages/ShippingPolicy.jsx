import React, { useState, useEffect } from 'react';
import { Truck, Clock, ShieldCheck, MapPin, Zap } from 'lucide-react';
import PolicyLayout, { MarkdownContent } from '../components/PolicyLayout';
import api from '../services/api';

export default function ShippingPolicy() {
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPolicy = async () => {
      try {
        const res = await api.get('/policies/shipping-policy');
        if (res.data?.success && res.data.data) {
          setContent(res.data.data.content);
          setUpdatedAt(res.data.data.updatedAt);
        }
      } catch (err) {
        console.warn('Could not fetch shipping policy from API:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  return (
    <PolicyLayout
      title="Shipping & Delivery Policy"
      badgeText="Local Fast Food Delivery"
      icon={Truck}
      description="Serviceable delivery zones in Pathardewa & Deoria, standard 30–45 minutes delivery windows, and live GPS order tracking."
      updatedAt={updatedAt}
    >
      {/* 30-45 Mins Delivery Highlight */}
      <div className="p-4 sm:p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-500/40 space-y-2">
        <div className="flex items-center space-x-2.5 text-orange-800 dark:text-orange-300 font-extrabold text-xs sm:text-sm">
          <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
          <span>Hot & Fresh Pizza Delivery in 30 to 45 Minutes</span>
        </div>
        <p className="text-xs text-orange-700 dark:text-orange-400/90 leading-relaxed pl-7">
          Every pizza is hand-stretched and freshly baked in our stone oven immediately upon receiving your order. Our in-house delivery partners use insulated thermal delivery bags to ensure your pizza arrives piping hot, crisp, and fresh.
        </p>
      </div>

      {/* Delivery Zone Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center font-bold text-xs">
            🛵
          </div>
          <h4 className="text-xs font-black text-slate-900 dark:text-white">Local Free Zone</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Free doorstep delivery within Pathardewa market & under 5 km
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center font-bold text-xs">
            📍
          </div>
          <h4 className="text-xs font-black text-slate-900 dark:text-white">Pin Code 274404</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pathardewa, Tarkulwa, Rampur Karkhana & surrounding villages
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center font-bold text-xs">
            📡
          </div>
          <h4 className="text-xs font-black text-slate-900 dark:text-white">Live Status HUD</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Real-time step-by-step order tracking from baking to doorstep
          </p>
        </div>
      </div>

      {/* Dynamic Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading delivery policy...</div>
      ) : (
        <div className="pt-2">
          <MarkdownContent content={content} />
        </div>
      )}
    </PolicyLayout>
  );
}
