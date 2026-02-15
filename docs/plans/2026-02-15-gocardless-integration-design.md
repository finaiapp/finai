# GoCardless Bank Account Data Integration Design

**Date:** 2026-02-15
**Status:** Approved (brainstorming complete)

## Overview

Add GoCardless (formerly Nordigen) open banking alongside existing Plaid integration. Users see all accounts (Plaid + GoCardless) on one unified accounts page. Phase 1 covers connection management and account balances only — no transaction syncing.

**Key constraints:**
- GoCardless stopped accepting new accounts July 2025 — existing credentials work
- `nordigen-node` SDK is deprecated — use raw `fetch`
- Banks limit to as few as 4 API calls/day per account per endpoint — aggressive caching required
- Access tokens: 24h, Refresh tokens: 30d

## Target Banks

Bank Norwegian, DNB, Revolut (Norwegian institutions via GoCardless)

## Data Model

Separate tables from Plaid (different API shapes). Unification happens at composable/UI layer.

### `gocardless_requisitions`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `userId` | integer FK → users | |
| `requisitionId` | varchar(100) | GoCardless UUID |
| `institutionId` | varchar(100) | e.g. `REVOLUT_REVOGB21` |
| `institutionName` | varchar(255) | Display name |
| `institutionLogo` | varchar(500) | CDN logo URL |
| `agreementId` | varchar(100) | EUA UUID |
| `status` | varchar(10) | `CR`, `LN`, `EX`, etc. |
| `expiresAt` | timestamp | EUA expiry (90 days from creation) |
| `createdAt` | timestamp | |

### `gocardless_accounts`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `userId` | integer FK → users | |
| `requisitionId` | integer FK → gocardless_requisitions | cascade delete |
| `accountId` | varchar(100) | GoCardless UUID |
| `iban` | varchar(34) | |
| `name` | varchar(255) | Account nickname |
| `ownerName` | varchar(255) | |
| `currency` | varchar(3) | e.g. `NOK`, `EUR` |
| `accountType` | varchar(10) | e.g. `CACC` |
| `balanceAvailable` | numeric(12,2) | `interimAvailable` with fallback chain |
| `balanceCurrent` | numeric(12,2) | `expected` with fallback chain |
| `lastSyncedAt` | timestamp | For cache staleness check |
| `createdAt` | timestamp | |

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/gocardless/institutions` | List available banks by country |
| `POST /api/gocardless/connect` | Creates EUA + requisition, returns redirect URL |
| `GET /api/gocardless/accounts` | Lists user's GoCardless accounts with balances |
| `POST /api/gocardless/sync` | Refreshes balances (respects 6h cache) |
| `DELETE /api/gocardless/[id]` | Removes requisition + cascaded accounts |

## Callback Route

`server/routes/auth/gocardless.get.ts` — handles bank redirect back:
1. Reads `ref` query param
2. Looks up requisition in DB
3. If status `LN` → fetches account details + balances → saves to DB → redirects to `/dashboard/accounts?connected=true`
4. If not `LN` → redirects to `/dashboard/accounts?error=connection_failed`

## Token Management

In-memory cache in `server/utils/gocardless.ts`:
- `ensureToken()` — lazy init, auto-refresh before expiry
- `gcFetch(path, options)` — adds auth header, handles 401 retry
- No DB storage — personal app, single process. On restart, fetches new token.

## Connection Flow

1. User clicks "Connect European Bank" on accounts page
2. Modal opens with country dropdown + searchable institution list (with logos)
3. User picks bank → frontend POSTs to `/api/gocardless/connect` with `institutionId`
4. Server creates EUA (90 days access, up to institution's max history) + requisition → returns `link` URL
5. Frontend redirects user to bank auth page
6. Bank redirects to `/auth/gocardless?ref=xxx`
7. Server callback processes requisition, saves accounts + balances, redirects to accounts page

## Frontend

### Composables

- `useGoCardless()` — institutions, connect, accounts, syncBalances, disconnect
- `useAccounts()` — merges Plaid + GoCardless into unified reactive list with `provider` field

### Components

- `accounts/InstitutionPicker.vue` — country dropdown + searchable bank list with logos
- `accounts/ConnectBankModal.vue` — provider choice (Plaid vs GoCardless) → respective flow
- `accounts/AccountCard.vue` — unified display with provider badge + last synced timestamp

### Modified Pages

- `dashboard/accounts.vue` — uses `useAccounts()`, unified list, "Connect Bank" opens ConnectBankModal
- Dashboard overview — includes GoCardless account balances

## Balance Caching

- Store `interimAvailable` → `expected` → `closingBooked` fallback chain result
- Sync endpoint only calls GoCardless API if `lastSyncedAt` > 6 hours ago
- UI shows "Last synced X hours ago"
- Banks may limit to 4 calls/day — respect rate limit headers

## Implementation Phases

### Phase A: Core client + DB + connect flow
- Env vars in `.env.example`
- `server/utils/gocardless.ts` (token cache + gcFetch + API helpers)
- Drizzle schema + migration
- `POST /api/gocardless/connect`
- `GET /api/gocardless/institutions`
- `server/routes/auth/gocardless.get.ts` (callback)
- `DELETE /api/gocardless/[id]`

### Phase B: Sync + accounts API
- `GET /api/gocardless/accounts`
- `POST /api/gocardless/sync`
- `useGoCardless()` composable

### Phase C: Unified UI
- `useAccounts()` composable
- `InstitutionPicker.vue`
- `ConnectBankModal.vue`
- `AccountCard.vue`
- Update `accounts.vue` page
- Update dashboard overview

## Testing

Use `SANDBOXFINANCE_SFIN0000` institution ID for E2E tests — no real bank credentials needed.

## Research Notes

- GoCardless stopped accepting new accounts July 2025 — existing accounts continue working
- `nordigen-node` SDK deprecated — use raw fetch
- Requisition statuses: CR, GC, UA, RJ, SA, LN, EX
- EUA required before requisition (3-step: EUA → requisition → redirect)
- GoCardless auto-appends `?ref=` to redirect URL — don't add it yourself
- Balance types: `interimAvailable`, `expected`, `closingBooked`, `openingBooked`, `forwardAvailable`
- Transaction fields: `booked` array + `pending` array, amounts as strings with sign
- Rate limit header: `HTTP_X_RATELIMIT_ACCOUNT_SUCCESS_RESET` (unix timestamp)
