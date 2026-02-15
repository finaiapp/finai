# Codebase Structure

**Analysis Date:** 2025-02-15

## Directory Layout

```
finai/
├── app/                    # Nuxt 4 client-side source code
│   ├── app.vue             # Root component (NuxtLayout + NuxtPage)
│   ├── pages/              # File-based routing (auto-routed)
│   │   ├── index.vue       # Landing page (/)
│   │   ├── login.vue       # (/login)
│   │   ├── register.vue    # (/register)
│   │   ├── verify-email.vue # (/verify-email) - no middleware
│   │   ├── forgot-password.vue # (/forgot-password)
│   │   ├── reset-password.vue  # (/reset-password)
│   │   └── dashboard/      # Protected dashboard routes (/dashboard/*)
│   │       ├── index.vue   # Overview dashboard
│   │       ├── transactions.vue # Transaction list + CRUD
│   │       ├── budgets.vue # Budget planning (stub)
│   │       └── settings.vue # User profile settings
│   ├── components/         # Auto-imported Vue components
│   │   ├── auth/           # Authentication UI components
│   │   │   ├── LoginForm.vue
│   │   │   ├── RegisterForm.vue
│   │   │   ├── OAuthButtons.vue
│   │   │   ├── ForgotPasswordForm.vue
│   │   │   └── ResetPasswordForm.vue
│   │   ├── dashboard/      # Dashboard UI components
│   │   │   ├── Sidebar.vue # Navigation sidebar
│   │   │   └── OverviewCard.vue # Stats card with trend
│   │   ├── transactions/   # Transaction management components
│   │   │   ├── TransactionForm.vue # Add/edit form
│   │   │   ├── TransactionList.vue # Table display
│   │   │   ├── TransactionFilters.vue # Filter controls
│   │   │   └── TransactionDeleteConfirm.vue # Delete modal
│   │   └── landing/        # Landing page sections
│   │       ├── Hero.vue    # Hero section
│   │       ├── Features.vue # Feature list
│   │       └── CallToAction.vue # CTA section
│   ├── layouts/            # Layout components
│   │   ├── default.vue     # Public layout (header, footer)
│   │   └── dashboard.vue   # Protected layout (sidebar)
│   ├── composables/        # Auto-imported Vue composables
│   │   ├── useAuth.ts      # Auth session wrapper
│   │   ├── useTransactions.ts # Transaction CRUD API
│   │   ├── useCategories.ts # Category CRUD API
│   │   └── useDashboardSummary.ts # Dashboard stats API
│   ├── middleware/         # Route middleware
│   │   ├── auth.ts         # Protect routes, require login + email verification
│   │   └── guest.ts        # Redirect logged-in users away from auth pages
│   ├── utils/              # Client-side utilities (auto-imported)
│   │   ├── error.ts        # extractErrorMessage() for error responses
│   │   ├── handle-api-error.ts # handleApiError() for composables
│   │   ├── validation.ts   # Client-side form validation rules
│   │   └── format.ts       # formatAmount(), formatDate() for display
│   ├── assets/             # Static assets
│   │   └── css/            # Global styles (Tailwind customizations)
│   └── plugins/            # Nuxt plugins (.gitkeep only)
├── server/                 # Nitro server-side code
│   ├── api/                # Auto-routed API endpoints
│   │   ├── auth/           # Authentication endpoints (/api/auth/*)
│   │   │   ├── login.post.ts
│   │   │   ├── register.post.ts
│   │   │   ├── logout.post.ts
│   │   │   ├── verify-email.post.ts
│   │   │   ├── resend-verification.post.ts
│   │   │   ├── forgot-password.post.ts
│   │   │   └── reset-password.post.ts
│   │   ├── transactions/   # Transaction endpoints (/api/transactions/*)
│   │   │   ├── index.get.ts # List with filters
│   │   │   ├── index.post.ts # Create
│   │   │   ├── [id].get.ts # Get by ID
│   │   │   ├── [id].put.ts # Update
│   │   │   └── [id].delete.ts # Delete
│   │   ├── categories/     # Category endpoints (/api/categories/*)
│   │   │   ├── index.get.ts # List (auto-seeds defaults)
│   │   │   ├── index.post.ts # Create
│   │   │   ├── [id].put.ts # Update
│   │   │   └── [id].delete.ts # Delete
│   │   └── dashboard/      # Dashboard endpoints (/api/dashboard/*)
│   │       └── summary.get.ts # Monthly/total stats
│   ├── routes/             # Custom routes (non-auto-routed)
│   │   └── auth/           # OAuth callback routes
│   │       ├── github.get.ts # GitHub OAuth handler
│   │       └── google.get.ts # Google OAuth handler
│   ├── middleware/         # Server middleware
│   │   └── security.ts     # Security headers (CSP, HSTS, etc.)
│   ├── utils/              # Server-side utilities
│   │   ├── auth.ts         # User CRUD, token generation, OAuth upsert
│   │   ├── transactions.ts # Transaction CRUD, dashboard summary
│   │   ├── categories.ts   # Category CRUD, default seeding
│   │   ├── validation.ts   # Server-side validation rules (sync with client)
│   │   ├── email.ts        # Resend email service wrapper
│   │   └── rate-limit.ts   # Rate limiter instances and checkRateLimit()
│   └── database/           # Database setup
│       ├── index.ts        # Drizzle client initialization
│       ├── schema.ts       # Table definitions + relations
│       └── migrations/     # Drizzle migrations
├── tests/                  # Playwright E2E tests
│   ├── landing/            # Landing page tests
│   │   └── landing.spec.ts
│   ├── auth/               # Auth flow tests
│   │   ├── pages.spec.ts
│   │   ├── api-flows.spec.ts
│   │   └── route-protection.spec.ts
│   ├── security/           # Security headers + rate limiting + anti-enumeration
│   │   ├── headers.spec.ts
│   │   ├── rate-limiting.spec.ts
│   │   └── enumeration.spec.ts
│   └── transactions/       # Transaction feature tests
│       ├── api.spec.ts
│       └── pages.spec.ts
├── public/                 # Static files served at root
├── docs/                   # Project documentation
├── .planning/              # GSD planning documents (this file location)
├── .plans/                 # Detailed phase implementation plans
├── nuxt.config.ts          # Nuxt configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies
├── playwright.config.ts    # Playwright E2E test config
├── drizzle.config.ts       # Drizzle ORM config
├── .env.example            # Environment variables template
└── bun.lock                # Bun lockfile
```

