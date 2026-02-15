interface Category {
  id: number
  name: string
  icon: string | null
  color: string | null
}

export function useCategories() {
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCategories() {
    loading.value = true
    error.value = null
    try {
      categories.value = await $fetch<Category[]>('/api/categories')
    }
    catch (err: any) {
      error.value = extractErrorMessage(err)
    }
    finally {
      loading.value = false
    }
  }

  async function addCategory(data: { name: string; icon?: string; color?: string }) {
    const category = await $fetch<Category>('/api/categories', {
      method: 'POST',
      body: data,
    })
    categories.value.push(category)
    return category
  }

  async function removeCategory(id: number) {
    await $fetch(`/api/categories/${id}`, { method: 'DELETE' })
    categories.value = categories.value.filter(c => c.id !== id)
  }

  return { categories, loading, error, fetchCategories, addCategory, removeCategory }
}
