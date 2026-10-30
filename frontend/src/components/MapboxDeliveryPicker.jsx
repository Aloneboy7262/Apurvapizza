import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Locate,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Navigation,
  Info,
  Compass
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

// Mapbox Access Token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

// Exact Shop Coordinates: Apurva Pizza Hub, Pathardewa (Main Road)
const DEFAULT_SHOP_LAT = 26.567247;
const DEFAULT_SHOP_LNG = 83.943995;

// Popular 1-Tap Delivery Areas (Pathardewa & Vicinity)
const QUICK_LOCALITIES = [
  { name: 'Pathardewa Market', lat: 26.567247, lng: 83.943995, badge: 'Shop Hub' },
  { name: 'Pathardewa Thana', lat: 26.568100, lng: 83.945200, badge: '0.3 KM' },
  { name: 'Murarchhapar', lat: 26.561500, lng: 83.941200, badge: '0.8 KM' },
  { name: 'Fazilnagar Road', lat: 26.572300, lng: 83.951100, badge: '1.2 KM' },
  { name: 'Rampur Road', lat: 26.558200, lng: 83.936500, badge: '1.5 KM' },
  { name: 'Tarkulwa Road', lat: 26.575000, lng: 83.932000, badge: '2.0 KM' },
  { name: 'Bagaha', lat: 26.551000, lng: 83.948000, badge: '2.5 KM' },
  { name: 'Malhana', lat: 26.582000, lng: 83.949000, badge: '3.1 KM' }
];

