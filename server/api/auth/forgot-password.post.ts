export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  await checkRateLimit(authRateLimiter, ip)

  const body = await readBody(event)
  const { email } = body || {}

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  const user = await findUserByEmail(email)
  if (user && user.passwordHash) {
    const token = await createVerificationToken(user.id, 'password_reset')
    await sendPasswordResetEmail(user.email, token)
  }

  // Always return success to prevent user enumeration
  return { message: 'If an account exists with that email, a password reset link has been sent.' }
})
