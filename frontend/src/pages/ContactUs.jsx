import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  Navigation
} from 'lucide-react';
import PolicyLayout from '../components/PolicyLayout';
import api from '../services/api';

export default function ContactUs() {
  const [contactData, setContactData] = useState({
    businessName: 'Apurva Pizza Hub',
    legalEntityName: 'Apurva Pizza Hub & Fast Food',
    supportEmail: 'support@apurvapizzahub.com',
    supportPhone: '+91 73796 82620',
    operatingAddress: 'Main Market Road, Near State Bank of India (SBI), Pathardewa, Deoria, Uttar Pradesh - 274404',
    city: 'Pathardewa',
    state: 'Uttar Pradesh',
    pincode: '274404',
    operatingHours: '10:00 AM – 11:00 PM (Monday to Sunday)'
  });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    subject: 'Order Inquiry',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchContact = async () => {
      try {
        const res = await api.get('/policies/contact-us');
        if (res.data?.success && res.data.data?.contact) {
          setContactData(prev => ({
            ...prev,
            ...res.data.data.contact
          }));
        }
      } catch (err) {
        console.warn('Could not fetch contact from API, using defaults:', err);
      }
    };
    fetchContact();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      setErrorMsg('Please fill in your name, contact phone number, and message.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/policies/contact', form);
      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Thank you! Your message has been received. Our team will contact you shortly.');
        setForm({
          name: '',
          phone: '',
          email: '',
          subject: 'Order Inquiry',
          message: ''
        });
      } else {
        setErrorMsg(res.data?.message || 'Failed to send message. Please call our support number directly.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Network error. Please call +91 73796 82620 directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PolicyLayout
      title="Contact Us & Operating Details"
      badgeText="Official Merchant Contact"
      icon={Phone}
      description="We are here to help! Reach out for order assistance, catering requests, or visit our stone-oven pizzeria in Pathardewa."
    >
      <div className="space-y-8">
        
        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card 1: Direct Calling & WhatsApp */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Phone & WhatsApp Support
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Instant order status, kitchen coordination & inquiries
              </p>
            </div>
            <div className="pt-1 flex flex-wrap gap-2">
              <a
                href={`tel:${contactData.supportPhone.replace(/\s+/g, '')}`}
                className="px-3.5 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-md hover:bg-orange-600 transition-all flex items-center space-x-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {contactData.supportPhone}</span>
              </a>
              <a
                href={`https://wa.me/${contactData.supportPhone.replace(/\D/g, '')}?text=Hi%20Apurva%20Pizza%20Hub,%20I%20have%20an%20inquiry%20regarding%20my%20order`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center space-x-1.5"
              >
                <span>💬 WhatsApp Us</span>
              </a>
            </div>
          </div>

          {/* Card 2: Official Support Email */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Email Inquiries
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Complaints, business proposals & party bulk bookings
              </p>
            </div>
            <div className="pt-1">
              <a
                href={`mailto:${contactData.supportEmail}`}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-all font-mono"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{contactData.supportEmail}</span>
              </a>
            </div>
          </div>

          {/* Card 3: Registered Operating Address */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Kitchen & Outlet Address
              </h4>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                {contactData.operatingAddress}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                City: {contactData.city} • State: {contactData.state} • PIN: {contactData.pincode}
              </p>
            </div>
            <div className="pt-1">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent('Apurva Pizza Hub, Pathardewa, Deoria, Uttar Pradesh')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open in Google Maps</span>
              </a>
            </div>
          </div>

          {/* Card 4: Operating Hours & Entity Name */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Kitchen Timings & Legal Info
              </h4>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                {contactData.operatingHours}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <strong>Legal Entity:</strong> {contactData.legalEntityName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                <strong>Trade Name:</strong> {contactData.businessName}
              </p>
            </div>
          </div>

        </div>

        {/* Interactive Send Message Form */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              <span>Send Us an Inquiry or Feedback</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Have a special catering request, question about an active order, or feedback for our stone oven chefs? Drop a message below and we will get back to you promptly.
            </p>
          </div>

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. name@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Subject / Category
                </label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-medium"
                >
                  <option value="Order Inquiry">Order Inquiry / Delivery Status</option>
                  <option value="Refund Request">Refund or Quality Claim</option>
                  <option value="Party Booking">Birthday / Party Bulk Booking</option>
                  <option value="General Feedback">General Feedback & Suggestions</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Message / Details *
              </label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Please describe your query or feedback in detail..."
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Sending Message...' : 'Submit Inquiry'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </PolicyLayout>
  );
}
