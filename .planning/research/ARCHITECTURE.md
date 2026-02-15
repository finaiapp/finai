# Architecture Patterns

**Domain:** Personal financial dashboard with Plaid banking integration + local AI analytics
**Researched:** 2026-02-15
**Confidence:** HIGH (Plaid patterns well-documented, Ollama API stable, existing codebase understood)

## Recommended Architecture

The system extends the existing Nuxt 4 monolith with three new subsystems: Plaid integration layer, transaction sync pipeline, and AI analytics engine. All three live within the existing Nitro server -- no separate microservices needed for a single-user app.

```
+-------------------+     +---------------------+     +------------------+
|   Browser/Client  |     |    Plaid Servers     |     |  Ollama (local)  |
|                   |     |                      |     |  localhost:11434 |
|  - Plaid Link UI  |     |  - Link sessions     |     |                  |
|  - Chat UI        |     |  - Bank data         |     |  - Chat API      |
|  - Dashboard      |     |  - Webhooks out      |     |  - Streaming     |
+--------+----------+     +----------+-----------+     +--------+---------+
         |                           |                          |
         |  HTTP/WebSocket           |  HTTPS                   |  HTTP
         |                           |                          |
+--------v---------------------------v--------------------------v---------+
|                        Nitro Server (existing)                          |
|                                                                         |
|  +------------------+  +-------------------+  +----------------------+  |
|  | Plaid Service    |  | Sync Pipeline     |  | AI Analytics Engine  |  |
|  |                  |  |                   |  |                      |  |
|  | - Link tokens    |  | - Cursor mgmt     |  | - System prompts     |  |
|  | - Token exchange |  | - Delta apply     |  | - Context assembly   |  |
|  | - API wrapper    |  | - Category map    |  | - Ollama client      |  |
|  | - Webhook handler|  | - Balance update  |  | - Response streaming |  |
|  +--------+---------+  +--------+----------+  +----------+-----------+  |
|           |                      |                        |             |
|           +----------------------+------------------------+             |
|                                  |                                      |
|                    +-------------v--------------+                       |
|                    |   PostgreSQL (existing)     |                       |
|                    |                             |                       |
|                    |  users, categories,         |                       |
|                    |  transactions (existing)    |                       |
|                    |  + plaid_items (new)        |                       |
|                    |  + plaid_accounts (new)     |                       |
|                    |  + plaid_transactions (new) |                       |
|                    |  + sync_cursors (new)       |                       |
|                    |  + chat_conversations (new) |                       |
|                    +-----------------------------+                       |
+---------+---------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Plaid Link (client)** | Bank account connection UI flow | Plaid servers directly (iframe), Nitro for link tokens |
| **Plaid Service (server)** | Link token creation, public-to-access token exchange, Plaid API calls | Plaid API, PostgreSQL for token storage |
| **Sync Pipeline (server)** | Cursor-based transaction sync, delta application, category mapping | Plaid API (/transactions/sync), PostgreSQL |
| **Webhook Handler (server)** | Receives and verifies Plaid webhooks, triggers sync | Plaid (inbound), Sync Pipeline |
| **AI Analytics Engine (server)** | Assembles financial context, queries Ollama, streams responses | Ollama API, PostgreSQL for transaction data |
| **Chat UI (client)** | Conversational interface for financial questions | Nitro server (SSE/streaming endpoint) |
| **Dashboard (client, existing)** | Displays balances, transactions, insights | Nitro API endpoints |

### Data Flow

#### Flow 1: Bank Account Linking (one-time per institution)

```
1. Client requests link token    → POST /api/plaid/link-token
2. Server calls Plaid            → POST plaid.linkTokenCreate()
3. Server returns link_token     → Client
4. Client opens Plaid Link UI    → Plaid iframe (user logs into bank)
5. Plaid returns public_token    → Client onSuccess callback
6. Client sends public_token     → POST /api/plaid/exchange-token
7. Server exchanges with Plaid   → POST plaid.itemPublicTokenExchange()
8. Server stores access_token    → PostgreSQL plaid_items (encrypted)
9. Server triggers initial sync  → Sync Pipeline
```

#### Flow 2: Transaction Sync (webhook-driven)

```
1. Plaid detects new data        → Fires SYNC_UPDATES_AVAILABLE webhook
2. Webhook hits server           → POST /api/plaid/webhook
3. Server verifies JWT signature → jose library (ES256 + SHA-256 body check)
4. Server loads sync cursor      → PostgreSQL sync_cursors table
5. Server calls /transactions/sync with cursor
6. Plaid returns {added, modified, removed, next_cursor, has_more}
7. Loop while has_more === true  → Keep calling with new cursors
8. Apply deltas to database:
   - added    → INSERT into plaid_transactions
   - modified → UPDATE plaid_transactions
   - removed  → DELETE from plaid_transactions
