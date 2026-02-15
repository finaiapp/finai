# finai — Landing Page + Authentication Requirements

> **Status:** Requirements spec (brainstorm output)
> **Date:** 2026-02-15
> **Security focus:** Yes
> **Next step:** `/sc:design` for architecture, then `/sc:workflow` for implementation

---

## 1. Goals

- Public landing page at `/` introducing finai
- Email/password + OAuth (GitHub, Google) authentication via `nuxt-auth-utils`
- Protected `/dashboard` route showing a basic financial overview
- Server-side sessions stored in PostgreSQL (via Drizzle ORM)
- Rate limiting and brute-force protection from day one
- Personal use, open source

## 2. Functional Requirements

### FR-1: Landing Page (`/`)
- **Hero section** — app name, tagline ("Your personal financial dashboard"), CTA button ("Get Started" / "Sign In")
- **Features section** — 3–4 cards highlighting key capabilities (e.g., "Track spending", "Budget planning", "Secure & private", "Open source")
- **CTA section** — secondary sign-in/sign-up prompt
- **Footer** — GitHub repo link, license notice
- Fully public — no auth required
- Responsive (mobile-first via Nuxt UI / Tailwind)

### FR-2: Authentication
- **Module:** `nuxt-auth-utils` (Nuxt-native, server-side sessions, built-in OAuth helpers)
- **Providers:**
  - Email/password (scrypt (via nuxt-auth-utils)-hashed, server-side validation)
  - GitHub OAuth
  - Google OAuth
- **Registration flow:** email + password → validate → hash password → create user → send verification email (Resend) → redirect to `/verify-email` pending page
- **Email verification flow:** user clicks link in email → verify token → mark email verified → create session → redirect to `/dashboard`
- **Unverified users** cannot access `/dashboard` — middleware checks `email_verified`
- **Login flow:** email + password → validate → verify hash → create session → redirect to `/dashboard`
- **OAuth flow:** click provider → redirect to provider → callback → upsert user → create session → redirect to `/dashboard`
- **Logout:** destroy session → redirect to `/`
- **Password reset flow:** click "Forgot password" → enter email → send reset link (Resend) → click link → enter new password → hash & update → redirect to `/login` with success message
- **Reset token:** cryptographically random, single-use, expires in 1 hour
- **Auth pages:**
  - `/login` — email/password form + OAuth buttons + "Forgot password" link
  - `/register` — email/password form + OAuth buttons
  - `/verify-email` — pending verification message + resend button
  - `/forgot-password` — email input form
  - `/reset-password` — new password form (accessed via token in URL)
  - All public, redirect to `/dashboard` if already authenticated

### FR-3: Protected Dashboard (`/dashboard`)
- **Route protection:** Nuxt middleware checks session + email_verified; unauthenticated users → `/login`, unverified → `/verify-email`
- **Layout:** sidebar navigation + top header with user info/avatar + logout button
- **Sub-routes:**
  - `/dashboard` (`index.vue`) — overview with 4 summary cards (balance, spending, recent transactions, budget)
  - `/dashboard/transactions` — transaction list (empty state initially)
  - `/dashboard/budgets` — budget management (empty state initially)
  - `/dashboard/settings` — user profile & account settings
- **Content (initial):** all sub-pages render with empty/placeholder state, ready for future data
- Uses a `dashboard` layout (separate from default)
- Sidebar links to all sub-routes

### FR-4: User Management
- **User model:** id, email, name, avatar_url, password_hash (nullable for OAuth-only users), email_verified (boolean), provider, provider_id, created_at, updated_at
- **Session model:** id, user_id, token, expires_at, created_at
- **Verification token model:** id, user_id, token, type (email_verify | password_reset), expires_at, used_at, created_at
- **Database:** PostgreSQL via Drizzle ORM
- **Migrations:** Drizzle Kit for schema migrations

## 3. Non-Functional Requirements

### NFR-1: Security (Primary Focus)

| Concern | Approach |
|---------|----------|
| Password storage | scrypt (via nuxt-auth-utils) with cost factor 12+ |
| Session tokens | Cryptographically random, httpOnly + secure + sameSite=lax cookies |
| CSRF protection | `nuxt-auth-utils` built-in CSRF handling |
| Rate limiting | Login/register endpoints: max 5 attempts per IP per 15 min window; lockout after 10 failed attempts per account per hour |
| Input validation | Server-side validation on all auth endpoints (email format, password strength: min 8 chars, 1 upper, 1 lower, 1 digit) |
| OAuth state | Verify `state` parameter on all OAuth callbacks (built into `nuxt-auth-utils`) |
| Headers | Helmet-style security headers via Nitro (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP) |
| Session expiry | 7-day rolling expiry, absolute max 30 days |
| SQL injection | Parameterized queries via Drizzle ORM (no raw SQL) |
| XSS | Vue's built-in escaping + CSP headers |
| Secrets management | All secrets in `.env`, never committed; `.env.example` with placeholder values |

### NFR-2: Performance
- Landing page should be SSR for fast first paint
- Dashboard can be client-side rendered after auth check

### NFR-3: Accessibility
- Semantic HTML, proper form labels, keyboard navigation on auth forms
- Nuxt UI components handle baseline a11y

### NFR-4: Open Source
- MIT license
- No hardcoded secrets, clear `.env.example`
- Documentation in README for self-hosting

## 4. User Stories

