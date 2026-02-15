<script setup lang="ts">
defineProps<{
  institutionName: string
  loading: boolean
}>()

const emit = defineEmits<{
  reauth: []
}>()
</script>

<template>
  <UAlert
    color="warning"
    icon="i-lucide-alert-triangle"
    title="Connection needs attention"
    :description="`${institutionName} requires re-authentication. Your accounts are safe but data may be stale.`"
  >
    <template #actions>
      <UButton
        label="Re-authenticate"
        color="warning"
        variant="solid"
        size="xs"
        :loading="loading"
        @click="emit('reauth')"
      />
    </template>
  </UAlert>
</template>
