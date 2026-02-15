export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid category ID' })
  }

  const deleted = await deleteCategory(id, session.user.id)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  return { success: true }
})