### US-1: View Landing Page
> As a visitor, I can see a landing page explaining what finai does, so I can decide whether to sign up.
>
> **Acceptance:** Hero + features + CTA render at `/`. No auth required.

### US-2: Register with Email/Password
> As a new user, I can create an account with email and password, so I can access the dashboard.
>
> **Acceptance:** Form validates input. Password is hashed. Session is created. Redirects to `/dashboard`.

### US-3: Register/Login with GitHub
> As a user, I can sign in with my GitHub account for convenience.
>
> **Acceptance:** OAuth flow completes. User is upserted. Session is created. Redirects to `/dashboard`.

### US-4: Register/Login with Google
> As a user, I can sign in with my Google account for convenience.
>
> **Acceptance:** Same as US-3 but with Google provider.

### US-5: Login with Email/Password
> As a returning user, I can log in with my credentials.
>
> **Acceptance:** Correct credentials → session → `/dashboard`. Wrong credentials → error message (generic, no user enumeration).

### US-6: Access Protected Dashboard
> As an authenticated user, I can view the dashboard with my financial overview.
>
> **Acceptance:** `/dashboard` shows overview cards. Unauthenticated access redirects to `/login`.

### US-7: Logout
> As an authenticated user, I can log out to end my session.
>
> **Acceptance:** Session destroyed. Redirected to `/`. Cannot access `/dashboard` after logout.

### US-8: Verify Email
> As a new user, I receive a verification email after registration and must verify before accessing the dashboard.
>
> **Acceptance:** Verification email sent via Resend. Clicking link verifies account. Unverified users cannot access `/dashboard`. Resend button available.

### US-9: Forgot Password
> As a user who forgot my password, I can request a reset link via email.
>
> **Acceptance:** Enter email → receive reset link (1hr expiry, single-use). No user enumeration (always shows "check your email").

### US-10: Reset Password
> As a user with a valid reset link, I can set a new password.
>
> **Acceptance:** Valid token → new password form → password updated → redirect to `/login`. Expired/used token → error message.

### US-11: Rate-Limited Login
> As a security measure, repeated failed login attempts are rate-limited.
>
> **Acceptance:** After 5 failed attempts from same IP in 15 min, further attempts are blocked with a clear message.

## 5. Tech Stack Additions

| Package | Purpose |
|---------|---------|
| `nuxt-auth-utils` | Auth module (sessions, OAuth helpers) |
| `drizzle-orm` | Type-safe ORM for PostgreSQL |
| `drizzle-kit` | Schema migrations |
| `pg` (or `postgres`) | PostgreSQL driver |
| `scrypt (via nuxt-auth-utils)` | Password hashing |
| `rate-limiter-flexible` | Rate limiting on auth endpoints |
| `resend` | Transactional emails (verification, password reset) |

## 6. New Files (Anticipated)

```
# Auth pages
app/pages/login.vue                    # Login page
app/pages/register.vue                 # Registration page
app/pages/verify-email.vue             # Email verification pending page
app/pages/forgot-password.vue          # Forgot password form
app/pages/reset-password.vue           # Reset password form (token in query)

# Dashboard pages
app/pages/dashboard/index.vue          # Overview — summary cards
app/pages/dashboard/transactions.vue   # Transactions list
app/pages/dashboard/budgets.vue        # Budget management
app/pages/dashboard/settings.vue       # User profile & account settings

# Layouts & middleware
app/layouts/dashboard.vue              # Dashboard layout (sidebar + header)
app/middleware/auth.ts                 # Route middleware — redirect if unauthenticated/unverified
app/composables/useAuth.ts            # Auth state helpers

# Server — auth API
server/api/auth/login.post.ts          # Email/password login
server/api/auth/register.post.ts       # Email/password registration
server/api/auth/logout.post.ts         # Session destruction
server/api/auth/verify-email.post.ts   # Email verification token validation
server/api/auth/forgot-password.post.ts # Send password reset email
server/api/auth/reset-password.post.ts  # Reset password with token
server/api/auth/github.get.ts          # GitHub OAuth initiation
server/api/auth/google.get.ts          # Google OAuth initiation
server/api/auth/resend-verification.post.ts # Resend verification email

# Server — database & utilities
server/database/schema.ts              # Drizzle schema (users, sessions, verification_tokens)
server/database/index.ts               # Drizzle client initialization
server/utils/auth.ts                   # Auth helpers (hash, verify, rate limit)
server/utils/email.ts                  # Resend email helpers (verification, reset)
server/middleware/security.ts          # Security headers

# Config
drizzle.config.ts                      # Drizzle Kit configuration
docker-compose.yml                     # PostgreSQL container (port 5433)
```

## 7. Resolved Decisions

| Question | Decision |
|----------|----------|
| Email verification | **Yes, v1** — via Resend (key already in `.env.example`) |
| Password reset | **Yes, v1** — forgot password + reset flow via Resend |
| PostgreSQL hosting | **Docker** — `docker-compose.yml` with custom port `5433` (since 5432 is in use) |
| Dashboard sub-routes | **Yes, now** — `/dashboard`, `/dashboard/transactions`, `/dashboard/budgets`, `/dashboard/settings` |

## 8. Open Questions

_(None — all decisions resolved.)_

---

*Generated by `/sc:brainstorm` — requirements discovery only. Use `/sc:design` for architecture decisions and `/sc:workflow` for implementation planning.*
