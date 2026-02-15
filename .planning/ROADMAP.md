# Roadmap: finai — Plaid Integration & AI Analytics

## Overview

This milestone transforms finai from a manual transaction tracker into an automated financial control center. The journey starts by establishing Plaid bank connectivity with encrypted token storage, builds through automatic transaction sync and balance display, adds financial visualizations, and culminates with a local AI layer that can analyze spending patterns and answer natural language questions about finances. Plaid and AI are independent tracks that converge when AI processes bank-imported data.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Plaid Foundation** - Connect bank accounts via Plaid Link with encrypted token storage
- [ ] **Phase 2: Account Lifecycle** - Disconnect accounts and re-authenticate degraded connections
- [ ] **Phase 3: Transaction Sync** - Auto-import transactions via webhooks with category mapping
- [ ] **Phase 4: Unified Transaction View** - Merge manual and Plaid transactions in a single interface
- [ ] **Phase 5: Account Balances** - Display per-account balances and net worth
- [ ] **Phase 6: Financial Visualizations** - Balance trend charts and spending breakdowns
- [ ] **Phase 7: AI Analytics Engine** - Local LLM spending pattern analysis with tool-calling
- [ ] **Phase 8: Conversational AI** - Chat interface and recurring transaction detection

## Phase Details

### Phase 1: Plaid Foundation
**Goal**: User can connect real bank accounts to finai and see them listed in the dashboard
**Depends on**: Nothing (first phase)
**Requirements**: ACCT-01, ACCT-02
**Success Criteria** (what must be TRUE):
  1. User can click "Connect Bank" and complete the Plaid Link flow to link a real bank account
  2. Linked bank accounts appear in the dashboard with institution name and account details
  3. Access tokens are encrypted with AES-256-GCM before storage (never plaintext in database)
  4. Link tokens are created on-demand (not cached or pre-generated)
**Plans**: TBD

Plans:
- [ ] 01-01: Database schema and Plaid client setup (plaid_items, plaid_accounts, sync_cursors tables; Plaid SDK singleton; encryption utilities)
- [ ] 01-02: Plaid Link integration (link token API, token exchange API, usePlaidLink composable)
- [ ] 01-03: Connected accounts UI (accounts list in dashboard, Connect Bank flow, institution display)

### Phase 2: Account Lifecycle
**Goal**: User has full control over linked accounts including removal and re-authentication
**Depends on**: Phase 1
**Requirements**: ACCT-03, ACCT-04
**Success Criteria** (what must be TRUE):
  1. User can disconnect a linked bank account and it disappears from the dashboard
  2. When a bank connection degrades (login required), the user sees a clear banner indicating re-auth is needed
  3. User can re-authenticate a degraded connection via Plaid Link update mode without losing existing data
**Plans**: TBD

Plans:
- [ ] 02-01: Account disconnect flow (API endpoint, UI confirmation, cascading cleanup)
- [ ] 02-02: Connection health and re-authentication (item health tracking, degraded state detection, Link update mode, UI banners)

### Phase 3: Transaction Sync
**Goal**: Transactions from linked banks automatically flow into finai via webhooks
**Depends on**: Phase 2
**Requirements**: SYNC-01, SYNC-02, SYNC-03
**Success Criteria** (what must be TRUE):
  1. After linking a bank account, historical transactions appear within minutes (initial sync)
  2. New bank transactions arrive automatically via webhook without manual refresh
  3. Plaid transaction categories are mapped to existing app categories
  4. Webhook payloads are verified via JWT signature before processing (no unverified webhooks)
  5. Cursor-based sync handles pagination correctly including mutation-during-pagination recovery
**Plans**: TBD

Plans:
- [ ] 03-01: Transaction sync pipeline (plaid_transactions table, cursor-based sync with delta application, amount normalization)
- [ ] 03-02: Webhook handler (JWT signature verification, SYNC_UPDATES_AVAILABLE handling, ITEM_LOGIN_REQUIRED forwarding)
- [ ] 03-03: Category mapping (Plaid Personal Finance Categories to app categories, fallback handling)

### Phase 4: Unified Transaction View
**Goal**: Manual and imported transactions appear together in a single, filterable interface
**Depends on**: Phase 3
**Requirements**: SYNC-04
**Success Criteria** (what must be TRUE):
  1. Dashboard transactions page shows both manual and Plaid-imported transactions in one list
  2. User can distinguish between manual and imported transactions (source indicator)
  3. Existing manual transaction CRUD still works unchanged
  4. Filters and sorting apply uniformly across both transaction sources
