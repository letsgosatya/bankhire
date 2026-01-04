/**
 * AUTH & OTP TESTS
 * Tests authentication flows, OTP handling, and JWT operations
 */

const request = require('supertest');
const { createTestApp } = require('./utils/testApp');
const {
  cleanDatabase,
  syncDatabase,
  createTestUser,
  generateTestToken,
  User,
} = require('./utils/testHelpers');

describe('Auth & OTP Tests', () => {
  let app;

  beforeAll(async () => {
    await syncDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // =====================
  // OTP SEND TESTS
  // =====================
  describe('POST /auth/send-otp', () => {
    it('should send OTP for valid mobile number', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({ mobile: '9876543210' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('OTP sent');
      expect(res.body.requestId).toBeDefined();
    });

    it('should reject mobile number with less than 10 digits', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({ mobile: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject missing mobile number', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject non-numeric mobile number', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({ mobile: 'abcdefghij' });

      expect(res.status).toBe(400);
    });

    it('should reject mobile with special characters', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({ mobile: '999-888-7777' });

      expect(res.status).toBe(400);
    });
  });

  // =====================
  // OTP VERIFY TESTS
  // =====================
  describe('POST /auth/verify-otp', () => {
    it('should verify OTP and return token for new user', async () => {
      const mobile = '9876543211';
      
      // Send OTP first
      await request(app).post('/auth/send-otp').send({ mobile });
      
      // Verify with test OTP (123456 is hardcoded for testing)
      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ mobile, otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.mobile).toBe(mobile);
      expect(res.body.user.role).toBe('CANDIDATE'); // Default role
    });

    it('should verify OTP and return token for existing user', async () => {
      const mobile = '9876543212';
      
      // Create existing user
      await createTestUser({ mobile, role: 'EMPLOYEE' });
      
      // Send and verify OTP
      await request(app).post('/auth/send-otp').send({ mobile });
      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ mobile, otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('EMPLOYEE');
    });

    it('should reject invalid OTP', async () => {
      const mobile = '9876543213';
      
      await request(app).post('/auth/send-otp').send({ mobile });
      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ mobile, otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('should reject missing OTP', async () => {
      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ mobile: '9876543214' });

      expect(res.status).toBe(400);
    });

    it('should reject missing mobile', async () => {
      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ otp: '123456' });

      expect(res.status).toBe(400);
    });
  });

  // =====================
  // JWT TOKEN TESTS
  // =====================
  describe('GET /auth/me (JWT Validation)', () => {
    it('should return user profile with valid token', async () => {
      const user = await createTestUser({ mobile: '9876543215' });
      const token = generateTestToken(user);

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(user.id);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('token');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    it('should reject malformed token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-jwt');

      expect(res.status).toBe(401);
    });

    it('should reject token with wrong signature', async () => {
      // Token signed with different secret
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjoxOTk5OTk5OTk5fQ.wrongsignature';
      
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
    });
  });

  // =====================
  // PROFILE UPDATE TESTS
  // =====================
  describe('PUT /auth/profile', () => {
    it('should update user profile', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user);

      const res = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Test User', email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('updated');

      // Verify update
      const updated = await User.findByPk(user.id);
      expect(updated.fullName).toBe('Test User');
      expect(updated.email).toBe('test@example.com');
    });

    it('should reject profile update without token', async () => {
      const res = await request(app)
        .put('/auth/profile')
        .send({ fullName: 'Hacker' });

      expect(res.status).toBe(401);
    });
  });

  // =====================
  // LOGOUT TESTS
  // =====================
  describe('Logout Flow', () => {
    it('should work with new token after re-login', async () => {
      const mobile = '9876543220';
      
      // First login
      await request(app).post('/auth/send-otp').send({ mobile });
      const res1 = await request(app)
        .post('/auth/verify-otp')
        .send({ mobile, otp: '123456' });
      
      const token1 = res1.body.token;

      // Simulate logout and re-login
      await request(app).post('/auth/send-otp').send({ mobile });
      const res2 = await request(app)
        .post('/auth/verify-otp')
        .send({ mobile, otp: '123456' });

      const token2 = res2.body.token;

      // Both tokens should work (until we implement token blacklisting)
      const check1 = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token1}`);
      expect(check1.status).toBe(200);

      const check2 = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token2}`);
      expect(check2.status).toBe(200);
    });
  });
});
