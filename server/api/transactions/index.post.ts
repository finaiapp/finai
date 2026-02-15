import { and, eq } from 'drizzle-orm'
import { db } from '../../database'
import { categories } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')
  const body = await readBody(event)

  const validation = validateTransaction(body || {})
  if (!validation.valid) {
    throw createError({ statusCode: 400, statusMessage: validation.message })
  }

  if (body.categoryId) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, Number(body.categoryId)), eq(categories.userId, session.user.id)),
    })
    if (!category) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid category' })
    }
  }

  const transaction = await createTransaction(session.user.id, {
    type: body.type,
    amount: String(parseFloat(body.amount).toFixed(2)),
    description: body.description,
    date: body.date,
    categoryId: body.categoryId ? Number(body.categoryId) : undefined,
    notes: body.notes,
  })

  setResponseStatus(event, 201)
  return transaction
})
