# finai

> Personal Financial Dashboard

![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js)
![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

finai is an open-source personal financial dashboard built with Nuxt 4 and Vue 3. Track spending, plan budgets, and gain insights into your financial health.

## Features

- Email/password authentication with email verification
- OAuth login (GitHub, Google)
- Dashboard with overview, transactions, budgets, and settings
- Rate limiting and security headers
- Responsive UI with dark mode support (Nuxt UI)

## Tech Stack

- **Framework:** [Nuxt 4](https://nuxt.com/) (Vue 3)
- **UI:** [Nuxt UI v4](https://ui.nuxt.com/)
- **Database:** PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **Auth:** [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) (sealed cookie sessions)
- **Email:** [Resend](https://resend.com/)
- **Runtime:** [Bun](https://bun.sh/)
- **Testing:** [Playwright](https://playwright.dev/)

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/oliverrees/finai.git
cd finai
bun install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL 17 on port **5433** (not the default 5432).

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pre-filled for Docker setup |
| `NUXT_SESSION_PASSWORD` | Yes | Random 32+ char string for cookie encryption |
| `NUXT_OAUTH_GITHUB_CLIENT_ID` | No | GitHub OAuth app client ID |
| `NUXT_OAUTH_GITHUB_CLIENT_SECRET` | No | GitHub OAuth app client secret |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `RESEND_API_KEY` | No | Resend API key for verification emails |
| `EMAIL_FROM` | No | Sender email address |
| `APP_URL` | Yes | Pre-filled as `http://localhost:3889` |

### 4. Run database migrations

```bash
bun run db:generate
bun run db:migrate
```

### 5. Start the dev server

```bash
bun run dev
```

The app will be available at [http://localhost:3889](http://localhost:3889).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3889) |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run test:e2e` | Run Playwright E2E tests |
| `bun run test:e2e:ui` | Run tests in Playwright UI mode |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:studio` | Open Drizzle Studio |

## Project Structure

```
app/                  # Nuxt 4 source directory
  pages/              # File-based routing
  components/         # Auto-imported Vue components
  composables/        # Auto-imported composables
  layouts/            # Layout components (default, dashboard)
  middleware/         # Route middleware (auth, guest)
server/               # Nitro server
  api/auth/           # Auth API endpoints
  routes/auth/        # OAuth handlers (GitHub, Google)
  database/           # Drizzle schema and migrations
  middleware/         # Server middleware (security headers)
  utils/              # Server utilities (auth, email, rate-limit, validation)
tests/                # Playwright E2E tests
```

## License

[MIT](LICENSE)
