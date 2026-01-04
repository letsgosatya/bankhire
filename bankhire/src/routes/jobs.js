/**
 * JOBS ROUTES
 * Enhanced with security: role enforcement, input validation
 * 
 * Security: Employees cannot apply for jobs, managers create jobs
 */

const express = require('express');
const { createJob, getJobs, applyForJob, getMyApplications, updateApplicationStatus, getApplication } = require('../controllers/jobController');
const authMiddleware = require('../middlewares/authMiddleware');

// Security middleware
const { authorize } = require('../middlewares/authorizeMiddleware');
const { validateJobCreate, validateIdParam } = require('../middlewares/validationMiddleware');
const securityConfig = require('../config/security');

const router = express.Router();

// ======================
// MANAGER-ONLY ROUTES
// ======================

// Create job - MANAGER only
router.post('/', 
  authMiddleware, 
  authorize([securityConfig.ROLES.MANAGER, securityConfig.ROLES.ADMIN]),  // Security: Role enforcement
  validateJobCreate,                             // Security: Input validation
  createJob
);

// ======================
// PUBLIC ROUTES
// ======================

// Get all jobs - public (anyone can browse jobs)
router.get('/', getJobs);

// ======================
// AUTHENTICATED ROUTES
// ======================

// ======================
// CANDIDATE-ONLY ROUTES
// Security: Employees cannot apply for jobs (they refer candidates)
// ======================

// Apply for job - CANDIDATE only
router.post('/:id/apply', 
  authMiddleware, 
  authorize([securityConfig.ROLES.CANDIDATE]),  // Security: Only candidates can apply
  validateIdParam,
  applyForJob
);

// Get my applications - CANDIDATE only
router.get('/my', 
  authMiddleware, 
  authorize([securityConfig.ROLES.CANDIDATE]),  // Security: Role enforcement
  getMyApplications
);

// Get single application - CANDIDATE only
router.get('/application/:id', 
  authMiddleware, 
  authorize([securityConfig.ROLES.CANDIDATE]),
  validateIdParam,
  getApplication
);

// Update application status - CANDIDATE only
router.put('/application/:id/status', 
  authMiddleware, 
  authorize([securityConfig.ROLES.CANDIDATE]),
  validateIdParam,
  updateApplicationStatus
);

module.exports = router;
