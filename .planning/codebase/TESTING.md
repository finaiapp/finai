# Testing Patterns

**Analysis Date:** 2025-02-15

## Test Framework

**Runner:**
- Playwright `@playwright/test` v1.58.2
- Config: `playwright.config.ts`
- Nuxt integration: `@nuxt/test-utils/playwright` v4.0.0

**Assertion Library:**
- Playwright built-in `expect()` (no separate library)
- Import: `import { expect, test } from '@nuxt/test-utils/playwright'`

**Run Commands:**
```bash
bun run test:e2e                    # Run all E2E tests
bun run test:e2e:ui                # UI mode with visual controls
bunx playwright test tests/file.spec.ts  # Run single test file
```

**Configuration Details:**
- Test directory: `./tests/` (glob: `testDir: './tests'`)
- Parallel execution: enabled by default (`fullyParallel: true`)
- CI overrides: 2 retries, 1 worker process
- Reporter: HTML report output
- Trace: recorded on first retry

## Test File Organization

**Location:**
- Co-located in `tests/` directory separate from `app/` and `server/`
- Mirrored structure: `tests/auth/`, `tests/dashboard/`, `tests/security/`, `tests/transactions/`, `tests/landing/`

**Naming:**
- Pattern: `{feature}.spec.ts`
- Examples: `api-flows.spec.ts`, `pages.spec.ts`, `route-protection.spec.ts`, `headers.spec.ts`

**Structure:**
```
tests/
├── auth/
│   ├── api-flows.spec.ts        # Auth API endpoint tests
│   ├── pages.spec.ts             # Auth page rendering tests
│   └── route-protection.spec.ts  # Auth middleware tests
├── dashboard/
│   └── overview.spec.ts          # Dashboard redirect/API protection
├── landing/
│   └── landing.spec.ts           # Landing page rendering
├── security/
│   ├── enumeration.spec.ts       # Anti-enumeration tests
│   ├── headers.spec.ts           # Security header validation
│   └── rate-limiting.spec.ts     # Rate limit enforcement
└── transactions/
    ├── api.spec.ts               # Transaction/category API protection
    └── pages.spec.ts             # Transaction page auth checks
```

## Test Structure

**Suite Organization:**
Tests group by feature area using `test.describe()`:

```typescript
import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Auth API Flows', () => {
  test('register returns 201 for valid new user', async ({ page }) => {
    const res = await page.request.post('/api/auth/register', {
      data: {
        email: uniqueEmail(),
        password: 'ValidPass123',
        name: 'Test User',
      },
    })
    expect([201, 500]).toContain(res.status())
  })

  test('register returns 400 for invalid email', async ({ page }) => {
    // ...
  })
})
```

**Patterns:**
- No setup/teardown per test (Nuxt creates fresh server instance per file)
- Tests run in parallel within describe blocks unless explicitly serial
- Use `goto()` for page navigation with `{ waitUntil: 'hydration' }` option
- Use `page.request` for API-level tests (no browser UI)

**Serial Tests (Rate Limiting):**
Rate limiting tests use shared in-memory state, require serial execution:
```typescript
test.describe('Rate Limiting', () => {
  test.describe.configure({ mode: 'serial' })
  test('returns 429 after exceeding login attempts per IP', async ({ page }) => {
    // ...
  })
})
```

## Mocking

**Framework:** No mocking library used

**Patterns:**
- API tests use `page.request` to call actual endpoints (no mocking)
- Database provides real data (test fixtures via API or direct db calls)
- Email service tests accept 500 as acceptable (service may not be configured)
- Rate limiters use real in-memory state across tests in serial mode

**What NOT to Mock:**
- Database queries (use real database)
- HTTP endpoints (use page.request against actual server)
- Authentication state (use real session cookies)

