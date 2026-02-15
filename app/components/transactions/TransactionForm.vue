<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  transaction?: {
    id: number
    type: 'income' | 'expense'
    amount: string
    description: string
    date: string
    categoryId: number | null
    notes: string | null
  }
  categories: { id: number; name: string; icon: string | null }[]
}>()

const emit = defineEmits<{
  submit: [data: {
    type: 'income' | 'expense'
    amount: string
    description: string
    date: string
    categoryId?: number
    notes?: string
  }]
  cancel: []
}>()

const today = new Date().toISOString().split('T')[0]

const state = reactive({
  type: props.transaction?.type ?? 'expense',
  amount: props.transaction?.amount ?? '',
  description: props.transaction?.description ?? '',
  date: props.transaction?.date ?? today,
  categoryId: props.transaction?.categoryId ?? undefined as number | undefined,
  notes: props.transaction?.notes ?? '',
})

const loading = ref(false)
const error = ref('')

const typeOptions = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
]

const categoryOptions = computed(() =>
  props.categories.map(c => ({ label: c.name, value: c.id })),
)

function validate(s: typeof state): FormError[] {
  const result = validateTransactionForm({
    type: s.type,
    amount: s.amount,
    description: s.description ?? '',
    date: s.date ?? '',
  })
  return result.map(e => ({ name: e.field, message: e.message }))
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  error.value = ''
  loading.value = true
  try {
    emit('submit', {
      type: event.data.type as 'income' | 'expense',
      amount: String(event.data.amount),
      description: String(event.data.description),
      date: String(event.data.date),
      categoryId: event.data.categoryId || undefined,
      notes: event.data.notes || undefined,
    })
  }
  catch (err: any) {
    error.value = extractErrorMessage(err)
    loading.value = false
  }
}
</script>

<template>
  <div>
    <UAlert
      v-if="error"
      color="error"
      :title="error"
      icon="i-lucide-alert-circle"
      class="mb-4"
    />

    <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Type" name="type">
        <USelect v-model="state.type" :items="typeOptions" value-key="value" />
      </UFormField>

      <UFormField label="Amount" name="amount">
        <UInput v-model="state.amount" type="number" step="0.01" min="0" placeholder="0.00" icon="i-lucide-dollar-sign" />
      </UFormField>

      <UFormField label="Description" name="description">
        <UInput v-model="state.description" placeholder="What was this for?" icon="i-lucide-text" />
      </UFormField>

      <UFormField label="Date" name="date">
        <UInput v-model="state.date" type="date" icon="i-lucide-calendar" />
      </UFormField>

      <UFormField label="Category" name="categoryId">
        <USelect v-model="state.categoryId" :items="categoryOptions" value-key="value" placeholder="Select a category" />
      </UFormField>

      <UFormField label="Notes" name="notes">
        <UTextarea v-model="state.notes" placeholder="Optional notes..." :rows="2" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton variant="ghost" label="Cancel" :disabled="loading" @click="emit('cancel')" />
        <UButton type="submit" :loading="loading" :label="transaction ? 'Update' : 'Add Transaction'" />
      </div>
    </UForm>
  </div>
</template>
