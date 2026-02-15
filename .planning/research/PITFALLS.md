# Domain Pitfalls

**Domain:** Plaid banking integration + local LLM financial analytics
**Researched:** 2026-02-15

## Critical Pitfalls

Mistakes that cause security breaches, data loss, financial harm, or full rewrites.

### Pitfall 1: Storing Plaid Access Tokens in Plaintext

**What goes wrong:** Plaid access tokens are long-lived keys to a user's bank data. Storing them as plain strings in PostgreSQL means a database breach exposes every linked bank account. Unlike session tokens, access tokens do not expire -- they grant indefinite access to financial data.

**Why it happens:** Developers treat access tokens like any other database field. The Plaid quickstart examples store tokens plainly for simplicity, and devs carry that pattern into production.

**Consequences:** A single SQL injection or database backup leak exposes all linked bank accounts. Plaid's own security docs state access tokens should be "encrypted at rest, with restricted access in code, and never logged."

**Prevention:**
- Encrypt access tokens before storing in PostgreSQL using AES-256 (e.g., `node:crypto` `createCipheriv` with a key from env vars)
- Never log access tokens -- redact in all error handlers and request logging
- Store the encryption key in environment variables, separate from the database
- Add a `plaid_items` table with `encrypted_access_token`, `item_id`, `institution_id`, `cursor` columns

**Detection:** Grep your codebase for access token variable names near `console.log`, `logger`, or raw database insert calls without encryption.

**Phase:** Must be addressed in the very first Plaid integration phase, before any access token is persisted.

