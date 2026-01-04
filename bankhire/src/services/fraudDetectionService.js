/**
 * FRAUD DETECTION SERVICE
 * Soft fraud flags for suspicious activity
 * 
 * Security: Flags suspicious behavior WITHOUT auto-blocking users
 * All flags require admin review
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const securityConfig = require('../config/security');
const safeLogger = require('../utils/safeLogger');
const auditService = require('./auditService');

// Fraud flags storage
const FRAUD_DIR = path.join(__dirname, '..', '..', 'data', 'fraud');
const FLAGS_FILE = path.join(FRAUD_DIR, 'fraud_flags.json');

// In-memory tracking for real-time detection
const activityTracker = {
  referralsPerDay: new Map(),  // userId -> { date: count }
  ipRegistrations: new Map(),   // ip -> [userId, ...]
  resumeHashes: new Map(),      // hash -> [userId, ...]
};

/**
 * Ensure fraud data directory exists
 */
const ensureFraudDir = () => {
  if (!fs.existsSync(FRAUD_DIR)) {
    fs.mkdirSync(FRAUD_DIR, { recursive: true });
  }
};

/**
 * Fraud flag types
 */
const FLAG_TYPES = {
  EXCESSIVE_REFERRALS: 'EXCESSIVE_REFERRALS',
  DUPLICATE_RESUME: 'DUPLICATE_RESUME',
  MULTIPLE_ACCOUNTS_SAME_IP: 'MULTIPLE_ACCOUNTS_SAME_IP',
  RAPID_SUBMISSIONS: 'RAPID_SUBMISSIONS',
  SUSPICIOUS_PATTERN: 'SUSPICIOUS_PATTERN',
};

/**
 * Read fraud flags from file
 */
