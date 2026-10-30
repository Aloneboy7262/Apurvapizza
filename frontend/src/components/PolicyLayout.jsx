import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  RefreshCw,
  Truck,
  FileText,
  Lock,
  Info,
  Phone,
  Mail,
  MapPin,
  Clock,
  Printer,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const POLICY_NAV_LINKS = [
  { path: '/refund-policy', label: 'Refund & Cancellation', icon: RefreshCw },
  { path: '/shipping-policy', label: 'Shipping & Delivery', icon: Truck },
  { path: '/terms-and-conditions', label: 'Terms & Conditions', icon: FileText },
  { path: '/privacy-policy', label: 'Privacy Policy', icon: Lock },
  { path: '/about-us', label: 'About Us', icon: Info },
  { path: '/contact-us', label: 'Contact Us', icon: Phone }
];

/**
 * Lightweight, zero-dependency Markdown parser for policy documents
 */
export function MarkdownContent({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-3 space-y-2 pl-2">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 mr-2.5 shrink-0" />
              <span>{parseInlineBold(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const parseInlineBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-extrabold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3
          key={`h3-${idx}`}
          className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-6 mb-2 flex items-center gap-2"
        >
          <span className="w-1.5 h-4 rounded bg-orange-500 inline-block" />
          {parseInlineBold(line.replace('### ', ''))}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2
          key={`h2-${idx}`}
          className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-8 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800"
        >
          {parseInlineBold(line.replace('## ', ''))}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${idx}`} className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-4 mb-4">
          {parseInlineBold(line.replace('# ', ''))}
        </h1>
      );
    } else if (line === '---') {
      flushList();
      elements.push(
        <hr key={`hr-${idx}`} className="my-6 border-slate-200 dark:border-slate-800/80" />
      );
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      currentList.push(line.replace(/^(\*|-)\s+/, ''));
    } else if (/^\d+\.\s+/.test(line)) {
      flushList();
      const text = line.replace(/^\d+\.\s+/, '');
      elements.push(
        <div key={`num-${idx}`} className="flex items-start text-xs sm:text-sm text-slate-700 dark:text-slate-300 my-2 leading-relaxed">
          <span className="font-mono font-bold text-orange-600 dark:text-orange-400 mr-2 shrink-0">
            {line.match(/^\d+\./)[0]}
          </span>
          <span>{parseInlineBold(text)}</span>
        </div>
      );
    } else {
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-2.5">
          {parseInlineBold(line)}
        </p>
      );
    }
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

export default function PolicyLayout({
  title,
  badgeText,
  badgeColor = 'orange',
  icon: Icon = ShieldCheck,
  description,
  updatedAt,
  content,
  children
}) {
  const location = useLocation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-orange-500 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 dark:text-white font-bold">{title}</span>
        </div>

        {/* Hero Header */}
        <div className="relative rounded-3xl bg-gradient-to-br from-white via-orange-50/40 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 text-xs font-black uppercase tracking-wider">
                <Icon className="w-3.5 h-3.5" />
                <span>{badgeText || 'Official Policy & Compliance'}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {description}
                </p>
              )}
              {updatedAt && (
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-500">
                  Last verified: {new Date(updatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            <button
              onClick={handlePrint}
              type="button"
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-orange-500 dark:hover:text-orange-400 text-xs font-bold shadow-sm transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Policy</span>
            </button>
          </div>
        </div>

        {/* Tab Links Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {POLICY_NAV_LINKS.map((link) => {
            const NavIcon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                  isActive
                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-orange-500/40 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <NavIcon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Main Content Grid: Policy Body + Contact Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Document Body */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl space-y-6">
            {children ? (
              children
            ) : (
              <MarkdownContent content={content} />
            )}
          </div>

          {/* Quick Contact & Verified Merchant Sidebar */}
          <div className="space-y-6">
            {/* Merchant Identity Card */}
            <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-500 dark:text-orange-400 flex items-center justify-center font-black">
                  🍕
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Apurva Pizza Hub
                  </h3>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Merchant</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-start space-x-2.5">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Outlet Address</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Main Market Road, Near State Bank of India (SBI), Pathardewa, Deoria, Uttar Pradesh - 274404
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Customer Support</span>
                    <a href="tel:+917379682620" className="text-[11px] font-mono text-orange-600 dark:text-orange-400 hover:underline">
                      +91 73796 82620
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Email Inquiries</span>
                    <a href="mailto:support@apurvapizzahub.com" className="text-[11px] font-mono text-orange-600 dark:text-orange-400 hover:underline">
                      support@apurvapizzahub.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Business Hours</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      10:00 AM – 11:00 PM IST (Mon - Sun)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to="/contact-us"
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <span>Contact Support Team</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Payment Trust Badge */}
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-5 space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Secure Transactions
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                All online transactions are encrypted via 256-bit SSL and processed directly through RBI-authorized payment partners (Razorpay). No card credentials or UPI PINs are ever saved.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">Razorpay</span>
                <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">UPI (GPay/PhonePe)</span>
                <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">RuPay / Visa</span>
                <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">Cash on Delivery</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
