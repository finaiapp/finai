<script setup lang="ts">
const { loggedIn, logout } = useAuth()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="text-xl font-bold text-primary">
            finai
          </NuxtLink>
          <nav class="flex items-center gap-4">
            <template v-if="loggedIn">
              <UButton to="/dashboard" variant="ghost" label="Dashboard" />
              <UButton variant="outline" label="Sign Out" @click="logout" />
            </template>
            <template v-else>
              <UButton to="/login" variant="ghost" label="Sign In" />
              <UButton to="/register" label="Get Started" />
            </template>
          </nav>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-gray-200 dark:border-gray-800 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>finai &mdash; Personal Financial Dashboard</p>
        <p class="mt-2">
          <a href="https://github.com/oliverrees/finai" target="_blank" rel="noopener noreferrer" class="hover:text-primary">
            GitHub
          </a>
        </p>
      </div>
    </footer>
  </div>
</template>
