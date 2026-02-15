import { and, eq } from 'drizzle-orm'
import { db } from '../../database'
import { categories } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid transaction ID' })
  }

  const body = await readBody(event)

  if (body.type && !['income', 'expense'].includes(body.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Type must be "income" or "expense"' })
  }
  if (body.amount !== undefined) {
    const amt = parseFloat(body.amount)
    if (isNaN(amt) || amt <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Amount must be a positive number' })
    }
    body.amount = amt.toFixed(2)
  }
  if (body.description !== undefined && !body.description.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Description is required' })
  }
  if (body.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    throw createError({ statusCode: 400, statusMessage: 'Date must be in YYYY-MM-DD format' })
  }

  if (body.categoryId) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, Number(body.categoryId)), eq(categories.userId, session.user.id)),
    })
    if (!category) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid category' })
    }
  }

  const updated = await updateTransaction(id, session.user.id, body)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Transaction not found' })
  }

  return updated
})
