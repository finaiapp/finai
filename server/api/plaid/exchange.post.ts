export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')

  const body = await readBody<{
    public_token?: string
    metadata?: {
      institution?: {
        institution_id?: string
        name?: string
      }
    }
  }>(event)

  if (!body?.public_token || typeof body.public_token !== 'string' || body.public_token.trim() === '') {
    throw createError({ statusCode: 400, statusMessage: 'public_token is required' })
  }

  try {
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: body.public_token,
    })

    const accessToken = exchangeResponse.data.access_token
    const itemId = exchangeResponse.data.item_id

    // Store the item — createPlaidItem encrypts the token internally
    const plaidItem = await createPlaidItem({
      userId: session.user.id,
      itemId,
      accessToken,
      institutionId: body.metadata?.institution?.institution_id ?? null,
      institutionName: body.metadata?.institution?.name ?? null,
    })

    // Fetch accounts using the unencrypted access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    })

    // Store accounts in the database
    await storePlaidAccounts(session.user.id, plaidItem!.id, accountsResponse.data.accounts)

    return { success: true, itemId }
  }
  catch (error) {
    const { statusCode, message } = extractPlaidError(error)
    throw createError({ statusCode, statusMessage: message })
  }
})
