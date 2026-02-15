# finai — Implementation Workflow

> **Status:** Complete — All phases done
> **Date:** 2026-02-15
> **Input:** [ARCHITECTURE.md](./ARCHITECTURE.md), [BASIC_AUTH_PLAN.md](./BASIC_AUTH_PLAN.md)
> **Execution:** `/sc:implement` or manual step-by-step

---

## Phase Overview

| Phase | Name | Tasks | Dependencies | Status |
|-------|------|-------|--------------|--------|
| 0 | Infrastructure | 4 | None | Done |
| 1 | Database | 3 | Phase 0 | Done |
| 2 | Auth Backend | 6 | Phase 1 | Done |
| 3 | Auth Frontend | 5 | Phase 2 | Done |
| 4 | Landing Page | 3 | Phase 0 | Done |
| 5 | Dashboard | 5 | Phase 3 | Done |
| 6 | Security Hardening | 3 | Phase 2 | Done |
| 7 | Integration & Verification | 3 | All | Done |

**Parallelism:** Phase 4 (Landing Page) can run in parallel with Phases 1–3.

---

## Phase 0: Infrastructure Setup — DONE

> Goal: Docker, dependencies, environment config, nuxt module registration

### 0.1 — Create `docker-compose.yml` — DONE
- PostgreSQL 17 Alpine on port 5433
- Volume for persistent data
- Environment vars for DB credentials
- **Verify:** `docker compose up -d` starts successfully, `psql` connects on 5433

### 0.2 — Install dependencies — DONE
```bash
bun add nuxt-auth-utils drizzle-orm postgres rate-limiter-flexible resend
bun add -d drizzle-kit
```
- **Verify:** `bun install` completes, no resolution errors
- Installed: nuxt-auth-utils@0.5.28, drizzle-orm@0.45.1, postgres@3.4.8, rate-limiter-flexible@9.1.1, resend@6.9.2, drizzle-kit@0.31.9

### 0.3 — Create `.env` and update `.env.example` — DONE
- `DATABASE_URL=postgresql://finai:finai_dev_password@localhost:5433/finai`
- `NUXT_SESSION_PASSWORD=<random 32+ char string>`
- `NUXT_OAUTH_GITHUB_CLIENT_ID=`, `NUXT_OAUTH_GITHUB_CLIENT_SECRET=`
- `NUXT_OAUTH_GOOGLE_CLIENT_ID=`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET=`
- `RESEND_API_KEY=re_...`
- `EMAIL_FROM=noreply@yourdomain.com`
- `APP_URL=http://localhost:3889`
- Update `.env.example` with all keys (placeholder values)
- Add `.env` to `.gitignore` if not already present
- **Verify:** `.env.example` has all keys, `.env` is gitignored

### 0.4 — Register `nuxt-auth-utils` module in `nuxt.config.ts` — DONE
- Add `'nuxt-auth-utils'` to `modules` array
- Add `runtimeConfig.session` with `maxAge: 604800` (7 days), cookie settings
- Add `runtimeConfig.oauth.github` and `runtimeConfig.oauth.google` with env var references
- **CRITICAL FILE:** Must check `.claude-devtools/settings.json` and ask user before modifying
- **Verify:** `bun run dev` starts without module errors

**Checkpoint 0:** Docker running, deps installed, dev server starts with `nuxt-auth-utils` active. PASSED 2026-02-15.

---

## Phase 1: Database Layer — DONE

> Goal: Drizzle schema, connection, migrations

### 1.1 — Create `drizzle.config.ts` — DONE
```typescript
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```
- **Verify:** File exists, valid TS

### 1.2 — Create `server/database/schema.ts` — DONE
- `users` table: id, email, name, avatar_url, password_hash, email_verified, provider, provider_id, created_at, updated_at
- `verificationTokens` table: id, user_id, token, type, expires_at, used_at, created_at
- Indexes: unique(provider, provider_id), index(token), index(user_id, type)
- **Verify:** TypeScript compiles

