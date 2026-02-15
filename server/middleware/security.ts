export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.plaid.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self' https://cdn.plaid.com; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  })

  // Remove X-Powered-By after Nitro sets it
  const res = event.node.res
  const originalWriteHead = res.writeHead.bind(res)
  res.writeHead = ((...args: Parameters<typeof res.writeHead>) => {
    res.removeHeader('X-Powered-By')
    return (originalWriteHead as Function)(...args)
  }) as typeof res.writeHead
})
