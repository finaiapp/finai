<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'Dashboard - finai',
})

const { summary, loading, error: summaryError, fetchSummary } = useDashboardSummary()
const { transactions, error: txError, fetchTransactions } = useTransactions()

const pageError = computed(() => summaryError.value || txError.value)

onMounted(async () => {
  await Promise.all([
    fetchSummary(),
    fetchTransactions({ limit: 5 }),
  ])
})

const cards = computed(() => [
  {
    icon: 'i-lucide-landmark',
    label: 'Total Balance',
    value: summary.value ? formatAmount(summary.value.totalBalance) : '$0.00',
  },
  {
    icon: 'i-lucide-trending-down',
    label: 'Monthly Spending',
    value: summary.value ? formatAmount(summary.value.monthlySpending) : '$0.00',
  },
  {
    icon: 'i-lucide-receipt',
    label: 'Recent Transactions',
    value: summary.value ? String(summary.value.recentTransactionCount) : '0',
  },
  {
    icon: 'i-lucide-pie-chart',
    label: 'Budget Status',
    value: 'No budgets',
  },
])
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
      Dashboard
    </h1>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <UAlert
      v-if="pageError"
      color="error"
      :title="pageError"
      icon="i-lucide-alert-circle"
      class="mb-6"
    />

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardOverviewCard
          v-for="card in cards"
          :key="card.label"
          :icon="card.icon"
          :label="card.label"
          :value="card.value"
        />
      </div>

      <div class="mt-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Transactions
          </h2>
          <UButton to="/dashboard/transactions" variant="ghost" label="View All" trailing-icon="i-lucide-arrow-right" />
        </div>

        <div v-if="transactions.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No transactions yet. Start tracking your finances!</p>
          <UButton to="/dashboard/transactions" label="Add Transaction" class="mt-3" />
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="t in transactions"
            :key="t.id"
            class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div>
              <span class="font-medium text-gray-900 dark:text-white">{{ t.description }}</span>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(t.date) }}</p>
            </div>
            <span
              class="font-semibold"
              :class="t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ t.type === 'income' ? '+' : '-' }}{{ formatAmount(t.amount) }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
