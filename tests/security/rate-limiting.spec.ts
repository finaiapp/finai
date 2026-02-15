import { expect, test } from '@nuxt/test-utils/playwright'

// Note: All requests share the same IP in the test environment, so the
// authRateLimiter (5 points/IP) fires before the accountRateLimiter
// (10 points/email). The account limiter cannot be tested independently
// in E2E — it would require unit tests calling checkRateLimit() directly.
// These tests verify that rate limiting is active and returns 429.

test.describe('Rate Limiting', () => {
  test.describe.configure({ mode: 'serial' })
  test('returns 429 after exceeding login attempts per IP', async ({ page }) => {
    const responses: number[] = []

    // authRateLimiter allows 5 points per 900s per IP
    for (let i = 0; i < 7; i++) {
      const res = await page.request.post('/api/auth/login', {
        data: { email: `ratelimit-${i}@test.com`, password: 'wrong' },
      })
      responses.push(res.status())
    }

    // First 5 should be 401 (bad credentials), 6th+ should be 429
    const rateLimited = responses.filter(s => s === 429)
    expect(rateLimited.length).toBeGreaterThan(0)
  })

  test('continues enforcing rate limit once exhausted', async ({ page }) => {
    // IP limiter is already exhausted from previous test (shared in-memory state).
    // This verifies rate limiting persists across requests.
    const responses: number[] = []

    for (let i = 0; i < 3; i++) {
      const res = await page.request.post('/api/auth/login', {
        data: { email: `persist-${i}@test.com`, password: 'wrongpassword' },
      })
      responses.push(res.status())
    }

    // All should be 429 since IP limit was already exceeded
    expect(responses.every(s => s === 429)).toBe(true)
  })

  test('rate limited response returns 429 status', async ({ page }) => {
    const res = await page.request.post('/api/auth/login', {
      data: { email: 'final@test.com', password: 'wrong' },
    })

    expect(res.status()).toBe(429)
  })
})
