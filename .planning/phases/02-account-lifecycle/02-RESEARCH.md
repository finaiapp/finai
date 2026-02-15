# Phase 2: Account Lifecycle - Research

**Researched:** 2026-02-15
**Domain:** Plaid item removal, connection health monitoring, Link update mode re-authentication
**Confidence:** HIGH

## Summary

Phase 2 adds two capabilities to the existing Plaid integration: disconnecting bank accounts and re-authenticating degraded connections. Both are well-documented Plaid patterns with dedicated API endpoints and SDK methods already available in the project's plaid-node v41.x dependency.

Account disconnection requires calling `plaidClient.itemRemove()` with the decrypted access token, then cascading deletion through the local database (plaid_items -> plaid_accounts -> sync_cursors via existing ON DELETE CASCADE constraints). The database schema already has the cascade relationships in place, so deleting the plaid_items row automatically removes associated plaid_accounts and sync_cursors rows.

Connection health tracking requires monitoring the `status` field on plaid_items (already in the schema, defaults to 'healthy') and updating it when degradation is detected. Without webhooks (Phase 3 scope), the initial approach will be polling-based: checking item status via `plaidClient.itemGet()` when accounts are loaded, and providing a manual status check. For re-authentication, Plaid Link's update mode is triggered by creating a link token with `access_token` instead of `products` -- the existing `usePlaidLink` composable and link-token endpoint need to support this alternate flow. Critically, in update mode, no token exchange is needed -- the existing access_token remains valid after successful re-authentication.

**Primary recommendation:** Implement disconnect as a DELETE endpoint with Plaid API call + DB cascade. Implement re-auth by extending the existing link-token endpoint to accept an `item_id` parameter that triggers update mode (passing `access_token` instead of `products`). Add a status check endpoint that calls `plaidClient.itemGet()` and updates the local status field. Surface degraded status in the accounts UI with a re-auth banner.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `plaid` (plaid-node) | ^41.1.0 | `itemRemove()`, `itemGet()`, `linkTokenCreate()` with access_token for update mode | Already installed. Official SDK with TypeScript types for all required methods |
| Plaid Link JS (CDN) | v2/stable | Re-authentication UI via update mode | Already loaded via client plugin. Same CDN script handles both initial and update mode |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Drizzle ORM (existing) | ^0.45.1 | Delete plaid_items rows (cascades to accounts), update status field | Already in project |
| Nuxt UI (existing) | v4 | UModal for disconnect confirmation, UAlert for degraded banners | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Polling item status on page load | Webhooks (ITEM_LOGIN_REQUIRED) | Webhooks are the proper solution but require Phase 3 webhook infrastructure. Polling is simpler for now and can be replaced later |
| Manual status check button | Automatic background polling | Background polling adds complexity; manual check is sufficient for a personal finance app |

**Installation:**
No new dependencies needed. All required functionality is available in the existing `plaid` package.

## Architecture Patterns

### Recommended Project Structure
```
server/
  api/
    plaid/
      items/
        [itemId].delete.ts    # DELETE /api/plaid/items/:itemId (disconnect)
        [itemId]/
          status.get.ts       # GET /api/plaid/items/:itemId/status (check health)
      link-token.post.ts      # MODIFY: accept optional item_id for update mode
  utils/
    plaid-accounts.ts         # ADD: deletePlaidItem(), updatePlaidItemStatus(), getPlaidItemById()
app/
  composables/
    usePlaidLink.ts           # MODIFY: add openUpdateLink(itemId) for re-auth flow
  components/
    plaid/
      AccountsList.vue        # MODIFY: add disconnect button per institution group, degraded banner
      DisconnectConfirm.vue    # NEW: UModal confirmation dialog
      ReauthBanner.vue         # NEW: degraded connection alert with re-auth button
```

