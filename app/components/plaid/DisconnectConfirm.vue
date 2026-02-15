<script setup lang="ts">
defineProps<{
  open: boolean
  institutionName: string
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <UModal :open="open" @close="emit('cancel')">
    <template #header>
      <h3 class="text-lg font-semibold">Disconnect {{ institutionName }}?</h3>
    </template>

    <div class="p-4">
      <p class="text-gray-600 dark:text-gray-400">
        All accounts from <span class="font-medium text-gray-900 dark:text-white">{{ institutionName }}</span>
        will be removed from your dashboard. Any previously synced transactions will be preserved.
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">
        This action cannot be undone. You can reconnect the institution later.
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" label="Cancel" :disabled="loading" @click="emit('cancel')" />
        <UButton color="error" label="Disconnect" :loading="loading" @click="emit('confirm')" />
      </div>
    </template>
  </UModal>
</template>
