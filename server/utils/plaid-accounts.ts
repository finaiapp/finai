import { eq, and } from 'drizzle-orm'
import type { AccountBase } from 'plaid'
import { db } from '../database'
import { plaidItems, plaidAccounts } from '../database/schema'
import { encrypt, decrypt } from './encryption'

/**
 * Get a Plaid item by its Plaid itemId string with ownership check.
 * Returns the row or null if not found / not owned.
 */
export async function getPlaidItemByItemId(itemId: string, userId: number) {
  const [item] = await db
    .select({
      id: plaidItems.id,
      itemId: plaidItems.itemId,
      institutionName: plaidItems.institutionName,
      status: plaidItems.status,
    })
    .from(plaidItems)
    .where(and(eq(plaidItems.itemId, itemId), eq(plaidItems.userId, userId)))

  return item ?? null
}

/**
 * Delete a Plaid item by its Plaid itemId string with ownership check.
 * ON DELETE CASCADE handles plaid_accounts and sync_cursors automatically.
 * Returns true if a row was deleted, false otherwise.
 */
export async function deletePlaidItem(itemId: string, userId: number): Promise<boolean> {
  const deleted = await db
    .delete(plaidItems)
    .where(and(eq(plaidItems.itemId, itemId), eq(plaidItems.userId, userId)))
    .returning({ id: plaidItems.id })

  return deleted.length > 0
}

/**
 * Create a new Plaid item record with an encrypted access token.
 */
export async function createPlaidItem(data: {
  userId: number
  itemId: string
  accessToken: string
  institutionId?: string | null
  institutionName?: string | null
}) {
  const encryptedAccessToken = encrypt(data.accessToken)

  const [item] = await db
    .insert(plaidItems)
    .values({
      userId: data.userId,
      itemId: data.itemId,
      encryptedAccessToken,
      institutionId: data.institutionId ?? null,
      institutionName: data.institutionName ?? null,
    })
    .returning()

  return item
}

/**
 * Get all Plaid items for a user (without decrypted tokens).
 */
export async function getUserPlaidItems(userId: number) {
  return db
    .select({
      id: plaidItems.id,
      itemId: plaidItems.itemId,
      institutionId: plaidItems.institutionId,
      institutionName: plaidItems.institutionName,
      status: plaidItems.status,
      createdAt: plaidItems.createdAt,
      updatedAt: plaidItems.updatedAt,
    })
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId))
}

/**
 * Get the decrypted access token for a Plaid item.
 * Verifies ownership by userId.
 */
export async function getPlaidItemAccessToken(itemId: string, userId: number): Promise<string> {
  const [item] = await db
    .select({ encryptedAccessToken: plaidItems.encryptedAccessToken })
    .from(plaidItems)
    .where(and(eq(plaidItems.itemId, itemId), eq(plaidItems.userId, userId)))

  if (!item) {
    throw new Error(`Plaid item not found: ${itemId}`)
  }

  return decrypt(item.encryptedAccessToken)
}

/**
 * Get all Plaid accounts for a user, joined with institution info.
 */
export async function getUserPlaidAccounts(userId: number) {
  return db
    .select({
      id: plaidAccounts.id,
      accountId: plaidAccounts.accountId,
      name: plaidAccounts.name,
      officialName: plaidAccounts.officialName,
      mask: plaidAccounts.mask,
      type: plaidAccounts.type,
      subtype: plaidAccounts.subtype,
      currentBalance: plaidAccounts.currentBalance,
      availableBalance: plaidAccounts.availableBalance,
      isoCurrencyCode: plaidAccounts.isoCurrencyCode,
      institutionId: plaidItems.institutionId,
      institutionName: plaidItems.institutionName,
      itemId: plaidItems.itemId,
      plaidItemId: plaidAccounts.plaidItemId,
      createdAt: plaidAccounts.createdAt,
      updatedAt: plaidAccounts.updatedAt,
    })
    .from(plaidAccounts)
    .innerJoin(plaidItems, eq(plaidAccounts.plaidItemId, plaidItems.id))
    .where(eq(plaidAccounts.userId, userId))
}

/**
 * Upsert Plaid accounts from an API response into the database.
 * Maps Plaid AccountBase fields to DB columns.
 */
export async function storePlaidAccounts(userId: number, plaidItemDbId: number, accounts: AccountBase[]) {
  const results = []

  for (const account of accounts) {
    const values = {
      userId,
      plaidItemId: plaidItemDbId,
      accountId: account.account_id,
      name: account.name,
      officialName: account.official_name ?? null,
      mask: account.mask ?? null,
      type: account.type as string,
      subtype: (account.subtype as string) ?? null,
      currentBalance: account.balances.current?.toString() ?? null,
      availableBalance: account.balances.available?.toString() ?? null,
      isoCurrencyCode: account.balances.iso_currency_code ?? null,
    }

    const [result] = await db
      .insert(plaidAccounts)
      .values(values)
      .onConflictDoUpdate({
        target: plaidAccounts.accountId,
        set: {
          name: values.name,
          officialName: values.officialName,
          mask: values.mask,
          type: values.type,
          subtype: values.subtype,
          currentBalance: values.currentBalance,
          availableBalance: values.availableBalance,
          isoCurrencyCode: values.isoCurrencyCode,
        },
      })
      .returning()

    results.push(result)
  }

  return results
}
