# Project Research Summary

**Project:** finai - Plaid Banking Integration + Local AI Financial Analytics
**Domain:** Personal financial dashboard
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

finai is a personal financial dashboard that will integrate Plaid's banking API for automatic transaction sync alongside a local Ollama-powered AI layer for privacy-preserving financial analytics. The research reveals a well-trodden path for Plaid integration with clear documentation and established patterns, paired with an emerging but viable approach for local LLM financial analysis. The core architectural insight is that these two feature tracks are independent and can be built in parallel until they converge when AI processes Plaid-imported data.

The recommended stack centers on `plaid` (official Node SDK) for server-side banking integration, Plaid Link (vanilla JS CDN) for client-side account connection, and Vercel AI SDK v6 + `ai-sdk-ollama` for local LLM orchestration. The existing PostgreSQL + Drizzle ORM stack handles all new data storage needs through five new tables: `plaid_items`, `plaid_accounts`, `plaid_transactions`, `sync_cursors`, and `chat_conversations/messages`. No new database technology is required. The Nuxt 4 monolith architecture extends cleanly with three new server-side subsystems: Plaid service layer, transaction sync pipeline, and AI analytics engine.

The critical risks center on security (access token encryption, webhook verification) and AI reliability (LLMs cannot do arithmetic, context window management, graceful degradation). Mitigation requires encryption-first access token storage, JWT webhook verification from day one, a tool-calling pattern where LLMs interpret queries but application code computes all financial numbers, and aggressive timeouts plus fallback UX when Ollama is unavailable. The research surfaces a major environment clarification: Plaid's "Development" environment no longer exists as of June 2024, so the existing "development keys" likely target Limited Production (free but capped) rather than Sandbox. This needs verification before implementation begins.

## Key Findings

### Recommended Stack

The stack leverages battle-tested Plaid SDKs paired with modern local LLM tooling. Plaid integration is straightforward with the official `plaid-node` SDK (v41.1.0), which is auto-generated from OpenAPI specs and updated monthly. For client-side bank connection, Plaid Link's vanilla JavaScript API (loaded from CDN) integrates cleanly into a Vue composable without third-party wrappers. The AI layer uses Vercel AI SDK v6 (`ai` + `@ai-sdk/vue` v3) with the `ai-sdk-ollama` provider (v3), which offers superior tool-calling support compared to direct Ollama client usage.

**Core technologies:**
- **`plaid` (plaid-node) v41.1.0**: Official server-side SDK with TypeScript types, monthly updates, no viable alternatives
- **Plaid Link v2/stable (CDN)**: Drop-in bank auth UI, wrap in custom Vue composable rather than using outdated community packages
- **`ai` (Vercel AI SDK) v6 + `@ai-sdk/vue` v3**: Framework-agnostic LLM abstraction with first-class Nuxt support, enables provider swapping
- **`ai-sdk-ollama` v3**: Ollama provider with tool calling and structured output support, requires AI SDK v6
- **Ollama (system install)**: Local LLM inference server on localhost:11434, industry standard for privacy-preserving ML
- **PostgreSQL + Drizzle ORM (existing)**: Handles all new tables, no new database tech needed
- **Zod (add)**: Required by AI SDK for structured output validation

**Version compatibility critical:** AI SDK v6 requires `@ai-sdk/vue` v3 and `ai-sdk-ollama` v3. Mixing v5/v6 SDK versions causes breakage.

**Ollama model recommendation:** Start with `mistral` (7B) for best efficiency/quality on consumer hardware. Upgrade to `llama3.1:8b` if stronger reasoning needed. Avoid finance-specific fine-tunes until proven necessary.

### Expected Features

Research identified three tiers of features based on user expectations and competitive analysis.

**Must have (table stakes):**
- Plaid Link account connection (core value prop)
- Account listing with real-time balances
- Automatic transaction import via `/transactions/sync` with cursor-based pagination
- Transaction categorization mapping (Plaid Personal Finance Categories to app categories)
- Merge manual + imported transactions (add `source` field to transactions, preserve existing manual entries)
- Account disconnect/reconnect (handle `ITEM_LOGIN_REQUIRED` webhook)
- Basic spending breakdown visualization (category-level pie/bar charts)
- Monthly income vs expenses trend

