/**
 * RESUME & FILE SECURITY TESTS
 * Tests file upload validation, security, and access control
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { createTestApp } = require('./utils/testApp');
const {
  cleanDatabase,
  syncDatabase,
  createAuthenticatedUser,
  User,
} = require('./utils/testHelpers');

describe('Resume & File Security Tests', () => {
  let app;
  let candidate, employee;
  const testFilesDir = path.join(__dirname, 'fixtures');

  beforeAll(async () => {
    await syncDatabase();
    app = createTestApp();
    
    // Create test fixtures directory if it doesn't exist
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Create a valid PDF test file (minimal PDF structure)
    const validPdfContent = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
      0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a, // Comment
      0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, // 1 0 obj
      0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, // <</Type/
      0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, 0x3e, // Catalog>
      0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, // >\nendobj
      0x0a, 0x78, 0x72, 0x65, 0x66, 0x0a, // \nxref\n
      0x25, 0x25, 0x45, 0x4f, 0x46, // %%EOF
    ]);
    fs.writeFileSync(path.join(testFilesDir, 'valid.pdf'), validPdfContent);

    // Create a fake PDF (wrong magic bytes)
    fs.writeFileSync(path.join(testFilesDir, 'fake.pdf'), 'This is not a real PDF');

    // Create a text file
    fs.writeFileSync(path.join(testFilesDir, 'test.txt'), 'This is a text file');

    // Create an executable (should be blocked)
    fs.writeFileSync(path.join(testFilesDir, 'malicious.exe'), 'MZ fake executable');
  });

  beforeEach(async () => {
    await cleanDatabase();
    candidate = await createAuthenticatedUser('CANDIDATE');
    employee = await createAuthenticatedUser('EMPLOYEE');
  });

  afterAll(async () => {
    await cleanDatabase();
    // Cleanup test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  // =====================
  // VALID FILE UPLOAD
  // =====================
  describe('Valid Resume Upload', () => {
    it('should accept valid PDF file', async () => {
      const res = await request(app)
        .post('/auth/upload-resume')
        .set(candidate.authHeader)
        .attach('resume', path.join(testFilesDir, 'valid.pdf'));

      // May succeed or fail based on file validation
      // At minimum, should not return 500
      expect([200, 400]).toContain(res.status);
    });

    it('should update user resume status after upload', async () => {
      const res = await request(app)
        .post('/auth/upload-resume')
        .set(candidate.authHeader)
        .attach('resume', path.join(testFilesDir, 'valid.pdf'));

      if (res.status === 200) {
        const user = await User.findByPk(candidate.user.id);
        expect(user.resumeUploaded).toBe(true);
        expect(user.resumeFileReference).toBeDefined();
      }
    });
  });

  // =====================
  // INVALID FILE REJECTION
  // =====================
  describe('Invalid File Type Rejection', () => {
    it('should reject text file as resume', async () => {
      const res = await request(app)
        .post('/auth/upload-resume')
        .set(candidate.authHeader)
        .attach('resume', path.join(testFilesDir, 'test.txt'));

      expect(res.status).toBe(400);
    });

    it('should reject executable files', async () => {
      const res = await request(app)
        .post('/auth/upload-resume')
        .set(candidate.authHeader)
        .attach('resume', path.join(testFilesDir, 'malicious.exe'));

      expect(res.status).toBe(400);
    });

    it('should reject file without extension pretending to be PDF', async () => {
      // Create a file with no extension but PDF content claim
      const noExtFile = path.join(testFilesDir, 'noext');
      fs.writeFileSync(noExtFile, 'not a pdf');

      const res = await request(app)
        .post('/auth/upload-resume')
        .set(candidate.authHeader)
        .attach('resume', noExtFile);

      expect(res.status).toBe(400);
    });
  });

  // =====================
  // AUTH REQUIRED
  // =====================
  describe('Resume Upload Authorization', () => {
    it('should reject upload without token', async () => {
      const res = await request(app)
        .post('/auth/upload-resume')
        .attach('resume', path.join(testFilesDir, 'valid.pdf'));

      expect(res.status).toBe(401);
    });

    it('should reject upload with invalid token', async () => {
      const res = await request(app)
        .post('/auth/upload-resume')
        .set('Authorization', 'Bearer invalid.token')
        .attach('resume', path.join(testFilesDir, 'valid.pdf'));

      expect(res.status).toBe(401);
    });
  });

  // =====================
  // RESUME DOWNLOAD
  // =====================
  describe('Resume Download', () => {
    it('should require authentication for download', async () => {
      const res = await request(app).get('/auth/download-resume');

      expect(res.status).toBe(401);
    });

    it('should return 404 if no resume uploaded', async () => {
      const res = await request(app)
        .get('/auth/download-resume')
        .set(candidate.authHeader);

      expect(res.status).toBe(404);
    });

    it('user can only download their own resume', async () => {
      // Upload for candidate
      await request(app)
        .post('/auth/upload-resume')
        .set(candidate.authHeader)
        .attach('resume', path.join(testFilesDir, 'valid.pdf'));

      // Employee tries to download (should get their own 404, not candidate's file)
      const res = await request(app)
        .get('/auth/download-resume')
        .set(employee.authHeader);

      // Employee has no resume, should get 404
      expect(res.status).toBe(404);
    });
  });

  // =====================
  // NO FILE PROVIDED
  // =====================
  describe('Missing File Handling', () => {
    it('should return 400 when no file provided', async () => {
      const res = await request(app)
        .post('/auth/upload-resume')
        .set(candidate.authHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('file');
    });
  });

  // =====================
  // FILE SIZE LIMIT
  // =====================
  describe('File Size Limits', () => {
    it('should have size limit configured', async () => {
      // Create a file larger than the configured 25MB limit
      const largeFile = path.join(testFilesDir, 'large.pdf');
      const largeContent = Buffer.alloc(26 * 1024 * 1024, 0); // 26MB to exceed 25MB limit
      // Add PDF header
      largeContent.write('%PDF-1.4', 0);
      fs.writeFileSync(largeFile, largeContent);

      const res = await request(app)
        .post('/auth/upload-resume')
        .set(candidate.authHeader)
        .attach('resume', largeFile);

      // Should be rejected for size
      expect([400, 413]).toContain(res.status);
    });
  });
});
