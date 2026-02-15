<script setup lang="ts">
const features = [
  {
    icon: 'i-lucide-wallet',
    title: 'Track Spending',
    description: 'Monitor every transaction and understand where your money goes with clear, simple breakdowns.',
  },
  {
    icon: 'i-lucide-target',
    title: 'Budget Planning',
    description: 'Set monthly budgets by category and stay on track with real-time progress indicators.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Secure & Private',
    description: 'Your financial data stays private. Encrypted sessions and no third-party data sharing.',
  },
  {
    icon: 'i-lucide-code',
    title: 'Open Source',
    description: 'Fully open source and self-hostable. Inspect the code, contribute, or run your own instance.',
  },
]
</script>

<template>
  <section aria-label="Features" class="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
          Everything you need
        </h2>
        <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Simple tools to help you make smarter financial decisions.
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <UCard v-for="feature in features" :key="feature.title">
          <div class="flex flex-col items-center text-center">
            <div class="mb-4 p-3 rounded-lg bg-primary/10">
              <UIcon :name="feature.icon" class="w-6 h-6 text-primary" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ feature.title }}
            </h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {{ feature.description }}
            </p>
          </div>
        </UCard>
      </div>
    </div>
  </section>
</template>
