/**
 * ENHANCED OTP SERVICE
 * Secure OTP generation, sending, and verification
 * 
 * Security: Rate limiting, attempt tracking, secure hashing, safe logging
 */

const bcrypt = require('bcryptjs');
const axios = require('axios');
const securityConfig = require('../config/security');
const safeLogger = require('../utils/safeLogger');

// 2Factor API key from environment variables
const apiKey = process.env.TWO_FACTOR_API_KEY;

// File-backed storage for OTPs (survives server restarts)
const otpStore = require('./otpStore');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Normalize mobile numbers to a canonical form for storage and lookup.
// Strategy: keep digits only and use last 10 digits when longer (Indian numbers)
function normalizeMobile(mobile) {
  if (!mobile) return '';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

/**
 * Mask mobile for safe logging
 */
const maskMobile = (mobile) => {
  if (!mobile) return 'unknown';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length >= 4) {
    return 'XXXXXX' + digits.slice(-4);
  }
  return 'XXXX';
};

const sendOTP = async (mobile) => {
  // Canonicalize mobile for store and later lookup
  const canon = normalizeMobile(mobile);
  if (!canon) throw new Error('Invalid mobile number');

  // Security: Check rate limit before sending OTP
  const canRequest = await otpStore.canRequestOtp(canon);
  if (!canRequest) {
    const remaining = await otpStore.getRemainingOtpRequests(canon);
    safeLogger.security('OTP_RATE_LIMIT_EXCEEDED', { mobile: maskMobile(mobile) });
    throw new Error(`Too many OTP requests. Please try again later. Remaining: ${remaining}`);
  }

  const otp = process.env.USE_HARDCODED_OTP === 'true' ? '123456' : generateOTP();
  const hashedOtp = await bcrypt.hash(otp, securityConfig.OTP.HASH_ROUNDS);
  const expiry = Date.now() + (securityConfig.OTP.EXPIRY_MINUTES * 60 * 1000);

  try {
    await otpStore.setOtp(canon, hashedOtp, expiry);
    // Record the OTP request for rate limiting
    await otpStore.recordOtpRequest(canon);
  } catch (e) {
    // Security: Don't log sensitive details
    safeLogger.error('Failed to persist OTP', e);
  }

  // Format mobile with country code for 2Factor (always use 91+canon)
  const formattedMobile = `91${canon}`;

  // Security: Never log actual OTP in production
  if (process.env.USE_HARDCODED_OTP === 'true') {
    // Only log in dev/test mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] HARDCODED OTP mode: OTP for ${maskMobile(mobile)}`);
    }
  } else {
    // Send OTP via SMS using 2Factor (skip if no API key)
    if (apiKey) {
      try {
        // Security: Don't log OTP value
        safeLogger.info('Sending OTP', { mobile: maskMobile(mobile), method: 'SMS' });
        const response = await axios.get(`https://2factor.in/API/V1/${apiKey}/SMS/${formattedMobile}/${otp}`);
        if (response.data.Status !== 'Success') {
          safeLogger.info('SMS failed, trying voice call', { mobile: maskMobile(mobile) });
          // Try voice call as fallback
          const voiceUrl = `https://2factor.in/API/V1/${apiKey}/VOICE/${formattedMobile}/${otp}`;
          const voiceResponse = await axios.get(voiceUrl);
          safeLogger.info('OTP sent via voice', { mobile: maskMobile(mobile) });
        } else {
          safeLogger.info('OTP sent via SMS', { mobile: maskMobile(mobile) });
        }
      } catch (error) {
        safeLogger.error('Error sending SMS', error);
        try {
          // Try voice call as fallback
          const voiceUrl = `https://2factor.in/API/V1/${apiKey}/VOICE/${formattedMobile}/${otp}`;
          await axios.get(voiceUrl);
          safeLogger.info('OTP sent via voice fallback', { mobile: maskMobile(mobile) });
        } catch (voiceError) {
          safeLogger.error('Voice call also failed', voiceError);
          // Don't throw, just log and continue
        }
      }
    } else {
      // Security: Only log masked mobile, never OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] No API key set. OTP generated for ${maskMobile(mobile)}`);
      }
    }
  }

  return true;
};

const verifyOTP = async (mobile, otp) => {
  // Security: Don't log actual OTP
  safeLogger.info('Verifying OTP', { mobile: maskMobile(mobile) });

  // Canonicalize incoming mobile and prepare key variants
  const canon = normalizeMobile(mobile);
  if (!canon) {
    safeLogger.warn('Invalid mobile format during OTP verification');
    return false;
  }
  const variants = [canon, '91' + canon];

  // Security: Check attempt limits before verification
  for (const key of variants) {
    const rec = await otpStore.getOtp(key);
    if (rec) {
      const attemptResult = await otpStore.incrementAttempts(key);
      if (attemptResult.locked) {
        safeLogger.security('OTP_ATTEMPTS_EXCEEDED', { mobile: maskMobile(mobile) });
        return false;
      }
      break;
    }
  }

  // If hardcoded OTP testing mode, accept the known OTP and mark the matched record used
  if (process.env.USE_HARDCODED_OTP === 'true' && otp === '123456') {
    safeLogger.info('Hardcoded OTP accepted for testing', { mobile: maskMobile(mobile) });
    for (const key of variants) {
      try {
        const rec = await otpStore.getOtp(key);
        if (rec) {
          await otpStore.markUsed(key);
          return true;
        }
      } catch (e) {
        safeLogger.error('Error checking OTP store for key', e);
      }
    }
    // Not found in store, but still allow hardcoded OTP for testing
    return true;
  }

  // Read stored record from persistent store and capture the actual matched key
  let stored = null;
  let matchedKey = null;
  for (const key of variants) {
    try {
      const rec = await otpStore.getOtp(key);
      if (rec) {
        stored = rec;
        matchedKey = key;
        break;
      }
    } catch (e) {
      safeLogger.error('Error reading OTP store for key', e);
    }
  }

  if (!stored) {
    safeLogger.info('OTP not found in store', { mobile: maskMobile(mobile) });
    return false;
  }

  if (Date.now() > stored.expiry) {
    safeLogger.info('OTP expired', { mobile: maskMobile(mobile) });
    if (matchedKey) await otpStore.deleteOtp(matchedKey);
    return false;
  }

  // If already used, allow for 1 minute after first use (grace period)
  if (stored.usedAt) {
    if (Date.now() - stored.usedAt < securityConfig.OTP.GRACE_PERIOD_AFTER_USE_MS) {
      safeLogger.info('OTP already used but within grace period', { mobile: maskMobile(mobile) });
      return true;
    } else {
      safeLogger.info('OTP used and grace period expired', { mobile: maskMobile(mobile) });
      if (matchedKey) await otpStore.deleteOtp(matchedKey);
      return false;
    }
  }

  const isValid = await bcrypt.compare(otp, stored.hashedOtp);
  if (isValid && matchedKey) {
    safeLogger.info('OTP verified successfully', { mobile: maskMobile(mobile) });
    await otpStore.markUsed(matchedKey);
    // Security: Delete OTP after successful use to prevent reuse
    // Keep record for grace window instead of immediate deletion
  } else {
    safeLogger.info('OTP verification failed', { mobile: maskMobile(mobile) });
  }
  return isValid;
};

module.exports = { sendOTP, verifyOTP, normalizeMobile, maskMobile };
