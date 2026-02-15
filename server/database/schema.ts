import { pgTable, serial, varchar, text, boolean, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  provider: varchar('provider', { length: 50 }),
  providerId: varchar('provider_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('provider_provider_id_idx').on(table.provider, table.providerId),
])

export const verificationTokens = pgTable('verification_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('verification_tokens_user_type_idx').on(table.userId, table.type),
])
