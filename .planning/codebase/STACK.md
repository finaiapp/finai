# Technology Stack

**Analysis Date:** 2025-02-15

## Languages

**Primary:**
- TypeScript 5.x - Full codebase (client, server, tests)

**Secondary:**
- JavaScript (ES2020+) - Module syntax via TypeScript
- HTML - Vue templates
- CSS - Tailwind CSS via Nuxt UI

## Runtime

**Environment:**
- Bun 1.x - Package manager and runtime
- Node.js compatible (Bun is a Node.js alternative)

**Package Manager:**
- Bun - Primary package manager and runtime
- Lockfile: `bun.lockb` (present)

## Frameworks

**Core:**
- Nuxt 4.3.1 - Full-stack meta-framework (routing, SSR, API)
- Vue 3.5.28 - Component framework

**UI:**
- Nuxt UI 4.4.0 - Component library and Tailwind CSS integration
- Tailwind CSS - Included via Nuxt UI, no separate tailwind.config needed

**Testing:**
- Playwright 1.58.2 - E2E testing framework
- @nuxt/test-utils 4.0.0 - Nuxt-specific Playwright integration (provides `@nuxt/test-utils/playwright`)

**Build/Dev:**
- Vite - Built into Nuxt (configured for ngrok dev tunneling with custom allowedHosts)
- Drizzle Kit 0.31.9 - Database schema management and migrations

## Key Dependencies

**Critical:**
- nuxt-auth-utils 0.5.28 - Session management with sealed cookies, OAuth handlers, scrypt password hashing
- drizzle-orm 0.45.1 - Type-safe ORM for PostgreSQL
- postgres 3.4.8 - PostgreSQL client driver (used by Drizzle)
- resend 6.9.2 - Email service for verification and password reset
- rate-limiter-flexible 9.1.1 - In-memory rate limiting for auth endpoints and API

**Infrastructure:**
- vue-router 4.6.4 - Routing (integrated into Nuxt, used explicitly for type imports)
- @nuxtjs/ngrok 3.0.1 - Dev tunneling for local development and OAuth callback testing
- @oro.ad/nuxt-claude-devtools 1.5.2 - Development utilities

## Configuration

**Environment:**
- Environment variables via `.env` file (secrets and configuration)
- Critical vars: `DATABASE_URL`, `SESSION_PASSWORD`, `OAUTH_GITHUB_*`, `OAUTH_GOOGLE_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `NGROK_AUTHTOKEN`
- See `.env.example` for all required variables

**Build:**
- `nuxt.config.ts` - Main configuration (modules, runtimeConfig, Vite settings)
- `drizzle.config.ts` - Database configuration (PostgreSQL dialect, schema path, migrations path)
- `playwright.config.ts` - E2E test configuration (test directory, browsers, reporters)
- `tsconfig.json` - References generated TypeScript configs from `.nuxt/`

**Dev Server:**
- Port: 3889 (specified in `package.json` dev script and `nuxt.config.ts`)
- Host: 0.0.0.0 (accessible from network)
- HMR over WSS/443 for ngrok tunneling

## Platform Requirements

**Development:**
- Bun 1.x or compatible Node.js runtime
- PostgreSQL 13+ (Docker on port 5433 for local dev)
- Modern browser for Playwright tests (Chromium only in default config)

**Production:**
- Node.js 18+ compatible runtime (Bun or Node)
- PostgreSQL 13+ database
- Environment variables properly configured
- Deployment target: Any Node-compatible platform (Vercel, Railway, self-hosted, etc.)

---

*Stack analysis: 2025-02-15*
