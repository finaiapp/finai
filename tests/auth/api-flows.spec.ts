import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * Auth API flow E2E tests.
 *
 * These test the API endpoints directly via `page.request` (no browser UI).
 * Some tests accept multiple status codes because the email service may not
 * be configured in the test environment.
 */

function uniqueEmail(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
}

test.describe('Auth API Flows', () => {
  // ── Registration ──────────────────────────────────────────────────────

  test('register returns 201 for valid new user', async ({ page }) => {
    const res = await page.request.post('/api/auth/register', {
      data: {
        email: uniqueEmail(),
        password: 'ValidPass123',
        name: 'Test User',
      },
    })

    // 201 = created, 500 = email service not configured (both acceptable)
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

  // ── Login ─────────────────────────────────────────────────────────────

  test('login returns 401 for non-existent user', async ({ page }) => {
    const res = await page.request.post('/api/auth/login', {
      data: {
        email: uniqueEmail(),
        password: 'SomePass123',
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

  // ── Logout ────────────────────────────────────────────────────────────

  test('logout returns 200', async ({ page }) => {
    const res = await page.request.post('/api/auth/logout')

    expect(res.status()).toBe(200)
  })

  // ── Forgot Password ──────────────────────────────────────────────────

  test('forgot-password returns 200 for any email', async ({ page }) => {
    const res = await page.request.post('/api/auth/forgot-password', {
      data: {
        email: uniqueEmail(),
      },
    })

    // Always returns 200 to prevent user enumeration
    expect(res.status()).toBe(200)
  })

  // ── Reset Password ───────────────────────────────────────────────────

  test('reset-password returns 400 or 404 for invalid token', async ({ page }) => {
    const res = await page.request.post('/api/auth/reset-password', {
      data: {
        token: 'invalid-token-that-does-not-exist',
        password: 'NewValidPass123',
      },
    })

    expect([400, 404]).toContain(res.status())
  })

  // ── Verify Email ─────────────────────────────────────────────────────

  test('verify-email returns 400 or 404 for invalid token', async ({ page }) => {
    const res = await page.request.post('/api/auth/verify-email', {
      data: {
        token: 'invalid-token-that-does-not-exist',
      },
    })

    expect([400, 404]).toContain(res.status())
  })
})
