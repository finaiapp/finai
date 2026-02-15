# Coding Conventions

**Analysis Date:** 2025-02-15

## Naming Patterns

**Files:**
- API endpoints: kebab-case with HTTP method suffix (e.g., `server/api/auth/login.post.ts`, `server/api/transactions/index.get.ts`)
- Components: PascalCase (e.g., `app/components/auth/LoginForm.vue`, `app/components/dashboard/Sidebar.vue`)
- Pages: kebab-case (e.g., `app/pages/forgot-password.vue`, `app/pages/dashboard/transactions.vue`)
- Utilities: camelCase (e.g., `app/utils/error.ts`, `server/utils/validation.ts`)
- Middleware: camelCase (e.g., `app/middleware/auth.ts`)
- Composables: camelCase with `use` prefix (e.g., `app/composables/useAuth.ts`, `app/composables/useTransactions.ts`)

**Functions:**
- Camel case (e.g., `formatAmount()`, `validateEmail()`, `getUserTransactions()`, `findUserByEmail()`)
- Helpers starting with verb pattern (e.g., `extractErrorMessage()`, `sanitizeName()`, `verifyToken()`)
- Async functions use same naming as sync (no async prefix)

**Variables:**
- Local state: camelCase (e.g., `state`, `loading`, `error`, `unverified`)
- Constants: UPPER_SNAKE_CASE (e.g., `DATE_REGEX`, used in `server/api/transactions/index.get.ts`)
- Reactive refs: camelCase (e.g., `error`, `loading`, `categories`)
- Props and emits: camelCase (e.g., `transaction`, `categories`, `disabled`)

**Types:**
- Interfaces: PascalCase (e.g., `AuthUser`, `LoginResponse`, `TransactionFilters`)
- Type objects: PascalCase (e.g., `FormError`, `FormSubmitEvent`)
- Discriminant unions: use string literals (e.g., `type: 'income' | 'expense'`)

## Code Style

**Formatting:**
- Tool: None enforced via linter/formatter (Prettier not in config)
- Indentation: 2 spaces (observed in all files)
- Line endings: LF
- Semicolons: Always present (observed consistently)
- Quotes: Single quotes in TypeScript, template literals for multiline

**Linting:**
- No ESLint or Prettier config found
- Style is enforced through code review patterns only
- Vue files use `<script setup lang="ts">` pattern consistently

## Import Organization

**Order:**
1. Node built-ins (e.g., `import { randomBytes } from 'node:crypto'`)
2. Third-party libraries (e.g., `import { drizzle } from 'drizzle-orm'`)
3. Framework imports (e.g., `import { defineEventHandler } from 'h3'`, `import type { FormError }`)
4. Local imports (e.g., `import { db } from '../database'`)
5. Type imports separated with `import type` (observed in `app/composables/useAuth.ts`)

**Path Aliases:**
- Not used for app/ files — use relative imports
- Server files use relative imports like `../../database` (never use `~/server/...`)
- Documented in CLAUDE.md that app/ resolves to app/ in Nuxt 4, not to src/

## Error Handling

**Patterns:**
- API errors extracted via `extractErrorMessage()` utility in `app/utils/error.ts`
- Signature: `extractErrorMessage(err: unknown, fallback = 'Something went wrong'): string`
- Extracts `err?.statusMessage` or `err?.data?.message` or returns fallback
- Used in all forms and composables to normalize $fetch errors
- Server-side: throw `createError({ statusCode, statusMessage })` (Nitro pattern)
- Status codes: 400 (validation), 401 (auth required/failed), 403 (forbidden, e.g., unverified email), 429 (rate limited)

**Component error state:**
- Local `error` ref stores message as string
- Cleared before submit with `error.value = ''`
- Set in catch block: `error.value = extractErrorMessage(err, 'Default message')`
- Displayed via `<UAlert v-if="error" color="error" :title="error" />`

## Logging

**Framework:** Console only (no dedicated logging library)

**Patterns:**
- Not observed in codebase (logs not used in tests or implementations)
- No structured logging for analytics or debugging
- Error tracking handled via extractErrorMessage + UI display

## Comments

**When to Comment:**
- Sync comments between client and server validation (e.g., `// Keep in sync with app/utils/validation.ts`)
- Observed in `app/utils/validation.ts` and `server/utils/validation.ts`
- Explains why code differs or needs keeping synchronized

**JSDoc/TSDoc:**
- Not used (no JSDoc comments observed)
- Types inferred from TypeScript signatures

## Function Design

**Size:** Small, single-responsibility functions
- Validation functions return objects (e.g., `{ valid: boolean; message?: string }`) or arrays of errors
- Utility functions under 20 lines typically
- Composables aggregate related functions (e.g., `useAuth()` returns 5 methods)

**Parameters:**
- Data objects for related fields (e.g., `data: { type, amount, description, date }` in create functions)
- Filters as optional object (e.g., `filters: TransactionFilters = {}`)
- userId passed explicitly to ensure ownership checks

**Return Values:**
- Database functions return full objects with `returning()` (Drizzle pattern)
- Filters return objects with calculated totals (e.g., `{ items, total }`)
- Validation functions return result objects, not exceptions (except server-side createError)

## Module Design

**Exports:**
- Utilities export single functions (e.g., `export function extractErrorMessage(...)`)
- Services export multiple functions (e.g., `server/utils/transactions.ts` exports 6 functions)
- No default exports (all named)

**Barrel Files:**
- Not used in this codebase
- Components imported directly by path

## Key Patterns

**Form Validation (Vue components):**
```typescript
function validate(state: typeof state): FormError[] {
  const errors: FormError[] = []
  if (!state.email) errors.push({ name: 'email', message: 'Email is required' })
  return errors
}
```
Uses Nuxt UI's FormError type, returns array of `{ name, message }` objects.

**Async Form Submission:**
```typescript
async function onSubmit(event: FormSubmitEvent<typeof state>) {
  error.value = ''
  loading.value = true
  try {
    // API call
    await navigateTo('/dashboard')
  } catch (err: any) {
    error.value = extractErrorMessage(err, 'Default message')
  } finally {
    loading.value = false
  }
}
```
Always clear error, set loading, try/catch with extractErrorMessage, finally clear loading.

**Database Ownership:**
Every database query includes userId check via `eq(table.userId, userId)` in where clause. Example from `server/utils/transactions.ts`:
```typescript
export async function getTransactionById(id: number, userId: number) {
  return db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
  })
}
```

**Rate Limiting Integration:**
Server API routes call `checkRateLimit(limiter, identifier)` after `requireUserSession()`. Example from `server/api/auth/login.post.ts`:
```typescript
const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
await checkRateLimit(authRateLimiter, ip)
```

**Data Formatting:**
Use `app/utils/format.ts` for display values:
- `formatAmount(amount: string | number): string` — returns USD currency formatted
- `formatDate(date: string): string` — returns localized date from YYYY-MM-DD string

**Numeric Amounts in Database:**
Amounts stored as `numeric(12,2)` in database, transported as strings in JSON, parsed to number only for calculations. Example from `server/utils/transactions.ts`:
```typescript
const totalIncome = parseFloat(balanceResult.totalIncome)
return {
  totalBalance: (totalIncome - totalExpenses).toFixed(2),
}
```

---

*Convention analysis: 2025-02-15*