### Pattern 1: Item Disconnect (Server-Side)
**What:** Delete a Plaid item by calling Plaid API to revoke the access token, then remove from local database
**When to use:** User clicks "Disconnect" on a linked institution
**Example:**
```typescript
// server/api/plaid/items/[itemId].delete.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const itemId = getRouterParam(event, 'itemId')

  // 1. Get decrypted access token (verifies ownership)
  const accessToken = await getPlaidItemAccessToken(itemId, session.user.id)

  // 2. Revoke at Plaid (invalidates access token)
  try {
    await plaidClient.itemRemove({ access_token: accessToken })
  } catch (error) {
    // If Plaid says token is already invalid, still proceed with local cleanup
    const plaidErr = extractPlaidError(error)
    if (plaidErr.statusCode !== 400) throw createError(plaidErr)
  }

  // 3. Delete from local DB (cascades to plaid_accounts, sync_cursors)
  await deletePlaidItem(itemId, session.user.id)

  return { success: true }
})
```
Source: [Plaid Items API - POST /item/remove](https://plaid.com/docs/api/items/#itemremove)

### Pattern 2: Link Token for Update Mode
**What:** Create a link token that opens Plaid Link in update mode for re-authentication, passing `access_token` instead of `products`
**When to use:** When a plaid_item has status other than 'healthy' and user clicks "Re-authenticate"
**Example:**
```typescript
// Modified server/api/plaid/link-token.post.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody<{ item_id?: string }>(event)

  let linkConfig: any = {
    user: { client_user_id: String(session.user.id) },
    client_name: 'finai',
    country_codes: [CountryCode.Us],
    language: 'en',
  }

  if (body?.item_id) {
    // Update mode: pass access_token, omit products
    const accessToken = await getPlaidItemAccessToken(body.item_id, session.user.id)
    linkConfig.access_token = accessToken
  } else {
    // Normal mode: pass products
    linkConfig.products = [Products.Transactions]
  }

  const response = await plaidClient.linkTokenCreate(linkConfig)
  return { link_token: response.data.link_token }
})
```
Source: [Plaid Link Update Mode](https://plaid.com/docs/link/update-mode/)

### Pattern 3: Update Mode Client Flow
**What:** In update mode, onSuccess does NOT receive a public_token to exchange. The existing access_token remains valid. Just update the local item status back to 'healthy'.
**When to use:** After user completes Plaid Link update mode flow
**Example:**
```typescript
// Extending usePlaidLink composable
async function openUpdateLink(itemId: string) {
  loading.value = true
  error.value = null

  const { link_token } = await $fetch<{ link_token: string }>('/api/plaid/link-token', {
    method: 'POST',
    body: { item_id: itemId },
  })

  await $plaidLinkReady
  handler = window.Plaid.create({
    token: link_token,
    onSuccess: async () => {
      // No token exchange needed in update mode!
      // Just update the item status back to healthy
      await $fetch(`/api/plaid/items/${itemId}/status`, {
        method: 'PATCH',
        body: { status: 'healthy' },
      })
      success.value = true
      if (onSuccessCallback) await onSuccessCallback()
      loading.value = false
    },
    onExit: (err) => {
      if (err) error.value = err.display_message || 'Re-authentication cancelled'
      loading.value = false
    },
  })
  handler.open()
}
```
Source: [Plaid Link Update Mode - no token exchange](https://plaid.com/docs/link/update-mode/)

### Pattern 4: Item Status Check
**What:** Call `plaidClient.itemGet()` to check the current status of an item at Plaid
**When to use:** On accounts page load or when user requests a status refresh
**Example:**
```typescript
// server/api/plaid/items/[itemId]/status.get.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const itemId = getRouterParam(event, 'itemId')

  const accessToken = await getPlaidItemAccessToken(itemId, session.user.id)

  try {
    const response = await plaidClient.itemGet({ access_token: accessToken })
    const item = response.data.item
    const newStatus = item.error ? 'degraded' : 'healthy'

    // Update local status
    await updatePlaidItemStatus(itemId, session.user.id, newStatus)

    return {
      status: newStatus,
      error: item.error ? {
        error_code: item.error.error_code,
        display_message: item.error.display_message,
      } : null,
    }
  } catch (error) {
    const { statusCode, message } = extractPlaidError(error)
    throw createError({ statusCode, statusMessage: message })
  }
})
```
Source: [Plaid Items API - POST /item/get](https://plaid.com/docs/api/items/#itemget)

### Anti-Patterns to Avoid
- **Deleting local DB rows without calling Plaid API first:** The access token stays valid at Plaid, potentially accumulating billing charges for subscription products. Always call `itemRemove()` first.
- **Exchanging tokens after update mode:** Update mode does NOT give you a new public_token. The existing access_token stays valid. Attempting to exchange will fail.
- **Passing `products` in update mode link token:** When `access_token` is provided, the `products` array should be omitted (unless adding a new product like Assets). Including products can cause errors or unexpected behavior.
- **Ignoring itemRemove errors:** If the access token is already invalid (e.g., user revoked via bank), the remove call will fail. Catch this and still clean up local data.
- **Not verifying ownership on disconnect:** Always check that the plaid_item belongs to the requesting user before allowing deletion or access token decryption.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token revocation | Custom token invalidation | `plaidClient.itemRemove()` | Plaid manages token lifecycle. Only they can truly invalidate an access token |
| Re-authentication UI | Custom credential collection | Plaid Link update mode | Link handles institution-specific MFA, OAuth refresh, and credential validation |
| Connection health checking | Custom polling of bank APIs | `plaidClient.itemGet()` | Returns the item's error state directly. Plaid tracks connection health internally |
| Confirmation dialogs | Custom modal implementation | `UModal` from Nuxt UI v4 | Already in the project, handles a11y, animations, backdrop |

**Key insight:** Both disconnect and re-auth are thin wrappers around Plaid SDK methods. The main work is in the UI (confirmation dialogs, status banners) and the database lifecycle management (cascade deletes, status field updates).

## Common Pitfalls

### Pitfall 1: Not Cleaning Up Plaid-Side Before Local Delete
**What goes wrong:** Developer deletes the plaid_items row from the database but forgets to call `itemRemove()` at Plaid. The access token remains active at Plaid, and for subscription products, billing continues.
**Why it happens:** It is tempting to just do the database operation since ON DELETE CASCADE handles all local cleanup.
**How to avoid:** Always call `plaidClient.itemRemove()` BEFORE deleting from the local database. If the Plaid call fails with a 400 (token already invalid), still proceed with local cleanup.
**Warning signs:** Plaid dashboard showing items that user thinks they disconnected.
**Confidence:** HIGH -- [Plaid docs explicitly recommend itemRemove](https://plaid.com/docs/api/items/#itemremove)

### Pitfall 2: Treating Update Mode Like Initial Link
**What goes wrong:** After update mode completes, the client tries to exchange a public_token. This fails because update mode does not return a new public_token -- the original access_token remains valid and unchanged.
**Why it happens:** The onSuccess callback signature is the same for both initial and update mode, so developers reuse the same handler.
**How to avoid:** In the composable, provide a separate `openUpdateLink()` function whose onSuccess handler does NOT call the exchange endpoint. Instead, it should update the local item status to 'healthy'.
**Warning signs:** 400 errors from `/item/public_token/exchange` after update mode, or "invalid public token" errors.
**Confidence:** HIGH -- [Plaid update mode docs](https://plaid.com/docs/link/update-mode/)

### Pitfall 3: Not Handling the "Already Invalid" Token Case on Disconnect
**What goes wrong:** User's bank connection was revoked from the bank side (user changed password, revoked OAuth consent). When they click "Disconnect" in finai, `itemRemove()` fails because the access token is already invalid. The error bubbles up and the user cannot disconnect.
**Why it happens:** No error handling around the Plaid API call.
**How to avoid:** Catch errors from `itemRemove()`. If the error indicates the token is already invalid (typically a 400 status), proceed with local database cleanup anyway. Log the Plaid error but do not block the user.
**Warning signs:** Users seeing error messages when trying to disconnect already-broken connections.
**Confidence:** HIGH

### Pitfall 4: Race Condition with Cascade Deletes and Related Data
**What goes wrong:** If Phase 3 (transaction sync) has been implemented, deleting a plaid_item cascades to plaid_accounts. If there are plaid_transactions referencing those accounts, the cascade must handle them too. This can be a problem if FK constraints are not set up correctly in advance.
**Why it happens:** Schema design does not anticipate future tables that will reference plaid_accounts.
**How to avoid:** The current schema has ON DELETE CASCADE from plaid_accounts to plaid_items. When plaid_transactions are added in Phase 3, they should also reference plaid_accounts (or plaid_items) with ON DELETE CASCADE. For now, no issue since plaid_transactions do not exist yet.
**Warning signs:** Foreign key constraint violations during disconnect.
**Confidence:** HIGH -- schema already reviewed

### Pitfall 5: Using item_id (DB primary key) vs itemId (Plaid's item_id)
**What goes wrong:** Confusion between the local database `id` (serial auto-increment) and Plaid's `item_id` string. Using the wrong one in API calls causes "not found" errors.
**Why it happens:** The schema has both `id` (PK) and `itemId` (Plaid's identifier). API routes might use either.
**How to avoid:** Use Plaid's `itemId` string as the route parameter (it is the natural identifier users can see). In server utils, look up by `plaidItems.itemId` (the Plaid identifier), not `plaidItems.id` (the DB PK). The existing `getPlaidItemAccessToken` already uses `plaidItems.itemId`.
**Warning signs:** Queries returning no results when the item clearly exists.
**Confidence:** HIGH -- existing code reviewed

## Code Examples

Verified patterns from official sources:

### Item Removal (plaid-node SDK)
```typescript
// Source: https://plaid.com/docs/api/items/#itemremove
const request = {
  access_token: accessToken,
};
try {
  const response = await plaidClient.itemRemove(request);
  // The Item was removed, access_token is now invalid
} catch (error) {
  // handle error
}
```

### Item Get (Check Status)
```typescript
// Source: https://plaid.com/docs/api/items/#itemget
const response = await plaidClient.itemGet({ access_token: accessToken });
const item = response.data.item;
// item.error is null if healthy, or an object with error_code, error_message, display_message
```

### Link Token for Update Mode (No Products)
```typescript
// Source: https://plaid.com/docs/link/update-mode/
const configs = {
  user: { client_user_id: 'UNIQUE_USER_ID' },
  client_name: 'finai',
  country_codes: [CountryCode.Us],
  language: 'en',
  access_token: decryptedAccessToken, // triggers update mode
  // NOTE: no products array!
};
const linkTokenResponse = await plaidClient.linkTokenCreate(configs);
```

### Sandbox: Force ITEM_LOGIN_REQUIRED (for Testing)
```typescript
// Source: https://plaid.com/docs/api/sandbox/#sandboxitemresetlogin
import { SandboxItemResetLoginRequest } from 'plaid';

const request: SandboxItemResetLoginRequest = {
  access_token: accessToken,
};
const response = await plaidClient.sandboxItemResetLogin(request);
// Item is now in ITEM_LOGIN_REQUIRED state
// Test update mode flow to restore it
```

### Disconnect Confirmation Modal (Nuxt UI v4)
```vue
<!-- Using UModal pattern established in Phase 8 transactions -->
<UModal v-model:open="showConfirm">
  <template #header>
    <h3>Disconnect {{ institutionName }}?</h3>
  </template>
  <p>This will remove all accounts from {{ institutionName }}.
     Any synced transactions will be preserved.</p>
  <template #footer>
    <div class="flex justify-end gap-2">
      <UButton variant="ghost" label="Cancel" @click="showConfirm = false" />
      <UButton color="error" label="Disconnect" :loading="disconnecting" @click="handleDisconnect" />
    </div>
  </template>
</UModal>
```

### Degraded Connection Banner
```vue
<!-- UAlert pattern from existing error displays -->
<UAlert
  v-if="item.status === 'degraded'"
  color="warning"
  icon="i-lucide-alert-triangle"
  title="Connection needs attention"
  description="Your bank connection requires re-authentication."
>
  <template #actions>
    <UButton label="Re-authenticate" @click="openUpdateLink(item.itemId)" />
  </template>
</UAlert>
```

### Database: Delete Plaid Item with Ownership Check
```typescript
// server/utils/plaid-accounts.ts addition
export async function deletePlaidItem(itemId: string, userId: number): Promise<boolean> {
  const result = await db
    .delete(plaidItems)
    .where(and(eq(plaidItems.itemId, itemId), eq(plaidItems.userId, userId)))
    .returning({ id: plaidItems.id })

  return result.length > 0
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `itemPublicTokenCreate` for update mode | `linkTokenCreate` with `access_token` param | 2021 (Link token migration) | Must use linkTokenCreate, not the old public token flow |
| Webhook-only degradation detection | Polling via `itemGet()` + webhooks | Ongoing | Polling works without webhook infrastructure; webhooks are additive improvement |
| No reason codes on item/remove | Optional `reason_code` and `reason_note` fields | Recent | Can pass structured reason for Plaid's records (optional, not required) |

**Deprecated/outdated:**
- `itemPublicTokenCreate` for initializing update mode -- replaced by `linkTokenCreate` with `access_token`. The old endpoint still works but is deprecated.
- Plaid Development environment -- removed June 2024. Use Sandbox for testing disconnect/re-auth flows.

## Open Questions

1. **Should disconnect preserve or delete Plaid-synced transactions?**
   - What we know: ON DELETE CASCADE will remove plaid_accounts rows. The roadmap says plaid_transactions (Phase 3) will be in a separate table.
   - What's unclear: Whether disconnecting should cascade-delete synced transactions or preserve them as historical data.
   - Recommendation: For Phase 2, this is not an issue since plaid_transactions do not exist yet. When Phase 3 adds them, the FK relationship should use SET NULL (not CASCADE) on the plaid_account reference, preserving transaction history even after disconnect. Flag this as a design decision for Phase 3.

2. **When to check item health without webhooks?**
   - What we know: Webhooks (Phase 3) will push ITEM_LOGIN_REQUIRED events. Without webhooks, we must poll.
   - What's unclear: Optimal polling frequency for a personal app.
   - Recommendation: Check item status when the accounts page loads (lazy check). Add a manual "Check Status" button. Do not add background polling -- it adds complexity with minimal value for a single-user personal app. When webhooks are added in Phase 3, the polling approach can be supplemented or replaced.

3. **Should the status field track more granular states?**
   - What we know: Current schema has `status varchar(50) default 'healthy'`. Plaid has multiple error states (ITEM_LOGIN_REQUIRED, ITEM_NOT_SUPPORTED, etc.).
   - What's unclear: Whether to store the specific Plaid error code or just 'healthy'/'degraded'.
   - Recommendation: Use two states for now: 'healthy' and 'degraded'. Store the Plaid error code in a separate column or in the response only if needed for UI messages. Keep it simple -- the user action is the same regardless of error subtype (re-authenticate via Link update mode).

## Sources

### Primary (HIGH confidence)
- [Plaid Items API - itemRemove](https://plaid.com/docs/api/items/#itemremove) -- item removal endpoint, request/response, SDK method name
- [Plaid Link Update Mode](https://plaid.com/docs/link/update-mode/) -- creating link tokens for update mode, no token exchange needed, access_token parameter
- [Plaid Items API - itemGet](https://plaid.com/docs/api/items/#itemget) -- checking item status, error field on item object
- [Plaid Items API - ITEM webhooks](https://plaid.com/docs/api/items/#item-webhooks) -- ERROR, PENDING_EXPIRATION, PENDING_DISCONNECT webhook types
- [Plaid Sandbox API](https://plaid.com/docs/api/sandbox/) -- sandboxItemResetLogin for testing ITEM_LOGIN_REQUIRED state
- Context7 `/websites/plaid` -- verified itemRemove, linkTokenCreate with access_token, webhook structures, sandbox testing endpoints

### Secondary (MEDIUM confidence)
- [Plaid Link OAuth guide](https://plaid.com/docs/link/oauth/) -- consent revocation handling, managing disconnected items
- plaid-node SDK TypeScript declarations (local `node_modules/plaid/dist/api.d.ts`) -- verified method signatures: `itemRemove()`, `itemGet()`, `sandboxItemResetLogin()`, `LinkTokenCreateRequest.access_token`

### Tertiary (LOW confidence)
- None. All findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies needed, all methods verified in installed SDK
- Architecture: HIGH -- extends existing patterns (server utils, composables, Nuxt UI components), cascade deletes already configured in schema
- Pitfalls: HIGH -- all documented in official Plaid docs, update mode "no exchange" behavior explicitly stated
- Code examples: HIGH -- SDK method signatures verified against local type declarations

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (Plaid API is stable at version 2020-09-14; SDK methods are well-established)
