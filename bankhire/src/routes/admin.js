/**
 * ADMIN ROUTES
 * Enhanced with security: strict admin-only access, audit logging, rate limiting
 * 
 * Security: All admin actions require ADMIN role and are logged
 */

const express = require('express');
const { getUsers, getJobs, getApplications, markApplicationJoined } = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Security middleware
const { authorize } = require('../middlewares/authorizeMiddleware');
const { adminRateLimiter } = require('../middlewares/rateLimitMiddleware');
const { validateIdParam } = require('../middlewares/validationMiddleware');
const securityConfig = require('../config/security');
const auditService = require('../services/auditService');

const router = express.Router();

// ======================
// SECURITY: Admin rate limiting applied to all admin routes
// ======================
router.use(adminRateLimiter);

// ======================
// ADMIN-ONLY ROUTES
// All routes require ADMIN role
// ======================

// Get all users
router.get('/users', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),
  (req, res, next) => {
    // Security: Log admin action
    auditService.logAdminAction('VIEW_USERS', 'users', null, {}, req);
    next();
  },
  getUsers
);

// Get all jobs
router.get('/jobs', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),
  getJobs
);

// Get all applications
router.get('/applications', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),
  getApplications
);

// ======================
// REFERRAL MANAGEMENT
// ======================

// Get referrals
router.get('/referrals', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),
  require('../controllers/adminController').getReferrals
);

// Get expired referrals
router.get('/referrals/expired', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),
  require('../controllers/adminController').getExpiredReferrals
);

// Get referral details
router.get('/referral/:id', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),
  validateIdParam,
  require('../controllers/adminController').getReferralDetails
);

// Manual expire referral
router.post('/referral/:id/expire', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),
  validateIdParam,
  (req, res, next) => {
    // Security: Log admin action
    auditService.logAdminAction('EXPIRE_REFERRAL', 'referral', req.params.id, {}, req);
    next();
  },
  require('../controllers/adminController').manualExpireReferral
);

// Manual refund referral
router.post('/referral/:id/refund', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),
  validateIdParam,
  (req, res, next) => {
    // Security: Log admin action
    auditService.logAdminAction('REFUND_REFERRAL', 'referral', req.params.id, {}, req);
    next();
  },
  require('../controllers/adminController').manualRefundReferral
);

// Mark application as joined
router.post('/application/:id/joined', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),
  validateIdParam,
  (req, res, next) => {
    // Security: Log admin action
    auditService.logAdminAction('MARK_JOINED', 'application', req.params.id, {}, req);
    next();
  },
  markApplicationJoined
);

module.exports = router;
