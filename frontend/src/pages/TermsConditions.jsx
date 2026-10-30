import React, { useState, useEffect } from 'react';
import { FileText, ShieldAlert, CheckCircle2 } from 'lucide-react';
import PolicyLayout, { MarkdownContent } from '../components/PolicyLayout';
import api from '../services/api';

export default function TermsConditions() {
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPolicy = async () => {
      try {
        const res = await api.get('/policies/terms-and-conditions');
        if (res.data?.success && res.data.data) {
          setContent(res.data.data.content);
          setUpdatedAt(res.data.data.updatedAt);
        }
      } catch (err) {
        console.warn('Could not fetch terms from API:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  return (
    <PolicyLayout
      title="Terms & Conditions"
      badgeText="Legal Agreement"
      icon={FileText}
      description="Guidelines and contractual terms governing customer ordering, account use, and services provided by Apurva Pizza Hub."
      updatedAt={updatedAt}
    >
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-500/40 space-y-1.5">
        <div className="flex items-center space-x-2.5 text-blue-800 dark:text-blue-300 font-extrabold text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Customer & Merchant Contract</span>
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-400/90 leading-relaxed pl-7">
          By placing an order on Apurva Pizza Hub, you agree to these Terms and Conditions. All transactions are billed in Indian National Rupees (INR) and are subject to the exclusive jurisdiction of the competent courts in Deoria, Uttar Pradesh.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading terms & conditions...</div>
      ) : (
        <div className="pt-2">
          <MarkdownContent content={content} />
        </div>
      )}
    </PolicyLayout>
  );
}
