import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm'
import { db } from '../database'
import { transactions } from '../database/schema'

interface TransactionFilters {
  type?: 'income' | 'expense'
  categoryId?: number
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export async function getUserTransactions(userId: number, filters: TransactionFilters = {}) {
  const conditions = [eq(transactions.userId, userId)]

  if (filters.type) conditions.push(eq(transactions.type, filters.type))
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId))
  if (filters.startDate) conditions.push(gte(transactions.date, filters.startDate))
  if (filters.endDate) conditions.push(lte(transactions.date, filters.endDate))

  const items = await db.query.transactions.findMany({
    where: and(...conditions),
    with: { category: true },
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  })

  const [countResult] = await db
    .select({ total: count() })
    .from(transactions)
    .where(and(...conditions))
  const total = countResult?.total ?? 0

  return { items, total }
}

export async function getTransactionById(id: number, userId: number) {
  return db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
    with: { category: true },
  })
}

export async function createTransaction(userId: number, data: {
  type: 'income' | 'expense'
  amount: string
  description: string
  date: string
  categoryId?: number
  notes?: string
}) {
  const [transaction] = await db
    .insert(transactions)
    .values({
      userId,
      type: data.type,
      amount: data.amount,
      description: data.description.trim(),
      date: data.date,
      categoryId: data.categoryId ?? null,
      notes: data.notes?.trim() ?? null,
    })
    .returning()
  return transaction
}

export async function updateTransaction(id: number, userId: number, data: {
  type?: 'income' | 'expense'
  amount?: string
  description?: string
  date?: string
  categoryId?: number | null
  notes?: string | null
}) {
  const setData: Record<string, any> = {}
  if (data.type !== undefined) setData.type = data.type
  if (data.amount !== undefined) setData.amount = data.amount
  if (data.description !== undefined) setData.description = data.description.trim()
  if (data.date !== undefined) setData.date = data.date
  if (data.categoryId !== undefined) setData.categoryId = data.categoryId
  if (data.notes !== undefined) setData.notes = data.notes?.trim() ?? null

  const [updated] = await db
    .update(transactions)
    .set(setData)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning()
  return updated ?? null
}

export async function deleteTransaction(id: number, userId: number) {
  const [deleted] = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning()
  return deleted ?? null
}

export async function getDashboardSummary(userId: number) {
  const now = new Date()
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const [balanceResult] = await db
    .select({
      totalIncome: sql<string>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)`,
      totalExpenses: sql<string>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))

  const [monthlyResult] = await db
    .select({
      monthlySpending: sql<string>`COALESCE(SUM(amount), 0)`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, 'expense'),
      gte(transactions.date, startOfMonth),
      lte(transactions.date, endOfMonth),
    ))

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]!
  const [recentResult] = await db
    .select({ recentCount: count() })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.date, thirtyDaysAgo),
    ))

  const totalIncome = parseFloat(balanceResult?.totalIncome ?? '0')
  const totalExpenses = parseFloat(balanceResult?.totalExpenses ?? '0')

  return {
    totalBalance: (totalIncome - totalExpenses).toFixed(2),
    monthlySpending: parseFloat(monthlyResult?.monthlySpending ?? '0').toFixed(2),
    recentTransactionCount: recentResult?.recentCount ?? 0,
  }
}
