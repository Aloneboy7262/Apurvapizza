import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  ChefHat,
  Truck,
  RefreshCw,
  Sparkles,
  CreditCard
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      {/* Sleek Top Highlights Strip */}
      <div className="border-b border-slate-200/60 dark:border-slate-800/60 py-3 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-500">🌿</span>
            <span>100% Pure Veg & Stone Deck Oven Baked</span>
          </div>
          <div className="flex items-center space-x-2">
            <Truck className="w-3.5 h-3.5 text-orange-500" />
            <span>30–45 Mins Hot Doorstep Delivery</span>
          </div>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
            <span>Razorpay UPI, Cards & Cash on Delivery</span>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>FSSAI Hygiene Certified Kitchen</span>
          </div>
        </div>
      </div>

      {/* Main Compact Footer Columns */}
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link to="/" className="inline-flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white text-base shadow-md shadow-orange-500/25">
                🍕
              </div>
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                Apurva <span className="text-orange-500">Pizza Hub</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Handcrafted stone-deck pizzas, stuffed garlic breads, gourmet burgers & creamy shakes in Pathardewa.
            </p>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3" />
              <span>100% Pure Veg Kitchen</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Quick Links
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/" className="hover:text-orange-500 transition-colors">
                  🍕 Pizzas & Combos
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-orange-500 transition-colors">
                  🍔 Burgers & Sides
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-orange-500 transition-colors">
                  🛒 Cart & Checkout
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-orange-500 transition-colors">
                  📦 Track Active Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Policies */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Policies
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/refund-policy" className="hover:text-orange-500 transition-colors">
                  Refund & Cancellation
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="hover:text-orange-500 transition-colors">
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="hover:text-orange-500 transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-orange-500 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/about-us" className="hover:text-orange-500 transition-colors">
                  About Us & Story
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Hours */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Store & Support
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-start space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                <span className="leading-tight">
                  Main Market Road, Near SBI, Pathardewa (UP) - 274404
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <a href="tel:+917379682620" className="font-mono text-orange-600 dark:text-orange-400 hover:underline font-bold">
                  +91 73796 82620
                </a>
              </div>
              <div className="flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <a href="mailto:support@apurvapizzahub.com" className="font-mono hover:underline">
                  support@apurvapizzahub.com
                </a>
              </div>
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>10:00 AM – 11:00 PM (Daily)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Payment Pills */}
        <div className="mt-8 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
          <p>© {currentYear} Apurva Pizza Hub & Fast Food. All Rights Reserved.</p>
          <div className="flex items-center space-x-2 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800">Razorpay UPI</span>
            <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800">Cards</span>
            <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800">Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
