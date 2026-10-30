const DeliverySetting = require('../models/DeliverySetting');

/**
 * Calculate distance between two coordinates in kilometers using pure Haversine formula
 * (No Google Maps API or paid geolocation API used)
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Straight-line distance in kilometres rounded to 2 decimal places
  return Math.round(distance * 100) / 100;
};

const STRICT_MAX_DELIVERY_RADIUS_KM = 5.0;
const STRICT_OUT_OF_BOUNDS_MESSAGE = 'We will be available in your area soon';

/**
 * Authoritative Delivery Charge Calculation
 * Core Business Rule: Deliveries are strictly allowed ONLY within a 5 km radius.
 * If > 5 KM, block order with message: "We will be available in your area soon".
 */
const calculateDeliveryPricing = (distanceKm, settings, subtotal = 0) => {
  const configuredMax = Number(settings?.max_delivery_radius_km ?? settings?.maxDeliveryRadiusKm ?? STRICT_MAX_DELIVERY_RADIUS_KM);
  // Strict 5.0 KM limit enforced server-side
  const maxRadius = Math.min(configuredMax, STRICT_MAX_DELIVERY_RADIUS_KM);
  const freeRadius = Number(settings?.free_delivery_radius ?? settings?.freeDeliveryRadiusKm ?? 5.0);
  const baseCharge = Number(settings?.base_delivery_charge ?? 0);
  const extraPerKm = Number(settings?.extra_charge_per_km ?? settings?.extraChargePerKm ?? 0);
  const minPurchaseForFree = Number(settings?.minPurchaseForFreeDelivery ?? settings?.min_purchase_for_free_delivery ?? 0);

  const allowed = Number(distanceKm) <= maxRadius;

  const isFreeByPurchase = minPurchaseForFree > 0 && Number(subtotal) >= minPurchaseForFree;
  const isFreeByRadius = Number(distanceKm) <= freeRadius;
  const free_delivery = allowed && (isFreeByPurchase || isFreeByRadius);

  let delivery_charge = 0;
  if (!free_delivery && allowed) {
    const extraKm = Math.ceil(distanceKm - freeRadius);
    delivery_charge = baseCharge + Math.max(0, extraKm - 1) * extraPerKm;
  }

  return {
    allowed,
    distance_km: distanceKm,
    free_delivery,
    delivery_charge: allowed ? delivery_charge : 0,
    free_delivery_radius: freeRadius,
    base_delivery_charge: baseCharge,
    extra_charge_per_km: extraPerKm,
    max_delivery_radius: maxRadius,
    min_purchase_for_free_delivery: minPurchaseForFree,
    is_free_by_purchase: isFreeByPurchase,
    is_free_by_radius: isFreeByRadius,
    message: allowed ? null : STRICT_OUT_OF_BOUNDS_MESSAGE
  };
};

/**
 * Authoritative Shop Status Calculation
 * Supports:
 * - 'manual': explicit 'open' or 'closed' override set by admin/kitchen
 * - 'auto': evaluates whether current time in Indian Standard Time (Asia/Kolkata)
 *   falls within operating hours [openingTime, closingTime]
 */
