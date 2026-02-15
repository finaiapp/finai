<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'Settings - finai',
})

const { user } = useAuth()

const providerLabel = computed(() => {
  switch (user.value?.provider) {
    case 'github': return 'GitHub'
    case 'google': return 'Google'
    default: return 'Email'
  }
})
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
      Settings
    </h1>

    <UCard class="max-w-2xl">
      <div class="flex items-start gap-4">
        <UAvatar
          :src="user?.avatarUrl || undefined"
          :alt="user?.name || 'User'"
          size="lg"
        />
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ user?.name }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ user?.email }}
          </p>
          <div class="mt-3 flex items-center gap-2">
            <UBadge :label="providerLabel" variant="subtle" />
            <UBadge
              v-if="user?.emailVerified"
              label="Verified"
              color="success"
              variant="subtle"
              icon="i-lucide-check-circle"
            />
          </div>
        </div>
      </div>
    </UCard>

    <div class="mt-6 text-sm text-gray-500 dark:text-gray-400">
      More settings coming soon.
    </div>
  </div>
</template>
