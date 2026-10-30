/**
 * Robust In-Memory Rate Limiting Pipeline Middleware
 * Protects against brute-force attacks on auth endpoints and request spamming on order creation.
 */

class SlidingWindowRateLimiter {
  constructor(windowMs, maxRequests, message) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message || 'Too many requests. Please try again later.';
    this.hits = new Map();

    // Clean up expired buckets periodically (every 5 minutes)
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((time) => now - time < this.windowMs);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }
  }

  getMiddleware(keyGenerator) {
    return (req, res, next) => {
      const now = Date.now();
      const clientKey = keyGenerator ? keyGenerator(req) : (req.ip || 'anonymous');

      if (!this.hits.has(clientKey)) {
        this.hits.set(clientKey, []);
      }

      const timestamps = this.hits.get(clientKey);
      // Filter timestamps within sliding window
      const recentHits = timestamps.filter((time) => now - time < this.windowMs);

      if (recentHits.length >= this.maxRequests) {
        const oldestHit = recentHits[0];
        const retryAfterSeconds = Math.ceil((this.windowMs - (now - oldestHit)) / 1000);

        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);

        return res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: this.message,
          retryAfterSeconds
        });
      }

      // Record hit
      recentHits.push(now);
      this.hits.set(clientKey, recentHits);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - recentHits.length));

      next();
    };
  }

  // Reset hits for a given key on successful action (e.g. valid login)
  reset(key) {
    if (this.hits.has(key)) {
      this.hits.delete(key);
    }
  }
}

// 1. Auth Login Rate Limiter: Max attempts per window per IP + identifier
const loginLimiterInstance = new SlidingWindowRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 5 : 50, // 5 attempts in production, 50 in dev
  'Security Alert: Too many failed login attempts detected. For your account protection, please wait 15 minutes before trying again.'
);

const loginLimiter = loginLimiterInstance.getMiddleware((req) => {
  const id = (req.body?.username || req.body?.phone || req.body?.email || '').trim();
  const ip = req.ip || req.connection?.remoteAddress || 'ip';
  return `login_${ip}_${id}`;
});

// 2. Order Placement Rate Limiter: Max 10 orders per 10 minutes per IP / User
const orderLimiterInstance = new SlidingWindowRateLimiter(
  10 * 60 * 1000, // 10 minutes
  10, // 10 orders
  'Rate limit exceeded: You are placing orders too quickly. Please wait a few minutes.'
);

const orderLimiter = orderLimiterInstance.getMiddleware((req) => {
  const userId = req.user?._id ? String(req.user._id) : (req.ip || 'ip');
  return `order_${userId}`;
});

// 3. General Global API Limiter: Max 150 requests per minute per IP
const globalApiLimiterInstance = new SlidingWindowRateLimiter(
  60 * 1000, // 1 minute
  150, // 150 requests
  'Too many API requests from this connection. Please throttle requests.'
);

const globalApiLimiter = globalApiLimiterInstance.getMiddleware((req) => {
  return `global_${req.ip || 'ip'}`;
});

// 4. OTP Request Rate Limiter: Max 3 OTP sends per 10 minutes per IP / Phone
const otpLimiterInstance = new SlidingWindowRateLimiter(
  10 * 60 * 1000, // 10 minutes
  process.env.NODE_ENV === 'production' ? 3 : 10,
  'Rate limit exceeded: Too many OTP requests for this number/network. Please wait 10 minutes before requesting another OTP.'
);

const otpLimiter = otpLimiterInstance.getMiddleware((req) => {
  const phone = (req.body?.phone || '').trim();
  const ip = req.ip || req.connection?.remoteAddress || 'ip';
  return `otp_${ip}_${phone}`;
});

// 5. OTP Verification Rate Limiter: Max 5 attempts per 10 minutes to prevent brute-forcing 6-digit codes
const verifyOtpLimiterInstance = new SlidingWindowRateLimiter(
  10 * 60 * 1000, // 10 minutes
  5, // 5 attempts
  'Brute Force Protection: Too many incorrect OTP attempts. Please wait 10 minutes.'
);

const verifyOtpLimiter = verifyOtpLimiterInstance.getMiddleware((req) => {
  const phone = (req.body?.phone || '').trim();
  const ip = req.ip || req.connection?.remoteAddress || 'ip';
  return `verify_otp_${ip}_${phone}`;
});

// 6. Password Reset Rate Limiter: Max 5 attempts per 15 minutes
const passwordResetLimiterInstance = new SlidingWindowRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Security Alert: Too many password reset requests. Please wait 15 minutes before trying again.'
);

const passwordResetLimiter = passwordResetLimiterInstance.getMiddleware((req) => {
  const phone = (req.body?.phone || '').trim();
  const ip = req.ip || req.connection?.remoteAddress || 'ip';
  return `reset_pass_${ip}_${phone}`;
});

module.exports = {
  loginLimiter,
  loginLimiterInstance,
  orderLimiter,
  globalApiLimiter,
  otpLimiter,
  otpLimiterInstance,
  verifyOtpLimiter,
  verifyOtpLimiterInstance,
  passwordResetLimiter,
  passwordResetLimiterInstance
};

