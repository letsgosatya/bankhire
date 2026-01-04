/**
 * Test App Factory
 * Creates an Express app instance for testing without starting the server
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.test') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import routes
const authRoutes = require('../../src/routes/auth');
const jobRoutes = require('../../src/routes/jobs');
const referralRoutes = require('../../src/routes/referral');
const adminRoutes = require('../../src/routes/admin');
const { errorHandler } = require('../../src/middlewares/errorHandler');

// Security middleware
const requestIdMiddleware = require('../../src/middlewares/requestIdMiddleware');
const { generalRateLimiter } = require('../../src/middlewares/rateLimitMiddleware');

// Import models for associations
const User = require('../../src/models/User');
const Job = require('../../src/models/Job');
const Application = require('../../src/models/Application');
const Referral = require('../../src/models/Referral');
const Earning = require('../../src/models/Earning');

// Set up model associations (same as in app.js)
function setupAssociations() {
  // User-Job
  User.hasMany(Job, { foreignKey: 'createdBy' });
  Job.belongsTo(User, { foreignKey: 'createdBy' });
  
  // User-Application
  User.hasMany(Application, { foreignKey: 'candidateId' });
  Application.belongsTo(User, { foreignKey: 'candidateId' });
  
  // Job-Application
  Job.hasMany(Application, { foreignKey: 'jobId' });
  Application.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });
  
  // User-Referral
  User.hasMany(Referral, { foreignKey: 'referrerId' });
  Referral.belongsTo(User, { foreignKey: 'referrerId', as: 'referrer' });
  
  // Job-Referral
  Job.hasMany(Referral, { foreignKey: 'jobId' });
  Referral.belongsTo(Job, { foreignKey: 'jobId' });
  
  // User-Earning
  User.hasMany(Earning, { foreignKey: 'userId' });
  Earning.belongsTo(User, { foreignKey: 'userId' });
  
  // Earning-Referral
  Earning.belongsTo(Referral, { foreignKey: 'referralId', as: 'referral' });
  Referral.hasMany(Earning, { foreignKey: 'referralId' });
}

// Set up associations once
let associationsSetUp = false;

function createTestApp() {
  // Set up associations only once
  if (!associationsSetUp) {
    setupAssociations();
    associationsSetUp = true;
  }

  const app = express();

  // Request ID for tracing
  app.use(requestIdMiddleware);

  // Security headers (relaxed for testing)
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS - allow all for testing
  app.use(cors());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Note: Rate limiting disabled for tests to avoid 429s
  // app.use(generalRateLimiter);

  // Static files
  app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

  // Health endpoint
  app.get('/health', (req, res) => res.json({ status: 'ok', requestId: req.requestId }));
  app.get('/', (req, res) => res.json({ message: 'BankHire API Test Server' }));

  // API routes
  app.use('/auth', authRoutes);
  app.use('/jobs', jobRoutes);
  app.use('/referral', referralRoutes);
  app.use('/admin', adminRoutes);

  // Error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createTestApp };
