<script setup lang="ts">
const props = defineProps<{
  categories: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  'filter-change': [filters: { type?: string; categoryId?: number; startDate?: string; endDate?: string }]
}>()

const type = ref('')
const categoryId = ref<number | undefined>(undefined)
const startDate = ref('')
const endDate = ref('')

const typeOptions = [
  { label: 'All Types', value: '' },
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
]

const categoryOptions = computed(() => [
  { label: 'All Categories', value: undefined as unknown as number },
  ...props.categories.map(c => ({ label: c.name, value: c.id })),
])

function emitFilters() {
  emit('filter-change', {
    type: type.value || undefined,
    categoryId: categoryId.value || undefined,
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
  })
}

watch([type, categoryId, startDate, endDate], emitFilters)
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <USelect v-model="type" :items="typeOptions" value-key="value" class="w-40" />
    <USelect v-model="categoryId" :items="categoryOptions" value-key="value" placeholder="All Categories" class="w-48" />
    <UInput v-model="startDate" type="date" placeholder="Start date" class="w-40" />
    <UInput v-model="endDate" type="date" placeholder="End date" class="w-40" />
  </div>
</template>
