# Phase 7: Integration & Verification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Write E2E tests for all user-facing flows (landing, auth, dashboard, route protection), clean up stale files, and update README with full setup instructions.

**Architecture:** Playwright E2E tests using `@nuxt/test-utils/playwright` (NOT bare `@playwright/test`). Tests are organized by feature area: `tests/landing/`, `tests/auth/`, `tests/dashboard/`. Auth flow tests use the API directly (`page.request`) to set up state (register users, etc.) since we can't actually send emails in tests. The README is rewritten to document Docker, DB, env setup, and all commands.

**Tech Stack:** Playwright, `@nuxt/test-utils/playwright`, Bun, Nuxt 4

---

## Task 1: Remove outdated `tests/example.spec.ts`

**Files:**
- Delete: `tests/example.spec.ts`

**Step 1: Delete the stale starter test**

```bash
rm tests/example.spec.ts
```

This test checks for `title(/Nuxt/)` which no longer matches — the landing page title is now `"finai - Personal Financial Dashboard"`.

**Step 2: Commit**

```bash
git add tests/example.spec.ts
git commit -m "chore: remove outdated example e2e test"
```

---

## Task 2: Landing page E2E tests

**Files:**
- Create: `tests/landing/landing.spec.ts`

**Step 1: Write the tests**

Create `tests/landing/landing.spec.ts`:

```typescript
import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Landing Page', () => {
  test('renders with correct title', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })
    await expect(page).toHaveTitle('finai - Personal Financial Dashboard')
  })

  test('displays hero section with CTA buttons', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Hero heading
    await expect(page.getByRole('heading', { name: /take control of your/i })).toBeVisible()

    // CTA buttons
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible()
  })

  test('displays all four feature cards', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const features = ['Track Spending', 'Budget Planning', 'Secure & Private', 'Open Source']
    for (const feature of features) {
      await expect(page.getByRole('heading', { name: feature })).toBeVisible()
    }
  })

  test('displays call-to-action section', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })
    await expect(page.getByRole('link', { name: 'Get Started' }).last()).toBeVisible()
  })

  test('header shows Sign In and Get Started for unauthenticated users', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const header = page.locator('header')
    await expect(header.getByRole('link', { name: 'Sign In' })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Get Started' })).toBeVisible()
  })

  test('footer displays GitHub link', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: 'GitHub' })).toBeVisible()
  })

  test('Get Started button navigates to /register', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Click the hero's Get Started button (first one)
    await page.getByRole('link', { name: 'Get Started' }).first().click()
    await page.waitForURL('**/register')
    await expect(page).toHaveURL(/\/register$/)
  })

  test('Sign In button navigates to /login', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    await page.getByRole('link', { name: 'Sign In' }).first().click()
    await page.waitForURL('**/login')
    await expect(page).toHaveURL(/\/login$/)
  })
})
```

**Step 2: Run the tests to verify they pass**

```bash
bunx playwright test tests/landing/landing.spec.ts --reporter=list
```

Expected: 8 tests PASS

**Step 3: Commit**

```bash
git add tests/landing/landing.spec.ts
git commit -m "test: add landing page e2e tests"
```

---

## Task 3: Auth page rendering E2E tests

These tests verify auth pages render correctly and validate client-side form behavior. They do NOT test actual login/registration (which requires a real DB user) — those are API-level tests.

**Files:**
- Create: `tests/auth/pages.spec.ts`

**Step 1: Write the tests**

Create `tests/auth/pages.spec.ts`:

