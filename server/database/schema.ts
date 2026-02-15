import { pgTable, serial, varchar, text, boolean, timestamp, integer, numeric, date, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

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

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('categories_user_id_idx').on(table.userId),
  uniqueIndex('categories_user_name_idx').on(table.userId, table.name),
])

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 10 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('transactions_user_id_idx').on(table.userId),
  index('transactions_user_date_idx').on(table.userId, table.date),
  index('transactions_user_category_idx').on(table.userId, table.categoryId),
])

export const plaidItems = pgTable('plaid_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 255 }).notNull().unique(),
  encryptedAccessToken: text('encrypted_access_token').notNull(),
  institutionId: varchar('institution_id', { length: 100 }),
  institutionName: varchar('institution_name', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('healthy'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('plaid_items_user_id_idx').on(table.userId),
])

export const plaidAccounts = pgTable('plaid_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plaidItemId: integer('plaid_item_id').notNull().references(() => plaidItems.id, { onDelete: 'cascade' }),
  accountId: varchar('account_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  officialName: varchar('official_name', { length: 255 }),
  mask: varchar('mask', { length: 10 }),
  type: varchar('type', { length: 50 }).notNull(),
  subtype: varchar('subtype', { length: 50 }),
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }),
  availableBalance: numeric('available_balance', { precision: 12, scale: 2 }),
  isoCurrencyCode: varchar('iso_currency_code', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('plaid_accounts_user_id_idx').on(table.userId),
  index('plaid_accounts_plaid_item_id_idx').on(table.plaidItemId),
])

export const syncCursors = pgTable('sync_cursors', {
  id: serial('id').primaryKey(),
  plaidItemId: integer('plaid_item_id').notNull().references(() => plaidItems.id, { onDelete: 'cascade' }).unique(),
  cursor: text('cursor'),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  transactions: many(transactions),
  verificationTokens: many(verificationTokens),
  plaidItems: many(plaidItems),
}))

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, { fields: [verificationTokens.userId], references: [users.id] }),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
}))

export const plaidItemsRelations = relations(plaidItems, ({ one, many }) => ({
  user: one(users, { fields: [plaidItems.userId], references: [users.id] }),
  plaidAccounts: many(plaidAccounts),
  syncCursor: one(syncCursors),
}))

export const plaidAccountsRelations = relations(plaidAccounts, ({ one }) => ({
  user: one(users, { fields: [plaidAccounts.userId], references: [users.id] }),
  plaidItem: one(plaidItems, { fields: [plaidAccounts.plaidItemId], references: [plaidItems.id] }),
}))

export const syncCursorsRelations = relations(syncCursors, ({ one }) => ({
  plaidItem: one(plaidItems, { fields: [syncCursors.plaidItemId], references: [plaidItems.id] }),
}))
