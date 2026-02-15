<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[][] = [
  [
    {
      label: 'Overview',
      icon: 'i-lucide-layout-dashboard',
      to: '/dashboard',
    },
    {
      label: 'Transactions',
      icon: 'i-lucide-arrow-left-right',
      to: '/dashboard/transactions',
    },
    {
      label: 'Budgets',
      icon: 'i-lucide-wallet',
      to: '/dashboard/budgets',
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/dashboard/settings',
    },
  ],
]
</script>

<template>
  <UNavigationMenu
    :items="items"
    orientation="vertical"
    highlight
    class="flex-1"
    aria-label="Dashboard navigation"
  />
</template>
