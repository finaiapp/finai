# Coding Conventions

**Analysis Date:** 2025-02-15

## Naming Patterns

**Files:**
- Server API endpoints: kebab-case with HTTP method suffix (`login.post.ts`, `index.get.ts`, `[id].put.ts`)
- Route handlers: `[id].get.ts`, `[id].put.ts`, `[id].delete.ts` for parameterized routes
- Vue components: PascalCase (`LoginForm.vue`, `OAuthButtons.vue`)
- Composables: camelCase with `use` prefix (`useAuth.ts`, `useTransactions.ts`)
- Utilities: camelCase (`error.ts`, `validation.ts`, `format.ts`)
- Server utilities: camelCase (`categories.ts`, `auth.ts`, `transactions.ts`)
- Tests: kebab-case with `.spec.ts` suffix (`api-flows.spec.ts`, `rate-limiting.spec.ts`)

**Functions:**
- Async database queries: camelCase starting with `get`, `find`, `create`, `update`, `delete` (`getUserCategories()`, `createTransaction()`, `findUserByEmail()`)
- Validation functions: `validate[EntityName]()` pattern (`validateEmail()`, `validateCategoryName()`, `validateTransaction()`)
- Handler functions: `handle[Action]()` or simple exported `default` for route handlers
- Composable functions: lowercase action verbs (`fetchTransactions()`, `addCategory()`, `removeTransaction()`)
- Formatting functions: `format[Type]()` pattern (`formatAmount()`, `formatDate()`)

**Variables:**
- State refs: camelCase (`error`, `loading`, `transactions`, `categories`)
- Constants: UPPER_SNAKE_CASE for module-level constants (`DEFAULT_CATEGORIES`, `DATE_REGEX`)
- Interface properties: camelCase (`emailVerified`, `avatarUrl`, `providerId`)
- Boolean refs: prefixed with `is` or `has` where meaningful, or action-based (`unverified`, `loading`)

**Types:**
- Interfaces: PascalCase, named by entity + suffix (`LoginResponse`, `TransactionsResponse`, `AuthUser`, `Category`, `Transaction`)
- Type unions: PascalCase (`FormError`, `FormSubmitEvent`)
- Generic type parameters: Single letter or descriptive (`T` for generic, `U` for unique)

## Code Style

**Formatting:**
- No explicit linter/formatter config detected in codebase
- Follows implicit Nuxt/Vue 3 style conventions
- Lines are consistently indented with 2 spaces
- Semicolons used consistently at end of statements
- Double quotes for strings (Vue templates use single quotes for consistency)

**Error Handling:**
- Nitro errors: `createError({ statusCode, statusMessage })` pattern in all API endpoints
- Client errors: try-catch blocks with `extractErrorMessage(err, fallback)` utility
- Error extraction helper: `app/utils/error.ts` — extracts `statusMessage` or `data.message` from caught errors
- Form validation errors: Return objects with `valid: boolean; message?: string` structure
- Array-based errors: FormError[] with `{ name, message }` for field validation on forms

**Validation Patterns:**
- Server-side validation: `validateEmail()`, `validatePassword()`, `validateTransaction()` in `server/utils/validation.ts`
- Client-side validation: Mirror functions in `app/utils/validation.ts` (comments say "Keep in sync with server/utils/validation.ts")
- Custom UForm validate function: Return `FormError[]` array with field names for failed validations
- Data validation in endpoints: Check fields with conditional throws, validate types and ranges
- Field allowlist: PUT endpoints use destructuring to only pass allowed fields to update functions (e.g., in `[id].put.ts`: `const { type, amount, description, date, categoryId, notes } = body`)

## Import Organization

**Order (observed pattern):**
1. Node.js built-ins (`node:crypto`, `node:url`)
2. Third-party dependencies (Drizzle, Nuxt, Vue, types)
3. Local server imports (database, utils, schemas)
4. Local client imports (composables, components, utils)

