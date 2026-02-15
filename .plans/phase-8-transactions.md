# Phase 8: Transactions Feature

> **Status:** Planned
> **Dependencies:** Phases 0-7 (all complete)
> **Estimated tasks:** 34

---

## Overview

Add the core Transactions feature — the foundational financial data layer. Includes database schema (categories + transactions), full CRUD API, client composables, and complete transactions UI. Wires dashboard overview cards to real aggregated data.

**No `nuxt.config.ts` changes required** — uses existing Drizzle + Nitro + Nuxt UI stack.

---

## Phase 8.1 — Database Schema (4 tasks)

> Goal: Add `categories` and `transactions` tables, run migration

### 8.1.1 — Add `categories` table to `server/database/schema.ts`
- Columns: id, userId (FK → users, cascade delete), name, icon, color, createdAt
- Indexes: `(userId)`, unique `(userId, name)`

### 8.1.2 — Add `transactions` table to `server/database/schema.ts`
- Columns: id, userId (FK → users, cascade delete), categoryId (FK → categories, set null), type ('income'|'expense'), amount (numeric 12,2), description, date (YYYY-MM-DD string), notes, createdAt, updatedAt
- Indexes: `(userId)`, `(userId, date)`, `(userId, categoryId)`

### 8.1.3 — Add Drizzle relations
- `usersRelations` → many categories, many transactions
- `categoriesRelations` → one user, many transactions
- `transactionsRelations` → one user, one category

### 8.1.4 — Generate and run migration
- `bun run db:generate && bun run db:migrate`
- Verify tables exist in PostgreSQL

---

## Phase 8.2 — Categories API (6 tasks)

> Goal: CRUD endpoints for user categories

### 8.2.1 — `server/utils/categories.ts`
- `getUserCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()`
- All queries include userId ownership check

### 8.2.2 — Add `validateCategoryName()` to `server/utils/validation.ts`

### 8.2.3 — GET `/api/categories` — list user's categories
### 8.2.4 — POST `/api/categories` — create category (409 on duplicate name)
### 8.2.5 — PUT `/api/categories/[id]` — update category
### 8.2.6 — DELETE `/api/categories/[id]` — delete category (transactions → null)

---

## Phase 8.3 — Transactions API (8 tasks)

> Goal: Full CRUD + dashboard summary endpoint

### 8.3.1 — `server/utils/transactions.ts`
- `getUserTransactions()` with filters (type, category, date range, pagination)
- `getTransactionById()`, `createTransaction()`, `updateTransaction()`, `deleteTransaction()`
- `getDashboardSummary()` — SQL aggregation for total balance, monthly spending, recent count

### 8.3.2 — Add `validateTransaction()` to `server/utils/validation.ts`

### 8.3.3 — GET `/api/transactions` — list with filters + pagination (max 100/page)
### 8.3.4 — POST `/api/transactions` — create (validates category ownership)
### 8.3.5 — GET `/api/transactions/[id]` — get single with category data
### 8.3.6 — PUT `/api/transactions/[id]` — partial update
### 8.3.7 — DELETE `/api/transactions/[id]` — delete
### 8.3.8 — GET `/api/dashboard/summary` — aggregated stats for overview cards

---

## Phase 8.4 — Client Composables + Validation (4 tasks)

> Goal: Frontend data management

### 8.4.1 — `app/composables/useCategories.ts`
- `fetchCategories()`, `addCategory()`, `removeCategory()`

### 8.4.2 — `app/composables/useTransactions.ts`
- `fetchTransactions(filters)`, `addTransaction()`, `editTransaction()`, `removeTransaction()`
- Pagination support via `total` + `offset`

### 8.4.3 — `app/composables/useDashboardSummary.ts`
- `fetchSummary()` → totalBalance, monthlySpending, recentTransactionCount

### 8.4.4 — Add `validateTransactionForm()` to `app/utils/validation.ts`
- Mirrors server validation

---

## Phase 8.5 — UI Components (4 tasks)

> Goal: Transaction display and management components

### 8.5.1 — `app/components/transactions/TransactionForm.vue`
- Create/edit form using UForm + FormError[] pattern
- Fields: type (select), amount (number), description, date, category (select), notes (textarea)
- Props: optional `transaction` for edit mode

### 8.5.2 — `app/components/transactions/TransactionList.vue`
- UTable with columns: date, description, category badge, colored amount, actions
- Empty state when no transactions

### 8.5.3 — `app/components/transactions/TransactionFilters.vue`
- Type filter, category filter, date range
- Emits `@filter-change`

### 8.5.4 — `app/components/transactions/TransactionDeleteConfirm.vue`
- UModal with confirm/cancel

---

## Phase 8.6 — Wire Up Dashboard Pages (3 tasks)

> Goal: Replace placeholders with real functionality

