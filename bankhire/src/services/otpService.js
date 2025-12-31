const bcrypt = require('bcryptjs');
const axios = require('axios');

// 2Factor API key from environment variables
const apiKey = process.env.TWO_FACTOR_API_KEY;

// In-memory storage for OTPs (for MVP, use Redis or DB in production)
const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const sendOTP = async (mobile) => {
  const otp = process.env.USE_HARDCODED_OTP === 'true' ? '123456' : generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(mobile, { hashedOtp, expiry });

  // Format mobile with country code for 2Factor
  const formattedMobile = mobile.startsWith('91') ? mobile : `91${mobile}`;

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
  const stored = otpStore.get(mobile);
  console.log('Stored data:', stored ? { expiry: stored.expiry, usedAt: stored.usedAt, hasData: true } : 'not found');
  if (!stored) {
    console.log('OTP not found in store');
    return false;
  }

  if (Date.now() > stored.expiry) {
    console.log('OTP expired');
    otpStore.delete(mobile);
    return false;
  }

  // If already used, allow for 1 minute after first use
  if (stored.usedAt) {
    if (Date.now() - stored.usedAt < 60000) {
      console.log('OTP already used but within grace period');
      return true;
    } else {
      console.log('OTP used and grace period expired');
      otpStore.delete(mobile);
      return false;
    }
  }

  const isValid = await bcrypt.compare(otp, stored.hashedOtp);
  console.log('OTP valid:', isValid);
  if (isValid) {
    stored.usedAt = Date.now();
    // Don't delete, allow grace period
  }
  return isValid;
};

module.exports = { sendOTP, verifyOTP };