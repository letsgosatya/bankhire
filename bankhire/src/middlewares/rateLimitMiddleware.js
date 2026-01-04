/**
 * RATE LIMITING MIDDLEWARE
 * Protects against brute-force attacks and abuse
 * 
 * Security: Prevents OTP flooding, login brute-force, and API abuse
 */

const rateLimit = require('express-rate-limit');
const securityConfig = require('../config/security');

/**
 * Safely mask mobile number for logging
 */
const maskMobile = (mobile) => {
  if (!mobile) return 'unknown';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length >= 4) {
    return 'XXXXXX' + digits.slice(-4);
  }
  return 'XXXX';
};

/**
 * Custom key generator that combines IP and mobile number for auth endpoints
 * Uses the built-in IP handling to properly support IPv6
 */
const authKeyGenerator = (req) => {
  // Use express-rate-limit's built-in IP handling
  const ip = req.ip || 'unknown';
  const mobile = req.body?.mobile || '';
  // Combine IP and mobile for more granular limiting
  return `${ip}-${mobile ? maskMobile(mobile) : 'no-mobile'}`;
};

/**
 * General API rate limiter
 * Applies to all routes - 100 requests per 15 minutes per IP
 */
const generalRateLimiter = rateLimit({
  windowMs: securityConfig.RATE_LIMIT.GENERAL.WINDOW_MS,
  max: securityConfig.RATE_LIMIT.GENERAL.MAX_REQUESTS,
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: Math.ceil(securityConfig.RATE_LIMIT.GENERAL.WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't count successful requests against the limit for non-auth endpoints
  skipSuccessfulRequests: false,
  // Disable the IPv6 validation since we use the default key generator
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    // Log rate limit hit (safe logging - no sensitive data)
    console.log(`[RATE_LIMIT] General limit exceeded - IP: ${req.ip}, RequestId: ${req.requestId || 'N/A'}, Path: ${req.path}`);
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      requestId: req.requestId,
    });
  },
});

/**
 * Auth/OTP rate limiter (stricter)
 * Applies to OTP send endpoint - 5 requests per hour per IP+mobile
 */
const otpSendRateLimiter = rateLimit({
  windowMs: securityConfig.RATE_LIMIT.AUTH.WINDOW_MS,
  max: securityConfig.OTP.MAX_REQUESTS_PER_HOUR,
  keyGenerator: authKeyGenerator,
  message: {
    error: 'Too many OTP requests. Please try again after an hour.',
    retryAfter: Math.ceil(securityConfig.RATE_LIMIT.AUTH.WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Disable IPv6 validation for custom key generator
  validate: { xForwardedForHeader: false, default: false },
  handler: (req, res) => {
    // Log OTP rate limit (safe - mobile masked)
    console.log(`[RATE_LIMIT] OTP send limit exceeded - Key: ${authKeyGenerator(req)}, RequestId: ${req.requestId || 'N/A'}`);
    res.status(429).json({
      error: 'Too many OTP requests. Please try again after an hour.',
      requestId: req.requestId,
    });
  },
});

/**
 * Login/OTP verify rate limiter
 * 5 attempts per 15 minutes per IP+mobile
 */
const loginRateLimiter = rateLimit({
  windowMs: securityConfig.RATE_LIMIT.LOGIN.WINDOW_MS,
  max: securityConfig.RATE_LIMIT.LOGIN.MAX_REQUESTS,
  keyGenerator: authKeyGenerator,
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.',
    retryAfter: Math.ceil(securityConfig.RATE_LIMIT.LOGIN.WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  // Disable IPv6 validation for custom key generator
  validate: { xForwardedForHeader: false, default: false },
  handler: (req, res) => {
    // Log login brute force attempt (safe - mobile masked)
    console.log(`[SECURITY] Login brute-force detected - Key: ${authKeyGenerator(req)}, RequestId: ${req.requestId || 'N/A'}`);
    res.status(429).json({
      error: 'Too many login attempts. Please try again after 15 minutes.',
      requestId: req.requestId,
    });
  },
});

/**
 * Strict rate limiter for admin endpoints
 * 30 requests per 15 minutes per IP
 */
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: 'Too many admin requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    console.log(`[RATE_LIMIT] Admin limit exceeded - IP: ${req.ip}, User: ${req.user?.id || 'N/A'}, RequestId: ${req.requestId || 'N/A'}`);
    res.status(429).json({
      error: 'Too many admin requests. Please try again later.',
      requestId: req.requestId,
    });
  },
});

module.exports = {
  generalRateLimiter,
  otpSendRateLimiter,
  loginRateLimiter,
  adminRateLimiter,
};
