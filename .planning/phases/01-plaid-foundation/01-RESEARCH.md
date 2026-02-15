# Phase 1: Plaid Foundation - Research

**Researched:** 2026-02-15
**Domain:** Plaid bank account connectivity, encrypted token storage, Plaid Link client integration
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for bank connectivity: database tables for Plaid items and accounts, a server-side Plaid SDK client, AES-256-GCM encryption for access tokens, the Plaid Link client-side flow, and a connected accounts display in the existing dashboard.

The Plaid integration follows a well-documented pattern: server creates a link token, client loads Plaid Link via CDN script, user authenticates with their bank, client receives a public token, server exchanges it for a persistent access token (encrypted before storage), then fetches account details. The plaid-node SDK v41.x provides full TypeScript types and a straightforward Configuration/PlaidApi pattern that fits the existing server utils architecture.

The Plaid Development environment was deprecated June 2024. Testing should use Sandbox (PlaidEnvironments.sandbox) with test credentials user_good/pass_good. For real bank testing, Limited Production is the free replacement -- it allows real data access with item count caps and restrictions on large OAuth institutions.

**Primary recommendation:** Use `plaid` npm package v41.x with vanilla JS Plaid Link from CDN. Encrypt access tokens with Node.js `node:crypto` AES-256-GCM. Store encryption key in env var. Create link tokens on-demand (never cache). Use Sandbox for all development and testing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `plaid` (plaid-node) | ^41.1.0 | Server-side Plaid API client | Official SDK, auto-generated from OpenAPI spec, TypeScript types included, monthly updates |
| Plaid Link JS (CDN) | v2/stable | Client-side bank connection UI | Official drop-in from `cdn.plaid.com/link/v2/stable/link-initialize.js`. Always latest. No version pinning needed |
| `node:crypto` (built-in) | N/A | AES-256-GCM encryption | Built into Node.js/Bun runtime, no external dependency needed for symmetric encryption |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Drizzle ORM (existing) | ^0.45.1 | Schema definition, migrations, queries | Already in project for all database operations |
| postgres.js (existing) | ^3.4.8 | PostgreSQL driver | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla JS Plaid Link | `@jcss/vue-plaid-link` | Community-maintained, last updated ~7 months ago. Vanilla JS is simple enough to wrap in a 30-line composable |
| `node:crypto` AES-256-GCM | npm `aes-256-gcm` package | Adds a dependency for something Node.js does natively in ~20 lines |

**Installation:**
```bash
bun add plaid
```

No other new dependencies needed. `node:crypto` is built-in. Plaid Link loads from CDN.

## Architecture Patterns

### Recommended Project Structure
```
server/
  utils/
    plaid.ts              # PlaidApi singleton + config
    encryption.ts         # AES-256-GCM encrypt/decrypt utilities
    plaid-accounts.ts     # CRUD for plaid_items and plaid_accounts tables
  api/
    plaid/
      link-token.post.ts  # POST /api/plaid/link-token (create link token)
      exchange.post.ts     # POST /api/plaid/exchange (exchange public token)
      accounts.get.ts      # GET /api/plaid/accounts (list user's linked accounts)
  database/
    schema.ts             # Add plaid_items, plaid_accounts, sync_cursors tables
    migrations/           # New migration for Plaid tables
app/
  composables/
    usePlaidLink.ts       # Composable wrapping CDN Plaid.create()/open()/destroy()
  components/
    plaid/
      ConnectBank.vue     # "Connect Bank" button + Plaid Link trigger
      AccountsList.vue    # List of connected accounts with institution info
  plugins/
    plaid-link.client.ts  # Load Plaid Link CDN script (client-only plugin)
```