9. Map Plaid PFC categories      → Link to existing categories table
10. Update sync cursor           → PostgreSQL sync_cursors
11. Update account balances      → PostgreSQL plaid_accounts
```

#### Flow 3: AI Chat Analytics (on-demand)

```
1. User asks question            → POST /api/ai/chat (or SSE stream)
2. Server loads conversation     → PostgreSQL chat_conversations
3. Server assembles context:
   - Recent transactions (30-90 days)
   - Category spending summaries
   - Account balances
   - Monthly trends
4. Server builds prompt:
   - System prompt (financial analyst persona + output rules)
   - Context block (structured financial data as JSON)
   - Conversation history
   - User's question
5. Server calls Ollama           → POST http://localhost:11434/api/chat
   - stream: true
   - format: json (for structured insights)
   - model: configurable (e.g., llama3.2, mistral)
6. Server streams response       → SSE to client
7. Save conversation turn        → PostgreSQL chat_conversations
```

## New Database Tables

### plaid_items
Stores Plaid Item (institution connection) credentials. One per linked bank.

```typescript
export const plaidItems = pgTable('plaid_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 255 }).notNull().unique(),   // Plaid's item_id
  accessToken: text('access_token').notNull(),                       // Encrypted at app level
  institutionId: varchar('institution_id', { length: 100 }),
  institutionName: varchar('institution_name', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, error, revoked
  consentExpiresAt: timestamp('consent_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
})
```

**Encryption note:** The `access_token` never expires and grants full account access. For a single-user local app, encrypt with AES-256-GCM using a key from environment variables. Use Node.js `crypto.createCipheriv` / `crypto.createDecipheriv`. This is application-level encryption -- PostgreSQL stores ciphertext only.

### plaid_accounts
Stores bank account metadata and current balances.

```typescript
export const plaidAccounts = pgTable('plaid_accounts', {
  id: serial('id').primaryKey(),
  plaidItemId: integer('plaid_item_id').notNull().references(() => plaidItems.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: varchar('account_id', { length: 255 }).notNull().unique(), // Plaid's account_id
  name: varchar('name', { length: 255 }).notNull(),
  officialName: varchar('official_name', { length: 255 }),
  type: varchar('type', { length: 50 }).notNull(),         // depository, credit, loan, investment
  subtype: varchar('subtype', { length: 50 }),              // checking, savings, credit card, etc.
  mask: varchar('mask', { length: 10 }),                    // Last 4 digits
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }),
  availableBalance: numeric('available_balance', { precision: 12, scale: 2 }),
  isoCurrencyCode: varchar('iso_currency_code', { length: 3 }).default('USD'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
})
```

### plaid_transactions
Stores bank transactions from Plaid, separate from manual transactions.

```typescript
export const plaidTransactions = pgTable('plaid_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => plaidAccounts.id, { onDelete: 'cascade' }),
  plaidTransactionId: varchar('plaid_transaction_id', { length: 255 }).notNull().unique(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),           // Plaid's merchant/description
  merchantName: varchar('merchant_name', { length: 255 }),
  pending: boolean('pending').default(false).notNull(),
  plaidCategory: varchar('plaid_category', { length: 255 }),   // Plaid's primary PFC
  plaidDetailedCategory: varchar('plaid_detailed_category', { length: 255 }), // Plaid's detailed PFC
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('plaid_tx_user_date_idx').on(table.userId, table.date),
  index('plaid_tx_account_idx').on(table.accountId),
])
```

### sync_cursors
Tracks the last sync position per Plaid Item.

```typescript
export const syncCursors = pgTable('sync_cursors', {
  id: serial('id').primaryKey(),
  plaidItemId: integer('plaid_item_id').notNull().references(() => plaidItems.id, { onDelete: 'cascade' }).unique(),
  cursor: text('cursor').notNull().default(''),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
})
```

### chat_conversations
Stores AI chat history for context continuity.

```typescript
export const chatConversations = pgTable('chat_conversations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
})

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => chatConversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),  // user, assistant, system
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('chat_msg_conversation_idx').on(table.conversationId),
])
```

## Design Decision: Separate vs. Merged Transaction Tables

**Decision: Keep plaid_transactions separate from manual transactions.**

Rationale:
- Plaid transactions have Plaid-specific fields (plaid_transaction_id, pending, merchantName, plaidCategory) that don't apply to manual entries
- Plaid owns the lifecycle of its transactions (added/modified/removed via sync) -- merging would create ownership conflicts
- Manual transactions are user-created and user-owned with different edit semantics
- The dashboard and AI analytics can query both tables via a UNION view or composable that merges them

For unified display, create a server utility that combines both:

```typescript
// server/utils/all-transactions.ts
// Returns a unified view: { source: 'manual' | 'plaid', ...common fields }
// Used by dashboard summary and AI context assembly
```

## Patterns to Follow

### Pattern 1: Plaid Client Singleton
**What:** Single PlaidApi instance configured once, reused across all server utils.
**When:** Every Plaid API call.
**Example:**
```typescript
// server/utils/plaid.ts
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
})

