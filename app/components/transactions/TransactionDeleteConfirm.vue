<script setup lang="ts">
defineProps<{
  open: boolean
  description?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const loading = ref(false)
</script>

<template>
  <UModal :open="open" @close="emit('cancel')">
    <template #header>
      <h3 class="text-lg font-semibold">Delete Transaction</h3>
    </template>

    <div class="p-4">
      <p class="text-gray-600 dark:text-gray-400">
        Are you sure you want to delete <span v-if="description" class="font-medium text-gray-900 dark:text-white">"{{ description }}"</span><span v-else>this transaction</span>? This action cannot be undone.
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" label="Cancel" @click="emit('cancel')" />
        <UButton color="error" label="Delete" :loading="loading" @click="emit('confirm')" />
      </div>
    </template>
  </UModal>
</template>
