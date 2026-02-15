# Codebase Concerns

**Analysis Date:** 2025-02-15

## Security Issues

**Content Security Policy (CSP) is overly permissive:**
- Issue: CSP header includes `'unsafe-inline'` and `'unsafe-eval'` for scripts, and `'unsafe-inline'` for styles
- Files: `server/middleware/security.ts`
- Impact: Allows inline script/style execution, defeating much of CSP's XSS protection value. Reduces effectiveness against injected malicious scripts.
- Current mitigation: Other headers (X-Frame-Options: DENY, Referrer-Policy) provide some defense in depth
- Recommendations:
  - Remove `'unsafe-eval'` from `script-src` immediately (rarely needed in modern SPAs)
  - Remove `'unsafe-inline'` from `script-src` and extract inline styles to external stylesheets
  - Use nonces or hashes for any legitimate inline content that cannot be externalized
  - This is feasible with Nuxt 4's build process handling scripts and styles

**OAuth error information disclosure:**
- Issue: Generic error redirects but console.error logs full error objects without rate limiting or context scrubbing
- Files: `server/routes/auth/github.get.ts`, `server/routes/auth/google.get.ts`
- Impact: Sensitive error details (stack traces, internal service failures) leak to server logs where they could be exposed if logs are accessible
- Recommendations: Log errors via structured logging with severity filtering in production; use generic messages in redirects

**Database connection URL exposure:**
- Issue: `DATABASE_URL` environment variable is required at startup but no validation that it's not logged
- Files: `server/database/index.ts`
- Impact: If logs are dumped or configuration is printed, DATABASE_URL could leak credentials
- Recommendations: Validate DATABASE_URL exists but never log it; consider read-only database user for future feature safety

## Performance Bottlenecks

**Dashboard summary calculation is not efficient for large transaction volumes:**
- Issue: `getDashboardSummary()` runs 3 separate SQL queries (balance, monthly spending, recent count) with no pagination or caching
- Files: `server/utils/transactions.ts` (lines 100-144)
- Current implementation:
  - Query 1: Sums all transactions (unbounded)
  - Query 2: Sums month's expenses (bounded but runs separately)
  - Query 3: Counts recent transactions (past 30 days)
- Impact: As users accumulate thousands of transactions, these aggregate queries become slow. No caching means every dashboard load triggers full table scans.
- Scaling limit: Expected to degrade noticeably above 10,000 transactions per user
- Improvement path:
  1. Combine three queries into single query with multiple aggregates (minor improvement)
  2. Add computed columns or materialized views for monthly/lifetime aggregates (major improvement)
  3. Implement client-side or Redis caching with cache invalidation on transaction write (best for large datasets)
  4. Consider summary table that is updated incrementally rather than calculated each load

**Rate limiting uses in-memory storage with no persistence:**
- Issue: `rate-limiter-flexible` with `RateLimiterMemory` stores all state in Node.js process memory
- Files: `server/utils/rate-limit.ts`
- Impact:
  - Rate limits reset on server restart
  - Distributed deployments cannot enforce consistent limits across multiple instances
  - Memory grows unbounded as new IPs access the app
- Scaling limit: Single-instance deployments only; horizontal scaling breaks rate limiting
- Improvement path:
  1. For production: Migrate to `RateLimiterRedis` or similar
  2. For immediate improvement: Add maximum key count with LRU eviction
  3. Add monitoring/alerting when memory usage grows

## Test Coverage Gaps

**Composables lack unit tests:**
- What's not tested: Core business logic in composables
  - `useAuth()` — login/register/logout flows, refresh logic
  - `useTransactions()` — fetch, add, edit, remove with various filter combinations
  - `useCategories()` — fetch, create, update, delete
  - `useDashboardSummary()` — summary fetch
- Files: `app/composables/*.ts`
- Risk: Form components using these composables are E2E tested but composable error handling and state management are not unit tested. If a composable breaks, it only surfaces in E2E tests.
- Priority: High — composables are core to data layer

**Server utilities lack isolated unit tests:**
- What's not tested:
  - Transaction filtering and aggregation logic (`server/utils/transactions.ts`)
  - Category CRUD and seed logic (`server/utils/categories.ts`)
  - Validation functions (`server/utils/validation.ts`)
  - Email sending (`server/utils/email.ts` — calls Resend, needs mocking)
  - Auth helpers (`server/utils/auth.ts` — token generation, verification, cleanup)
- Files: `server/utils/*.ts`
- Risk: Business logic in utilities is tested only end-to-end through API routes. Subtle bugs in edge cases (invalid dates, boundary amounts, concurrent seed calls) won't be caught.
- Priority: High — utilities are used by multiple endpoints

