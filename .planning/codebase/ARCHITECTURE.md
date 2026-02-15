# Architecture

**Analysis Date:** 2025-02-15

## Pattern Overview

**Overall:** Full-stack Nuxt 4 monolithic application with clear client-server separation using Nitro backend and file-based routing.

**Key Characteristics:**
- Client-server architecture with sealed-cookie sessions (nuxt-auth-utils)
- Event-driven server-side API design (Nitro)
- Reactive frontend state management via composables (useAuth, useTransactions, useCategories, useDashboardSummary)
- PostgreSQL relational database with Drizzle ORM
- OAuth 2.0 integration (GitHub, Google) for authentication
- Rate limiting and security headers on server middleware

## Layers

**Presentation (Client):**
- Purpose: Vue 3 components with Nuxt UI v4 styling and form handling
- Location: `app/pages/`, `app/components/`, `app/layouts/`
- Contains: Page components, feature components (auth, dashboard, transactions, landing), layouts
- Depends on: Composables, utilities, nuxt-auth-utils session management
- Used by: Browser clients, accessible via HTTP routes

**API Layer (Server):**
- Purpose: RESTful endpoints for client requests with validation, rate limiting, and error handling
- Location: `server/api/` (standard Nitro routes: `/api/*`) and `server/routes/auth/` (OAuth handlers)
- Contains: Event handlers with request validation, database operations, session management
- Depends on: Server utils, database layer, nuxt-auth-utils, rate-limiter-flexible
- Used by: Client-side composables via `$fetch()`, OAuth providers

**Data Access Layer:**
- Purpose: Centralized database operations and business logic
- Location: `server/utils/` (auth.ts, transactions.ts, categories.ts, validation.ts)
- Contains: CRUD operations, query builders, data transformations
- Depends on: Drizzle ORM, Postgres driver
- Used by: API endpoints

**Database Layer:**
- Purpose: Schema definition and ORM setup
- Location: `server/database/schema.ts` (tables and relations), `server/database/index.ts` (connection)
- Contains: Drizzle table definitions, relations, indexes
- Depends on: PostgreSQL, postgres.js driver
- Used by: All data access functions

**Cross-Cutting Services:**
- Purpose: Authentication, validation, error handling, formatting
- Location: `server/utils/rate-limit.ts`, `server/utils/email.ts`, `app/utils/validation.ts`, `app/utils/error.ts`, `app/utils/format.ts`
- Contains: Rate limiting via rate-limiter-flexible, validation rules, error utilities
- Depends on: External services (Resend for email)
- Used by: All API endpoints and client components

## Data Flow

**Authentication Flow (Email/Password):**

1. User submits login form (`app/pages/login.vue` → `LoginForm.vue`)
2. Form calls `useAuth().login(email, password)` composable
3. Composable posts to `/api/auth/login` endpoint
4. Server validates email/password, rate limits, queries user from DB
5. Server calls `setUserSession()` (nuxt-auth-utils) to set sealed cookie
6. Server returns user object
7. Client calls `useUserSession().fetch()` to refresh session state
8. Client redirects to dashboard

**Transaction Creation Flow:**

1. User fills form (`app/pages/dashboard/transactions.vue` → `TransactionForm.vue`)
2. Form calls `useTransactions().addTransaction(data)`
3. Composable posts to `/api/transactions` with validated data
4. Server validates transaction fields, requires authentication middleware
5. Server calls `createTransaction()` util which inserts via Drizzle ORM
6. Database returns inserted transaction with auto-generated ID
7. Client receives transaction, adds to local `transactions` ref
8. UI updates reactively

**Dashboard Summary Flow:**

1. Page mounts (`app/pages/dashboard/index.vue`)
2. Calls `useDashboardSummary().fetchSummary()` composable
3. Composable gets `/api/dashboard/summary`
4. Server calls `getDashboardSummary()` util which:
   - Queries total income/expense with SQL aggregation
   - Calculates monthly spending for current month
   - Counts recent transactions (30 days)
5. Returns computed summary object
6. Client stores in `summary` ref and renders overview cards

**State Management:**

- Session state: `nuxt-auth-utils` sealed cookies (server-encrypted, client-opaque)
- Client state: Composable refs (`transactions`, `categories`, `summary`, `loading`, `error`)
- No Pinia/Vuex — single-source-of-truth via composables + server session
- Error state: Maintained in composables, extracted via `handleApiError()` utility
- Loading state: Boolean `ref` in each composable during async operations

## Key Abstractions

**User Session (nuxt-auth-utils):**
- Purpose: Secure session management via sealed cookies without database sessions table
- Examples: `useUserSession()` in composables, `setUserSession()` in OAuth handlers
- Pattern: Password hashing via scrypt (built into nuxt-auth-utils), session fetch/clear methods
- Encrypted cookie persists user ID + metadata, no plain-text storage

