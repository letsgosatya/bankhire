/**
 * SAFE LOGGING UTILITY
 * Provides logging functions that automatically mask sensitive data
 * 
 * Security: Prevents accidental exposure of OTPs, tokens, mobile numbers
 */

const securityConfig = require('../config/security');

/**
 * List of sensitive field names to mask
 */
const SENSITIVE_FIELDS = securityConfig.LOGGING.SENSITIVE_FIELDS;

/**
 * Mask a mobile number - show only last 4 digits
 */
const maskMobile = (mobile) => {
  if (!mobile) return null;
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length >= 4) {
    return 'XXXXXX' + digits.slice(-4);
  }
  return 'XXXX';
};

/**
 * Mask a token - show only first and last 4 characters
 */
const maskToken = (token) => {
  if (!token || typeof token !== 'string') return '[REDACTED]';
  if (token.length <= 12) return '[REDACTED]';
  return token.substring(0, 4) + '...' + token.substring(token.length - 4);
};

/**
 * Mask an email - show only first 2 chars and domain
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  const parts = email.split('@');
  if (parts.length !== 2) return '[REDACTED]';
  const localPart = parts[0];
  const masked = localPart.substring(0, 2) + '***';
  return masked + '@' + parts[1];
};

/**
 * Check if a field name is sensitive
 */
const isSensitiveField = (fieldName) => {
  if (!fieldName) return false;
  const lower = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sensitive => lower.includes(sensitive.toLowerCase()));
};

/**
 * Deep clone and mask sensitive fields in an object
 */
const maskSensitiveData = (obj, depth = 0) => {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH]';
  
  if (obj === null || obj === undefined) return obj;
  
  // Handle primitive types
  if (typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item, depth + 1));
  }
  
  // Handle objects
  const masked = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    
    // Check if this is a sensitive field
    if (isSensitiveField(key)) {
      if (key.toLowerCase().includes('mobile') || key.toLowerCase().includes('phone')) {
        masked[key] = maskMobile(value);
      } else if (key.toLowerCase().includes('token') || key.toLowerCase().includes('authorization')) {
        masked[key] = maskToken(value);
      } else if (key.toLowerCase().includes('email')) {
        masked[key] = maskEmail(value);
      } else {
        masked[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value, depth + 1);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
};

/**
 * Create a safe log message with request context
 */
const createLogContext = (req) => {
  return {
    requestId: req?.requestId || 'N/A',
    method: req?.method || 'N/A',
    path: req?.path || 'N/A',
    ip: req?.ip || 'N/A',
    userId: req?.user?.id || 'anonymous',
    userRole: req?.user?.role || 'N/A',
    timestamp: new Date().toISOString(),
  };
};

/**
 * Safe info log
 */
const info = (message, data = {}, req = null) => {
  const context = req ? createLogContext(req) : {};
  const safeData = maskSensitiveData(data);
  console.log(JSON.stringify({
    level: 'INFO',
    message,
    ...context,
    data: safeData,
  }));
};

/**
 * Safe warning log
 */
const warn = (message, data = {}, req = null) => {
  const context = req ? createLogContext(req) : {};
  const safeData = maskSensitiveData(data);
  console.warn(JSON.stringify({
    level: 'WARN',
    message,
    ...context,
    data: safeData,
  }));
};

/**
 * Safe error log
 */
const error = (message, err = null, req = null) => {
  const context = req ? createLogContext(req) : {};
  const errorData = err ? {
    name: err.name,
    message: err.message,
    // Don't log full stack in production for security
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  } : {};
  
  console.error(JSON.stringify({
    level: 'ERROR',
    message,
    ...context,
    error: errorData,
  }));
};

/**
 * Security event log - for auth failures, rate limits, etc.
 */
const security = (event, data = {}, req = null) => {
  const context = req ? createLogContext(req) : {};
  const safeData = maskSensitiveData(data);
  console.log(JSON.stringify({
    level: 'SECURITY',
    event,
    ...context,
    data: safeData,
  }));
};

/**
 * Audit log - for important business actions
 */
const audit = (action, data = {}, req = null) => {
  const context = req ? createLogContext(req) : {};
  const safeData = maskSensitiveData(data);
  console.log(JSON.stringify({
    level: 'AUDIT',
    action,
    ...context,
    data: safeData,
  }));
};

module.exports = {
  maskMobile,
  maskToken,
  maskEmail,
  maskSensitiveData,
  info,
  warn,
  error,
  security,
  audit,
};
