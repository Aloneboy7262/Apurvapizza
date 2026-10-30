/**
 * Google Maps JavaScript API, Places & Geocoding Loader Service
 * Handles script injection, singleton promise management, reverse/forward geocoding,
 * and resilient fallback mechanisms.
 */

let loadPromise = null;

export const getGoogleMapsApiKey = () => {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
};

/**
 * Dynamically load Google Maps JavaScript API with Places and Geometry libraries
 */
export const loadGoogleMaps = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'));
  }

  // Already loaded
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  const apiKey = getGoogleMapsApiKey();

  loadPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.getElementById('google-maps-js-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.google && window.google.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps SDK failed to initialize'));
        }
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Google Maps script'));
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps SDK loaded but window.google.maps is unavailable'));
      }
    };

    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps SDK from Google Cloud.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

/**
 * Reverse Geocode: (lat, lng) -> Human readable address
 * Uses Google Geocoder, with automatic graceful fallback if Google API status is not OK.
 */
export const reverseGeocode = async (lat, lng) => {
  const numericLat = Number(lat);
  const numericLng = Number(lng);

  if (isNaN(numericLat) || isNaN(numericLng)) {
    throw new Error('Invalid coordinates for reverse geocoding');
  }

  try {
    const maps = await loadGoogleMaps();
    const geocoder = new maps.Geocoder();

    const response = await new Promise((resolve, reject) => {
      geocoder.geocode({ location: { lat: numericLat, lng: numericLng } }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          resolve(results);
        } else {
          // Status could be ZERO_RESULTS, OVER_QUERY_LIMIT, REQUEST_DENIED, etc.
          reject(new Error(`Google Geocoding status: ${status}`));
        }
      });
    });

    const bestResult = response[0];
    const components = bestResult.address_components || [];

    const getComponent = (types) => {
      const match = components.find((c) => types.some((t) => c.types.includes(t)));
      return match ? match.long_name : '';
    };

    const houseNo = getComponent(['street_number', 'premise', 'subpremise']);
    const street = getComponent(['route']);
    const area = getComponent(['sublocality', 'sublocality_level_1', 'sublocality_level_2', 'neighborhood']);
    const city = getComponent(['locality', 'administrative_area_level_2']) || 'Pathardewa';
    const state = getComponent(['administrative_area_level_1']) || 'Uttar Pradesh';
    const pincode = getComponent(['postal_code']) || '274404';
    const country = getComponent(['country']) || 'India';

    return {
      formattedAddress: bestResult.formatted_address,
      houseNo,
      street,
      area: area || street || bestResult.formatted_address.split(',')[0],
      city,
      state,
      pincode,
      country,
      source: 'google'
    };
  } catch (googleErr) {
    console.warn('Google Geocoding unavailable, using resilient fallback:', googleErr.message);

    // Resilient Fallback: OpenStreetMap Nominatim Reverse Geocoding
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numericLat}&lon=${numericLng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        return {
          formattedAddress: data.display_name || `Location (${numericLat.toFixed(4)}, ${numericLng.toFixed(4)})`,
          houseNo: addr.house_number || '',
          street: addr.road || '',
          area: addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || '',
          city: addr.city || addr.town || addr.county || 'Pathardewa',
          state: addr.state || 'Uttar Pradesh',
          pincode: addr.postcode || '274404',
          country: addr.country || 'India',
          source: 'nominatim'
        };
      }
    } catch (fallbackErr) {
      console.warn('Fallback geocoding error:', fallbackErr);
    }

    // Ultimate fallback if both network geocoders fail
    return {
      formattedAddress: `Selected Location (${numericLat.toFixed(4)}, ${numericLng.toFixed(4)})`,
      houseNo: '',
      street: '',
      area: 'Selected Map Location',
      city: 'Pathardewa',
      state: 'Uttar Pradesh',
      pincode: '274404',
      country: 'India',
      source: 'coordinates'
    };
  }
};

/**
 * Calculate straight-line distance using Haversine formula (km)
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};