**Path Aliases:**
- No explicit path aliases defined (relies on Nuxt 4 auto-imports)
- Server imports use relative paths: `../../database`, `../../database/schema`
- Auto-imports used for Nuxt composables (`useUserSession()`, `useRoute()`, `navigateTo()`)
- Auto-imports used for Nuxt utilities (`defineEventHandler()`, `readBody()`, `createError()`)

## Logging

**Framework:** No dedicated logger detected; uses native `console` when needed

**Patterns:**
- Comments used to document intent (`// Keep in sync with...`, `// Only pass allowed fields to prevent mass assignment`)
- No logging calls in provided code samples; error logging delegated to error objects and Nuxt/Nitro internals

## Comments

**When to Comment:**
- Sync requirements between client and server: `// Keep in sync with server/utils/validation.ts` (appears in `app/utils/validation.ts`)
- Implementation notes for non-obvious logic: e.g., race condition handling in `seedDefaultCategories()`
- Test conditions and expected behavior: E2E tests include docstring comments explaining fixture approach

**JSDoc/TSDoc:**
- Not systematically used; minimal docstrings observed
- Type interfaces are self-documenting with property names and types

## Function Design

**Size:** Functions are concise and focused
- Composable functions: 5-20 lines of logic
- API endpoint handlers: 20-70 lines with validation, auth check, and return
- Utility functions: 2-15 lines

**Parameters:**
- Avoid excessive parameters; use object literals for multiple related args: `data: { name: string; icon?: string; color?: string }`
- Destructure function parameters when possible: `{ type, amount, description, date, categoryId, notes } = body`
- Type parameters explicitly in function signature: `async function validateTransaction(data: Record<string, any>)`

**Return Values:**
- Validation functions return `{ valid: boolean; message?: string }` object structure
- Database operations return single entity or null: `Category | null`, `User`, `Transaction[]`
- Composable functions return object literal with all state + action methods
- API endpoints return typed JSON response or throw Nitro errors

## Module Design

**Exports:**
- Server utils: Named exports for each operation (`export async function getUserCategories()`)
- Composables: Default export is function returning object: `export function useAuth() { return { ... } }`
- Utilities: Named exports for each function
- Components: Default export (Vue SFC)

**Barrel Files:**
- Not observed in this codebase; direct imports from source files

## Nuxt 4 App Directory Conventions

**Auto-imports:**
- `app/composables/*.ts` → auto-imported as named imports in components/pages
- `app/components/*.vue` → auto-imported in templates (prefix by folder: `components/auth/LoginForm.vue` → `<AuthLoginForm />`)
- `app/utils/*.ts` → auto-imported in components/pages
- `app/middleware/*.ts` → auto-imported in pages via `definePageMeta({ middleware: 'auth' })`

**Page Setup:**
- Pages that require authentication use: `definePageMeta({ layout: 'dashboard', middleware: 'auth' })`
- Layout default is `default.vue` unless specified in page meta
- Verify-email page has NO middleware to avoid redirect loops

## API Endpoint Patterns

**Authentication check:**
```typescript
const session = await requireUserSession(event)
// Use session.user.id for all database ownership checks
```

**Rate limiting:**
```typescript
await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')
```

**Error handling:**
```typescript
if (!validation.valid) {
  throw createError({ statusCode: 400, statusMessage: validation.message })
}
if (!found) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}
```

**Success response:**
```typescript
setResponseStatus(event, 201)  // For POST that creates
return entity
```

**Ownership verification:**
- Always check user ownership in read/update/delete operations: `where: and(eq(categories.id, id), eq(categories.userId, session.user.id))`

## Client Composable Patterns

**State management:**
```typescript
const items = ref<Type[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchItems() {
  loading.value = true
  error.value = null
  try {
    items.value = await $fetch('/api/items')
  } catch (err: any) {
    error.value = handleApiError(err)
  } finally {
    loading.value = false
  }
}

return { items, loading, error, fetchItems, addItem, removeItem }
```

**Error handling:**
```typescript
catch (err: any) {
  error.value = extractErrorMessage(err, 'Failed to fetch')
}
```

---

*Convention analysis: 2025-02-15*
