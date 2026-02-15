export default defineNuxtPlugin(() => {
  const plaidLinkReady = new Promise<void>((resolve) => {
    // Guard: if Plaid Link is already loaded, resolve immediately
    if (typeof window !== 'undefined' && (window as any).Plaid) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      console.error('Failed to load Plaid Link script')
      resolve() // Resolve anyway — composable will handle missing window.Plaid
    }
    document.head.appendChild(script)
  })

  return {
    provide: {
      plaidLinkReady,
    },
  }
})
