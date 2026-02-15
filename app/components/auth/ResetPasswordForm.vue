<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

const route = useRoute()
const token = computed(() => route.query.token as string | undefined)

const state = reactive({
  password: '',
  confirmPassword: '',
})

const error = ref('')
const success = ref(false)
const loading = ref(false)

function validate(state: { password: string; confirmPassword: string }): FormError[] {
  const errors: FormError[] = []
  if (!state.password) {
    errors.push({ name: 'password', message: 'Password is required' })
  }
  else {
    const result = validatePassword(state.password)
    if (!result.valid) errors.push({ name: 'password', message: result.message! })
  }
  if (!state.confirmPassword) {
    errors.push({ name: 'confirmPassword', message: 'Please confirm your password' })
  }
  else if (state.password !== state.confirmPassword) {
    errors.push({ name: 'confirmPassword', message: 'Passwords do not match' })
  }
  return errors
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  error.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: event.data.password },
    })
    success.value = true
  }
  catch (err: any) {
    error.value = extractErrorMessage(err, 'Failed to reset password')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="text-center">
        <h1 class="text-2xl font-bold">Reset your password</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your new password below.
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert
        v-if="!token"
        color="error"
        title="Invalid or missing reset link. Please request a new one."
        icon="i-lucide-alert-circle"
      >
        <template #actions>
          <UButton to="/forgot-password" variant="link" label="Request new link" />
        </template>
      </UAlert>

      <UAlert
        v-if="success"
        color="success"
        title="Password reset successfully!"
        icon="i-lucide-check-circle"
      >
        <template #actions>
          <UButton to="/login" variant="link" label="Sign in" />
        </template>
      </UAlert>

      <UAlert
        v-if="error"
        color="error"
        :title="error"
        icon="i-lucide-alert-circle"
      />

      <template v-if="token && !success">
        <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField label="New Password" name="password" hint="Min 8 chars, 1 uppercase, 1 lowercase, 1 digit">
            <UInput v-model="state.password" type="password" placeholder="Enter new password" icon="i-lucide-lock" />
          </UFormField>

          <UFormField label="Confirm Password" name="confirmPassword">
            <UInput v-model="state.confirmPassword" type="password" placeholder="Confirm new password" icon="i-lucide-lock" />
          </UFormField>

          <UButton type="submit" block :loading="loading" label="Reset Password" />
        </UForm>
      </template>

      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        <NuxtLink to="/login" class="text-primary hover:underline font-medium">
          Back to sign in
        </NuxtLink>
      </p>
    </div>
  </UCard>
</template>
