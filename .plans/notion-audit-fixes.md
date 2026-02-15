# Plan: Implement Audit Recommendations

> **Status:** Awaiting approval
> **Date:** 2026-02-15
> **Scope:** Notion board fixes + SendGrid → Resend migration
> **Complexity:** Low (~20 Notion API calls + 1 file edit)

---

## Requirements

1. Set Sprint dates — rough estimates based on sprint scope
2. Set Plan target date — derived from Sprint 4 end date
3. Flesh out thin task descriptions — Tasks 5.1-5.5, 6.1-6.3, 7.2
4. Delete orphaned "Task" template page — `ec2eaa29-e3ea-83e6-b936-8186923fb952`
5. Switch SendGrid → Resend — update Task 2.4, Task 0.2 deps, and WORKFLOW.md references

---

## Step 1: Set Sprint & Plan Dates

Starting today (2026-02-15), ~1 week per sprint:

| Sprint | Start | End |
|--------|-------|-----|
| Sprint 1 (`308eaa29-e3ea-81f9-8bda-d24de5f7e7ca`) | 2026-02-15 | 2026-02-21 |
| Sprint 2 (`308eaa29-e3ea-81d6-bc53-d0b47bb2c239`) | 2026-02-22 | 2026-02-28 |
| Sprint 3 (`308eaa29-e3ea-813b-95c4-c07dafb04bdd`) | 2026-03-01 | 2026-03-07 |
| Sprint 4 (`308eaa29-e3ea-81ec-87d0-e62688fc739f`) | 2026-03-08 | 2026-03-14 |

Set Plan (`308eaa29-e3ea-81b6-aa46-fba7dab7bd45`) target date: **2026-03-14**

**API calls:** 5 (4 sprints + 1 plan)

---

## Step 2: Flesh Out Thin Task Descriptions

Update page content (body) for these 9 tasks with implementation detail:

### Task 5.1 — Dashboard Layout (`308eaa29-e3ea-818f-b2bc-fe1b09b00be2`)
Add: Sidebar structure (fixed left, 240px), responsive collapse to hamburger on mobile, `<slot />` for main content, header bar with user avatar/name from `useUserSession()`, Nuxt UI `UDashboardLayout` or custom flexbox layout.

### Task 5.2 — Dashboard Sidebar (`308eaa29-e3ea-8186-9a63-f0637d26b58d`)
Add: Navigation items with UNavigationMenu: Overview (icon: `i-heroicons-home`), Transactions (`i-heroicons-banknotes`), Budgets (`i-heroicons-chart-pie`), Settings (`i-heroicons-cog-6-tooth`). Active state via `useRoute().path`. Mobile: slide-over drawer with `USlideover`. Highlight current route.

### Task 5.3 — OverviewCard (`308eaa29-e3ea-812b-8c13-d01752adafe9`)
Add: Props interface: `{ icon: string, label: string, value: string | number, trend?: { direction: 'up' | 'down' | 'neutral', percentage: number } }`. Uses `UCard` with icon left, value prominent, optional trend badge (green up, red down). Initial values all show "$0" or "No data" placeholder.

### Task 5.4 — Dashboard Pages (`308eaa29-e3ea-8127-bcd6-c35b5f83d249`)
Add: Each page uses `definePageMeta({ layout: 'dashboard', middleware: 'auth' })`. Empty states use `UEmpty` component with icon + message + optional action button. Settings page shows user.email, user.name, user.avatarUrl from session, provider badge.

### Task 5.5 — Wire Up Logout (`308eaa29-e3ea-81d4-8a82-f4d8691c8767`)
Add: In dashboard header, add UButton with `@click="logout()"`. Use `useAuth().logout()` which calls `$fetch('/api/auth/logout', { method: 'POST' })`, then `navigateTo('/')`. Show loading state on button during request. Handle errors with `useToast()`.

### Task 6.1 — Verify Rate Limiting (`308eaa29-e3ea-81ff-8728-c999097242e2`)
Add: Test script/steps: (1) Use `for i in {1..6}; do curl -X POST localhost:3889/api/auth/login -d '{"email":"test@test.com","password":"wrong"}'; done` — 6th should return 429. (2) Check response includes `Retry-After` header. (3) Wait 15 min, verify reset.

### Task 6.2 — Verify Security Headers (`308eaa29-e3ea-8199-be1a-f8c96a5d7320`)
Add: Run `curl -I http://localhost:3889/` and verify: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Verify NO `X-Powered-By` header in response.

### Task 6.3 — Review Auth Enumeration (`308eaa29-e3ea-81b3-83c6-ec7c802c2fa5`)
Add: Test cases: (1) POST `/api/auth/login` with nonexistent email → "Invalid email or password" (same as wrong password). (2) POST `/api/auth/forgot-password` with nonexistent email → 200 with "If an account exists..." (3) POST `/api/auth/register` with existing email → acceptable to say "already registered". Document any deviations.

### Task 7.2 — E2E Tests (`308eaa29-e3ea-8114-944c-f8fbffe89388`)
Add: Test scenarios using `@nuxt/test-utils/playwright`: (1) Landing page renders hero + features + CTA. (2) `/dashboard` redirects to `/login` when unauthenticated. (3) Register form validates inputs client-side. (4) Login with valid credentials → redirects to `/dashboard`. (5) Dashboard sub-pages render for authenticated users. (6) Logout clears session, redirects to `/`. Mock email verification for register→login flow.

**API calls:** 9 (1 per task page update)

---

## Step 3: Delete Orphaned Template Page

Trash the "Task" template page: `ec2eaa29-e3ea-83e6-b936-8186923fb952`

**API calls:** 1

---

## Step 4: SendGrid → Resend

### 4a. Update Task 0.2 — Install Dependencies
Change body: `@sendgrid/mail` → `resend` in the `bun add` command.

### 4b. Update Task 0.3 — Environment Variables
Change body: `SENDGRID_API_KEY=SG.....` → `RESEND_API_KEY=re_...`

### 4c. Update Task 2.4 — Email Utilities
- Rename: "Create server/utils/email.ts" → "Create server/utils/email.ts (Resend)"
- Update body: Replace SendGrid references with Resend SDK usage (`import { Resend } from 'resend'`)

### 4d. Update WORKFLOW.md on disk
- Replace all `SendGrid` references with `Resend`
- Replace `@sendgrid/mail` with `resend`
- Replace `SENDGRID_API_KEY` with `RESEND_API_KEY`

### 4e. Update .env.example on disk
- Replace `SENDGRID_API_KEY=SG.....` with `RESEND_API_KEY=re_...`

### 4f. Update BASIC_AUTH_PLAN.md on disk
- Replace SendGrid references with Resend

### 4g. Update ARCHITECTURE.md on disk (if it references SendGrid)

**API calls:** 3 Notion + 3-4 file edits

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Notion rate limiting | Low | Small batches of 4-5 parallel calls |
| WORKFLOW.md is planning doc | Low | Safe to edit, no code impact |
| .env.example already committed | Low | Will need a git commit after changes |

---

## Verification

After execution, verify:
- [ ] All 4 sprints have Start/End dates in Notion
- [ ] Plan has Target Date set
- [ ] 9 task descriptions are fleshed out
- [ ] Orphaned "Task" page is trashed
- [ ] All Notion references say "Resend" not "SendGrid"
- [ ] WORKFLOW.md, BASIC_AUTH_PLAN.md, .env.example updated on disk
- [ ] Memory files updated with Resend decision
