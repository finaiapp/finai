import { Products, CountryCode } from 'plaid'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')

  // Optional body with item_id for update mode (re-authentication)
  const body = await readBody<{ item_id?: string }>(event).catch(() => ({}))

  try {
    // Build link config: update mode (access_token) vs normal mode (products)
    const baseConfig = {
      user: { client_user_id: String(session.user.id) },
      client_name: 'finai',
      country_codes: [CountryCode.Us],
      language: 'en',
    }

    let config
    if (body?.item_id && typeof body.item_id === 'string' && body.item_id.trim().length > 0) {
      // Update mode: use access_token instead of products
      const accessToken = await getPlaidItemAccessToken(body.item_id, session.user.id)
      config = { ...baseConfig, access_token: accessToken }
    }
    else {
      // Normal mode: create new link with products
      config = { ...baseConfig, products: [Products.Transactions] }
    }

    const response = await plaidClient.linkTokenCreate(config)

    return { link_token: response.data.link_token }
  }
  catch (error) {
    const { statusCode, message } = extractPlaidError(error)
    throw createError({ statusCode, statusMessage: message })
  }
})
