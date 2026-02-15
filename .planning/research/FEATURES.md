# Feature Landscape

**Domain:** Personal finance dashboard with Plaid banking integration and local AI analytics
**Researched:** 2026-02-15

## Existing System (Already Built)

Before defining new features, the existing transaction system provides:
- Manual transaction CRUD (income/expense with amounts, dates, descriptions, notes)
- User-defined categories with icons and colors (9 defaults seeded)
- Dashboard summary (total balance, monthly spending, recent count)
- Transaction filtering (type, category, date range) with pagination
- Full auth system (email/password + GitHub/Google OAuth)

This is the foundation. Plaid and AI features layer on top of it.

---

## Table Stakes

Features users expect from a Plaid-connected finance app. Missing any of these and the integration feels broken or pointless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Plaid Link account connection** | Core value prop -- connect real bank accounts | Medium | Plaid Link drop-in UI handles bank auth. Server creates link_token, exchanges public_token for access_token. Store access_token + item_id per user. |
| **Account listing with balances** | Users need to see what's connected and current balances | Low | `/accounts/balance/get` returns real-time balances. Display account name, type, current/available balance. |
| **Automatic transaction import** | The entire point of Plaid -- no manual entry | High | Use `/transactions/sync` with cursor-based pagination. Must handle `added`, `modified`, `removed` arrays. Need webhook listener for `SYNC_UPDATES_AVAILABLE`. |
| **Transaction categorization from Plaid** | Plaid provides Personal Finance Categories with confidence levels | Medium | Map Plaid's categories to existing app categories. Plaid's AI-enhanced categorization (late 2025) delivers ~20% better accuracy on subcategories. |
| **Merge manual + imported transactions** | Users already have manual transactions; imported ones must coexist | Medium | Add `source` field to transactions table (`manual` vs `plaid`). Add `plaidTransactionId` for dedup. Both types appear in same list/filters. |
| **Account disconnect/reconnect** | Link expires, banks require re-auth | Low | Handle `ITEM_LOGIN_REQUIRED` webhook. Plaid Link update mode for re-authentication. Delete item flow. |
| **Basic spending breakdown** | Category-level spending visualization (pie/bar chart) | Medium | Aggregate transactions by category for a time period. Chart component on dashboard. This is what every Mint/Monarch user expects. |
| **Monthly income vs expenses** | Users need to see if they're net positive or negative | Low | Already have `getDashboardSummary` -- extend with Plaid-imported data. Show trend over months. |

## Differentiators

Features that set this apart from generic Plaid-connected apps. Not expected, but high value -- especially the AI angle.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI spending analysis (local LLM)** | "Ask your finances a question" -- natural language queries about spending patterns, powered by Ollama running locally. Zero data leaves the machine. | High | Feed transaction data as context to local LLM. Queries like "How much did I spend on food in January?" or "What are my biggest expenses?" Requires prompt engineering for structured financial data. |
| **AI proactive alerts** | LLM analyzes recent transactions and surfaces insights without being asked: "Your dining spending is 40% higher than last month" | High | Scheduled analysis job (cron or on-login). LLM compares current period to historical patterns. Push results to dashboard widget. |
| **AI transaction categorization** | Local LLM re-categorizes ambiguous transactions that Plaid marked LOW confidence | Medium | Only process transactions where Plaid confidence < VERY_HIGH. LLM sees description + merchant name and assigns category. Batch process, not real-time. |
| **Recurring transaction detection** | Surface subscriptions and recurring bills automatically | Medium | Plaid offers `/transactions/recurring/get` (request 180+ days history for best results). Display as dedicated "Subscriptions" view. Flag new or changed recurring charges. |
| **Conversational financial assistant** | Chat interface for financial questions with context of your actual data | High | Full chat UI with message history. LLM receives structured summary of accounts, categories, trends as system prompt. Streaming responses from Ollama. |
| **Spending forecasting** | Predict end-of-month spending based on current pace and historical patterns | Medium | Statistical projection (not necessarily LLM). "At your current pace, you'll spend $X on food this month vs $Y average." |
| **Net worth tracking** | Track total net worth across all connected accounts over time | Medium | Snapshot balances periodically (daily/weekly). Store historical balance data. Line chart showing net worth trend. Requires storing balance history in DB. |
| **Multi-account cash flow view** | See money flowing between accounts, not just individual account views | Medium | Identify transfers between connected accounts (Plaid provides transfer detection). Show consolidated view across all accounts. |

## Anti-Features

