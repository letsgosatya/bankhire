/**
 * SECURITY CONFIGURATION
 * Centralized security constants for BankHire application
 * 
 * SECURITY IS THE TOP PRIORITY - DO NOT MODIFY THESE VALUES WITHOUT SECURITY REVIEW
 */

module.exports = {
  // ======================
  // OTP SECURITY
  // ======================
  OTP: {
    EXPIRY_MINUTES: 5,                    // OTP expires after 5 minutes
    MAX_ATTEMPTS_PER_OTP: 3,              // Max 3 verification attempts per OTP
    MAX_REQUESTS_PER_HOUR: 5,             // Max 5 OTP requests per hour per mobile
    HASH_ROUNDS: 10,                      // bcrypt hash rounds for OTP
    GRACE_PERIOD_AFTER_USE_MS: 60000,     // 1 minute grace period after first use
  },

  // ======================
  // JWT/TOKEN SECURITY
  // ======================
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',           // Access token expires in 15 minutes
    REFRESH_TOKEN_EXPIRY_DAYS: 7,         // Refresh token expires in 7 days
    REFRESH_TOKEN_EXPIRY: '7d',           // Refresh token expiry string
    ISSUER: 'bankhire-api',               // Token issuer
    AUDIENCE: 'bankhire-app',             // Token audience
  },

  // ======================
  // RATE LIMITING
  // ======================
  RATE_LIMIT: {
    // General API rate limiting
    GENERAL: {
      WINDOW_MS: 15 * 60 * 1000,          // 15 minutes
      MAX_REQUESTS: 100,                   // 100 requests per window
    },
    // Auth/OTP rate limiting (stricter)
    AUTH: {
      WINDOW_MS: 60 * 60 * 1000,          // 1 hour
      MAX_REQUESTS: 10,                    // 10 requests per hour
    },
    // Login attempts rate limiting
    LOGIN: {
      WINDOW_MS: 15 * 60 * 1000,          // 15 minutes
      MAX_REQUESTS: 5,                     // 5 attempts per 15 min
      BLOCK_DURATION_MS: 30 * 60 * 1000,  // 30 min block after exceeded
    },
  },

  // ======================
  // ROLE-BASED ACCESS CONTROL
  // ======================
  ROLES: {
    CANDIDATE: 'CANDIDATE',
    EMPLOYEE: 'EMPLOYEE',
    HR: 'HR',
    MANAGER: 'MANAGER',
    ADMIN: 'ADMIN',
  },

  // Role restrictions - what each role CANNOT do
  ROLE_RESTRICTIONS: {
    CANDIDATE: ['referral', 'admin'],      // Cannot access referral APIs
    EMPLOYEE: ['apply', 'my-applications'], // Cannot apply for jobs
    HR: ['payout-unlock'],                  // Cannot unlock payouts
  },

  // ======================
  // FILE UPLOAD SECURITY
  // ======================
  FILE_UPLOAD: {
    MAX_SIZE_MB: 25,                       // Max 25MB for large resume PDFs
    MAX_SIZE_BYTES: 25 * 1024 * 1024,
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx'],
    // Dangerous file types to reject even if renamed
    BLOCKED_EXTENSIONS: [
      '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
      '.msi', '.dll', '.com', '.scr', '.pif', '.hta', '.cpl',
    ],
  },

  // ======================
  // CORS SECURITY
  // ======================
  CORS: {
    // Allowed origins - add production domains here
    ALLOWED_ORIGINS: [
      'http://localhost:3000',             // Web app dev
      'http://localhost:8081',             // Mobile app dev
      'http://localhost:19006',            // Expo web
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8081',
      // Add production domains:
      // 'https://bankhire.com',
      // 'https://app.bankhire.com',
    ],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Request-ID'],
    CREDENTIALS: true,
    MAX_AGE: 86400,                        // 24 hours preflight cache
  },

  // ======================
  // REQUEST BODY LIMITS
  // ======================
  BODY_LIMITS: {
    JSON_LIMIT: '1mb',                     // Max JSON body size
    URL_ENCODED_LIMIT: '1mb',              // Max URL encoded body size
  },

  // ======================
  // REFERRAL ABUSE PREVENTION
  // ======================
  REFERRAL: {
    MAX_DAILY_REFERRALS: 10,               // Max 10 referrals per day per employee
    MAX_MONTHLY_REFERRALS: 50,             // Max 50 referrals per month per employee
    EXPIRY_DAYS: 30,                       // Referral expires after 30 days
    RETENTION_DAYS_SHORT: 30,              // 30 day retention check
    RETENTION_DAYS_LONG: 90,               // 90 day retention check
    PAYOUT_LOCK_DAYS: 30,                  // Lock payout for 30 days after joining
  },

  // ======================
  // FRAUD DETECTION FLAGS
  // ======================
  FRAUD_FLAGS: {
    MAX_REFERRALS_PER_DAY_FLAG: 5,         // Flag if > 5 referrals in a day
    MAX_SAME_IP_REGISTRATIONS: 5,          // Flag if > 5 accounts from same IP
    SAME_RESUME_HASH_FLAG: true,           // Flag duplicate resume uploads
  },

  // ======================
  // LOGGING SECURITY
  // ======================
  LOGGING: {
    // Fields to NEVER log
    SENSITIVE_FIELDS: [
      'otp', 'password', 'token', 'accessToken', 'refreshToken',
      'authorization', 'secret', 'apiKey', 'mobile', 'phone',
    ],
    // Mask mobile numbers - show only last 4 digits
    MOBILE_MASK_PATTERN: /(\d{6})(\d{4})/,
    MOBILE_MASK_REPLACEMENT: 'XXXXXX$2',
  },

  // ======================
  // SESSION SECURITY
  // ======================
  SESSION: {
    ONE_SESSION_PER_DEVICE: false,         // Optional: enforce single session per device
    TOKEN_REUSE_DETECTION: true,           // Detect and revoke reused tokens
  },
};