**Should have (competitive differentiators):**
- AI spending analysis with natural language queries ("How much did I spend on food in January?")
- AI proactive alerts (LLM surfaces insights without being asked)
- AI transaction re-categorization (for Plaid LOW confidence transactions)
- Recurring transaction detection (Plaid offers `/transactions/recurring/get`)
- Spending forecasting (statistical projection of end-of-month totals)
- Net worth tracking over time (requires balance history storage)

**Defer (v2+ scope, explicit anti-features):**
- **ACH transfers/bill pay**: Requires production approval, compliance burden, per-payment fees. Not aligned with visibility-focused personal dashboard.
- **Investment portfolio management**: Different domain (Plaid Investments API), major scope expansion.
- **Cloud AI integration**: Defeats privacy advantage, users of local-first tools explicitly want to avoid this.
- **Multi-user/household sharing**: Single-user architecture, sharing is separate project scope.
- **YNAB-style budgeting rules**: Over-engineered for personal use, defer to simple category budget targets.
- **Receipt OCR**: Plaid provides merchant data, manual notes field exists, no camera integration needed.

**Feature dependency insight:** Plaid features and AI features are independent tracks that can be built in parallel. AI needs transaction data to analyze, but Plaid sync does not need AI. They converge when AI processes Plaid-imported data.

### Architecture Approach

The system extends the existing Nuxt 4 monolith with three new server-side subsystems, avoiding microservice complexity for a single-user app. All three live within Nitro's server directory: Plaid integration layer (link tokens, token exchange, API wrapper, webhook handler), transaction sync pipeline (cursor management, delta application, category mapping, balance updates), and AI analytics engine (context assembly, Ollama client, response streaming).

**Major components:**
1. **Plaid Service (server)**: Manages link token creation, public-to-access token exchange, and all Plaid API calls. Stores encrypted access tokens in `plaid_items` table. Communicates with Plaid servers and PostgreSQL.
2. **Sync Pipeline (server)**: Implements cursor-based transaction sync with `/transactions/sync`, applies `added/modified/removed` deltas to `plaid_transactions` table, maps Plaid categories to app categories, updates account balances. Triggered by webhooks or manual refresh.
3. **Webhook Handler (server)**: Receives and verifies Plaid webhooks via JWT signature validation, triggers sync pipeline for `SYNC_UPDATES_AVAILABLE`, handles item error states. Must verify before processing.
4. **AI Analytics Engine (server)**: Assembles financial context (balances, transactions, trends) from PostgreSQL, builds structured prompts for Ollama, streams responses via SSE. Uses tool-calling pattern where LLM interprets queries but application code computes all numbers.
5. **Plaid Link (client)**: Vanilla JS wrapper composable for bank connection UI flow, creates link tokens on-demand, exchanges public tokens server-side.
6. **Chat UI (client)**: Conversational interface consuming SSE stream from AI analytics endpoint.

**Data flow highlights:**
- Bank linking: Client requests link token → Plaid Link iframe → public token exchanged server-side → encrypted access token stored → initial sync triggered
- Transaction sync: Webhook fires → JWT verification → cursor-based pagination loop → apply deltas (INSERT added, UPDATE modified, DELETE removed) → update cursor and balances
- AI chat: User question → load conversation history → assemble context (recent transactions, summaries, trends) → prompt Ollama with context → stream response → save conversation

**Design decision:** Keep `plaid_transactions` separate from manual `transactions` table. Plaid owns its transaction lifecycle (added/modified/removed sync), manual transactions are user-owned with different edit semantics. Create a server utility that UNIONs both for unified display in dashboard and AI context.

**New database tables:** Five new tables extend existing schema. `plaid_items` stores encrypted access tokens and institution metadata (one per linked bank). `plaid_accounts` stores account metadata and current balances. `plaid_transactions` stores synced bank transactions with Plaid-specific fields (pending status, merchant name, Plaid categories). `sync_cursors` tracks last sync position per item. `chat_conversations` and `chat_messages` store AI conversation history for context continuity.