### 8.6.1 — Rewrite `app/pages/dashboard/transactions.vue`
- Header with "Add Transaction" button → UModal with TransactionForm
- TransactionFilters + TransactionList + pagination
- Edit modal (reuses TransactionForm) + delete confirmation

### 8.6.2 — Wire `app/pages/dashboard/index.vue` overview cards
- Use `useDashboardSummary()` for real data
- Add `app/utils/format.ts` with `formatAmount()` utility

### 8.6.3 — Add "Recent Transactions" section or quick-add to dashboard overview

---

## Phase 8.7 — Seed Categories (2 tasks)

> Goal: Default categories for new users

### 8.7.1 — Add `seedDefaultCategories()` to `server/utils/categories.ts`
- 9 default categories: Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Salary, Freelance, Other
- Idempotent — only seeds if user has zero categories

### 8.7.2 — Trigger seeding from GET `/api/categories`
- Call `seedDefaultCategories()` instead of `getUserCategories()` directly

---

## Phase 8.8 — E2E Tests (3 tasks)

> Goal: Automated testing for new endpoints

### 8.8.1 — `tests/transactions/api.spec.ts` (~7 tests)
- Auth protection (401) for all new endpoints
- Validation errors (400) for invalid input

### 8.8.2 — `tests/transactions/pages.spec.ts` (~2 tests)
- Page auth protection (redirects to /login)

### 8.8.3 — Run full test suite
- All 50 existing + new tests pass

---

## Execution Order

```
8.1 Database Schema ──────────────────────────┐
    │                                          │
8.2 Categories API                             │
    │                                          │
8.3 Transactions API ─────────────────────────┤
    │                                          │
8.4 Client Composables + Validation            │
    │                                          │
8.5 UI Components                   8.7 Seed Categories
    │                                          │
8.6 Wire Up Pages ────────────────────────────┘
    │
8.8 E2E Tests
```

---

## New Files (~22)

| File | Description |
|------|-------------|
| `server/utils/categories.ts` | Category CRUD + seeding |
| `server/utils/transactions.ts` | Transaction CRUD + aggregation |
| `server/api/categories/index.get.ts` | List categories |
| `server/api/categories/index.post.ts` | Create category |
| `server/api/categories/[id].put.ts` | Update category |
| `server/api/categories/[id].delete.ts` | Delete category |
| `server/api/transactions/index.get.ts` | List transactions |
| `server/api/transactions/index.post.ts` | Create transaction |
| `server/api/transactions/[id].get.ts` | Get transaction |
| `server/api/transactions/[id].put.ts` | Update transaction |
| `server/api/transactions/[id].delete.ts` | Delete transaction |
| `server/api/dashboard/summary.get.ts` | Dashboard stats |
| `app/composables/useTransactions.ts` | Transaction composable |
| `app/composables/useCategories.ts` | Category composable |
| `app/composables/useDashboardSummary.ts` | Dashboard summary composable |
| `app/utils/format.ts` | Currency formatting |
| `app/components/transactions/TransactionForm.vue` | Create/edit form |
| `app/components/transactions/TransactionList.vue` | Table display |
| `app/components/transactions/TransactionFilters.vue` | Filter bar |
| `app/components/transactions/TransactionDeleteConfirm.vue` | Delete modal |
| `tests/transactions/api.spec.ts` | API tests |
| `tests/transactions/pages.spec.ts` | Page tests |

## Modified Files (~4)

| File | Change |
|------|--------|
| `server/database/schema.ts` | Add tables + relations |
| `server/utils/validation.ts` | Add category + transaction validation |
| `app/utils/validation.ts` | Add client-side transaction validation |
| `app/pages/dashboard/transactions.vue` | Replace empty state with full UI |
| `app/pages/dashboard/index.vue` | Wire overview cards to real data |

---

## Key Design Decisions

- **Amounts as `numeric(12,2)` + string**: Avoids floating-point precision issues. Passed as strings throughout the stack.
- **Date as `date` mode `string`**: YYYY-MM-DD format avoids timezone conversion problems.
- **Category auto-seeding**: On first GET, not during registration — keeps registration fast and simple.
- **Ownership baked into every query**: `eq(transactions.userId, session.user.id)` in every function, never accepting userId from client.
- **Pagination capped at 100**: Prevents abuse on the list endpoint.
- **Dashboard summary via SQL aggregation**: 3 efficient queries, no client-side calculation.

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Float precision in amounts | Medium | `numeric(12,2)` + string transport |
| Drizzle relations setup | Low | Already uses `drizzle(client, { schema })` with `import * as schema` |
| User data isolation | High | Every query includes userId ownership check |
| Slow queries on large datasets | Low | Indexes on (userId, date), (userId, categoryId), pagination |
| No nuxt.config changes needed | None | Pure additive — existing stack sufficient |
