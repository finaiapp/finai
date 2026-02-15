<script setup lang="ts">
const route = useRoute()
const { user, refreshSession } = useAuth()

const token = computed(() => route.query.token as string | undefined)
const email = computed(() => (user.value?.email || route.query.email) as string | undefined)

const verifying = ref(false)
const verified = ref(false)
const error = ref('')
const resent = ref(false)
const resending = ref(false)

onMounted(async () => {
  if (token.value) {
    verifying.value = true
    try {
      await $fetch('/api/auth/verify-email', {
        method: 'POST',
        body: { token: token.value },
      })
      verified.value = true
      await refreshSession()
      await navigateTo('/dashboard')
    }
    catch (err: any) {
      error.value = err?.statusMessage || err?.data?.message || 'Invalid or expired verification link'
    }
    finally {
      verifying.value = false
    }
  }
})

async function resendVerification() {
  if (!email.value) return
  resending.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: email.value },
    })
    resent.value = true
  }
  catch (err: any) {
    error.value = err?.statusMessage || err?.data?.message || 'Failed to resend verification email'
  }
  finally {
    resending.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <UCard>
        <template #header>
          <div class="text-center">
            <h1 class="text-2xl font-bold">Verify your email</h1>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Verifying token state -->
          <div v-if="verifying" class="text-center py-8">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-primary mb-4" />
            <p class="text-gray-500 dark:text-gray-400">Verifying your email...</p>
          </div>

          <!-- Error state -->
          <UAlert
            v-if="error"
            color="error"
            :title="error"
            icon="i-lucide-alert-circle"
          />

          <!-- Waiting for verification (no token in URL) -->
          <template v-if="!token && !verifying">
            <div class="text-center py-4">
              <UIcon name="i-lucide-mail" class="text-4xl text-primary mb-4" />
              <p class="text-gray-600 dark:text-gray-300">
                We sent a verification email to
                <strong v-if="email">{{ email }}</strong>
                <span v-else>your email address</span>.
              </p>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Please check your inbox and click the verification link.
              </p>
            </div>

            <UAlert
              v-if="resent"
              color="success"
              title="Verification email resent! Check your inbox."
              icon="i-lucide-check-circle"
            />

            <UButton
              v-if="email && !resent"
              block
              variant="outline"
              :loading="resending"
              label="Resend verification email"
              icon="i-lucide-refresh-cw"
              @click="resendVerification"
            />
          </template>

          <p class="text-center text-sm text-gray-500 dark:text-gray-400">
            <NuxtLink to="/login" class="text-primary hover:underline font-medium">
              Back to sign in
            </NuxtLink>
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>
