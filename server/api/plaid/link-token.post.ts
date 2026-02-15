import { Products, CountryCode } from 'plaid'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: String(session.user.id) },
      client_name: 'finai',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })

    return { link_token: response.data.link_token }
  }
  catch (error) {
    const { statusCode, message } = extractPlaidError(error)
    throw createError({ statusCode, statusMessage: message })
  }
})
