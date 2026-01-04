/**
 * ENHANCED ERROR HANDLER
 * Secure error handling with safe logging and alerts
 * 
 * Security: Never expose internal errors to clients, mask sensitive data in logs
 */

const nodemailer = require('nodemailer');
const safeLogger = require('../utils/safeLogger');
const auditService = require('../services/auditService');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const errorHandler = (err, req, res, next) => {
  // Handle JSON parsing errors (SyntaxError from express.json())
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      requestId: req.requestId,
    });
  }

  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large. Maximum size is 5MB.',
      requestId: req.requestId,
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      requestId: req.requestId,
    });
  }

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Origin not allowed',
      requestId: req.requestId,
    });
  }

  // Security: Use safe logger that masks sensitive data
  safeLogger.error('Unhandled error', err, req);

  // Security: Log to audit trail
  auditService.createAuditRecord('ERROR', {
    errorName: err.name,
    errorMessage: err.message,
    path: req.path,
    method: req.method,
  }, req);

  // Send email alert (only if configured)
  if (process.env.ADMIN_EMAIL && process.env.EMAIL_USER) {
    // Security: Don't include sensitive request data in email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: '🚨 BankHire App Error Alert',
      text: `An error occurred in BankHire app:

Error: ${err.name}: ${err.message}
Request ID: ${req.requestId || 'N/A'}
Path: ${req.method} ${req.path}
User ID: ${req.user?.id || 'anonymous'}
Timestamp: ${new Date().toISOString()}

Stack trace (DO NOT SHARE):
${process.env.NODE_ENV === 'development' ? err.stack : '[Hidden in production]'}
`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        // Don't log the full error to prevent information leakage
        console.error('Error sending alert email');
      }
    });
  }

  // Security: Never expose internal error details to clients
  // Return generic error message with requestId for support
  res.status(500).json({ 
    error: 'Something went wrong!',
    requestId: req.requestId,
  });
};

module.exports = { errorHandler };