### Critical Pitfalls

Research surfaced five critical pitfalls that cause security breaches, data loss, or full rewrites if not addressed from day one.

1. **Storing Plaid access tokens in plaintext**: Access tokens never expire and grant indefinite bank access. Database breach exposes all linked accounts. **Prevention:** Encrypt with AES-256-GCM before storing, never log tokens, store encryption key in environment variables separate from database. **Phase impact:** Must be implemented in first Plaid integration phase before any token is persisted.

2. **LLM performing financial calculations directly**: LLMs are structurally incapable of reliable arithmetic due to tokenization and non-deterministic inference. Hallucinated numbers lead to terrible financial decisions. **Prevention:** Never let LLM compute numbers. Use tool-calling pattern: LLM interprets query → generates structured query → application code computes → LLM formats results. Pre-compute all aggregations in SQL. **Phase impact:** Foundational architecture decision for AI phase, entire prompt engineering depends on this.

3. **Not handling ITEM_LOGIN_REQUIRED**: Bank connections break regularly (password changes, MFA, API updates). Without reconnection flow, app silently shows stale data. **Prevention:** Implement Link update mode from start, store item health status, show UI banners for re-auth needed, handle login-required webhooks, track last sync timestamp. **Phase impact:** Part of initial Plaid Link integration, not a retrofit.

4. **Unverified webhooks enabling data injection**: Without JWT verification, attackers can send fake webhook payloads triggering arbitrary sync cycles or state manipulation. **Prevention:** Verify every webhook using ES256 signature + SHA-256 body hash, use constant-time comparison, reject non-ES256 algorithms. **Phase impact:** Must be implemented when webhooks are first set up (transaction sync phase).

5. **Transaction sync cursor mismanagement**: If mutation occurs mid-pagination, you get `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` error and must restart from original cursor. Only storing latest cursor loses restart point and forces full re-sync. **Prevention:** Store both current sync cursor (loop start) and latest page cursor, only update persisted cursor after full loop completes, restart from preserved original on mutation error. **Phase impact:** Transaction sync implementation phase.

**Additional moderate pitfalls:** Development environment using real banks (verify environment setup, use Sandbox for tests), LLM context window overflow (pre-aggregate data, cap transactions at ~100), no graceful degradation when Ollama is down (aggressive timeouts, show "AI unavailable" gracefully), Plaid Link token expiration (create on-demand, not on page load), amount format mismatch (Plaid debits are positive, normalize on ingestion), pending transaction handling (use `removed` array to prevent duplicates).

## Implications for Roadmap

Based on research, suggested 5-phase structure with independent Plaid and AI tracks converging in later phases.