**Composables as API Clients:**
- Purpose: Encapsulate HTTP requests with loading/error state
- Examples: `app/composables/useAuth.ts`, `app/composables/useTransactions.ts`
- Pattern: Refs for state (`transactions`, `loading`, `error`), async functions to fetch/mutate, single return object
- All composables expose `error` ref extracted via `handleApiError()` for 401 session expiry

**Validation Layer (Mirrored Client/Server):**
- Purpose: Consistent validation across boundary without code duplication
- Examples: `app/utils/validation.ts` ↔ `server/utils/validation.ts`
- Pattern: Sync comments linking client/server validation functions, same rules on both sides
- Prevents data integrity issues if client validation is bypassed

**Rate Limiting (In-Memory):**
- Purpose: Protect against brute force and API abuse
- Examples: `checkRateLimit(authRateLimiter, ip)`, `checkRateLimit(accountRateLimiter, email)`
- Pattern: rate-limiter-flexible with different limiters for auth endpoints (IP-based) and account endpoints (email-based)
- Throws 429 error if limit exceeded

## Entry Points

**Client Entry Point:**
- Location: `app/app.vue`
- Triggers: Browser loads any path
- Responsibilities: Renders `<NuxtLayout>` + `<NuxtPage>` (delegating to layouts/pages), displays route announcements

**Default Layout:**
- Location: `app/layouts/default.vue`
- Triggers: Pages without explicit layout override
- Responsibilities: Header (brand + conditional nav), footer, main content slot
- Shows "Sign In / Get Started" if logged out, "Dashboard / Sign Out" if logged in

**Dashboard Layout:**
- Location: `app/layouts/dashboard.vue`
- Triggers: Pages under `/dashboard/*` with `definePageMeta({ layout: 'dashboard' })`
- Responsibilities: Sidebar with navigation, user profile footer, dashboard panel
- User data loaded from `useAuth().user` session ref

**Authentication Middleware:**
- Location: `app/middleware/auth.ts`
- Triggers: Routes with `definePageMeta({ middleware: 'auth' })`
- Responsibilities: Redirects unauthenticated users to `/login`, unverified users to `/verify-email`

**API Endpoints (Sample Entry Points):**
- `server/api/auth/login.post.ts` — User login, rate limited by IP + email
- `server/api/transactions/index.get.ts` — List transactions with query filters and pagination
- `server/routes/auth/github.get.ts` — OAuth callback handler

## Error Handling

**Strategy:** Hierarchical error handling with specific status codes and user-facing messages

**Patterns:**

- **Authentication Errors (401, 403):** Server throws `createError({ statusCode: 401/403, statusMessage: '...' })`
  - 401: Session expired or invalid credentials
  - 403: Email not verified, permission denied
  - Client catches via `handleApiError()` which logs out and redirects to `/login`

- **Validation Errors (400):** Server validates input and throws `createError({ statusCode: 400, statusMessage: 'Field X is invalid' })`
  - Both client and server validate independently (mirrored rules)
  - Client forms display field-level errors via Nuxt UI `UForm` validation

- **Rate Limit Errors (429):** `checkRateLimit()` throws when threshold exceeded
  - Different limiters for auth (IP-based) and account operations (email-based)

- **API Errors (500):** Uncaught exceptions bubble up, Nitro logs and returns generic "Something went wrong"
  - Composables extract message via `extractErrorMessage(err, 'Something went wrong')`

- **Not Found (404):** Missing resources return null, endpoint returns empty or 404

## Cross-Cutting Concerns

**Logging:** Console-based logging in OAuth error handlers (`server/routes/auth/github.get.ts`), no structured logger configured

**Validation:**
- Client-side: `validateEmail()`, `validateTransactionForm()`, `validatePassword()`, `validateNotes()` in `app/utils/validation.ts`
- Server-side: Equivalent functions in `server/utils/validation.ts` with sync comments
- Forms use Nuxt UI `UForm` with `:validate` function returning `FormError[]`

**Authentication:**
- Primary: Email/password with scrypt hashing via nuxt-auth-utils
- OAuth: GitHub and Google via `defineOAuthGitHubEventHandler` and `defineOAuthGoogleEventHandler`
- Session: Sealed cookies (no database sessions), user profile + loggedInAt timestamp
- Route protection: `auth` middleware redirects to `/login` if not logged in, to `/verify-email` if email not verified

**Security Headers (Server Middleware):**
- Location: `server/middleware/security.ts`
- CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- Applied globally to all responses via `setResponseHeaders()`

**Data Ownership:** All queries filter by `userId` to ensure users can only access their own data
- Pattern: `eq(transactions.userId, session.user.id)` in all queries
- Examples: `getUserTransactions()`, `getUserCategories()`, `getDashboardSummary()`