### Pattern 1: Plaid Client Singleton
**What:** Single PlaidApi instance configured from env vars, exported from server utils
**When to use:** Every server-side Plaid API call
**Example:**
```typescript
// server/utils/plaid.ts
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
      'Plaid-Version': '2020-09-14',
    },
  },
})

export const plaidClient = new PlaidApi(configuration)
```
Source: [plaid-node GitHub README](https://github.com/plaid/plaid-node)

### Pattern 2: AES-256-GCM Encryption for Access Tokens
**What:** Encrypt before DB write, decrypt on read. Store IV + authTag + ciphertext together.
**When to use:** Every access token storage and retrieval
**Example:**
```typescript
// server/utils/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const KEY = Buffer.from(process.env.PLAID_TOKEN_ENCRYPTION_KEY!, 'hex') // 32 bytes = 64 hex chars

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, KEY, iv)
  let enc = cipher.update(plaintext, 'utf8', 'base64')
  enc += cipher.final('base64')
  const authTag = cipher.getAuthTag()
  // Store as: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${enc}`
}

export function decrypt(stored: string): string {
  const [ivB64, authTagB64, enc] = stored.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const decipher = createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(authTag)
  let dec = decipher.update(enc, 'base64', 'utf8')
  dec += decipher.final('utf8')
  return dec
}
```
Source: [AES-256-GCM Node.js pattern](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81)

### Pattern 3: Link Token Creation (On-Demand)
**What:** Create link tokens only when user clicks "Connect Bank", never pre-generate or cache
**When to use:** The API endpoint that the client calls right before opening Plaid Link
**Example:**
```typescript
// server/api/plaid/link-token.post.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: String(session.user.id) },
    client_name: 'finai',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  })

  return { link_token: response.data.link_token }
})
```
Source: [Plaid Link API docs](https://plaid.com/docs/api/link/)

### Pattern 4: Public Token Exchange + Encrypted Storage
**What:** Exchange public token for access token, encrypt, store with item metadata
**When to use:** After Plaid Link onSuccess callback sends public_token to server
**Example:**
```typescript
// server/api/plaid/exchange.post.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const { public_token, metadata } = await readBody(event)

  // Exchange for persistent access token
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token,
  })
  const { access_token, item_id } = exchangeResponse.data

  // Encrypt before storage
  const encryptedToken = encrypt(access_token)

  // Store plaid_item
  await createPlaidItem({
    userId: session.user.id,
    itemId: item_id,
    encryptedAccessToken: encryptedToken,
    institutionId: metadata.institution?.institution_id ?? null,
    institutionName: metadata.institution?.name ?? null,
  })

  // Fetch and store accounts
  const accountsResponse = await plaidClient.accountsGet({ access_token })
  await storePlaidAccounts(session.user.id, item_id, accountsResponse.data.accounts)

  return { success: true }
})
```

### Pattern 5: Plaid Link Composable (Vanilla JS)
**What:** Vue composable wrapping the CDN-loaded Plaid.create() / open() / destroy()
**When to use:** Client-side, triggered by "Connect Bank" button
**Example:**
```typescript
// app/composables/usePlaidLink.ts
declare global {
  interface Window {
    Plaid: {
      create: (config: PlaidLinkConfig) => PlaidLinkHandler
    }
  }
}

interface PlaidLinkConfig {
  token: string
  onSuccess: (public_token: string, metadata: PlaidLinkMetadata) => void
  onExit: (err: PlaidLinkError | null, metadata: PlaidLinkMetadata) => void
  onEvent?: (eventName: string, metadata: PlaidLinkMetadata) => void
}

interface PlaidLinkHandler {
  open: () => void
  exit: (options?: { force: boolean }) => void
  destroy: () => void
}

