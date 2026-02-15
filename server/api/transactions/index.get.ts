const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')
  const query = getQuery(event)

  // Validate type filter
  const type = query.type as string | undefined
  if (type && !['income', 'expense'].includes(type)) {
    throw createError({ statusCode: 400, statusMessage: 'Type must be "income" or "expense"' })
  }

  // Validate date filters
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined
  if (startDate && !DATE_REGEX.test(startDate)) {
    throw createError({ statusCode: 400, statusMessage: 'startDate must be in YYYY-MM-DD format' })
  }
  if (endDate && !DATE_REGEX.test(endDate)) {
    throw createError({ statusCode: 400, statusMessage: 'endDate must be in YYYY-MM-DD format' })
  }

  // Validate numeric params
  const categoryId = query.categoryId ? Number(query.categoryId) : undefined
  if (query.categoryId && (isNaN(categoryId!) || categoryId! < 0)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid categoryId' })
  }
  const limit = query.limit ? Number(query.limit) : 50
  if (query.limit && (isNaN(limit) || limit < 1)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid limit' })
  }
  const offset = query.offset ? Number(query.offset) : 0
  if (query.offset && (isNaN(offset) || offset < 0)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid offset' })
  }

  const filters = {
    type: type as 'income' | 'expense' | undefined,
    categoryId,
    startDate,
    endDate,
    limit: Math.min(limit, 100),
    offset,
  }

  return getUserTransactions(session.user.id, filters)
})
