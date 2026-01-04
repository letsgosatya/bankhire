/**
 * ENHANCED OTP STORE
 * Secure OTP storage with attempt tracking and request limiting
 * 
 * Security: Tracks verification attempts, enforces request limits
 */

const fs = require('fs');
const path = require('path');
const securityConfig = require('../config/security');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'otp_store.json');
const RATE_FILE = path.join(DATA_DIR, 'otp_rate_limits.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}), 'utf8');
  if (!fs.existsSync(RATE_FILE)) fs.writeFileSync(RATE_FILE, JSON.stringify({}), 'utf8');
}

function readStore() {
  try {
    ensureDataDir();
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function writeStore(store) {
  try {
    ensureDataDir();
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write OTP store', e);
    return false;
  }
}

function readRateStore() {
  try {
    ensureDataDir();
    const raw = fs.readFileSync(RATE_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function writeRateStore(store) {
  try {
    ensureDataDir();
    fs.writeFileSync(RATE_FILE, JSON.stringify(store, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write rate store', e);
    return false;
  }
}

/**
 * Check if mobile can request new OTP (rate limiting)
 * Security: Max 5 OTP requests per hour per mobile
 */
async function canRequestOtp(mobile) {
  const store = readRateStore();
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  // Clean old entries and get recent requests
  const requests = (store[mobile] || []).filter(t => t > hourAgo);
  store[mobile] = requests;
  writeRateStore(store);
  
  return requests.length < securityConfig.OTP.MAX_REQUESTS_PER_HOUR;
}

/**
 * Record OTP request for rate limiting
 */
async function recordOtpRequest(mobile) {
  const store = readRateStore();
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  // Clean old entries and add new request
  const requests = (store[mobile] || []).filter(t => t > hourAgo);
  requests.push(now);
  store[mobile] = requests;
  writeRateStore(store);
}

/**
 * Get remaining OTP requests for mobile
 */
async function getRemainingOtpRequests(mobile) {
  const store = readRateStore();
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  const requests = (store[mobile] || []).filter(t => t > hourAgo);
  return Math.max(0, securityConfig.OTP.MAX_REQUESTS_PER_HOUR - requests.length);
}

async function setOtp(mobile, hashedOtp, expiry) {
  const store = readStore();
  store[mobile] = { 
    hashedOtp, 
    expiry, 
    usedAt: store[mobile]?.usedAt || null,
    attempts: 0, // Security: Track verification attempts
    createdAt: Date.now(),
  };
  writeStore(store);
}

async function getOtp(mobile) {
  const store = readStore();
  return store[mobile] || null;
}

async function deleteOtp(mobile) {
  const store = readStore();
  if (store[mobile]) {
    delete store[mobile];
    writeStore(store);
  }
}

async function markUsed(mobile) {
  const store = readStore();
  if (store[mobile]) {
    store[mobile].usedAt = Date.now();
    writeStore(store);
  }
}

/**
 * Increment verification attempts
 * Security: Returns false if max attempts exceeded
 */
async function incrementAttempts(mobile) {
  const store = readStore();
  if (!store[mobile]) return { allowed: false, remaining: 0 };
  
  store[mobile].attempts = (store[mobile].attempts || 0) + 1;
  const attempts = store[mobile].attempts;
  writeStore(store);
  
  const maxAttempts = securityConfig.OTP.MAX_ATTEMPTS_PER_OTP;
  const remaining = Math.max(0, maxAttempts - attempts);
  
  // Security: If max attempts reached, delete the OTP
  if (attempts >= maxAttempts) {
    await deleteOtp(mobile);
    return { allowed: false, remaining: 0, locked: true };
  }
  
  return { allowed: true, remaining };
}

/**
 * Get current attempt count
 */
async function getAttemptCount(mobile) {
  const store = readStore();
  if (!store[mobile]) return 0;
  return store[mobile].attempts || 0;
}

/**
 * Clear rate limits for a mobile number (for testing)
 * Security: This should only be used in test environments
 */
async function clearRateLimits(mobile) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearRateLimits can only be used in test environment');
  }
  const rateStore = readRateStore();
  delete rateStore[mobile];
  writeRateStore(rateStore);
  
  const otpStoreData = readStore();
  if (otpStoreData[mobile]) {
    otpStoreData[mobile].attempts = 0;
  }
  writeStore(otpStoreData);
}

/**
 * Clear all rate limits (for testing)
 */
async function clearAllRateLimits() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearAllRateLimits can only be used in test environment');
  }
  writeRateStore({});
}

module.exports = { 
  setOtp, 
  getOtp, 
  deleteOtp, 
  markUsed,
  // New security functions
  canRequestOtp,
  recordOtpRequest,
  getRemainingOtpRequests,
  incrementAttempts,
  getAttemptCount,
  // Test helpers
  clearRateLimits,
  clearAllRateLimits,
};
