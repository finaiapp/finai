# External Integrations

**Analysis Date:** 2025-02-15

## APIs & External Services

**Email Service:**
- Resend - Email delivery for account verification and password resets
  - SDK: resend v6.9.2
  - Auth: `RESEND_API_KEY` env variable
  - Implementation: `server/utils/email.ts`
  - Functions:
    - `sendVerificationEmail(email, token)` - Sends 1-hour verification link
    - `sendPasswordResetEmail(email, token)` - Sends 1-hour reset link
  - Used by: Registration, forgot-password flows

**OAuth Providers:**

1. GitHub OAuth 2.0
   - Handler: `server/routes/auth/github.get.ts`
   - SDK: nuxt-auth-utils (built-in `defineOAuthGitHubEventHandler`)
   - Auth: `NUXT_OAUTH_GITHUB_CLIENT_ID`, `NUXT_OAUTH_GITHUB_CLIENT_SECRET` env variables
   - Scope: `user:email`, `read:user`
   - Callback flow: GitHub → `/auth/github` → set session → redirect to `/dashboard`
   - User data: id, email, name, avatar_url

2. Google OAuth 2.0
   - Handler: `server/routes/auth/google.get.ts`
   - SDK: nuxt-auth-utils (built-in `defineOAuthGoogleEventHandler`)
   - Auth: `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` env variables
   - Scope: `email`, `profile`, `openid`
   - Callback flow: Google → `/auth/google` → set session → redirect to `/dashboard`
   - User data: sub (id), email, name, picture (avatar)

**Tunneling & Development:**
- Ngrok - Local tunnel for development/testing
  - SDK: @nuxtjs/ngrok v3.0.1
  - Auth: `NGROK_AUTHTOKEN` env variable (optional, only needed for custom domains)
  - Config: `nuxt.config.ts` ngrok section
  - Purpose: Expose local dev server for OAuth callback testing

## Data Storage

**Databases:**

**PostgreSQL:**
- Type: Relational database
- Version: 16+ (recommended)
- Connection: Via `DATABASE_URL` env variable
- Client: postgres.js (postgres v3.4.8)
- ORM: Drizzle ORM v0.45.1
- Connection URL format: `postgresql://user:password@host:port/database`
- Default dev: `postgresql://finai:finai_dev_password@localhost:5433/finai` (note: port 5433, not 5432)

**Tables:**
- `users` - User accounts with email, password hash, OAuth provider info, profile data
- `verification_tokens` - One-time tokens for email verification and password resets (type: 'email_verification', 'password_reset')
- `categories` - User expense/income categories with icons and colors (one-to-many with users)
- `transactions` - Financial transactions with amounts, dates, categories, notes (one-to-many with users and categories)

**File Storage:**
- Not used - Only user avatars stored as URLs from OAuth providers (GitHub, Google)
- No local file upload functionality

**Caching:**
- None - Applications uses in-memory rate limiting, no distributed cache

## Authentication & Identity

**Auth Provider:**
- Custom with OAuth support

**Session Management:**
- nuxt-auth-utils sealed cookie sessions
  - Cookie-based (no database sessions table)
  - Session password: `NUXT_SESSION_PASSWORD` env variable (32+ chars, seeded with scrypt)
  - Max age: 604800 seconds (7 days)
  - Implementation: `setUserSession()` / `useUserSession()` composable

**Password Hashing:**
- scrypt (built into nuxt-auth-utils)
- Functions: `hashPassword()`, `verifyPassword()`
- Used in: `server/api/auth/register.post.ts`, `server/api/auth/login.post.ts`

**Multi-Method Auth:**
1. Email + Password - Custom credential-based auth
   - Register: `server/api/auth/register.post.ts`
   - Login: `server/api/auth/login.post.ts`
   - Verification: Token-based email verification
   - Password reset: Token-based with Resend email

2. OAuth - GitHub and Google
   - Automatic user creation/update via `upsertOAuthUser()` in `server/utils/auth.ts`
   - Email auto-verified for OAuth users
   - No password required for OAuth users

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar integration

