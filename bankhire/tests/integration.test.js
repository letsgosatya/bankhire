/**
 * INTEGRATION FLOW TESTS
 * Tests complete end-to-end user journeys
 */

const request = require('supertest');
const { createTestApp } = require('./utils/testApp');
const {
  cleanDatabase,
  syncDatabase,
  createTestUser,
  createTestJob,
  generateTestToken,
  User,
  Job,
  Application,
  Referral,
  Earning,
} = require('./utils/testHelpers');

describe('Integration Flow Tests', () => {
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
  // CANDIDATE FULL FLOW
  // =====================
  describe('Candidate Login → Apply Job Flow', () => {
    it('complete candidate journey: login → browse jobs → apply', async () => {
      const mobile = '9876543210';
      
      // 1. Send OTP
      const otpRes = await request(app)
        .post('/auth/send-otp')
        .send({ mobile });
      expect(otpRes.status).toBe(200);

      // 2. Verify OTP and get token
      const verifyRes = await request(app)
        .post('/auth/verify-otp')
        .send({ mobile, otp: '123456' });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.token).toBeDefined();
      expect(verifyRes.body.user.role).toBe('CANDIDATE');
      
      const token = verifyRes.body.token;
      const authHeader = { Authorization: `Bearer ${token}` };

      // 3. Browse jobs (public)
      const jobsRes = await request(app).get('/jobs');
      expect(jobsRes.status).toBe(200);
      expect(Array.isArray(jobsRes.body)).toBe(true);

      // 4. Create a job for applying (admin action)
      const admin = await createTestUser({ mobile: '9999999999', role: 'ADMIN' });
      const job = await createTestJob(admin.id, {
        title: 'Bank Teller',
        bankName: 'ABC Bank',
        location: 'Mumbai',
        description: 'Handle customer transactions',
      });

      // 5. Apply for job
      const applyRes = await request(app)
        .post(`/jobs/${job.id}/apply`)
        .set(authHeader);
      expect(applyRes.status).toBe(201);
      expect(applyRes.body.jobId).toBe(job.id);

      // 6. Check my applications
      const myAppsRes = await request(app)
        .get('/jobs/my')
        .set(authHeader);
      expect(myAppsRes.status).toBe(200);
      expect(myAppsRes.body.length).toBeGreaterThanOrEqual(1);
      
      const myApp = myAppsRes.body.find(a => a.jobId === job.id);
      expect(myApp).toBeDefined();
    });
  });

  // =====================
  // EMPLOYEE REFERRAL FLOW
  // =====================
  describe('Employee Login → Refer Candidate Flow', () => {
    it('complete employee journey: login → create referral → check status', async () => {
      // Setup: Create admin and job
      const admin = await createTestUser({ role: 'ADMIN' });
      const job = await createTestJob(admin.id);

      // 1. Employee login
      const mobile = '8888888888';
      await createTestUser({ mobile, role: 'EMPLOYEE' });
      
      await request(app).post('/auth/send-otp').send({ mobile });
      const verifyRes = await request(app)
        .post('/auth/verify-otp')
        .send({ mobile, otp: '123456' });
      
      expect(verifyRes.body.user.role).toBe('EMPLOYEE');
      const token = verifyRes.body.token;
      const authHeader = { Authorization: `Bearer ${token}` };

      // 2. Create referral
      const referralRes = await request(app)
        .post('/referral/create')
        .set(authHeader)
        .send({
          candidateName: 'Referred Candidate',
          candidateMobile: '7777777777',
          jobId: job.id,
        });
      expect(referralRes.status).toBe(201);
      expect(referralRes.body.status).toBe('REFERRED');

      // 3. Check my referrals
      const myRefsRes = await request(app)
        .get('/referral/my-referrals')
        .set(authHeader);
      expect(myRefsRes.status).toBe(200);
      expect(myRefsRes.body.length).toBeGreaterThanOrEqual(1);

      // 4. Check earnings (should be empty initially)
      const earningsRes = await request(app)
        .get('/referral/my-earnings')
        .set(authHeader);
      expect(earningsRes.status).toBe(200);
    });
  });

  // =====================
  // REFERRAL TO PAYOUT FLOW
  // =====================
  describe('Referral Approved → Candidate Joins → Payout Flow', () => {
    it('complete referral payout journey', async () => {
      // 1. Setup users
      const admin = await createTestUser({ role: 'ADMIN' });
      const adminToken = generateTestToken(admin);
      const adminAuth = { Authorization: `Bearer ${adminToken}` };

      const employee = await createTestUser({ role: 'EMPLOYEE' });
      const employeeToken = generateTestToken(employee);
      const employeeAuth = { Authorization: `Bearer ${employeeToken}` };

      // 2. Create job
      const job = await createTestJob(admin.id);

      // 3. Employee creates referral
      const createRefRes = await request(app)
        .post('/referral/create')
        .set(employeeAuth)
        .send({
          candidateName: 'Payout Test Candidate',
          candidateMobile: '6666666666',
          jobId: job.id,
        });
      expect(createRefRes.status).toBe(201);
      const referralId = createRefRes.body.id;

      // 4. Initial earnings check (should be empty)
      const initialEarnings = await request(app)
        .get('/referral/my-earnings')
        .set(employeeAuth);
      const initialCount = initialEarnings.body.length;

      // 5. Admin marks referral as joined
      const joinRes = await request(app)
        .post(`/referral/${referralId}/mark-joined`)
        .set(adminAuth);
      expect(joinRes.status).toBe(200);

      // 6. Verify referral status changed
      const referral = await Referral.findByPk(referralId);
      expect(referral.status).toBe('JOINED');

      // 7. Verify earning created
      const finalEarnings = await request(app)
        .get('/referral/my-earnings')
        .set(employeeAuth);
      expect(finalEarnings.body.length).toBe(initialCount + 1);

      const newEarning = finalEarnings.body.find(e => e.referralId === referralId);
      expect(newEarning).toBeDefined();
      expect(newEarning.type).toBe('REFERRAL');
      expect(newEarning.amount).toBeGreaterThan(0);
    });
  });

  // =====================
  // REFERRAL REJECTION FLOW
  // =====================
  describe('Referral Rejection Flow', () => {
    it('HR rejects referral with reason', async () => {
      // Setup
      const admin = await createTestUser({ role: 'ADMIN' });
      const adminToken = generateTestToken(admin);
      const adminAuth = { Authorization: `Bearer ${adminToken}` };

      const employee = await createTestUser({ role: 'EMPLOYEE' });
      const employeeToken = generateTestToken(employee);
      const employeeAuth = { Authorization: `Bearer ${employeeToken}` };

      const job = await createTestJob(admin.id);

      // 1. Create referral
      const createRes = await request(app)
        .post('/referral/create')
        .set(employeeAuth)
        .send({ candidateName: 'Rejection Test', candidateMobile: '5555555555', jobId: job.id });
      const referralId = createRes.body.id;

      // 2. Admin rejects with reason
      const rejectRes = await request(app)
        .post('/referral/reject')
        .set(adminAuth)
        .send({
          id: referralId,
          reason: 'Candidate does not meet minimum qualifications',
        });
      expect(rejectRes.status).toBe(200);

      // 3. Verify status and reason
      const referral = await Referral.findByPk(referralId);
      expect(referral.status).toBe('REJECTED');
      expect(referral.rejectionReason).toContain('qualifications');

      // 4. No earning should be created
      const earnings = await Earning.findAll({ where: { referralId } });
      expect(earnings.length).toBe(0);
    });
  });

  // =====================
  // REFERRAL WITHDRAWAL FLOW
  // =====================
  describe('Referral Withdrawal Flow', () => {
    it('employee withdraws own referral', async () => {
      // Setup
      const admin = await createTestUser({ role: 'ADMIN' });
      const employee = await createTestUser({ role: 'EMPLOYEE' });
      const employeeToken = generateTestToken(employee);
      const employeeAuth = { Authorization: `Bearer ${employeeToken}` };

      const job = await createTestJob(admin.id);

      // 1. Create referral
      const createRes = await request(app)
        .post('/referral/create')
        .set(employeeAuth)
        .send({ candidateName: 'Withdraw Test', candidateMobile: '4444444444', jobId: job.id });
      const referralId = createRes.body.id;

      // 2. Withdraw referral
      const withdrawRes = await request(app)
        .post('/referral/withdraw')
        .set(employeeAuth)
        .send({ id: referralId });
      expect(withdrawRes.status).toBe(200);

      // 3. Verify status
      const referral = await Referral.findByPk(referralId);
      expect(referral.status).toBe('WITHDRAWN');
    });
  });

  // =====================
  // MULTI-ROLE INTERACTION
  // =====================
  describe('Multi-Role Interaction', () => {
    it('admin views all users, jobs, referrals, applications', async () => {
      // Create diverse data
      const admin = await createTestUser({ role: 'ADMIN' });
      const adminToken = generateTestToken(admin);
      const adminAuth = { Authorization: `Bearer ${adminToken}` };

      const candidate = await createTestUser({ role: 'CANDIDATE' });
      const employee = await createTestUser({ role: 'EMPLOYEE' });
      
      const job = await createTestJob(admin.id);
      await Application.create({ candidateId: candidate.id, jobId: job.id, status: 'APPLIED' });
      await Referral.create({
        referrerId: employee.id,
        jobId: job.id,
        candidateMobile: '3333333333',
        status: 'REFERRED',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Admin checks all endpoints
      const usersRes = await request(app).get('/admin/users').set(adminAuth);
      expect(usersRes.status).toBe(200);
      expect(usersRes.body.length).toBeGreaterThanOrEqual(3); // admin, candidate, employee

      const jobsRes = await request(app).get('/admin/jobs').set(adminAuth);
      expect(jobsRes.status).toBe(200);

      const appsRes = await request(app).get('/admin/applications').set(adminAuth);
      expect(appsRes.status).toBe(200);

      const refsRes = await request(app).get('/admin/referrals').set(adminAuth);
      expect(refsRes.status).toBe(200);
    });
  });
});