const MapboxDeliveryPicker = forwardRef(({
  deliverySettings,
  onLocationSelect,
  initialCoords = null,
  initialAddress = '',
  cartSubtotal = 0,
  isRequired = true
}, ref) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const shopMarkerRef = useRef(null);
  const isochronePolygonRef = useRef(null);
  const isFirstMount = useRef(true);
  const { isDark } = useTheme();

  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [verifiedLocation, setVerifiedLocation] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(initialCoords);
  const [isIsochroneLoading, setIsIsochroneLoading] = useState(false);
  const [selectedLocality, setSelectedLocality] = useState(null);

  const isInsecureContext =
    typeof window !== 'undefined' &&
    !window.isSecureContext &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  // Delivery rules state strictly controlled by Admin Portal
  const [deliveryRules, setDeliveryRules] = useState({
    maxDeliveryRadiusKm: 5.0,
    freeDeliveryRadiusKm: 5.0,
    minPurchaseForFreeDelivery: 400,
    baseDeliveryCharge: 20,
    extraChargePerKm: 10
  });

  const restLat = Number(
    deliverySettings?.restaurant_latitude ?? deliverySettings?.restaurantLat ?? DEFAULT_SHOP_LAT
  );
  const restLng = Number(
    deliverySettings?.restaurant_longitude ?? deliverySettings?.restaurantLng ?? DEFAULT_SHOP_LNG
  );
  const shopLngLat = [restLng, restLat];

  // Sync delivery rules strictly from admin settings prop
  useEffect(() => {
    if (deliverySettings) {
      const adminMaxRadius = Number(
        deliverySettings.max_delivery_radius_km ??
          deliverySettings.maxDeliveryRadiusKm ??
          5.0
      );
      const adminFreeRadius = Number(
        deliverySettings.free_delivery_radius ??
          deliverySettings.freeDeliveryRadiusKm ??
          5.0
      );

      setDeliveryRules({
        maxDeliveryRadiusKm: adminMaxRadius,
        freeDeliveryRadiusKm: adminFreeRadius,
        minPurchaseForFreeDelivery: Number(
          deliverySettings.min_purchase_for_free_delivery ??
            deliverySettings.minPurchaseForFreeDelivery ??
            400
        ),
        baseDeliveryCharge: Number(
          deliverySettings.base_delivery_charge ?? 20
        ),
        extraChargePerKm: Number(
          deliverySettings.extra_charge_per_km ??
            deliverySettings.extraChargePerKm ??
            10
        )
      });
    }
  }, [deliverySettings]);

  // Straight-line Haversine distance helper
  const calculateHaversineKm = (lon1, lat1, lon2, lat2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  };

  // Helper for circular GeoJSON fallback
  const createGeoJSONCircle = (center, radiusKm, points = 64) => {
    const coords = { latitude: center[1], longitude: center[0] };
    const ret = [];
    const distanceX =
      radiusKm / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
    const distanceY = radiusKm / 110.574;
    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [ret] },
          properties: { radiusKm }
        }
      ]
    };
  };

  /**
   * Fetch Mapbox Isochrone API for the Admin-Configured Delivery Zone
   */
  const fetchIsochroneZone = async (center, radiusKm) => {
    const contoursMeters = Math.round(Number(radiusKm) * 1000);
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/driving/${center[0]},${center[1]}?contours_meters=${contoursMeters}&polygons=true&access_token=${MAPBOX_TOKEN}`;

    try {
      setIsIsochroneLoading(true);
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        isochronePolygonRef.current = data.features[0];
        return data;
      }
    } catch (err) {
      console.warn('Mapbox Isochrone API error, falling back to circle:', err);
    } finally {
      setIsIsochroneLoading(false);
    }

    const fallback = createGeoJSONCircle(center, radiusKm);
    isochronePolygonRef.current = fallback.features[0];
    return fallback;
  };

  // Render delivery zones using Mapbox Isochrone API
  const renderZones = useCallback(
    async (mapInstance) => {
      const map = mapInstance || mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const zoneRadius = Number(
        deliveryRules.maxDeliveryRadiusKm || deliveryRules.freeDeliveryRadiusKm || 5.0
      );

      const isochroneData = await fetchIsochroneZone(shopLngLat, zoneRadius);

      if (map.getSource('delivery-zone')) {
        map.getSource('delivery-zone').setData(isochroneData);
      } else {
        map.addSource('delivery-zone', {
          type: 'geojson',
          data: isochroneData
        });

        map.addLayer({
          id: 'delivery-zone-fill',
          type: 'fill',
          source: 'delivery-zone',
          paint: {
            'fill-color': '#f97316',
            'fill-opacity': 0.16
          }
        });

        map.addLayer({
          id: 'delivery-zone-outline',
          type: 'line',
          source: 'delivery-zone',
          paint: {
            'line-color': '#f97316',
            'line-width': 2.5
          }
        });
      }
    },
    [deliveryRules.freeDeliveryRadiusKm, deliveryRules.maxDeliveryRadiusKm, shopLngLat]
  );

  /**
   * Process Location Coordinates (via GPS or Map Pin selection)
   */
  const processDirectGpsLocation = useCallback(
    async (custLng, custLat, accuracy = null) => {
      const map = mapRef.current;
      setStatusMessage(null);

      // 1. Straight-line baseline
      const straightDistanceKm = calculateHaversineKm(
        shopLngLat[0],
        shopLngLat[1],
        custLng,
        custLat
      );

      // 2. Fetch Driving Route via Mapbox Directions API
      let effectiveDistanceKm = straightDistanceKm;
      let routeGeoJSON = null;
      try {
        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${shopLngLat[0]},${shopLngLat[1]};${custLng},${custLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
        const dirRes = await fetch(directionsUrl);
        const dirData = await dirRes.json();
        if (dirData.routes && dirData.routes.length > 0) {
          routeGeoJSON = dirData.routes[0].geometry;
          effectiveDistanceKm = Number(
            (dirData.routes[0].distance / 1000).toFixed(1)
          );
        }
      } catch (dirErr) {
        console.warn('Mapbox Directions fallback to straight-line:', dirErr);
      }

      // 3. Check if inside delivery zone
      let isInsideIsochroneZone = false;
      if (isochronePolygonRef.current) {
        try {
          const pt = point([custLng, custLat]);
          isInsideIsochroneZone = booleanPointInPolygon(
            pt,
            isochronePolygonRef.current
          );
        } catch (turfErr) {
          isInsideIsochroneZone = effectiveDistanceKm <= deliveryRules.maxDeliveryRadiusKm;
        }
      } else {
        isInsideIsochroneZone = effectiveDistanceKm <= deliveryRules.maxDeliveryRadiusKm;
      }

      // 4. Reverse Geocode with Mapbox Places API
      let resolvedAddress = '';
      let addressDetails = {
        formattedAddress: '',
        area: '',
        pincode: '',
        city: 'Pathardewa',
        state: 'Uttar Pradesh'
      };

      try {
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${custLng},${custLat}.json?access_token=${MAPBOX_TOKEN}&types=poi,address,neighborhood,locality,place,postcode&limit=1`;
        const geoRes = await fetch(geocodeUrl);
        const geoData = await geoRes.json();
        if (geoData.features && geoData.features.length > 0) {
          const feature = geoData.features[0];
          resolvedAddress = feature.place_name;

          const postcodeObj = feature.context?.find((c) => c.id.startsWith('postcode'));
          const placeObj = feature.context?.find(
            (c) => c.id.startsWith('place') || c.id.startsWith('locality') || c.id.startsWith('district')
          );
          const regionObj = feature.context?.find((c) => c.id.startsWith('region'));

          addressDetails = {
            formattedAddress: feature.place_name,
            area: feature.text || (feature.place_name ? feature.place_name.split(',')[0].trim() : ''),
            pincode: postcodeObj ? postcodeObj.text : '274404',
            city: placeObj ? placeObj.text : 'Pathardewa',
            state: regionObj ? regionObj.text : 'Uttar Pradesh'
          };
        } else {
          resolvedAddress = `Location (${custLat.toFixed(5)}, ${custLng.toFixed(5)})`;
          addressDetails = {
            formattedAddress: resolvedAddress,
            area: `Near Pathardewa (${effectiveDistanceKm} KM)`,
            pincode: '274404',
            city: 'Pathardewa',
            state: 'Uttar Pradesh'
          };
        }
      } catch (geoErr) {
        resolvedAddress = `Location (${custLat.toFixed(5)}, ${custLng.toFixed(5)})`;
      }

      const isOutsideLimit = effectiveDistanceKm > deliveryRules.maxDeliveryRadiusKm;

      // 5. Update Marker (Draggable for pinpoint doorstep precision)
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }

      if (map) {
        const markerColor = isOutsideLimit ? '#ef4444' : '#10b981';

        const marker = new mapboxgl.Marker({
          color: markerColor,
          draggable: true
        })
          .setLngLat([custLng, custLat])
          .addTo(map);

        // Allow dragging marker to fine-tune doorstep
        marker.on('dragend', () => {
          setSelectedLocality(null);
          const lngLat = marker.getLngLat();
          processDirectGpsLocation(lngLat.lng, lngLat.lat, null);
        });

        userMarkerRef.current = marker;

        // 6. Draw Driving Route Line on Map
        if (routeGeoJSON && map.isStyleLoaded()) {
          const routeColor = isOutsideLimit ? '#ef4444' : '#f97316';
          if (map.getSource('route')) {
            map.getSource('route').setData({
              type: 'Feature',
              geometry: routeGeoJSON
            });
            if (map.getLayer('routeLayer')) {
              map.setPaintProperty('routeLayer', 'line-color', routeColor);
            }
          } else {
            map.addSource('route', {
              type: 'geojson',
              data: { type: 'Feature', geometry: routeGeoJSON }
            });
            map.addLayer({
              id: 'routeLayer',
              type: 'line',
              source: 'route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': routeColor, 'line-width': 4 }
            });
          }
        }

        // 7. Smoothly fit bounds
        const bounds = new mapboxgl.LngLatBounds(shopLngLat, [custLng, custLat]);
        map.fitBounds(bounds, { padding: 45, maxZoom: 15, duration: 800 });
      }

      // 8. Authoritative Backend Location Verification
      try {
        const res = await api.post('/delivery-settings/verify-location', {
          latitude: custLat,
          longitude: custLng,
          accuracy,
          subtotal: cartSubtotal
        });

        if (res.data?.success) {
          const data = res.data;
          const allowed = Boolean(data.allowed);

          const locationState = {
            isDeliverable: allowed,
            distanceKm: effectiveDistanceKm,
            freeDelivery: Boolean(data.free_delivery),
            deliveryCharge: Number(data.delivery_charge || 0),
            latitude: custLat,
            longitude: custLng,
            accuracy,
            formattedAddress: resolvedAddress,
            area: addressDetails.area,
            pincode: addressDetails.pincode,
            city: addressDetails.city,
            state: addressDetails.state
          };

          setVerifiedLocation(locationState);
          setCurrentCoords({ lat: custLat, lng: custLng, accuracy });

          if (!allowed) {
            setStatusMessage({
              type: 'error',
              title: 'Sorry, we will be available in your area soon',
              text: `Your selected location is ${effectiveDistanceKm} KM away. We currently deliver within ${deliveryRules.maxDeliveryRadiusKm} KM from Apurva Pizza Hub.`
            });
          }

          if (onLocationSelect) {
            onLocationSelect(locationState);
          }
          return;
        }
      } catch (err) {
        console.warn('Backend location verification fallback to client logic:', err);
      }

      // Client Fallback calculation
      const isDeliverable = !isOutsideLimit;
      const isFree = effectiveDistanceKm <= deliveryRules.freeDeliveryRadiusKm;
      const charge = isDeliverable
        ? isFree
          ? 0
          : deliveryRules.baseDeliveryCharge +
            Math.max(0, effectiveDistanceKm - deliveryRules.freeDeliveryRadiusKm) *
              deliveryRules.extraChargePerKm
        : 0;

      const fallbackState = {
        isDeliverable,
        distanceKm: effectiveDistanceKm,
        freeDelivery: isFree,
        deliveryCharge: charge,
        latitude: custLat,
        longitude: custLng,
        accuracy,
        formattedAddress: resolvedAddress,
        area: addressDetails.area,
        pincode: addressDetails.pincode,
        city: addressDetails.city,
        state: addressDetails.state
      };

      setVerifiedLocation(fallbackState);
      setCurrentCoords({ lat: custLat, lng: custLng, accuracy });

      if (!isDeliverable) {
        setStatusMessage({
          type: 'error',
          title: 'Sorry, we will be available in your area soon',
          text: `Your location is ${effectiveDistanceKm} KM away. We currently deliver within ${deliveryRules.maxDeliveryRadiusKm} KM.`
        });
      }

      if (onLocationSelect) {
        onLocationSelect(fallbackState);
      }
    },
    [
      cartSubtotal,
      deliveryRules.baseDeliveryCharge,
      deliveryRules.extraChargePerKm,
      deliveryRules.freeDeliveryRadiusKm,
      deliveryRules.maxDeliveryRadiusKm,
      onLocationSelect,
      shopLngLat
    ]
  );

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialStyle = isDark
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/streets-v12';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: shopLngLat,
      zoom: 12.8,
      attributionControl: false,
      cooperativeGestures: true
    });

    mapRef.current = map;

    // Set cursor on canvas to indicate clickable doorstep selection
    const canvas = map.getCanvas();
    if (canvas) {
      canvas.style.cursor = 'crosshair';
    }

    // Shop Marker
    const shopEl = document.createElement('div');
    shopEl.className = 'shop-custom-marker';
    shopEl.style.width = '34px';
    shopEl.style.height = '34px';
    shopEl.style.borderRadius = '50%';
    shopEl.style.backgroundColor = '#ea580c';
    shopEl.style.border = '2.5px solid #ffffff';
    shopEl.style.boxShadow = '0 0 15px rgba(234, 88, 12, 0.7)';
    shopEl.style.display = 'flex';
    shopEl.style.alignItems = 'center';
    shopEl.style.justifyContent = 'center';
    shopEl.style.fontSize = '18px';
    shopEl.innerHTML = '🍕';

    const shopMarker = new mapboxgl.Marker({ element: shopEl })
      .setLngLat(shopLngLat)
      .setPopup(
        new mapboxgl.Popup({ offset: 20 }).setHTML(`
          <div style="font-family: inherit; padding: 4px; color: #1e293b;">
            <b style="color: #ea580c; font-size: 13px;">🍕 Apurva Pizza Hub</b>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Pathardewa Kitchen</div>
          </div>
        `)
      )
      .addTo(map);

    shopMarkerRef.current = shopMarker;

    map.on('load', () => {
      // Multiple resize pulses ensure canvas adapts to any container ref low-latency layout
      map.resize();
      setTimeout(() => map.resize(), 150);
      setTimeout(() => map.resize(), 600);

      renderZones(map);

      // If coordinates already provided (e.g. from saved address)
      if (
        initialCoords &&
        (initialCoords.lat || initialCoords.latitude) &&
        (initialCoords.lng || initialCoords.longitude)
      ) {
        const lat = Number(initialCoords.lat || initialCoords.latitude);
        const lng = Number(initialCoords.lng || initialCoords.longitude);
        processDirectGpsLocation(lng, lat, initialCoords.accuracy || null);
      }
    });

    // ResizeObserver ensures canvas width and height adapt dynamically to orientation changes or LAN viewport
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const handleWindowResize = () => {
      if (mapRef.current) mapRef.current.resize();
    };
    window.addEventListener('resize', handleWindowResize);

    // Allow user to click anywhere on map to set or refine doorstep location
    map.on('click', (e) => {
      setSelectedLocality(null);
      processDirectGpsLocation(e.lngLat.lng, e.lngLat.lat, null);
    });

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (userMarkerRef.current) userMarkerRef.current.remove();
      if (shopMarkerRef.current) shopMarkerRef.current.remove();
      map.remove();
    };
  }, [restLat, restLng]);

  // Re-render zones when delivery rules change
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      renderZones(mapRef.current);
    }
  }, [deliveryRules.freeDeliveryRadiusKm, deliveryRules.maxDeliveryRadiusKm, renderZones]);

  // Dynamic Map Theme Switching when customer toggles Light / Dark mode
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const nextStyle = isDark
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/streets-v12';
    map.setStyle(nextStyle);
    map.once('style.load', () => {
      renderZones(map);
    });
  }, [isDark, renderZones]);

  // Sync when initialCoords change from parent
  useEffect(() => {
    if (
      initialCoords &&
      (initialCoords.lat || initialCoords.latitude) &&
      (initialCoords.lng || initialCoords.longitude)
    ) {
      const lat = Number(initialCoords.lat || initialCoords.latitude);
      const lng = Number(initialCoords.lng || initialCoords.longitude);
      if (
        lat &&
        lng &&
        (lat !== currentCoords?.lat || lng !== currentCoords?.lng)
      ) {
        setCurrentCoords({ lat, lng, accuracy: initialCoords.accuracy || null });
        if (mapRef.current) {
          processDirectGpsLocation(lng, lat, initialCoords.accuracy || null);
        }
      }
    }
  }, [
    initialCoords?.lat,
    initialCoords?.latitude,
    initialCoords?.lng,
    initialCoords?.longitude,
    initialCoords?.accuracy
  ]);

  // Locality chip 1-tap selector
  const handleSelectLocality = (loc) => {
    setSelectedLocality(loc.name);
    setStatusMessage(null);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 14.2, duration: 600 });
    }
    processDirectGpsLocation(loc.lng, loc.lat, null);
  };

  // Gracefully handles GPS detection with local IP / HTTP fallback
  const handleDetectLocation = async () => {
    setIsLocating(true);
    setStatusMessage(null);
    setSelectedLocality(null);

    // Fallback when browser GPS fails or is blocked on non-secure context (e.g. HTTP on local LAN)
    const fallbackToDefaultLocation = async (customMessage) => {
      // 1. Try IP geolocation if available
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData && ipData.latitude && ipData.longitude) {
            const ipLat = Number(ipData.latitude);
            const ipLng = Number(ipData.longitude);
            const distFromShop = calculateHaversineKm(shopLngLat[0], shopLngLat[1], ipLng, ipLat);
            // If reasonably close to shop (< 30km, e.g. Deoria/Gorakhpur/Kushinagar area)
            if (distFromShop <= 30) {
              await processDirectGpsLocation(ipLng, ipLat, null);
              if (mapRef.current) {
                mapRef.current.flyTo({ center: [ipLng, ipLat], zoom: 13.5, duration: 600 });
              }
              setStatusMessage({
                type: 'info',
                title: 'Approximate Network Location Detected',
                text: 'Based on network IP. Drag the pin on the map or select a locality chip to set your exact doorstep.'
              });
              setIsLocating(false);
              return;
            }
          }
        }
      } catch (ipErr) {
        // IP lookup fallback
      }

      // 2. Default smoothly to Apurva Pizza Hub / Pathardewa center with active pin
      await processDirectGpsLocation(shopLngLat[0], shopLngLat[1], null);
      if (mapRef.current) {
        mapRef.current.flyTo({ center: shopLngLat, zoom: 13.5, duration: 600 });
      }
      setIsLocating(false);
      setStatusMessage({
        type: 'info',
        title: isInsecureContext ? 'Local Network Mode (HTTP)' : 'Location Pinned at Pathardewa',
        text:
          customMessage ||
          'Direct browser GPS requires HTTPS on local IP. We pinned your location at Pathardewa. Tap on the map or choose a locality chip below to fine-tune your doorstep.'
      });
    };

    if (!navigator.geolocation) {
      await fallbackToDefaultLocation('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Cap or sanitize accuracy: reject accuracy worse than 1000m to prevent backend rejection
        const rawAcc = pos.coords.accuracy;
        const accuracy = rawAcc && rawAcc <= 1000 ? rawAcc : null;
        processDirectGpsLocation(lng, lat, accuracy);
      },
      async (err) => {
        console.warn('Geolocation error:', err);
        const notice = isInsecureContext
          ? 'Modern browsers block GPS on HTTP local network addresses. We pinned your location at Pathardewa. Tap the map or select a locality chip below.'
          : 'Could not access device GPS. Pinned at Pathardewa. Tap the map or select a locality chip below to set your exact doorstep.';
        await fallbackToDefaultLocation(notice);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Expose trigger method to parent component via ref
  useImperativeHandle(ref, () => ({
    triggerDetect: () => {
      handleDetectLocation();
    },
    resetMap: () => {
      resetToRestaurant();
    }
  }));

  const resetToRestaurant = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: shopLngLat, zoom: 12.8, duration: 800 });
    }
  };

  return (
    <div id="delivery-map-section" className="space-y-3">
      {/* ========================================================================= */}
      {/* SINGLE UNIFIED LOCATION HEADER & TRIGGER BAR                              */}
      {/* ========================================================================= */}
      {!verifiedLocation ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-white dark:to-slate-900 border border-orange-300 dark:border-orange-500/30 shadow-sm min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
              <Locate className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>Check Delivery Eligibility</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 shrink-0">
                  Up to {deliveryRules.maxDeliveryRadiusKm} KM
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 break-words">
                Verify your location or tap map to confirm delivery range & fee
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-70 cursor-pointer border border-orange-400/30 shrink-0"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Locate className="w-3.5 h-3.5" />
                <span>Use Current Location</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all min-w-0 ${
            verifiedLocation.isDeliverable
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40'
              : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-500/40'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                verifiedLocation.isDeliverable
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
              }`}
            >
              {verifiedLocation.isDeliverable ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span
                  className={`text-xs font-black break-words ${
                    verifiedLocation.isDeliverable
                      ? 'text-emerald-900 dark:text-emerald-300'
                      : 'text-red-900 dark:text-red-300'
                  }`}
                >
                  {verifiedLocation.isDeliverable
                    ? '✓ Within Delivery Zone'
                    : 'Sorry, we will be available in your area soon'}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  {verifiedLocation.distanceKm} KM away
                </span>
                {verifiedLocation.isDeliverable && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 shrink-0">
                    {verifiedLocation.freeDelivery
                      ? 'FREE Delivery'
                      : `₹${verifiedLocation.deliveryCharge} Delivery`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-800 dark:text-slate-300 font-semibold truncate mt-0.5 break-words">
                {verifiedLocation.formattedAddress}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Re-detect</span>
          </button>
        </div>
      )}

      {/* Mapbox Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl bg-slate-100 dark:bg-slate-950">
        <div
          ref={mapContainerRef}
          className="w-full h-56 sm:h-64"
        />

        {/* Top Floating Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-2 pointer-events-none z-10">
          <div className="px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-950/85 backdrop-blur-md border border-slate-200 dark:border-orange-500/30 text-[10px] font-extrabold text-orange-700 dark:text-orange-400 flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-orange-500 dark:bg-orange-400 animate-pulse" />
            <span>🚗 {deliveryRules.maxDeliveryRadiusKm} KM Delivery Radius</span>
            {isIsochroneLoading && (
              <Loader2 className="w-2.5 h-2.5 animate-spin text-orange-500 dark:text-orange-400 ml-0.5" />
            )}
          </div>
        </div>

        {/* Floating Reset Button */}
        <div className="absolute bottom-2.5 right-2.5 z-10">
          <button
            type="button"
            onClick={resetToRestaurant}
            title="Recenter to Apurva Pizza Hub"
            className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-white transition-all shadow-md cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Hint */}
        <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[10px] text-slate-100 font-medium border border-white/10">
            📍 Tap map or drag pin to fine-tune doorstep
          </span>
        </div>
      </div>

      {/* 1-Tap Quick Delivery Locality Chips */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-orange-500" />
            <span>1-Tap Local Delivery Areas</span>
          </span>
          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
            Tap to set location
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none overscroll-x-contain">
          {QUICK_LOCALITIES.map((loc) => {
            const isSelected = selectedLocality === loc.name;
            return (
              <button
                key={loc.name}
                type="button"
                onClick={() => handleSelectLocality(loc)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-sm ring-1 ring-orange-500'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-500/50 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>📍 {loc.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {loc.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Insecure Context (Local IP / HTTP) Gentle Notice */}
      {isInsecureContext && (
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
          <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <b>Local Network (HTTP):</b> Modern browsers restrict device GPS on HTTP local network addresses. Tap any locality button above or tap directly on the map to set your doorstep.
          </span>
        </div>
      )}

      {/* Clean Dynamic Status Alert */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              statusMessage.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-200'
                : statusMessage.type === 'info'
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-500/40 text-sky-800 dark:text-sky-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200'
            }`}
          >
            {statusMessage.type === 'error' ? (
              <XCircle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400 mt-0.5" />
            ) : statusMessage.type === 'info' ? (
              <Info className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-bold block">{statusMessage.title}</span>
              <span className="text-[11px] opacity-90">{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default MapboxDeliveryPicker;