**Logs:**
- Console logging only
  - Examples: `console.error()` in OAuth handlers (`server/routes/auth/github.get.ts`, `server/routes/auth/google.get.ts`)
  - No structured logging or centralized log aggregation

## CI/CD & Deployment

**Hosting:**
- Not configured - Deployment target TBD
- Local development: Nuxt dev server on port 3889

**CI Pipeline:**
- Playwright E2E tests (GitHub Actions assumed from playwright.config.ts CI env check)
  - Config check: `if (process.env.CI)` implies GitHub Actions or similar
  - CI settings: 2 retries, 1 worker (serial mode for rate-limit tests)

**Build Commands:**
- `bun run dev` - Development server (Nuxt dev, port 3889)
- `bun run build` - Production build (Nuxt build)
- `bun run preview` - Preview production build
- `bun run test:e2e` - Run all E2E tests
- `bunx playwright test [file]` - Run specific E2E test

**Database Commands:**
- `bun run db:generate` - Generate Drizzle migrations from schema changes
- `bun run db:migrate` - Apply pending migrations
- `bun run db:studio` - Open Drizzle Studio for visual DB management

## Security Headers & Middleware

**Security Middleware:** `server/middleware/security.ts`

Headers set on every response:
- `X-Content-Type-Options: nosniff` - Prevent MIME-type sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer info
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` - Disable unused features
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...` - Restrict resource loading
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` - Force HTTPS (1 year)
- Removes `X-Powered-By` header (Nitro-generated)

## Rate Limiting

**Framework:** rate-limiter-flexible v9.1.1 (in-memory)

**Limiters defined** in `server/utils/rate-limit.ts`:

1. **authRateLimiter**
   - 5 points per 15 minutes per IP
   - Used: `server/api/auth/register.post.ts`, `server/api/auth/login.post.ts`, `server/api/auth/forgot-password.post.ts`, `server/api/auth/reset-password.post.ts`

2. **accountRateLimiter**
   - 10 points per 1 hour per email
   - Used: `server/api/auth/login.post.ts`, `server/api/auth/register.post.ts`

3. **verificationRateLimiter**
   - 3 points per 15 minutes per IP
   - Used: `server/api/auth/verify-email.post.ts`, `server/api/auth/resend-verification.post.ts`

4. **apiRateLimiter**
   - 60 requests per 60 seconds per IP
   - Used: All transaction/category/dashboard endpoints (`server/api/transactions/`, `server/api/categories/`, `server/api/dashboard/`)

**Rate limit checks:**
- Throws HTTP 429 (Too Many Requests) when exceeded
- Function: `checkRateLimit(limiter, key)` in `server/utils/rate-limit.ts`

## Webhooks & Callbacks

**Incoming:**
- None - OAuth callbacks handled as standard routes (`/auth/github`, `/auth/google`)

**Outgoing:**
- Resend email callbacks - Not explicitly configured (fire-and-forget email)

## Environment Configuration

**Required env vars:**
```
DATABASE_URL                          # PostgreSQL connection string
NUXT_SESSION_PASSWORD                 # 32+ char session encryption key
NUXT_OAUTH_GITHUB_CLIENT_ID          # GitHub OAuth app credentials
NUXT_OAUTH_GITHUB_CLIENT_SECRET
NUXT_OAUTH_GOOGLE_CLIENT_ID          # Google OAuth app credentials
NUXT_OAUTH_GOOGLE_CLIENT_SECRET
RESEND_API_KEY                        # Resend email API key
EMAIL_FROM                            # Email sender address
APP_URL                               # Base app URL (http://localhost:3889 for dev)
NGROK_AUTHTOKEN                       # (Optional) Ngrok tunnel auth token
```

**Secrets location:**
- `.env` file (not committed to git)
- Template: `.env.example` (committed, shows required vars)

---

*Integration audit: 2025-02-15*
