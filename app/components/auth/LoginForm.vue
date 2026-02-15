<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

const { login } = useAuth()

const state = reactive({
  email: '',
  password: '',
})

const error = ref('')
const unverified = ref(false)
const loading = ref(false)

function validate(state: { email: string; password: string }): FormError[] {
  const errors: FormError[] = []
  if (!state.email) errors.push({ name: 'email', message: 'Email is required' })
  else if (!validateEmail(state.email)) errors.push({ name: 'email', message: 'Invalid email address' })
  if (!state.password) errors.push({ name: 'password', message: 'Password is required' })
  return errors
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  error.value = ''
  unverified.value = false
  loading.value = true

  try {
    await login(event.data.email, event.data.password)
    await navigateTo('/dashboard')
  }
  catch (err: any) {
    const statusCode = err?.statusCode || err?.response?.status

    if (statusCode === 403) {
      unverified.value = true
      return
    }
    error.value = extractErrorMessage(err, 'Login failed')
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
        <h1 class="text-2xl font-bold">Sign in to your account</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back! Please enter your credentials.
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert
        v-if="error"
        color="error"
        :title="error"
        icon="i-lucide-alert-circle"
      />

      <UAlert
        v-if="unverified"
        color="warning"
        title="Please verify your email before signing in."
        icon="i-lucide-mail"
      >
        <template #actions>
          <UButton to="/verify-email" variant="link" label="Resend verification email" />
        </template>
      </UAlert>

      <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" placeholder="you@example.com" icon="i-lucide-mail" />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput v-model="state.password" type="password" placeholder="Enter your password" icon="i-lucide-lock" />
        </UFormField>

        <div class="flex justify-end">
          <NuxtLink to="/forgot-password" class="text-sm text-primary hover:underline">
            Forgot password?
          </NuxtLink>
        </div>

        <UButton type="submit" block :loading="loading" label="Sign In" />
      </UForm>

      <UDivider label="or" />

      <AuthOAuthButtons :disabled="loading" />

      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        Don't have an account?
        <NuxtLink to="/register" class="text-primary hover:underline font-medium">
          Get started
        </NuxtLink>
      </p>
    </div>
  </UCard>
</template>
