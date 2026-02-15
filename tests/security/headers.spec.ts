import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Security Headers', () => {
  test('sets X-Content-Type-Options header', async ({ page }) => {
    const res = await page.request.get('/')
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('sets X-Frame-Options header', async ({ page }) => {
    const res = await page.request.get('/')
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })

  test('sets Referrer-Policy header', async ({ page }) => {
    const res = await page.request.get('/')
    expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('sets Permissions-Policy header', async ({ page }) => {
    const res = await page.request.get('/')
    expect(res.headers()['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')
  })

  test('does not leak X-Powered-By header', async ({ page }) => {
    const res = await page.request.get('/')
    expect(res.headers()['x-powered-by']).toBeUndefined()
  })

  test('security headers present on API routes too', async ({ page }) => {
    const res = await page.request.post('/api/auth/login', {
      data: { email: 'test@test.com', password: 'test' },
    })
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })
})
