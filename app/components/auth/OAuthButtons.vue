<script setup lang="ts">
defineProps<{ disabled?: boolean }>()

const route = useRoute()
const oauthError = computed(() => {
  const error = route.query.error as string
  if (error?.includes('github')) return 'GitHub authentication failed. Please try again.'
  if (error?.includes('google')) return 'Google authentication failed. Please try again.'
  return null
})
</script>

<template>
  <div class="space-y-3">
    <UAlert v-if="oauthError" color="error" :title="oauthError" icon="i-lucide-alert-circle" />
    <div class="grid grid-cols-2 gap-3">
      <UButton
        to="/auth/github"
        external
        block
        variant="outline"
        icon="i-simple-icons-github"
        label="GitHub"
        :disabled="disabled"
      />
      <UButton
        to="/auth/google"
        external
        block
        variant="outline"
        icon="i-simple-icons-google"
        label="Google"
        :disabled="disabled"
      />
    </div>
  </div>
</template>