**What IS "Mocked":**
- Email service treated as optional (tests pass if 201 or 500 returned)
- Optional OAuth providers (tests verify endpoints exist, don't call actual OAuth)

## Fixtures and Test Data

**Test Data Generation:**
```typescript
function uniqueEmail(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
}
```
Unique per test run to avoid conflicts on database constraints.

**Location:**
- Inline in test files (no shared fixture directory)
- Generators like `uniqueEmail()` defined per test file where used

**Reusable Data Objects:**
Test endpoints use hardcoded valid payloads:
```typescript
{
  email: uniqueEmail(),
  password: 'ValidPass123',  // Meets password requirements: 8+ chars, upper, lower, digit
  name: 'Test User',
}
```

## Coverage

**Requirements:** None enforced (`coverage` not configured)

**View Coverage:**
Not available (no coverage configuration in `playwright.config.ts`)

**Test Count:** 61 total tests across 9 files
- `tests/auth/api-flows.spec.ts` — 9 tests
- `tests/auth/pages.spec.ts` — 12 tests
- `tests/auth/route-protection.spec.ts` — 9 tests
- `tests/dashboard/overview.spec.ts` — 2 tests
- `tests/landing/landing.spec.ts` — 8 tests
- `tests/security/enumeration.spec.ts` — 3 tests
- `tests/security/headers.spec.ts` — 8 tests
- `tests/security/rate-limiting.spec.ts` — 3 tests
- `tests/transactions/api.spec.ts` — 19 tests (auth protection + validation)

## Test Types

**Page Rendering Tests:**
Verify UI components are displayed correctly:
```typescript
test('renders login form with heading, inputs, and submit button', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })

  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
})
```
Uses accessibility queries: `getByRole()`, `getByPlaceholder()`, `getByText()`.

**API Endpoint Tests:**
Call endpoints directly via `page.request`, verify status codes and error messages:
```typescript
test('login returns 401 for non-existent user', async ({ page }) => {
  const res = await page.request.post('/api/auth/login', {
    data: {
      email: uniqueEmail(),
      password: 'SomePass123',
    },
  })
  expect(res.status()).toBe(401)
})
```

**Route Protection Tests:**
Verify redirects for unauthenticated access:
```typescript
test('redirects unauthenticated users to login', async ({ page, goto }) => {
  await goto('/dashboard', { waitUntil: 'hydration' })
  await expect(page).toHaveURL(/\/login/)
})
```

**Security Tests:**
Validate headers and rate limiting:
```typescript
test('sets X-Content-Type-Options header', async ({ page }) => {
  const res = await page.request.get('/')
  expect(res.headers()['x-content-type-options']).toBe('nosniff')
})
```

**Validation Tests:**
Verify form validation errors displayed:
```typescript
test('shows validation errors for empty form submission', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })

  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page.getByText('Email is required')).toBeVisible()
  await expect(page.getByText('Password is required')).toBeVisible()
})
```

## Common Patterns

**Scoped Locators:**
Use `page.getByRole('main')` to avoid duplicate link names in header/footer:
```typescript
const main = page.getByRole('main')
const link = main.getByRole('link', { name: 'Get started', exact: true })
await expect(link).toBeVisible()
```

**Exact Matching:**
Use `exact: true` on getByRole to avoid ambiguous matches:
```typescript
const link = main.getByRole('link', { name: 'Sign in', exact: true })
```

**Async Navigation:**
Use `goto()` with Nuxt-specific hydration wait:
```typescript
await goto('/login', { waitUntil: 'hydration' })
```

**Multiple Expected Statuses:**
Some API tests accept multiple status codes (e.g., 201 or 500 if email service not configured):
```typescript
expect([201, 500]).toContain(res.status())
```

**Error Extraction from Response:**
API tests check `statusCode` from response object:
```typescript
const statusCode = err?.statusCode || err?.response?.status
if (statusCode === 403) {
  unverified.value = true
}
```

**Rate Limiting State:**
Serial tests verify state persists across requests:
```typescript
// First loop: 5 requests succeed (401), 6th+ return 429
// Second loop: all return 429 because limiter still exhausted
expect(responses.every(s => s === 429)).toBe(true)
```

## Accessing Test Fixtures

**Page Fixture:**
- `page` — Playwright Page object with `goto()`, `request`, `getByRole()`, etc.
- `goto(path, options)` — Navigate to path (from @nuxt/test-utils/playwright)

**Request Fixture:**
- `page.request.get(url)`, `.post(url, { data })`, `.put()`, `.delete()`
- Returns response object with `.status()`, `.headers()`, `.json()`

## Known Testing Considerations

**Email Service:**
- Tests accept 500 status (service may not be configured in test environment)
- Real email verification flow requires external Resend API

**Rate Limiting:**
- Tests share same IP in test environment
- `authRateLimiter` (5 points/IP/900s) fires before `accountRateLimiter` (10 points/email)
- Only `authRateLimiter` can be tested in E2E; account limiter needs unit tests

**Database:**
- Fresh Nuxt server instance per test file (shared within file)
- No explicit test database — uses configured database (must exist)
- No test data cleanup between tests (each test uses unique emails)

---

*Testing analysis: 2025-02-15*
