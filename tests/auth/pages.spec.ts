import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Login Page', () => {
  test('renders login form with heading, inputs, and submit button', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })

    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('has forgot password link', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })

    const link = page.getByRole('link', { name: 'Forgot password?' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/forgot-password')
  })

  test('has link to register page', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })

    const link = page.getByRole('link', { name: 'Get started' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/register')
  })

  test('has OAuth buttons for GitHub and Google', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })

    const githubButton = page.getByRole('link', { name: 'GitHub' })
    const googleButton = page.getByRole('link', { name: 'Google' })

    await expect(githubButton).toBeVisible()
    await expect(googleButton).toBeVisible()
    await expect(githubButton).toHaveAttribute('href', '/auth/github')
    await expect(googleButton).toHaveAttribute('href', '/auth/google')
  })

  test('shows validation errors for empty form submission', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })

    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })
})

test.describe('Register Page', () => {
  test('renders registration form with heading, inputs, and submit button', async ({ page, goto }) => {
    await goto('/register', { waitUntil: 'hydration' })

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
    await expect(page.getByPlaceholder('Your name')).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('Create a password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  })

  test('has link to login page', async ({ page, goto }) => {
    await goto('/register', { waitUntil: 'hydration' })

    const link = page.getByRole('link', { name: 'Sign in' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/login')
  })

  test('shows validation errors for empty form submission', async ({ page, goto }) => {
    await goto('/register', { waitUntil: 'hydration' })

    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('validates password requirements for weak password', async ({ page, goto }) => {
    await goto('/register', { waitUntil: 'hydration' })

    // Fill name and email to avoid those validation errors
    await page.getByPlaceholder('Your name').fill('Test User')
    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    await page.getByPlaceholder('Create a password').fill('weak')

    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByText('at least 8 characters')).toBeVisible()
  })
})

test.describe('Forgot Password Page', () => {
  test('renders forgot password form with heading and email input', async ({ page, goto }) => {
    await goto('/forgot-password', { waitUntil: 'hydration' })

    await expect(page.getByRole('heading', { name: /Forgot/ })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible()
  })
})

test.describe('Verify Email Page', () => {
  test('renders verify email instructions', async ({ page, goto }) => {
    await goto('/verify-email', { waitUntil: 'hydration' })

    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible()
  })

  test('has link back to sign in', async ({ page, goto }) => {
    await goto('/verify-email', { waitUntil: 'hydration' })

    const link = page.getByRole('link', { name: 'Back to sign in' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/login')
  })
})