export function usePlaidLink() {
  const handler = ref<PlaidLinkHandler | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function openLink() {
    loading.value = true
    error.value = null

    try {
      // Fetch fresh link token on-demand
      const { link_token } = await $fetch('/api/plaid/link-token', { method: 'POST' })

      handler.value = window.Plaid.create({
        token: link_token,
        onSuccess: async (public_token, metadata) => {
          await $fetch('/api/plaid/exchange', {
            method: 'POST',
            body: { public_token, metadata },
          })
          // Refresh accounts list after successful connection
        },
        onExit: (err) => {
          if (err) error.value = err.display_message || 'Connection cancelled'
          loading.value = false
        },
      })

      handler.value.open()
    } catch (e) {
      error.value = 'Failed to initialize bank connection'
      loading.value = false
    }
  }

  onUnmounted(() => {
    handler.value?.destroy()
  })

  return { openLink, loading, error }
}
```

### Pattern 6: Loading Plaid Link CDN Script
**What:** Client-only Nuxt plugin that loads the Plaid Link JS from CDN
**When to use:** App initialization (client-side only)
**Example:**
```typescript
// app/plugins/plaid-link.client.ts
export default defineNuxtPlugin(() => {
  if (typeof window !== 'undefined' && !window.Plaid) {
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.async = true
    document.head.appendChild(script)
  }
})
```
Alternatively, use `useHead()` with a script tag in the composable or component that needs it.

### Anti-Patterns to Avoid
- **Caching link tokens:** Link tokens expire (4 hours max, 30 min for some flows). Always create on-demand.
- **Storing access tokens in plaintext:** Access tokens are long-lived and grant indefinite bank access. Always encrypt.
- **Logging access tokens:** Never log access tokens in error handlers or request middleware. Redact aggressively.
- **Using the deprecated Development environment:** Use Sandbox for testing, Limited Production for real bank testing if needed.
- **Pre-generating link tokens on page load:** User may not click "Connect" for hours. Generate when they click.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bank account linking UI | Custom bank credential forms | Plaid Link (CDN) | Plaid Link handles MFA, institution search, credential management, error states. Building your own is a security and compliance nightmare |
| Plaid API communication | Raw HTTP calls to Plaid | `plaid` npm SDK | SDK handles auth headers, API versioning, TypeScript types, error formatting. Hand-rolling HTTP misses edge cases |
| Symmetric encryption | Custom crypto implementations | `node:crypto` AES-256-GCM | Built-in, audited, handles IV/authTag correctly. Custom crypto is the #1 security antipattern |
| Institution metadata | Scraping or hardcoding bank names/logos | Plaid `institutions/get_by_id` API or Link metadata | Plaid provides institution name in Link metadata.institution. Store it at exchange time |

**Key insight:** Plaid provides the entire bank connection flow end-to-end. Your code is essentially glue: create token, open Link, exchange token, store encrypted, fetch accounts.

## Common Pitfalls

### Pitfall 1: Plaid Development Environment No Longer Exists
**What goes wrong:** Attempting to use `PlaidEnvironments.development` or existing development keys fails because the Development environment was decommissioned June 20, 2024.
**Why it happens:** Older tutorials and the project's own research notes reference "development" keys.
**How to avoid:** Use `PlaidEnvironments.sandbox` for testing. If real bank data is needed, apply for Limited Production access via the Plaid dashboard. Limited Production is free but has item count caps and cannot connect to large OAuth institutions (Chase, Bank of America, Wells Fargo).
**Warning signs:** API calls returning "invalid environment" errors, keys not working.
**Confidence:** HIGH -- [Plaid changelog](https://plaid.com/docs/changelog/), [Frappe forum confirmation](https://discuss.frappe.io/t/plaid-free-development-service-withdrawn-on-20th-june-2024/123481)

### Pitfall 2: Link Token Expiration
**What goes wrong:** Link tokens expire after 4 hours (30 min for some flows). Pre-generating on page load means stale tokens if user waits.
**Why it happens:** Developers create tokens eagerly for faster perceived UX.
**How to avoid:** Create link tokens on-demand when user clicks "Connect Bank". Handle expiration errors by generating a fresh token.
**Warning signs:** Plaid Link showing cryptic errors after the page has been open a while.
**Confidence:** HIGH -- [Plaid Link API docs](https://plaid.com/docs/api/link/)

### Pitfall 3: Plaintext Access Token Storage
**What goes wrong:** Database breach exposes all linked bank accounts. Access tokens are long-lived and grant indefinite access.
**Why it happens:** Plaid quickstart stores tokens in plaintext for simplicity.
**How to avoid:** AES-256-GCM encryption before storage. Encryption key in env var, separate from database.
**Warning signs:** Access token columns containing `access-sandbox-...` or `access-production-...` strings directly.
**Confidence:** HIGH -- [Plaid security docs](https://plaid.com/core-exchange/docs/security/)

### Pitfall 4: Forgetting to Store Institution Metadata at Exchange Time
**What goes wrong:** After token exchange, you need institution name for display. Calling `/institutions/get_by_id` later adds unnecessary API calls.
**Why it happens:** Developers focus on the access token and forget the metadata from Link's onSuccess callback.
**How to avoid:** The Plaid Link `onSuccess` callback receives `metadata` with `metadata.institution.institution_id` and `metadata.institution.name`. Pass this to the exchange endpoint and store it alongside the item.
**Warning signs:** Extra API calls to `/institutions/get_by_id` on every page load.
**Confidence:** HIGH

### Pitfall 5: Not Handling Plaid API Errors Properly
**What goes wrong:** Plaid errors are in `error.response.data` (not `error.message`), with structured fields: `error_type`, `error_code`, `error_message`, `display_message`.
**Why it happens:** Standard try/catch assumes errors are in the usual places.
**How to avoid:** Catch errors and extract `err.response?.data?.display_message` for user-facing messages, log `error_type` + `error_code` for debugging.
**Warning signs:** Generic "Something went wrong" errors instead of actionable Plaid messages.
**Confidence:** HIGH -- [plaid-node README](https://github.com/plaid/plaid-node)

## Code Examples

### Database Schema (Drizzle)
```typescript
// Additions to server/database/schema.ts

