import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * Transactions & Categories API E2E tests.
 *
 * Tests auth protection (401 without session) and validation (400 for bad input)
 * via `page.request` — no browser UI needed.
 */

test.describe('Transactions API - Auth Protection', () => {
  test('GET /api/transactions returns 401 without session', async ({ page }) => {
    const res = await page.request.get('/api/transactions')
    expect(res.status()).toBe(401)
  })

  test('POST /api/transactions returns 401 without session', async ({ page }) => {
    const res = await page.request.post('/api/transactions', {
      data: {
        type: 'expense',
        amount: '10.00',
        description: 'Test',
        date: '2026-01-15',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/transactions/1 returns 401 without session', async ({ page }) => {
    const res = await page.request.get('/api/transactions/1')
    expect(res.status()).toBe(401)
  })

  test('PUT /api/transactions/1 returns 401 without session', async ({ page }) => {
    const res = await page.request.put('/api/transactions/1', {
      data: {
        type: 'income',
        amount: '50.00',
        description: 'Updated',
        date: '2026-01-15',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/transactions/1 returns 401 without session', async ({ page }) => {
    const res = await page.request.delete('/api/transactions/1')
    expect(res.status()).toBe(401)
  })
})

test.describe('Categories API - Auth Protection', () => {
  test('GET /api/categories returns 401 without session', async ({ page }) => {
    const res = await page.request.get('/api/categories')
    expect(res.status()).toBe(401)
  })

  test('POST /api/categories returns 401 without session', async ({ page }) => {
    const res = await page.request.post('/api/categories', {
      data: { name: 'Test Category' },
    })
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/categories/1 returns 401 without session', async ({ page }) => {
    const res = await page.request.delete('/api/categories/1')
    expect(res.status()).toBe(401)
  })
})

test.describe('Dashboard API - Auth Protection', () => {
  test('GET /api/dashboard/summary returns 401 without session', async ({ page }) => {
    const res = await page.request.get('/api/dashboard/summary')
    expect(res.status()).toBe(401)
  })
})
