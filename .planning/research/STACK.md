# Stack Research

**Domain:** Plaid Banking Integration + Local AI Financial Analytics
**Researched:** 2026-02-15
**Confidence:** MEDIUM (Plaid stack is HIGH, AI SDK layer is MEDIUM due to rapid v6 changes)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `plaid` (plaid-node) | ^41.1.0 | Server-side Plaid API client | Official SDK, auto-generated from OpenAPI spec, monthly updates, TypeScript types included. No alternatives worth considering. **HIGH confidence** |
| Plaid Link JS (CDN) | v2/stable | Client-side bank account linking UI | Plaid's official drop-in — loaded from `cdn.plaid.com/link/v2/stable/link-initialize.js`. Not versioned; always latest. Use vanilla JS API directly in Vue composable rather than third-party Vue wrapper. **HIGH confidence** |
| `ai` (Vercel AI SDK) | ^6.0.86 | Unified LLM abstraction layer | Framework-agnostic AI toolkit with first-class Nuxt support via `@ai-sdk/vue`. Provides streaming, tool calling, structured output. v6 is current stable. **MEDIUM confidence** |
| `@ai-sdk/vue` | ^3.0.68 | Vue/Nuxt composables for AI chat | Official Vue bindings. In v6, `useChat` was replaced by `new Chat()` class pattern (still reactive, just class-based). Provides `Chat`, `useCompletion`, `useObject`. **MEDIUM confidence** |
| `ai-sdk-ollama` | ^3.x | Ollama provider for AI SDK | Recommended over `ollama-ai-provider-v2` for advanced use. Supports tool calling with complete responses, native Ollama features (mirostat, repeat_penalty, num_ctx), and web search. v3+ requires AI SDK v6. **MEDIUM confidence** |
| Ollama (runtime) | Latest | Local LLM inference server | Industry standard for local model hosting. REST API on localhost:11434. Pull models with `ollama pull`. No npm package needed for server — only the system install. **HIGH confidence** |

### Database Additions

No new database technology needed. Existing PostgreSQL + Drizzle ORM stack handles all Plaid data storage (access tokens, items, accounts, synced transactions, transfer records).

| Addition | Purpose | Notes |
|----------|---------|-------|
| New Drizzle tables | Store Plaid items, accounts, synced transactions, transfer history, AI chat history | Extend existing `server/database/schema/` |
| `numeric(12,2)` columns | Financial amounts from Plaid | Matches existing transaction amount pattern |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ollama` (npm) | ^0.6.3 | Direct Ollama JS client | Only if bypassing AI SDK for raw Ollama API access (health checks, model management). Not needed for chat — AI SDK handles that. **LOW confidence on needing this** |
| `@jcss/vue-plaid-link` | ^1.1.3 | Vue 3 Plaid Link composable | Alternative to vanilla JS approach. Last published ~7 months ago, community-maintained. Consider only if vanilla JS composable proves cumbersome. **LOW confidence — prefer vanilla JS** |
| `zod` | ^3.x | Schema validation for AI SDK | Required by AI SDK for structured output and tool definitions. Already industry standard. **HIGH confidence** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Plaid Sandbox | Testing with fake bank data | Free, full-featured. Use `PlaidEnvironments.sandbox` in dev. Test credentials: `user_good`/`pass_good` |
| Plaid Development env | Testing with real bank data | Free, no billing. Request access from Plaid dashboard. Use for pre-production validation |
| Ollama CLI | Local model management | `ollama pull`, `ollama list`, `ollama rm`. Install via system package manager |

## Installation

```bash
# Plaid integration
bun add plaid

# AI SDK core + Vue bindings + Ollama provider
bun add ai @ai-sdk/vue ai-sdk-ollama

