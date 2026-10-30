import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Home,
  Briefcase,
  Building,
  Check,
  X,
  Loader2,
  AlertCircle,
  Phone,
  Truck,
  Locate,
  Navigation,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import { reverseGeocode } from '../services/googleMapsLoader';

const AddressModal = ({ isOpen, onClose, onSave, initialAddress = null }) => {
  // Form states
  const [tag, setTag] = useState(initialAddress?.tag || 'Home');
  const [label, setLabel] = useState(initialAddress?.label || '');
  const [contactNumber, setContactNumber] = useState(
    initialAddress?.contactNumber || initialAddress?.receiverPhone || ''
  );
  const [houseNo, setHouseNo] = useState(initialAddress?.houseNo || '');
  const [area, setArea] = useState(initialAddress?.area || '');
  const [landmark, setLandmark] = useState(initialAddress?.landmark || '');
  const [city, setCity] = useState(initialAddress?.city || 'Pathardewa');
  const [state, setState] = useState(initialAddress?.state || 'Uttar Pradesh');
  const [pincode, setPincode] = useState(initialAddress?.pincode || '274404');
  const [isDefault, setIsDefault] = useState(initialAddress?.isDefault ?? false);

  // Delivery distance calculation states
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load delivery settings on open
  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const res = await api.get('/delivery-settings');
        if (res.data?.success) {
          setDeliverySettings(res.data.data);
        }
      } catch (err) {
        console.warn('Could not fetch delivery settings:', err);
      }
    };
    if (isOpen) {
      fetchDeliverySettings();
    }
  }, [isOpen]);

  // Sync state when initialAddress changes
  useEffect(() => {
    if (initialAddress) {
      setTag(initialAddress.tag || 'Home');
      setLabel(initialAddress.label || '');
      setContactNumber(initialAddress.contactNumber || initialAddress.receiverPhone || '');
      setHouseNo(initialAddress.houseNo || '');
      setArea(initialAddress.area || '');
      setLandmark(initialAddress.landmark || '');
      setCity(initialAddress.city || 'Pathardewa');
      setState(initialAddress.state || 'Uttar Pradesh');
      setPincode(initialAddress.pincode || '274404');
      setIsDefault(initialAddress.isDefault ?? false);

      if (initialAddress.area) {
        runCalculation({ locationName: initialAddress.area });
      }
    } else {
      setTag('Home');
      setLabel('');
      setContactNumber('');
      setHouseNo('');
      setArea('');
      setLandmark('');
      setCity('Pathardewa');
      setState('Uttar Pradesh');
      setPincode('274404');
      setIsDefault(false);
      setCalcResult(null);
      setUserCoords(null);
    }
    setErrorMsg('');
  }, [initialAddress, isOpen]);

  const runCalculation = async (params) => {
    try {
      const res = await api.post('/delivery-settings/calculate', params);
      if (res.data?.success) {
        setCalcResult(res.data.data);
        if (res.data.data.rejectionReason) {
          setErrorMsg(res.data.data.rejectionReason);
        } else {
          setErrorMsg('');
        }
      }
    } catch (err) {
      console.warn('Distance calculation error:', err);
    }
  };

  const handleSelectPredefinedArea = (locName) => {
    setArea(locName);
    runCalculation({ locationName: locName });
  };

  const handleDetectGps = () => {
    setErrorMsg('');
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser. Please select or type your area.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsDetectingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });

        try {
          const rev = await reverseGeocode(lat, lng);
          if (rev) {
            if (rev.area) setArea(rev.area);
            if (rev.street && !landmark) setLandmark(rev.street);
            if (rev.city) setCity(rev.city);
            if (rev.state) setState(rev.state);
            if (rev.pincode) setPincode(rev.pincode);
          }
        } catch {
          if (!area) setArea('My Current Location');
        }

        await runCalculation({ lat, lng });
      },
      (err) => {
        setIsDetectingGps(false);
        setErrorMsg('Could not detect GPS location. Please select your village or type your address.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!contactNumber.trim() || contactNumber.trim().length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for the delivery boy to call.');
      return;
    }
    if (!houseNo.trim()) {
      setErrorMsg('Please enter your House / Flat / Building number.');
      return;
    }
    if (!area.trim()) {
      setErrorMsg('Please enter your Area / Locality.');
      return;
    }

    if (calcResult && !calcResult.isDeliverable) {
      setErrorMsg(calcResult.rejectionReason || 'This location is outside our delivery zone.');
      return;
    }

    const fullFormatted = `${houseNo.trim()}, ${area.trim()}${
      landmark.trim() ? ', Near ' + landmark.trim() : ''
    }, ${city.trim()}, ${state.trim()} - ${pincode.trim()}`;

    const addressPayload = {
      tag,
      label: tag === 'Other' ? label.trim() || 'Other' : tag,
      contactNumber: contactNumber.trim(),
      receiverPhone: contactNumber.trim(),
      houseNo: houseNo.trim(),
      area: area.trim(),
      landmark: landmark.trim(),
      city: city.trim() || 'Pathardewa',
      state: state.trim() || 'Uttar Pradesh',
      pincode: pincode.trim() || '274404',
      formattedAddress: fullFormatted,
      isDefault,
      deliveryDistance: calcResult?.distanceKm ?? 2.0,
      deliveryFee: calcResult?.deliveryFee ?? 0,
      deliveryLocationName: calcResult?.locationName || area.trim(),
      lat: userCoords?.lat || null,
      lng: userCoords?.lng || null
    };

    try {
      setIsSaving(true);
      await onSave(addressPayload);
      onClose();
    } catch (err) {
      console.error('Error saving address:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save address.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-orange-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-500 dark:text-orange-400 border border-orange-500/30 flex items-center justify-center shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {initialAddress ? 'Edit Delivery Address' : 'Add Delivery Address'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Save your address details for fast & hassle-free delivery
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveAddress} className="p-4 sm:p-6 space-y-4">
            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/70 border border-red-300 dark:border-red-500/40 rounded-xl text-xs text-red-700 dark:text-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick GPS & Village / Area Selection Section */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/80 border border-slate-200 dark:border-orange-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Distance &amp; Free Delivery (&lt;5km)</span>
                </span>
                <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-100/90 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30">
                  Free under 5km
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* GPS Auto-detect button */}
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isDetectingGps}
                  className="py-2 px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-orange-500 text-xs font-bold text-slate-800 dark:text-white flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isDetectingGps ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <Locate className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                      <span>📍 Auto-Detect GPS</span>
                    </>
                  )}
                </button>

                {/* Pre-configured local villages dropdown */}
                {deliverySettings?.locations && deliverySettings.locations.length > 0 && (
                  <select
                    value={area}
                    onChange={(e) => handleSelectPredefinedArea(e.target.value)}
                    className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm"
                  >
                    <option value="">Or Pick Village / Area...</option>
                    {deliverySettings.locations.map((loc, i) => (
                      <option key={i} value={loc.name}>
                        {loc.name} ({loc.distanceKm} km {loc.distanceKm <= (deliverySettings.freeDeliveryRadiusKm || 5) ? '• FREE' : `• ₹${Math.ceil((loc.distanceKm - (deliverySettings.freeDeliveryRadiusKm || 5)) * (deliverySettings.extraChargePerKm || 10))}`})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Real-time distance and delivery fee badge */}
              {calcResult && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                  calcResult.isFreeDelivery
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                    : calcResult.isDeliverable
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-500/40 text-orange-800 dark:text-orange-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {calcResult.isFreeDelivery ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold block">
                        Distance: {calcResult.distanceKm} km {calcResult.locationName ? `(${calcResult.locationName})` : ''}
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                        {calcResult.isFreeDelivery
                          ? 'Eligible for 100% Free Doorstep Delivery!'
                          : `Standard extra delivery charge of ₹${calcResult.extraChargePerKm}/km applies beyond 5km.`}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                    calcResult.isFreeDelivery
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400 border border-orange-300 dark:border-orange-500/30'
                  }`}>
                    {calcResult.isFreeDelivery ? 'FREE DELIVERY' : `+₹${calcResult.deliveryFee}`}
                  </span>
                </div>
              )}
            </div>

            {/* Address Tag Selector: Home, Work, Other */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-2">
                Save Address As
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'Home', label: 'Home', icon: Home },
                  { id: 'Work', label: 'Work', icon: Briefcase },
                  { id: 'Other', label: 'Other', icon: Building }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = tag === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTag(item.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {tag === 'Other' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2.5"
                >
                  <input
                    type="text"
                    placeholder="e.g. Friend's Flat, Gym, Mom's House"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </motion.div>
              )}
            </div>

            {/* Contact Number for Delivery Boy (Printed on thermal receipt) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
                  Receiver Contact Number <span className="text-orange-500">*</span>
                </label>
                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Prints on thermal receipt for calling</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9876543210 (10-digit mobile number)"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>

            {/* House / Flat / Floor / Building No. */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-1.5">
                House / Flat / Floor / Building <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Flat 304, Green Valley Apartments"
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            {/* Area / Sector / Locality */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-1.5">
                Apartment / Road / Area / Locality <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pathardewa Main Market, Cinema Road"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  if (e.target.value.length > 2) {
                    runCalculation({ locationName: e.target.value });
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            {/* Landmark & Pincode Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-1.5">
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near SBI ATM or Kali Mandir"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-1.5">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="274404"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            {/* City & State */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5">
                  City / Town
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-300 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-300 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>

            {/* Default Address Checkbox */}
            <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 cursor-pointer"
              />
              <span className="text-xs text-slate-800 dark:text-slate-300 font-semibold">
                Set as default delivery address for future orders
              </span>
            </label>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/30 flex items-center space-x-2 disabled:opacity-60 transition-all border border-orange-400/30 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{initialAddress ? 'Update Address' : 'Save Address'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddressModal;
