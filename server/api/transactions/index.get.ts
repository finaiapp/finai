const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
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

  const filters = {
    type: type as 'income' | 'expense' | undefined,
    categoryId: query.categoryId ? Number(query.categoryId) : undefined,
    startDate,
    endDate,
    limit: query.limit ? Math.min(Number(query.limit), 100) : 50,
    offset: query.offset ? Number(query.offset) : 0,
  }

  return getUserTransactions(session.user.id, filters)
})
