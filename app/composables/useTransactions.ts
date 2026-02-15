interface TransactionCategory {
  id: number
  name: string
  icon: string | null
  color: string | null
}

interface Transaction {
  id: number
  type: 'income' | 'expense'
  amount: string
  description: string
  date: string
  notes: string | null
  categoryId: number | null
  category: TransactionCategory | null
  createdAt: string
}

interface TransactionFilters {
  type?: 'income' | 'expense'
  categoryId?: number
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

interface TransactionsResponse {
  items: Transaction[]
  total: number
}

export function useTransactions() {
  const transactions = ref<Transaction[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTransactions(filters: TransactionFilters = {}) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.categoryId !== undefined) params.set('categoryId', String(filters.categoryId))
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.limit) params.set('limit', String(filters.limit))
      if (filters.offset) params.set('offset', String(filters.offset))

      const query = params.toString()
      const data = await $fetch<TransactionsResponse>(`/api/transactions${query ? `?${query}` : ''}`)
      transactions.value = data.items
      total.value = data.total
    }
    catch (err: any) {
      error.value = handleApiError(err)
    }
    finally {
      loading.value = false
    }
  }

  async function addTransaction(data: {
    type: 'income' | 'expense'
    amount: string
    description: string
    date: string
    categoryId?: number
    notes?: string
  }) {
    const transaction = await $fetch<Transaction>('/api/transactions', {
      method: 'POST',
      body: data,
    })
    return transaction
  }

  async function editTransaction(id: number, data: Record<string, any>) {
    const updated = await $fetch<Transaction>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: data,
    })
    const idx = transactions.value.findIndex(t => t.id === id)
    if (idx !== -1) transactions.value[idx] = updated
    return updated
  }

  async function removeTransaction(id: number) {
    await $fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    transactions.value = transactions.value.filter(t => t.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  return { transactions, total, loading, error, fetchTransactions, addTransaction, editTransaction, removeTransaction }
}
