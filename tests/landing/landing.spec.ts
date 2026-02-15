import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Landing Page', () => {
  test('renders with correct title', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })
    await expect(page).toHaveTitle('finai - Personal Financial Dashboard')
  })

  test('displays hero section with CTA buttons', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const hero = page.locator('section[aria-label="Introduction"]')
    await expect(hero).toBeVisible()

    // Heading contains the text split across elements
    await expect(hero.locator('h1')).toContainText('Take control of your')
    await expect(hero.locator('h1')).toContainText('finances')

    // CTA buttons
    await expect(hero.getByRole('link', { name: 'Get Started' })).toBeVisible()
    await expect(hero.getByRole('link', { name: 'Sign In' })).toBeVisible()
  })

  test('displays all four feature cards', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const features = page.locator('section[aria-label="Features"]')
    await expect(features).toBeVisible()

    const featureTitles = ['Track Spending', 'Budget Planning', 'Secure & Private', 'Open Source']
    for (const title of featureTitles) {
      await expect(features.getByText(title, { exact: true })).toBeVisible()
    }
  })

  test('displays call-to-action section', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const cta = page.locator('section[aria-label="Call to action"]')
    await expect(cta).toBeVisible()
    await expect(cta.getByText('Ready to get started?')).toBeVisible()
    await expect(cta.getByRole('link', { name: 'Create Your Account' })).toBeVisible()
  })

  test('header shows Sign In and Get Started for unauthenticated users', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const header = page.locator('header')
    await expect(header.getByRole('link', { name: 'Sign In' })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Get Started' })).toBeVisible()
  })

  test('footer displays GitHub link', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const footer = page.locator('footer')
    const githubLink = footer.getByRole('link', { name: 'GitHub' })
    await expect(githubLink).toBeVisible()
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/oliverrees/finai')
  })

  test('Get Started button navigates to /register', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const hero = page.locator('section[aria-label="Introduction"]')
    await hero.getByRole('link', { name: 'Get Started' }).click()
    await page.waitForURL('**/register')
    expect(page.url()).toContain('/register')
  })

  test('Sign In button navigates to /login', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const hero = page.locator('section[aria-label="Introduction"]')
    await hero.getByRole('link', { name: 'Sign In' }).click()
    await page.waitForURL('**/login')
    expect(page.url()).toContain('/login')
  })
})
