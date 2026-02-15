import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const plaidEnv = process.env.PLAID_ENV || 'sandbox'

const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv] as string,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
})

/**
 * Singleton Plaid API client configured from environment variables.
 */
export const plaidClient = new PlaidApi(configuration)

/**
 * Extract a user-friendly error message from a Plaid API error response.
 */
export function extractPlaidError(error: unknown): { statusCode: number; message: string } {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { display_message?: string; error_message?: string } } }).response
    const data = response?.data
    const statusCode = response?.status ?? 500
    const message = data?.display_message || data?.error_message || 'An error occurred with the banking service'
    return { statusCode, message }
  }
  if (error instanceof Error) {
    return { statusCode: 500, message: error.message }
  }
  return { statusCode: 500, message: 'An unknown error occurred with the banking service' }
}