### 1.3 — Create `server/database/index.ts` + run first migration — DONE
- Initialize `postgres` client from `DATABASE_URL`
- Export `db` instance with schema
- Add scripts to `package.json`: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:studio": "drizzle-kit studio"`
- Run: `bun run db:generate && bun run db:migrate`
- **Verify:** Migration files created, tables exist in PostgreSQL (`\dt` in psql)

**Checkpoint 1:** Database tables `users` and `verification_tokens` exist. Drizzle client connects. PASSED 2026-02-15.

---

## Phase 2: Auth Backend — DONE

> Goal: All server-side auth logic — API routes, helpers, email, rate limiting

### 2.1 — Create `server/utils/validation.ts` — DONE
- `validateEmail(email: string): boolean` — format check
- `validatePassword(password: string): { valid: boolean, message?: string }` — min 8 chars, 1 upper, 1 lower, 1 digit
- `sanitizeName(name: string): string` — trim, limit length
- **Verify:** Unit logic is correct (manual review)

### 2.2 — Create `server/utils/auth.ts` — DONE
- `findUserByEmail(email: string)` — Drizzle query
- `findUserByProvider(provider: string, providerId: string)` — Drizzle query
- `createUser(data: {...})` — insert into users
- `upsertOAuthUser(provider, profile)` — find or create, mark email_verified=true for OAuth
- `createVerificationToken(userId, type)` — crypto.randomBytes, insert, return token
- `verifyToken(token, type)` — find valid (unused, unexpired) token, mark used
- **Verify:** Exports compile, functions use parameterized queries only

### 2.3 — Create `server/utils/rate-limit.ts` — DONE
- `authRateLimiter` — 5 points / 900s (per IP)
- `accountRateLimiter` — 10 points / 3600s (per email)
- `verificationRateLimiter` — 3 points / 900s (per IP)
- Helper: `async function checkRateLimit(limiter, key)` — throws 429 on limit
- **Verify:** Exports compile

### 2.4 — Create `server/utils/email.ts` — DONE
- `sendVerificationEmail(email, token)` — Resend SDK
- `sendPasswordResetEmail(email, token)` — Resend SDK
- Both construct URLs using `APP_URL` env var
- Initialize with `new Resend(process.env.RESEND_API_KEY)`
- **Verify:** Exports compile

### 2.5 — Create auth API routes — DONE
Build all 9 endpoints:

| File | Logic |
|------|-------|
| `register.post.ts` | Validate → check duplicate → hash password → create user → create token → send verification email → return 201 |
| `login.post.ts` | Rate limit → validate → find user → verify password → check email_verified → setUserSession → return user |
| `logout.post.ts` | clearUserSession → return 200 |
| `github.get.ts` | `oauthGitHubEventHandler` → upsertOAuthUser → setUserSession → redirect /dashboard |
| `google.get.ts` | `oauthGoogleEventHandler` → upsertOAuthUser → setUserSession → redirect /dashboard |
| `verify-email.post.ts` | Rate limit → verifyToken('email_verify') → update user email_verified=true → setUserSession → return 200 |
| `resend-verification.post.ts` | Rate limit → find user → create new token → send email → return 200 |
| `forgot-password.post.ts` | Rate limit → find user (silent if not found) → create token → send email → always return 200 |
| `reset-password.post.ts` | Rate limit → validate password → verifyToken('password_reset') → hash new password → update user → return 200 |

- **Verify:** All files compile. Manual curl test against at least `register` + `login` once DB is ready.

### 2.6 — Create `server/middleware/security.ts` — DONE
- Set security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Verify:** Headers present in response (`curl -I`)

**Checkpoint 2:** All auth API endpoints respond correctly. Rate limiting active. Security headers present. PASSED 2026-02-15.
- Note: OAuth routes placed in `server/routes/auth/` (not `server/api/auth/`) per nuxt-auth-utils convention.
- Note: Server files use relative imports (`../../database`) — `~/` resolves to `app/` in Nuxt 4.

