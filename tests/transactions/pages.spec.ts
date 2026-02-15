import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * Transactions page E2E tests.
 *
 * Route protection is already tested in tests/auth/route-protection.spec.ts.
 * These tests verify page structure for unauthenticated users (redirect behavior).
 */

test.describe('Transactions Pages - Auth Redirect', () => {
  test('/dashboard/transactions redirects unauthenticated user to /login', async ({ page, goto }) => {
    await goto('/dashboard/transactions', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('/dashboard redirects unauthenticated user to /login', async ({ page, goto }) => {
    await goto('/dashboard', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
  })
})
