/**
 * FILE UPLOAD SECURITY MIDDLEWARE
 * Enhanced file upload validation and security
 * 
 * Security: Prevents malicious file uploads, validates file types
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const securityConfig = require('../config/security');
const safeLogger = require('../utils/safeLogger');

/**
 * Validate file extension against allowed list
 */
const isAllowedExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return securityConfig.FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(ext);
};

/**
 * Check if file extension is blocked (executable, etc.)
 */
const isBlockedExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return securityConfig.FILE_UPLOAD.BLOCKED_EXTENSIONS.includes(ext);
};

/**
 * Validate MIME type
 */
const isAllowedMimeType = (mimetype) => {
  return securityConfig.FILE_UPLOAD.ALLOWED_MIME_TYPES.includes(mimetype);
};

/**
 * Generate secure filename with random component
 */
const generateSecureFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const randomPart = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${randomPart}${ext}`;
};

/**
 * Check file magic bytes to validate actual file type
 * Prevents renamed executable files
 */
const validateFileSignature = (buffer, mimetype) => {
  if (!buffer || buffer.length < 8) return false;

  // PDF: %PDF (hex: 25 50 44 46)
  if (mimetype === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // DOC: D0 CF 11 E0 A1 B1 1A E1 (OLE compound document)
  if (mimetype === 'application/msword') {
    return buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
  }

  // DOCX: PK (ZIP signature) - 50 4B 03 04
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
  }

  return false;
};

/**
 * Compute SHA-256 hash of file for duplicate detection
 */
const computeFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

/**
 * Secure storage configuration
 */
const secureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename
    const secureFilename = generateSecureFilename(file.originalname);
    cb(null, secureFilename);
  },
});

/**
 * Secure file filter
 */
const secureFileFilter = (req, file, cb) => {
  const requestId = req.requestId || 'N/A';
  const original = file.originalname;

  // Security: Check for blocked extensions first
  if (isBlockedExtension(original)) {
    safeLogger.security('BLOCKED_FILE_UPLOAD', {
      reason: 'Blocked extension',
      filename: original,
    }, req);
    return cb(new Error('File type not allowed'), false);
  }

  // Security: Only allow files with permitted extensions (strict)
  if (!isAllowedExtension(original)) {
    safeLogger.security('REJECTED_FILE_UPLOAD', {
      reason: 'Invalid extension',
      filename: original,
    }, req);
    return cb(new Error('Invalid file type. Only PDF, DOC, DOCX allowed.'), false);
  }

  // If MIME type is not a known allowed value, do NOT reject immediately because
  // some mobile clients (Android DocumentPicker/Expo) may send generic MIME
  // values like 'application/octet-stream'. We accept based on extension and
  // rely on post-upload signature validation to catch mismatches.
  if (!isAllowedMimeType(file.mimetype)) {
    safeLogger.warn('Untrusted MIME for allowed extension', {
      filename: original,
      mimetype: file.mimetype,
    }, req);
    // Mark file for extra scrutiny in later middleware
    file._mimetypeUntrusted = true;
  }

  cb(null, true);
};

/**
 * Secure multer upload instance for resumes
 */
const secureResumeUpload = multer({
  storage: secureStorage,
  fileFilter: secureFileFilter,
  limits: {
    fileSize: securityConfig.FILE_UPLOAD.MAX_SIZE_BYTES,
    files: 1,
  },
});

/**
 * Post-upload validation middleware
 * Validates file signature after upload to catch renamed files
 */
const validateUploadedFile = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filePath = req.file.path;
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    // Determine expected MIME types based on extension (helps with mobile clients that provide generic MIME)
    const ext = path.extname(req.file.originalname || '').toLowerCase();
    const extToMime = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const expectedMime = extToMime[ext];

    // Check signature against declared mimetype OR expected mimetype derived from extension
    const signatureMatchesDeclared = validateFileSignature(buffer, req.file.mimetype);
    const signatureMatchesExpected = expectedMime ? validateFileSignature(buffer, expectedMime) : false;

    if (!signatureMatchesDeclared && !signatureMatchesExpected) {
      // Delete the suspicious file
      fs.unlinkSync(filePath);
      safeLogger.security('MALICIOUS_FILE_DETECTED', {
        reason: 'File signature mismatch',
        claimedMime: req.file.mimetype,
        expectedMime,
        filename: req.file.originalname,
      }, req);
      return res.status(400).json({
        error: 'Invalid file content. File appears to be corrupted or mismatched with its extension.',
        requestId: req.requestId,
      });
    }

    // If MIME was untrusted, log a warning so we can monitor which clients send unexpected MIME types
    if (req.file._mimetypeUntrusted) {
      safeLogger.warn('File uploaded with untrusted mimetype; verified by signature', {
        filename: req.file.originalname,
        claimedMime: req.file.mimetype,
        expectedMime,
      }, req);
    }

    // Compute and attach file hash for duplicate detection
    try {
      req.file.hash = await computeFileHash(filePath);
    } catch (hashErr) {
      // Non-critical - continue without hash
      console.error('Failed to compute file hash:', hashErr.message);
    }

    next();
  } catch (err) {
    safeLogger.error('File validation error', err, req);
    return res.status(500).json({
      error: 'File validation failed',
      requestId: req.requestId,
    });
  }
};

/**
 * Handle multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `File too large. Maximum size is ${securityConfig.FILE_UPLOAD.MAX_SIZE_MB}MB.`,
        requestId: req.requestId,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files. Only one file allowed.',
        requestId: req.requestId,
      });
    }
    return res.status(400).json({
      error: 'File upload error: ' + err.message,
      requestId: req.requestId,
    });
  }
  
  if (err) {
    return res.status(400).json({
      error: err.message || 'File upload failed',
      requestId: req.requestId,
    });
  }
  
  next();
};

module.exports = {
  secureResumeUpload,
  validateUploadedFile,
  handleUploadError,
  computeFileHash,
  isAllowedExtension,
  isBlockedExtension,
  validateFileSignature,
  isAllowedMimeType,
};