---

## Phase 3: Auth Frontend — DONE

> Goal: Login, register, verify, forgot/reset password pages + middleware

### 3.1 — Create `app/composables/useAuth.ts` — DONE
- Wrap `useUserSession()` with `login()`, `register()`, `logout()`, `refreshSession()`
- Error handling with typed responses (`AuthUser`, `LoginResponse`, `RegisterResponse` interfaces)
- **Verify:** TypeScript compiles, auto-imports resolve

### 3.2 — Create `app/middleware/auth.ts` and `app/middleware/guest.ts` — DONE
- `auth.ts`: check `loggedIn` → if not, redirect `/login`. Check `user.emailVerified` → if not, redirect `/verify-email` (with defensive `to.path !== '/verify-email'` guard)
- `guest.ts`: check `loggedIn` + verified → redirect `/dashboard`
- **Verify:** Middleware files compile

### 3.3 — Create auth components — DONE
- `app/components/auth/OAuthButtons.vue` — GitHub + Google buttons (link to `/auth/github` and `/auth/google` with `external` prop)
- `app/components/auth/LoginForm.vue` — email/password form + OAuthButtons + "Forgot password" link
- `app/components/auth/RegisterForm.vue` — name/email/password form + OAuthButtons (maxlength="100" on name)
- `app/components/auth/ForgotPasswordForm.vue` — email form
- `app/components/auth/ResetPasswordForm.vue` — new password form (reads token from query)
- All use Nuxt UI form components (UInput, UButton, UFormField, UCard)
- Client-side validation mirrors server validation (via `app/utils/validation.ts`)
- Centralized error handling via `app/utils/error.ts` (`extractErrorMessage()`)
- **Verify:** Components compile

### 3.4 — Create auth pages — DONE
- `app/pages/login.vue` — uses LoginForm, `definePageMeta({ middleware: 'guest' })`
- `app/pages/register.vue` — uses RegisterForm, `definePageMeta({ middleware: 'guest' })`
- `app/pages/verify-email.vue` — message + resend button (NO middleware — avoids redirect loops)
- `app/pages/forgot-password.vue` — uses ForgotPasswordForm
- `app/pages/reset-password.vue` — uses ResetPasswordForm, reads `?token=` from route query
- **Verify:** Pages render without errors, forms display correctly

### 3.5 — Update `app/layouts/default.vue` — DONE
- Add header with app name + "Sign In" / "Get Started" links (conditionally hidden if logged in)
- Add footer with GitHub link
- **Verify:** Layout renders on all public pages

**Checkpoint 3:** Full auth flow works end-to-end: register → verify email → login → session active → logout. OAuth buttons link correctly (actual OAuth testing requires provider credentials). PASSED 2026-02-15.
- Note: OAuth buttons link to `/auth/github` and `/auth/google` (matching `server/routes/auth/` convention), NOT `/api/auth/*`.
- Note: `verify-email` page has NO middleware to prevent redirect loops with auth middleware.
- Note: `register()` does NOT set session — user must verify email first.
- Note: Added `app/utils/validation.ts` (client-side mirror of server validation) and `app/utils/error.ts` (centralized error extraction).

---

## Phase 4: Landing Page (can run parallel with Phases 1–3) — DONE

> Goal: Public landing page with hero, features, CTA

### 4.1 — Create landing components — DONE
- `app/components/landing/Hero.vue` — app name, tagline, CTA button
- `app/components/landing/Features.vue` — 4 feature cards (Track spending, Budget planning, Secure & private, Open source)
- `app/components/landing/CallToAction.vue` — secondary CTA with sign-up prompt
- All use Nuxt UI components
- **Verify:** Components compile and render

### 4.2 — Rewrite `app/pages/index.vue` — DONE
- Compose Hero + Features + CallToAction
- SSR-rendered (default Nuxt behavior)
- Added SEO meta via `useSeoMeta()` (title, description, OG tags)
- **Verify:** Landing page renders at `/`

