# Codebase Concerns

**Analysis Date:** 2026-02-15

## Tech Debt

**Duplicated Validation Logic:**
- Issue: Email and password validation logic is duplicated across `server/utils/validation.ts` and `app/utils/validation.ts` with only comments indicating they should stay in sync
- Files: `server/utils/validation.ts`, `app/utils/validation.ts`
- Impact: Updates must be made in two places; easy to drift and cause inconsistent validation between client and server
- Fix approach: Extract to a shared package/monorepo module, or create a client library that implements server validation rules. Consider using a validation library like Zod to define schemas once.

**Inline Hardcoded Ngrok Host in Production Config:**
- Issue: Specific ngrok domain hardcoded in `nuxt.config.ts` line 28: `'ununited-mentionable-miyoko.ngrok-free.dev'`
- Files: `nuxt.config.ts`
- Impact: Domain will change when ngrok URL regenerates; must update config manually to prevent HMR breaks in development. Not safe for production builds.
- Fix approach: Move to environment variable `NGROK_HOST` and use wildcard pattern `*.ngrok-free.dev` as fallback. For production, remove entirely or use environment-based config.

**Manual Date Arithmetic in Dashboard Summary:**
- Issue: Date calculations for month boundaries computed in JavaScript instead of database layer
- Files: `server/utils/transactions.ts` lines 101-104
- Impact: Timezone handling complexity, potential off-by-one errors around month boundaries, logic must stay in sync with any changes to date handling elsewhere
- Fix approach: Move date range calculation to the database query itself using SQL date functions to reduce client-side logic.

**Rate Limiter Uses In-Memory Storage:**
- Issue: `rate-limiter-flexible` with `RateLimiterMemory` stores state in RAM; resets on server restart
- Files: `server/utils/rate-limit.ts`
- Impact: No persistence across deployments; rate limits can be bypassed by restarting server; doesn't scale to multiple instances
- Fix approach: Migrate to Redis-backed rate limiter (`RateLimiterRedis`) for production deployments. Current implementation is acceptable for development but will fail in production or multi-instance setups.

