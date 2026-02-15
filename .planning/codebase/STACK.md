# Technology Stack

**Analysis Date:** 2025-02-15

## Languages

**Primary:**
- TypeScript 5.x - Entire codebase (frontend, server, build tools)

**Secondary:**
- SQL - PostgreSQL migrations and queries via Drizzle ORM

## Runtime

**Environment:**
- Bun - JavaScript runtime and package manager (specified as primary runtime in `package.json`)

**Package Manager:**
- Bun - All dependency management and script execution
- Lockfile: `bun.lock` (generated, not in repo)

## Frameworks

**Core Web:**
- Nuxt 4.3.1 - Full-stack framework with file-based routing
  - Directory structure: `app/` directory (not legacy root-level)
  - Entry point: `app/app.vue` uses `<NuxtLayout>` + `<NuxtPage>`

**UI Framework:**
- Vue 3.5.28 - Component library (auto-imported via Nuxt)
- Nuxt UI 4.4.0 - Pre-built Vue components with Tailwind CSS
  - Provides form components (UForm, UInput, UButton, USelect, UModal)
  - Dashboard components (UDashboardGroup, UDashboardSidebar, UDashboardPanel)
  - Navigation components (UNavigationMenu, ULink)

**Backend Runtime:**
- Nitro (bundled with Nuxt 4) - Server framework for API routes and middleware
  - Directory: `server/`
  - Routing: `server/api/` → HTTP endpoints, `server/routes/` → custom routes

**Testing:**
- Playwright 1.58.2 - E2E testing framework
  - Uses @nuxt/test-utils/playwright integration (not bare @playwright/test)
  - Config: `playwright.config.ts`
  - Test directory: `tests/`

**Build/Dev:**
- Vite (bundled with Nuxt 4) - Frontend bundler with HMR support
- Nuxt Prepare - Auto-imports composables, components, utilities

## Key Dependencies

**Critical:**
- nuxt-auth-utils 0.5.28 - Session management with sealed cookies
  - Built-in password hashing via scrypt (`hashPassword`, `verifyPassword`)
  - OAuth integration helpers (`defineOAuthGitHubEventHandler`, `defineOAuthGoogleEventHandler`)
  - Session functions (`setUserSession`, `useUserSession`)

- drizzle-orm 0.45.1 - Type-safe ORM for PostgreSQL
  - Client: postgres.js (postgres 3.4.8)
  - Schema defined in `server/database/schema.ts`
  - Migrations in `server/database/migrations/`

- postgres 3.4.8 - PostgreSQL client library
  - Used as Drizzle driver
  - Connection via DATABASE_URL env variable

- resend 6.9.2 - Email service SDK
  - Used in `server/utils/email.ts` for verification and password reset emails
  - Requires RESEND_API_KEY env variable

- rate-limiter-flexible 9.1.1 - Request rate limiting
  - Memory-based limiter instances in `server/utils/rate-limit.ts`
  - Used for auth, verification, and API endpoint protection

**Development Infrastructure:**
- drizzle-kit 0.31.9 - Migration generation and database studio
  - Scripts: `db:generate`, `db:migrate`, `db:studio`

- @playwright/test 1.58.2 - Playwright test runner (dev dependency)

- @nuxt/test-utils 4.0.0 - Nuxt testing utilities

**Nuxt Modules:**
- @nuxt/test-utils 4.0.0 - Testing integration
- @nuxt/ui 4.4.0 - UI component library
- @nuxtjs/ngrok 3.0.1 - Ngrok tunnel for local development (dev environment)
- @oro.ad/nuxt-claude-devtools 1.5.2 - Claude AI development tools
- nuxt-auth-utils 0.5.28 - Authentication utilities

## Configuration

**Environment:**
- PostgreSQL 16+ (Docker required for local development)
  - Default connection: `postgresql://finai:finai_dev_password@localhost:5433/finai`
  - Config file: `drizzle.config.ts`

- Environment variables (`.env` required)
  - Session: `NUXT_SESSION_PASSWORD` (32+ character random string)
  - Database: `DATABASE_URL`
  - OAuth: `NUXT_OAUTH_GITHUB_CLIENT_ID`, `NUXT_OAUTH_GITHUB_CLIENT_SECRET`
  - OAuth: `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`
  - Email: `RESEND_API_KEY`, `EMAIL_FROM`
  - App: `APP_URL` (http://localhost:3889 for dev)
  - Ngrok: `NGROK_AUTHTOKEN` (optional, for tunnel)

**Build:**
- `nuxt.config.ts` - Main Nuxt configuration
  - Modules: test-utils, ui, auth-utils, ngrok, claude-devtools
  - Runtime config for session (maxAge: 604800 seconds = 7 days)
  - Runtime config for OAuth (github, google credentials)
  - Vite HMR configured for ngrok with wss/443
  - Allowed hosts for ngrok development domains

- `tsconfig.json` - References generated .nuxt/tsconfig files

- `playwright.config.ts` - E2E test configuration
  - Test directory: `./tests`
  - Browser: Chromium
  - Reporter: HTML
  - Retry strategy: 2 retries in CI, 0 otherwise

## Platform Requirements

**Development:**
- Node.js 20+ or Bun 1.x (uses Bun as runtime)
- PostgreSQL 16+ accessible at localhost:5433
- Docker (recommended for database)
- Git (implied by .gitignore presence)

**Production:**
- Bun runtime (same as development)
- PostgreSQL 16+ database
- Environment variables configured
- HTTPS/TLS for secure cookies
- Resend account for email (oauth provider credentials not required if using OAuth only)

---

*Stack analysis: 2025-02-15*
