import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Search,
  Locate,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Navigation,
  Info,
  Compass,
  Check,
  RotateCcw
} from 'lucide-react';
import { loadGoogleMaps, reverseGeocode, calculateHaversineDistance } from '../services/googleMapsLoader';
import api from '../services/api';

/**
 * Modern Dark-Mode Google Maps Style
 */
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#181512' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#181512' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a39b94' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ff9800' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8c827a' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1d261e' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2b2622' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1d1916' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cfc6be' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#573d1f' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3d2b16' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#fca311' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1824' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4d6980' }]
  }
];

const DeliveryLocationPicker = ({
  deliverySettings,
  onLocationSelect,
  initialCoords = null,
  initialAddress = ''
}) => {
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const mapInstanceRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const freeCircleRef = useRef(null);
  const maxCircleRef = useRef(null);

  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Address search query
  const [searchQuery, setSearchQuery] = useState(initialAddress || '');
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'warning' | 'error' | 'info', title, text }

  // Current selected location state
  const [currentCoords, setCurrentCoords] = useState(initialCoords);
  const [verifiedLocation, setVerifiedLocation] = useState(null);

  // Restaurant Coordinates
  const restLat = Number(deliverySettings?.restaurant_latitude ?? deliverySettings?.restaurantLat ?? 26.567247);
  const restLng = Number(deliverySettings?.restaurant_longitude ?? deliverySettings?.restaurantLng ?? 83.943995);
  const freeRadiusKm = Number(deliverySettings?.free_delivery_radius ?? deliverySettings?.freeDeliveryRadiusKm ?? 5.0);
  const maxRadiusKm = Number(deliverySettings?.max_delivery_radius_km ?? deliverySettings?.maxDeliveryRadiusKm ?? 15.0);
  const minPurchaseForFree = Number(deliverySettings?.min_purchase_for_free_delivery ?? deliverySettings?.minPurchaseForFreeDelivery ?? 400);

  /**
   * 1. Initialize Google Maps
   */
  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        // Default map center: Initial Coords OR Restaurant base coordinates
        const centerPos = currentCoords
          ? { lat: Number(currentCoords.lat || currentCoords.latitude), lng: Number(currentCoords.lng || currentCoords.longitude) }
          : { lat: restLat, lng: restLng };

        const map = new maps.Map(mapContainerRef.current, {
          center: centerPos,
          zoom: currentCoords ? 14 : 13,
          styles: DARK_MAP_STYLE,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: maps.ControlPosition.RIGHT_BOTTOM
          }
        });

        mapInstanceRef.current = map;

        // 1. Restaurant Base Marker (Pizza Hub Icon)
        const restMarker = new maps.Marker({
          position: { lat: restLat, lng: restLng },
          map,
          title: deliverySettings?.restaurantName || 'Apurva Pizza Hub',
          icon: {
            url: 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png',
            scaledSize: new maps.Size(42, 42),
            anchor: new maps.Point(21, 42)
          },
          zIndex: 10
        });
        restaurantMarkerRef.current = restMarker;

        // InfoWindow for restaurant
        const restInfoWindow = new maps.InfoWindow({
          content: `
            <div style="color: #111; padding: 6px 10px; font-family: sans-serif;">
              <strong style="color: #ea580c; font-size: 13px;">🍕 Apurva Pizza Hub</strong>
              <div style="font-size: 11px; color: #444; margin-top: 2px;">Main Road, Pathardewa</div>
              <div style="font-size: 10px; color: #16a34a; font-weight: bold; margin-top: 3px;">Base Kitchen & Wood-Fired Oven</div>
            </div>
          `
        });
        restMarker.addListener('click', () => {
          restInfoWindow.open(map, restMarker);
        });

        // 2. 5 KM Free Delivery Radius Circle (Green/Emerald)
        const freeCircle = new maps.Circle({
          strokeColor: '#10B981',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#10B981',
          fillOpacity: 0.08,
          map,
          center: { lat: restLat, lng: restLng },
          radius: freeRadiusKm * 1000 // meters
        });
        freeCircleRef.current = freeCircle;

        // 3. Max Delivery Radius Circle (Orange)
        const maxCircle = new maps.Circle({
          strokeColor: '#F97316',
          strokeOpacity: 0.6,
          strokeWeight: 1.5,
          strokeDasharray: '4 4',
          fillColor: '#F97316',
          fillOpacity: 0.03,
          map,
          center: { lat: restLat, lng: restLng },
          radius: maxRadiusKm * 1000 // meters
        });
        maxCircleRef.current = maxCircle;

        // 4. Click anywhere on map to set / move delivery location
        map.addListener('click', (e) => {
          const clickedLat = e.latLng.lat();
          const clickedLng = e.latLng.lng();
          handleLocationUpdate(clickedLat, clickedLng, null, true);
        });

        // 5. Initialize Google Places Autocomplete on input
        if (searchInputRef.current && maps.places) {
          const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: 'in' },
            fields: ['geometry', 'formatted_address', 'name', 'address_components']
          });

          // Bias results towards restaurant coordinates (50km radius bounds)
          const circleBounds = new maps.Circle({
            center: { lat: restLat, lng: restLng },
            radius: 50000
          });
          autocomplete.setBounds(circleBounds.getBounds());

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) {
              setStatusMessage({
                type: 'warning',
                title: 'Address Not Found',
                text: 'Could not find GPS coordinates for that place. Please select from the dropdown or click on the map.'
              });
              return;
            }

            const pLat = place.geometry.location.lat();
            const pLng = place.geometry.location.lng();
            const pAddr = place.formatted_address || place.name || '';

            setSearchQuery(pAddr);
            handleLocationUpdate(pLat, pLng, null, false, pAddr);
          });

          autocompleteRef.current = autocomplete;
        }

        // If initialCoords provided, place customer marker
        if (currentCoords) {
          handleLocationUpdate(
            Number(currentCoords.lat || currentCoords.latitude),
            Number(currentCoords.lng || currentCoords.longitude),
            currentCoords.accuracy || null,
            false,
            initialAddress
          );
        }

        setMapsLoaded(true);
      })
      .catch((err) => {
        console.warn('Google Maps load issue:', err.message);
        if (isMounted) {
          setMapsError(
            'Google Maps view is currently loading in fallback mode. You can still use GPS detection or type your address.'
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [restLat, restLng, freeRadiusKm, maxRadiusKm]);

  /**
   * 2. Authoritative Location Update, Verification, and Marker Placement
   */
  const handleLocationUpdate = useCallback(
    async (latitude, longitude, accuracy = null, shouldReverseGeocode = true, explicitAddress = '') => {
      const numericLat = Number(latitude);
      const numericLng = Number(longitude);

      if (isNaN(numericLat) || isNaN(numericLng)) return;

      setCurrentCoords({ lat: numericLat, lng: numericLng, accuracy });
      setStatusMessage(null);

      const map = mapInstanceRef.current;
      const maps = window.google?.maps;

      // Update or create Customer Delivery Marker on the Map
      if (map && maps) {
        if (!customerMarkerRef.current) {
          const marker = new maps.Marker({
            position: { lat: numericLat, lng: numericLng },
            map,
            draggable: true,
            animation: maps.Animation.DROP,
            title: 'Your Delivery Location (Drag to adjust)',
            icon: {
              path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#ea580c',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          });

          marker.addListener('dragend', (evt) => {
            const dragLat = evt.latLng.lat();
            const dragLng = evt.latLng.lng();
            handleLocationUpdate(dragLat, dragLng, null, true);
          });

          customerMarkerRef.current = marker;
        } else {
          customerMarkerRef.current.setPosition({ lat: numericLat, lng: numericLng });
          customerMarkerRef.current.setMap(map);
        }

        // Smoothly pan map to new location
        map.panTo({ lat: numericLat, lng: numericLng });
      }

      // Reverse geocode to address if needed
      let resolvedAddress = explicitAddress;
      if (!resolvedAddress && shouldReverseGeocode) {
        setIsGeocoding(true);
        try {
          const geocodeRes = await reverseGeocode(numericLat, numericLng);
          resolvedAddress = geocodeRes.formattedAddress;
          setSearchQuery(resolvedAddress);
        } catch (geoErr) {
          console.warn('Geocoding notice:', geoErr.message);
          resolvedAddress = `GPS Location (${numericLat.toFixed(4)}, ${numericLng.toFixed(4)})`;
          setSearchQuery(resolvedAddress);
        } finally {
          setIsGeocoding(false);
        }
      }

      // Verify with backend authoritative delivery calculation
      try {
        const verifyRes = await api.post('/delivery-settings/verify-location', {
          latitude: numericLat,
          longitude: numericLng,
          accuracy: accuracy || null
        });

        const data = verifyRes.data;
        if (data && data.success) {
          const distanceKm = data.distance_km;
          const isAllowed = data.allowed;
          const isFree = data.free_delivery;
          const deliveryFee = Number(data.delivery_charge || 0);

          const resultObj = {
            latitude: numericLat,
            longitude: numericLng,
            accuracy,
            distanceKm,
            isDeliverable: isAllowed,
            freeDelivery: isFree,
            deliveryCharge: deliveryFee,
            formattedAddress: resolvedAddress || `Location (${numericLat.toFixed(4)}, ${numericLng.toFixed(4)})`
          };

          setVerifiedLocation(resultObj);

          if (isAllowed) {
            if (isFree) {
              setStatusMessage({
                type: 'success',
                title: '✓ Delivery Available (Free Delivery)',
                text: `Location is ${distanceKm} KM from Apurva Pizza Hub (Within ${freeRadiusKm} KM free zone). Delivery Charge: ₹0`
              });
            } else {
              setStatusMessage({
                type: 'info',
                title: '✓ Delivery Available (Extended Zone)',
                text: `Location is ${distanceKm} KM from Apurva Pizza Hub. Delivery Charge: ₹${deliveryFee}`
              });
            }
          } else {
            setStatusMessage({
              type: 'error',
              title: 'Sorry, delivery is not available at this location.',
              text: data.message || `Location is ${distanceKm} KM away. Our maximum delivery radius is ${maxRadiusKm} KM.`
            });
          }

          if (onLocationSelect) {
            onLocationSelect(resultObj);
          }
        }
      } catch (err) {
        console.error('Server verification error:', err);
        // Fallback Haversine calculation on client if server is momentarily unreachable
        const distanceKm = calculateHaversineDistance(restLat, restLng, numericLat, numericLng);
        const isAllowed = distanceKm <= maxRadiusKm;
        const isFree = distanceKm <= freeRadiusKm;
        const fallbackCharge = isFree ? 0 : 20 + Math.ceil(Math.max(0, distanceKm - freeRadiusKm - 1)) * 10;

        const fallbackObj = {
          latitude: numericLat,
          longitude: numericLng,
          accuracy,
          distanceKm,
          isDeliverable: isAllowed,
          freeDelivery: isFree,
          deliveryCharge: fallbackCharge,
          formattedAddress: resolvedAddress || `Location (${numericLat.toFixed(4)}, ${numericLng.toFixed(4)})`
        };

        setVerifiedLocation(fallbackObj);

        if (isAllowed) {
          setStatusMessage({
            type: isFree ? 'success' : 'info',
            title: isFree ? '✓ Delivery Available (Free)' : '✓ Delivery Available',
            text: `Distance: ${distanceKm} KM from restaurant. Delivery Fee: ${isFree ? 'FREE' : '₹' + fallbackCharge}`
          });
        } else {
          setStatusMessage({
            type: 'error',
            title: 'Sorry, delivery is not available at this location.',
            text: `Selected location is ${distanceKm} KM away (Exceeds maximum ${maxRadiusKm} KM radius).`
          });
        }

        if (onLocationSelect) {
          onLocationSelect(fallbackObj);
        }
      }
    },
    [restLat, restLng, freeRadiusKm, maxRadiusKm, onLocationSelect]
  );

  /**
   * 3. "Use My Current Location" Handler
   * Requests browser Geolocation with high accuracy
   */
  const handleUseCurrentLocation = () => {
    setStatusMessage(null);

    if (!navigator.geolocation) {
      setStatusMessage({
        type: 'warning',
        title: 'Geolocation Not Supported',
        text: 'Your browser does not support GPS location. You can search or select your address below.'
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        handleLocationUpdate(latitude, longitude, accuracy, true);
      },
      (geoErr) => {
        setIsLocating(false);
        console.warn('Geolocation permission notice:', geoErr);

        if (geoErr.code === 1 || geoErr.code === geoErr.PERMISSION_DENIED) {
          setStatusMessage({
            type: 'warning',
            title: 'Location Permission Not Granted',
            text: 'You can easily search your landmark or road below, or tap directly on the map to choose your delivery address.'
          });
        } else if (geoErr.code === 3 || geoErr.code === geoErr.TIMEOUT) {
          setStatusMessage({
            type: 'warning',
            title: 'GPS Request Timed Out',
            text: 'GPS took too long to respond. Please ensure device location is enabled, or search your address manually.'
          });
        } else {
          setStatusMessage({
            type: 'warning',
            title: 'Could Not Detect GPS',
            text: 'Please type your area or landmark in the search box below or drag the map pin.'
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  /**
   * Center map on restaurant base location
   */
  const handleResetToRestaurant = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: restLat, lng: restLng });
      mapInstanceRef.current.setZoom(13);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Current Location Button Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Google Places Autocomplete Search Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {isGeocoding ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            ) : (
              <Search className="w-4 h-4 text-orange-500" />
            )}
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search village, landmark, road or area (e.g. Murarchhapar, Tarkulwa Road)..."
            className="w-full pl-10 pr-9 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                if (searchInputRef.current) searchInputRef.current.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
              title="Clear search"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Action: "Use My Current Location" */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="shrink-0 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 border border-orange-400/40 cursor-pointer disabled:opacity-70"
          title="Detect GPS coordinates using phone/browser location"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Detecting GPS...</span>
            </>
          ) : (
            <>
              <Locate className="w-4 h-4 text-white animate-pulse" />
              <span>Use My Current Location</span>
            </>
          )}
        </button>
      </div>

      {/* Interactive Google Map Box */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-orange-500/30 shadow-md dark:shadow-2xl bg-slate-100 dark:bg-slate-950">
        {/* Map Canvas */}
        <div
          ref={mapContainerRef}
          className="w-full h-72 sm:h-80 md:h-96 z-0"
          style={{ minHeight: '280px' }}
        />

        {/* Map Header Overlay Legend */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto flex flex-wrap items-center gap-2 pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-950/85 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-md flex items-center space-x-1.5 pointer-events-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />
            <span>5 KM Free Delivery Zone</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-950/85 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-md flex items-center space-x-1.5 pointer-events-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shadow-sm shadow-orange-500/50" />
            <span>Max 15 KM Delivery Zone</span>
          </div>
        </div>

        {/* Map Control Buttons (Reset to Restaurant, Pan) */}
        <div className="absolute bottom-3 right-3 flex flex-col space-y-1.5">
          <button
            type="button"
            onClick={handleResetToRestaurant}
            className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-white shadow-xl backdrop-blur-md transition-all cursor-pointer"
            title="Focus Restaurant on Map"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Instruction Pill at Bottom Center */}
        <div className="absolute bottom-3 left-3 sm:left-4 pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] text-slate-200 font-medium shadow-lg flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>Click map or drag pin to adjust your exact house/street</span>
          </div>
        </div>

        {/* Maps Loading or Error State Overlay */}
        {mapsError && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Compass className="w-10 h-10 text-orange-400 animate-spin" />
            <h4 className="text-sm font-bold text-white">Google Maps Initializing</h4>
            <p className="text-xs text-slate-400 max-w-sm">{mapsError}</p>
          </div>
        )}
      </div>

      {/* Status & Delivery Verification Banner */}
      <AnimatePresence mode="wait">
        {statusMessage && (
          <motion.div
            key={statusMessage.title}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-2xl border shadow-md backdrop-blur-md flex items-start space-x-3 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-200'
                : statusMessage.type === 'info'
                ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-500/50 text-orange-800 dark:text-orange-200'
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500/50 text-red-800 dark:text-red-200'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : statusMessage.type === 'info' ? (
                <Info className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              ) : statusMessage.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>

            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs sm:text-sm font-black tracking-wide">
                {statusMessage.title}
              </h4>
              <p className="text-[11px] sm:text-xs opacity-90 leading-relaxed font-medium">
                {statusMessage.text}
              </p>
            </div>

            {verifiedLocation && (
              <div className="shrink-0 text-right">
                <span className="text-[11px] font-extrabold uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                  Distance
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {verifiedLocation.distanceKm} KM
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Address Preview Details */}
      {verifiedLocation && verifiedLocation.formattedAddress && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2.5 shadow-sm">
          <MapPin className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 block tracking-wider">
              Selected Delivery Destination:
            </span>
            <p className="text-xs text-slate-900 dark:text-white font-medium truncate mt-0.5">
              {verifiedLocation.formattedAddress}
            </p>
            <div className="flex items-center space-x-3 text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
              <span>Lat: {verifiedLocation.latitude.toFixed(5)}</span>
              <span>Lng: {verifiedLocation.longitude.toFixed(5)}</span>
              {verifiedLocation.accuracy && (
                <span>Accuracy: ±{Math.round(verifiedLocation.accuracy)}m</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryLocationPicker;
