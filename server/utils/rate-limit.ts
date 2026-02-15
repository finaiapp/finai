import { RateLimiterMemory } from 'rate-limiter-flexible'

export const authRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 900, // 15 minutes
  keyPrefix: 'auth_ip',
})

export const accountRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 3600, // 1 hour
  keyPrefix: 'auth_account',
})

export const verificationRateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 900, // 15 minutes
  keyPrefix: 'verification_ip',
})

export const apiRateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60, // 60 requests per minute per IP
  keyPrefix: 'api_ip',
})

export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string,
): Promise<void> {
  try {
    await limiter.consume(key)
  }
  catch {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.',
    })
  }
}
