# Architecture

**Analysis Date:** 2025-02-15

## Pattern Overview

**Overall:** Full-stack Nuxt 4 application with two primary layers: client (Vue 3 + Nuxt) and server (Nitro).

**Key Characteristics:**
- File-based routing on both client and server
- Sealed cookie session management via `nuxt-auth-utils`
- Database-backed authentication with OAuth support
- Composables for client-side data fetching and state
- Server utilities for core business logic
- Rate limiting on all sensitive endpoints
- Input validation on both client and server

## Layers

**Client (Frontend):**
- Purpose: Vue 3 components, pages, layouts, and composables for user interface
- Location: `app/`
- Contains: Vue components (.vue), auto-imported composables (.ts), utilities, middleware, plugins
- Depends on: Server API endpoints (`/api/*`), routes via OAuth redirects
- Used by: Browser clients, unauthenticated and authenticated users

**Server (Backend - Nitro):**
- Purpose: REST API endpoints, OAuth handlers, session management, database operations
- Location: `server/`
- Contains: API routes (.post.ts, .get.ts, .put.ts, .delete.ts), OAuth routes, utilities, middleware, database schema
- Depends on: PostgreSQL database via Drizzle ORM, external services (GitHub OAuth, Google OAuth, Resend email)
- Used by: Client-side `$fetch()` calls, browser navigation for OAuth

**Database:**
- Purpose: Persistent storage for users, authentication tokens, transactions, and categories
- Implementation: PostgreSQL (via Docker) + Drizzle ORM
- Schema: `server/database/schema.ts`
- Tables: `users`, `verificationTokens`, `categories`, `transactions`

## Data Flow

**Authentication Flow (Login):**

1. User submits email/password via `app/pages/login.vue` → `useAuth().login()`
2. Client calls `POST /api/auth/login` with credentials
3. Server validates input, checks rate limit (IP + email), queries `users` table
4. Server verifies password hash (scrypt via `nuxt-auth-utils`)
5. Server creates sealed session cookie and returns user profile
6. Client navigates to `/dashboard`

**OAuth Flow (GitHub):**

1. User clicks OAuth button → navigates to `GET /auth/github` (server route, not API)
2. Server redirects to GitHub authorization
3. GitHub redirects back to `/auth/github` with code
4. Server exchanges code for GitHub profile, upserts user in `users` table
5. Server sets sealed session cookie, redirects to `/dashboard`
6. Client receives session from `useUserSession()`

**Transactions CRUD (Authenticated):**

1. Dashboard loads, calls `useDashboardSummary().fetchSummary()`
2. Client calls `GET /api/dashboard/summary` with IP rate limit check
3. Server validates session via `requireUserSession()`, queries user's transactions
4. Server returns aggregated data (total balance, monthly spending, recent count)
5. User creates transaction via `TransactionForm.vue` → `useTransactions().addTransaction()`
6. Client calls `POST /api/transactions` with validated data
7. Server checks session, validates input (type, amount, date format), saves to `transactions` table
8. Client updates local state or refetches list

**Verification Email Flow:**

1. User registers via `app/pages/register.vue` → `useAuth().register()`
2. Client calls `POST /api/auth/register` (does NOT set session)
3. Server creates user with `emailVerified: false`, generates verification token
4. Server sends email via Resend with verification link
5. User clicks link → navigates to `/verify-email?token=...`
6. Page shows form, user submits → `POST /api/auth/verify-email`
7. Server validates token, marks user `emailVerified: true`, redirects to login

**State Management:**

- **Session:** Sealed HTTP-only cookie via `nuxt-auth-utils`, accessed via `useUserSession()`
- **User Data:** Fetched on demand via API, cached in composables (refs: `transactions`, `summary`, `categories`)
- **Form State:** Reactive ref bindings in component `<script setup>`, validated client-side
- **Error State:** Exposed as `error` ref in composables, extracted via `handleApiError()`

## Key Abstractions

**Composables:**
- Purpose: Wrap API calls with loading/error states, provide typed data access
- Examples: `app/composables/useAuth.ts` (login/register/logout), `app/composables/useTransactions.ts` (CRUD), `app/composables/useCategories.ts` (GET/POST/PUT/DELETE), `app/composables/useDashboardSummary.ts` (aggregated stats)
- Pattern: Expose reactive refs + async functions, handle errors uniformly with `handleApiError()`

**Server Utilities:**
- Purpose: Reusable database queries and business logic
- Examples: `server/utils/auth.ts` (findUserByEmail, createUser, verifyToken), `server/utils/transactions.ts` (getUserTransactions, createTransaction, editTransaction, getDashboardSummary), `server/utils/categories.ts` (getCategoryList, createCategory, seedDefaultCategories), `server/utils/validation.ts` (validateEmail, validateCategoryName, validateTransaction)
- Pattern: Async functions that interact with `db` (Drizzle ORM instance), throw `createError()` on validation failure

