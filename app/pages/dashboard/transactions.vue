<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'Transactions - finai',
})

const { transactions, total, loading, error: txError, fetchTransactions, addTransaction, editTransaction, removeTransaction } = useTransactions()
const { categories, error: catError, fetchCategories } = useCategories()

const pageError = computed(() => txError.value || catError.value)

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const deleteLoading = ref(false)
const editingTransaction = ref<typeof transactions.value[0] | null>(null)
const deletingTransaction = ref<typeof transactions.value[0] | null>(null)

const filters = ref<{ type?: string; categoryId?: number; startDate?: string; endDate?: string }>({})
const page = ref(1)
const limit = 20

const totalPages = computed(() => Math.ceil(total.value / limit))

async function loadData() {
  await fetchTransactions({
    ...filters.value,
    type: filters.value.type as 'income' | 'expense' | undefined,
    limit,
    offset: (page.value - 1) * limit,
  })
}

async function onFilterChange(newFilters: typeof filters.value) {
  filters.value = newFilters
  page.value = 1
  await loadData()
}

async function onAdd(data: Parameters<typeof addTransaction>[0]) {
  try {
    await addTransaction(data)
    showAddModal.value = false
    await loadData()
  }
  catch (err: any) {
    throw err
  }
}

async function onEdit(data: Parameters<typeof addTransaction>[0]) {
  if (!editingTransaction.value) return
  try {
    await editTransaction(editingTransaction.value.id, data)
    showEditModal.value = false
    editingTransaction.value = null
    await loadData()
  }
  catch (err: any) {
    throw err
  }
}

function openEdit(transaction: typeof transactions.value[0]) {
  editingTransaction.value = transaction
  showEditModal.value = true
}

function openDelete(transaction: typeof transactions.value[0]) {
  deletingTransaction.value = transaction
  showDeleteModal.value = true
}

async function onConfirmDelete() {
  if (!deletingTransaction.value) return
  deleteLoading.value = true
  try {
    await removeTransaction(deletingTransaction.value.id)
    showDeleteModal.value = false
    deletingTransaction.value = null
    await loadData()
  }
  finally {
    deleteLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchCategories(), loadData()])
})

watch(page, loadData)
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Transactions
      </h1>
      <UButton icon="i-lucide-plus" label="Add Transaction" @click="showAddModal = true" />
    </div>

    <TransactionsTransactionFilters
      :categories="categories"
      class="mb-6"
      @filter-change="onFilterChange"
    />

    <UAlert
      v-if="pageError"
      color="error"
      :title="pageError"
      icon="i-lucide-alert-circle"
      class="mb-4"
    />

    <TransactionsTransactionList
      :transactions="transactions"
      :loading="loading"
      @edit="openEdit"
      @delete="openDelete"
    />

    <div v-if="totalPages > 1" class="flex justify-center mt-6">
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <!-- Add Modal -->
    <UModal v-model:open="showAddModal">
      <template #header>
        <h3 class="text-lg font-semibold">Add Transaction</h3>
      </template>
      <div class="p-4">
        <TransactionsTransactionForm
          :categories="categories"
          @submit="onAdd"
          @cancel="showAddModal = false"
        />
      </div>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="showEditModal">
      <template #header>
        <h3 class="text-lg font-semibold">Edit Transaction</h3>
      </template>
      <div class="p-4">
        <TransactionsTransactionForm
          v-if="editingTransaction"
          :transaction="editingTransaction"
          :categories="categories"
          @submit="onEdit"
          @cancel="showEditModal = false"
        />
      </div>
    </UModal>

    <!-- Delete Confirmation -->
    <TransactionsTransactionDeleteConfirm
      :open="showDeleteModal"
      :description="deletingTransaction?.description"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
