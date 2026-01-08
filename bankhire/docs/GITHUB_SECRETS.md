# GitHub Actions: Required Repository Secrets

This repository requires a few repository secrets for CI and production deployments. Add them under: GitHub Repository → Settings → Secrets and variables → Actions → New repository secret.

Required secrets
- `DB_HOST` — Postgres host (production/CI)
- `DB_PORT` — Postgres port (usually `5432`)
- `DB_NAME` — Production database name
- `DB_USER` — Production DB user
- `DB_PASS` or `POSTGRES_PASSWORD` — Production DB password (some scripts expect `POSTGRES_PASSWORD`)
- `JWT_SECRET` — Secret used for signing JWTs
- `SMTP_USER` — (optional) SMTP user for email in production
- `SMTP_PASS` — (optional) SMTP password

Notes
- CI uses an in-memory sqlite fallback for tests by default (`NODE_ENV=test`). If you want CI to use Postgres, set the `DB_USE_POSTGRES` secret to `true` and provide the DB credentials above.
- Do NOT commit secret values into the repository. Use placeholders in `.env.example` and store real values only in repository secrets or your deployment environment.

PR for the test DB sync change
- Branch: `ci/fix/test-db-sync`
- PR URL (open in browser to review/merge): https://github.com/letsgosatya/bankhire/pull/new/ci/fix/test-db-sync

If you want me to push additional CI changes or create the PR programmatically, provide a GitHub token in the `GITHUB_TOKEN` or `GH_TOKEN` environment variable on this machine, or install the `gh` CLI and authenticate it.

---
Generated on: 2026-01-08