**Missing negative test cases:**
- What's not tested:
  - Invalid categorical combinations (e.g., expense with income category)
  - Boundary values (0 amounts, max precision issues with numeric(12,2), year 2099 dates)
  - Concurrent requests (simultaneous category seeds, transaction edits)
  - Token expiration and reuse after marking as used
- Risk: Edge cases may cause crashes or incorrect calculations in production
- Priority: Medium

## Fragile Areas

**Validation is duplicated across client and server with manual sync comments:**
- Files: `app/utils/validation.ts`, `server/utils/validation.ts`, and form validation within API endpoints
- Why fragile:
  - Three places where validation logic lives (client form validation, app/utils, server/utils, API route ad-hoc validation)
  - Sync maintained only through comments "Keep in sync with..."
  - If one location is updated without updating others, validation will diverge
  - Example: `validateTransaction()` in both app/utils and server/utils must match exactly
- Safe modification:
  1. Always update both files together
  2. Add pre-commit hook to verify file hashes match
  3. Consider extracting to shared validation schema (Zod or similar) — current inline approach is repetitive but functional
- Test coverage: Only E2E; no unit tests for validation functions

**Numeric(12,2) precision handling relies on string transport and toFixed(2):**
- Files: `server/utils/transactions.ts`, `server/api/transactions/index.post.ts`, app composables, database schema
- Why fragile:
  - Database stores as `numeric(12,2)` (12 digits total, 2 after decimal = max ~9,999,999,999.99)
  - JavaScript receives as string (Drizzle default for decimal types)
  - Manual `parseFloat()` → `toFixed(2)` → `String()` conversions throughout
  - No centralized formatter means bugs if conversion order is wrong
  - Dashboard summary uses `parseFloat()` on SQL `COALESCE(SUM(...), 0)` which returns string
- Safe modification: Use `app/utils/format.ts` `formatAmount()` utility consistently; validate amount string conforms to pattern before math operations
- Risk: Floating-point rounding errors at boundaries (e.g., 9999999999.99 edge case)

**Date handling uses T00:00:00Z trick to avoid timezone issues:**
- Files: `server/utils/validation.ts`, `server/api/transactions/[id].put.ts`, `app/utils/validation.ts`
- Why fragile:
  - All date inputs are YYYY-MM-DD strings
  - Validation appends `T00:00:00Z` to force UTC parsing and avoid timezone drift
  - If any code forgets this pattern, dates will be interpreted in local timezone
  - Dashboard summary calculates month boundaries using `new Date()` (current time, no UTC guarantee)
- Safe modification:
  1. Centralize date handling into utility function (similar to `formatAmount()`)
  2. Always use `T00:00:00Z` when parsing YYYY-MM-DD
  3. For server calculations, use database functions (`DATE_TRUNC`) instead of JavaScript
- Risk: Daylight saving time bugs or off-by-one errors for users near date boundaries

**Seed categories called on every category list fetch:**
- Files: `server/api/categories/index.get.ts` (via `seedDefaultCategories`)
- Why fragile:
  - `seedDefaultCategories()` is called before returning categories on first GET
  - Uses `onConflictDoNothing()` to handle race conditions, but still does unnecessary insert attempts
  - If called concurrently, multiple database inserts happen (one per request) even though only one succeeds
- Safe modification:
  1. Check if user has any categories FIRST before attempting seed
  2. Move seed to account creation flow (one-time operation)
  3. Add feature flag to prevent accidental re-seeds
- Risk: Performance regression if many users hit category endpoint before seed; potential cache invalidation issues

**Session password is required but not validated at startup:**
- Files: `nuxt.config.ts` line 44
- Why fragile:
  - `SESSION_PASSWORD` is pulled from env with `!` (non-null assertion)
  - If env is missing, app crashes at startup (runtime error, not caught at build time)
  - No length/complexity validation
- Safe modification: Add startup validation in a Nuxt plugin that checks `SESSION_PASSWORD` length (minimum 32 bytes recommended for scrypt)
- Risk: Weak session password could make sealed cookies vulnerable to brute force

## Known Bugs

**OAuth users are not marked as email verified on first sign-in:**
- Symptoms: OAuth users (GitHub, Google) should have `emailVerified: true` but `upsertOAuthUser()` sets it correctly in create path; however, there's no migration for existing OAuth users
- Files: `server/utils/auth.ts` line 53, `server/routes/auth/github.get.ts` line 20, `server/routes/auth/google.get.ts` line 19
- Current state: New OAuth users are marked verified; existing users created before this logic was added may not be
- Recommendation: Run one-time migration to set `emailVerified = true` for all OAuth provider users

