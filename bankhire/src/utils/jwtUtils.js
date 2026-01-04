/**
 * ENHANCED JWT UTILITIES
 * Secure token generation with refresh token rotation
 * 
 * Security: Short-lived access tokens, secure refresh token handling
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const securityConfig = require('../config/security');
const safeLogger = require('./safeLogger');

// Refresh token storage (in production, use Redis or database)
const TOKEN_STORE_DIR = path.join(__dirname, '..', '..', 'data');
const TOKEN_STORE_FILE = path.join(TOKEN_STORE_DIR, 'refresh_tokens.json');

/**
 * Ensure token store directory exists
 */
const ensureTokenStoreDir = () => {
  if (!fs.existsSync(TOKEN_STORE_DIR)) {
    fs.mkdirSync(TOKEN_STORE_DIR, { recursive: true });
  }
};

/**
 * Read refresh tokens from store
 */
const readTokenStore = () => {
  ensureTokenStoreDir();
  try {
    if (fs.existsSync(TOKEN_STORE_FILE)) {
      const content = fs.readFileSync(TOKEN_STORE_FILE, 'utf8');
      return JSON.parse(content || '{}');
    }
  } catch (err) {
    console.error('Failed to read token store:', err.message);
  }
  return {};
};

/**
 * Write refresh tokens to store
 */
const writeTokenStore = (store) => {
  ensureTokenStoreDir();
  try {
    fs.writeFileSync(TOKEN_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write token store:', err.message);
    return false;
  }
};

/**
 * Generate a secure random token
 */
const generateSecureToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Hash a refresh token for storage
 */
const hashRefreshToken = async (token) => {
  return bcrypt.hash(token, 10);
};

/**
 * Verify a refresh token against stored hash
 */
const verifyRefreshTokenHash = async (token, hash) => {
  return bcrypt.compare(token, hash);
};

/**
 * Generate access token (short-lived)
 * 
 * @param {Object} user - User object with id, mobile, role
 * @returns {string} JWT access token
 */
const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    role: user.role,
    type: 'access',
    // Don't include mobile in access token payload for security
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: securityConfig.JWT.ACCESS_TOKEN_EXPIRY,
    issuer: securityConfig.JWT.ISSUER,
    audience: securityConfig.JWT.AUDIENCE,
  });
};

/**
 * Generate refresh token (longer-lived, stored hashed)
 * 
 * @param {Object} user - User object
 * @returns {Object} { refreshToken, expiresAt }
 */
const generateRefreshToken = async (user) => {
  const refreshToken = generateSecureToken();
  const expiresAt = Date.now() + (securityConfig.JWT.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Hash the refresh token before storing
  const hashedToken = await hashRefreshToken(refreshToken);

  // Store the hashed token
  const store = readTokenStore();
  if (!store[user.id]) {
    store[user.id] = [];
  }

  // Add new token
  store[user.id].push({
    hashedToken,
    expiresAt,
    createdAt: Date.now(),
    used: false,
  });

  // Clean up expired tokens for this user
  store[user.id] = store[user.id].filter(t => t.expiresAt > Date.now());

  // Limit to 5 active refresh tokens per user (for multiple devices)
  if (store[user.id].length > 5) {
    store[user.id] = store[user.id].slice(-5);
  }

  writeTokenStore(store);

  return {
    refreshToken,
    expiresAt: new Date(expiresAt).toISOString(),
  };
};

/**
 * Generate both access and refresh tokens
 * Original function maintained for backward compatibility
 */
const generateToken = (user) => {
  // For backward compatibility, return access token
  // New code should use generateTokenPair
  return generateAccessToken(user);
};

/**
 * Generate token pair (access + refresh)
 */
const generateTokenPair = async (user) => {
  const accessToken = generateAccessToken(user);
  const { refreshToken, expiresAt } = await generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    expiresIn: securityConfig.JWT.ACCESS_TOKEN_EXPIRY,
    refreshExpiresAt: expiresAt,
  };
};

/**
 * Rotate refresh token (use once, get new one)
 * Security: Detects token reuse attacks
 * 
 * @param {number} userId - User ID
 * @param {string} oldRefreshToken - The refresh token being used
 * @returns {Object|null} New token pair or null if invalid
 */
const rotateRefreshToken = async (userId, oldRefreshToken, user) => {
  const store = readTokenStore();
  const userTokens = store[userId] || [];

  // Find the matching token
  let matchedTokenIndex = -1;
  for (let i = 0; i < userTokens.length; i++) {
    const tokenEntry = userTokens[i];
    if (tokenEntry.expiresAt < Date.now()) continue; // Skip expired

    const isMatch = await verifyRefreshTokenHash(oldRefreshToken, tokenEntry.hashedToken);
    if (isMatch) {
      matchedTokenIndex = i;
      break;
    }
  }

  if (matchedTokenIndex === -1) {
    // Token not found - could be expired or invalid
    safeLogger.security('INVALID_REFRESH_TOKEN', { userId });
    return null;
  }

  const matchedToken = userTokens[matchedTokenIndex];

  // Security: Check if token was already used (reuse attack detection)
  if (matchedToken.used && securityConfig.SESSION.TOKEN_REUSE_DETECTION) {
    // Potential token theft! Revoke all tokens for this user
    safeLogger.security('REFRESH_TOKEN_REUSE_DETECTED', { 
      userId,
      action: 'REVOKING_ALL_TOKENS',
    });
    
    // Revoke all tokens for this user
    store[userId] = [];
    writeTokenStore(store);
    
    return null;
  }

  // Mark the old token as used
  userTokens[matchedTokenIndex].used = true;
  store[userId] = userTokens;
  writeTokenStore(store);

  // Generate new token pair
  return generateTokenPair(user);
};

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
const revokeAllRefreshTokens = (userId) => {
  const store = readTokenStore();
  delete store[userId];
  writeTokenStore(store);
  safeLogger.audit('ALL_TOKENS_REVOKED', { userId });
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: securityConfig.JWT.ISSUER,
      audience: securityConfig.JWT.AUDIENCE,
    });
  } catch (err) {
    return null;
  }
};

/**
 * Invalidate refresh token on logout
 */
const invalidateRefreshToken = async (userId, refreshToken) => {
  const store = readTokenStore();
  const userTokens = store[userId] || [];

  // Find and remove the matching token
  for (let i = 0; i < userTokens.length; i++) {
    const isMatch = await verifyRefreshTokenHash(refreshToken, userTokens[i].hashedToken);
    if (isMatch) {
      userTokens.splice(i, 1);
      store[userId] = userTokens;
      writeTokenStore(store);
      return true;
    }
  }

  return false;
};

module.exports = {
  generateToken,           // Backward compatible
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  rotateRefreshToken,
  revokeAllRefreshTokens,
  verifyAccessToken,
  invalidateRefreshToken,
};