## Directory Purposes

**app/pages/:**
- Purpose: File-based routing — each `.vue` file becomes a route automatically
- Contains: Page components with `<script setup>`, `definePageMeta()` for middleware/layout, `useSeoMeta()` for SEO
- Pattern: Public pages in root (index, login, register), protected pages under `dashboard/` with `middleware: 'auth'`
- Key files:
  - `app/pages/index.vue` — Landing with Hero + Features + CTA
  - `app/pages/login.vue`, `register.vue` — Auth pages (guest middleware redirects authenticated users)
  - `app/pages/dashboard/index.vue` — Overview cards with summary stats

**app/components/:**
- Purpose: Reusable Vue 3 components, auto-imported by prefix (e.g., `DashboardSidebar` from `app/components/dashboard/Sidebar.vue`)
- Contains: Feature-grouped components (auth/, dashboard/, transactions/, landing/)
- Pattern: Folder-based prefixing, PascalCase file names, `<script setup>` with typed props/emits
- All components use Nuxt UI (`UButton`, `UForm`, `UCard`, `UModal`, etc.) for consistent styling

**app/composables/:**
- Purpose: Auto-imported Vue 3 composables for shared logic, primarily API wrappers
- Contains: State management (refs for loading/error), async fetch functions, mutation functions
- Pattern: Each composable returns single object with `{ state refs, async functions }`, exposes `error` ref
- All use `$fetch()` for HTTP with `handleApiError()` for error extraction
- Examples:
  - `useAuth()` — login(), register(), logout(), refreshSession()
  - `useTransactions()` — fetchTransactions(), addTransaction(), editTransaction(), removeTransaction()
  - `useCategories()` — fetchCategories(), addCategory(), editCategory(), removeCategory()
  - `useDashboardSummary()` — fetchSummary()

**app/middleware/:**
- Purpose: Route-level middleware for access control and redirects
- Contains: `auth.ts` (require login + email verification), `guest.ts` (redirect logged-in users from auth pages)
- Pattern: `defineNuxtRouteMiddleware((to) => { ... })` returning `navigateTo()` or undefined
- Applied via `definePageMeta({ middleware: 'auth' })` on protected pages

**app/utils/:**
- Purpose: Client-side helper functions (auto-imported)
- Contains: Form validation, error extraction, formatting, API error handling
- Key files:
  - `validation.ts` — `validateEmail()`, `validateTransactionForm()`, `validatePassword()`, `validateNotes()`
  - `error.ts` — `extractErrorMessage()` extracts statusMessage or data.message from API errors
  - `handle-api-error.ts` — `handleApiError()` wraps extractErrorMessage, clears session on 401
  - `format.ts` — `formatAmount()` (USD), `formatDate()` (UTC-safe)

