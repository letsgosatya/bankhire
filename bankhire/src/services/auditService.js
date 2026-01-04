/**
 * AUDIT SERVICE
 * Tracks important security and business events for compliance
 * 
 * Security: Creates audit trail for admin actions, status changes, referral decisions
 */

const fs = require('fs');
const path = require('path');
const safeLogger = require('../utils/safeLogger');

// Audit log directory
const AUDIT_DIR = path.join(__dirname, '..', '..', 'logs', 'audit');

// Ensure audit directory exists
const ensureAuditDir = () => {
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }
};

/**
 * Audit event types
 */
const AUDIT_EVENTS = {
  // Auth events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',

  // Admin events
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_ACTION: 'ADMIN_ACTION',
  ROLE_CHANGE: 'ROLE_CHANGE',
  USER_CREATED: 'USER_CREATED',
  USER_DELETED: 'USER_DELETED',

  // Referral events
  REFERRAL_CREATED: 'REFERRAL_CREATED',
  REFERRAL_STATUS_CHANGE: 'REFERRAL_STATUS_CHANGE',
  REFERRAL_EXPIRED: 'REFERRAL_EXPIRED',
  REFERRAL_WITHDRAWN: 'REFERRAL_WITHDRAWN',
  REFERRAL_REJECTED: 'REFERRAL_REJECTED',

  // Payout events
  PAYOUT_INITIATED: 'PAYOUT_INITIATED',
  PAYOUT_APPROVED: 'PAYOUT_APPROVED',
  PAYOUT_REJECTED: 'PAYOUT_REJECTED',
  PAYOUT_COMPLETED: 'PAYOUT_COMPLETED',

  // Resume events
  RESUME_UPLOADED: 'RESUME_UPLOADED',
  RESUME_DELETED: 'RESUME_DELETED',
  RESUME_ACCESSED: 'RESUME_ACCESSED',

  // Security events
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  FRAUD_FLAG_RAISED: 'FRAUD_FLAG_RAISED',
};

/**
 * Create audit record
 * 
 * @param {string} event - Event type from AUDIT_EVENTS
 * @param {Object} data - Event data (will be sanitized)
 * @param {Object} req - Express request object (optional)
 */
const createAuditRecord = (event, data = {}, req = null) => {
  ensureAuditDir();

  const record = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    event,
    timestamp: new Date().toISOString(),
    requestId: req?.requestId || null,
    userId: req?.user?.id || data.userId || null,
    userRole: req?.user?.role || data.userRole || null,
    ip: req?.ip || data.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
    path: req?.path || null,
    method: req?.method || null,
    data: safeLogger.maskSensitiveData(data),
  };

  // Write to daily audit log file
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(AUDIT_DIR, `audit_${today}.json`);

  try {
    let logs = [];
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      logs = JSON.parse(content || '[]');
    }
    logs.push(record);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }

  // Also log to console for real-time monitoring
  safeLogger.audit(event, data, req);

  return record.id;
};

/**
 * Log admin action
 */
const logAdminAction = (action, targetType, targetId, details = {}, req = null) => {
  return createAuditRecord(AUDIT_EVENTS.ADMIN_ACTION, {
    action,
    targetType,
    targetId,
    ...details,
  }, req);
};

/**
 * Log referral status change
 */
const logReferralStatusChange = (referralId, oldStatus, newStatus, reason = null, req = null) => {
  return createAuditRecord(AUDIT_EVENTS.REFERRAL_STATUS_CHANGE, {
    referralId,
    oldStatus,
    newStatus,
    reason,
  }, req);
};

/**
 * Log payout decision
 */
const logPayoutDecision = (referralId, decision, amount, reason = null, req = null) => {
  const event = decision === 'approved' 
    ? AUDIT_EVENTS.PAYOUT_APPROVED 
    : AUDIT_EVENTS.PAYOUT_REJECTED;
  
  return createAuditRecord(event, {
    referralId,
    decision,
    amount,
    reason,
  }, req);
};

/**
 * Log security event
 */
const logSecurityEvent = (eventType, details = {}, req = null) => {
  return createAuditRecord(eventType, details, req);
};

/**
 * Log fraud flag
 */
const logFraudFlag = (flagType, userId, details = {}, req = null) => {
  return createAuditRecord(AUDIT_EVENTS.FRAUD_FLAG_RAISED, {
    flagType,
    flaggedUserId: userId,
    ...details,
  }, req);
};

/**
 * Get audit logs for a specific date range
 */
const getAuditLogs = (startDate, endDate, filters = {}) => {
  ensureAuditDir();
  
  const logs = [];
  const files = fs.readdirSync(AUDIT_DIR);
  
  for (const file of files) {
    if (!file.startsWith('audit_') || !file.endsWith('.json')) continue;
    
    const dateStr = file.replace('audit_', '').replace('.json', '');
    const fileDate = new Date(dateStr);
    
    if (startDate && fileDate < startDate) continue;
    if (endDate && fileDate > endDate) continue;
    
    try {
      const content = fs.readFileSync(path.join(AUDIT_DIR, file), 'utf8');
      const fileLogs = JSON.parse(content || '[]');
      
      // Apply filters
      for (const log of fileLogs) {
        let include = true;
        
        if (filters.event && log.event !== filters.event) include = false;
        if (filters.userId && log.userId !== filters.userId) include = false;
        if (filters.userRole && log.userRole !== filters.userRole) include = false;
        
        if (include) logs.push(log);
      }
    } catch (err) {
      console.error(`Failed to read audit file ${file}:`, err.message);
    }
  }
  
  return logs;
};

module.exports = {
  AUDIT_EVENTS,
  createAuditRecord,
  logAdminAction,
  logReferralStatusChange,
  logPayoutDecision,
  logSecurityEvent,
  logFraudFlag,
  getAuditLogs,
};
