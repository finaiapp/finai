<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

const { register } = useAuth()

const state = reactive({
  name: '',
  email: '',
  password: '',
})

const error = ref('')
const success = ref(false)
const loading = ref(false)

function validate(state: { name: string; email: string; password: string }): FormError[] {
  const errors: FormError[] = []
  if (!state.name?.trim()) errors.push({ name: 'name', message: 'Name is required' })
  if (!state.email) errors.push({ name: 'email', message: 'Email is required' })
  else if (!validateEmail(state.email)) errors.push({ name: 'email', message: 'Invalid email address' })
  if (!state.password) {
    errors.push({ name: 'password', message: 'Password is required' })
  }
  else {
    const result = validatePassword(state.password)
    if (!result.valid) errors.push({ name: 'password', message: result.message! })
  }
  return errors
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  error.value = ''
  loading.value = true

  try {
    await register(event.data.email, event.data.password, event.data.name.trim())
    success.value = true
  }
  catch (err: any) {
    error.value = extractErrorMessage(err, 'Registration failed')
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
        <h1 class="text-2xl font-bold">Create your account</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Start managing your finances today.
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert
        v-if="success"
        color="success"
        title="Account created! Check your email for a verification link."
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
          <UFormField label="Name" name="name">
            <UInput v-model="state.name" placeholder="Your name" icon="i-lucide-user" maxlength="100" />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput v-model="state.email" type="email" placeholder="you@example.com" icon="i-lucide-mail" />
          </UFormField>

          <UFormField label="Password" name="password" hint="Min 8 chars, 1 uppercase, 1 lowercase, 1 digit">
            <UInput v-model="state.password" type="password" placeholder="Create a password" icon="i-lucide-lock" />
          </UFormField>

          <UButton type="submit" block :loading="loading" label="Create Account" />
        </UForm>

        <UDivider label="or" />

        <AuthOAuthButtons :disabled="loading" />
      </template>

      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?
        <NuxtLink to="/login" class="text-primary hover:underline font-medium">
          Sign in
        </NuxtLink>
      </p>
    </div>
  </UCard>
</template>