export const plaidItems = pgTable('plaid_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 255 }).notNull().unique(),
  encryptedAccessToken: text('encrypted_access_token').notNull(),
  institutionId: varchar('institution_id', { length: 100 }),
  institutionName: varchar('institution_name', { length: 255 }),
  status: varchar('status', { length: 50 }).default('healthy').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('plaid_items_user_id_idx').on(table.userId),
])

export const plaidAccounts = pgTable('plaid_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plaidItemId: integer('plaid_item_id').notNull().references(() => plaidItems.id, { onDelete: 'cascade' }),
  accountId: varchar('account_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  officialName: varchar('official_name', { length: 255 }),
  mask: varchar('mask', { length: 10 }),
  type: varchar('type', { length: 50 }).notNull(),
  subtype: varchar('subtype', { length: 50 }),
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }),
  availableBalance: numeric('available_balance', { precision: 12, scale: 2 }),
  isoCurrencyCode: varchar('iso_currency_code', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('plaid_accounts_user_id_idx').on(table.userId),
  index('plaid_accounts_plaid_item_id_idx').on(table.plaidItemId),
])

export const syncCursors = pgTable('sync_cursors', {
  id: serial('id').primaryKey(),
  plaidItemId: integer('plaid_item_id').notNull().references(() => plaidItems.id, { onDelete: 'cascade' }).unique(),
  cursor: text('cursor'),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
})
```

### Environment Variables
```bash
# Add to .env and .env.example
PLAID_CLIENT_ID=           # From Plaid dashboard > Keys
PLAID_SECRET=              # Sandbox secret from Plaid dashboard
PLAID_ENV=sandbox          # sandbox | production (no more "development")
PLAID_TOKEN_ENCRYPTION_KEY= # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Plaid Error Handling Pattern
```typescript
// server/utils/plaid-errors.ts
import type { PlaidError } from 'plaid'

export function extractPlaidError(error: unknown): { statusCode: number; message: string } {
  if (error && typeof error === 'object' && 'response' in error) {
    const plaidError = (error as { response: { data: PlaidError; status: number } }).response
    return {
      statusCode: plaidError.status || 500,
      message: plaidError.data?.display_message || plaidError.data?.error_message || 'Plaid API error',
    }
  }
  return { statusCode: 500, message: 'An unexpected error occurred' }
}
```

