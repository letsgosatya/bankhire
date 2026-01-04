/**
 * BANKHIRE API SERVER
 * Enhanced with comprehensive security measures
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./config/database');
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const referralRoutes = require('./routes/referral');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middlewares/errorHandler');

// Security middleware imports
const securityConfig = require('./config/security');
const requestIdMiddleware = require('./middlewares/requestIdMiddleware');
const { generalRateLimiter } = require('./middlewares/rateLimitMiddleware');
const { preventSqlInjection } = require('./middlewares/validationMiddleware');

const app = express();

// ======================
// SECURITY MIDDLEWARE (Applied First)
// ======================

// Security: Add request ID to every request for tracing
app.use(requestIdMiddleware);

// Security: Helmet security headers (XSS, clickjacking, MIME sniffing protection)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for mobile app
}));

// Security: Strict CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile native apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Strict allowlist for production
    if (securityConfig.CORS.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow LAN origins (e.g. http://192.168.x.x) to ease testing
    if (process.env.NODE_ENV !== 'production') {
      try {
        const isLocalLan = /^https?:\/\/(127\.0\.0\.1|localhost|10\.|172\.|192\.168\.)/.test(origin);
        if (isLocalLan) return callback(null, true);
      } catch (e) {
        // fallthrough to block
      }
    }

    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  methods: securityConfig.CORS.ALLOWED_METHODS,
  allowedHeaders: securityConfig.CORS.ALLOWED_HEADERS,
  credentials: securityConfig.CORS.CREDENTIALS,
  maxAge: securityConfig.CORS.MAX_AGE,
};
app.use(cors(corsOptions));

// Security: Limit request body size
app.use(express.json({ limit: securityConfig.BODY_LIMITS.JSON_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: securityConfig.BODY_LIMITS.URL_ENCODED_LIMIT }));

// Security: General rate limiting for all routes
app.use(generalRateLimiter);

// Security: SQL injection prevention for all routes
app.use(preventSqlInjection);

// Static file serving for uploads (with restricted access - TODO: implement signed URLs)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ======================
// HEALTH & INFO ROUTES
// ======================

// Routes
app.get('/', (req, res) => res.json({ 
  message: 'BankHire API is running', 
  health: '/health', 
  docs: 'Check README for API endpoints',
  requestId: req.requestId,
}));

app.get('/health', (req, res) => res.json({ 
  status: 'ok',
  requestId: req.requestId,
  timestamp: new Date().toISOString(),
}));

// ======================
// DATABASE ASSOCIATIONS
// ======================

// Define associations
const User = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');
const Referral = require('./models/Referral');
const Earning = require('./models/Earning');

User.hasMany(Job, { foreignKey: 'createdBy' });
Job.belongsTo(User, { foreignKey: 'createdBy' });

User.hasMany(Application, { foreignKey: 'candidateId' });
Application.belongsTo(User, { foreignKey: 'candidateId' });

Job.hasMany(Application, { foreignKey: 'jobId' });
Application.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

User.hasMany(Referral, { foreignKey: 'referrerId' });
Referral.belongsTo(User, { foreignKey: 'referrerId', as: 'referrer' });

Job.hasMany(Referral, { foreignKey: 'jobId' });
Referral.belongsTo(Job, { foreignKey: 'jobId' });

User.hasMany(Earning, { foreignKey: 'userId' });
Earning.belongsTo(User, { foreignKey: 'userId' });

// Link earnings to referrals when available
Earning.belongsTo(Referral, { foreignKey: 'referralId', as: 'referral' });
Referral.hasMany(Earning, { foreignKey: 'referralId' });

// ======================
// API ROUTES
// ======================

app.use('/auth', authRoutes);
app.use('/jobs', jobRoutes);
app.use('/referral', referralRoutes);
app.use('/admin', adminRoutes);

// ======================
// ERROR HANDLING
// ======================

// Global error handler
app.use(errorHandler);

// ======================
// SERVER STARTUP
// ======================

// Sync database and start server
sequelize.sync().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Security features enabled: Helmet, CORS, Rate Limiting, Request ID`);
  });

  // Start scheduled background jobs (referral expiry)
  try{
    const { start: startReferralExpiry } = require('./services/referralExpiryService');
    startReferralExpiry();
  }catch(e){
    console.error('Failed to start background jobs:', e);
  }
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});
