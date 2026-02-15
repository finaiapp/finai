import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Dashboard Overview', () => {
  test('redirects unauthenticated users to login', async ({ page, goto }) => {
    await goto('/dashboard', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Dashboard API - Data Endpoints', () => {
  test('GET /api/dashboard/summary returns 401 without session', async ({ page }) => {
    const res = await page.request.get('/api/dashboard/summary')
    expect(res.status()).toBe(401)
  })

  test('GET /api/transactions returns 401 without session', async ({ page }) => {
    const res = await page.request.get('/api/transactions')
    expect(res.status()).toBe(401)
  })
})
