export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  await checkRateLimit(authRateLimiter, ip)

  const body = await readBody(event)
  const { email, password } = body || {}

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
  }

  if (!validateEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email format' })
  }

  await checkRateLimit(accountRateLimiter, email.toLowerCase())

  const user = await findUserByEmail(email)
  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  if (!user.emailVerified) {
    throw createError({ statusCode: 403, statusMessage: 'Please verify your email before logging in' })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      provider: user.provider,
    },
    loggedInAt: Date.now(),
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  }
})
