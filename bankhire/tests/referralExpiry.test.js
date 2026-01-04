/**
 * REFERRAL EXPIRY TESTS
 * Tests for referral expiration logic
 */

const { createTestApp } = require('./utils/testApp');
const {
  cleanDatabase,
  syncDatabase,
  createTestUser,
  createTestJob,
  Referral,
} = require('./utils/testHelpers');

describe('Referral Expiry Tests', () => {
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

  describe('Expired Referrals', () => {
    it('should identify referrals past their expiry date', async () => {
      // Create test data
      const admin = await createTestUser({ role: 'ADMIN' });
      const employee = await createTestUser({ role: 'EMPLOYEE' });
      const job = await createTestJob(admin.id);

      // Create a referral with past expiry
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const referral = await Referral.create({
        referrerId: employee.id,
        jobId: job.id,
        candidateMobile: '9999999999',
        status: 'REFERRED',
        expiresAt: pastDate,
      });

      // Query for expired referrals
      const expired = await Referral.findAll({
        where: {
          status: 'REFERRED',
          expiresAt: { [require('sequelize').Op.lt]: new Date() }
        }
      });

      expect(expired.length).toBeGreaterThanOrEqual(1);
      expect(expired.some(r => r.id === referral.id)).toBe(true);
    });

    it('should not include non-expired referrals', async () => {
      const admin = await createTestUser({ role: 'ADMIN' });
      const employee = await createTestUser({ role: 'EMPLOYEE' });
      const job = await createTestJob(admin.id);

      // Create a referral with future expiry
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const referral = await Referral.create({
        referrerId: employee.id,
        jobId: job.id,
        candidateMobile: '8888888888',
        status: 'REFERRED',
        expiresAt: futureDate,
      });

      // Query for expired referrals
      const expired = await Referral.findAll({
        where: {
          status: 'REFERRED',
          expiresAt: { [require('sequelize').Op.lt]: new Date() }
        }
      });

      expect(expired.some(r => r.id === referral.id)).toBe(false);
    });
  });
});
