<script setup lang="ts">
const { user, logout } = useAuth()
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar>
      <template #header>
        <div class="p-4">
          <NuxtLink to="/" class="text-xl font-bold text-primary">
            finai
          </NuxtLink>
        </div>
      </template>

      <DashboardSidebar />

      <template #footer>
        <div class="p-4 border-t border-gray-200 dark:border-gray-800">
          <div v-if="user" class="flex items-center gap-3 mb-3">
            <UAvatar
              :src="user.avatarUrl || undefined"
              :alt="user.name || 'User'"
              size="sm"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {{ user.name }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ user.email }}
              </p>
            </div>
          </div>
          <UButton
            label="Sign Out"
            icon="i-lucide-log-out"
            variant="ghost"
            color="neutral"
            block
            @click="logout"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <slot />
    </UDashboardPanel>
  </UDashboardGroup>
</template>
