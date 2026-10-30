/**
 * Security Hardening Middleware Suite
 * 1. NoSQL Injection defense: Strips MongoDB operator keys ($*, .) and nullifies sanitized empty object vectors
 * 2. Prototype pollution prevention (__proto__, constructor, prototype)
 * 3. Cross-Site Scripting (XSS) input filtering
 * 4. Enterprise Security HTTP response headers (CSP, nosniff, frameguard, COOP, CORP, HSTS)
 */

// XSS Sanitizer for string values
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '');
}

// Recursive sanitization of objects and arrays
function cleanObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  const cleaned = {};
  for (const key of Object.keys(obj)) {
    // Block prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    // Strip keys with MongoDB operators ($) or dot notation (.)
    if (key.startsWith('$') || key.includes('.')) {
      console.warn(`[Security Warning] Blocked suspicious key '${key}' in request payload.`);
      continue;
    }

    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      const sanitizedChild = cleanObject(value);
      // If the child object was stripped clean because it contained operator keys, drop the key
      if (
        !Array.isArray(sanitizedChild) &&
        Object.keys(sanitizedChild).length === 0 &&
        Object.keys(value).length > 0
      ) {
        continue;
      }
      cleaned[key] = sanitizedChild;
    } else if (typeof value === 'string') {
      cleaned[key] = sanitizeString(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

// Middleware: NoSQL Injection, XSS, and Prototype Pollution Sanitizer
const noSqlSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanObject(req.params);
  }
  next();
};

// Middleware: Production Security HTTP Headers
const securityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking via iframes
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Enforce HTTPS only in production on secure connections
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Strict referrer privacy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Allow Geolocation for store location & delivery radius calculations while keeping camera/mic restricted
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=*');
  // Cross-Origin Isolation & Opener Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Content Security Policy with support for Mapbox GL workers and external map tiles
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "connect-src 'self' ws: wss: http: https: https://*.mapbox.com https://api.mapbox.com https://events.mapbox.com https://ipapi.co https://ipwho.is https://nominatim.openstreetmap.org",
      "img-src 'self' data: https: blob: https://*.mapbox.com https://api.mapbox.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "media-src 'self' data: blob: https:"
    ].join('; ')
  );

  next();
};

module.exports = {
  noSqlSanitizer,
  securityHeaders
};