**server/api/:**
- Purpose: RESTful API endpoints, auto-routed by Nitro (file path → URL path)
- Contains: Event handlers for CRUD operations, auth flows, data aggregation
- Pattern:
  - `index.get.ts` → GET /api/resource
  - `index.post.ts` → POST /api/resource
  - `[id].get.ts` → GET /api/resource/:id
  - `[id].put.ts` → PUT /api/resource/:id
  - `[id].delete.ts` → DELETE /api/resource/:id
- All require `requireUserSession(event)` for authenticated endpoints, apply `checkRateLimit()`, validate inputs

**server/routes/:**
- Purpose: Custom routes not following `/api/` convention (used for OAuth redirects)
- Contains: OAuth callback handlers that don't fit RESTful structure
- Pattern: `server/routes/auth/github.get.ts` → GET /auth/github (OAuth redirect)
- These use `defineOAuthGitHubEventHandler()` and `defineOAuthGoogleEventHandler()` from nuxt-auth-utils

**server/utils/:**
- Purpose: Reusable server-side business logic and data access functions
- Contains: Database CRUD operations, query builders, validation, email service, rate limiting
- Key files:
  - `auth.ts` — `findUserByEmail()`, `createUser()`, `upsertOAuthUser()`, `createVerificationToken()`, `verifyToken()`
  - `transactions.ts` — `getUserTransactions()`, `getTransactionById()`, `createTransaction()`, `updateTransaction()`, `deleteTransaction()`, `getDashboardSummary()`
  - `categories.ts` — `getUserCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()`, `seedDefaultCategories()`
  - `validation.ts` — Server-side validation (kept in sync with client via comments)
  - `rate-limit.ts` — Rate limiter instances and `checkRateLimit()` helper
  - `email.ts` — Email sending via Resend

**server/database/:**
- Purpose: Drizzle ORM schema and connection management
- Contains: Table definitions with indexes, relations, migrations
- Key files:
  - `schema.ts` — Defines `users`, `verificationTokens`, `categories`, `transactions` tables with Drizzle relations
  - `index.ts` — Initializes Drizzle client with PostgreSQL driver
  - `migrations/` — Auto-generated SQL migration files (run via `bun run db:push`)

**tests/:**
- Purpose: Playwright E2E tests for feature validation and regression prevention
- Contains: Organized test files by feature area (landing, auth, security, transactions)
- Pattern:
  - Use `@nuxt/test-utils/playwright` (not bare @playwright/test)
  - Use `page.goto(path, { waitUntil: 'hydration' })` for navigation
  - Scope to `page.getByRole('main')` to avoid header/footer duplicates
  - Rate limiting tests use `test.describe.configure({ mode: 'serial' })` for shared state
- Examples:
  - `tests/landing/landing.spec.ts` — 8 tests for landing page rendering, navigation, footer
  - `tests/auth/pages.spec.ts` — 12 tests for login/register/forgot page rendering + validation
  - `tests/transactions/api.spec.ts` — 9 tests for API endpoint auth protection

## Key File Locations

**Entry Points:**
- `app/app.vue` — Root component, renders `<NuxtLayout>` + `<NuxtPage>`, entry for all routes
- `nuxt.config.ts` — Nuxt configuration, module registration, runtime config
- `server/api/` — All RESTful endpoints auto-routed from file paths

**Configuration:**
- `nuxt.config.ts` — Nuxt framework config, modules, dev server port (3889)
- `tsconfig.json` — TypeScript references to generated Nuxt tsconfigs
- `drizzle.config.ts` — Drizzle migration and schema location
- `playwright.config.ts` — E2E test runner config
- `.env` — Runtime secrets (SESSION_PASSWORD, DATABASE_URL, OAuth keys)

**Core Logic:**
- `app/composables/useAuth.ts` — Authentication state and API wrapper
- `app/composables/useTransactions.ts` — Transaction CRUD and list management
- `app/composables/useCategories.ts` — Category CRUD
- `server/utils/auth.ts` — User and token database operations
- `server/utils/transactions.ts` — Transaction and dashboard queries
- `server/database/schema.ts` — All table and relation definitions

**Testing:**
- `tests/landing/landing.spec.ts` — Landing page feature tests
- `tests/auth/api-flows.spec.ts` — Full auth flows (register, login, forgot, reset, verify)
- `tests/transactions/api.spec.ts` — Transaction endpoint authorization and filtering
- `tests/security/headers.spec.ts` — CSP, HSTS, security headers validation
- `tests/security/rate-limiting.spec.ts` — Rate limiting enforcement

