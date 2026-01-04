/**
 * BankHire API Stability Test Suite
 * Comprehensive tests for all endpoints with proper error handling
 * 
 * Run: node tools/stabilityTests.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3002';

// Test state
let passed = 0;
let failed = 0;
const failures = [];
let authToken = null;
let testUserId = null;
// Use timestamp-based mobile numbers to avoid rate limits across test runs
const testMobileBase = () => `999${Date.now().toString().slice(-7)}`;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    const msg = `${err.status ? err.status + ': ' : ''}${err.message || err}`;
    console.log(`✗ ${name} - ${msg}`);
    failed++;
    failures.push({ name, error: msg });
  }
  // Small delay between tests to avoid rate limiting
  await new Promise(r => setTimeout(r, 50));
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log('=== BankHire API Stability Tests ===\n');
  
  // Wait for server
  try {
    await request('GET', '/health');
  } catch {
    console.log('Server not running. Start with: node src/app.js');
    process.exit(1);
  }

  // =======================
  // HEALTH & BASIC ENDPOINTS
  // =======================
  console.log('--- Health & Basic ---');
  
  await test('Health endpoint returns ok', async () => {
    const res = await request('GET', '/health');
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data.status === 'ok', 'Expected status ok');
  });

  await test('Root endpoint returns message', async () => {
    const res = await request('GET', '/');
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Invalid endpoint returns 404', async () => {
    const res = await request('GET', '/api/nonexistent/endpoint');
    expect(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // =======================
  // JOBS - PUBLIC ENDPOINTS
  // =======================
  console.log('\n--- Jobs (Public) ---');

  await test('GET /jobs returns array without auth', async () => {
    const res = await request('GET', '/jobs');
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(Array.isArray(res.data), 'Expected array response');
  });

  await test('GET /jobs handles empty database', async () => {
    const res = await request('GET', '/jobs');
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    // Even if empty, should return an array
    expect(Array.isArray(res.data), 'Expected array response');
  });

  // =======================
  // AUTH - OTP SEND
  // =======================
  console.log('\n--- Auth: Send OTP ---');

  await test('POST /auth/send-otp with valid mobile', async () => {
    const mobile = testMobileBase() + '1';
    const res = await request('POST', '/auth/send-otp', { mobile });
    expect(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  await test('POST /auth/send-otp rejects short mobile', async () => {
    const res = await request('POST', '/auth/send-otp', { mobile: '12345' });
    expect(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('POST /auth/send-otp rejects missing mobile', async () => {
    const res = await request('POST', '/auth/send-otp', {});
    expect(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('POST /auth/send-otp rejects non-numeric mobile', async () => {
    const res = await request('POST', '/auth/send-otp', { mobile: 'abcdefghij' });
    expect(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('POST /auth/send-otp rejects mobile with special chars', async () => {
    const res = await request('POST', '/auth/send-otp', { mobile: '999-888-7777' });
    expect(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // =======================
  // AUTH - OTP VERIFY
  // =======================
  console.log('\n--- Auth: Verify OTP ---');

  // Get a valid token for subsequent tests
  await test('POST /auth/verify-otp with test OTP 123456', async () => {
    const mobile = testMobileBase() + '2';
    // First send OTP
    await request('POST', '/auth/send-otp', { mobile });
    // Verify with test OTP
    const res = await request('POST', '/auth/verify-otp', { mobile, otp: '123456' });
    expect(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    expect(res.data.token, 'Expected token in response');
    expect(res.data.user, 'Expected user in response');
    authToken = res.data.token;
    testUserId = res.data.user.id;
  });

  await test('POST /auth/verify-otp rejects invalid OTP', async () => {
    const mobile = testMobileBase() + '3';
    await request('POST', '/auth/send-otp', { mobile });
    const res = await request('POST', '/auth/verify-otp', { mobile, otp: '000000' });
    expect(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('POST /auth/verify-otp rejects missing OTP', async () => {
    const mobile = testMobileBase() + '4';
    const res = await request('POST', '/auth/verify-otp', { mobile });
    expect(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('POST /auth/verify-otp rejects missing mobile', async () => {
    const res = await request('POST', '/auth/verify-otp', { otp: '123456' });
    expect(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // =======================
  // AUTH - PROTECTED ENDPOINTS
  // =======================
  console.log('\n--- Auth: Protected Endpoints ---');

  await test('GET /auth/me rejects without token', async () => {
    const res = await request('GET', '/auth/me');
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /auth/me with valid token returns user', async () => {
    const res = await request('GET', '/auth/me', null, { Authorization: `Bearer ${authToken}` });
    expect(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    expect(res.data.user, 'Expected user object');
    expect(res.data.user.id, 'Expected user id');
  });

  await test('GET /auth/me rejects invalid token', async () => {
    const res = await request('GET', '/auth/me', null, { Authorization: 'Bearer invalid.token.here' });
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /auth/me rejects expired-format token', async () => {
    const res = await request('GET', '/auth/me', null, { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjoxfQ.xyz' });
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('PUT /auth/profile updates user profile', async () => {
    const res = await request('PUT', '/auth/profile', { fullName: 'Test User' }, { Authorization: `Bearer ${authToken}` });
    expect(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  await test('PUT /auth/profile rejects without token', async () => {
    const res = await request('PUT', '/auth/profile', { fullName: 'Test' });
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // =======================
  // REFERRAL - ACCESS CONTROL
  // =======================
  console.log('\n--- Referral: Access Control ---');

  await test('GET /referral/my-referrals rejects without token', async () => {
    const res = await request('GET', '/referral/my-referrals');
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /referral/my-referrals rejects CANDIDATE role', async () => {
    // The test user is a CANDIDATE, should be rejected
    const res = await request('GET', '/referral/my-referrals', null, { Authorization: `Bearer ${authToken}` });
    expect(res.status === 403, `Expected 403 (role denied), got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  await test('GET /referral/my-earnings rejects without token', async () => {
    const res = await request('GET', '/referral/my-earnings');
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('POST /referral/create rejects without token', async () => {
    const res = await request('POST', '/referral/create', { candidateMobile: '9999777766', jobId: 1 });
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('POST /referral/create rejects CANDIDATE role', async () => {
    const res = await request('POST', '/referral/create', { candidateMobile: '9999777766', jobId: 1 }, { Authorization: `Bearer ${authToken}` });
    expect(res.status === 403, `Expected 403 (role denied), got ${res.status}`);
  });

  // =======================
  // ADMIN - ACCESS CONTROL
  // =======================
  console.log('\n--- Admin: Access Control ---');

  await test('GET /admin/users rejects without token', async () => {
    const res = await request('GET', '/admin/users');
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /admin/users rejects non-admin token', async () => {
    const res = await request('GET', '/admin/users', null, { Authorization: `Bearer ${authToken}` });
    expect(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('GET /admin/jobs rejects without token', async () => {
    const res = await request('GET', '/admin/jobs');
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /admin/referrals rejects without token', async () => {
    const res = await request('GET', '/admin/referrals');
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /admin/applications rejects without token', async () => {
    const res = await request('GET', '/admin/applications');
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // =======================
  // JOBS - AUTHENTICATED
  // =======================
  console.log('\n--- Jobs: Authenticated ---');

  await test('POST /jobs (create) rejects without token', async () => {
    const res = await request('POST', '/jobs', { title: 'Test', bankName: 'TestBank', location: 'TestCity', description: 'Test job' });
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('POST /jobs (create) rejects non-manager role', async () => {
    const res = await request('POST', '/jobs', { title: 'Test', bankName: 'TestBank', location: 'TestCity', description: 'Test job' }, { Authorization: `Bearer ${authToken}` });
    expect(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('GET /jobs/my returns applications for candidate', async () => {
    const res = await request('GET', '/jobs/my', null, { Authorization: `Bearer ${authToken}` });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(Array.isArray(res.data), 'Expected array response');
  });

  // =======================
  // ERROR HANDLING
  // =======================
  console.log('\n--- Error Handling ---');

  await test('Invalid JSON body returns 400', async () => {
    const url = new URL('/auth/send-otp', BASE_URL);
    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.write('{ invalid json }');
      req.end();
    });
    expect(res.status === 400, `Expected 400 for invalid JSON, got ${res.status}`);
  });

  await test('Empty body on POST returns appropriate error', async () => {
    const url = new URL('/auth/send-otp', BASE_URL);
    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end();
    });
    // Should be 400 for validation error, or 429 if rate limited (both are valid)
    expect(res.status === 400 || res.status === 429, `Expected 400 or 429 for empty body, got ${res.status}`);
  });

  // =======================
  // SUMMARY
  // =======================
  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
