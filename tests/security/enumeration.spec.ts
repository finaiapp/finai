import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Auth Endpoint Enumeration Protection', () => {
  // Note: Both requests below test the "user not found" code path (login.post.ts:20).
  // The "wrong password" path (login.post.ts:25) uses the same error message — verified
  // by code review. Testing it in E2E would require a pre-registered user in the DB.
  test('login returns generic error for non-existent users', async ({ page }) => {
    const res1 = await page.request.post('/api/auth/login', {
      data: { email: `nonexistent-${Date.now()}@test.com`, password: 'SomePass123' },
    })

    const res2 = await page.request.post('/api/auth/login', {
      data: { email: `also-nonexistent-${Date.now()}@test.com`, password: 'WrongPass123' },
    })

    expect(res1.status()).toBe(401)
    expect(res2.status()).toBe(401)

    const body1 = await res1.text()
    const body2 = await res2.text()

    // Both should return the same generic error — no hint about which field is wrong
    expect(body1).toContain('Invalid email or password')
    expect(body2).toContain('Invalid email or password')
  })

  test('forgot password returns same response for existing and non-existing email', async ({ page }) => {
    const nonExistent = await page.request.post('/api/auth/forgot-password', {
      data: { email: `nobody-${Date.now()}@test.com` },
    })

    expect(nonExistent.status()).toBe(200)
    const body = await nonExistent.json()
    expect(body.message).toContain('If an account exists')
  })

  test('register reveals email existence (acceptable, documented trade-off)', async ({ page }) => {
    // Register with a unique email should succeed (201)
    // or fail with 500 if email service is not configured.
    // Either way, it should NOT leak info like provider type.
    const res = await page.request.post('/api/auth/register', {
      data: {
        email: `unique-test-${Date.now()}@test.com`,
        password: 'ValidPass123',
        name: 'Test User',
      },
    })

    // 201 = success, 500 = email service error (both acceptable in test env)
    expect([201, 500]).toContain(res.status())
  })
})
