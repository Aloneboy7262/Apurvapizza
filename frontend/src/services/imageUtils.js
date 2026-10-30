export const DEFAULT_PRODUCT_FALLBACK =
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80';

/**
 * Universal image URL resolver for Apurva Pizza Hub
 * Routes uploaded assets through reverse proxy (/uploads/...) without calling backend directly.
 */
export const getImageUrl = (url, fallback = DEFAULT_PRODUCT_FALLBACK) => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const trimmed = url.trim();

  // If already data URI or object blob
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If contains upload path, extract relative /uploads/... path so it flows through the reverse proxy
  if (trimmed.includes('/uploads/')) {
    const idx = trimmed.indexOf('/uploads/');
    return trimmed.slice(idx);
  }

  return trimmed;
};

export default getImageUrl;
