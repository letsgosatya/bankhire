/**
 * REFERRAL ROUTES
 * Enhanced with security: role enforcement, input validation, fraud detection, audit logging
 * 
 * Security: Candidates cannot access referral APIs, rate limiting applied
 */

const express = require('express');
const { createReferral, getMyReferrals, markReferralJoined, getMyEarnings, withdrawReferral, rejectReferral, getReferralById } = require('../controllers/referralController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Security middleware
const { authorize } = require('../middlewares/authorizeMiddleware');
const { validateReferralCreate, validateIdParam } = require('../middlewares/validationMiddleware');
const { secureResumeUpload, validateUploadedFile, handleUploadError } = require('../middlewares/fileUploadMiddleware');
const securityConfig = require('../config/security');

const router = express.Router();

// ======================
// EMPLOYEE-ONLY ROUTES
// ======================

// Create referral - EMPLOYEE only, with secure file upload and fraud tracking
router.post('/create', 
  authMiddleware, 
  authorize([securityConfig.ROLES.EMPLOYEE]),   // Security: Only employees can refer
  secureResumeUpload.single('resume'),           // Security: Secure file handling
  handleUploadError,
  validateUploadedFile,                           // Security: Validate file signature
  validateReferralCreate,                         // Security: Input validation
  createReferral
);

// Get my referrals - EMPLOYEE only
router.get('/my-referrals', 
  authMiddleware, 
  authorize([securityConfig.ROLES.EMPLOYEE]),   // Security: Role enforcement
  getMyReferrals
);

// Get my earnings - EMPLOYEE only
router.get('/my-earnings', 
  authMiddleware, 
  authorize([securityConfig.ROLES.EMPLOYEE]),   // Security: Role enforcement
  getMyEarnings
);

// Get referral by id - EMPLOYEE can view their own referral
router.get('/:id', 
  authMiddleware, 
  authorize([securityConfig.ROLES.EMPLOYEE, securityConfig.ROLES.ADMIN]),
  validateIdParam,                               // Security: Validate ID parameter
  getReferralById
);

// Withdraw a referral - EMPLOYEE who created it
router.post('/withdraw', 
  authMiddleware, 
  authorize([securityConfig.ROLES.EMPLOYEE]),
  withdrawReferral
);

// ======================
// ADMIN/MANAGER ROUTES
// ======================

// Mark referral as joined - ADMIN only
router.post('/:id/mark-joined', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN]),      // Security: Admin-only action
  validateIdParam,
  markReferralJoined
);

// Reject a referral - ADMIN/MANAGER
router.post('/reject', 
  authMiddleware, 
  authorize([securityConfig.ROLES.ADMIN, securityConfig.ROLES.MANAGER]),
  rejectReferral
);

module.exports = router;