**Rate Limiting:**
- Purpose: Prevent brute force and API abuse
- Implementation: `server/utils/rate-limit.ts` with `rate-limiter-flexible` (in-memory)
- Limiters: `authRateLimiter` (5 attempts per 15 min per IP), `accountRateLimiter` (10 per hour per email), `verificationRateLimiter` (3 per 15 min per IP), `apiRateLimiter` (60 per minute per IP)
- Usage: All auth endpoints call `checkRateLimit()` before processing; all transaction/category/dashboard endpoints call it per IP

**Input Validation:**
- Purpose: Ensure type safety and prevent injection attacks
- Client-side: `app/utils/validation.ts` mirrors server rules (validateTransactionForm, validateNotes)
- Server-side: `server/utils/validation.ts` enforces constraints (regex patterns, length limits, numeric ranges)
- Example: Transaction amount validated as numeric, notes capped at 2000 chars, dates in YYYY-MM-DD format

**Session & Auth:**
- Provider: `nuxt-auth-utils` module
- Mechanism: Sealed HTTP-only cookie containing user profile (id, email, name, avatarUrl, emailVerified, provider)
- Password Hashing: `hashPassword()` / `verifyPassword()` via scrypt (not bcrypt)
- Token Generation: `createVerificationToken()` uses crypto.randomBytes(32).toString('hex')

## Entry Points

**Web Application Root:**
- Location: `app/app.vue`
- Triggers: Browser request to `/`
- Responsibilities: Renders `<NuxtLayout>` with `<NuxtPage>`, sets up route announcer

**Landing Page:**
- Location: `app/pages/index.vue`
- Triggers: Request to `/`, no middleware (both authenticated and unauthenticated users see it)
- Responsibilities: Composes landing components (Hero, Features, CallToAction), renders SEO meta

**Login Page:**
- Location: `app/pages/login.vue`
- Middleware: `guest` (redirects logged-in users to `/dashboard`)
- Responsibilities: Renders `LoginForm`, handles form submission via `useAuth().login()`

**Dashboard Root:**
- Location: `app/pages/dashboard/index.vue`
- Middleware: `auth` (requires login + email verification)
- Layout: `dashboard`
- Responsibilities: Fetches summary and recent transactions, renders overview cards

**API Entry - Login:**
- Location: `server/api/auth/login.post.ts`
- Triggers: `POST /api/auth/login`
- Responsibilities: Validates email/password, checks rate limits (IP + email), hashes verification, sets session cookie

**API Entry - Transactions List:**
- Location: `server/api/transactions/index.get.ts`
- Triggers: `GET /api/transactions?type=income&startDate=...&endDate=...&limit=50&offset=0`
- Responsibilities: Validates session, validates query parameters (regex for dates, enum for type), calls `getUserTransactions()` utility

**OAuth Entry - GitHub:**
- Location: `server/routes/auth/github.get.ts`
- Triggers: `GET /auth/github` (from button click) and `GET /auth/github?code=...` (GitHub callback)
- Responsibilities: Calls `defineOAuthGitHubEventHandler()`, upserts OAuth user, sets session, redirects to `/dashboard`

## Error Handling

**Strategy:** Centralized error extraction and consistent HTTP status codes

**Patterns:**
- **400 Bad Request:** Input validation fails (missing fields, invalid format, type mismatch)
- **401 Unauthorized:** Session expired, invalid credentials, or email not verified
- **403 Forbidden:** Email not verified (login), or sufficient permissions not present
- **429 Too Many Requests:** Rate limit exceeded
- **Server throws `createError()`:** Nuxt/Nitro catches and serializes to response
- **Client extracts via `extractErrorMessage()`:** Looks for `.statusMessage`, `.data.message`, fallback message
- **Auto-redirect on 401:** `handleApiError()` clears session and navigates to `/login` if API returns 401

## Cross-Cutting Concerns

**Logging:** Console logging only (no structured logging framework). `console.error()` used in OAuth error handlers and database initialization failures. Server request logging handled by Nitro defaults.

**Validation:** Dual-layer validation:
- Client: Visual feedback, early rejection (UForm with `validate` callback)
- Server: Authoritative validation before database mutation
- Shared rules: Email regex, password constraints, transaction amount format, notes length

**Authentication:** Sealed session cookies via `nuxt-auth-utils`
- `useUserSession()` composable provides `loggedIn` boolean, `user` object, `session` object
- `requireUserSession()` server function enforces session on protected endpoints
- `auth.ts` middleware protects routes, redirects to login or verify-email as needed
- Logout clears cookie via `clear()` and navigates to home

**Authorization:** User-scoped ownership
- Every transaction, category, and user query includes `userId` filter
- No role-based access control (single-user app design)
- Session contains `userId`, checked in every protected endpoint

**Rate Limiting:** Applied on method + key:
- Auth endpoints: by IP + by email (dual limit)
- Transaction/category/dashboard APIs: by IP only
- In-memory storage, reset on server restart
- Returns 429 with message "Too many requests. Please try again later."

---

*Architecture analysis: 2025-02-15*
