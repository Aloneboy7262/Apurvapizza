import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import PolicyLayout, { MarkdownContent } from '../components/PolicyLayout';
import api from '../services/api';

export default function PrivacyPolicy() {
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPolicy = async () => {
      try {
        const res = await api.get('/policies/privacy-policy');
        if (res.data?.success && res.data.data) {
          setContent(res.data.data.content);
          setUpdatedAt(res.data.data.updatedAt);
        }
      } catch (err) {
        console.warn('Could not fetch privacy policy from API:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  return (
    <PolicyLayout
      title="Privacy Policy"
      badgeText="Data Protection & PCI-DSS"
      icon={Lock}
      description="Our commitment to safeguarding your personal data, secure order processing, and zero-spam policy."
      updatedAt={updatedAt}
    >
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 space-y-1.5">
        <div className="flex items-center space-x-2.5 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs sm:text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>PCI-DSS Level 1 & Zero Data Selling Guarantee</span>
        </div>
        <p className="text-xs text-emerald-700 dark:text-emerald-400/90 leading-relaxed pl-7">
          We never store customer credit/debit card numbers, CVVs, or UPI PINs. Online transactions are encrypted using 256-bit SSL encryption and routed directly through RBI-authorized payment partner Razorpay.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading privacy policy...</div>
      ) : (
        <div className="pt-2">
          <MarkdownContent content={content} />
        </div>
      )}
    </PolicyLayout>
  );
}