### Sandbox Testing
```
Test credentials for Plaid Sandbox:
- Username: user_good
- Password: pass_good

Sandbox-specific endpoints for testing without UI:
- POST /sandbox/public_token/create — generate test public token without Link UI
- POST /sandbox/item/reset_login — force ITEM_LOGIN_REQUIRED state
- POST /sandbox/item/fire_webhook — trigger webhooks on demand

Plaid Sandbox base URL: sandbox.plaid.com
CDN script URL: https://cdn.plaid.com/link/v2/stable/link-initialize.js
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Development environment for real bank testing | Limited Production (free tier of Production) | June 2024 | Must use Sandbox for dev, Limited Production for real data testing |
| `/transactions/get` with pagination | `/transactions/sync` with cursor-based delta sync | 2022+ | Phase 3 will use sync, but Phase 1 only needs accounts — no transaction sync yet |
| Link without `user.client_user_id` | `user.client_user_id` required (or `/user/create` for newer integrations) | Dec 2025 | Must pass user ID in link token creation |
| Products optional in link token | `products`, `language`, `country_codes` all required | Recent | Must include all three in linkTokenCreate call |

**Deprecated/outdated:**
- `PlaidEnvironments.development` — removed June 2024. Use `sandbox` or `production`.
- `/transactions/get` — still works but deprecated in favor of `/transactions/sync` (relevant for Phase 3, not Phase 1).

## Open Questions

1. **Plaid Limited Production access status**
   - What we know: Development env was deprecated June 2024. Limited Production replaced it.
   - What's unclear: Whether the user's existing Plaid keys have been migrated to Limited Production, or if new keys are needed.
   - Recommendation: Start with Sandbox. Verify key status in Plaid dashboard before attempting real bank connections. This is a blocker noted in the roadmap research.

2. **sync_cursors table: needed in Phase 1?**
   - What we know: sync_cursors is for transaction sync (Phase 3). Including it in Phase 1 schema means no migration needed later.
   - What's unclear: Whether to include it now or defer.
   - Recommendation: Include it in the Phase 1 migration. It is a single small table and avoids a separate migration in Phase 3. The roadmap plan already lists it in Plan 01-01.

3. **Plaid Link CDN script loading strategy**
   - What we know: Script can be loaded via client-only plugin, useHead(), or dynamic script injection in the composable.
   - What's unclear: Best approach for Nuxt 4.
   - Recommendation: Use a client-only Nuxt plugin (`plaid-link.client.ts`) for simplicity. The script is small and only loads on pages that use it if we use lazy loading, but since it is a dashboard-only feature, always-loaded in the client plugin is fine. Alternatively, load it only when the composable is used via a dynamic script injection with a ready check.

## Sources

### Primary (HIGH confidence)
- [plaid-node GitHub README](https://github.com/plaid/plaid-node) — SDK initialization, Configuration/PlaidApi pattern, error handling, TypeScript support, v41.x
- [Plaid Link Web docs](https://plaid.com/docs/link/web/) — CDN URL, Plaid.create() API, onSuccess/onExit callbacks, vanilla JS integration
- [Plaid Items API](https://plaid.com/docs/api/items/) — item/public_token/exchange request/response, item/get fields including institution_id/institution_name
- [Plaid Accounts API](https://plaid.com/docs/api/accounts/) — account fields: account_id, name, mask, type, subtype, balances
- [Plaid Sandbox docs](https://plaid.com/docs/sandbox/) — test credentials (user_good/pass_good), sandbox-only endpoints, testing patterns
- [AES-256-GCM Node.js pattern](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81) — encrypt/decrypt with IV and authTag
- [Plaid Link API](https://plaid.com/docs/api/link/) — linkTokenCreate required params: user, products, country_codes, language

### Secondary (MEDIUM confidence)
- [Plaid Development deprecation (Frappe forum)](https://discuss.frappe.io/t/plaid-free-development-service-withdrawn-on-20th-june-2024/123481) — confirmed June 2024 decommission
- [Plaid Institutions API](https://plaid.com/docs/api/institutions/) — institutions/get_by_id for logo and colors (optional, institution name from Link metadata is sufficient)
- [Plaid Sandbox test credentials](https://plaid.com/docs/sandbox/test-credentials/) — specialized credentials for MFA testing

### Tertiary (LOW confidence)
- None. All findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - plaid-node SDK is well-documented, vanilla JS Link is official, node:crypto is built-in
- Architecture: HIGH - follows existing project patterns (server/utils, server/api, composables), well-established Plaid integration pattern
- Pitfalls: HIGH - all documented in official Plaid docs and confirmed by prior project research
- Database schema: HIGH - follows existing Drizzle patterns in the project, matches Plaid data model

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (Plaid SDK updates monthly but API is stable at 2020-09-14)
