const mongoose = require('mongoose');

const deliveryLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true
    },
    distanceKm: {
      type: Number,
      required: [true, 'Distance in km is required'],
      min: [0, 'Distance cannot be negative'],
      default: 1
    },
    minOrderAmount: {
      type: Number,
      default: 149,
      min: [0, 'Minimum order amount cannot be negative']
    },
    isDeliverable: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const deliverySettingSchema = new mongoose.Schema(
  {
    restaurantName: {
      type: String,
      default: 'Apurva Pizza Hub'
    },
    restaurantAddress: {
      type: String,
      default: 'Main Road, Pathardewa, Deoria, Uttar Pradesh - 274404'
    },
    restaurantLat: {
      type: Number,
      default: 26.567247 // Actual shop latitude
    },
    restaurantLng: {
      type: Number,
      default: 83.943995 // Actual shop longitude
    },
    restaurant_latitude: {
      type: Number,
      default: 26.567247
    },
    restaurant_longitude: {
      type: Number,
      default: 83.943995
    },
    freeDeliveryRadiusKm: {
      type: Number,
      default: 5.0, // Free delivery under 5 km
      min: [0, 'Radius cannot be negative']
    },
    free_delivery_radius: {
      type: Number,
      default: 5.0,
      min: [0, 'Radius cannot be negative']
    },
    minPurchaseForFreeDelivery: {
      type: Number,
      default: 400, // Minimum cart purchase to qualify for free delivery
      min: [0, 'Minimum purchase cannot be negative']
    },
    min_purchase_for_free_delivery: {
      type: Number,
      default: 400,
      min: [0, 'Minimum purchase cannot be negative']
    },
    base_delivery_charge: {
      type: Number,
      default: 20, // ₹20 base delivery charge beyond free radius
      min: [0, 'Base charge cannot be negative']
    },
    extraChargePerKm: {
      type: Number,
      default: 10, // ₹10 per km beyond free delivery radius
      min: [0, 'Charge per km cannot be negative']
    },
    extra_charge_per_km: {
      type: Number,
      default: 10,
      min: [0, 'Charge per km cannot be negative']
    },
    accuracy_threshold_meters: {
      type: Number,
      default: 1000, // Reject GPS accuracy worse than 1000 meters
      min: [10, 'Accuracy threshold must be at least 10 meters']
    },
    maxDeliveryRadiusKm: {
      type: Number,
      default: 5.0, // Default 5 km delivery radius (configurable from admin portal)
      min: [1, 'Maximum radius must be at least 1 km']
    },
    max_delivery_radius_km: {
      type: Number,
      default: 5.0,
      min: [1, 'Maximum radius must be at least 1 km']
    },
    defaultMinOrderAmount: {
      type: Number,
      default: 149,
      min: [0, 'Minimum order cannot be negative']
    },
    isPlatformFeeEnabled: {
      type: Boolean,
      default: true // Whether platform fee is enabled (toggleable from admin)
    },
    is_platform_fee_enabled: {
      type: Boolean,
      default: true
    },
    platformFee: {
      type: Number,
      default: 5, // Platform fee in ₹ (Zomato/Swiggy style, configurable from admin)
      min: [0, 'Platform fee cannot be negative']
    },
    platform_fee: {
      type: Number,
      default: 5,
      min: [0, 'Platform fee cannot be negative']
    },
    notDeliverableMessage: {
      type: String,
      default: 'We will be available in your area soon'
    },
    not_deliverable_message: {
      type: String,
      default: 'We will be available in your area soon'
    },
    cancellationSettings: {
      isCancellationAllowed: {
        type: Boolean,
        default: true
      },
      cancellationAllowedUntil: {
        type: String,
        enum: ['Pending', 'Preparing', 'Ready'],
        default: 'Pending' // Admin can set: 'Pending' (only before preparation begins), 'Preparing', or 'Ready'
      },
      disallowedMessage: {
        type: String,
        default: 'Order cannot be cancelled because it is already being prepared or is out for delivery.'
      }
    },
    locations: [deliveryLocationSchema],
    kitchenRushMode: {
      type: Boolean,
      default: false
    },
    kitchenRushExtraMinutes: {
      type: Number,
      default: 15
    },
    shopStatus: {
      openMode: {
        type: String,
        enum: ['auto', 'manual'],
        default: 'auto'
      },
      manualStatus: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
      },
      openingTime: {
        type: String,
        default: '10:00'
      },
      closingTime: {
        type: String,
        default: '23:00'
      },
      closedMessage: {
        type: String,
        default: 'We are currently closed for orders. Our daily hours are 10:00 AM – 11:00 PM.'
      },
      allowPreorders: {
        type: Boolean,
        default: true
      }
    },
    fulfillmentSettings: {
      allowDelivery: {
        type: Boolean,
        default: true
      },
      allowDineIn: {
        type: Boolean,
        default: true
      },
      allowTakeaway: {
        type: Boolean,
        default: true
      }
    },
    tableSettings: {
      tableCount: {
        type: Number,
        default: 12,
        min: 1,
        max: 100
      },
      tablePrefix: {
        type: String,
        default: 'Table ',
        trim: true
      }
    },
    splitPizzaSettings: {
      enabled: {
        type: Boolean,
        default: true
      },
      disabledMessage: {
        type: String,
        default: 'Half & Half Pizza Builder is currently paused by the kitchen.'
      }
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure camelCase and snake_case properties are synchronized
deliverySettingSchema.pre('save', function (next) {
  if (this.restaurantLat !== undefined && this.restaurant_latitude === undefined) {
    this.restaurant_latitude = this.restaurantLat;
  } else if (this.restaurant_latitude !== undefined) {
    this.restaurantLat = this.restaurant_latitude;
  }

  if (this.restaurantLng !== undefined && this.restaurant_longitude === undefined) {
    this.restaurant_longitude = this.restaurantLng;
  } else if (this.restaurant_longitude !== undefined) {
    this.restaurantLng = this.restaurant_longitude;
  }

  if (this.freeDeliveryRadiusKm !== undefined) {
    this.free_delivery_radius = this.freeDeliveryRadiusKm;
  } else if (this.free_delivery_radius !== undefined) {
    this.freeDeliveryRadiusKm = this.free_delivery_radius;
  }

  if (this.minPurchaseForFreeDelivery !== undefined) {
    this.min_purchase_for_free_delivery = this.minPurchaseForFreeDelivery;
  } else if (this.min_purchase_for_free_delivery !== undefined) {
    this.minPurchaseForFreeDelivery = this.min_purchase_for_free_delivery;
  }

  if (this.isPlatformFeeEnabled !== undefined) {
    this.is_platform_fee_enabled = Boolean(this.isPlatformFeeEnabled);
  } else if (this.is_platform_fee_enabled !== undefined) {
    this.isPlatformFeeEnabled = Boolean(this.is_platform_fee_enabled);
  }

  if (this.platformFee !== undefined) {
    this.platform_fee = this.platformFee;
  } else if (this.platform_fee !== undefined) {
    this.platformFee = this.platform_fee;
  }

  if (this.notDeliverableMessage !== undefined) {
    this.not_deliverable_message = this.notDeliverableMessage;
  } else if (this.not_deliverable_message !== undefined) {
    this.notDeliverableMessage = this.not_deliverable_message;
  }

  if (this.extraChargePerKm !== undefined) {
    this.extra_charge_per_km = this.extraChargePerKm;
  } else if (this.extra_charge_per_km !== undefined) {
    this.extraChargePerKm = this.extra_charge_per_km;
  }

  if (this.maxDeliveryRadiusKm !== undefined) {
    this.max_delivery_radius_km = this.maxDeliveryRadiusKm;
  } else if (this.max_delivery_radius_km !== undefined) {
    this.maxDeliveryRadiusKm = this.max_delivery_radius_km;
  }

  next();
});

// Default initial locations around Pathardewa, Deoria
const INITIAL_LOCATIONS = [
  { name: 'Pathardewa Main Market', distanceKm: 0.5, minOrderAmount: 149, isDeliverable: true },
  { name: 'Murarchhapar Chauraha', distanceKm: 2.2, minOrderAmount: 149, isDeliverable: true },
  { name: 'Divine Public School Area', distanceKm: 2.8, minOrderAmount: 149, isDeliverable: true },
  { name: 'Bahuara Locality', distanceKm: 3.5, minOrderAmount: 149, isDeliverable: true },
  { name: 'Mahuawa Village', distanceKm: 4.2, minOrderAmount: 149, isDeliverable: true },
  { name: 'Tarkulwa Road (Near Bridge)', distanceKm: 5.0, minOrderAmount: 149, isDeliverable: true },
  { name: 'Bagaha Town', distanceKm: 6.8, minOrderAmount: 199, isDeliverable: true },
  { name: 'Rampur Karkhana Road', distanceKm: 8.5, minOrderAmount: 249, isDeliverable: true },
  { name: 'Kasya Border Route', distanceKm: 11.2, minOrderAmount: 299, isDeliverable: true }
];

deliverySettingSchema.statics.getOrCreateSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      restaurantName: 'Apurva Pizza Hub',
      restaurantAddress: 'Main Road, Pathardewa, Deoria, Uttar Pradesh - 274404',
      restaurantLat: 26.567247,
      restaurantLng: 83.943995,
      restaurant_latitude: 26.567247,
      restaurant_longitude: 83.943995,
      freeDeliveryRadiusKm: 5.0,
      free_delivery_radius: 5.0,
      minPurchaseForFreeDelivery: 400,
      min_purchase_for_free_delivery: 400,
      base_delivery_charge: 20,
      extraChargePerKm: 10,
      extra_charge_per_km: 10,
      accuracy_threshold_meters: 1000,
      maxDeliveryRadiusKm: 5.0,
      max_delivery_radius_km: 5.0,
      defaultMinOrderAmount: 149,
      locations: INITIAL_LOCATIONS
    });
  } else {
    let modified = false;
    // Update old default coordinates to actual shop coordinates if still matching old default
    if (
      settings.restaurant_latitude === undefined ||
      settings.restaurant_latitude === 26.8372 ||
      settings.restaurantLat === 26.8372
    ) {
      settings.restaurant_latitude = 26.567247;
      settings.restaurantLat = 26.567247;
      modified = true;
    }
    if (
      settings.restaurant_longitude === undefined ||
      settings.restaurant_longitude === 83.9872 ||
      settings.restaurantLng === 83.9872
    ) {
      settings.restaurant_longitude = 83.943995;
      settings.restaurantLng = 83.943995;
      modified = true;
    }
    if (settings.minPurchaseForFreeDelivery === undefined) {
      settings.minPurchaseForFreeDelivery = 400;
      settings.min_purchase_for_free_delivery = 400;
      modified = true;
    }
    if (settings.base_delivery_charge === undefined) {
      settings.base_delivery_charge = 20;
      modified = true;
    }
    if (settings.extra_charge_per_km === undefined) {
      settings.extra_charge_per_km = settings.extraChargePerKm || 10;
      modified = true;
    }
    if (settings.free_delivery_radius === undefined) {
      settings.free_delivery_radius = settings.freeDeliveryRadiusKm || 5.0;
      modified = true;
    }
    if (settings.accuracy_threshold_meters === undefined) {
      settings.accuracy_threshold_meters = 1000;
      modified = true;
    }
    if (settings.isPlatformFeeEnabled === undefined) {
      settings.isPlatformFeeEnabled = settings.is_platform_fee_enabled !== undefined ? settings.is_platform_fee_enabled : true;
      settings.is_platform_fee_enabled = settings.isPlatformFeeEnabled;
      modified = true;
    }
    if (settings.platformFee === undefined) {
      settings.platformFee = 5;
      settings.platform_fee = 5;
      modified = true;
    }
    if (!settings.notDeliverableMessage || settings.notDeliverableMessage.includes('deliverable in your area')) {
      settings.notDeliverableMessage = 'Sorry, we are not serviceable in your area. Your location is {distance} KM away from Apurva Pizza Hub (we currently deliver within {maxRadius} KM).';
      settings.not_deliverable_message = settings.notDeliverableMessage;
      modified = true;
    }
    if (settings.max_delivery_radius_km === undefined || settings.max_delivery_radius_km === 15) {
      settings.max_delivery_radius_km = 5.0;
      settings.maxDeliveryRadiusKm = 5.0;
      modified = true;
    }
    if (!settings.shopStatus || !settings.shopStatus.openMode) {
      settings.shopStatus = {
        openMode: 'auto',
        manualStatus: 'open',
        openingTime: '10:00',
        closingTime: '23:00',
        closedMessage: 'We are currently closed for orders. Our daily hours are 10:00 AM – 11:00 PM.',
        allowPreorders: true
      };
      modified = true;
    }
    if (!settings.fulfillmentSettings) {
      settings.fulfillmentSettings = {
        allowDelivery: true,
        allowDineIn: true,
        allowTakeaway: true
      };
      modified = true;
    }
    if (!settings.tableSettings) {
      settings.tableSettings = {
        tableCount: 12,
        tablePrefix: 'Table '
      };
      modified = true;
    }
    if (!settings.splitPizzaSettings) {
      settings.splitPizzaSettings = {
        enabled: true,
        disabledMessage: 'Half & Half Pizza Builder is currently paused by the kitchen.'
      };
      modified = true;
    }
    if (modified) {
      await settings.save();
    }
  }
  return settings;
};

const DeliverySetting = mongoose.model('DeliverySetting', deliverySettingSchema);

module.exports = DeliverySetting;
