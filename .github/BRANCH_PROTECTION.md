# ==============================================================================
# Branch Protection Rules for BankHire
# ==============================================================================
# These settings should be configured in GitHub repository settings
# to enforce quality gates and prevent broken code from being merged.
# 
# Go to: Repository → Settings → Branches → Add rule
# ==============================================================================

## Branch name pattern: main

### Protect matching branches:

#### ✅ Require a pull request before merging
- Require approvals: 1 (or more for production)
- Dismiss stale pull request approvals when new commits are pushed: ✅
- Require review from Code Owners: Optional

#### ✅ Require status checks to pass before merging
- Require branches to be up to date before merging: ✅
- Required status checks:
  - `Backend Tests`
  - `Frontend E2E Tests`
  - `Security & Quality Checks`
  - `Build Verification`
  - `CI Success`

#### ✅ Require conversation resolution before merging
- All comments must be resolved before merging

#### ✅ Do not allow bypassing the above settings
- Even administrators must follow these rules

#### ❌ Do not allow force pushes
- Prevent rewriting history on main branch

#### ❌ Do not allow deletions
- Prevent accidental deletion of main branch

---

## How to Configure:

1. Go to your GitHub repository
2. Click **Settings** → **Branches**
3. Click **Add branch protection rule**
4. Enter `main` as the branch name pattern
5. Configure the settings above
6. Click **Create** or **Save changes**

---

## Required Status Checks

The following checks must pass before any PR can be merged:

| Check Name | Description |
|------------|-------------|
| `Backend Tests` | All 114 backend Jest tests |
| `Frontend E2E Tests` | All Playwright E2E tests |
| `Security & Quality Checks` | npm audit + ESLint |
| `Build Verification` | Production build success |
| `CI Success` | Final aggregated status |

---

## Enforcement

With these settings enabled:
- ❌ No direct pushes to main
- ❌ No merging without passing tests
- ❌ No merging with security vulnerabilities
- ❌ No merging without code review
- ✅ Quality is permanently locked
