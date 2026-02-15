<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'Accounts - finai',
})

const accountsListRef = ref<{ refresh: () => Promise<void> } | null>(null)

function onConnected() {
  accountsListRef.value?.refresh()
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Bank Accounts
      </h1>
      <PlaidConnectBank @connected="onConnected" />
    </div>

    <PlaidAccountsList ref="accountsListRef" />
  </div>
</template>