**Confidence:** HIGH -- [Plaid official security docs](https://plaid.com/core-exchange/docs/security/), [GitGuardian remediation guide](https://www.gitguardian.com/remediation/plaid-access-token), [AWS Plaid architecture reference](https://aws.amazon.com/blogs/apn/how-to-build-a-fintech-app-on-aws-using-the-plaid-api/)

---

### Pitfall 2: Duplicate ACH Transfers from Missing Idempotency Keys

**What goes wrong:** Network timeouts or retries during `/transfer/authorization/create` create duplicate authorizations, each of which can result in a real money movement. User gets charged twice (or more) for a single intended transfer.

**Why it happens:** Idempotency keys are "strongly recommended" but not required by the API. Developers skip them during initial implementation, then discover duplicate transfers in production when network hiccups cause retries.

**Consequences:** Real money is moved multiple times. ACH returns are slow (days) and may incur fees. User trust is destroyed immediately.

**Prevention:**
- Always generate and send an `idempotency_key` with every `/transfer/authorization/create` call
- Use a deterministic key derived from (user_id + amount + account_id + timestamp_bucket) so retries produce the same key
- Store the authorization_id locally before calling `/transfer/create` -- Plaid uses authorization_id as its own idempotency key for transfer creation
- Implement client-side debouncing on transfer confirmation buttons
- Log every transfer attempt with its idempotency key for audit

**Detection:** Monitor for multiple authorizations with the same user + amount within short time windows. Alert on any transfer where the authorization amount differs from the transfer amount.

**Phase:** Must be built into the ACH transfers phase from day one. Cannot be retrofitted safely.

**Confidence:** HIGH -- [Plaid Transfer creation docs](https://plaid.com/docs/transfer/creating-transfers/), [Plaid Transfer API reference](https://plaid.com/docs/api/products/transfer/initiating-transfers/)

---

### Pitfall 3: Not Handling ITEM_LOGIN_REQUIRED and Stale Connections

**What goes wrong:** Bank connections break regularly -- password changes, MFA rotation, bank API updates, the upcoming Bank of America API migration in 2026. Without a reconnection flow, the app silently stops syncing transactions and shows stale data. Users think their finances are current when they are not.

**Why it happens:** The happy path works in development. Developers build Link once for initial connection and forget that items degrade over time. Plaid's error states (`ITEM_LOGIN_REQUIRED`, `PENDING_DISCONNECT`, `PENDING_EXPIRATION`) require a separate "update mode" Link flow that is easy to overlook.

**Consequences:** Users make financial decisions based on stale data. Dashboard shows outdated balances. Budgets appear healthy when accounts are overdrawn. Transfers fail silently.

**Prevention:**
- Implement [Link update mode](https://plaid.com/docs/link/update-mode/) as a first-class flow, not an afterthought
- Store item health status in your `plaid_items` table (healthy, login_required, pending_disconnect)
- Show prominent UI banners when any linked account needs re-authentication
- Listen for `ITEM_LOGIN_REQUIRED`, `PENDING_DISCONNECT`, `PENDING_EXPIRATION`, and `LOGIN_REPAIRED` webhooks
- Track `last_successful_sync` timestamp per item and show "last updated X ago" in the UI

**Detection:** If your `plaid_items` table has no `status` or `last_synced` column, you have this problem. If your UI has no "reconnect account" flow, you have this problem.

**Phase:** Should be part of the initial Plaid Link integration phase, built alongside the connection flow.

**Confidence:** HIGH -- [Plaid Link update mode docs](https://plaid.com/docs/link/update-mode/), [Plaid item errors reference](https://plaid.com/docs/errors/item/), [Plaid launch checklist](https://plaid.com/docs/launch-checklist/)

---

### Pitfall 4: LLM Performing Financial Calculations Directly

**What goes wrong:** You ask the local LLM "What did I spend on groceries this month?" and it generates a plausible but wrong number. LLMs are structurally incapable of reliable arithmetic -- tokenization breaks numbers, and inference is non-deterministic. A hallucinated "$342.17" when the real answer is "$1,247.89" leads to terrible financial decisions.

**Why it happens:** It feels natural to let the LLM answer financial questions end-to-end. The responses sound authoritative. Small test datasets may accidentally produce correct results, giving false confidence.

**Consequences:** Users trust AI-generated financial summaries that are factually wrong. Budgets, spending analysis, and trend detection are unreliable. Liability exposure if users make financial decisions based on hallucinated numbers.

**Prevention:**
- Never let the LLM compute numbers. Use a tool-calling / function-calling pattern where:
  1. LLM interprets the natural language query
  2. LLM generates a structured query (SQL or function call)
  3. Your code executes the actual computation
  4. LLM formats and explains the pre-computed results
- Pre-compute all aggregations (totals, averages, trends) in SQL/application code
- Pass computed numbers to the LLM as context, not as something to calculate
- Display source data alongside AI explanations so users can verify
- Add disclaimers: "AI-assisted analysis. Verify important figures."

**Detection:** If your LLM prompt includes raw transaction lists and asks "how much did I spend," you have this problem. If your LLM output includes numbers not traceable to a database query, you have this problem.

**Phase:** Must be the foundational architecture decision for the AI analytics phase. The entire prompt engineering and data pipeline depends on getting this right.

**Confidence:** HIGH -- [Grid.is analysis of LLM math failures](https://medium.grid.is/numbers-dont-lie-but-ai-might-54674fb05d26), [FINOS AI governance framework](https://air-governance-framework.finos.org/risks/ri-4_hallucination-and-inaccurate-outputs.html), [Arsturn neuro-symbolic analysis](https://www.arsturn.com/blog/why-your-llm-is-bad-at-math-and-how-to-fix-it-with-a-clip-on-symbolic-brain)

---

### Pitfall 5: Unverified Webhooks Enabling Data Injection

**What goes wrong:** Without verifying Plaid's JWT webhook signatures, an attacker can send fake webhook payloads to your endpoint. A crafted `SYNC_UPDATES_AVAILABLE` webhook could trigger your app to call Plaid APIs at attacker-chosen times, or a fake `TRANSFER_EVENTS_UPDATE` could manipulate your local transfer state.

**Why it happens:** Webhook verification requires JWT parsing, JWK key fetching, ES256 signature validation, and SHA-256 body hash comparison. It is complex enough that developers "plan to add it later" and never do.

**Consequences:** Attacker can trigger arbitrary sync cycles, potentially cause rate limiting or API abuse. With transfer webhooks, could manipulate local state to show transfers as completed when they are not.

**Prevention:**
- Verify every webhook using Plaid's JWT verification flow before processing
- Use Plaid's official SDK which includes webhook verification helpers
- Reject any webhook where `alg` is not `ES256`
- Use constant-time string comparison for the `request_body_sha256` check
- Note: the body hash is whitespace-sensitive (tab-spacing of 2) -- do not reformat the body before hashing
- Keep webhook handlers simple: write to a queue/database, process asynchronously

**Detection:** If your webhook endpoint does not import or call a JWT verification function, it is vulnerable.

**Phase:** Must be implemented when webhooks are first set up, which should be during the transaction sync phase.

**Confidence:** HIGH -- [Plaid webhook verification docs](https://plaid.com/docs/api/webhooks/webhook-verification/), [Plaid webhook verification example](https://gist.github.com/skylarmb/0cecf20afe16ba1959681c838ce9b3a2)

---

## Moderate Pitfalls

### Pitfall 6: Transaction Sync Cursor Mismanagement

**What goes wrong:** The `/transactions/sync` cursor-based pagination has a subtle failure mode: if a mutation occurs mid-pagination, you get `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` and must restart from the *original* cursor, not the latest one. If you only store the latest cursor, you lose the restart point and must do a full re-sync.

**Prevention:**
- Store both the "current sync cursor" (from the start of the pagination loop) and the "latest page cursor" (from each response)
- Only update the persisted cursor after the entire pagination loop completes successfully (all `has_more: false`)
- On `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION`, restart the loop from the preserved original cursor
- Always call `/transactions/sync` at least once before relying on webhooks

**Detection:** If your cursor update happens inside the pagination loop rather than after it, you will lose data on mutations.

**Phase:** Transaction sync implementation phase.

**Confidence:** HIGH -- [Plaid Transactions Sync migration guide](https://plaid.com/docs/transactions/sync-migration/), [Plaid Transactions API](https://plaid.com/docs/api/products/transactions/)

---

### Pitfall 7: Development Environment Surprise Bills and Real Bank Connections

**What goes wrong:** The project context says "development Plaid keys (not sandbox, real institutions)." Development environment uses real bank credentials and real data but is not billed for API calls. However: (1) you are connecting YOUR real bank accounts during development, (2) switching to production later requires re-linking all items, (3) some products behave differently with real institutions vs sandbox, and (4) development has limitations (no OWNERS product, item caps).

**Prevention:**
- Use sandbox for automated testing and CI -- development keys should only be for manual integration testing
- Build your application to work in both sandbox and development environments via environment config
- Document which test accounts are connected in development so you can clean them up
- Never test ACH transfers against real accounts in development -- use sandbox transfer testing
- Be aware that development items cannot be migrated to production; users must re-link

**Detection:** If your test suite uses development keys, you are hitting real banks in CI. If you have no sandbox configuration, you cannot test without real bank credentials.

**Phase:** Environment setup phase (first phase). Must establish sandbox for tests, development for manual QA.

**Confidence:** HIGH -- [Plaid sandbox vs production guide](https://www.fintegrationfs.com/post/plaid-sandbox-vs-production-what-us-developers-should-know), [Plaid sandbox docs](https://plaid.com/docs/sandbox/)

---

### Pitfall 8: LLM Context Window Overflow with Transaction History

**What goes wrong:** A year of transactions can easily be 2,000+ records. Stuffing raw transaction data into an LLM prompt exceeds context windows (especially smaller local models like 7B-13B), causes slow inference, and degrades response quality. The model starts ignoring or confusing transactions.

**Prevention:**
- Pre-aggregate data before sending to the LLM: monthly totals by category, top merchants, trend summaries
- Use a retrieval pattern: LLM requests specific data slices via tool calls, not bulk dumps
- Set hard limits on context: max 50 transactions in a single prompt, prefer summaries
- For "tell me about my spending" queries, pass pre-computed summaries, not raw data
- Consider SQLite/vector embeddings for transaction search, with LLM only interpreting results

**Detection:** If your prompt template includes `${allTransactions}` or similar unbounded data injection, you have this problem.

**Phase:** AI analytics architecture phase. Must be designed before any prompt engineering begins.

**Confidence:** MEDIUM -- based on general LLM context window constraints and [local LLM finance analysis patterns](https://github.com/thu-vu92/local-llms-analyse-finance)

---

### Pitfall 9: No Graceful Degradation When Ollama Is Down

**What goes wrong:** Ollama crashes, runs out of memory, or the model fails to load. If AI features are tightly coupled to the main app flow, the entire dashboard breaks or hangs waiting for LLM responses that never come.

**Prevention:**
- AI features must be additive overlays, never blocking the core financial dashboard
- Set aggressive timeouts on Ollama API calls (10-15 seconds max)
- Show "AI insights unavailable" gracefully, not error pages
- Cache recent AI responses so the last analysis is available even when Ollama is down
- Health-check Ollama on app startup and surface status in the UI
- Consider a background job pattern: queue analysis requests, display results when ready

**Detection:** Kill the Ollama process and see if your dashboard still loads. If it does not, you have this problem.

**Phase:** Must be established as an architectural principle before any AI feature implementation.

**Confidence:** MEDIUM -- based on general local service reliability patterns and Ollama operational experience

---

### Pitfall 10: Plaid Link Token Lifecycle Mishandling

**What goes wrong:** Link tokens expire after 4 hours (or 30 minutes for some flows). If you create a link token on page load and the user takes a while to click "Connect Bank," the token is stale and Link fails silently or shows a confusing error.

**Prevention:**
- Create link tokens on-demand (when user clicks "Connect"), not on page load
- Handle `LINK_TOKEN_EXPIRED` errors by generating a fresh token and retrying
- For update mode, create the link token with the existing `access_token` to scope it to that item
- Do not cache link tokens client-side beyond the immediate use

**Detection:** Test by creating a link token, waiting 5+ hours, and trying to use it. If your flow has no expiration handling, it will fail.

**Phase:** Plaid Link integration phase.

**Confidence:** HIGH -- [Plaid Link API docs](https://plaid.com/docs/api/link/)

---

## Minor Pitfalls

### Pitfall 11: Amount Format Mismatch Between Plaid and Your DB

**What goes wrong:** Plaid returns amounts where positive values represent money leaving the account (debits) and negative values represent money entering (credits). This is the opposite of most accounting conventions. If you store Plaid amounts directly, your totals, budgets, and reports will have inverted signs.

**Prevention:**
- Normalize Plaid amounts on ingestion: negate the value so income is positive and expenses are negative (or vice versa, just be consistent)
- Document your sign convention in code comments and database schema
- Add a `raw_plaid_amount` column if you need to reconcile with Plaid later
- Your existing `transactions` table uses `amount numeric(12,2)` -- define a clear convention for this column

**Detection:** If "income" transactions show as negative in your dashboard, your signs are inverted.

**Phase:** Transaction sync implementation.

**Confidence:** HIGH -- [Plaid Transactions API docs](https://plaid.com/docs/api/products/transactions/)

---

### Pitfall 12: Ignoring Plaid Transaction Pending States

**What goes wrong:** Plaid returns both pending and posted transactions. Pending transactions can change amount, disappear, or be replaced by posted versions. If you treat all transactions equally, balances fluctuate confusingly and duplicate entries appear.

**Prevention:**
- Store `pending` status on each transaction
- When a pending transaction is replaced by a posted version, use Plaid's `pending_transaction_id` field to match and update
- The `/transactions/sync` endpoint handles this via `removed` array -- process removals before additions
- Consider hiding or de-emphasizing pending transactions in the UI

**Detection:** If your transaction count grows unexpectedly after syncs, you are likely duplicating pending + posted versions of the same transaction.

**Phase:** Transaction sync implementation.

**Confidence:** HIGH -- [Plaid Transactions introduction](https://plaid.com/docs/transactions/)

---

### Pitfall 13: Blocking on LLM Responses in API Routes

**What goes wrong:** Ollama inference on a 7B model can take 5-30+ seconds depending on hardware and prompt length. If your Nuxt API route awaits the LLM response synchronously, the request times out, the user sees a spinner forever, and server threads are consumed.

**Prevention:**
- Use streaming responses (Server-Sent Events) for LLM interactions so users see tokens appear progressively
- Alternatively, use a job queue pattern: submit query, poll for results
- Set Nitro route-level timeouts for AI endpoints
- Show a typing indicator or progress state in the UI

**Detection:** If your AI endpoint has `await ollama.generate()` with no streaming, you will have timeout issues.

**Phase:** AI analytics implementation phase.

**Confidence:** MEDIUM -- general server architecture knowledge, confirmed by [Ollama API patterns](https://ollama.com/library)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Environment & Plaid setup | Development keys used in tests hit real banks (#7) | Configure sandbox env for all automated tests |
| Plaid Link integration | Link token expiration (#10), no update mode (#3) | Create tokens on-demand, build update mode from start |
| Transaction sync | Cursor mismanagement (#6), pending states (#12), amount signs (#11) | Preserve original cursor, handle removed array, normalize amounts |
| Access token storage | Plaintext tokens (#1) | Encrypt before storage, never log |
| ACH transfers | Duplicate transfers (#2) | Idempotency keys on every authorization |
| Webhook processing | Unverified webhooks (#5) | JWT verification on every webhook |
| AI analytics architecture | LLM doing math (#4), context overflow (#8) | Tool-calling pattern, pre-aggregation |
| AI analytics implementation | Blocking responses (#13), Ollama downtime (#9) | Streaming SSE, graceful degradation |

## Sources

- [Plaid Security Best Practices](https://plaid.com/core-exchange/docs/security/)
- [Plaid Launch Checklist](https://plaid.com/docs/launch-checklist/)
- [Plaid Link Update Mode](https://plaid.com/docs/link/update-mode/)
- [Plaid Webhook Verification](https://plaid.com/docs/api/webhooks/webhook-verification/)
- [Plaid Transfer Creation](https://plaid.com/docs/transfer/creating-transfers/)
- [Plaid Transfer Errors and Returns](https://plaid.com/docs/transfer/troubleshooting/)
- [Plaid Transactions Sync](https://plaid.com/docs/transactions/sync-migration/)
- [Plaid Item Errors](https://plaid.com/docs/errors/item/)
- [Plaid Sandbox vs Production](https://www.fintegrationfs.com/post/plaid-sandbox-vs-production-what-us-developers-should-know)
- [Plaid Link API](https://plaid.com/docs/api/link/)
- [GitGuardian Plaid Token Remediation](https://www.gitguardian.com/remediation/plaid-access-token)
- [LLM Math Failures - Grid.is](https://medium.grid.is/numbers-dont-lie-but-ai-might-54674fb05d26)
- [FINOS AI Governance - Hallucination Risks](https://air-governance-framework.finos.org/risks/ri-4_hallucination-and-inaccurate-outputs.html)
- [Local LLM Finance Analysis](https://github.com/thu-vu92/local-llms-analyse-finance)
- [Plaid Product Updates Dec 2025](https://plaid.com/blog/product-updates-december-2025/)
