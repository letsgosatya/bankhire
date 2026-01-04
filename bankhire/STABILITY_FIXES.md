# BankHire Stability Fixes Summary

## Fixes Applied in This Session

### 1. **GET /jobs Route Made Public** ✅
- **File**: [src/routes/jobs.js](src/routes/jobs.js)
- **Issue**: GET /jobs required authentication, but job listings should be publicly browsable
- **Fix**: Removed `authMiddleware` from GET `/` route

### 2. **Auth Middleware Token Error Response** ✅
- **File**: [src/middlewares/authMiddleware.js](src/middlewares/authMiddleware.js)
- **Issue**: Invalid/expired tokens returned 400 (Bad Request) instead of 401 (Unauthorized)
- **Fix**: Changed error response from 400 to 401 for all token verification failures

### 3. **JSON Parsing Error Handler** ✅
- **File**: [src/middlewares/errorHandler.js](src/middlewares/errorHandler.js)
- **Issue**: Invalid JSON in request body returned 500 instead of 400
- **Fix**: Added specific handling for `SyntaxError` from `express.json()` to return 400

### 4. **Enhanced Error Handler** ✅
- **File**: [src/middlewares/errorHandler.js](src/middlewares/errorHandler.js)
- Added specific handlers for:
  - JSON parsing errors (400)
  - File size limit exceeded (413)
  - Unexpected file field (400)
  - CORS errors (403)

## Test Suite Created

### Comprehensive API Stability Tests
- **File**: [tools/stabilityTests.js](tools/stabilityTests.js)
- **Tests**: 35 test cases covering:
  - Health & Basic endpoints (3 tests)
  - Jobs public endpoints (2 tests)
  - Auth OTP send validation (5 tests)
  - Auth OTP verify validation (4 tests)
  - Auth protected endpoints (6 tests)
  - Referral access control (5 tests)
  - Admin access control (5 tests)
  - Jobs authenticated endpoints (3 tests)
  - Error handling (2 tests)

## How to Run Tests

```bash
cd bankhire
node tools/stabilityTests.js
```

**Note**: Running tests multiple times quickly may hit rate limits (429 responses). Restart the server to reset rate limit counters.

## API Behavior Summary

| Endpoint | Auth Required | Role Required |
|----------|--------------|---------------|
| GET /health | No | - |
| GET / | No | - |
| GET /jobs | No | - |
| POST /auth/send-otp | No | - |
| POST /auth/verify-otp | No | - |
| GET /auth/me | Yes | Any |
| PUT /auth/profile | Yes | Any |
| POST /auth/upload-resume | Yes | Any |
| GET /auth/download-resume | Yes | Any |
| GET /jobs/my | Yes | CANDIDATE |
| POST /jobs/:id/apply | Yes | CANDIDATE |
| POST /jobs | Yes | MANAGER/ADMIN |
| GET /referral/my-referrals | Yes | EMPLOYEE |
| GET /referral/my-earnings | Yes | EMPLOYEE |
| POST /referral/create | Yes | EMPLOYEE |
| GET /admin/* | Yes | ADMIN |

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad Request (validation error, invalid JSON) |
| 401 | Unauthorized (no token, invalid token, expired token) |
| 403 | Forbidden (insufficient role permissions, CORS blocked) |
| 404 | Not Found |
| 413 | Payload Too Large (file size exceeded) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 req/15 min per IP |
| OTP Send | 5 req/hour per IP+mobile |
| Login Attempts | 5 req/15 min per IP+mobile |
| Admin Routes | Additional limiter applied |
