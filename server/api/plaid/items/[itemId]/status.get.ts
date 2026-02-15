export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')

  const itemId = getRouterParam(event, 'itemId')
  if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID is required' })
  }

  // Get decrypted access token (also verifies ownership)
  const accessToken = await getPlaidItemAccessToken(itemId, session.user.id)

  try {
    const response = await plaidClient.itemGet({ access_token: accessToken })
    const item = response.data.item

    const newStatus = item.error ? 'degraded' : 'healthy'
    await updatePlaidItemStatus(itemId, session.user.id, newStatus)

    return {
      status: newStatus,
      error: item.error
        ? { error_code: item.error.error_code, display_message: item.error.display_message }
        : null,
    }
  }
  catch (error) {
    const { statusCode, message } = extractPlaidError(error)
    throw createError({ statusCode, statusMessage: message })
  }
})
