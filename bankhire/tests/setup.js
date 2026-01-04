/**
 * Jest Test Setup
 * Runs before all tests - configures environment and database
 */

const path = require('path');

// Load test environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Import OTP store for rate limit clearing
const otpStore = require('../src/services/otpStore');

// Global test hooks
beforeAll(async () => {
  // Clear all rate limits before tests
  await otpStore.clearAllRateLimits();
  // Silence console during tests (optional - comment out to debug)
  // jest.spyOn(console, 'log').mockImplementation(() => {});
  // jest.spyOn(console, 'error').mockImplementation(() => {});
});

beforeEach(async () => {
  // Clear rate limits before each test to avoid 429 errors
  await otpStore.clearAllRateLimits();
});

afterAll(async () => {
  // Cleanup after all tests
});