### Phase 1: Plaid Foundation
**Rationale:** Plaid Link is the gateway to all Plaid value. Must establish account connection before any data sync. Access token security must be correct from day one (critical pitfall #1).

**Delivers:** Users can connect bank accounts, see linked institutions, disconnect accounts when needed.

**Addresses (from FEATURES.md):**
- Plaid Link account connection (table stakes)
- Account disconnect/reconnect flow (table stakes)

**Avoids (from PITFALLS.md):**
- Plaintext access token storage (critical #1) — encryption mandatory
- Link token expiration (#10) — create on-demand
- No update mode (#3 partial) — build update mode alongside initial connection

**Includes:**
- Database schema: `plaid_items`, `plaid_accounts`, `sync_cursors` tables
- Server utils: Plaid client singleton, access token encryption/decryption
- API endpoints: `/api/plaid/link-token` (POST), `/api/plaid/exchange-token` (POST)
- Client composable: `usePlaidLink()` wrapping vanilla JS Link API
- Dashboard UI: "Connect Bank" button, linked institutions list, disconnect flow

**Research flag:** SKIP — Plaid Link patterns are well-documented (HIGH confidence from official docs).

### Phase 2: Transaction Sync Pipeline
**Rationale:** With accounts connected, transaction sync delivers the killer feature (automatic import). Webhook-driven architecture prevents API waste. Cursor management and webhook verification are critical for data integrity and security.

**Delivers:** Automatic transaction import from connected banks, category mapping to existing app categories, unified view of manual + imported transactions.

**Addresses (from FEATURES.md):**
- Automatic transaction import (table stakes)
- Transaction categorization from Plaid (table stakes)
- Merge manual + imported transactions (table stakes)

**Avoids (from PITFALLS.md):**
- Unverified webhooks (critical #5) — JWT verification mandatory
- Cursor mismanagement (critical #6) — preserve original cursor during pagination
- Pending transaction duplicates (#12) — handle `removed` array
- Amount sign inversion (#11) — normalize Plaid amounts on ingestion
- Polling Plaid on schedule (anti-pattern #2) — webhook-driven primary, fallback on dashboard visit

**Includes:**
- Database schema: `plaid_transactions` table
- Server utils: `plaid-sync.ts` (cursor-based sync with delta application), `plaid-webhook.ts` (JWT verification), category mapping logic
- API endpoints: `/api/plaid/webhook` (POST with verification), `/api/transactions` (GET unified manual + Plaid)
- Webhook handler: Verify signature, trigger async sync, respond 200 immediately
- Unified transaction query: Server utility UNIONing manual + plaid_transactions

**Research flag:** NEEDS RESEARCH — Webhook JWT verification is complex (ES256, JWK fetch, body hash, timing-safe comparison). Research verification libraries or patterns during phase planning.

### Phase 3: Balance & Account Display
**Rationale:** With accounts and transactions syncing, surfacing balances and spending visualizations delivers immediate user value. This completes the core Plaid feature set before branching into AI.

**Delivers:** Real-time account balances, spending breakdown charts, monthly income vs expenses trends, net worth tracking over time.

**Addresses (from FEATURES.md):**
- Account listing with balances (table stakes)
- Basic spending breakdown (table stakes)
- Monthly income vs expenses (table stakes)
- Net worth tracking (differentiator)

**Includes:**
- Balance sync: Update `plaid_accounts` balances during transaction sync
- API endpoints: `/api/plaid/accounts` (GET with balances), `/api/dashboard/summary` (enhance existing with Plaid data)
- Dashboard enhancements: Accounts page showing balances, spending breakdown chart component (category pie/bar), net worth trend line chart
- Historical balance storage: Add `balance_history` table or enhance accounts table with snapshots

**Research flag:** SKIP — Standard data aggregation and charting patterns (MEDIUM confidence, well-understood).

### Phase 4: AI Analytics Foundation
**Rationale:** AI features require foundational architecture decisions (tool-calling pattern, context assembly, graceful degradation) before any implementation. This phase establishes the Ollama integration layer and proves the core pattern with spending analysis.

**Delivers:** Users can ask natural language questions about spending and get AI-generated insights backed by real data. Establishes LLM-as-analyst pattern with proper guardrails.

**Addresses (from FEATURES.md):**
- AI spending analysis (differentiator, highest visibility)
- AI transaction re-categorization (differentiator, bounded problem)

**Avoids (from PITFALLS.md):**
- LLM doing math (critical #4) — tool-calling pattern mandatory, all calculations in app code
- Context overflow (#8) — pre-aggregate data, cap raw transactions at ~100
- No Ollama degradation (#9) — aggressive timeouts, graceful fallback UI
- Blocking on LLM responses (#13) — SSE streaming or job queue pattern

**Includes:**
- Database schema: `chat_conversations`, `chat_messages` tables
- Server utils: `ollama.ts` (client wrapper with health check), `ai-context.ts` (context assembly with aggregations), `ai-prompts.ts` (system prompts)
- API endpoints: `/api/ai/chat` (POST with SSE streaming), `/api/ai/analyze-spending` (GET for dashboard insights)
- Ollama setup: Document model selection (recommend `mistral`), pull command, health check
- Tool definitions: Query transaction totals, get category spending, calculate trends (app code executes, LLM interprets)
- Dashboard widget: "AI Insights" card with spending analysis

**Research flag:** NEEDS RESEARCH — Prompt engineering for financial analysis, tool definition patterns in AI SDK v6, SSE streaming implementation in Nitro. Research during phase planning.

### Phase 5: Conversational AI + Advanced Insights
**Rationale:** With AI foundation proven, expand to full conversational interface and proactive alerts. This phase builds on established patterns from Phase 4 but adds conversation management and background analysis jobs.

**Delivers:** Full chat interface for financial questions, proactive AI alerts on dashboard, spending forecasting, recurring transaction detection enhanced by AI.

**Addresses (from FEATURES.md):**
- Conversational financial assistant (differentiator, high complexity)
- AI proactive alerts (differentiator)
- Spending forecasting (differentiator, statistical)
- Recurring transaction detection (differentiator, Plaid API)

**Includes:**
- Chat UI: Full conversation interface component, message history display, streaming token rendering
- API endpoints: `/api/ai/conversations` (GET/POST/DELETE), `/api/ai/proactive-insights` (GET)
- Background jobs: Scheduled analysis (on-login or cron), compare current vs historical patterns, generate proactive alerts
- Dashboard enhancements: Proactive insights widget, forecasting card, recurring subscriptions view
- Recurring transactions: Integrate Plaid `/transactions/recurring/get` (requires 180+ days history)

**Research flag:** SKIP for chat UI (standard SSE client pattern), CONSIDER for proactive analysis (scheduling in Nuxt/Nitro, batch LLM jobs).

### Phase Ordering Rationale

- **Phases 1-3 (Plaid track) come first** because they deliver core table stakes features and establish the data foundation AI needs. Plaid Link must come before sync, sync before balance display.
- **Phase 4 (AI foundation) cannot start until Phase 2 completes** because it needs transaction data to analyze. But it could parallel with Phase 3 (balance display) since it only needs transactions, not balances.
- **Phase 5 (conversational AI) depends on Phase 4** to prove the AI patterns work before expanding to full chat interface.
- **ACH transfers explicitly excluded** from all phases — defer indefinitely per anti-features research.
- **Independent track architecture** allows Plaid and AI development to proceed in parallel after Phase 2, with integration points clearly defined (unified transaction query, context assembly).

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Transaction Sync)**: Webhook JWT verification is complex (ES256 algorithm, JWK key fetching, SHA-256 body hash, timing-safe comparison). Research verification libraries or step-by-step patterns. Cursor pagination edge cases (mutation during pagination) need concrete examples.
- **Phase 4 (AI Analytics Foundation)**: Prompt engineering for financial context, AI SDK v6 tool definition patterns, SSE streaming in Nitro, optimal data aggregation strategies for context assembly. This is greenfield territory with fewer established patterns.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Plaid Foundation)**: Plaid Link integration is well-documented with official examples (HIGH confidence).
- **Phase 3 (Balance & Display)**: Standard data aggregation and charting, no novel patterns.
- **Phase 5 (Conversational AI)**: Builds on Phase 4 patterns, SSE client-side consumption is well-understood.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Plaid SDK is official and stable (monthly updates), AI SDK v6 is current stable with clear Nuxt docs, Ollama is industry standard for local LLMs. Version compatibility matrix verified. |
| Features | HIGH | Table stakes features well-established from competitive analysis (Mint, Monarch, YNAB patterns). Plaid API documentation comprehensive. AI differentiators validated by local LLM finance projects. |
| Architecture | HIGH | Plaid patterns heavily documented (official docs, reference implementations). Transaction sync and webhook flows have clear specifications. Separate table design validated by multiple sources. AI tool-calling pattern is recommended best practice. |
| Pitfalls | HIGH | Security pitfalls sourced from Plaid official docs and security guides. LLM math failures well-documented. Cursor management and webhook verification specifics from API reference. |

**Overall confidence:** HIGH

### Gaps to Address

**Plaid environment clarification needed:** The project context mentions "Development Plaid keys" but Plaid's Development environment was decommissioned in June 2024. Current options are Sandbox (fake data) or Limited Production (real banks, free but capped). Verify which environment the existing keys target before Phase 1 implementation. If keys are truly "development," they may need to be regenerated as Limited Production keys.

**AI SDK v6 pattern verification:** AI SDK v6 introduced breaking changes (`new Chat()` class pattern replacing `useChat()` composable). While documented in official sources, the v6 patterns are recent (late 2025/early 2026). Verify the exact API surface during Phase 4 planning in case further v6.x updates have refined the patterns.

**Ollama model performance validation:** The `mistral` 7B recommendation is based on community consensus for finance Q&A, but actual performance on this project's transaction data should be validated early in Phase 4. If inadequate, `llama3.1:8b` is the fallback. The `finance-llama-8b` fine-tuned model has LOW confidence (single source, unverified quality) and should only be considered if general models underperform.

**Balance history storage design:** Net worth tracking (Phase 3) requires historical balance snapshots. Research didn't specify optimal schema (separate `balance_history` table vs. JSONB column in `plaid_accounts` vs. time-series DB extension). This is a minor gap to resolve during Phase 3 planning.

**Webhook verification library choice:** While JWT verification pattern is clear (ES256 + body hash + timing-safe comparison), research didn't identify a recommended Node.js library for the plaid-node SDK. Evaluate `jose` library (modern JWT library), `jsonwebtoken` (older but stable), or Plaid SDK helper functions during Phase 2 planning.

## Sources

### Primary (HIGH confidence)
- [Plaid API Documentation](https://plaid.com/docs/api/) — All Plaid endpoints, error codes, webhook specs
- [Plaid Transactions API](https://plaid.com/docs/api/products/transactions/) — `/transactions/sync` cursor pagination, delta model
- [Plaid Link API](https://plaid.com/docs/api/link/) — Link token creation, update mode, expiration
- [Plaid Webhook Verification](https://plaid.com/docs/api/webhooks/webhook-verification/) — JWT signature verification flow
- [Plaid Security Best Practices](https://plaid.com/core-exchange/docs/security/) — Access token encryption requirement
- [Plaid Launch Checklist](https://plaid.com/docs/launch-checklist/) — Production readiness requirements
- [plaid-node GitHub](https://github.com/plaid/plaid-node) — Official SDK v41.1.0, configuration patterns
- [Vercel AI SDK Nuxt Getting Started](https://ai-sdk.dev/docs/getting-started/nuxt) — AI SDK v6 + Vue setup
- [AI SDK 6.0 Announcement](https://vercel.com/blog/ai-sdk-6) — v6 breaking changes, Chat class pattern
- [Ollama JavaScript Library](https://github.com/ollama/ollama-js) — Official Ollama client, streaming API
- [Ollama Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs) — JSON mode, format validation

### Secondary (MEDIUM confidence)
- [AI SDK Community Providers - Ollama](https://ai-sdk.dev/providers/community-providers/ollama) — `ai-sdk-ollama` vs `ollama-ai-provider-v2` comparison
- [ai-sdk-ollama npm](https://www.npmjs.com/package/ai-sdk-ollama) — Version compatibility (v3 for AI SDK v6)
- [Plaid Product Updates December 2025](https://plaid.com/blog/product-updates-december-2025/) — AI-enhanced categorization feature
- [Local LLM Finance Analysis GitHub](https://github.com/thu-vu92/local-llms-analyse-finance) — Patterns for financial analysis with local LLMs
- [Plaid Sandbox vs Production Guide](https://www.fintegrationfs.com/post/plaid-sandbox-vs-production-what-us-developers-should-know) — Environment comparison, Development deprecation

### Tertiary (LOW confidence)
- [Finance-Llama-8B on Ollama](https://ollama.com/martain7r/finance-llama-8b) — Finance fine-tuned model option, quality unverified
- [@jcss/vue-plaid-link npm](https://www.npmjs.com/package/@jcss/vue-plaid-link) — Community Vue wrapper, last updated 7mo ago
- [FINOS AI Governance Framework](https://air-governance-framework.finos.org/risks/ri-4_hallucination-and-inaccurate-outputs.html) — LLM hallucination risk framework
- [Grid.is LLM Math Analysis](https://medium.grid.is/numbers-dont-lie-but-ai-might-54674fb05d26) — LLM arithmetic failure analysis

---
*Research completed: 2026-02-15*
*Ready for roadmap: yes*
