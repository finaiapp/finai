interface DashboardSummary {
  totalBalance: string
  monthlySpending: string
  recentTransactionCount: number
}

export function useDashboardSummary() {
  const summary = ref<DashboardSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSummary() {
    loading.value = true
    error.value = null
    try {
      summary.value = await $fetch<DashboardSummary>('/api/dashboard/summary')
    }
    catch (err: any) {
      error.value = handleApiError(err)
    }
    finally {
      loading.value = false
    }
  }

  return { summary, loading, error, fetchSummary }
}