const computeShopOpenStatus = (settings) => {
  const shopStatus = settings?.shopStatus || {};
  const openMode = shopStatus.openMode || 'auto';
  const manualStatus = shopStatus.manualStatus || 'open';
  const openingTime = shopStatus.openingTime || '10:00';
  const closingTime = shopStatus.closingTime || '23:00';
  const closedMessage =
    shopStatus.closedMessage ||
    'We are currently closed for orders. Our daily hours are 10:00 AM – 11:00 PM.';
  const allowPreorders = shopStatus.allowPreorders !== false;

  let isOpen = true;

  if (openMode === 'manual') {
    isOpen = manualStatus === 'open';
  } else {
    try {
      const now = new Date();
      // Format as HH:mm in Asia/Kolkata timezone
      const istTimeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);

      const [curH, curM] = istTimeStr.split(':').map(Number);
      const curMinutes = curH * 60 + curM;

      const [openH, openM] = openingTime.split(':').map(Number);
      const openMinutes = openH * 60 + openM;

      const [closeH, closeM] = closingTime.split(':').map(Number);
      const closeMinutes = closeH * 60 + closeM;

      if (closeMinutes > openMinutes) {
        isOpen = curMinutes >= openMinutes && curMinutes < closeMinutes;
      } else {
        // Overnight schedule spanning past midnight
        isOpen = curMinutes >= openMinutes || curMinutes < closeMinutes;
      }
    } catch (e) {
      console.warn('Failed to compute auto shop hours in IST:', e);
      isOpen = true;
    }
  }

  return {
    isOpen,
    openMode,
    manualStatus,
    openingTime,
    closingTime,
    closedMessage,
    allowPreorders
  };
};

