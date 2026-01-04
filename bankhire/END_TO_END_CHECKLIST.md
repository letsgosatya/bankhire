# BankHire — End-to-End Verification Checklist ✅

Purpose: A concise, actionable checklist to verify the application end-to-end (backend, mobile, web, tests) and collect evidence when something fails.

---

## Quick start / environment
- Run servers
  - Backend (bankhire): `cd bankhire && npm run dev` → http://localhost:3002
  - Web admin (bankhire-web): `cd bankhire-web && npm start` → http://localhost:3000
  - Expo (mobile): `cd bankhire-mobile && npx expo start --web --port 8081` → http://localhost:8081
- Useful: `.\start-all.ps1` (repo root) to start everything in dev.

---

## Backend checks 🔧
- Config
  - Ensure `.env` contains `USE_HARDCODED_OTP=true` for dev testing and restart backend.
- OTP flow
  - Send OTP: check backend console for either `HARDCODED OTP mode: OTP for <mobile>: 123456` or `No API key set. OTP for <mobile>: <otp>`.
  - Verify OTP: POST `/auth/verify-otp` should accept `123456` in hardcoded mode; check logs for `Hardcoded OTP accepted for testing`.
  - Local test: `node tools/runOtpLocalTest.js` should print success and store content.
- DB & migrations
  - Confirm migrations and backfills ran: `tools/addReferralResumeFields.js`, `tools/addEarningReferralId.js`, `tools/backfillEarningDescriptions.js`.
- Jobs & Referrals APIs
  - `GET /jobs`, `POST /jobs` (MANAGER), `POST /jobs/:id/apply` (CANDIDATE), `GET /jobs/my`.
  - `POST /referral/create`, `GET /referral/my-referrals`, `GET /referral/my-earnings`, `POST /referral/withdraw`.
- Logs: check `logs/verify_errors.log` for verification errors.

Key files:
- `src/services/otpService.js`, `src/controllers/authController.js`, `src/controllers/jobController.js`, `src/controllers/referralController.js`

---

## Mobile checks (bankhire-mobile) 📱
- Expo: ensure Metro runs on port 8081 and caches cleared when sitemap shows stale routes.
- Auth
  - Login flow: Send OTP → OTP screen (hint shows OTP in console in dev) → Verify with `123456` → token stored in AsyncStorage.
- Jobs
  - **Search bar visible to all users** and filters live.
  - Each job card has **View** button → opens modal with details.
    - Candidate: **Apply Now** triggers application flow.
    - Employee: **Refer this Job** navigates to refer flow with jobId.
    - Not logged in: shows login/info action.
- Referrals & Earnings
  - `/my-referrals` is canonical and visible only to `EMPLOYEE` role.
  - Profile links to referrals and earnings work and return expected data for test accounts.

Key files:
- `app/(tabs)/jobs.tsx`, `app/(tabs)/my-referrals/index.tsx`, `app/(auth)/otp.tsx`, `services/api.ts`

---

## Web checks (bankhire-web) 🌐
- Jobs & Applications pages
  - Jobs listing, apply button (for candidates), admin jobs and application details (ADMIN/MANAGER role) work.
- Admin
  - Admin pages must be guarded; confirm role-based access to applicant management and status updates.
- Routing
  - No stale `/referrals` or `/my-referrals` links visible in dev sitemap after restarting Expo.

Key files:
- `src/pages/Jobs.tsx`, `src/pages/ApplicationDetails.tsx`, `src/services/api.ts`

---

## Tests & verification ✅
- Automated
  - `node tools/runE2E.js` or `node tools/testReferralFlows.js` → expect `ok:true` in `tools/referral_test_result.json`.
  - `node tools/runOtpLocalTest.js` → should verify OTP behavior for samples.
- Manual
  - Candidate flow: register/login (OTP), upload resume, apply to job → check profile & My Applications.
  - Employee flow: create referral → withdraw → check earnings reflected.

---

## Acceptance criteria (ready for QA)
- OTP reproducible with `123456` in dev (logs show acceptance).
- Jobs: search & view modal works for all; apply and refer succeed for appropriate roles.
- Referrals: `my-referrals` hidden from non-EMPLOYEE; earnings appear correctly.
- E2E tests pass.
- No stale dev sitemap links after server restart.

---

## Troubleshooting & logs to collect 🧾
- Backend console + `logs/verify_errors.log` for OTP and verification errors.
- Expo & Metro logs for dev sitemap issues.
- Mobile console output (OTP/Jobs `console.log`) for reproduce steps.

---

## Optional follow-ups / improvements
- Backfill `Earnings.referralId` for older rows (if applicable).
- Add auto-focus and resend/cooldown UI to OTP screen.
- Optional: add full Job Details route (SEO/shareable), add automated E2E for job view modal.

---

If you'd like, I can also add a small test script that runs the quick API calls and summarizes the responses (node script). Tell me `create file` to add the markdown above or `add script` and I'll add a verification script.
