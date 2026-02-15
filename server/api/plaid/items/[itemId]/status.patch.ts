export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')

  const itemId = getRouterParam(event, 'itemId')
  if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID is required' })
  }

  const body = await readBody<{ status?: string }>(event)
  if (!body?.status || !['healthy', 'degraded'].includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Status must be either "healthy" or "degraded"' })
  }

  const updated = await updatePlaidItemStatus(itemId, session.user.id, body.status)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Item not found' })
  }

  return { success: true, status: body.status }
})