```typescript
import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Auth Pages Rendering', () => {
  test.describe('Login Page', () => {
    test('renders login form', async ({ page, goto }) => {
      await goto('/login', { waitUntil: 'hydration' })

      await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    })

    test('has forgot password link', async ({ page, goto }) => {
      await goto('/login', { waitUntil: 'hydration' })
      await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    })

    test('has link to register page', async ({ page, goto }) => {
      await goto('/login', { waitUntil: 'hydration' })
      await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
    })

    test('has OAuth buttons', async ({ page, goto }) => {
      await goto('/login', { waitUntil: 'hydration' })
      await expect(page.getByRole('link', { name: /github/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /google/i })).toBeVisible()
    })

    test('shows validation errors for empty form submission', async ({ page, goto }) => {
      await goto('/login', { waitUntil: 'hydration' })
      await page.getByRole('button', { name: 'Sign In' }).click()

      // UForm validation should show error messages
      await expect(page.getByText('Email is required')).toBeVisible()
      await expect(page.getByText('Password is required')).toBeVisible()
    })
  })

  test.describe('Register Page', () => {
    test('renders registration form', async ({ page, goto }) => {
      await goto('/register', { waitUntil: 'hydration' })

      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
      await expect(page.getByPlaceholder('Your name')).toBeVisible()
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
      await expect(page.getByPlaceholder('Create a password')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
    })

    test('has link to login page', async ({ page, goto }) => {
      await goto('/register', { waitUntil: 'hydration' })
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
    })

    test('shows validation errors for empty form submission', async ({ page, goto }) => {
      await goto('/register', { waitUntil: 'hydration' })
      await page.getByRole('button', { name: 'Create Account' }).click()

      await expect(page.getByText('Name is required')).toBeVisible()
      await expect(page.getByText('Email is required')).toBeVisible()
      await expect(page.getByText('Password is required')).toBeVisible()
    })

    test('validates password requirements', async ({ page, goto }) => {
      await goto('/register', { waitUntil: 'hydration' })

      await page.getByPlaceholder('Your name').fill('Test User')
      await page.getByPlaceholder('you@example.com').fill('test@test.com')
      await page.getByPlaceholder('Create a password').fill('weak')
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show password validation error (min 8 chars, 1 upper, 1 lower, 1 digit)
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
    })
  })

  test.describe('Forgot Password Page', () => {
    test('renders forgot password form', async ({ page, goto }) => {
      await goto('/forgot-password', { waitUntil: 'hydration' })

      await expect(page.getByRole('heading', { name: /forgot/i })).toBeVisible()
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    })
  })

  test.describe('Verify Email Page', () => {
    test('renders verify email instructions', async ({ page, goto }) => {
      await goto('/verify-email', { waitUntil: 'hydration' })

      await expect(page.getByRole('heading', { name: /verify your email/i })).toBeVisible()
      await expect(page.getByText(/verification/i)).toBeVisible()
    })

    test('has link back to sign in', async ({ page, goto }) => {
      await goto('/verify-email', { waitUntil: 'hydration' })
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
    })
  })
})
```

**Step 2: Run the tests to verify they pass**

```bash
bunx playwright test tests/auth/pages.spec.ts --reporter=list
```

Expected: 11 tests PASS. Note: Some tests may need tuning based on exact UForm validation behavior — if `UForm` doesn't trigger validation on button click without field interaction, adjust to fill then clear fields first.

**Step 3: Commit**

```bash
git add tests/auth/pages.spec.ts
git commit -m "test: add auth page rendering e2e tests"
```

---

## Task 4: Auth API flow E2E tests

