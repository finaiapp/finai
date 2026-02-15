# finai — Architecture Design

> **Status:** Architecture spec (design output)
> **Date:** 2026-02-15
> **Input:** [BASIC_AUTH_PLAN.md](./BASIC_AUTH_PLAN.md)
> **Next step:** `/sc:implement` or `/sc:workflow` for implementation

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │ Landing  │  │  Auth    │  │     Dashboard         │ │
│  │ Page (/) │  │  Pages   │  │  /dashboard/*         │ │
│  │ (public) │  │ (public) │  │  (protected)          │ │
│  └──────────┘  └──────────┘  └───────────────────────┘ │
│                      │                    │             │
│              useUserSession()    auth middleware        │
└─────────────────┬────────────────────┬──────────────────┘
                  │   Sealed Cookie    │
                  │   (httpOnly)       │
┌─────────────────▼────────────────────▼──────────────────┐
│                   Nitro Server                          │
│                                                         │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Auth API       │  │ Security     │  │ Rate Limit  │ │
│  │ /api/auth/*    │  │ Middleware   │  │ Middleware   │ │
│  └───────┬────────┘  └──────────────┘  └─────────────┘ │
│          │                                              │
│  ┌───────▼────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ nuxt-auth-utils│  │ Email Service│  │ Drizzle ORM │ │
│  │ (sessions,     │  │ (Resend)   │  │ (queries)   │ │
│  │  OAuth, hash)  │  │              │  │             │ │
│  └────────────────┘  └──────────────┘  └──────┬──────┘ │
└───────────────────────────────────────────────┬────────┘
                                                │
                                    ┌───────────▼────────┐
                                    │    PostgreSQL       │
                                    │    (Docker :5433)   │
                                    │                     │
                                    │  ┌───────────────┐  │
                                    │  │ users         │  │
                                    │  │ verif_tokens  │  │
                                    │  └───────────────┘  │
                                    └────────────────────┘
```

## 2. Key Design Decisions

### 2a. Sessions: Sealed Cookies (not DB)

`nuxt-auth-utils` stores sessions as **encrypted sealed cookies** — not in a database. This means:
- **No `sessions` table** needed
- Session data is encrypted with `NUXT_SESSION_PASSWORD` and stored client-side
- httpOnly + secure + sameSite=lax by default
- 7-day maxAge configured in `nuxt.config.ts`
- Trade-off: sessions can't be revoked server-side (acceptable for personal use)

### 2b. Password Hashing: scrypt (built-in)

`nuxt-auth-utils` provides `hashPassword()` and `verifyPassword()` using scrypt. **No bcrypt dependency needed.**

### 2c. OAuth: Built-in Handlers

`nuxt-auth-utils` provides `oauthGitHubEventHandler()` and `oauthGoogleEventHandler()` — we use these directly as Nitro event handlers.

### 2d. Database: PostgreSQL via Drizzle + postgres.js

- `postgres` (postgres.js) as the driver — lightweight, no native bindings
- `drizzle-orm` for type-safe queries
- `drizzle-kit` for migrations
- Docker container on port **5433**

## 3. Database Schema

```
┌──────────────────────────────────┐
│              users               │
├──────────────────────────────────┤
│ id           serial PK           │
│ email        varchar(255) UNIQUE │
│ name         varchar(255)        │
│ avatar_url   text NULL           │
│ password_hash text NULL           │◄── NULL for OAuth-only users
│ email_verified boolean DEFAULT false │
│ provider     varchar(50) NULL    │◄── 'github' | 'google' | NULL (email)
│ provider_id  varchar(255) NULL   │
│ created_at   timestamp DEFAULT now │
│ updated_at   timestamp DEFAULT now │
├──────────────────────────────────┤
│ UNIQUE(provider, provider_id)    │
│ INDEX(email)                     │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│       verification_tokens        │
├──────────────────────────────────┤
│ id           serial PK           │
│ user_id      integer FK→users.id │
│ token        varchar(255) UNIQUE │
│ type         varchar(20)         │◄── 'email_verify' | 'password_reset'
│ expires_at   timestamp           │
│ used_at      timestamp NULL      │
│ created_at   timestamp DEFAULT now │
├──────────────────────────────────┤
│ INDEX(token)                     │
│ INDEX(user_id, type)             │
└──────────────────────────────────┘
```

### Drizzle Schema Definition

```typescript
// server/database/schema.ts
import { pgTable, serial, varchar, text, boolean, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),               // NULL for OAuth-only
  emailVerified: boolean('email_verified').default(false).notNull(),
  provider: varchar('provider', { length: 50 }),      // 'github' | 'google' | null
  providerId: varchar('provider_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('provider_provider_id_idx').on(table.provider, table.providerId),
])

export const verificationTokens = pgTable('verification_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(),   // 'email_verify' | 'password_reset'
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('verification_tokens_user_type_idx').on(table.userId, table.type),
])
```

## 4. API Design

### Auth Endpoints

| Method | Path | Purpose | Auth | Rate Limited |
|--------|------|---------|------|--------------|
| POST | `/api/auth/register` | Create account (email/password) | No | Yes (5/15min/IP) |
| POST | `/api/auth/login` | Email/password login | No | Yes (5/15min/IP, 10/hr/account) |
| POST | `/api/auth/logout` | Destroy session | Yes | No |
| GET | `/api/auth/github` | GitHub OAuth redirect | No | No |
| GET | `/api/auth/google` | Google OAuth redirect | No | No |
| POST | `/api/auth/verify-email` | Verify email token | No | Yes (10/15min/IP) |
| POST | `/api/auth/resend-verification` | Resend verification email | No | Yes (3/15min/IP) |
| POST | `/api/auth/forgot-password` | Request password reset | No | Yes (3/15min/IP) |
| POST | `/api/auth/reset-password` | Reset password with token | No | Yes (5/15min/IP) |

### Request/Response Contracts

```typescript
// POST /api/auth/register
// Request:
{ email: string, password: string, name: string }
// Response 201:
{ message: "Verification email sent" }
// Response 400:
{ message: "Invalid email" | "Password too weak" | "Email already registered" }

// POST /api/auth/login
// Request:
{ email: string, password: string }
// Response 200:
{ user: { id, email, name, avatarUrl, emailVerified } }
// Response 401:
{ message: "Invalid email or password" }  // Generic — no user enumeration

// POST /api/auth/verify-email
// Request:
{ token: string }
// Response 200:
{ message: "Email verified" }  // Also sets session

// POST /api/auth/forgot-password
// Request:
{ email: string }
// Response 200:
{ message: "If an account exists, a reset link has been sent" }  // Always 200

// POST /api/auth/reset-password
// Request:
{ token: string, password: string }
// Response 200:
{ message: "Password reset successful" }
```

## 5. Route & Middleware Architecture

### Page Routes

```
/                           → app/pages/index.vue          (default layout, public)
/login                      → app/pages/login.vue          (default layout, public, redirect if auth'd)
/register                   → app/pages/register.vue       (default layout, public, redirect if auth'd)
/verify-email               → app/pages/verify-email.vue   (default layout, public)
/forgot-password            → app/pages/forgot-password.vue (default layout, public)
/reset-password?token=xxx   → app/pages/reset-password.vue  (default layout, public)
/dashboard                  → app/pages/dashboard/index.vue        (dashboard layout, protected)
/dashboard/transactions     → app/pages/dashboard/transactions.vue (dashboard layout, protected)
/dashboard/budgets          → app/pages/dashboard/budgets.vue      (dashboard layout, protected)
/dashboard/settings         → app/pages/dashboard/settings.vue     (dashboard layout, protected)
```

### Middleware Flow

```
Route request
    │
    ▼
auth.ts (route middleware, applied to /dashboard/**)
    │
    ├── Not logged in? → redirect /login
    ├── Logged in but email not verified? → redirect /verify-email
    └── Logged in + verified? → continue
```

**Implementation:** `defineNuxtRouteMiddleware` using `useUserSession()` composable.

Applied via `definePageMeta({ middleware: 'auth' })` on dashboard pages, or via the dashboard layout.

### Guest Middleware (auth pages)

```
Route request to /login, /register
    │
    ▼
guest.ts (route middleware)
    │
    ├── Already logged in + verified? → redirect /dashboard
    └── Not logged in? → continue
```

## 6. Layouts

### `default.vue` — Public pages
- Simple header with app name + "Sign In" / "Sign Up" links
- `<slot />` for page content
- Footer with GitHub link

### `dashboard.vue` — Protected pages
- **Sidebar:** navigation links (Overview, Transactions, Budgets, Settings)
- **Header:** user name + avatar + logout button
- **Main area:** `<slot />` for page content
- Uses Nuxt UI components (USidebar, UButton, UAvatar, etc.)

## 7. Component Architecture

```
app/
├── components/
│   ├── auth/
│   │   ├── LoginForm.vue         # Email/password + OAuth buttons
│   │   ├── RegisterForm.vue      # Email/password + name + OAuth buttons
│   │   ├── OAuthButtons.vue      # GitHub + Google sign-in buttons
│   │   ├── ForgotPasswordForm.vue
│   │   └── ResetPasswordForm.vue
│   ├── dashboard/
│   │   ├── OverviewCard.vue      # Reusable stat card (icon, label, value)
│   │   └── Sidebar.vue           # Sidebar navigation component
│   └── landing/
│       ├── Hero.vue              # Hero section
│       ├── Features.vue          # Feature cards grid
│       └── CallToAction.vue      # CTA section
├── composables/
│   └── useAuth.ts                # Wraps useUserSession + helper methods
```

### `useAuth` Composable

```typescript
// app/composables/useAuth.ts
export function useAuth() {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    navigateTo('/')
  }

  async function login(email: string, password: string) {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    await fetch() // refresh session
    return data
  }

  async function register(email: string, password: string, name: string) {
    return await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email, password, name }
    })
  }

  return { loggedIn, user, session, logout, login, register, refreshSession: fetch }
}
```

## 8. Server Architecture

### Database Connection

```typescript
// server/database/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
```

### OAuth Handlers

```typescript
// server/api/auth/github.get.ts
export default oauthGitHubEventHandler({
  async onSuccess(event, { user: ghUser }) {
    // Upsert user in DB, set session
    const user = await upsertOAuthUser('github', ghUser)
    await setUserSession(event, { user })
    return sendRedirect(event, '/dashboard')
  }
})

// server/api/auth/google.get.ts — same pattern
```

### Rate Limiting Strategy

```typescript
// server/utils/rate-limit.ts
import { RateLimiterMemory } from 'rate-limiter-flexible'

// Per-IP rate limiter for login/register
export const authRateLimiter = new RateLimiterMemory({
  points: 5,        // 5 attempts
  duration: 900,    // per 15 minutes
})

// Per-account rate limiter (by email)
export const accountRateLimiter = new RateLimiterMemory({
  points: 10,       // 10 attempts
  duration: 3600,   // per hour
})
```

Using `RateLimiterMemory` is fine for single-instance personal use. For multi-instance, swap to `RateLimiterPostgres`.

### Email Service

```typescript
// server/utils/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`
  await resend.emails.send({
    to: email,
    from: process.env.EMAIL_FROM!,
    subject: 'Verify your finai account',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`
  await resend.emails.send({
    to: email,
    from: process.env.EMAIL_FROM!,
    subject: 'Reset your finai password',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`
  })
}
```

### Security Headers Middleware

```typescript
// server/middleware/security.ts
export default defineEventHandler((event) => {
  setHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
})
```

CSP header will be added via `nuxt.config.ts` `routeRules` to avoid breaking Nuxt UI inline styles in dev mode.

## 9. Docker Configuration

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    container_name: finai-postgres
    restart: unless-stopped
    ports:
      - "5433:5432"
    environment:
      POSTGRES_DB: finai
      POSTGRES_USER: finai
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-finai_dev_password}
    volumes:
      - finai-pgdata:/var/lib/postgresql/data

volumes:
  finai-pgdata:
```

## 10. Environment Variables

```bash
# .env (full list)

# Database
DATABASE_URL=postgresql://finai:finai_dev_password@localhost:5433/finai

# Session (min 32 chars)
NUXT_SESSION_PASSWORD=at-least-32-characters-long-random-string-here

# OAuth — GitHub
NUXT_OAUTH_GITHUB_CLIENT_ID=
NUXT_OAUTH_GITHUB_CLIENT_SECRET=

# OAuth — Google
NUXT_OAUTH_GOOGLE_CLIENT_ID=
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=

# Resend
RESEND_API_KEY=SG.....
EMAIL_FROM=noreply@yourdomain.com

# App
APP_URL=http://localhost:3889
```

## 11. Dependency Changes

### Add (runtime)
| Package | Purpose |
|---------|---------|
| `nuxt-auth-utils` | Auth module (sessions, OAuth, password hashing) |
| `drizzle-orm` | Type-safe PostgreSQL ORM |
| `postgres` | PostgreSQL driver (postgres.js) |
| `rate-limiter-flexible` | Rate limiting |
| `resend` | Transactional emails |

### Add (dev)
| Package | Purpose |
|---------|---------|
| `drizzle-kit` | Schema migrations CLI |

### Remove from plan
| Package | Reason |
|---------|--------|
| ~~`bcrypt`~~ | `nuxt-auth-utils` has built-in `hashPassword`/`verifyPassword` (scrypt) |
| ~~`pg`~~ | Using `postgres` (postgres.js) instead — lighter, no native bindings |

## 12. File Tree (Final)

```
app/
├── app.vue                              # Root (unchanged)
├── pages/
│   ├── index.vue                        # Landing page (rewrite)
│   ├── login.vue                        # Login page
│   ├── register.vue                     # Registration page
│   ├── verify-email.vue                 # Email verification pending
│   ├── forgot-password.vue              # Forgot password form
│   ├── reset-password.vue               # Reset password form
│   └── dashboard/
│       ├── index.vue                    # Dashboard overview
│       ├── transactions.vue             # Transactions list
│       ├── budgets.vue                  # Budget management
│       └── settings.vue                 # User settings
├── layouts/
│   ├── default.vue                      # Public layout (rewrite)
│   └── dashboard.vue                    # Dashboard layout (new)
├── middleware/
│   ├── auth.ts                          # Protect /dashboard/**
│   └── guest.ts                         # Redirect auth'd users from /login, /register
├── components/
│   ├── auth/
│   │   ├── LoginForm.vue
│   │   ├── RegisterForm.vue
│   │   ├── OAuthButtons.vue
│   │   ├── ForgotPasswordForm.vue
│   │   └── ResetPasswordForm.vue
│   ├── dashboard/
│   │   ├── OverviewCard.vue
│   │   └── Sidebar.vue
│   └── landing/
│       ├── Hero.vue
│       ├── Features.vue
│       └── CallToAction.vue
└── composables/
    └── useAuth.ts

server/
├── api/auth/
│   ├── register.post.ts
│   ├── login.post.ts
│   ├── logout.post.ts
│   ├── github.get.ts
│   ├── google.get.ts
│   ├── verify-email.post.ts
│   ├── resend-verification.post.ts
│   ├── forgot-password.post.ts
│   └── reset-password.post.ts
├── database/
│   ├── schema.ts
│   └── index.ts
├── utils/
│   ├── auth.ts                          # User CRUD helpers
│   ├── email.ts                         # Resend helpers
│   ├── rate-limit.ts                    # Rate limiter instances
│   └── validation.ts                    # Input validation helpers
└── middleware/
    └── security.ts                      # Security headers

# Root config
drizzle.config.ts
docker-compose.yml
```

## 13. Security Checklist

- [x] Passwords hashed with scrypt (via `nuxt-auth-utils`)
- [x] Session cookies: httpOnly, secure, sameSite=lax
- [x] CSRF: handled by `nuxt-auth-utils`
- [x] Rate limiting on all auth endpoints
- [x] No user enumeration (generic error messages)
- [x] Verification tokens: cryptographically random, single-use, time-limited
- [x] OAuth state parameter verified (built-in)
- [x] Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- [x] SQL injection prevented (Drizzle ORM parameterized queries)
- [x] XSS prevented (Vue escaping + CSP)
- [x] Secrets in `.env` only, never committed
- [x] Password strength validation (min 8 chars, mixed case, digit)
- [x] Account lockout after repeated failures

---

*Generated by `/sc:design` — architecture spec only. Use `/sc:implement` or `/sc:workflow` for implementation.*
