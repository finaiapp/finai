# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

finai is a personal financial dashboard built with Nuxt 4, Vue 3, and Nuxt UI. It uses Bun as the package manager and runtime.

## Commands

- **Dev server:** `bun run dev` (runs on port 3889)
- **Build:** `bun run build`
- **Preview production build:** `bun run preview`
- **E2E tests (all):** `bun run test:e2e`
- **E2E tests (single file):** `bunx playwright test tests/example.spec.ts`
- **E2E tests (UI mode):** `bun run test:e2e:ui`
- **Install deps:** `bun install`
- **Prepare Nuxt types:** `bun run postinstall`

## Architecture

- **Nuxt 4** with `app/` directory structure (not the legacy root-level layout)
- **UI:** Nuxt UI (`@nuxt/ui`) which provides components and Tailwind CSS styling
- **Testing:** Playwright with `@nuxt/test-utils/playwright` integration — tests live in `tests/` and import from `@nuxt/test-utils/playwright` (not bare `@playwright/test`)
- **Entry point:** `app/app.vue` uses `<NuxtLayout>` + `<NuxtPage>` for routing

### Directory Structure

```
app/                  # Nuxt 4 source directory
  app.vue             # Root component (layout + page wiring)
  pages/              # File-based routing
  components/         # Auto-imported Vue components
  composables/        # Auto-imported composables (useState, useFetch wrappers, etc.)
  layouts/            # Layout components (default.vue)
  assets/css/         # Global styles, Tailwind customizations
  middleware/         # Route middleware
  plugins/            # Nuxt plugins
server/               # Nitro server directory
  api/                # API routes (server/api/foo.ts → /api/foo)
  middleware/         # Server middleware
  utils/              # Server-only utilities
tests/                # Playwright E2E tests
```

## Nuxt Modules

Configured in `nuxt.config.ts`: `@nuxt/test-utils`, `@nuxt/ui`, `@nuxtjs/ngrok`, `@oro.ad/nuxt-claude-devtools`

<!-- NUXT-DEVTOOLS:CRITICAL-FILES -->
## Critical Configuration Files

The following files trigger a full Nuxt restart when modified:
- `nuxt.config.ts`
- `nuxt.config.js`
- `app.config.ts`
- `app.config.js`
- `.nuxtrc`
- `tsconfig.json`

### MANDATORY CHECK (EVERY TIME, NO EXCEPTIONS)

**BEFORE modifying ANY of these files, you MUST:**

```
1. READ .claude-devtools/settings.json
2. CHECK criticalFiles.autoConfirm value
3. IF false OR file missing → STOP and ASK user
4. IF true → inform user, then proceed
```

**This check is REQUIRED every single time, even if you checked before in this session.**

### Order of Operations

1. **Complete ALL prerequisite tasks FIRST**
   - Create all new files that will be referenced
   - Install all dependencies
   - Write all related code

2. **Verify prerequisites exist**
   - All files referenced in config change must exist
   - All imports must be valid

3. **Check settings file** (read `.claude-devtools/settings.json`)

4. **Act based on autoConfirm setting**

### Current Setting

**autoConfirm: DISABLED**

→ MUST ask user and WAIT for explicit "yes" before proceeding.

---
After restart, conversation history is preserved. User can send "continue" to resume.
<!-- /NUXT-DEVTOOLS:CRITICAL-FILES -->
