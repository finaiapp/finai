<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'Budgets - finai',
})
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
      Budgets
    </h1>
    <div role="status" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <UIcon name="i-lucide-wallet" class="w-8 h-8 text-gray-400" />
      </div>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        No budgets yet
      </h2>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        Create your first budget to start tracking your spending by category.
      </p>
    </div>
  </div>
</template>
