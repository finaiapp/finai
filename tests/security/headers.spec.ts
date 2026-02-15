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

  test('sets Content-Security-Policy header', async ({ page }) => {
    const res = await page.request.get('/')
    const csp = res.headers()['content-security-policy']
    expect(csp).toBeDefined()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
  })

  test('sets Strict-Transport-Security header', async ({ page }) => {
    const res = await page.request.get('/')
    expect(res.headers()['strict-transport-security']).toBe('max-age=31536000; includeSubDomains')
  })

  test('CSP and HSTS headers present on API routes', async ({ page }) => {
    const res = await page.request.post('/api/auth/login', {
      data: { email: 'test@test.com', password: 'test' },
    })
    expect(res.headers()['content-security-policy']).toBeDefined()
    expect(res.headers()['strict-transport-security']).toBeDefined()
  })
})
