export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')

  const itemId = getRouterParam(event, 'itemId')
  if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID is required' })
  }

  // Get the decrypted access token (also verifies ownership)
  const accessToken = await getPlaidItemAccessToken(itemId, session.user.id)

  // Revoke the access token at Plaid
  try {
    await plaidClient.itemRemove({ access_token: accessToken })
  }
  catch (error) {
    const { statusCode, message } = extractPlaidError(error)
    // If token is already invalid (400), log warning but continue with local cleanup
    if (statusCode === 400) {
      console.warn(`[plaid] itemRemove returned 400 for item ${itemId} — token likely already invalid, proceeding with local cleanup`)
    }
    else {
      throw createError({ statusCode, statusMessage: message })
    }
  }

  // Remove from local DB (ON DELETE CASCADE handles accounts and sync cursors)
  await deletePlaidItem(itemId, session.user.id)

  return { success: true }
})
