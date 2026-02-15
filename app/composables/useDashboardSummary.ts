interface DashboardSummary {
  totalBalance: string
  monthlySpending: string
  recentTransactionCount: number
}

export function useDashboardSummary() {
  const summary = ref<DashboardSummary | null>(null)
  const loading = ref(false)

  async function fetchSummary() {
    loading.value = true
    try {
      summary.value = await $fetch<DashboardSummary>('/api/dashboard/summary')
    }
    finally {
      loading.value = false
    }
  }

  return { summary, loading, fetchSummary }
}
