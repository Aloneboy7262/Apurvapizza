import React, { useState, useEffect } from 'react';
import { Info, Sparkles, ChefHat, Heart, Award } from 'lucide-react';
import PolicyLayout, { MarkdownContent } from '../components/PolicyLayout';
import api from '../services/api';

export default function AboutUs() {
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPolicy = async () => {
      try {
        const res = await api.get('/policies/about-us');
        if (res.data?.success && res.data.data) {
          setContent(res.data.data.content);
          setUpdatedAt(res.data.data.updatedAt);
        }
      } catch (err) {
        console.warn('Could not fetch about us from API:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  return (
    <PolicyLayout
      title="About Apurva Pizza Hub"
      badgeText="Authentic Wood-Fired Craft"
      icon={ChefHat}
      description="The story of our stone-oven pizzeria, cold-fermented artisan dough, 100% pure dairy mozzarella, and commitment to Pathardewa."
      updatedAt={updatedAt}
    >
      {/* 4 Feature Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center space-y-1">
          <div className="text-xl">🔥</div>
          <div className="text-xs font-black text-slate-900 dark:text-white">Stone Oven</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Baked at high heat</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
          <div className="text-xl">🌾</div>
          <div className="text-xs font-black text-slate-900 dark:text-white">Daily Fresh Dough</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Never frozen bases</div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
          <div className="text-xl">🧀</div>
          <div className="text-xs font-black text-slate-900 dark:text-white">100% Dairy Mozzarella</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Pure, zero substitutes</div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center space-y-1">
          <div className="text-xl">⏱️</div>
          <div className="text-xs font-black text-slate-900 dark:text-white">30-45 Mins Fast</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Thermal insulated bags</div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading story...</div>
      ) : (
        <div className="pt-2">
          <MarkdownContent content={content} />
        </div>
      )}
    </PolicyLayout>
  );
}
