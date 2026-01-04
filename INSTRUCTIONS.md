# BankHire Project Instructions

## Port Configuration
- **Backend API**: Always runs on port 3002
- **Web App**: Always runs on port 3000
- **Mobile App (Expo/Metro)**: Always runs on port 8081

## Important Notes
- Metro/mobile should always run on port 8081
- If already running, restart it but don't run on another port
- Use the `start-all.ps1` script to start all services properly

## Development Setup
1. Run `start-all.ps1` to start all services
2. Backend: http://localhost:3002
3. Web App: http://localhost:3000
4. Mobile App: http://localhost:8081

Tip: For large file uploads from a physical device, avoid using Expo "tunnel" (it can drop large multipart uploads). Use LAN mode and set the mobile API host explicitly:

- Find your machine IP (PowerShell): `(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi).IPAddress`
- Add it to Expo extra or set env var when starting Expo: `DEV_API_HOST=192.168.2.11 npx expo start --lan`
- Or set `DEV_API_HOST` in `app.json` under `expo.extra` to permanently force the mobile app to point to your machine on port 3002.

This will ensure large uploads go directly over your LAN and avoid tunnel limitations.

## Server Management
- All servers are started in background processes and will keep running
- Use `start-all.ps1` to restart all services if needed
- Processes will continue running even after the script completes

## Testing
- Use browser for easy testing of mobile app functionality
- Test on actual mobile device for native experience

## Environment
- OTP is hardcoded to "123456" for testing
- Database is seeded with sample data

---

# SECURITY INSTRUCTIONS

> **SECURITY IS THE TOP PRIORITY.**
> This application handles banking jobs, referrals, and sensitive resumes.

---

## ABSOLUTE RULES

1. **DO NOT** refactor or remove any existing code.
2. **DO NOT** change existing APIs or DB schemas.
3. **ONLY ADD** security layers, validations, and protections.
4. All changes must be backward compatible.
5. **Security > performance > features.**

---

## AUTHENTICATION SECURITY

### 1) OTP AUTH HARDENING
- OTP expiry: 5 minutes
- Max OTP attempts: 3 per OTP
- Max OTP requests: 5 per hour per mobile
- Hash OTP before storing (bcrypt or equivalent)
- Never log OTP or mobile numbers
- Invalidate OTP after successful verification

### 2) LOGIN PROTECTION
- Rate limit login and OTP APIs (IP + mobile)
- Block brute-force attempts temporarily
- Add requestId for every auth request

---

## TOKEN & SESSION SECURITY

### 3) JWT SECURITY
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
- Rotate refresh tokens on every use
- Store refresh tokens hashed
- Invalidate refresh token on logout

### 4) SESSION CONTROL
- One active session per device (optional)
- Detect token reuse and revoke tokens

---

## ROLE-BASED ACCESS CONTROL

### 5) STRICT ROLE ENFORCEMENT

**Roles:**
- CANDIDATE
- EMPLOYEE
- HR
- ADMIN

**Rules:**
- Candidate cannot access referral APIs
- Employee cannot apply for jobs
- HR cannot unlock payouts
- Admin only can override roles

**Implement middleware:**
```javascript
authorize(allowedRoles[])
```

Apply to **ALL** protected APIs.

---

## API & NETWORK SECURITY

### 6) API HARDENING
- HTTPS only
- Enable Helmet security headers
- Enable strict CORS (allow only trusted origins)
- Input validation for all APIs (Zod/Joi)
- Sanitize all user inputs
- Limit request body size

### 7) FILE UPLOAD SECURITY
- Resume max size: 2–5 MB
- Allow only PDF/DOC/DOCX
- Virus scan hook (optional)
- Reject executable or renamed files

---

## DATA & STORAGE SECURITY

### 8) DATABASE SAFETY
- Use soft deletes (isDeleted flag)
- Encrypt sensitive fields where applicable
- Mask mobile numbers in logs
- Add audit tables for:
  - Status changes
  - Referral decisions
  - Admin actions

