export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  })

  // Remove X-Powered-By after Nitro sets it by hooking into the response write
  const originalWriteHead = event.node.res.writeHead
  event.node.res.writeHead = function (...args: Parameters<typeof originalWriteHead>) {
    this.removeHeader('X-Powered-By')
    return originalWriteHead.apply(this, args)
  }
})
