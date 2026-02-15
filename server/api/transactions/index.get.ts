export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const query = getQuery(event)

  const filters = {
    type: query.type as 'income' | 'expense' | undefined,
    categoryId: query.categoryId ? Number(query.categoryId) : undefined,
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
    limit: query.limit ? Math.min(Number(query.limit), 100) : 50,
    offset: query.offset ? Number(query.offset) : 0,
  }

  return getUserTransactions(session.user.id, filters)
})
