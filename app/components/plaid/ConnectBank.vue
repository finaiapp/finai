<script setup lang="ts">
const emit = defineEmits<{
  connected: []
}>()

const { openLink, loading, error } = usePlaidLink(async () => {
  emit('connected')
})
</script>

<template>
  <div>
    <UButton
      icon="i-lucide-landmark"
      label="Connect Bank"
      :loading="loading"
      @click="openLink"
    />
    <UAlert
      v-if="error"
      color="error"
      :title="error"
      icon="i-lucide-alert-circle"
      class="mt-3"
    />
  </div>
</template>
