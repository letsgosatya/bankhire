// Simple test runner, run with: node tools/testExpiryJob.js (this file is for reference)
// We keep tests simple and self-contained since there's no test framework installed.

const assert = require('assert');
const Referral = require('../src/models/Referral');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const { expireReferrals } = require('../src/services/referralExpiryService');

module.exports = async function run(){
  // This file is not a standalone runner; see tools/testExpiryJob.js which performs the actual run.
};