**Weak Email Validation Regex:**
- Issue: Email validation uses simple regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` that allows many invalid formats
- Files: `server/utils/validation.ts` line 3, `app/utils/validation.ts` line 3
- Impact: Accepts invalid emails like `a@b.c` or `test@@example.com`; relies on Resend to reject during send
- Fix approach: Use RFC 5322 regex or `email-validator` package. Better: rely on verification email delivery as the source of truth (current approach is acceptable).

## Security Considerations

**CSP Header Allows `unsafe-inline` and `unsafe-eval`:**
- Risk: Content Security Policy in `server/middleware/security.ts` line 7 permits inline scripts/styles and eval, significantly weakening XSS protection
- Files: `server/middleware/security.ts`
- Current mitigation: Nuxt handles CSS via build-time extraction; inline scripts from trusted sources only
- Recommendations: Remove `'unsafe-inline'` from script-src and use nonce-based approach for required inline scripts. Remove `'unsafe-eval'` entirely; it's not needed for development.

**Session Password Not Validated at Startup:**
- Risk: `SESSION_PASSWORD` is marked as required with `!` but missing env var will cause silent failure or runtime error
- Files: `nuxt.config.ts` line 44, `server/database/index.ts` line 5-6
- Current mitigation: Process will crash on startup if missing
- Recommendations: Add explicit startup checks that log missing critical env vars clearly before any server code runs. Create `.env.example` with all required vars documented.

**Token Generation Uses Crypto but Not Verified for Uniqueness:**
- Risk: `randomBytes(32).toString('hex')` generates 64-char hex token; collision chance is negligible but database unique constraint is the only safety net
- Files: `server/utils/auth.ts` line 74
- Current mitigation: Database has `unique` constraint on `verification_tokens.token`
- Recommendations: Current approach is acceptable. Consider adding max age cleanup job to `verification_tokens` table to prevent accumulation of expired tokens.

**Password Reset Tokens Expire Server-Side Only:**
- Risk: Token lifetime is checked only at verification time (`verifyToken` line 96), not at send time. If expiry is changed in code, tokens in user inboxes become silently invalid.
- Files: `server/utils/auth.ts`, `server/api/auth/reset-password.post.ts`
- Current mitigation: 1-hour expiry is documented in email
- Recommendations: Include expiry time in verification email. Add clear error message when expired token is used.

**Missing CSRF Protection on State-Changing Endpoints:**
- Risk: OAuth routes at `server/routes/auth/github.get.ts` and `server/routes/auth/google.get.ts` rely on state parameter but no explicit CSRF middleware
- Files: `server/routes/auth/github.get.ts`, `server/routes/auth/google.get.ts`
- Current mitigation: `nuxt-auth-utils` module handles OAuth state validation internally
- Recommendations: Verify state validation is enforced. Add explicit CSRF token check on all form submissions if moving to custom OAuth flow.

## Performance Bottlenecks

**Dashboard Summary Executes Three Separate Database Queries:**
- Problem: `getDashboardSummary` in `server/utils/transactions.ts` lines 100-143 makes 3 trips to database (balance totals, monthly spending, recent count)
- Files: `server/utils/transactions.ts`
- Cause: Separate queries prevent database optimizer from combining filters
- Improvement path: Combine into single query with multiple aggregations, or use materialized view for monthly summaries that update asynchronously.

**Transaction List N+1 Query Pattern (Mitigated):**
- Problem: `getUserTransactions` uses `with: { category: true }` which Drizzle optimizes to single JOIN query (good), but if misused could cause N+1
- Files: `server/utils/transactions.ts` line 24
- Cause: ORM eager loading is correct here
- Improvement path: Monitor query logs after scale-up; current implementation is sound.

**No Database Connection Pooling Configuration:**
- Problem: PostgreSQL connection created with bare `postgres(databaseUrl)` without explicit pool settings
- Files: `server/database/index.ts` line 9
- Cause: `postgres.js` uses default pool size (10 connections); may be insufficient under load
- Improvement path: Configure pool size via `postgres({ max: 20, idle_timeout: 30 })` for production. Monitor connection usage under load.

**Pagination Default Limit High (50 items):**
- Problem: Default `limit: 50` in `getUserTransactions` could be slow for large datasets
- Files: `server/utils/transactions.ts` line 26
- Cause: Not enforced on backend; client can request up to 100 (see `server/api/transactions/index.get.ts` line 43)
- Improvement path: Reduce default to 20; add query plan analysis to verify index usage on large datasets.

## Known Bugs

**Verify Email Page Can Hang on Invalid Token:**
- Symptoms: User lands on `app/pages/verify-email.vue` without token or with invalid token; page may not display error clearly
- Files: `app/pages/verify-email.vue`
- Trigger: Direct navigation to `/verify-email` or expired token in URL
- Current behavior: Form submits and shows error; page allows retry
- Recommendation: Add pre-flight check to display error before form loads if token is invalid.

**Transaction Edit Form Doesn't Validate Category Ownership:**
- Symptoms: User submits PUT with categoryId from another user's category; server validates but validation logic is inline
- Files: `server/api/transactions/[id].put.ts` lines 49-56
- Trigger: Crafted API request with categoryId that belongs to different user
- Current protection: Database foreign key and user_id check in query
- Recommendation: Move category validation to shared helper like `validateTransactionCategory()` to reduce duplication with POST handler.

## Fragile Areas

**Validation Scattered Across Three Locations:**
- Files: `server/utils/validation.ts`, `server/api/transactions/[id].put.ts`, `app/utils/validation.ts`
- Why fragile: Validation rules for transactions exist in three places: generic util, PUT endpoint, client-side. Rules can drift.
- Safe modification: All changes to validation must touch all three files. Add TypeScript tests that run validation examples against both client and server implementations.
- Test coverage: Only E2E tests verify consistency; no unit tests for validation rules.

**useTransactions Composable Missing Error Handling:**
- Files: `app/composables/useTransactions.ts` line 80 uses untyped `Record<string, any>` for edit data
- Why fragile: No type safety on what fields are sent; easy to send readonly fields that should be rejected by server
- Safe modification: Add strict TypeScript interfaces for each mutation operation (UpdateTransactionInput, CreateTransactionInput)
- Test coverage: Gaps in component tests for error scenarios; only E2E tests verify API contract.

**Hard-Coded Environment Variables at App Startup:**
- Files: `server/utils/email.ts` (line 3, 6, 10, 27), `nuxt.config.ts` (line 44, 15)
- Why fragile: Missing env vars cause runtime errors instead of startup validation. `process.env.APP_URL` used in email templates but no runtime check.
- Safe modification: Create `server/utils/env.ts` that validates all required env vars on startup with clear error messages. Export singleton config object.
- Test coverage: No tests verify env var presence.

**Dashboard Layout Responsive Behavior Not Tested:**
- Files: `app/layouts/dashboard.vue`
- Why fragile: Sidebar/slideover toggle behavior depends on Nuxt UI internal breakpoints; custom CSS could break responsiveness
- Safe modification: Use Playwright visual regression tests to verify layout on mobile/tablet/desktop
- Test coverage: Only page-level routing tested; no component layout tests.

## Scaling Limits

**Database Connection Pool Exhaustion Risk:**
- Current capacity: Default 10 connections from `postgres.js`
- Limit: 10 concurrent database operations; any spikes exhaust pool and subsequent requests queue
- Scaling path: Increase pool size to 20+ in production. Implement connection timeout + retry logic. Monitor with database observability.

**In-Memory Rate Limiter Can't Scale Horizontally:**
- Current capacity: Single process, ~60 requests/min across entire user base per IP
- Limit: Stops working across multiple server instances (each instance has separate memory)
- Scaling path: Migrate to Redis-backed `RateLimiterRedis`. Implement distributed rate limiting at CDN/proxy layer (e.g., Cloudflare, Nginx).

**Transaction Query Without Time-Based Sharding:**
- Current capacity: Full table scan with index still acceptable up to ~100k transactions
- Limit: Beyond 1M transactions, monthly summary queries slow down despite indexes
- Scaling path: Implement monthly partitioning on `transactions.date`. Add materialized view for monthly aggregates.

## Dependencies at Risk

**rate-limiter-flexible Memory Leak Risk:**
- Risk: In-memory store could accumulate expired keys without cleanup interval configured
- Impact: Long-running servers could experience memory growth
- Migration plan: Switch to `rate-limiter-flexible` with `RateLimiterRedis` backend, or implement TTL-based cleanup job.

**Resend Email Dependency Single Point of Failure:**
- Risk: Email sending in `server/utils/email.ts` has no retry logic or fallback
- Impact: Failed verification emails leave users locked out of new accounts
- Migration plan: Add retry logic with exponential backoff. Implement email queue (Bull, RabbitMQ) for async delivery.

## Test Coverage Gaps

**Untested Transaction Edit Scenarios:**
- What's not tested: Partial updates (e.g., only description), categoryId validation, concurrent edits
- Files: `server/api/transactions/[id].put.ts`, `app/composables/useTransactions.ts`
- Risk: Regression in update logic could silently pass existing tests
- Priority: High - core feature, user-facing impact

**Untested Validation Edge Cases:**
- What's not tested: Amount boundary values (0.00, 9999999999.99), date boundary cases (leap years, month edges)
- Files: `server/utils/validation.ts`, `server/api/transactions/index.get.ts`
- Risk: Edge case transactions could fail unexpectedly or pass validation incorrectly
- Priority: Medium - affects data integrity but unlikely in normal usage

**Missing Integration Tests for Auth Flows:**
- What's not tested: Complete registration-to-login flow, OAuth user creation, email verification resend
- Files: `server/api/auth/*`, `server/routes/auth/*`
- Risk: Auth flow changes could break user onboarding without detection
- Priority: High - critical user path, only basic E2E coverage exists

**No Test Coverage for Error Extraction Utility:**
- What's not tested: `extractErrorMessage` with various error shapes
- Files: `app/utils/error.ts`, `app/composables/*.ts`
- Risk: Fallback message used incorrectly; error handling in composables is untested
- Priority: Low - well-tested implicitly via component tests

---

*Concerns audit: 2026-02-15*
