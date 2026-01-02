const bcrypt = require('bcryptjs');
const axios = require('axios');

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

const sendOTP = async (mobile) => {
  const otp = process.env.USE_HARDCODED_OTP === 'true' ? '123456' : generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Canonicalize mobile for store and later lookup
  const canon = normalizeMobile(mobile);
  if (!canon) throw new Error('Invalid mobile number');

  try{
    await otpStore.setOtp(canon, hashedOtp, expiry);
  }catch(e){
    console.error('Failed to persist OTP', e);
  }

  // Format mobile with country code for 2Factor (always use 91+canon)
  const formattedMobile = `91${canon}`;

  if (process.env.USE_HARDCODED_OTP === 'true') {
    console.log(`HARDCODED OTP mode: OTP for ${mobile}: ${otp} (use this for testing)`);
  } else {
    // Send OTP via SMS using 2Factor (skip if no API key)
    if (apiKey) {
      try {
        console.log(`Sending OTP to ${formattedMobile}: ${otp}`);
        const response = await axios.get(`https://2factor.in/API/V1/${apiKey}/SMS/${formattedMobile}/${otp}`);
        console.log('2Factor response:', response.data);
        if (response.data.Status !== 'Success') {
          console.log('SMS failed, trying voice call');
          // Try voice call as fallback
          const voiceUrl = `https://2factor.in/API/V1/${apiKey}/VOICE/${formattedMobile}/${otp}`;
          const voiceResponse = await axios.get(voiceUrl);
          console.log('Voice call response:', voiceResponse.data);
          console.log(`OTP sent to ${formattedMobile}: ${otp} (via voice)`);
        } else {
          console.log(`OTP sent to ${formattedMobile}: ${otp} (via SMS)`);
        }
      } catch (error) {
        console.error('Error sending SMS:', error.message);
        console.log('Trying voice call as fallback');
        try {
          // Try voice call as fallback
          const voiceUrl = `https://2factor.in/API/V1/${apiKey}/VOICE/${formattedMobile}/${otp}`;
          const voiceResponse = await axios.get(voiceUrl);
          console.log('Voice call response:', voiceResponse.data);
          console.log(`OTP sent to ${formattedMobile}: ${otp} (via voice fallback)`);
        } catch (voiceError) {
          console.error('Voice call also failed:', voiceError.message);
          console.log('Both SMS and voice failed, but proceeding anyway');
          // Don't throw, just log and continue
        }
      }
    } else {
      console.log(`No API key set. OTP for ${mobile}: ${otp} (use this for testing)`);
    }
  }

  return true;
};

const verifyOTP = async (mobile, otp) => {
  console.log(`Verifying OTP for mobile: ${mobile}, OTP: ${otp}`);

  // In hardcoded OTP testing mode, accept the known OTP value regardless of store state
  // Canonicalize incoming mobile and prepare key variants
  const canon = normalizeMobile(mobile);
  if (!canon) {
    console.log('Invalid mobile format');
    return false;
  }
  const variants = [canon, '91' + canon];

  // If hardcoded OTP testing mode, accept the known OTP and mark the matched record used
  if (process.env.USE_HARDCODED_OTP === 'true' && otp === '123456') {
    console.log('Hardcoded OTP accepted for testing');
    for (const key of variants) {
      try {
        const rec = await otpStore.getOtp(key);
        if (rec) {
          console.log(`Found OTP record for key ${key}, marking used`);
          await otpStore.markUsed(key);
          return true;
        }
      } catch (e) {
        console.error('Error checking OTP store for key', key, e);
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
      console.error('Error reading OTP store for key', key, e);
    }
  }

  console.log('Stored data:', stored ? { expiry: stored.expiry, usedAt: stored.usedAt, hasData: true, key: matchedKey } : 'not found');
  if (!stored) {
    console.log('OTP not found in store');
    return false;
  }

  if (Date.now() > stored.expiry) {
    console.log('OTP expired');
    if (matchedKey) await otpStore.deleteOtp(matchedKey);
    return false;
  }

  // If already used, allow for 1 minute after first use
  if (stored.usedAt) {
    if (Date.now() - stored.usedAt < 60000) {
      console.log('OTP already used but within grace period');
      return true;
    } else {
      console.log('OTP used and grace period expired');
      if (matchedKey) await otpStore.deleteOtp(matchedKey);
      return false;
    }
  }

  const isValid = await bcrypt.compare(otp, stored.hashedOtp);
  console.log('OTP valid:', isValid);
  if (isValid && matchedKey) {
    await otpStore.markUsed(matchedKey);
    // Keep record for grace window
  }
  return isValid;
};

module.exports = { sendOTP, verifyOTP };