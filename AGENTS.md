# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Nuxt application code (`app.vue`, `layouts/`, `pages/`).
- `server/`: server-side API and backend logic for Nitro routes (add new endpoints here).
- `public/`: static assets served as-is (for example `favicon.ico`, `robots.txt`).
- `tests/`: Playwright end-to-end tests (`*.spec.ts`).
- Root config: `nuxt.config.ts`, `playwright.config.ts`, `tsconfig.json`, `.env.example`.

## Build, Test, and Development Commands
- `bun install`: install dependencies.
- `bun run dev`: start local dev server on `http://localhost:3889`.
- `bun run build`: build production output.
- `bun run preview`: run the production build locally.
- `bun run generate`: generate static site output when needed.
- `bun run test:e2e`: run Playwright E2E suite in `tests/`.
- `bun run test:e2e:ui`: run Playwright in interactive UI mode.

## Coding Style & Naming Conventions
- Use TypeScript and Vue 3 SFCs; prefer explicit typing for non-trivial values.
- Follow existing formatting: 2-space indentation, single quotes in TS, and minimal semicolon usage.
- Keep Nuxt conventions: pages in `app/pages/<route>.vue`, layouts in `app/layouts/<name>.vue`, and tests in `tests/<feature>.spec.ts`.
- Use clear, descriptive names (`auth-login.spec.ts`, `budget-summary.vue`).

## Testing Guidelines
- Framework: Playwright with `@nuxt/test-utils/playwright`.
- Place new user-flow tests in `tests/` as `*.spec.ts`.
- Keep tests deterministic; avoid external network dependencies unless mocked.
- Run `bun run test:e2e` before opening a PR.
- No coverage gate is currently enforced; add tests for every user-visible behavior change.

## Commit & Pull Request Guidelines
- Follow Conventional Commits as seen in history, e.g. `feat: add transaction filter`.
- Keep commits focused and atomic; avoid mixing refactors with feature work.
- PRs should include a concise summary and rationale.
- PRs should include a linked issue when applicable.
- PRs should include test evidence (command + result).
- PRs should include screenshots or video for UI changes.
- Rebase onto `main` and resolve conflicts before requesting review.

## Security & Configuration Tips
- Never commit secrets. Keep local values in `.env`; update `.env.example` when adding required variables.
- Validate any finance-related third-party integration keys and scopes before merge.
