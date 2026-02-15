# Requirements: finai — Plaid Integration & AI Analytics

**Defined:** 2026-02-15
**Core Value:** Real bank data flowing into an AI-powered dashboard that helps me understand and control my money

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Account Connection

- [ ] **ACCT-01**: User can connect bank accounts via Plaid Link UI
- [ ] **ACCT-02**: Access tokens are encrypted at rest in PostgreSQL
- [ ] **ACCT-03**: User can disconnect/remove a linked bank account
- [ ] **ACCT-04**: User can re-authenticate degraded connections via Link update mode

### Transaction Sync

- [ ] **SYNC-01**: Transactions auto-import from linked accounts via Plaid API
- [ ] **SYNC-02**: Webhook-driven sync triggers on new transaction data
- [ ] **SYNC-03**: Plaid categories map to existing app categories
- [ ] **SYNC-04**: Manual and imported transactions coexist with unified view

### Balances & Accounts

- [ ] **BAL-01**: Display current balance for each linked account
- [ ] **BAL-02**: Show net worth / total balance across all accounts
- [ ] **BAL-03**: Balance trend charts over time
- [ ] **BAL-04**: Spending breakdown by account

### AI Analytics

- [ ] **AI-01**: Spending pattern analysis (trends, categories, month-over-month)
- [ ] **AI-02**: Conversational chat — ask questions about financial data
- [ ] **AI-03**: Recurring transaction detection (subscriptions, repeating charges)

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Payments

- **PAY-01**: ACH bank transfers between linked accounts
- **PAY-02**: Bill pay / send money via Plaid Transfer

### AI Advanced

- **AI-04**: Proactive financial alerts ("You're overspending this month")
- **AI-05**: Financial forecasting and budget recommendations
- **AI-06**: AI-powered transaction categorization (auto-assign categories)

### Account Management

- **ACCT-05**: Investment/brokerage account tracking
- **ACCT-06**: Multi-user support (other users connect their own banks)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| ACH transfers / bill pay | Compliance burden too heavy for single-user personal app; requires Plaid production approval |
| Cloud AI provider (OpenAI, Claude API) | Privacy-first approach; financial data stays local with Ollama |
| Multi-user / multi-tenant | Personal tool for single developer; no tenant isolation needed |
| Mobile app | Web dashboard only; responsive design sufficient |
| Investment tracking | Bank accounts only for v1; brokerage adds significant complexity |
| Cryptocurrency | Traditional banking only |
| Plaid production deployment | Development/Limited Production keys sufficient for personal use |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACCT-01 | — | Pending |
| ACCT-02 | — | Pending |
| ACCT-03 | — | Pending |
| ACCT-04 | — | Pending |
| SYNC-01 | — | Pending |
| SYNC-02 | — | Pending |
| SYNC-03 | — | Pending |
| SYNC-04 | — | Pending |
| BAL-01 | — | Pending |
| BAL-02 | — | Pending |
| BAL-03 | — | Pending |
| BAL-04 | — | Pending |
| AI-01 | — | Pending |
| AI-02 | — | Pending |
| AI-03 | — | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 after initial definition*
