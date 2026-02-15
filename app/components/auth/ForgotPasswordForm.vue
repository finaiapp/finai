<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

const state = reactive({
  email: '',
})

const error = ref('')
const success = ref(false)
const loading = ref(false)

function validate(state: { email: string }): FormError[] {
  const errors: FormError[] = []
  if (!state.email) errors.push({ name: 'email', message: 'Email is required' })
  else if (!validateEmail(state.email)) errors.push({ name: 'email', message: 'Invalid email address' })
  return errors
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  error.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: event.data.email },
    })
    success.value = true
  }
  catch (err: any) {
    error.value = extractErrorMessage(err)
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
        <h1 class="text-2xl font-bold">Forgot your password?</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your email and we'll send you a reset link.
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert
        v-if="success"
        color="success"
        title="If an account exists with that email, a reset link has been sent."
        icon="i-lucide-check-circle"
      />

      <UAlert
        v-if="error"
        color="error"
        :title="error"
        icon="i-lucide-alert-circle"
      />

      <template v-if="!success">
        <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField label="Email" name="email">
            <UInput v-model="state.email" type="email" placeholder="you@example.com" icon="i-lucide-mail" />
          </UFormField>

          <UButton type="submit" block :loading="loading" label="Send Reset Link" />
        </UForm>
      </template>

      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        Remember your password?
        <NuxtLink to="/login" class="text-primary hover:underline font-medium">
          Sign in
        </NuxtLink>
      </p>
    </div>
  </UCard>
</template>
