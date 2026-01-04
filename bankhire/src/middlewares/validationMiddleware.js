/**
 * INPUT VALIDATION MIDDLEWARE
 * Validates and sanitizes all user inputs
 * 
 * Security: Prevents injection attacks, validates data integrity
 */

const { body, param, query, validationResult } = require('express-validator');
const securityConfig = require('../config/security');

/**
 * Handle validation errors - returns 400 with details
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation failure (safe - no sensitive data in field names)
    console.log(`[VALIDATION] Failed - RequestId: ${req.requestId || 'N/A'}, Path: ${req.path}, Errors: ${JSON.stringify(errors.array().map(e => e.param))}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
      requestId: req.requestId,
    });
  }
  next();
};

/**
 * Validation rules for OTP send
 */
const validateOtpSend = [
  body('mobile')
    .exists().withMessage('Mobile number is required')
    .isString().withMessage('Mobile must be a string')
    .trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Mobile must be 10-15 digits')
    .escape(),
  handleValidationErrors,
];

/**
 * Validation rules for OTP verify
 */
const validateOtpVerify = [
  body('mobile')
    .exists().withMessage('Mobile number is required')
    .isString().withMessage('Mobile must be a string')
    .trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Mobile must be 10-15 digits')
    .escape(),
  body('otp')
    .exists().withMessage('OTP is required')
    .isString().withMessage('OTP must be a string')
    .trim()
    .matches(/^[0-9]{6}$/).withMessage('OTP must be exactly 6 digits')
    .escape(),
  handleValidationErrors,
];

/**
 * Validation rules for profile update
 */
const validateProfileUpdate = [
  body('fullName')
    .optional()
    .isString().withMessage('Name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .escape(),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email too long'),
  body('skills')
    .optional()
    .isString().withMessage('Skills must be a string')
    .trim()
    .isLength({ max: 1000 }).withMessage('Skills text too long')
    .escape(),
  body('jobRole')
    .optional()
    .isString().withMessage('Job role must be a string')
    .trim()
    .isLength({ max: 100 }).withMessage('Job role too long')
    .escape(),
  body('location')
    .optional()
    .isString().withMessage('Location must be a string')
    .trim()
    .isLength({ max: 100 }).withMessage('Location too long')
    .escape(),
  handleValidationErrors,
];

/**
 * Validation rules for referral creation
 */
const validateReferralCreate = [
  body('candidateName')
    .exists().withMessage('Candidate name is required')
    .isString().withMessage('Name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .escape(),
  body('candidateMobile')
    .exists().withMessage('Candidate mobile is required')
    .isString().withMessage('Mobile must be a string')
    .trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Mobile must be 10-15 digits')
    .escape(),
  body('candidateEmail')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email too long'),
  body('jobId')
    .exists().withMessage('Job ID is required')
    .isInt({ min: 1 }).withMessage('Job ID must be a positive integer'),
  handleValidationErrors,
];

/**
 * Validation rules for job creation
 */
const validateJobCreate = [
  body('title')
    .exists().withMessage('Job title is required')
    .isString().withMessage('Title must be a string')
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters')
    .escape(),
  body('description')
    .exists().withMessage('Job description is required')
    .isString().withMessage('Description must be a string')
    .trim()
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
  body('location')
    .optional()
    .isString().withMessage('Location must be a string')
    .trim()
    .isLength({ max: 100 }).withMessage('Location too long')
    .escape(),
  body('salary')
    .optional()
    .isString().withMessage('Salary must be a string')
    .trim()
    .isLength({ max: 50 }).withMessage('Salary text too long')
    .escape(),
  body('requirements')
    .optional()
    .isString().withMessage('Requirements must be a string')
    .trim()
    .isLength({ max: 2000 }).withMessage('Requirements too long'),
  handleValidationErrors,
];

/**
 * Validation for ID parameters
 */
const validateIdParam = [
  param('id')
    .exists().withMessage('ID is required')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors,
];

/**
 * Sanitize object - remove any fields that shouldn't be in input
 */
const sanitizeInput = (allowedFields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const sanitized = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitized[field] = req.body[field];
        }
      }
      req.body = sanitized;
    }
    next();
  };
};

/**
 * Generic SQL injection prevention check
 * Rejects requests with common SQL injection patterns
 */
const preventSqlInjection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|EXECUTE)\b)/i,
    /(--)|(;)|(\/\*)|(\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    }
    return false;
  };

  const checkObject = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    for (const key of Object.keys(obj)) {
      if (checkValue(obj[key])) return true;
      if (typeof obj[key] === 'object' && checkObject(obj[key])) return true;
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    console.log(`[SECURITY] SQL injection attempt detected - RequestId: ${req.requestId || 'N/A'}, IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Invalid input detected',
      requestId: req.requestId,
    });
  }

  next();
};

module.exports = {
  handleValidationErrors,
  validateOtpSend,
  validateOtpVerify,
  validateProfileUpdate,
  validateReferralCreate,
  validateJobCreate,
  validateIdParam,
  sanitizeInput,
  preventSqlInjection,
};
