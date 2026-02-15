import { eq, and } from 'drizzle-orm'
import { db } from '../database'
import { categories } from '../database/schema'

export async function getUserCategories(userId: number) {
  return db.query.categories.findMany({
    where: eq(categories.userId, userId),
    orderBy: categories.name,
  })
}

export async function createCategory(userId: number, data: { name: string; icon?: string; color?: string }) {
  const [category] = await db
    .insert(categories)
    .values({
      userId,
      name: data.name.trim(),
      icon: data.icon ?? null,
      color: data.color ?? null,
    })
    .returning()
  return category
}

export async function updateCategory(id: number, userId: number, data: { name?: string; icon?: string; color?: string }) {
  const [updated] = await db
    .update(categories)
    .set({
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
    })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning()
  return updated ?? null
}

export async function deleteCategory(id: number, userId: number) {
  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning()
  return deleted ?? null
}

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'i-lucide-utensils', color: 'orange' },
  { name: 'Transportation', icon: 'i-lucide-car', color: 'blue' },
  { name: 'Shopping', icon: 'i-lucide-shopping-bag', color: 'purple' },
  { name: 'Entertainment', icon: 'i-lucide-film', color: 'pink' },
  { name: 'Bills & Utilities', icon: 'i-lucide-receipt', color: 'yellow' },
  { name: 'Healthcare', icon: 'i-lucide-heart-pulse', color: 'red' },
  { name: 'Salary', icon: 'i-lucide-banknote', color: 'green' },
  { name: 'Freelance', icon: 'i-lucide-laptop', color: 'teal' },
  { name: 'Other', icon: 'i-lucide-circle-dot', color: 'neutral' },
]

export async function seedDefaultCategories(userId: number) {
  const existing = await getUserCategories(userId)
  if (existing.length > 0) return existing

  // Use onConflictDoNothing to handle race conditions when
  // concurrent requests both attempt to seed for the same user
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map(c => ({ ...c, userId })),
  ).onConflictDoNothing()

  return getUserCategories(userId)
}
