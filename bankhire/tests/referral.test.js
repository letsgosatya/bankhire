/**
 * REFERRAL LOGIC TESTS
 * Tests referral creation, status changes, expiry, and payout logic
 */

const request = require('supertest');
const { createTestApp } = require('./utils/testApp');
const {
  cleanDatabase,
  syncDatabase,
  createAuthenticatedUser,
  createTestJob,
  createTestReferral,
  Referral,
  Earning,
} = require('./utils/testHelpers');

describe('Referral Logic Tests', () => {
  let app;
  let employee, admin;
  let testJob;

  beforeAll(async () => {
    await syncDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    employee = await createAuthenticatedUser('EMPLOYEE');
    admin = await createAuthenticatedUser('ADMIN');
    testJob = await createTestJob(admin.user.id);
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // =====================
  // REFERRAL CREATION
  // =====================
  describe('Referral Creation', () => {
    it('EMPLOYEE can create a referral', async () => {
      const res = await request(app)
        .post('/referral/create')
        .set(employee.authHeader)
        .send({
          candidateName: 'Test Candidate',
          candidateMobile: '9876543210',
          jobId: testJob.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.referrerId).toBe(employee.user.id);
      expect(res.body.jobId).toBe(testJob.id);
      expect(res.body.status).toBe('REFERRED');
    });

    it('should reject referral without candidate mobile', async () => {
      const res = await request(app)
        .post('/referral/create')
        .set(employee.authHeader)
        .send({ candidateName: 'Test', jobId: testJob.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject referral without job ID', async () => {
      const res = await request(app)
        .post('/referral/create')
        .set(employee.authHeader)
        .send({ candidateName: 'Test', candidateMobile: '9876543210' });

      expect(res.status).toBe(400);
    });

    it('should set expiry date on referral', async () => {
      const res = await request(app)
        .post('/referral/create')
        .set(employee.authHeader)
        .send({
          candidateName: 'Test Candidate 2',
          candidateMobile: '9876543211',
          jobId: testJob.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.expiresAt).toBeDefined();
      
      const expiryDate = new Date(res.body.expiresAt);
      const now = new Date();
      const daysDiff = (expiryDate - now) / (1000 * 60 * 60 * 24);
      
      // Should be approximately 30 days in the future
      expect(daysDiff).toBeGreaterThan(25);
      expect(daysDiff).toBeLessThan(35);
    });
  });

  // =====================
  // DUPLICATE REFERRAL PREVENTION
  // =====================
  describe('Duplicate Referral Prevention', () => {
    it('should auto-reject duplicate referral for same candidate+job', async () => {
      // First referral
      await request(app)
        .post('/referral/create')
        .set(employee.authHeader)
        .send({
          candidateName: 'Duplicate Test',
          candidateMobile: '9876543220',
          jobId: testJob.id,
        });

      // Duplicate referral
      const res = await request(app)
        .post('/referral/create')
        .set(employee.authHeader)
        .send({
          candidateName: 'Duplicate Test',
          candidateMobile: '9876543220',
          jobId: testJob.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.referral.status).toBe('REJECTED');
      expect(res.body.referral.rejectionReason).toContain('Already referred');
    });

    it('should allow same candidate for different jobs', async () => {
      const job2 = await createTestJob(admin.user.id, { title: 'Different Job' });

      // First referral
      await request(app)
        .post('/referral/create')
        .set(employee.authHeader)
        .send({
          candidateName: 'Multi Job Candidate',
          candidateMobile: '9876543221',
          jobId: testJob.id,
        });

      // Same candidate, different job
      const res = await request(app)
        .post('/referral/create')
        .set(employee.authHeader)
        .send({
          candidateName: 'Multi Job Candidate',
          candidateMobile: '9876543221',
          jobId: job2.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('REFERRED');
    });
  });

  // =====================
  // VIEW REFERRALS
  // =====================
  describe('View Referrals', () => {
    it('EMPLOYEE can view their own referrals', async () => {
      // Create some referrals
      await createTestReferral(employee.user.id, testJob.id);
      await createTestReferral(employee.user.id, testJob.id, { candidateMobile: '8888888888' });

      const res = await request(app)
        .get('/referral/my-referrals')
        .set(employee.authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('EMPLOYEE cannot see other employees referrals', async () => {
      const employee2 = await createAuthenticatedUser('EMPLOYEE');
      await createTestReferral(employee2.user.id, testJob.id);

      const res = await request(app)
        .get('/referral/my-referrals')
        .set(employee.authHeader);

      // Should only see own referrals
      res.body.forEach(referral => {
        expect(referral.referrerId).toBe(employee.user.id);
      });
    });
  });

  // =====================
  // REFERRAL WITHDRAWAL
  // =====================
  describe('Referral Withdrawal', () => {
    it('EMPLOYEE can withdraw their own referral', async () => {
      const referral = await createTestReferral(employee.user.id, testJob.id);

      const res = await request(app)
        .post('/referral/withdraw')
        .set(employee.authHeader)
        .send({ id: referral.id });

      expect(res.status).toBe(200);
      expect(res.body.referral.status).toBe('WITHDRAWN');
    });

    it('EMPLOYEE cannot withdraw another employees referral', async () => {
      const employee2 = await createAuthenticatedUser('EMPLOYEE');
      const referral = await createTestReferral(employee2.user.id, testJob.id);

      const res = await request(app)
        .post('/referral/withdraw')
        .set(employee.authHeader)
        .send({ id: referral.id });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent referral', async () => {
      const res = await request(app)
        .post('/referral/withdraw')
        .set(employee.authHeader)
        .send({ id: 99999 });

      expect(res.status).toBe(404);
    });
  });

  // =====================
  // HR REJECTION
  // =====================
  describe('Referral Rejection by Admin/HR', () => {
    it('ADMIN can reject referral with reason', async () => {
      const referral = await createTestReferral(employee.user.id, testJob.id);

      const res = await request(app)
        .post('/referral/reject')
        .set(admin.authHeader)
        .send({
          id: referral.id,
          reason: 'Candidate not qualified',
        });

      expect(res.status).toBe(200);
      expect(res.body.referral.status).toBe('REJECTED');
      expect(res.body.referral.rejectionReason).toBe('Candidate not qualified');
    });

    it('EMPLOYEE cannot reject referrals', async () => {
      const referral = await createTestReferral(employee.user.id, testJob.id);

      const res = await request(app)
        .post('/referral/reject')
        .set(employee.authHeader)
        .send({ id: referral.id, reason: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  // =====================
  // MARK AS JOINED & EARNINGS
  // =====================
  describe('Mark Referral as Joined', () => {
    it('ADMIN can mark referral as joined', async () => {
      const referral = await createTestReferral(employee.user.id, testJob.id);

      const res = await request(app)
        .post(`/referral/${referral.id}/mark-joined`)
        .set(admin.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('joined');

      // Verify status changed
      const updated = await Referral.findByPk(referral.id);
      expect(updated.status).toBe('JOINED');
    });

    it('should create earning record when marked as joined', async () => {
      const referral = await createTestReferral(employee.user.id, testJob.id);

      await request(app)
        .post(`/referral/${referral.id}/mark-joined`)
        .set(admin.authHeader);

      // Check earning created
      const earnings = await Earning.findAll({
        where: { referralId: referral.id },
      });

      expect(earnings.length).toBe(1);
      expect(earnings[0].userId).toBe(employee.user.id);
      expect(earnings[0].type).toBe('REFERRAL');
      expect(earnings[0].amount).toBeGreaterThan(0);
    });
  });

  // =====================
  // EARNINGS VIEW
  // =====================
  describe('View Earnings', () => {
    it('EMPLOYEE can view their earnings', async () => {
      const referral = await createTestReferral(employee.user.id, testJob.id);
      
      // Mark as joined to create earning
      await request(app)
        .post(`/referral/${referral.id}/mark-joined`)
        .set(admin.authHeader);

      const res = await request(app)
        .get('/referral/my-earnings')
        .set(employee.authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =====================
  // REFERRAL EXPIRY
  // =====================
  describe('Referral Expiry', () => {
    it('expired referrals should be marked as EXPIRED when fetching', async () => {
      // Create referral with past expiry date
      const referral = await createTestReferral(employee.user.id, testJob.id, {
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      // Fetching referrals should trigger expiry update
      await request(app)
        .get('/referral/my-referrals')
        .set(employee.authHeader);

      const updated = await Referral.findByPk(referral.id);
      expect(updated.status).toBe('EXPIRED');
    });
  });
});