## Naming Conventions

**Files:**
- Vue components: PascalCase with `.vue` extension (e.g., `TransactionForm.vue`, `DashboardSidebar.vue`)
- Composables: camelCase with `use` prefix (e.g., `useAuth.ts`, `useTransactions.ts`)
- API routes: lowercase kebab-case reflecting REST convention (e.g., `login.post.ts`, `forgot-password.post.ts`)
- Utilities: camelCase describing function (e.g., `validation.ts`, `error.ts`, `format.ts`)

**Directories:**
- Feature grouping: lowercase (auth/, dashboard/, transactions/, landing/)
- Auto-imported convention: Components use folder prefixes as PascalCase (e.g., folder `dashboard/` → component prefix `Dashboard`)

**TypeScript/JavaScript:**
- Functions: camelCase (e.g., `validateEmail()`, `formatAmount()`, `getUserTransactions()`)
- Types/Interfaces: PascalCase (e.g., `Transaction`, `AuthUser`, `TransactionFilters`)
- Constants: UPPER_SNAKE_CASE for config (e.g., `DATE_REGEX`, `authRateLimiter`)
- Refs/Reactive state: camelCase (e.g., `showAddModal`, `deleteLoading`, `error`)

## Where to Add New Code

**New Feature (e.g., Reports):**
- Primary code:
  - Page: `app/pages/dashboard/reports.vue` (with `middleware: 'auth'`, `layout: 'dashboard'`)
  - Components: `app/components/reports/ReportGenerator.vue`, `ReportViewer.vue`
  - Composable: `app/composables/useReports.ts` (fetch/filter/export)
  - API: `server/api/reports/index.get.ts`, `server/api/reports/index.post.ts`
  - Utils: `server/utils/reports.ts` (database queries)
  - Schema: Add table in `server/database/schema.ts`, create migration
- Tests: `tests/reports/pages.spec.ts`, `tests/reports/api.spec.ts`

**New Component (e.g., DateRangePicker):**
- Implementation: `app/components/forms/DateRangePicker.vue`
- Usage: Import directly or rely on auto-import via file location
- Props/emits: Typed via `defineProps<>` and `defineEmits<>`

**New Utility (e.g., formatCurrency):**
- Shared helpers: `app/utils/format.ts` (client) or `server/utils/format.ts` (server)
- If duplicated on both sides: Keep in sync with sync comments like existing validation

**New Validation Rule:**
- Client-side: Add function to `app/utils/validation.ts`
- Server-side: Add equivalent to `server/utils/validation.ts`
- Link with comment: `// Keep in sync with server/utils/validation.ts` (client) and vice versa

**New Middleware:**
- Location: `app/middleware/newname.ts`
- Apply via: `definePageMeta({ middleware: 'newname' })` on page
- Examples: `app/middleware/auth.ts` (require login), `app/middleware/guest.ts` (require logout)

**New API Endpoint:**
- Location: `server/api/resource/[method].ts` following Nitro convention
- Protection: Call `requireUserSession(event)` for authenticated endpoints
- Rate limit: Call `checkRateLimit(limiter, key)` based on endpoint type
- Validation: Validate inputs via `getQuery()`, `readBody()`, throw `createError()` on fail
- Example: `server/api/transactions/index.get.ts` validates `type`, `limit`, `offset`, `startDate`, `endDate`

**New Database Table:**
- Schema: Add `pgTable()` definition to `server/database/schema.ts`
- Relations: Add `relations()` function for Drizzle relations
- Migration: Run `bun run db:generate` to create migration, review in `server/database/migrations/`
- Utils: Create `server/utils/tablename.ts` with CRUD functions
- API: Add endpoints in `server/api/tablename/` for REST operations

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md)
- Generated: Yes (by GSD commands)
- Committed: Yes (for reference by planner/executor)

**`.plans/`:**
- Purpose: Detailed phase implementation plans (e.g., `.plans/phase-8-transactions.md`)
- Generated: Yes (by `/gsd:plan-phase`)
- Committed: Yes (historical reference)

**`.nuxt/`:**
- Purpose: Nuxt build artifacts (compiled pages, auto-imports, generated types)
- Generated: Yes (by `bun run dev` or `bun run build`)
- Committed: No (in .gitignore)

**`.output/`:**
- Purpose: Production build output (server bundle, client dist)
- Generated: Yes (by `bun run build`)
- Committed: No

**`server/database/migrations/`:**
- Purpose: Drizzle ORM migration SQL files
- Generated: Yes (by `bun run db:generate`)
- Committed: Yes (must be committed for database version control)
