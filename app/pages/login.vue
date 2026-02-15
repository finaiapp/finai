<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <AuthLoginForm />
    </div>
  </div>
</template>