# Structured output (AI SDK dependency)
bun add zod
```

No new dev dependencies required. Existing Playwright setup covers E2E testing for new features.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Plaid Link vanilla JS (CDN) | `@jcss/vue-plaid-link` | If you want a ready-made Vue composable. But it's community-maintained, last updated 7 months ago, and the vanilla JS API is simple enough to wrap in a 30-line composable |
| AI SDK + `ai-sdk-ollama` | Direct `ollama` npm package | If you never plan to swap models or add cloud LLM fallback. AI SDK abstracts the provider so you could later add OpenAI/Anthropic as fallback without rewriting |
| AI SDK + `ai-sdk-ollama` | `@langchain/ollama` | If you need complex RAG chains. LangChain adds significant complexity; AI SDK is lighter and has native Nuxt support. Only consider LangChain if building multi-document RAG pipelines |
| `ai-sdk-ollama` v3 | `ollama-ai-provider-v2` | If you only need basic text generation without tool calling. `ollama-ai-provider-v2` uses direct HTTP (simpler) but lacks reliable tool calling |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `vue-plaid-link` (original) | Last published 4 years ago, no Vue 3 support | Vanilla JS from CDN or `@jcss/vue-plaid-link` |
| `ollama-node` | Not the official package, confusing naming | `ollama` (official) or `ai-sdk-ollama` (for AI SDK) |
| `react-plaid-link` | React-specific, irrelevant for Vue/Nuxt | Vanilla JS Plaid Link |
| LangChain (for this project) | Massive dependency graph, over-engineered for conversational analytics on personal finance data | AI SDK with Ollama provider |
| `ai-sdk-ollama@^2.x` | Only compatible with AI SDK v5, which is superseded | `ai-sdk-ollama@^3.x` for AI SDK v6 |
| Storing Plaid access tokens unencrypted | Security risk — access tokens grant ongoing bank access | Encrypt at rest in database (use `nuxt-auth-utils` sealed pattern or Node.js `crypto`) |

## Stack Patterns by Variant

**For Plaid Link (client-side):**
- Load CDN script in Nuxt plugin or `useHead()`
- Create `usePlaidLink()` composable wrapping `Plaid.create()` / `open()` / `destroy()`
- Server creates link tokens via `POST /api/plaid/link-token`
- On success callback, exchange public token server-side via `POST /api/plaid/exchange-token`

**For Plaid Webhooks:**
- Register webhook URL during link token creation
- Verify with JWT signature in `Plaid-Verification` header (SHA-256 body check + 5-min freshness)
- Handle `TRANSACTIONS_SYNC`, `ITEM_ERROR`, `TRANSFER_EVENTS_UPDATE` webhook types
- Use ngrok (already configured) for local webhook testing

**For AI Chat:**
- Server route at `server/api/ai/chat.ts` using AI SDK `streamText()`
- Client uses `new Chat()` from `@ai-sdk/vue` (v6 pattern, replaces `useChat()`)
- System prompt includes user's financial context (balances, spending patterns, categories)
- Tool definitions for querying transactions, getting balances, calculating trends

**For Ollama model selection:**
- **Primary recommendation:** `mistral` (7B) — best efficiency/quality ratio for personal finance Q&A on consumer hardware
- **If more capable needed:** `llama3.1:8b` — stronger reasoning, slightly higher resource use
- **Finance-specific option:** `finance-llama-8b` (fine-tuned Llama 3.1 8B on 500k finance examples) — only if general models underperform on finance queries. **LOW confidence — verify model quality before committing**

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `ai@^6.x` | `@ai-sdk/vue@^3.x` | v6 SDK requires v3 Vue bindings. Do NOT mix v5 `ai` with v3 `@ai-sdk/vue` |
| `ai-sdk-ollama@^3.x` | `ai@^6.x` | v3 provider requires AI SDK v6. Use `ai-sdk-ollama@^2.2.0` for AI SDK v5 |
| `plaid@^41.x` | Plaid API `2020-09-14` | API version is fixed in the SDK. SDK handles versioning automatically |
| `plaid@^41.x` | Node.js 18+ | Inferred from modern ESM patterns. **LOW confidence — verify** |
| `ai@^6.x` | Nuxt 4 / Nitro | AI SDK server functions work in Nitro API routes. Streaming uses standard Web Streams API |

## Plaid Environment Configuration

```typescript
// server/utils/plaid.ts
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)
```

Required environment variables:
```bash
PLAID_CLIENT_ID=       # From Plaid dashboard
PLAID_SECRET=          # Sandbox or Development secret
PLAID_ENV=sandbox      # sandbox | development | production
```

## AI SDK Server Route Pattern

```typescript
// server/api/ai/chat.ts
import { streamText } from 'ai'
import { ollama } from 'ai-sdk-ollama'

export default defineLazyEventHandler(async () => {
  return defineEventHandler(async (event) => {
    const { messages } = await readBody(event)

    const result = streamText({
      model: ollama('mistral'),
      system: 'You are a personal finance assistant...',
      messages,
    })

    return result.toDataStreamResponse()
  })
})
```

## Sources

- [plaid-node GitHub](https://github.com/plaid/plaid-node) — SDK version 41.1.0, Configuration/PlaidApi pattern (HIGH confidence)
- [Plaid Link Web docs](https://plaid.com/docs/link/web/) — Vanilla JS integration, CDN loading, `Plaid.create()` API (HIGH confidence)
- [Plaid Transfer API docs](https://plaid.com/docs/api/products/transfer/) — ACH/RTP transfer capabilities (HIGH confidence)
- [Plaid Sandbox docs](https://plaid.com/docs/sandbox/) — Free testing environment details (HIGH confidence)
- [Plaid Webhook Verification docs](https://plaid.com/docs/api/webhooks/webhook-verification/) — JWT verification process (HIGH confidence)
- [AI SDK Nuxt getting started](https://ai-sdk.dev/docs/getting-started/nuxt) — `ai` + `@ai-sdk/vue` setup (MEDIUM confidence)
- [AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6) — v6 changes, Chat class pattern (MEDIUM confidence)
- [AI SDK v6 useChat discussion](https://github.com/vercel/ai/discussions/7510) — Chat class replaces useChat composable (MEDIUM confidence)
- [AI SDK Ollama community providers](https://ai-sdk.dev/providers/community-providers/ollama) — `ai-sdk-ollama` vs `ollama-ai-provider-v2` (MEDIUM confidence)
- [ai-sdk-ollama npm](https://www.npmjs.com/package/ai-sdk-ollama) — v3 requires AI SDK v6 (MEDIUM confidence)
- [ollama npm](https://www.npmjs.com/package/ollama) — v0.6.3, official JS client (MEDIUM confidence)
- [@jcss/vue-plaid-link npm](https://www.npmjs.com/package/@jcss/vue-plaid-link) — Vue 3 Plaid Link wrapper, v1.1.3 (LOW confidence — community maintained)
- [Finance-Llama-8B on Ollama](https://ollama.com/martain7r/finance-llama-8b) — Finance-specific model option (LOW confidence)

---
*Stack research for: Plaid Banking Integration + Local AI Financial Analytics*
*Researched: 2026-02-15*
