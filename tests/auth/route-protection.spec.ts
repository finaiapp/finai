import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Route Protection - Protected routes redirect to /login', () => {
  test('/dashboard redirects to /login', async ({ page, goto }) => {
    await goto('/dashboard', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('/dashboard/transactions redirects to /login', async ({ page, goto }) => {
    await goto('/dashboard/transactions', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('/dashboard/budgets redirects to /login', async ({ page, goto }) => {
    await goto('/dashboard/budgets', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('/dashboard/settings redirects to /login', async ({ page, goto }) => {
    await goto('/dashboard/settings', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Route Protection - Public routes accessible without auth', () => {
  test('/ stays at /', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/$/)
  })

  test('/login stays at /login', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('/register stays at /register', async ({ page, goto }) => {
    await goto('/register', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/register$/)
  })

  test('/forgot-password stays at /forgot-password', async ({ page, goto }) => {
    await goto('/forgot-password', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('/verify-email stays at /verify-email', async ({ page, goto }) => {
    await goto('/verify-email', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/verify-email$/)
  })
})
