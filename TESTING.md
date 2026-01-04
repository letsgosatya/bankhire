# BankHire Automated Testing Setup

## Quick Start

### First-Time Setup
```bash
cd bankhire
npm run setup-test-db   # Create test database
npm test                # Run all tests
```

### Run All Backend Tests
```bash
cd bankhire
npm test
```

### Run Specific Test Suites
```bash
# Auth & OTP tests
npm run test:auth

# Role-based access tests
npm run test:roles

# Referral business logic tests
npm run test:referral

# Full integration tests
npm run test:integration

# With coverage report
npm run test:coverage
```

### Run Frontend E2E Tests
```bash
cd bankhire-web
npm run test:e2e          # Headless mode
npm run test:e2e:headed   # See browser
npm run test:e2e:report   # View HTML report
```

## Test Structure

### Backend Tests (`bankhire/tests/`)

| File | Purpose | Coverage |
|------|---------|----------|
| `auth.test.js` | OTP send/verify, JWT validation, profile updates | 15+ tests |
| `role-access.test.js` | RBAC enforcement for all roles | 20+ tests |
| `referral.test.js` | Referral CRUD, earnings, expiry | 15+ tests |
| `error-handling.test.js` | 400/401/403/404/500 responses | 15+ tests |
| `resume.test.js` | File upload/download security | 12+ tests |
| `application.test.js` | Job listing, applications | 15+ tests |
| `integration.test.js` | End-to-end user flows | 10+ tests |

### Frontend Tests (`bankhire-web/tests/e2e/`)

| File | Purpose |
|------|---------|
| `login.spec.js` | Login form, OTP flow, errors |
| `navigation.spec.js` | Page access, auth redirects |
| `jobs.spec.js` | Job listing, navigation |

## Test Configuration

### Backend (Jest)
- Config: `bankhire/jest.config.js`
- Setup: `bankhire/tests/setup.js`
- Utilities: `bankhire/tests/utils/`
- Environment: `bankhire/.env.test`

### Frontend (Playwright)
- Config: `bankhire-web/playwright.config.js`
- Tests: `bankhire-web/tests/e2e/`

## CI/CD Integration

### GitHub Actions
The workflow at `.github/workflows/ci.yml` runs:
1. Backend tests with PostgreSQL service
2. Frontend Playwright tests
3. Security audit
4. Build verification

### Pre-commit Hook
Enable with:
```bash
git config core.hooksPath .githooks
```

## Test Database

Tests use a separate database (`bankhire_test`) configured in `.env.test`.
Each test file cleans the database before tests to ensure isolation.

## Key Features

1. **OTP Testing**: Uses `USE_HARDCODED_OTP=true` with OTP `123456`
2. **Rate Limiting Disabled**: Test app skips rate limiting
3. **Database Isolation**: Separate test DB, cleanup between tests
4. **Coverage Reports**: Generated with `npm run test:coverage`
5. **CI Integration**: Automatic on push/PR to main/develop

## Troubleshooting

### Tests timing out
- Increase timeout in `jest.config.js` or individual test
- Check database connection

### Database errors
- Ensure PostgreSQL is running
- Create test database: `createdb bankhire_test`
- Check `.env.test` credentials

### Playwright browser errors
- Run `npx playwright install chromium`
- Check if frontend is running for E2E tests
