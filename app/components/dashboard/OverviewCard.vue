<script setup lang="ts">
const props = defineProps<{
  icon: string
  label: string
  value: string
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
}>()

const trendColorClass = computed(() => {
  if (!props.trend) return ''
  switch (props.trend.direction) {
    case 'up': return 'text-green-500'
    case 'down': return 'text-red-500'
    default: return 'text-gray-400'
  }
})
</script>

<template>
  <UCard>
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-primary/10">
          <UIcon :name="icon" class="w-5 h-5 text-primary" />
        </div>
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ label }}</span>
      </div>
      <p class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ value }}
      </p>
      <div v-if="trend" class="flex items-center gap-1 text-sm">
        <UIcon
          :name="trend.direction === 'up' ? 'i-lucide-trending-up' : trend.direction === 'down' ? 'i-lucide-trending-down' : 'i-lucide-minus'"
          class="w-4 h-4"
          :class="trendColorClass"
        />
        <span :class="trendColorClass">
          {{ trend.value }}
        </span>
      </div>
    </div>
  </UCard>
</template>
