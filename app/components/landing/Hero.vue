<template>
  <section aria-label="Introduction" class="py-24 sm:py-32">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
        Take control of your
        <span class="text-primary">finances</span>
      </h1>
      <p class="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        Track spending, plan budgets, and gain insights into your financial health — all in one place.
      </p>
      <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <UButton to="/register" size="xl" label="Get Started" icon="i-lucide-arrow-right" trailing />
        <UButton to="/login" size="xl" variant="ghost" label="Sign In" />
      </div>
    </div>
  </section>
</template>
