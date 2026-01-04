/**
 * AUTH ROUTES
 * Enhanced with security middleware: rate limiting, input validation, audit logging
 */

const express = require('express');
const { sendOtp, verifyOtp, uploadResume, downloadResume, upload, getProfile, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Security middleware
const { otpSendRateLimiter, loginRateLimiter } = require('../middlewares/rateLimitMiddleware');
const { validateOtpSend, validateOtpVerify, validateProfileUpdate } = require('../middlewares/validationMiddleware');
const { secureResumeUpload, validateUploadedFile, handleUploadError } = require('../middlewares/fileUploadMiddleware');

const router = express.Router();

// ======================
// PUBLIC AUTH ROUTES (with rate limiting)
// ======================

// Send OTP - rate limited to 5 per hour per mobile
router.post('/send-otp', 
  otpSendRateLimiter,      // Security: Rate limit OTP requests
  validateOtpSend,          // Security: Validate input
  sendOtp
);

// Verify OTP - rate limited to 5 attempts per 15 min
router.post('/verify-otp', 
  loginRateLimiter,         // Security: Rate limit login attempts
  validateOtpVerify,        // Security: Validate input
  verifyOtp
);

// ======================
// PROTECTED AUTH ROUTES
// ======================

// Wrapper to properly handle multer errors without ECONNRESET
const handleMulterUpload = (req, res, next) => {
  secureResumeUpload.single('resume')(req, res, (err) => {
    if (err) {
      // Ensure request body is fully consumed before sending response
      // to prevent ECONNRESET on multipart uploads
      if (req.readable) {
        req.resume();
        req.on('end', () => {
          handleUploadError(err, req, res, next);
        });
        req.on('error', () => {
          handleUploadError(err, req, res, next);
        });
      } else {
        handleUploadError(err, req, res, next);
      }
      return;
    }
    next();
  });
};

// Upload resume - with secure file handling
router.post('/upload-resume', 
  authMiddleware,
  handleMulterUpload,                    // Security: Secure file upload with error handling
  validateUploadedFile,                  // Security: Validate file signature
  uploadResume
);

// Download own resume
router.get('/download-resume', authMiddleware, downloadResume);

// Get profile
router.get('/me', authMiddleware, getProfile);

// Update profile - with validation
router.put('/profile', 
  authMiddleware, 
  validateProfileUpdate,    // Security: Validate profile data
  updateProfile
);

module.exports = router;
