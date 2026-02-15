# Testing Patterns

**Analysis Date:** 2025-02-15

## Test Framework

**Runner:**
- Playwright 1.58.2
- Config: `playwright.config.ts`

**Integration Library:**
- `@nuxt/test-utils/playwright` (4.0.0) — provides Nuxt-specific test fixtures like `goto()` helper with `waitUntil: 'hydration'`

**Run Commands:**
```bash
bun run test:e2e              # Run all tests
bun run test:e2e:ui           # Run tests in UI mode with live browser
bunx playwright test tests/example.spec.ts  # Run single test file
```

## Test File Organization

**Location:**
- All tests in `tests/` directory (not co-located with source)
- Organized by feature: `tests/auth/`, `tests/landing/`, `tests/security/`, `tests/transactions/`

**Naming:**
- `.spec.ts` suffix (e.g., `api-flows.spec.ts`, `pages.spec.ts`)

**Structure:**
```
tests/
├── auth/
│   ├── api-flows.spec.ts      (API-level tests via page.request)
│   ├── pages.spec.ts          (UI rendering tests)
│   └── route-protection.spec.ts (Middleware tests)
├── landing/
│   └── landing.spec.ts        (Landing page UI tests)
├── security/
│   ├── headers.spec.ts        (Security headers)
│   ├── rate-limiting.spec.ts  (Rate limit enforcement)
│   └── enumeration.spec.ts    (User enumeration prevention)
└── transactions/
    ├── api.spec.ts            (Auth + validation tests)
    └── pages.spec.ts          (Page rendering tests)
```

## Test Structure

**Suite Organization:**
```typescript
import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Auth API Flows', () => {
  // ── Registration ──────────────────────────────────────────────────────
  test('register returns 201 for valid new user', async ({ page }) => {
    const res = await page.request.post('/api/auth/register', {
      data: { email, password, name },
    })
    expect([201, 500]).toContain(res.status())
  })

  test('register returns 400 for invalid email', async ({ page }) => {
    const res = await page.request.post('/api/auth/register', {
      data: { email: 'not-an-email', password, name },
    })
    expect(res.status()).toBe(400)
  })
})
```

**Patterns:**
- Test groups use `test.describe()` with comment section headers (`// ── Section ──`)
- Each test is a single responsibility (one endpoint method or one validation scenario)
- Test names are human-readable and describe expected outcome
- Comments document non-obvious behavior (e.g., email service may not be configured)

## Test Types

**API Tests (via page.request):**
- Purpose: Test endpoint behavior without rendering UI
- File: `tests/auth/api-flows.spec.ts`, `tests/transactions/api.spec.ts`
- Pattern: Use `page.request.post('/api/path', { data: {...} })`
- Assertions: Check status codes (201, 400, 401, 404, 429)
- Acceptance: Tests accept multiple status codes when external service (email) may not be configured
  ```typescript
  expect([201, 500]).toContain(res.status())  // Email service may not be ready
  ```

**UI Tests (rendered pages):**
- Purpose: Test page rendering and user interactions
- File: `tests/auth/pages.spec.ts`, `tests/landing/landing.spec.ts`
- Pattern: Use `goto(path, { waitUntil: 'hydration' })` then `page.getByRole()`
- Assertions: Check visibility, href attributes, validation messages
- User interactions: `click()`, `fill()`, assertions after

**Route Protection Tests:**
- Purpose: Verify middleware redirects work correctly
- File: `tests/auth/route-protection.spec.ts`
- Pattern: Navigate to protected route without auth, verify redirect to `/login`
- Assertions: URL changes to expected redirect target

**Security Tests:**
- Purpose: Validate security headers and rate limiting
- File: `tests/security/headers.spec.ts`, `tests/security/rate-limiting.spec.ts`
- Patterns vary: Headers test checks response headers; rate limiting tests loop multiple requests

## Locator Patterns

**Scope locators to avoid ambiguity:**
```typescript
// ❌ Avoid (header and footer may both have this link)
const link = page.getByRole('link', { name: 'Dashboard' })

// ✅ Use main content area
const main = page.getByRole('main')
const link = main.getByRole('link', { name: 'Dashboard', exact: true })
```

**Aria labels for sections:**
```typescript
const hero = page.locator('section[aria-label="Introduction"]')
const features = page.locator('section[aria-label="Features"]')
```

**Exact matching for navigation links:**
```typescript
// Avoid substring matches (e.g., "Sign In" would match "Sign In Now")
main.getByRole('link', { name: 'Sign In', exact: true })
```

## Async Testing

**Pattern:**
```typescript
test('waits for hydration before assertions', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })
  // After hydration, component state is ready
  await expect(page.getByPlaceholder('email')).toBeVisible()
})
```

**Navigation waits:**
```typescript
await hero.getByRole('link', { name: 'Get Started' }).click()
await page.waitForURL('**/register')  // Wait for navigation
expect(page.url()).toContain('/register')
```

## Error Testing

**Valid request with bad data:**
```typescript
test('returns 400 for invalid input', async ({ page }) => {
  const res = await page.request.post('/api/endpoint', {
    data: { field: 'invalid-value' },
  })
  expect(res.status()).toBe(400)
})
```