const readFlags = () => {
  ensureFraudDir();
  try {
    if (fs.existsSync(FLAGS_FILE)) {
      const content = fs.readFileSync(FLAGS_FILE, 'utf8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    console.error('Failed to read fraud flags:', err.message);
  }
  return [];
};

/**
 * Write fraud flags to file
 */
const writeFlags = (flags) => {
  ensureFraudDir();
  try {
    fs.writeFileSync(FLAGS_FILE, JSON.stringify(flags, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write fraud flags:', err.message);
    return false;
  }
};

/**
 * Create a fraud flag (for admin review only - NO auto-blocking)
 * 
 * @param {string} flagType - Type of fraud flag
 * @param {number} userId - User ID being flagged
 * @param {Object} details - Additional details
 * @param {Object} req - Express request (optional)
 * @returns {string} Flag ID
 */
const createFlag = (flagType, userId, details = {}, req = null) => {
  const flag = {
    id: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: flagType,
    userId,
    createdAt: new Date().toISOString(),
    status: 'PENDING_REVIEW', // PENDING_REVIEW, REVIEWED, DISMISSED, CONFIRMED
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    details: safeLogger.maskSensitiveData(details),
    ip: req?.ip || null,
    requestId: req?.requestId || null,
  };

  const flags = readFlags();
  flags.push(flag);
  writeFlags(flags);

  // Also create audit record
  auditService.logFraudFlag(flagType, userId, details, req);

  safeLogger.security('FRAUD_FLAG_CREATED', {
    flagId: flag.id,
    flagType,
    userId,
  }, req);

  return flag.id;
};

/**
 * Track referral submission and check for excessive activity
 * Returns true if should be flagged
 */
const trackReferralSubmission = (userId, req = null) => {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}_${today}`;

  // Get current count
  const current = activityTracker.referralsPerDay.get(key) || 0;
  const newCount = current + 1;
  activityTracker.referralsPerDay.set(key, newCount);

  // Check if exceeds threshold for flagging
  if (newCount > securityConfig.FRAUD_FLAGS.MAX_REFERRALS_PER_DAY_FLAG) {
    createFlag(FLAG_TYPES.EXCESSIVE_REFERRALS, userId, {
      count: newCount,
      date: today,
      threshold: securityConfig.FRAUD_FLAGS.MAX_REFERRALS_PER_DAY_FLAG,
    }, req);
    return true;
  }

  return false;
};

/**
 * Check for duplicate resume upload
 */
const checkDuplicateResume = async (resumeHash, userId, req = null) => {
  if (!securityConfig.FRAUD_FLAGS.SAME_RESUME_HASH_FLAG) return false;

  const existingUsers = activityTracker.resumeHashes.get(resumeHash) || [];

  // If this hash was seen before by different users, flag it
  if (existingUsers.length > 0 && !existingUsers.includes(userId)) {
    createFlag(FLAG_TYPES.DUPLICATE_RESUME, userId, {
      resumeHash: resumeHash.substring(0, 16) + '...',
      previousUploaders: existingUsers.length,
    }, req);

    // Also flag all previous users
    for (const prevUserId of existingUsers) {
      createFlag(FLAG_TYPES.DUPLICATE_RESUME, prevUserId, {
        resumeHash: resumeHash.substring(0, 16) + '...',
        duplicateUserId: userId,
      });
    }

    existingUsers.push(userId);
    activityTracker.resumeHashes.set(resumeHash, existingUsers);
    return true;
  }

  // Add to tracking
  if (!existingUsers.includes(userId)) {
    existingUsers.push(userId);
    activityTracker.resumeHashes.set(resumeHash, existingUsers);
  }

  return false;
};

/**
 * Track IP for account creation
 */
const trackIpRegistration = (ip, userId, req = null) => {
  if (!ip) return false;

  const existingUsers = activityTracker.ipRegistrations.get(ip) || [];

  if (!existingUsers.includes(userId)) {
    existingUsers.push(userId);
    activityTracker.ipRegistrations.set(ip, existingUsers);
  }

  // Check threshold
  if (existingUsers.length > securityConfig.FRAUD_FLAGS.MAX_SAME_IP_REGISTRATIONS) {
    createFlag(FLAG_TYPES.MULTIPLE_ACCOUNTS_SAME_IP, userId, {
      ip: ip.substring(0, ip.lastIndexOf('.')) + '.XXX', // Partially mask IP
      accountCount: existingUsers.length,
      threshold: securityConfig.FRAUD_FLAGS.MAX_SAME_IP_REGISTRATIONS,
    }, req);
    return true;
  }

  return false;
};

/**
 * Get pending fraud flags for admin review
 */
const getPendingFlags = () => {
  const flags = readFlags();
  return flags.filter(f => f.status === 'PENDING_REVIEW');
};

/**
 * Get all flags for a specific user
 */
const getFlagsForUser = (userId) => {
  const flags = readFlags();
  return flags.filter(f => f.userId === userId);
};

/**
 * Review a fraud flag (admin action)
 */
const reviewFlag = (flagId, adminUserId, status, notes = null) => {
  const flags = readFlags();
  const flag = flags.find(f => f.id === flagId);

  if (!flag) return null;

  flag.status = status; // REVIEWED, DISMISSED, CONFIRMED
  flag.reviewedBy = adminUserId;
  flag.reviewedAt = new Date().toISOString();
  flag.reviewNotes = notes;

  writeFlags(flags);

  // Create audit record for the review
  auditService.logAdminAction('FRAUD_FLAG_REVIEWED', 'fraud_flag', flagId, {
    status,
    notes,
  });

  return flag;
};

/**
 * Get fraud risk score for a user (0-100)
 * Higher score = more suspicious
 */
const getUserRiskScore = (userId) => {
  const flags = getFlagsForUser(userId);
  let score = 0;

  for (const flag of flags) {
    if (flag.status === 'CONFIRMED') {
      // Confirmed flags add more weight
      switch (flag.type) {
        case FLAG_TYPES.DUPLICATE_RESUME: score += 30; break;
        case FLAG_TYPES.EXCESSIVE_REFERRALS: score += 20; break;
        case FLAG_TYPES.MULTIPLE_ACCOUNTS_SAME_IP: score += 25; break;
        default: score += 15;
      }
    } else if (flag.status === 'PENDING_REVIEW') {
      // Pending flags add less weight
      score += 10;
    }
    // DISMISSED flags don't add to score
  }

  return Math.min(score, 100);
};

module.exports = {
  FLAG_TYPES,
  createFlag,
  trackReferralSubmission,
  checkDuplicateResume,
  trackIpRegistration,
  getPendingFlags,
  getFlagsForUser,
  reviewFlag,
  getUserRiskScore,
};