// @desc    Get active delivery settings and locations
// @route   GET /api/delivery-settings
// @access  Public
const getDeliverySettings = async (req, res, next) => {
  try {
    const settings = await DeliverySetting.getOrCreateSettings();
    const settingsObj = settings.toObject ? settings.toObject() : { ...settings };
    const computed = computeShopOpenStatus(settings);
    settingsObj.computedShopStatus = computed;
    if (settingsObj.shopStatus) {
      settingsObj.shopStatus.isOpen = computed.isOpen;
    }
    res.status(200).json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update delivery settings (restaurant coords, free delivery radius, charges, accuracy threshold)
// @route   PUT /api/delivery-settings
// @access  Private (Admin)
const updateDeliverySettings = async (req, res, next) => {
  try {
    let settings = await DeliverySetting.getOrCreateSettings();

    const {
      restaurantName,
      restaurantAddress,
      restaurantLat,
      restaurantLng,
      restaurant_latitude,
      restaurant_longitude,
      freeDeliveryRadiusKm,
      free_delivery_radius,
      base_delivery_charge,
      extraChargePerKm,
      extra_charge_per_km,
      accuracy_threshold_meters,
      maxDeliveryRadiusKm,
      max_delivery_radius_km,
      defaultMinOrderAmount,
      locations
    } = req.body;

    if (restaurantName !== undefined) settings.restaurantName = String(restaurantName).trim();
    if (restaurantAddress !== undefined) settings.restaurantAddress = String(restaurantAddress).trim();

    const resolvedLat = restaurant_latitude !== undefined ? Number(restaurant_latitude) : (restaurantLat !== undefined ? Number(restaurantLat) : undefined);
    if (resolvedLat !== undefined && !isNaN(resolvedLat)) {
      settings.restaurantLat = resolvedLat;
      settings.restaurant_latitude = resolvedLat;
    }

    const resolvedLng = restaurant_longitude !== undefined ? Number(restaurant_longitude) : (restaurantLng !== undefined ? Number(restaurantLng) : undefined);
    if (resolvedLng !== undefined && !isNaN(resolvedLng)) {
      settings.restaurantLng = resolvedLng;
      settings.restaurant_longitude = resolvedLng;
    }

    const resolvedFreeRad = free_delivery_radius !== undefined ? Number(free_delivery_radius) : (freeDeliveryRadiusKm !== undefined ? Number(freeDeliveryRadiusKm) : undefined);
    if (resolvedFreeRad !== undefined && !isNaN(resolvedFreeRad)) {
      settings.freeDeliveryRadiusKm = Math.max(0, resolvedFreeRad);
      settings.free_delivery_radius = Math.max(0, resolvedFreeRad);
    }

    const { minPurchaseForFreeDelivery, min_purchase_for_free_delivery, platformFee, platform_fee, isPlatformFeeEnabled, is_platform_fee_enabled, notDeliverableMessage, not_deliverable_message } = req.body;
    const resolvedMinPurchase = min_purchase_for_free_delivery !== undefined ? Number(min_purchase_for_free_delivery) : (minPurchaseForFreeDelivery !== undefined ? Number(minPurchaseForFreeDelivery) : undefined);
    if (resolvedMinPurchase !== undefined && !isNaN(resolvedMinPurchase)) {
      settings.minPurchaseForFreeDelivery = Math.max(0, resolvedMinPurchase);
      settings.min_purchase_for_free_delivery = Math.max(0, resolvedMinPurchase);
    }

    const resolvedPlatformFeeEnabled = is_platform_fee_enabled !== undefined
      ? Boolean(is_platform_fee_enabled)
      : (isPlatformFeeEnabled !== undefined ? Boolean(isPlatformFeeEnabled) : undefined);
    if (resolvedPlatformFeeEnabled !== undefined) {
      settings.isPlatformFeeEnabled = resolvedPlatformFeeEnabled;
      settings.is_platform_fee_enabled = resolvedPlatformFeeEnabled;
    }

    const resolvedPlatformFee = platform_fee !== undefined ? Number(platform_fee) : (platformFee !== undefined ? Number(platformFee) : undefined);
    if (resolvedPlatformFee !== undefined && !isNaN(resolvedPlatformFee)) {
      settings.platformFee = Math.max(0, resolvedPlatformFee);
      settings.platform_fee = Math.max(0, resolvedPlatformFee);
    }

    const resolvedMessage = not_deliverable_message !== undefined ? not_deliverable_message : notDeliverableMessage;
    if (resolvedMessage !== undefined && typeof resolvedMessage === 'string' && resolvedMessage.trim()) {
      settings.notDeliverableMessage = resolvedMessage.trim();
      settings.not_deliverable_message = resolvedMessage.trim();
    }

    if (base_delivery_charge !== undefined && !isNaN(Number(base_delivery_charge))) {
      settings.base_delivery_charge = Math.max(0, Number(base_delivery_charge));
    }

    const resolvedExtra = extra_charge_per_km !== undefined ? Number(extra_charge_per_km) : (extraChargePerKm !== undefined ? Number(extraChargePerKm) : undefined);
    if (resolvedExtra !== undefined && !isNaN(resolvedExtra)) {
      settings.extraChargePerKm = Math.max(0, resolvedExtra);
      settings.extra_charge_per_km = Math.max(0, resolvedExtra);
    }

    if (accuracy_threshold_meters !== undefined && !isNaN(Number(accuracy_threshold_meters))) {
      settings.accuracy_threshold_meters = Math.max(10, Number(accuracy_threshold_meters));
    }

    const resolvedMax = max_delivery_radius_km !== undefined ? Number(max_delivery_radius_km) : (maxDeliveryRadiusKm !== undefined ? Number(maxDeliveryRadiusKm) : undefined);
    if (resolvedMax !== undefined && !isNaN(resolvedMax)) {
      settings.maxDeliveryRadiusKm = Math.max(1, resolvedMax);
      settings.max_delivery_radius_km = Math.max(1, resolvedMax);
    }

    if (defaultMinOrderAmount !== undefined && !isNaN(Number(defaultMinOrderAmount))) {
      settings.defaultMinOrderAmount = Math.max(0, Number(defaultMinOrderAmount));
    }

    if (Array.isArray(locations)) {
      settings.locations = locations.map((loc) => ({
        name: String(loc.name || '').trim(),
        distanceKm: Math.max(0, Number(loc.distanceKm) || 0),
        minOrderAmount: Math.max(0, Number(loc.minOrderAmount) || settings.defaultMinOrderAmount),
        isDeliverable: loc.isDeliverable !== false
      }));
    }

    const { cancellationSettings, fulfillmentSettings, tableSettings, splitPizzaSettings } = req.body;
    if (cancellationSettings && typeof cancellationSettings === 'object') {
      if (!settings.cancellationSettings) {
        settings.cancellationSettings = {};
      }
      if (cancellationSettings.isCancellationAllowed !== undefined) {
        settings.cancellationSettings.isCancellationAllowed = Boolean(cancellationSettings.isCancellationAllowed);
      }
      if (cancellationSettings.cancellationAllowedUntil !== undefined) {
        if (['Pending', 'Preparing', 'Ready'].includes(cancellationSettings.cancellationAllowedUntil)) {
          settings.cancellationSettings.cancellationAllowedUntil = cancellationSettings.cancellationAllowedUntil;
        }
      }
      if (typeof cancellationSettings.disallowedMessage === 'string' && cancellationSettings.disallowedMessage.trim()) {
        settings.cancellationSettings.disallowedMessage = cancellationSettings.disallowedMessage.trim();
      }
    }

    if (fulfillmentSettings && typeof fulfillmentSettings === 'object') {
      if (!settings.fulfillmentSettings) settings.fulfillmentSettings = {};
      if (fulfillmentSettings.allowDelivery !== undefined) settings.fulfillmentSettings.allowDelivery = Boolean(fulfillmentSettings.allowDelivery);
      if (fulfillmentSettings.allowDineIn !== undefined) settings.fulfillmentSettings.allowDineIn = Boolean(fulfillmentSettings.allowDineIn);
      if (fulfillmentSettings.allowTakeaway !== undefined) settings.fulfillmentSettings.allowTakeaway = Boolean(fulfillmentSettings.allowTakeaway);
    }

    if (tableSettings && typeof tableSettings === 'object') {
      if (!settings.tableSettings) settings.tableSettings = {};
      if (tableSettings.tableCount !== undefined && !isNaN(Number(tableSettings.tableCount))) {
        settings.tableSettings.tableCount = Math.max(1, Math.min(100, Number(tableSettings.tableCount)));
      }
      if (typeof tableSettings.tablePrefix === 'string') {
        settings.tableSettings.tablePrefix = tableSettings.tablePrefix.trim() || 'Table ';
      }
    }

    if (splitPizzaSettings && typeof splitPizzaSettings === 'object') {
      if (!settings.splitPizzaSettings) settings.splitPizzaSettings = {};
      if (splitPizzaSettings.enabled !== undefined) {
        settings.splitPizzaSettings.enabled = Boolean(splitPizzaSettings.enabled);
      }
      if (typeof splitPizzaSettings.disabledMessage === 'string' && splitPizzaSettings.disabledMessage.trim()) {
        settings.splitPizzaSettings.disabledMessage = splitPizzaSettings.disabledMessage.trim();
      }
    }

    await settings.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('settings_updated', settings);
      io.emit('delivery_settings_updated', settings);
    }

    res.status(200).json({
      success: true,
      message: 'Delivery settings updated successfully.',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin action: Capture restaurant's current GPS as base coordinates
// @route   POST /api/delivery-settings/capture-base-location
// @access  Private (Admin)
const captureBaseLocation = async (req, res, next) => {
  try {
    const settings = await DeliverySetting.getOrCreateSettings();
    const { restaurant_latitude, restaurant_longitude, latitude, longitude, accuracy } = req.body;

    const parsedLat = restaurant_latitude !== undefined ? Number(restaurant_latitude) : (latitude !== undefined ? Number(latitude) : null);
    const parsedLng = restaurant_longitude !== undefined ? Number(restaurant_longitude) : (longitude !== undefined ? Number(longitude) : null);

    if (parsedLat === null || isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Valid restaurant latitude coordinate between -90 and 90 is required.'
      });
    }

    if (parsedLng === null || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Valid restaurant longitude coordinate between -180 and 180 is required.'
      });
    }

    settings.restaurantLat = parsedLat;
    settings.restaurantLng = parsedLng;
    settings.restaurant_latitude = parsedLat;
    settings.restaurant_longitude = parsedLng;

    await settings.save();

    res.status(200).json({
      success: true,
      message: `Restaurant GPS base location saved successfully (${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}).`,
      data: {
        restaurant_latitude: settings.restaurant_latitude,
        restaurant_longitude: settings.restaurant_longitude,
        accuracy: accuracy ? Number(accuracy) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authoritative location verification endpoint
// @route   POST /api/delivery-settings/verify-location
// @access  Public
const verifyLocation = async (req, res, next) => {
  try {
    const settings = await DeliverySetting.getOrCreateSettings();
    const { latitude, longitude, accuracy, lat, lng, subtotal = 0 } = req.body;

    const parsedLat = latitude !== undefined ? Number(latitude) : (lat !== undefined ? Number(lat) : null);
    const parsedLng = longitude !== undefined ? Number(longitude) : (lng !== undefined ? Number(lng) : null);
    const parsedAcc = accuracy !== undefined && !isNaN(Number(accuracy)) ? Number(accuracy) : null;

    if (parsedLat === null || isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      return res.status(400).json({
        success: false,
        allowed: false,
        message: 'Invalid or missing GPS latitude coordinate.'
      });
    }

    if (parsedLng === null || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      return res.status(400).json({
        success: false,
        allowed: false,
        message: 'Invalid or missing GPS longitude coordinate.'
      });
    }

    // High accuracy check against configurable threshold
    const accuracyThreshold = settings.accuracy_threshold_meters || 1000;
    if (parsedAcc !== null && parsedAcc > accuracyThreshold) {
      return res.status(400).json({
        success: false,
        allowed: false,
        message: 'Your location could not be detected accurately. Please enable precise location and try again.'
      });
    }

    const restLat = settings.restaurant_latitude ?? settings.restaurantLat;
    const restLng = settings.restaurant_longitude ?? settings.restaurantLng;

    const distanceKm = calculateHaversineDistance(restLat, restLng, parsedLat, parsedLng);
    const pricing = calculateDeliveryPricing(distanceKm, settings, subtotal);

    const isPlatformFeeActive = settings.isPlatformFeeEnabled ?? settings.is_platform_fee_enabled ?? true;
    const platformFee = isPlatformFeeActive ? Math.max(0, Number(settings.platformFee ?? settings.platform_fee ?? 5)) : 0;

    if (!pricing.allowed) {
      const template = settings.notDeliverableMessage || settings.not_deliverable_message || "Sorry, we are not serviceable in your area. Your location is {distance} KM away from Apurva Pizza Hub (we currently deliver within {maxRadius} KM).";
      const formattedMsg = template
        .replace('{distance}', distanceKm)
        .replace('{maxRadius}', pricing.max_delivery_radius);

      return res.status(200).json({
        success: true,
        allowed: false,
        isDeliverable: false,
        distance_km: pricing.distance_km,
        free_delivery: false,
        delivery_charge: 0,
        is_platform_fee_enabled: isPlatformFeeActive,
        isPlatformFeeEnabled: isPlatformFeeActive,
        platform_fee: platformFee,
        platformFee,
        accuracy: parsedAcc,
        max_delivery_radius: pricing.max_delivery_radius,
        min_purchase_for_free_delivery: pricing.min_purchase_for_free_delivery,
        message: formattedMsg
      });
    }

    return res.status(200).json({
      success: true,
      allowed: true,
      isDeliverable: true,
      distance_km: pricing.distance_km,
      free_delivery: pricing.free_delivery,
      delivery_charge: pricing.delivery_charge,
      is_platform_fee_enabled: isPlatformFeeActive,
      isPlatformFeeEnabled: isPlatformFeeActive,
      platform_fee: platformFee,
      platformFee,
      accuracy: parsedAcc,
      max_delivery_radius: pricing.max_delivery_radius,
      min_purchase_for_free_delivery: pricing.min_purchase_for_free_delivery,
      is_free_by_purchase: pricing.is_free_by_purchase,
      is_free_by_radius: pricing.is_free_by_radius,
      restaurant_coordinates: {
        latitude: restLat,
        longitude: restLng
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate distance, delivery fee, and deliverability dynamically (supports both GPS and locality)
// @route   POST /api/delivery-settings/calculate
// @access  Public
const calculateDelivery = async (req, res, next) => {
  try {
    const settings = await DeliverySetting.getOrCreateSettings();
    const { lat, lng, latitude, longitude, accuracy, locationName, subtotal = 0 } = req.body;

    const parsedLat = latitude !== undefined ? Number(latitude) : (lat !== undefined ? Number(lat) : null);
    const parsedLng = longitude !== undefined ? Number(longitude) : (lng !== undefined ? Number(lng) : null);
    const parsedAcc = accuracy !== undefined && !isNaN(Number(accuracy)) ? Number(accuracy) : null;

    let distanceKm = null;
    let resolvedLocationName = locationName || null;
    let minOrderAmount = settings.defaultMinOrderAmount || 149;

    // 1. Try calculation via GPS coordinates
    if (parsedLat !== null && parsedLng !== null && !isNaN(parsedLat) && !isNaN(parsedLng)) {
      const restLat = settings.restaurant_latitude ?? settings.restaurantLat;
      const restLng = settings.restaurant_longitude ?? settings.restaurantLng;
      distanceKm = calculateHaversineDistance(restLat, restLng, parsedLat, parsedLng);
      if (!resolvedLocationName) {
        resolvedLocationName = `GPS Location (${distanceKm} km)`;
      }
    }
    // 2. Try match against pre-configured locations
    else if (locationName && typeof locationName === 'string') {
      const match = settings.locations.find(
        (l) => l.name.toLowerCase().trim() === locationName.toLowerCase().trim()
      );
      if (match) {
        distanceKm = match.distanceKm;
        minOrderAmount = match.minOrderAmount || settings.defaultMinOrderAmount;
        resolvedLocationName = match.name;
      }
    }

    if (distanceKm === null) {
      distanceKm = 2.0;
    }

    const pricing = calculateDeliveryPricing(distanceKm, settings, subtotal);
    const minOrderMet = Number(subtotal) >= minOrderAmount;
    const isPlatformFeeActive = settings.isPlatformFeeEnabled ?? settings.is_platform_fee_enabled ?? true;
    const platformFee = isPlatformFeeActive ? Math.max(0, Number(settings.platformFee ?? settings.platform_fee ?? 5)) : 0;

    const template = settings.notDeliverableMessage || settings.not_deliverable_message || "Sorry, we are not deliverable in your area. Your location is {distance} KM away from Apurva Pizza Hub. We currently deliver up to {maxRadius} KM.";
    const rejectionReason = !pricing.allowed
      ? template.replace('{distance}', distanceKm).replace('{maxRadius}', pricing.max_delivery_radius)
      : null;

    res.status(200).json({
      success: true,
      data: {
        distanceKm: pricing.distance_km,
        distance_km: pricing.distance_km,
        deliveryFee: pricing.delivery_charge,
        delivery_charge: pricing.delivery_charge,
        isPlatformFeeEnabled: isPlatformFeeActive,
        is_platform_fee_enabled: isPlatformFeeActive,
        platformFee,
        platform_fee: platformFee,
        isFreeDelivery: pricing.free_delivery,
        free_delivery: pricing.free_delivery,
        freeDeliveryRadiusKm: pricing.free_delivery_radius,
        baseDeliveryCharge: pricing.base_delivery_charge,
        extraChargePerKm: pricing.extra_charge_per_km,
        maxDeliveryRadiusKm: pricing.max_delivery_radius,
        minPurchaseForFreeDelivery: pricing.min_purchase_for_free_delivery,
        min_purchase_for_free_delivery: pricing.min_purchase_for_free_delivery,
        isFreeByPurchase: pricing.is_free_by_purchase,
        isFreeByRadius: pricing.is_free_by_radius,
        accuracy_threshold_meters: settings.accuracy_threshold_meters,
        minOrderAmount,
        minOrderMet,
        isDeliverable: pricing.allowed,
        allowed: pricing.allowed,
        rejectionReason,
        locationName: resolvedLocationName,
        restaurantCoordinates: {
          lat: settings.restaurantLat,
          lng: settings.restaurantLng,
          latitude: settings.restaurant_latitude,
          longitude: settings.restaurant_longitude
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const toggleRushMode = async (req, res, next) => {
  try {
    const settings = await DeliverySetting.getSettings();
    const { kitchenRushMode, kitchenRushExtraMinutes } = req.body;

    if (typeof kitchenRushMode === 'boolean') {
      settings.kitchenRushMode = kitchenRushMode;
    } else {
      settings.kitchenRushMode = !settings.kitchenRushMode;
    }

    if (kitchenRushExtraMinutes !== undefined) {
      settings.kitchenRushExtraMinutes = Number(kitchenRushExtraMinutes) || 15;
    }

    await settings.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('kitchen:rush_mode', {
        kitchenRushMode: settings.kitchenRushMode,
        kitchenRushExtraMinutes: settings.kitchenRushExtraMinutes
      });
    }

    res.status(200).json({
      success: true,
      message: `Kitchen Rush Mode ${settings.kitchenRushMode ? 'ACTIVATED (+15m)' : 'DEACTIVATED'}`,
      data: {
        kitchenRushMode: settings.kitchenRushMode,
        kitchenRushExtraMinutes: settings.kitchenRushExtraMinutes
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Get current store open/close status
 */
const getShopStatus = async (req, res, next) => {
  try {
    const settings = await DeliverySetting.getOrCreateSettings();
    const computed = computeShopOpenStatus(settings);
    res.status(200).json({
      success: true,
      data: computed
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Protected (Admin / Kitchen): Update store open/close settings
 * Supports automatic scheduling (operating hours) and manual override
 */
const updateShopStatus = async (req, res, next) => {
  try {
    const settings = await DeliverySetting.getOrCreateSettings();
    const { openMode, manualStatus, openingTime, closingTime, closedMessage, allowPreorders } = req.body;

    if (!settings.shopStatus) {
      settings.shopStatus = {};
    }

    if (openMode && ['auto', 'manual'].includes(openMode)) {
      settings.shopStatus.openMode = openMode;
    }
    if (manualStatus && ['open', 'closed'].includes(manualStatus)) {
      settings.shopStatus.manualStatus = manualStatus;
    }
    if (openingTime !== undefined && typeof openingTime === 'string' && openingTime.trim()) {
      settings.shopStatus.openingTime = openingTime.trim();
    }
    if (closingTime !== undefined && typeof closingTime === 'string' && closingTime.trim()) {
      settings.shopStatus.closingTime = closingTime.trim();
    }
    if (closedMessage !== undefined && typeof closedMessage === 'string') {
      settings.shopStatus.closedMessage = closedMessage.trim();
    }
    if (allowPreorders !== undefined) {
      settings.shopStatus.allowPreorders = Boolean(allowPreorders);
    }

    await settings.save();

    const computed = computeShopOpenStatus(settings);

    const io = req.app.get('io');
    if (io) {
      io.emit('shop:status_update', computed);
    }

    res.status(200).json({
      success: true,
      message: `Store is now ${computed.isOpen ? 'OPEN' : 'CLOSED'} (${computed.openMode === 'auto' ? 'Automatic Schedule' : 'Manual Override'})`,
      data: computed
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDeliverySettings,
  updateDeliverySettings,
  captureBaseLocation,
  verifyLocation,
  calculateDelivery,
  calculateHaversineDistance,
  calculateDeliveryPricing,
  toggleRushMode,
  computeShopOpenStatus,
  getShopStatus,
  updateShopStatus
};

