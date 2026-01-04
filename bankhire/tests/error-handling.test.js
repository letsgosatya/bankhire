/**
 * API ERROR HANDLING TESTS
 * Tests proper error responses for all error scenarios
 */

const request = require('supertest');
const { createTestApp } = require('./utils/testApp');
const {
  cleanDatabase,
  syncDatabase,
  createAuthenticatedUser,
  createTestJob,
} = require('./utils/testHelpers');

describe('API Error Handling Tests', () => {
  let app;
  let candidate, employee, admin;

  beforeAll(async () => {
    await syncDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    candidate = await createAuthenticatedUser('CANDIDATE');
    employee = await createAuthenticatedUser('EMPLOYEE');
    admin = await createAuthenticatedUser('ADMIN');
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // =====================
  // 400 BAD REQUEST
  // =====================
  describe('400 Bad Request Handling', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      // Should not expose stack trace
      expect(res.body.stack).toBeUndefined();
    });

    it('should return 400 for invalid JSON body', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for validation errors', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({ mobile: '123' }); // Too short

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid OTP', async () => {
      // Use unique mobile to avoid OTP conflicts with other tests
      const testMobile = `99${Date.now().toString().slice(-8)}`;
      
      await request(app)
        .post('/auth/send-otp')
        .send({ mobile: testMobile });

      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ mobile: testMobile, otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('should return user-friendly error message', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({ mobile: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(typeof res.body.error).toBe('string');
      // Should not contain technical jargon
      expect(res.body.error).not.toContain('TypeError');
      expect(res.body.error).not.toContain('undefined');
    });
  });

  // =====================
  // 401 UNAUTHORIZED
  // =====================
  describe('401 Unauthorized Handling', () => {
    it('should return 401 when no token provided', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('token');
    });

    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should return 401 for malformed Authorization header', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'invalid-format');

      expect(res.status).toBe(401);
    });

    it('should not expose token details in error', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer some.secret.token');

      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).not.toContain('some.secret.token');
    });
  });

  // =====================
  // 403 FORBIDDEN
  // =====================
  describe('403 Forbidden Handling', () => {
    it('should return 403 when CANDIDATE accesses employee endpoints', async () => {
      const res = await request(app)
        .get('/referral/my-referrals')
        .set(candidate.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should return 403 when EMPLOYEE accesses admin endpoints', async () => {
      const res = await request(app)
        .get('/admin/users')
        .set(employee.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it('should not expose role requirements in 403 response', async () => {
      const res = await request(app)
        .get('/admin/users')
        .set(candidate.authHeader);

      expect(res.status).toBe(403);
      // Should not tell attacker what role is needed
      expect(res.body.error).not.toContain('ADMIN');
    });
  });

  // =====================
  // 404 NOT FOUND
  // =====================
  describe('404 Not Found Handling', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent referral', async () => {
      const res = await request(app)
        .post('/referral/withdraw')
        .set(employee.authHeader)
        .send({ id: 99999 });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 404 for non-existent job when applying', async () => {
      const res = await request(app)
        .post('/jobs/99999/apply')
        .set(candidate.authHeader);

      expect(res.status).toBe(404);
    });
  });

  // =====================
  // 500 INTERNAL ERROR
  // =====================
  describe('500 Internal Error Handling', () => {
    it('should not expose stack traces in error responses', async () => {
      // Force an internal error by passing invalid data
      const res = await request(app)
        .get('/admin/referral/invalid-id')
        .set(admin.authHeader);

      // Even if it causes an error, should not expose stack
      expect(res.body.stack).toBeUndefined();
    });

    it('should include requestId for error tracking', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({});

      expect(res.body.requestId).toBeDefined();
    });
  });

  // =====================
  // ERROR RESPONSE FORMAT
  // =====================
  describe('Error Response Format', () => {
    it('all errors should have error field', async () => {
      const errorResponses = [
        await request(app).post('/auth/send-otp').send({}),
        await request(app).get('/auth/me'),
        await request(app).get('/referral/my-referrals').set(candidate.authHeader),
      ];

      errorResponses.forEach((res) => {
        expect(res.body.error).toBeDefined();
        expect(typeof res.body.error).toBe('string');
      });
    });

    it('error messages should be user-friendly', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({ mobile: '123' });

      // Should be readable by end users
      expect(res.body.error.length).toBeLessThan(200);
      expect(res.body.error).not.toContain('at Object');
      expect(res.body.error).not.toContain('TypeError');
    });
  });
});