### 4.3 — Add footer to default layout — DONE (via Phase 3.5)
- GitHub repo link, license notice, copyright
- Already completed in Phase 3.5
- **Verify:** Footer visible on landing page

**Checkpoint 4:** Landing page at `/` displays hero, features, CTA. Responsive on mobile. Build passes. PASSED 2026-02-15.
- Note: Sections include `aria-label` attributes for accessibility.
- Note: SEO meta (title, description, OG) added to index page.
- Note: No guest middleware on index — authenticated users can still view the landing page (header already shows Dashboard link).

---

## Phase 5: Dashboard — DONE

> Goal: Protected dashboard with layout, sidebar, overview + sub-pages

### 5.1 — Create `app/layouts/dashboard.vue` — DONE
- Sidebar with navigation links: Overview, Transactions, Budgets, Settings
- User info + logout button in sidebar footer (instead of header bar — idiomatic for Nuxt UI v4 `UDashboardSidebar`)
- Main content area with `<slot />`
- Uses Nuxt UI v4 dashboard primitives: `UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel`
- `v-if="user"` guard on user info to prevent hydration flash
- **Verify:** Layout renders, sidebar navigation works

### 5.2 — Create `app/components/dashboard/Sidebar.vue` — DONE
- Navigation items with icons and active state using `UNavigationMenu` with `orientation="vertical"` and `highlight`
- Links to all dashboard sub-routes via `to` property (active state handled automatically by `ULink`)
- Typed items array using `NavigationMenuItem` from `@nuxt/ui`
- `aria-label="Dashboard navigation"` for accessibility
- **Verify:** Component renders, links navigate correctly

### 5.3 — Create `app/components/dashboard/OverviewCard.vue` — DONE
- Reusable card: icon, label, value, optional trend indicator
- Uses UCard from Nuxt UI
- Trend color extracted to `trendColorClass` computed (DRY)
- **Verify:** Component renders with mock data

### 5.4 — Create dashboard pages — DONE
- `app/pages/dashboard/index.vue` — 4 OverviewCards (Total balance, Monthly spending, Recent transactions, Budget status) with placeholder/empty values. `definePageMeta({ layout: 'dashboard', middleware: 'auth' })`
- `app/pages/dashboard/transactions.vue` — empty state ("No transactions yet") with `role="status"`. Same meta.
- `app/pages/dashboard/budgets.vue` — empty state ("No budgets yet") with `role="status"`. Same meta.
- `app/pages/dashboard/settings.vue` — user profile display (name, email, avatar, provider badge, verified badge) + placeholder for future settings. Same meta.
- All pages include `useSeoMeta()` with consistent `"PageName - finai"` format
- **Verify:** All pages render, middleware redirects unauthenticated users

### 5.5 — Wire up logout in dashboard header — DONE
- Uses `useAuth().logout()` in sidebar footer
- **Verify:** Logout clears session, redirects to `/`

**Checkpoint 5:** Full dashboard renders for authenticated users. Sidebar navigation works. Unauthenticated users are redirected. PASSED 2026-02-15.
- Note: User info + logout placed in sidebar footer (not header bar) — idiomatic for Nuxt UI v4 `UDashboardSidebar` component.
- Note: Active state handled by `UNavigationMenu` via `ULink` internally — no manual `useRoute()` needed.
- Note: Empty state pages use `role="status"` for screen reader accessibility.

---

## Phase 6: Security Hardening (can start after Phase 2) — DONE

> Goal: Verify all security measures are in place

### 6.1 — Verify rate limiting — DONE
- Test: 6 rapid login attempts from same IP → 429 on 6th
- Test: 11 failed logins for same email → account lockout message
- **Verify:** Rate limits enforce correctly
- Automated via `tests/security/rate-limiting.spec.ts` (3 tests, all pass)

