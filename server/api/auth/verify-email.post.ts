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

  const [updatedUser] = await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, verified.userId))
    .returning()

  if (!updatedUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  await setUserSession(event, {
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatarUrl: updatedUser.avatarUrl,
      emailVerified: updatedUser.emailVerified,
      provider: updatedUser.provider,
    },
    loggedInAt: Date.now(),
  })

  return { message: 'Email verified successfully' }
})
