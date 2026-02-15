<script setup lang="ts">
interface PlaidAccount {
  id: number
  accountId: string
  name: string
  officialName: string | null
  mask: string | null
  type: string
  subtype: string | null
  currentBalance: string | null
  availableBalance: string | null
  isoCurrencyCode: string | null
  institutionId: string | null
  institutionName: string | null
  itemId: string
  itemStatus: string
  plaidItemId: number
  createdAt: string
  updatedAt: string
}

interface InstitutionGroup {
  name: string
  itemId: string
  status: string
  accounts: PlaidAccount[]
}

const accounts = ref<PlaidAccount[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const checkingStatus = ref(false)

// Disconnect state
const disconnectingItemId = ref<string | null>(null)
const disconnectInstitutionName = ref('')
const disconnectLoading = ref(false)

// Re-auth state
const reauthItemId = ref<string | null>(null)
const { openUpdateLink, loading: plaidLoading } = usePlaidLink(async () => {
  // On successful re-auth, refresh accounts
  reauthItemId.value = null
  await fetchAccounts()
})

async function fetchAccounts() {
  loading.value = true
  error.value = null
  try {
    accounts.value = await $fetch<PlaidAccount[]>('/api/plaid/accounts')
  }
  catch (err: unknown) {
    error.value = handleApiError(err)
  }
  finally {
    loading.value = false
  }
}

async function checkItemStatuses() {
  // Get unique item IDs from accounts
  const itemIds = [...new Set(accounts.value.map(a => a.itemId))]
  if (itemIds.length === 0) return

  checkingStatus.value = true
  try {
    await Promise.allSettled(
      itemIds.map(itemId =>
        $fetch(`/api/plaid/items/${itemId}/status`)
      )
    )
    // Re-fetch accounts to get updated statuses
    accounts.value = await $fetch<PlaidAccount[]>('/api/plaid/accounts')
  }
  catch {
    // Status check failures are non-blocking
  }
  finally {
    checkingStatus.value = false
  }
}

async function refresh() {
  await fetchAccounts()
}

defineExpose({ refresh })

const groupedAccounts = computed<InstitutionGroup[]>(() => {
  const groups = new Map<string, { itemId: string; status: string; accounts: PlaidAccount[] }>()
  for (const account of accounts.value) {
    const key = account.institutionName || 'Unknown Institution'
    if (!groups.has(key)) {
      groups.set(key, { itemId: account.itemId, status: account.itemStatus || 'healthy', accounts: [] })
    }
    groups.get(key)!.accounts.push(account)
  }
  return Array.from(groups.entries()).map(([name, group]) => ({
    name,
    itemId: group.itemId,
    status: group.status,
    accounts: group.accounts,
  }))
})

function openDisconnect(group: InstitutionGroup) {
  disconnectingItemId.value = group.itemId
  disconnectInstitutionName.value = group.name
}

async function handleDisconnect() {
  if (!disconnectingItemId.value) return

  disconnectLoading.value = true
  error.value = null
  try {
    await $fetch(`/api/plaid/items/${disconnectingItemId.value}`, { method: 'DELETE' })
    disconnectingItemId.value = null
    await fetchAccounts()
  }
  catch (err: unknown) {
    error.value = handleApiError(err)
  }
  finally {
    disconnectLoading.value = false
  }
}

async function handleReauth(itemId: string) {
  reauthItemId.value = itemId
  await openUpdateLink(itemId)
}

function badgeColor(type: string): 'success' | 'info' | 'warning' | 'neutral' {
  switch (type) {
    case 'depository': return 'success'
    case 'credit': return 'warning'
    case 'investment': return 'info'
    default: return 'neutral'
  }
}

function accountTypeLabel(type: string, subtype: string | null): string {
  if (subtype) {
    return subtype.charAt(0).toUpperCase() + subtype.slice(1)
  }
  return type.charAt(0).toUpperCase() + type.slice(1)
}

onMounted(async () => {
  await fetchAccounts()
  // Lazy-poll item statuses after initial load
  if (accounts.value.length > 0) {
    checkItemStatuses()
  }
})
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      :title="error"
      icon="i-lucide-alert-circle"
    />

    <div v-else-if="accounts.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
      <UIcon name="i-lucide-landmark" class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
      <p>No bank accounts connected yet.</p>
      <p class="text-sm mt-1">Click Connect Bank to get started.</p>
    </div>

    <div v-else class="space-y-6">
      <div v-if="checkingStatus" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        Checking connection status...
      </div>

      <UCard v-for="group in groupedAccounts" :key="group.name">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="w-5 h-5 text-gray-500" />
              <span class="font-semibold text-gray-900 dark:text-white">{{ group.name }}</span>
              <UBadge v-if="group.status === 'degraded'" color="warning" variant="subtle" size="xs">
                Needs attention
              </UBadge>
            </div>
            <UButton
              variant="ghost"
              color="error"
              size="xs"
              icon="i-lucide-unplug"
              label="Disconnect"
              @click="openDisconnect(group)"
            />
          </div>
        </template>

        <div class="space-y-4">
          <PlaidReauthBanner
            v-if="group.status === 'degraded'"
            :institution-name="group.name"
            :loading="plaidLoading && reauthItemId === group.itemId"
            @reauth="handleReauth(group.itemId)"
          />

          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            <div
              v-for="account in group.accounts"
              :key="account.accountId"
              class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-white truncate">{{ account.name }}</span>
                  <UBadge :color="badgeColor(account.type)" variant="subtle" size="xs">
                    {{ accountTypeLabel(account.type, account.subtype) }}
                  </UBadge>
                </div>
                <p
                  v-if="account.officialName && account.officialName !== account.name"
                  class="text-sm text-gray-500 dark:text-gray-400 truncate"
                >
                  {{ account.officialName }}
                </p>
                <p v-if="account.mask" class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  ****{{ account.mask }}
                </p>
              </div>

              <div v-if="account.currentBalance" class="text-right ml-4">
                <span class="font-semibold text-gray-900 dark:text-white">
                  {{ formatAmount(account.currentBalance) }}
                </span>
                <p v-if="account.availableBalance && account.availableBalance !== account.currentBalance" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatAmount(account.availableBalance) }} available
                </p>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <PlaidDisconnectConfirm
      :open="disconnectingItemId !== null"
      :institution-name="disconnectInstitutionName"
      :loading="disconnectLoading"
      @cancel="disconnectingItemId = null"
      @confirm="handleDisconnect"
    />
  </div>
</template>
