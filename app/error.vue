<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

function handleError() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="text-center max-w-md">
      <h1 class="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">
        {{ error.statusCode || 500 }}
      </h1>
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}
      </h2>
      <p class="text-gray-500 dark:text-gray-400 mb-6">
        {{ error.statusCode === 404
          ? "The page you're looking for doesn't exist."
          : 'An unexpected error occurred. Please try again.'
        }}
      </p>
      <UButton label="Go Home" icon="i-lucide-home" @click="handleError" />
    </div>
  </div>
</template>
