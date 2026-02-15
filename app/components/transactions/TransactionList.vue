<script setup lang="ts">
interface Transaction {
  id: number
  type: 'income' | 'expense'
  amount: string
  description: string
  date: string
  notes: string | null
  category: { id: number; name: string; icon: string | null; color: string | null } | null
}

defineProps<{
  transactions: Transaction[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [transaction: Transaction]
  delete: [transaction: Transaction]
}>()
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <div v-else-if="transactions.length === 0" role="status" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <UIcon name="i-lucide-arrow-left-right" class="w-8 h-8 text-gray-400" />
      </div>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        No transactions yet
      </h2>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        Add your first transaction to start tracking your finances.
      </p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="t in transactions"
        :key="t.id"
        class="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900 dark:text-white truncate">{{ t.description }}</span>
            <UBadge v-if="t.category" variant="subtle" size="xs">
              {{ t.category.name }}
            </UBadge>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(t.date) }}
          </p>
        </div>

        <span
          class="font-semibold whitespace-nowrap"
          :class="t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
        >
          {{ t.type === 'income' ? '+' : '-' }}{{ formatAmount(t.amount) }}
        </span>

        <div class="flex gap-1">
          <UButton
            variant="ghost"
            icon="i-lucide-pencil"
            size="xs"
            aria-label="Edit transaction"
            @click="emit('edit', t)"
          />
          <UButton
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            size="xs"
            aria-label="Delete transaction"
            @click="emit('delete', t)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
