# External Integrations

**Analysis Date:** 2025-02-15

## APIs & External Services

**Email Delivery:**
- Resend - Email service for verification emails and password reset emails
  - SDK/Client: `resend` npm package (v6.9.2)
  - Auth: `RESEND_API_KEY` environment variable
  - Usage: `server/utils/email.ts` exports `sendVerificationEmail()` and `sendPasswordResetEmail()`
  - Functions called from: `/api/auth/register`, `/api/auth/verify-email`, `/api/auth/forgot-password`, `/api/auth/resend-verification`

**OAuth Providers:**
- GitHub OAuth 2.0
  - SDK/Client: Built into `nuxt-auth-utils` via `defineOAuthGitHubEventHandler()`
  - Handler: `server/routes/auth/github.get.ts`
  - Config: `NUXT_OAUTH_GITHUB_CLIENT_ID`, `NUXT_OAUTH_GITHUB_CLIENT_SECRET` (stored in `nuxt.config.ts` runtimeConfig)
  - Scopes: `user:email`, `read:user`
  - User data mapped: id, email, name, avatar_url

- Google OAuth 2.0
  - SDK/Client: Built into `nuxt-auth-utils` via `defineOAuthGoogleEventHandler()` (handler file exists but follows same pattern as GitHub)
  - Handler: `server/routes/auth/google.get.ts`
  - Config: `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` (stored in `nuxt.config.ts` runtimeConfig)

## Data Storage

**Databases:**
- PostgreSQL 13+ (primary)
  - Connection: `DATABASE_URL` environment variable (format: `postgresql://user:pass@host:port/dbname`)
  - Client: `postgres` npm package (v3.4.8) - native PostgreSQL driver
  - ORM: Drizzle ORM (v0.45.1) for type-safe queries
  - Schema: `server/database/schema.ts`
  - Tables:
    - `users` - User accounts (email, password hash, OAuth provider info, profile data)
    - `verification_tokens` - Email verification and password reset tokens
    - `categories` - Transaction categories (user-owned, cascade delete on user)
    - `transactions` - Financial transactions (user-owned, linked to categories)
  - Migrations: Stored in `server/database/migrations/` directory
  - Management: Drizzle Kit for schema generation and migrations

**File Storage:**
- Local filesystem only (no external file storage)
  - Avatar URLs stored as strings in `users.avatar_url` (typically from OAuth provider)

**Caching:**
- None configured (no Redis, Memcached, or similar)
- Rate limiting uses in-memory storage (see "Rate Limiting" section)

## Authentication & Identity

**Auth Provider:**
- Custom + OAuth hybrid
  - Email/Password: Custom implementation with scrypt hashing via `nuxt-auth-utils`
  - OAuth: GitHub and Google via `nuxt-auth-utils` helpers
  - Implementation: `server/utils/auth.ts` provides `createUser()`, `findUserByEmail()`, `findUserByProvider()`, `updateUserProfile()`
  - Session: Sealed cookies via `nuxt-auth-utils` (no database session table needed)
  - Session password: `SESSION_PASSWORD` environment variable (minimum 32 characters)

**Password Management:**
- Hash algorithm: scrypt (via `nuxt-auth-utils` built-in `hashPassword()` / `verifyPassword()`)
- NOT bcrypt
- Token-based reset flow: `server/utils/auth.ts` creates `verification_tokens` with type='password_reset'

**Email Verification:**
- Verification tokens stored in `verification_tokens` table (userId, token, type='email_verification', expiresAt)
- Token generation: `randomBytes()` from Node.js `crypto` module
- Expiration: 1 hour (hardcoded in email templates)

## Monitoring & Observability

**Error Tracking:**
- None configured (no Sentry, Rollbar, or similar)

**Logs:**
- Console-based logging only
  - OAuth errors logged to console: `console.error('GitHub OAuth error:', error)` in `server/routes/auth/github.get.ts`
  - Security issues logged via standard `console` methods
  - No external logging service integrated

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase (any Node-compatible platform)

**CI Pipeline:**
- None detected in codebase
- No GitHub Actions, GitLab CI, or similar workflow files present

**Testing:**
- Playwright E2E tests in `tests/` directory
- Run via: `bun run test:e2e`
- Configuration: `playwright.config.ts` (Chromium browser, HTML reporter)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `NUXT_SESSION_PASSWORD` - Session encryption password (32+ chars)
- `NUXT_OAUTH_GITHUB_CLIENT_ID` - GitHub OAuth app ID
- `NUXT_OAUTH_GITHUB_CLIENT_SECRET` - GitHub OAuth app secret
- `NUXT_OAUTH_GOOGLE_CLIENT_ID` - Google OAuth app ID
- `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` - Google OAuth app secret
- `RESEND_API_KEY` - Resend email API key (format: `re_...`)
- `EMAIL_FROM` - Sender email address for emails
- `APP_URL` - Application base URL (used in email links)
- `NGROK_AUTHTOKEN` - (Optional) Ngrok auth token for dev tunneling

**Optional env vars:**
- `NGROK_AUTHTOKEN` - For local development with external OAuth testing

**Secrets location:**
- `.env` file (loaded by Nuxt automatically, never committed to git)
- Example template: `.env.example`

## Webhooks & Callbacks

**Incoming:**
- OAuth callbacks: GitHub and Google redirect to `/auth/github` and `/auth/google` (server routes, not API)
- Email verification links: Client-side navigation to `/verify-email?token=...` (not a webhook)
- Password reset links: Client-side navigation to `/reset-password?token=...` (not a webhook)

**Outgoing:**
- None detected (application does not send webhooks to external services)

## Rate Limiting

**Implementation:**
- Package: `rate-limiter-flexible` (v9.1.1) - In-memory rate limiter
- Storage: Memory-based (not persistent, resets on server restart)
- Limiters configured in `server/utils/rate-limit.ts`:
  - `authRateLimiter` - 5 requests per 15 minutes per IP (for login/register/password reset)
  - `accountRateLimiter` - 10 requests per hour per account (for account operations)
  - `verificationRateLimiter` - 3 requests per 15 minutes per IP (for verification/resend operations)
  - `apiRateLimiter` - 60 requests per minute per IP (general API rate limit)
- Applied via: `server/utils/rate-limit.ts` `checkRateLimit()` function
- Error response: 429 status with "Too many requests" message

---

*Integration audit: 2025-02-15*
