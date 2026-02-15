import { eq } from 'drizzle-orm'
import { db } from '../../database'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  await checkRateLimit(verificationRateLimiter, ip)

  const body = await readBody(event)
  const { token } = body || {}

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token is required' })
  }

  const verified = await verifyToken(token, 'email_verify')
  if (!verified) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired verification token' })
  }

  const [user] = await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, verified.userId))
    .returning()

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

  return { message: 'Email verified successfully' }
})