### 6.2 — Verify security headers — DONE
- `curl -I http://localhost:3889` shows all expected headers
- No `X-Powered-By` header leaked
- **Verify:** All headers present
- Automated via `tests/security/headers.spec.ts` (6 tests, all pass)
- Fix: `X-Powered-By: Nuxt` was not removed by `removeResponseHeader` in middleware (Nitro sets it later). Fixed by hooking into `writeHead` to remove it at response time.

### 6.3 — Review auth endpoints for enumeration — DONE
- Register with existing email → generic error (not "email already exists" specifically revealing account existence — or acceptable for this use case, since register needs to say "already registered")
- Login with wrong email → same error as wrong password ("Invalid email or password")
- Forgot password with nonexistent email → same response as existing email
- Automated via `tests/security/enumeration.spec.ts` (3 tests, all pass)
- **Verify:** No user enumeration on login/forgot-password. Register may reveal existence (acceptable trade-off).

**Checkpoint 6:** Security measures verified and working. PASSED 2026-02-15.
- 12 Playwright E2E tests in `tests/security/` (3 rate limiting, 6 headers, 3 enumeration)
- Fix applied: `X-Powered-By` removal via `writeHead` hook in `server/middleware/security.ts`

---

## Phase 7: Integration & Verification — DONE

> Goal: End-to-end testing of all flows, cleanup

### 7.1 — Full flow manual test
1. Visit `/` → landing page renders
2. Click "Get Started" → navigate to `/register`
3. Register with email/password → "Verification email sent"
4. (Check Resend dashboard or logs for verification link)
5. Click verification link → email verified → redirected to `/dashboard`
6. Navigate dashboard sub-pages → all render
7. Logout → redirected to `/`
8. Login with credentials → `/dashboard`
9. Test forgot password flow
10. Test OAuth buttons (if credentials configured)

### 7.2 — E2E tests (Playwright)
- Test landing page renders
- Test register + login flow (mock email verification)
- Test protected routes redirect to `/login`
- Test dashboard pages render for authenticated users
- Test logout flow
- **Verify:** `bun run test:e2e` passes

### 7.3 — Cleanup
- Remove `<NuxtWelcome />` from `app/pages/index.vue` (replaced by landing page)
- Update `README.md` with setup instructions (Docker, env vars, migrations)
- Verify `.env.example` is complete
- Verify `.gitignore` includes `.env`, `node_modules`, `.nuxt`, `.output`
- **Verify:** Clean git status, no secrets committed

**Checkpoint 7:** All flows work end-to-end. Tests pass. Ready for use. PASSED 2026-02-15.
- 50 Playwright E2E tests total across 7 test files (38 new + 12 existing security tests)
- Tests cover: landing page (8), auth page rendering (12), auth API flows (9), route protection (9), security headers (6), rate limiting (3), enumeration (3)
- Fix applied: rate-limiting tests set to serial mode (shared in-memory state)
- Fix applied: auth page tests scoped to `main` to avoid strict mode violations
- README rewritten with full Docker/DB/env setup instructions
- `.gitignore` cleaned up (removed stale entries)

---

## Execution Order (Sequential)

```
Phase 0 ─── Infrastructure ──────────────────────┐
    │                                              │
Phase 1 ─── Database                    Phase 4 ─── Landing Page (parallel)
    │                                              │
Phase 2 ─── Auth Backend                           │
    │         │                                    │
Phase 3 ─── Auth Frontend              Phase 6 ─── Security Hardening
    │                                              │
Phase 5 ─── Dashboard ────────────────────────────┘
    │
Phase 7 ─── Integration & Verification
```

## Estimated File Count

- **New files:** ~35
- **Modified files:** 4 (`nuxt.config.ts`, `package.json`, `.env.example`, `app/pages/index.vue`, `app/layouts/default.vue`)
- **Total tasks:** 32

---

*Generated by `/sc:workflow` — implementation plan only. Use `/sc:implement` to execute step by step.*