**Plans**: TBD

Plans:
- [ ] 04-01: Unified query layer (server utility UNIONing manual + plaid_transactions, source field, consistent shape)
- [ ] 04-02: Updated transaction UI (source indicators, unified filters, pagination across both sources)

### Phase 5: Account Balances
**Goal**: User can see current balances for every linked account and total net worth
**Depends on**: Phase 3
**Requirements**: BAL-01, BAL-02
**Success Criteria** (what must be TRUE):
  1. Each linked account displays its current balance (checking, savings, credit card)
  2. Dashboard shows total net worth across all linked accounts
  3. Balances update when transaction sync runs (not stale)
**Plans**: TBD

Plans:
- [ ] 05-01: Balance sync and storage (update plaid_accounts balances during sync, balance refresh API)
- [ ] 05-02: Balance display UI (accounts page with per-account balances, net worth card on dashboard)

### Phase 6: Financial Visualizations
**Goal**: User can see their financial trends and spending patterns through charts
**Depends on**: Phase 5
**Requirements**: BAL-03, BAL-04
**Success Criteria** (what must be TRUE):
  1. Balance trend line chart shows net worth over time (daily/weekly/monthly granularity)
  2. Spending breakdown chart shows category distribution (pie or bar chart)
  3. Charts include data from both manual and Plaid-imported transactions
  4. User can select time ranges for chart data
**Plans**: TBD

Plans:
- [ ] 06-01: Historical data infrastructure (balance snapshots table or time-series storage, aggregation queries)
- [ ] 06-02: Trend charts (balance over time line chart, income vs expenses comparison)
- [ ] 06-03: Spending breakdown (category spending pie/bar chart, account-level breakdown, time range selector)

### Phase 7: AI Analytics Engine
**Goal**: User gets AI-powered spending insights backed by real financial data computed by application code
**Depends on**: Phase 4 (needs unified transaction data to analyze)
**Requirements**: AI-01
**Success Criteria** (what must be TRUE):
  1. Dashboard shows an AI Insights card with spending pattern analysis (trends, anomalies)
  2. All financial numbers in AI responses are computed by application code, not the LLM
  3. AI gracefully degrades when Ollama is unavailable (shows "AI unavailable" instead of breaking)
  4. Month-over-month spending comparisons are surfaced in AI insights
**Plans**: TBD

Plans:
- [ ] 07-01: Ollama integration layer (client wrapper, health check, connection management, graceful degradation)
- [ ] 07-02: Financial context assembly (aggregation queries, context builder, data summarization for LLM consumption)
- [ ] 07-03: Tool-calling architecture (tool definitions for financial queries, LLM interprets + app computes pattern, system prompts)
- [ ] 07-04: AI Insights UI (dashboard widget, spending analysis display, loading/error states)

### Phase 8: Conversational AI
**Goal**: User can ask natural language questions about their finances and get accurate, data-backed answers
**Depends on**: Phase 7
**Requirements**: AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. User can open a chat interface and ask financial questions in plain English
  2. Chat responses stream in real-time (SSE) with visible token rendering
  3. Conversation history persists across sessions (user can review past chats)
  4. AI correctly identifies recurring transactions (subscriptions, repeating charges)
  5. Chat answers reference real transaction data (not hallucinated numbers)
**Plans**: TBD

Plans:
- [ ] 08-01: Chat backend (chat_conversations and chat_messages tables, conversation CRUD API, SSE streaming endpoint)
- [ ] 08-02: Chat UI (conversation interface component, message history, streaming token display, conversation management)
- [ ] 08-03: Recurring transaction detection (Plaid recurring API integration or pattern detection, subscription identification, surfacing in chat and dashboard)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

**Dependency note:** Phases 5 and 4 both depend on Phase 3 but not on each other. They could execute in parallel. Phase 7 depends on Phase 4 (unified transaction data). Phase 6 depends on Phase 5 (balance data).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Plaid Foundation | 0/3 | Not started | - |
| 2. Account Lifecycle | 0/2 | Not started | - |
| 3. Transaction Sync | 0/3 | Not started | - |
| 4. Unified Transaction View | 0/2 | Not started | - |
| 5. Account Balances | 0/2 | Not started | - |
| 6. Financial Visualizations | 0/3 | Not started | - |
| 7. AI Analytics Engine | 0/4 | Not started | - |
| 8. Conversational AI | 0/3 | Not started | - |
