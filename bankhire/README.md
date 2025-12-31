# BankHire Backend

A Node.js Express backend for BankHire, a banking job and referral platform.

## Setup

1. Install dependencies: `npm install`
2. Set up PostgreSQL database and update `.env` with credentials.
3. Run the app: `npm start`

## API Endpoints

- `GET /health` - Health check
- `POST /auth/send-otp` - Send OTP to mobile
- `POST /auth/verify-otp` - Verify OTP and login
- `POST /jobs` - Create job (MANAGER only)
- `GET /jobs` - List all jobs
- `POST /jobs/:id/apply` - Apply for job (CANDIDATE only)
- `POST /referral/create` - Create referral (EMPLOYEE)
- `GET /referral/my-referrals` - Get my referrals
- `POST /admin/referral/mark-joined` - Mark referral as joined (ADMIN)
- `GET /admin/users` - List all users (ADMIN)
- `GET /admin/jobs` - List all jobs (ADMIN)
- `GET /admin/applications` - List all applications (ADMIN)
- `POST /admin/application/:id/joined` - Mark application as joined (ADMIN)

## Features

- OTP-based authentication with JWT
- Role-based access control (CANDIDATE, EMPLOYEE, MANAGER, ADMIN)
- Job posting and application system
- Internal referral system with earnings tracking
- Admin dashboard for management
- Global error handling with email alerts
- Scheduled referral expiry job (service checks expired referrals and marks them EXPIRED). Configure interval via env var `REFERRAL_EXPIRY_CHECK_INTERVAL_MS` (default: 60000 ms in development)
- Admin endpoints: `GET /admin/referrals` (ADMIN role) to list referrals **(supports ?status=...)**, `POST /admin/referral/:id/expire`, and `POST /admin/referral/:id/refund` to manage referrals manually.
- E2E helper: `node tools/runE2E.js` will seed the DB, start the backend in-process, run `tools/testReferralFlows.js`, dump the referral DB, and exit with appropriate code. Use `npm run test:e2e` to invoke it.
- CI: GitHub Actions workflow `.github/workflows/referral-e2e.yml` runs seed + E2E tests and uploads artifacts.

## Environment Variables

- `PORT` - Server port (default 3001)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` - Database config
- `JWT_SECRET` - JWT signing secret
- `EMAIL_USER`, `EMAIL_PASS` - Email credentials
- `ADMIN_EMAIL` - Admin email for alerts
- `REFERRAL_REWARD` - Referral reward amount