export const plaidClient = new PlaidApi(config)
```

### Pattern 2: Cursor-Based Sync with Idempotency
**What:** Always use `plaid_transaction_id` as the deduplication key. Handle `has_more` pagination. Preserve old cursor until full sync completes.
**When:** Every transaction sync (webhook-triggered or manual).
**Example:**
```typescript
// server/utils/plaid-sync.ts
async function syncTransactions(plaidItemId: number) {
  const item = await getPlaidItem(plaidItemId)
  const cursorRecord = await getSyncCursor(plaidItemId)
  let cursor = cursorRecord?.cursor || ''
  let hasMore = true

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: decrypt(item.accessToken),
      cursor,
    })
    // Apply added/modified/removed deltas
    await applyTransactionDeltas(item.userId, response.data)
    cursor = response.data.next_cursor
    hasMore = response.data.has_more
  }

  await updateSyncCursor(plaidItemId, cursor)
}
```

### Pattern 3: AI Context Window Management
**What:** Assemble financial context as structured JSON, keep within model's context window, prioritize recency.
**When:** Every AI chat request.
**Example:**
```typescript
// server/utils/ai-context.ts
async function buildFinancialContext(userId: number): Promise<string> {
  const [balances, recentTx, categorySpending, monthlyTrend] = await Promise.all([
    getAccountBalances(userId),
    getRecentTransactions(userId, 90),  // last 90 days
    getCategorySpending(userId, 30),     // last 30 days by category
    getMonthlyTrend(userId, 6),          // last 6 months
  ])

  return JSON.stringify({
    accounts: balances,
    recentTransactions: recentTx.slice(0, 100), // cap to avoid context overflow
    spendingByCategory: categorySpending,
    monthlyTrend,
    asOf: new Date().toISOString(),
  })
}
```

### Pattern 4: SSE Streaming for AI Responses
**What:** Use Server-Sent Events to stream Ollama responses to the client in real-time.
**When:** AI chat responses (avoids waiting for full generation).
**Example:**
```typescript
// server/api/ai/chat.post.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)

  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const context = await buildFinancialContext(session.user.id)
  const response = await ollama.chat({
    model: 'llama3.2',
    stream: true,
    messages: [
      { role: 'system', content: FINANCIAL_ANALYST_PROMPT },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${body.message}` },
    ],
  })

  for await (const chunk of response) {
    event.node.res.write(`data: ${JSON.stringify({ content: chunk.message.content })}\n\n`)
  }
  event.node.res.end()
})
```

### Pattern 5: Webhook Verification
**What:** Verify Plaid webhook JWT signatures before processing.
**When:** Every incoming webhook.
**Example:**
```typescript
// server/api/plaid/webhook.post.ts
// 1. Extract Plaid-Verification header (JWT)
// 2. Decode JWT header, verify alg === 'ES256'
// 3. Fetch Plaid's JWK from /webhook_verification_key/get
// 4. Verify JWT signature with JWK
// 5. Compute SHA-256 of raw body, compare to request_body_sha256 in JWT
// 6. Use crypto.timingSafeEqual for comparison (prevent timing attacks)
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Access Tokens in Plaintext
**What:** Writing Plaid access_token directly to the database unencrypted.
**Why bad:** Access tokens never expire and grant full account access. A database leak exposes all linked financial data.
**Instead:** Encrypt with AES-256-GCM at the application level before storage. Decrypt only when making API calls.

### Anti-Pattern 2: Polling Plaid on a Schedule
**What:** Setting up a cron job to call /transactions/sync every N minutes.
**Why bad:** Wastes API calls, introduces unnecessary latency, and Plaid rate-limits you.
**Instead:** Use webhooks as the primary trigger. Only poll as a fallback (e.g., if webhook delivery fails, sync on user dashboard visit if stale > 1 hour).

### Anti-Pattern 3: Merging Plaid Data into Existing Transaction Table
**What:** Inserting Plaid transactions directly into the existing `transactions` table.
**Why bad:** Creates ownership conflicts (who can edit/delete?), loses Plaid metadata, breaks the sync delta model (Plaid expects to manage its own transaction lifecycle).
**Instead:** Separate `plaid_transactions` table with a unified query layer on top.

### Anti-Pattern 4: Sending All Transactions to the LLM
**What:** Dumping every transaction into the AI prompt without filtering or summarizing.
**Why bad:** Exceeds context window, increases latency, wastes compute, produces worse results (noise drowns signal).
**Instead:** Pre-aggregate data (category summaries, trends) and send structured context. Cap raw transactions at ~100 most recent.

### Anti-Pattern 5: Synchronous Webhook Processing
**What:** Doing the full transaction sync inside the webhook handler before responding.
**Why bad:** Plaid expects a quick 2xx response. Long processing causes webhook retries and duplicates.
**Instead:** Acknowledge the webhook immediately (return 200), then process sync asynchronously. For Nitro, use `$fetch` to an internal endpoint or process after response with `event.waitUntil()` if available, otherwise a simple queue approach.

## Server Directory Structure (New Files)

```
server/
  api/
    plaid/
      link-token.post.ts       # Create Plaid Link token
      exchange-token.post.ts   # Exchange public_token for access_token
      webhook.post.ts          # Receive Plaid webhooks
      accounts.get.ts          # List linked accounts + balances
      items/
        index.get.ts           # List linked institutions
        [id].delete.ts         # Unlink an institution
    ai/
      chat.post.ts             # AI chat (SSE streaming)
      conversations/
        index.get.ts           # List conversations
        [id].get.ts            # Get conversation messages
        [id].delete.ts         # Delete conversation
  utils/
    plaid.ts                   # PlaidApi client singleton
    plaid-sync.ts              # Transaction sync logic
    plaid-webhook.ts           # Webhook verification
    plaid-encryption.ts        # Access token encrypt/decrypt
    ai-context.ts              # Financial context assembly
    ai-prompts.ts              # System prompts for different query types
    ollama.ts                  # Ollama client wrapper
```

## Suggested Build Order

Based on component dependencies:

```
Phase 1: Plaid Foundation
  - plaid_items + plaid_accounts + sync_cursors schema
  - Plaid client singleton (server/utils/plaid.ts)
  - Access token encryption utility
  - Link token + token exchange endpoints
  - Plaid Link UI in dashboard
  Dependencies: None (extends existing schema)

Phase 2: Transaction Sync
  - plaid_transactions schema
  - Sync pipeline (cursor management, delta application)
  - Plaid category -> app category mapping
  - Webhook handler with JWT verification
  - Unified transaction query layer
  Dependencies: Phase 1 (needs plaid_items and access_tokens)

Phase 3: Balance & Account Display
  - Balance sync (called after transaction sync)
  - Accounts dashboard page
  - Enhanced dashboard with real balances
  - Net worth calculation
  Dependencies: Phase 1 + 2 (needs accounts + transactions)

Phase 4: AI Analytics Foundation
  - Ollama client setup + health check
  - chat_conversations + chat_messages schema
  - Financial context assembly utility
  - System prompts for financial analysis
  - Chat API endpoint with SSE streaming
  Dependencies: Phase 2 (needs transaction data for context)

Phase 5: AI Chat UI + Insights
  - Chat interface component (streaming display)
  - Conversation management (list, continue, delete)
  - Pre-built insight queries (spending analysis, budget suggestions, anomaly detection)
  - Dashboard insight cards powered by AI
  Dependencies: Phase 4 (needs AI backend working)
```

**Build order rationale:**
- Plaid Link must come first because everything else depends on having bank connections
- Transaction sync before AI because the AI needs data to analyze
- Balances can parallel with or follow transaction sync but displaying them is simpler
- AI is last because it's the consumer of all other data, not a producer

## Scalability Considerations

| Concern | Current (1 user) | If Expanded (10+ users) |
|---------|-------------------|-------------------------|
| Plaid API calls | Well within free tier | Need production keys, rate limit awareness |
| Access token storage | App-level AES-256-GCM | Consider dedicated secrets manager |
| Transaction volume | Hundreds/month, trivial | Index optimization, pagination |
| Webhook processing | Synchronous OK for 1 user | Need job queue (BullMQ or similar) |
| Ollama | Single model loaded | Need request queuing, model management |
| Chat context | Direct DB queries | Pre-computed aggregation tables |

## Sources

- [Plaid API Documentation](https://plaid.com/docs/api/) - HIGH confidence
- [Plaid Transactions Introduction](https://plaid.com/docs/transactions/) - HIGH confidence
- [Plaid Transaction Webhooks](https://plaid.com/docs/transactions/webhooks/) - HIGH confidence
- [Plaid Link API](https://plaid.com/docs/api/link/) - HIGH confidence
- [Plaid Webhook Verification](https://plaid.com/docs/api/webhooks/webhook-verification/) - HIGH confidence
- [Plaid Node SDK](https://github.com/plaid/plaid-node) - HIGH confidence
- [Plaid PFC Migration Guide](https://plaid.com/docs/transactions/pfc-migration/) - HIGH confidence
- [Ollama JavaScript Library](https://github.com/ollama/ollama-js) - HIGH confidence
- [Ollama Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs) - HIGH confidence
- [Ollama API Introduction](https://docs.ollama.com/api/introduction) - HIGH confidence
