export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })

  // Remove X-Powered-By after Nitro sets it by hooking into the response write
  const originalWriteHead = event.node.res.writeHead
  event.node.res.writeHead = function (...args: Parameters<typeof originalWriteHead>) {
    this.removeHeader('X-Powered-By')
    return originalWriteHead.apply(this, args)
  }
})