### 9) RESUME STORAGE
- Store resumes in private cloud storage
- No public access
- Use time-limited signed URLs
- Validate access by role before issuing URL

---

## REFERRAL & MONEY PROTECTION

### 10) REFERRAL ABUSE PREVENTION
- Enforce daily/monthly referral limits
- Prevent duplicate referrals (mobile + job)
- Enforce referral expiry
- Lock referral payouts until retention cleared
- Require admin verification before payout

### 11) RETENTION SAFETY
- 30/90 day retention checks
- Auto-fail payout if candidate exits early
- Full audit trail for payout decisions

---

## FRAUD & ANOMALY DETECTION

### 12) SOFT FRAUD FLAGS

**Auto-flag:**
- Same resume hash multiple uploads
- Excessive referrals from one employee
- Multiple accounts from same IP/device

> ⚠️ Flags must **NOT** auto-block users. Admin review only.

---

## LOGGING & MONITORING

### 13) SAFE LOGGING
- Log requestId, endpoint, error code
- **NEVER log:**
  - OTP
  - Tokens
  - Full mobile numbers
  - Resume content

### 14) CRASH & ALERT SYSTEM
- Integrate Sentry (backend + frontend)
- Send email alerts on:
  - Crashes
  - Auth failures
  - File upload errors

---

## ADMIN & COMPLIANCE SECURITY

### 15) ADMIN PROTECTION
- Separate admin login
- Log every admin action
- Optional IP allow-list

### 16) USER RIGHTS
- Candidate can delete profile and resume
- Employee can withdraw referral
- Data deletion must revoke all access

---

## FINAL REQUIREMENTS

- ✅ No breaking changes
- ✅ Add clear comments for security logic
- ✅ Fail securely (deny by default)
- ✅ Prefer explicit checks over assumptions
- ✅ Keep implementation simple and readable

> **Implement all of the above before adding any new features.**

---

# CI/CD INSTRUCTIONS

## CURRENT STATE
- All automated tests are passing (100%)
- Codebase is stable
- Automated tests are reliable

## GOAL
Set up CI/CD so that:
- Tests run automatically on every push and pull request
- No broken code can be merged
- Quality is permanently locked

---

## ABSOLUTE RULES

1. DO NOT modify application logic.
2. DO NOT modify existing tests.
3. ONLY add CI/CD configuration.
4. If any test fails, the pipeline MUST fail.
5. CI must be fast, reliable, and deterministic.

---

## CI/CD PLATFORM

Use:
- GitHub Actions

Trigger:
- On every push to main branch
- On every pull request targeting main

---

## PIPELINE REQUIREMENTS

### 1) CHECKOUT CODE
- Checkout repository code
- Use latest stable GitHub Actions checkout

### 2) SETUP ENVIRONMENT
- Setup Node.js (LTS version)
- Cache node_modules for faster builds

### 3) BACKEND TEST PIPELINE
Steps:
- Install backend dependencies
- Setup test environment variables
- Run database migrations (test DB)
- Run ALL backend tests

If any backend test fails:
- Pipeline must fail immediately

### 4) FRONTEND TEST PIPELINE
Steps:
- Install frontend dependencies
- Build frontend in test mode
- Run Playwright tests (headless)

If any frontend test fails:
- Pipeline must fail

### 5) SECURITY & QUALITY CHECKS
Run:
- Linting (ESLint)
- Dependency vulnerability check (npm audit)

Fail pipeline on:
- Critical security vulnerabilities
- Lint errors

### 6) CLEAR FAILURE VISIBILITY
- Show clear logs on failure
- No silent skips
- No ignored errors

---

## BRANCH PROTECTION EXPECTATION

Ensure pipeline is suitable for:
- Branch protection rules
- Required status checks before merge
- Prevent direct pushes to main

---

## FINAL CI/CD REQUIREMENTS

- ✅ CI must be deterministic (no flaky steps)
- ✅ CI must run in under reasonable time
- ✅ CI must be easy to maintain
- ✅ CI must block bad code permanently

> **Deliver a complete GitHub Actions workflow that locks quality and prevents regressions forever.**