Features to explicitly NOT build. These are tempting but wrong for a personal single-user dashboard.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **ACH transfers / bill pay** | Plaid Transfer requires production approval, per-payment fees, compliance burden (KYC/AML), and cannot pay individuals. Massive scope for a personal dashboard. | Link to bank's own app for payments. Focus on visibility, not money movement. |
| **Investment portfolio management** | Plaid Investments API adds significant complexity (holdings, securities, cost basis). Different domain from spending tracking. | Phase 1 is spending. If investment tracking wanted later, treat as entirely separate milestone. |
| **Multi-user / household sharing** | Single-user personal dashboard. Sharing adds auth complexity, data isolation concerns, permission models. | Keep single-user. If sharing desired, it's a separate project scope. |
| **Cloud AI / OpenAI integration** | Defeats the privacy advantage. Sending financial data to cloud APIs is exactly what users of local-first tools want to avoid. | Ollama only. If Ollama is too slow or inaccurate, optimize prompts or try different models -- don't fallback to cloud. |
| **Budgeting rules engine** | Complex rule systems (YNAB-style envelope budgeting) are an entire product category. Over-engineering for a personal tool. | Simple budget targets per category with over/under display. No rollover, no envelope logic. |
| **Receipt scanning / OCR** | Requires camera integration, image processing pipeline, OCR model. Plaid already provides transaction data. | Manual notes field already exists for adding context. Plaid provides merchant enrichment. |
| **Credit score monitoring** | Plaid offers CRA products but requires production approval and compliance. Different product category. | Show liabilities data if desired, but don't build credit monitoring. |
| **Real-time push notifications** | Requires mobile app or push notification infrastructure. Browser notifications are unreliable. | Dashboard alerts on login. Proactive AI insights shown when user visits the app. |

## Feature Dependencies

```
Plaid Link Account Connection
  --> Account Listing with Balances
  --> Automatic Transaction Import
        --> Transaction Categorization from Plaid
        --> Merge Manual + Imported Transactions
        --> Recurring Transaction Detection
        --> AI Transaction Categorization (LOW confidence re-processing)
  --> Account Disconnect/Reconnect

Basic Spending Breakdown (works with existing manual data)
Monthly Income vs Expenses (works with existing manual data)

Ollama Integration (standalone setup)
  --> AI Spending Analysis
  --> AI Proactive Alerts
  --> AI Transaction Categorization
  --> Conversational Financial Assistant

Net Worth Tracking
  --> Requires: Account Listing with Balances + balance history storage

Spending Forecasting
  --> Requires: 2+ months of transaction data (manual or Plaid)
```

Key insight: Plaid features and AI features are **independent tracks** that can be built in parallel. They converge when AI processes Plaid-imported data, but neither blocks the other.

## MVP Recommendation

### Phase 1: Plaid Core (accounts + transactions)
Prioritize:
1. Plaid Link account connection (gate to all Plaid value)
2. Account listing with balances (immediate gratification after connecting)
3. Automatic transaction import with sync (the killer feature)
4. Merge manual + imported transactions (preserve existing data)
5. Transaction categorization mapping (Plaid categories to app categories)

### Phase 2: AI Foundation
Prioritize:
1. Ollama integration layer (composable/server util for LLM calls)
2. AI spending analysis (highest value, most visible differentiator)
3. AI transaction re-categorization (practical, bounded problem)

### Phase 3: Insights Layer
Prioritize:
1. Spending breakdown charts (table stakes visualization)
2. Recurring transaction detection (Plaid API does heavy lifting)
3. AI proactive alerts (builds on analysis foundation)
4. Spending forecasting (statistical, doesn't require LLM)

Defer:
- **Conversational assistant**: High complexity, requires solid Ollama integration first. Phase 4+.
- **Net worth tracking**: Requires balance history infrastructure. Phase 4+.
- **Multi-account cash flow**: Nice-to-have after core is solid. Phase 5+.

## Plaid Environment Notes

**IMPORTANT for development planning:**

- Plaid's "Development" environment was **decommissioned June 2024**. It no longer exists.
- For real bank data testing, use **Limited Production** (free but capped on Items and API calls).
- Sandbox uses fake data with test credentials -- good for integration testing but not real bank connections.
- The project context says "Development Plaid keys" -- these may need to be Limited Production keys instead. **Verify which environment the existing keys target.**
- Limited Production caps: limited number of Items (connected accounts) and API calls. Fine for single-user personal use.

## Sources

- [Plaid Transactions API Docs](https://plaid.com/docs/api/products/transactions/)
- [Plaid Link Overview](https://plaid.com/docs/link/)
- [Plaid Link Web Integration](https://plaid.com/docs/link/web/)
- [Plaid Webhooks for Transactions](https://plaid.com/docs/transactions/webhooks/)
- [Plaid Sandbox Overview](https://plaid.com/docs/sandbox/)
- [Plaid Product Updates December 2025](https://plaid.com/blog/product-updates-december-2025/) - AI-enhanced categorization
- [Plaid Pricing](https://plaid.com/pricing/)
- [Plaid Transfer Limitations](https://plaid.com/docs/transfer/creating-transfers/)
- [Build AI Finance Analyzer with Local LLMs](https://dzone.com/articles/local-llm-finance-tracker)
- [Local LLMs for Financial Analysis](https://github.com/thu-vu92/local-llms-analyse-finance)
- [Personal Finance Apps 2025 Review](https://bountisphere.com/blog/personal-finance-apps-2025-review)
- [Best Budget Apps 2026 - NerdWallet](https://www.nerdwallet.com/finance/learn/best-budget-apps)
- [AI Personal Finance Management 2026](https://sranalytics.io/blog/ai-personal-finance/)