**Missing authentication:**
```typescript
test('returns 401 without session', async ({ page }) => {
  const res = await page.request.get('/api/protected')
  expect(res.status()).toBe(401)
})
```

**Not found:**
```typescript
test('returns 404 for non-existent resource', async ({ page }) => {
  const res = await page.request.get('/api/transactions/999999')
  expect(res.status()).toBe(404)
})
```

## Rate Limiting Tests

**Configuration:**
- Tests use `test.describe.configure({ mode: 'serial' })` for shared in-memory state
- File: `tests/security/rate-limiting.spec.ts`

**Pattern:**
```typescript
test.describe('Rate Limiting', () => {
  test.describe.configure({ mode: 'serial' })

  test('returns 429 after exceeding limit', async ({ page }) => {
    const responses: number[] = []

    // authRateLimiter allows 5 points per 900s per IP
    for (let i = 0; i < 7; i++) {
      const res = await page.request.post('/api/auth/login', {
        data: { email: `test-${i}@test.com`, password: 'wrong' },
      })
      responses.push(res.status())
    }

    const rateLimited = responses.filter(s => s === 429)
    expect(rateLimited.length).toBeGreaterThan(0)
  })

  test('continues enforcing rate limit once exhausted', async ({ page }) => {
    // Previous test exhausted IP limiter; state persists
    // All requests in this test should be 429
    const responses: number[] = []
    for (let i = 0; i < 3; i++) {
      const res = await page.request.post('/api/auth/login', {
        data: { email: `persist-${i}@test.com`, password: 'wrong' },
      })
      responses.push(res.status())
    }
    expect(responses.every(s => s === 429)).toBe(true)
  })
})
```

**Important notes:**
- All tests in file share in-memory rate limiter state
- Tests must run serially (`mode: 'serial'`)
- Rate limits are configured per IP and per email in code, but tests see IP limit first (5 points/900s)
- Email-specific rate limit (10 points/900s per account) cannot be tested independently in E2E (would require unit tests)

## Fixtures and Test Data

**Unique test data:**
```typescript
function uniqueEmail(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
}

test('register with unique email', async ({ page }) => {
  const res = await page.request.post('/api/auth/register', {
    data: { email: uniqueEmail(), password: 'ValidPass123', name: 'Test' },
  })
})
```

**Patterns:**
- No global fixtures or setup/teardown observed
- Each test uses independent data (fresh email addresses with timestamps)
- No database cleanup between tests; relying on unique constraint or test isolation

## Coverage

**Metrics:** Not detected in codebase (no coverage config in `playwright.config.ts`)

**Current coverage summary (61 tests total):**
- `tests/landing/landing.spec.ts` — 8 tests (hero, features, CTA, nav, footer, navigation)
- `tests/auth/pages.spec.ts` — 12 tests (login/register/forgot/verify page rendering + validation)
- `tests/auth/api-flows.spec.ts` — 9 tests (register, login, logout, forgot, reset, verify API)
- `tests/auth/route-protection.spec.ts` — 9 tests (protected route redirects)
- `tests/security/headers.spec.ts` — 6 tests (security headers presence)
- `tests/security/rate-limiting.spec.ts` — 3 tests (rate limit enforcement + persistence)
- `tests/security/enumeration.spec.ts` — 3 tests (user enumeration prevention)
- `tests/transactions/api.spec.ts` — 9 tests (auth protection + validation)
- `tests/transactions/pages.spec.ts` — 2 tests (page auth redirects)

**Test categories:**
- Auth feature: 30 tests (registration, login, logout, password reset, email verification, route protection)
- Landing page: 8 tests
- Security: 12 tests (headers, rate limiting, enumeration)
- Transactions feature: 11 tests (API auth, validation, page rendering)

## Playwright Configuration Details

**Browser:**
- Chromium only (from `playwright.config.ts`)

**Parallelization:**
```typescript
fullyParallel: true        // Tests run in parallel by default
workers: process.env.CI ? 1 : undefined  // Single worker in CI, auto in dev
```

**Retries:**
```typescript
retries: process.env.CI ? 2 : 0  // Retry flaky tests twice in CI only
```

**Reporters:**
- HTML reporter (test results viewable in browser)
- Trace on first retry (debug flaky tests)

**Nuxt integration:**
```typescript
use: {
  nuxt: {
    rootDir: fileURLToPath(new URL('.', import.meta.url))
  }
}
```

## Best Practices Observed

1. **API-first testing:** Use `page.request` for endpoint tests to avoid UI rendering overhead
2. **Serial mode for shared state:** Rate limiting tests properly isolate with `test.describe.configure({ mode: 'serial' })`
3. **Scope selectors:** Use `page.getByRole('main')` to avoid header/footer link duplicates
4. **Hydration waiting:** All navigation uses `{ waitUntil: 'hydration' }`
5. **Flexible assertions for external services:** Accept multiple status codes (201/500) when email service may not be ready
6. **Organized by feature:** Tests grouped into directories matching app structure
7. **Comment documentation:** Test suites include docstring comments explaining approach
8. **Exact matching:** Use `exact: true` on `getByRole()` to avoid substring matches

---

*Testing analysis: 2025-02-15*
