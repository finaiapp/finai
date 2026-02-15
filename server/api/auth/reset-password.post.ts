import { eq } from 'drizzle-orm'
import { db } from '../../database'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  await checkRateLimit(authRateLimiter, ip)

  const body = await readBody(event)
  const { token, password } = body || {}

  if (!token || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Token and password are required' })
  }

  const passwordCheck = validatePassword(password)
  if (!passwordCheck.valid) {
    throw createError({ statusCode: 400, statusMessage: passwordCheck.message })
  }

  const verified = await verifyToken(token, 'password_reset')
  if (!verified) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired reset token' })
  }

  const passwordHash = await hashPassword(password)
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, verified.userId))

  return { message: 'Password reset successfully. You can now log in with your new password.' }
})