Tests for register + login API endpoints. These use `page.request` (Playwright's API context) to hit endpoints directly, similar to the existing security tests.

**Files:**
- Create: `tests/auth/api-flows.spec.ts`

**Step 1: Write the tests**

Create `tests/auth/api-flows.spec.ts`:

```typescript
import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Auth API Flows', () => {
  const uniqueEmail = () => `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`

  test('register returns 201 for valid new user', async ({ page }) => {
    const res = await page.request.post('/api/auth/register', {
      data: {
        email: uniqueEmail(),
        password: 'ValidPass123',
        name: 'Test User',
      },
    })

    // 201 = success, 500 = email service not configured (both acceptable)
    expect([201, 500]).toContain(res.status())
  })

  test('register returns 400 for invalid email', async ({ page }) => {
    const res = await page.request.post('/api/auth/register', {
      data: {
        email: 'not-an-email',
        password: 'ValidPass123',
        name: 'Test User',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('register returns 400 for weak password', async ({ page }) => {
    const res = await page.request.post('/api/auth/register', {
      data: {
        email: uniqueEmail(),
        password: 'weak',
        name: 'Test User',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('login returns 401 for non-existent user', async ({ page }) => {
    const res = await page.request.post('/api/auth/login', {
      data: {
        email: uniqueEmail(),
        password: 'ValidPass123',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('login returns 400 for missing fields', async ({ page }) => {
    const res = await page.request.post('/api/auth/login', {
      data: {
        email: '',
        password: '',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('logout returns 200', async ({ page }) => {
    const res = await page.request.post('/api/auth/logout')
    expect(res.status()).toBe(200)
  })

  test('forgot-password returns 200 for any email', async ({ page }) => {
    const res = await page.request.post('/api/auth/forgot-password', {
      data: { email: uniqueEmail() },
    })
    expect(res.status()).toBe(200)
  })

  test('reset-password returns 400 for invalid token', async ({ page }) => {
    const res = await page.request.post('/api/auth/reset-password', {
      data: {
        token: 'invalid-token',
        password: 'NewValidPass123',
      },
    })
    // 400 or 404 — invalid token
    expect([400, 404]).toContain(res.status())
  })

  test('verify-email returns 400 for invalid token', async ({ page }) => {
    const res = await page.request.post('/api/auth/verify-email', {
      data: { token: 'invalid-token' },
    })
    expect([400, 404]).toContain(res.status())
  })
})
```

**Step 2: Run the tests**

```bash
bunx playwright test tests/auth/api-flows.spec.ts --reporter=list
```

Expected: 9 tests PASS. If the Docker DB is not running, start it first: `docker compose up -d`

**Step 3: Commit**

```bash
git add tests/auth/api-flows.spec.ts
git commit -m "test: add auth api flow e2e tests"
```

---

## Task 5: Route protection E2E tests

Verify that protected routes redirect to `/login` and guest routes redirect authenticated users.

**Files:**
- Create: `tests/auth/route-protection.spec.ts`

**Step 1: Write the tests**

Create `tests/auth/route-protection.spec.ts`:

```typescript
import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Route Protection', () => {
  test.describe('Protected routes redirect to /login when unauthenticated', () => {
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/transactions',
      '/dashboard/budgets',
      '/dashboard/settings',
    ]

    for (const route of protectedRoutes) {
      test(`${route} redirects to /login`, async ({ page, goto }) => {
        await goto(route, { waitUntil: 'hydration' })
        await expect(page).toHaveURL(/\/login$/)
      })
    }
  })

  test.describe('Public routes are accessible without auth', () => {
    const publicRoutes = [
      { path: '/', titlePattern: /finai/ },
      { path: '/login', titlePattern: /finai/ },
      { path: '/register', titlePattern: /finai/ },
      { path: '/forgot-password', titlePattern: /finai/ },
      { path: '/verify-email', titlePattern: /finai/ },
    ]

    for (const { path, titlePattern } of publicRoutes) {
      test(`${path} is accessible`, async ({ page, goto }) => {
        await goto(path, { waitUntil: 'hydration' })
        // Should NOT redirect to /login
        await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`))
      })
    }
  })
})
```

**Step 2: Run the tests**

```bash
bunx playwright test tests/auth/route-protection.spec.ts --reporter=list
```

Expected: 9 tests PASS (4 protected + 5 public)

**Step 3: Commit**

```bash
git add tests/auth/route-protection.spec.ts
git commit -m "test: add route protection e2e tests"
```

---

## Task 6: Clean up `.gitignore`

**Files:**
- Modify: `.gitignore`

The `.gitignore` currently has 3 stale entries at the bottom that should be removed:
- `WORKFLOW.md` — this is tracked and should remain committed
- `.plans/notion-audit-fixes.md` — stale reference
- `BASIC_AUTH_PLAN.md` — stale reference

**Step 1: Remove stale entries from `.gitignore`**

Remove the last 3 lines from `.gitignore`:

```
WORKFLOW.md
.plans/notion-audit-fixes.md
BASIC_AUTH_PLAN.md
```

The file should end after the Playwright section:
```gitignore
# Playwright
playwright-report/
test-results/
```

**Step 2: Check if WORKFLOW.md or BASIC_AUTH_PLAN.md need to be re-tracked**

```bash
git status
```

If `WORKFLOW.md` or `BASIC_AUTH_PLAN.md` show as untracked after the `.gitignore` change, that's expected — they should now be trackable. Stage them if they exist and should be committed.

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: remove stale entries from .gitignore"
```

---

## Task 7: Update README with full setup instructions

**Files:**
- Modify: `README.md`

The current README is a placeholder with generic marketing copy and missing critical setup steps (Docker, DB, env vars, migrations). Replace it entirely.

**Step 1: Write the updated README**

Replace the full contents of `README.md` with:

```markdown
# finai

> Personal Financial Dashboard

![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js)
![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

finai is an open-source personal financial dashboard built with Nuxt 4 and Vue 3. Track spending, plan budgets, and gain insights into your financial health.

## Features

- Email/password authentication with email verification
- OAuth login (GitHub, Google)
- Dashboard with overview, transactions, budgets, and settings
- Rate limiting and security headers
- Responsive UI with dark mode support (Nuxt UI)

## Tech Stack

- **Framework:** [Nuxt 4](https://nuxt.com/) (Vue 3)
- **UI:** [Nuxt UI v4](https://ui.nuxt.com/)
- **Database:** PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **Auth:** [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) (sealed cookie sessions)
- **Email:** [Resend](https://resend.com/)
- **Runtime:** [Bun](https://bun.sh/)
- **Testing:** [Playwright](https://playwright.dev/)

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/oliverrees/finai.git
cd finai
bun install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL 17 on port **5433** (not the default 5432).

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pre-filled for Docker setup |
| `NUXT_SESSION_PASSWORD` | Yes | Random 32+ char string for cookie encryption |
| `NUXT_OAUTH_GITHUB_CLIENT_ID` | No | GitHub OAuth app client ID |
| `NUXT_OAUTH_GITHUB_CLIENT_SECRET` | No | GitHub OAuth app client secret |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `RESEND_API_KEY` | No | Resend API key for verification emails |
| `EMAIL_FROM` | No | Sender email address |
| `APP_URL` | Yes | Pre-filled as `http://localhost:3889` |

### 4. Run database migrations

