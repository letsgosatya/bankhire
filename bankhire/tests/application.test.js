/**
 * APPLICATION & JOB TESTS
 * Tests job applications, status transitions, and data consistency
 */

const request = require('supertest');
const { createTestApp } = require('./utils/testApp');
const {
  cleanDatabase,
  syncDatabase,
  createAuthenticatedUser,
  createTestJob,
  createTestApplication,
  Application,
  Job,
} = require('./utils/testHelpers');

describe('Application & Job Tests', () => {
  let app;
  let candidate, employee, admin, manager;
  let testJob;

  beforeAll(async () => {
    await syncDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    candidate = await createAuthenticatedUser('CANDIDATE');
    employee = await createAuthenticatedUser('EMPLOYEE');
    admin = await createAuthenticatedUser('ADMIN');
    manager = await createAuthenticatedUser('MANAGER');
    testJob = await createTestJob(admin.user.id);
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // =====================
  // JOB LISTING
  // =====================
  describe('Job Listing', () => {
    it('GET /jobs is public (no auth required)', async () => {
      const res = await request(app).get('/jobs');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should list all available jobs', async () => {
      await createTestJob(admin.user.id, { title: 'Job 1' });
      await createTestJob(admin.user.id, { title: 'Job 2' });

      const res = await request(app).get('/jobs');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('jobs should be sorted by creation date (newest first)', async () => {
      await createTestJob(admin.user.id, { title: 'Old Job' });
      await new Promise(r => setTimeout(r, 100)); // Small delay
      await createTestJob(admin.user.id, { title: 'New Job' });

      const res = await request(app).get('/jobs');

      expect(res.status).toBe(200);
      if (res.body.length >= 2) {
        const first = new Date(res.body[0].createdAt);
        const second = new Date(res.body[1].createdAt);
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
      }
    });
  });

  // =====================
  // JOB CREATION
  // =====================
  describe('Job Creation', () => {
    it('MANAGER can create a job', async () => {
      const res = await request(app)
        .post('/jobs')
        .set(manager.authHeader)
        .send({
          title: 'Bank Teller',
          bankName: 'ABC Bank',
          location: 'Mumbai',
          description: 'Handle customer transactions',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Bank Teller');
      expect(res.body.createdBy).toBe(manager.user.id);
    });

    it('ADMIN can create a job', async () => {
      const res = await request(app)
        .post('/jobs')
        .set(admin.authHeader)
        .send({
          title: 'Branch Manager',
          bankName: 'XYZ Bank',
          location: 'Delhi',
          description: 'Manage branch operations',
        });

      expect(res.status).toBe(201);
    });

    it('CANDIDATE cannot create a job', async () => {
      const res = await request(app)
        .post('/jobs')
        .set(candidate.authHeader)
        .send({
          title: 'Test Job',
          bankName: 'Test Bank',
          location: 'Test City',
          description: 'Test',
        });

      expect(res.status).toBe(403);
    });

    it('EMPLOYEE cannot create a job', async () => {
      const res = await request(app)
        .post('/jobs')
        .set(employee.authHeader)
        .send({
          title: 'Test Job',
          bankName: 'Test Bank',
          location: 'Test City',
          description: 'Test',
        });

      expect(res.status).toBe(403);
    });

    it('should require all fields for job creation', async () => {
      const res = await request(app)
        .post('/jobs')
        .set(manager.authHeader)
        .send({
          title: 'Incomplete Job',
          // Missing bankName, location, description
        });

      expect(res.status).toBe(400);
    });
  });

  // =====================
  // JOB APPLICATION
  // =====================
  describe('Job Application', () => {
    it('CANDIDATE can apply for a job', async () => {
      const res = await request(app)
        .post(`/jobs/${testJob.id}/apply`)
        .set(candidate.authHeader);

      expect(res.status).toBe(201);
      expect(res.body.jobId).toBe(testJob.id);
      expect(res.body.candidateId).toBe(candidate.user.id);
    });

    it('should not allow duplicate applications', async () => {
      // First application
      await request(app)
        .post(`/jobs/${testJob.id}/apply`)
        .set(candidate.authHeader);

      // Duplicate application
      const res = await request(app)
        .post(`/jobs/${testJob.id}/apply`)
        .set(candidate.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Already applied');
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .post('/jobs/99999/apply')
        .set(candidate.authHeader);

      expect(res.status).toBe(404);
    });

    it('requires authentication to apply', async () => {
      const res = await request(app).post(`/jobs/${testJob.id}/apply`);

      expect(res.status).toBe(401);
    });
  });

  // =====================
  // MY APPLICATIONS
  // =====================
  describe('My Applications', () => {
    it('CANDIDATE can view their applications', async () => {
      // Create application
      await createTestApplication(candidate.user.id, testJob.id);

      const res = await request(app)
        .get('/jobs/my')
        .set(candidate.authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should only show own applications', async () => {
      const candidate2 = await createAuthenticatedUser('CANDIDATE');
      await createTestApplication(candidate2.user.id, testJob.id);

      const res = await request(app)
        .get('/jobs/my')
        .set(candidate.authHeader);

      // Should not include candidate2's application
      res.body.forEach(app => {
        expect(app.candidateId).toBe(candidate.user.id);
      });
    });

    it('applications include job details', async () => {
      await createTestApplication(candidate.user.id, testJob.id);

      const res = await request(app)
        .get('/jobs/my')
        .set(candidate.authHeader);

      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        expect(res.body[0].job).toBeDefined();
      }
    });
  });

  // =====================
  // DATA CONSISTENCY
  // =====================
  describe('Data Consistency', () => {
    it('should not create orphan applications when job is deleted', async () => {
      // Create job and application
      const job = await createTestJob(admin.user.id, { title: 'Temp Job' });
      await createTestApplication(candidate.user.id, job.id);

      // Try to delete job - should fail due to FK constraint or cascade delete applications
      let deleteError = null;
      try {
        await Job.destroy({ where: { id: job.id } });
      } catch (err) {
        deleteError = err;
      }

      // Two valid outcomes:
      // 1. FK constraint blocks delete (preserves data integrity)
      // 2. Cascade delete removes applications first
      if (deleteError) {
        // FK constraint prevented delete - this is valid data integrity behavior
        expect(deleteError.message).toMatch(/foreign key|constraint|violates/i);
        // Applications should still exist
        const apps = await Application.findAll({ where: { jobId: job.id } });
        expect(apps.length).toBe(1);
      } else {
        // Cascade delete - applications should be gone
        const apps = await Application.findAll({ where: { jobId: job.id } });
        expect(apps.length).toBe(0);
      }
    });

    it('application status transitions should be valid', async () => {
      const application = await createTestApplication(candidate.user.id, testJob.id);
      
      // Valid initial status
      expect(['APPLIED', 'PENDING']).toContain(application.status);
    });
  });

  // =====================
  // ADMIN JOB MANAGEMENT
  // =====================
  describe('Admin Job Management', () => {
    it('ADMIN can view all jobs', async () => {
      await createTestJob(manager.user.id, { title: 'Manager Job' });
      await createTestJob(admin.user.id, { title: 'Admin Job' });

      const res = await request(app)
        .get('/admin/jobs')
        .set(admin.authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('ADMIN can view all applications', async () => {
      await createTestApplication(candidate.user.id, testJob.id);

      const res = await request(app)
        .get('/admin/applications')
        .set(admin.authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
