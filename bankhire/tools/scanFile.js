const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateFileSignature, isAllowedExtension, isAllowedMimeType } = require('../src/middlewares/fileUploadMiddleware');
const securityConfig = require('../src/config/security');

if (process.argv.length < 3) {
  console.error('Usage: node tools/scanFile.js <path-to-file>');
  process.exit(1);
}

const filePath = process.argv[2];
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const stats = fs.statSync(filePath);
console.log('File:', filePath);
console.log('Size:', stats.size, 'bytes');
console.log('Extension:', path.extname(filePath));
console.log('Allowed extension?:', isAllowedExtension(path.basename(filePath)));

// Read first 16 bytes for signature check
const fd = fs.openSync(filePath, 'r');
const buf = Buffer.alloc(16);
fs.readSync(fd, buf, 0, 16, 0);
fs.closeSync(fd);

// Check against allowed MIME types
console.log('\nSignature checks:');
securityConfig.FILE_UPLOAD.ALLOWED_MIME_TYPES.forEach(mt => {
  const ok = validateFileSignature(buf, mt);
  console.log(`  ${mt}: ${ok ? 'MATCH' : 'no match'}`);
});

// Compute SHA-256 hash
const hash = crypto.createHash('sha256');
const rs = fs.createReadStream(filePath);
rs.on('data', d => hash.update(d));
rs.on('end', () => {
  console.log('\nSHA256:', hash.digest('hex'));
});

// If file is large, show that too
console.log('\nPolicy: max size (MB) =', securityConfig.FILE_UPLOAD.MAX_SIZE_MB);
if (stats.size > securityConfig.FILE_UPLOAD.MAX_SIZE_BYTES) console.warn('WARNING: File exceeds configured max size');

// Also try a heuristic MIME from extension
const ext = path.extname(filePath).toLowerCase();
const extToMime = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const expected = extToMime[ext];
if (expected) console.log('Expected MIME from extension:', expected, ' -> signature match:', validateFileSignature(buf, expected));
else console.log('No expected MIME for extension', ext);