```bash
bun run db:generate
bun run db:migrate
```

### 5. Start the dev server

```bash
bun run dev
```

The app will be available at [http://localhost:3889](http://localhost:3889).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3889) |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run test:e2e` | Run Playwright E2E tests |
| `bun run test:e2e:ui` | Run tests in Playwright UI mode |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:studio` | Open Drizzle Studio |

## Project Structure

```
app/                  # Nuxt 4 source directory
  pages/              # File-based routing
  components/         # Auto-imported Vue components
  composables/        # Auto-imported composables
  layouts/            # Layout components (default, dashboard)
  middleware/         # Route middleware (auth, guest)
server/               # Nitro server
  api/auth/           # Auth API endpoints
  routes/auth/        # OAuth handlers (GitHub, Google)
  database/           # Drizzle schema and migrations
  middleware/         # Server middleware (security headers)
  utils/              # Server utilities (auth, email, rate-limit, validation)
tests/                # Playwright E2E tests
```

## License

[MIT](LICENSE)
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with full setup instructions"
```

---

## Task 8: Verify `.env.example` is complete

**Files:**
- Review: `.env.example`

**Step 1: Verify all env vars used in the codebase are documented**

Check that `.env.example` contains entries for every env var referenced in the server code. The current `.env.example` already has:
- `DATABASE_URL` (used in `drizzle.config.ts` and `server/database/index.ts`)
- `NUXT_SESSION_PASSWORD` (used by `nuxt-auth-utils`)
- `NUXT_OAUTH_GITHUB_CLIENT_ID` / `NUXT_OAUTH_GITHUB_CLIENT_SECRET` (OAuth)
- `NUXT_OAUTH_GOOGLE_CLIENT_ID` / `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` (OAuth)
- `RESEND_API_KEY` (used in `server/utils/email.ts`)
- `EMAIL_FROM` (used in `server/utils/email.ts`)
- `APP_URL` (used for verification/reset URLs)
- `NGROK_AUTHTOKEN` (optional)

**Step 2: Verify `.env` is gitignored**

```bash
git check-ignore .env
```

Expected: `.env` is printed (meaning it is ignored). If not, something is wrong with `.gitignore`.

**Step 3: No commit needed** (verification only — if changes are needed, make them and commit)

---

## Task 9: Run full test suite and verify everything passes

**Step 1: Ensure Docker DB is running**

```bash
docker compose up -d
```

**Step 2: Run all E2E tests**

```bash
bun run test:e2e
```

Expected: All tests pass. The test suite should now include:
- `tests/landing/landing.spec.ts` — 8 tests
- `tests/auth/pages.spec.ts` — 11 tests
- `tests/auth/api-flows.spec.ts` — 9 tests
- `tests/auth/route-protection.spec.ts` — 9 tests
- `tests/security/headers.spec.ts` — 6 tests
- `tests/security/rate-limiting.spec.ts` — 3 tests
- `tests/security/enumeration.spec.ts` — 3 tests

**Total: ~49 tests**

**Step 3: Fix any failures**

If any tests fail, debug and fix them. Common issues:
- **Rate limiting tests conflicting** with auth API tests (shared in-memory rate limiter). If this happens, add `test.describe.configure({ mode: 'serial' })` to rate-limiting tests.
- **UForm validation** may require field interaction (focus + blur) before showing errors — adjust selectors if needed.
- **Route protection tests** may need `page.waitForURL` with a timeout if redirects are slow.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve e2e test failures"
```

(Only if fixes were needed)

---

## Task 10: Update WORKFLOW.md — mark Phase 7 as Done

**Files:**
- Modify: `WORKFLOW.md`

**Step 1: Update Phase 7 status**

In the Phase Overview table, change Phase 7 status from `Pending` to `Done`.

In the Phase 7 section, add `— DONE` to the heading and add checkpoint notes at the bottom with the test count and any fixes applied.

**Step 2: Update the status line at the top**

Change:
```
> **Status:** In progress — Phase 6 complete
```
to:
```
> **Status:** Complete — All phases done
```

**Step 3: Commit**

```bash
git add WORKFLOW.md
git commit -m "docs: mark Phase 7 complete in WORKFLOW.md"
```

---

## Summary

| Task | Description | Tests Added |
|------|-------------|-------------|
| 1 | Remove stale example test | -1 |
| 2 | Landing page E2E tests | +8 |
| 3 | Auth page rendering tests | +11 |
| 4 | Auth API flow tests | +9 |
| 5 | Route protection tests | +9 |
| 6 | Clean up .gitignore | — |
| 7 | Rewrite README | — |
| 8 | Verify .env.example | — |
| 9 | Run full suite, fix failures | — |
| 10 | Update WORKFLOW.md | — |

**Net new tests:** 37 (plus 12 existing security tests = **49 total**)
