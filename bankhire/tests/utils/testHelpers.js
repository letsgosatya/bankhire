/**
 * Test Utilities for BankHire Backend Tests
 * Provides helpers for authentication, database cleanup, and mock data
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.test') });

const { Sequelize } = require('sequelize');

// Test database connection
const testSequelize = new Sequelize(
  process.env.DB_NAME || 'bankhire_test',
  process.env.DB_USER || 'bankhire_user',
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

// Import models
const User = require('../../src/models/User');
const Job = require('../../src/models/Job');
const Application = require('../../src/models/Application');
const Referral = require('../../src/models/Referral');
const Earning = require('../../src/models/Earning');

/**
 * Clean up test database - removes all test data
 */
async function cleanDatabase() {
  try {
    // Delete in order to respect foreign keys
    await Earning.destroy({ where: {}, force: true });
    await Application.destroy({ where: {}, force: true });
    await Referral.destroy({ where: {}, force: true });
    await Job.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  } catch (err) {
    console.error('Database cleanup error:', err.message);
  }
}

/**
 * Sync database tables for testing
 */
async function syncDatabase() {
  const { sequelize } = require('../../src/config/database');
  // Force sync in tests to ensure schema is created fresh for each
  // Jest worker. This avoids race conditions when tests run in parallel.
  await sequelize.sync({ force: true });
}

/**
 * Create a test user with specified role
 */
async function createTestUser(data = {}) {
  const defaults = {
    mobile: `999${Date.now().toString().slice(-7)}`,
    role: 'CANDIDATE',
    resumeUploaded: false,
  };
  return User.create({ ...defaults, ...data });
}

/**
 * Create a test job
 */
async function createTestJob(createdBy, data = {}) {
  const defaults = {
    title: 'Test Job',
    bankName: 'Test Bank',
    location: 'Test City',
    description: 'Test job description',
    createdBy,
  };
  return Job.create({ ...defaults, ...data });
}

/**
 * Create a test referral
 */
async function createTestReferral(referrerId, jobId, data = {}) {
  const defaults = {
    referrerId,
    jobId,
    candidateMobile: `888${Date.now().toString().slice(-7)}`,
    status: 'REFERRED',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };
  return Referral.create({ ...defaults, ...data });
}

/**
 * Create a test application
 */
async function createTestApplication(candidateId, jobId, data = {}) {
  const defaults = {
    candidateId,
    jobId,
    status: 'APPLIED',
  };
  return Application.create({ ...defaults, ...data });
}

/**
 * Generate JWT token for a user
 */
function generateTestToken(user) {
  const { generateToken } = require('../../src/utils/jwtUtils');
  return generateToken(user);
}

/**
 * Get auth header for a user
 */
function getAuthHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Create user and return with token
 */
async function createAuthenticatedUser(role = 'CANDIDATE') {
  const user = await createTestUser({ role });
  const token = generateTestToken(user);
  return { user, token, authHeader: getAuthHeader(token) };
}

/**
 * Mock timers for expiry tests
 */
function advanceTime(ms) {
  jest.advanceTimersByTime(ms);
}

/**
 * Wait for async operations to complete
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  testSequelize,
  cleanDatabase,
  syncDatabase,
  createTestUser,
  createTestJob,
  createTestReferral,
  createTestApplication,
  generateTestToken,
  getAuthHeader,
  createAuthenticatedUser,
  advanceTime,
  wait,
  // Export models for convenience
  User,
  Job,
  Application,
  Referral,
  Earning,
};