**Dashboard summary calculation uses local timezone for month boundary:**
- Symptoms: If user is in timezone UTC-8 and it's 2 AM UTC, dashboard shows "this month" which is actually yesterday's month in their local time
- Files: `server/utils/transactions.ts` lines 101-104
- Cause: Uses `new Date()` (local timezone) instead of UTC for calculating month start/end
- Workaround: Use database-level date functions; add timezone support to schema
- Fix: Change to use UTC calculations or move to database: `EXTRACT(MONTH FROM date AT TIME ZONE 'UTC') = EXTRACT(MONTH FROM NOW())`

## Dependency Risks

**No database connection pooling configuration:**
- Issue: `postgres.js` driver is created without explicit pool size configuration
- Files: `server/database/index.ts`
- Impact: Default pool size may be too small for high concurrency; no control over idle connection timeout
- Recommendation: Configure `postgres()` with explicit `max` and `idle_timeout` options
- Example: `postgres(databaseUrl, { max: 20, idle_timeout: 30 })`

**Resend email service has no retry logic:**
- Issue: `resend.emails.send()` calls in `sendVerificationEmail()` and `sendPasswordResetEmail()` have no retry or fallback
- Files: `server/utils/email.ts`
- Impact: If Resend API is temporarily down, user verification/password reset emails fail silently with no notification to user
- Recommendation:
  1. Add try-catch and return success/failure boolean
  2. Implement exponential backoff retry (1s, 2s, 4s)
  3. Log failures for alerting

**ngrok hardcoded domain in config:**
- Issue: Exact ngrok domain `ununited-mentionable-miyoko.ngrok-free.dev` is hardcoded in `vite.server.allowedHosts`
- Files: `nuxt.config.ts` line 28
- Impact: If ngrok tunnel URL changes (common), dev server HMR breaks until config is updated
- Recommendation: Use pattern matching only (`.ngrok-free.dev` is already there as fallback, but hardcode defeats its purpose)

## Missing Error Handling

**No error recovery for 401 in composables without error callback:**
- Issue: `handleApiError()` clears session and redirects on 401, but this is not awaited in composables
- Files: `app/composables/useTransactions.ts`, `useCategories.ts`, `useDashboardSummary.ts`
- Impact: If API returns 401, composable sets error and navigates, but the calling code may not know the redirect happened — race condition
- Recommendation: Make `handleApiError()` return a promise and await it; or add `onSessionExpired` callback to composables

**API endpoints don't validate ownership on read operations with categoryId filter:**
- Issue: Transaction list endpoint validates category ownership on create, but GET with invalid categoryId returns empty list instead of 400
- Files: `server/api/transactions/index.get.ts` (lines 25-28)
- Impact: Silent failure if user sends categoryId they don't own; unclear if the category doesn't exist or they don't have access
- Recommendation: Add explicit ownership check and return 403 if categoryId belongs to different user

## Scaling Limits

**Rate limiter memory will grow linearly with unique IP addresses:**
- Current capacity: In-memory storage with no bounds
- Limit: Expected to use 100 KB per IP after 1 hour of traffic; with 10k unique IPs per day, potential for several MB
- Scaling path: Migrate to Redis backend; add LRU eviction to memory backend

**No database indexes on aggregation queries:**
- Current capacity: Works fine for <1000 transactions per user
- Limit: Aggregate queries (sum all income, sum monthly expenses, count recent) will do full table scans above this threshold
- Scaling path: Add covering indexes `(userId, date)` and `(userId, type, date)`; consider materialized view or caching layer

## Code Quality Issues

**Mixed error handling patterns:**
- Issue: API routes throw errors with `createError()`, composables use `try-catch` and set error refs, forms use `extractErrorMessage()` as fallback
- Files: Throughout `server/api/*`, `app/composables/*`, `app/components/auth/*`
- Impact: Inconsistent error presentation; some errors are caught, others bubble up
- Recommendation: Standardize on one pattern per layer:
  - Server: Throw `createError()` with statusCode + statusMessage
  - Composables: Catch and set error ref, return boolean or throw to caller
  - Components: Call composable, handle error ref with fallback

**Console.error without structured logging:**
- Issue: OAuth handlers log errors to `console.error()` without timestamp, request ID, or severity
- Files: `server/routes/auth/github.get.ts`, `server/routes/auth/google.get.ts`
- Impact: Logs are unstructured and difficult to search/alert on in production
- Recommendation: Use Nuxt logger or Pino for structured logs with context

---

*Concerns audit: 2025-02-15*
