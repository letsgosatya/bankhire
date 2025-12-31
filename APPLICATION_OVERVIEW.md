# BankHire — Application Overview 🚀

## TL;DR
A small bank hiring platform with a Node/Express backend (`bankhire`), a React web admin (`bankhire-web`), and an Expo React Native mobile app (`bankhire-mobile`). Key flows: OTP login, resume upload, job browsing/apply, referrals & earnings, admin job management. This document summarizes structure, APIs, data models, seeds, test accounts, recent fixes, and prioritized feature ideas for future work.

---

## Project layout (high level) 📁
- start-all.ps1 — starts backend, web, and Expo mobile (ports: backend 3002, web 3000, metro 8081)
- bankhire/ (backend API)
  - src/app.js — express app
  - src/routes/* — route definitions (auth.js, jobs.js, admin.js, etc.)
  - src/controllers/* — business logic (authController, jobController, adminController)
  - src/models/* — Sequelize models (User, Job, Application, Referral, Earning)
  - config/database.js — DB config
  - seed.js — database seeding script (test users, jobs, referrals, earnings)
- bankhire-mobile/ (Expo app)
  - app/(tabs)/* — screens: home.tsx, jobs.tsx, profile.tsx, refer.tsx, etc.
  - context/AuthContext.tsx — auth/session management
  - services/api.ts — wrapper around backend APIs
  - utils/* — helpers (alert, i18n, etc.)
- bankhire-web/ (React web app)
  - src/pages/* — Home, Jobs, ApplicationDetails, Login
  - services/api.ts — web API wrappers

---

## Key API endpoints 🔌
- Auth
  - POST /auth/send-otp { mobile }
  - POST /auth/verify-otp { mobile, otp } → returns { token, user }
  - POST /auth/upload-resume (multipart/form-data, field `resume`) — authenticated
  - GET /auth/download-resume — authenticated
- Jobs
  - GET /jobs — list jobs
  - POST /jobs — create job (MANAGER)
  - POST /jobs/:id/apply — apply (CANDIDATE)
  - GET /jobs/my — get applications for logged-in candidate
  - GET /jobs/application/:id — get single application
  - PUT /jobs/application/:id/status — update (CANDIDATE update their application status flow)
- Admin
  - GET /admin/users
  - GET /admin/applications
  - POST /admin/application/:id/joined

Notes: mobile & web services mirror the backend routes in `bankhire/src/routes`.

---

## Data models (summary) 🧾
- User: id, mobile, role (ADMIN/MANAGER/EMPLOYEE/CANDIDATE), resumeUploaded, resumeFileReference, location, jobRole
- Job: id, title, bankName, location, description, createdBy
- Application: id, jobId, candidateId, status (PENDING, INTERVIEW, SELECTED, JOINED, ...)
- Referral: candidateMobile, jobId, referrerId, status
- Earning: userId, amount, type (REFERRAL, BONUS, COMMISSION), description

Relationships: Application belongsTo Job, Application belongsTo User (candidate); Referral connects referrer user to candidateMobile; Earnings belongTo User.

---

## Seed & Test Accounts 🧪
Seed script: `bankhire/seed.js` creates users, many jobs, applications, referrals, and earnings.
- Admin: 9999999999
- Manager: 8888888888
- Employee (seed added): 7777000001
- Example Candidates:
  - Candidate 1 (with resume): 8593986894 — heavy test candidate (applications & referrals)
  - Candidate 3 (no resume): 6666666666 — use for upload tests
- OTP for testing is **123456** (hardcoded in dev)

Recommended quick tests (curl/PowerShell):
- Send OTP: POST http://localhost:3002/auth/send-otp { "mobile":"8593986894" }
- Verify OTP: POST http://localhost:3002/auth/verify-otp { "mobile":"8593986894","otp":"123456" }
- Apply to job: POST http://localhost:3002/jobs/:id/apply (authenticated)

---

## Current UI flows (mobile & web) 📱💻
- Home: welcome, stats (Jobs Available, My Referrals), Resume status, Quick Actions (role-aware)
- Resume upload: picks file, uploads to `/auth/upload-resume`, shows confirmation screen with options (WhatsApp, request a call, check jobs)
- Jobs: list jobs, managers can post jobs, candidates can apply (apply triggers create application and success modal)
- Profile: candidates see My Applications; employees see My Referrals and My Earnings (visibility based on role)

Recent fixes: getMyApplications endpoint mismatch fixed, WhatsApp/call links made robust (use wa.me and open in new tab on web), role-based UI controls added.

---

## Known issues & observations ⚠️
- DB seeding failed when run without proper DB credentials in env (seed script expects a working DB connection). Fix: ensure .env configured or run with local Postgres accessible.
- On some embedded browsers clicking external links opened an in-app blank page (fixed by opening wa.me/web.whatsapp in new tab/window on web).
- Some TS checks initially flagged duplicate style keys — those were consolidated.

---

## Prioritized feature ideas (with rough effort) ⭐
High priority (impactful)
- Notifications (push + in-app) for application status updates — Medium
- Admin dashboard pages in web for richer job/applicant management — Medium
- Resume storage in cloud (S3/Blob) and CDN-backed downloads — Medium

Medium priority
- Resume parsing & auto-skill extraction (store parsed fields) — High
- Referral workflow improvements: resubmission, reminders, referral status timeline — Medium
- Role-based onboarding for Employee vs Candidate — Low

Low priority
- Multi-language UX (i18n already present in utils) — Low
- Analytics dashboard for hires, conversion funnel — Medium
- E2E tests and CI pipeline for front/backend — Medium

---

## How to run & debug locally 🛠️
- Start all services: run `.\start-all.ps1` from repo root (PowerShell)
- Backend logs: `bankhire` uses nodemon (logs visible in the terminal started by script)
- Use seeded accounts from seed.js (re-seed if DB reset required; ensure DB env vars correct)
- To verify the resume flow: login as candidate (OTP 123456) → Home → Upload Resume → confirm modal → press WhatsApp/Call buttons (web opens in new tab; native tries deep link)

---

## Next recommended steps (for product & dev)
1. Stabilize seeding/process for local dev: document required env vars and add safe fallback or a dev-only SQLite mode. ✅
2. Add integration tests for core flows: login, upload resume, apply job, getMyApplications. ✅
3. Implement resume storage in cloud + signed URL downloads (simpler than serving files directly).
4. Add admin UI enhancements and metrics to measure funnel conversions.

---

If you want, I can:
- Add this as `APPLICATION_OVERVIEW.md` to the repo (done) and create GitHub issues for the top 3 features.
- Run a deep verification script that: verifies OTP, uploads a sample resume, and confirms the wa.me link opens properly in a browser environment (I can automate this). 

Tell me which of the next steps you want me to take and I’ll proceed. ✅
