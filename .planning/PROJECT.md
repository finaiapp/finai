# finai — Plaid Integration & AI Analytics

## What This Is

A personal financial dashboard that connects to real bank accounts via Plaid, imports balances and transactions automatically, enables ACH transfers and bill payments, and provides AI-powered financial intelligence through a local language model. Built for a single user (the developer) as a personal finance control center.

## Core Value

Real bank data flowing into an AI-powered dashboard that helps me understand and control my money — see everything, ask anything, move money when needed.

## Requirements

### Validated

- ✓ User authentication (email/password, OAuth) — existing
- ✓ Manual transaction CRUD with categories — existing
- ✓ Dashboard with overview cards and recent transactions — existing
- ✓ Landing page with public/auth navigation — existing
- ✓ E2E test suite (61 tests across 9 files) — existing
- ✓ PostgreSQL + Drizzle ORM database layer — existing
- ✓ Rate limiting and security headers — existing

### Active

- [ ] Plaid Link integration for connecting bank accounts
- [ ] Account balance syncing from linked institutions
- [ ] Automatic transaction import from linked accounts
- [ ] ACH bank transfers between linked accounts
- [ ] Bill pay / send money via Plaid Transfer
- [ ] AI chat interface — ask questions about financial data
- [ ] AI spending pattern analysis and categorization
- [ ] Proactive financial alerts and insights
- [ ] Local LLM integration (Ollama-compatible)

### Out of Scope

- Multi-user support — single user (developer) only
- Cloud-hosted AI model — using local model exclusively
- Plaid production deployment — development keys for now
- Mobile app — web dashboard only
- Investment/brokerage account tracking — bank accounts only
- Cryptocurrency — traditional banking only

## Context

- Existing Nuxt 4 + Vue 3 + Nuxt UI v4 app with full auth system, manual transactions, and dashboard
- PostgreSQL (Docker, port 5433) + Drizzle ORM already in place
- Plaid development API keys available (real banks, limited accounts)
- Local AI model available (Ollama-compatible, local inference)
- Plaid Node SDK: `plaid-node` — official client library
- Plaid Link: client-side widget for account connection flow
- Plaid API products needed: Transactions, Balance, Transfer, Auth
- Existing manual transactions feature can coexist with or be enhanced by Plaid-imported transactions

## Constraints

- **Plaid Environment**: Development mode (real institutions, limited accounts) — not sandbox, not production
- **AI Runtime**: Local model only (Ollama or compatible) — no cloud API dependencies for inference
- **Single User**: No multi-tenancy concerns, but still use proper auth/ownership patterns
- **Existing Stack**: Must integrate with Nuxt 4 + Drizzle ORM + PostgreSQL — no stack changes
- **Security**: Bank credentials never touch our server (Plaid Link handles this) — only tokens stored

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Plaid over manual-only | Real bank data is the core value — manual entry is a fallback | — Pending |
| Local LLM over cloud API | Privacy (financial data stays local), no API costs, user has own model | — Pending |
| Development keys first | Faster iteration with real data, upgrade to production later | — Pending |
| ACH + bill pay in v1 | User wants full control center, not just read-only | — Pending |
| Single user architecture | Personal tool — simpler auth, no tenant isolation needed | — Pending |

---
*Last updated: 2026-02-15 after initialization*
