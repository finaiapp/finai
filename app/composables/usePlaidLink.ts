interface PlaidLinkError {
  error_type: string
  error_code: string
  error_message: string
  display_message: string | null
}

interface PlaidLinkInstitution {
  institution_id: string
  name: string
}

interface PlaidLinkAccount {
  id: string
  name: string
  mask: string | null
  type: string
  subtype: string
}

interface PlaidLinkMetadata {
  institution: PlaidLinkInstitution | null
  accounts: PlaidLinkAccount[]
  link_session_id: string
}

interface PlaidLinkConfig {
  token: string
  onSuccess: (public_token: string, metadata: PlaidLinkMetadata) => void
  onExit: (err: PlaidLinkError | null, metadata: PlaidLinkMetadata) => void
  onEvent?: (eventName: string, metadata: Record<string, unknown>) => void
}

interface PlaidLinkHandler {
  open: () => void
  exit: (options?: { force: boolean }) => void
  destroy: () => void
}

declare global {
  interface Window {
    Plaid?: {
      create: (config: PlaidLinkConfig) => PlaidLinkHandler
    }
  }
}

export function usePlaidLink(onSuccessCallback?: () => void | Promise<void>) {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const success = ref(false)

  let handler: PlaidLinkHandler | null = null
  const { $plaidLinkReady } = useNuxtApp()

  async function openLink() {
    loading.value = true
    error.value = null
    success.value = false

    try {
      // 1. Fetch a fresh link token from the server
      const { link_token } = await $fetch<{ link_token: string }>('/api/plaid/link-token', {
        method: 'POST',
      })

      // 2. Wait for the CDN script to be loaded
      await $plaidLinkReady

      if (!window.Plaid) {
        throw new Error('Plaid Link failed to load')
      }

      // 3. Create the Plaid Link handler
      handler = window.Plaid.create({
        token: link_token,
        onSuccess: async (public_token: string, metadata: PlaidLinkMetadata) => {
          try {
            await $fetch('/api/plaid/exchange', {
              method: 'POST',
              body: {
                public_token,
                metadata: {
                  institution: metadata.institution
                    ? {
                        institution_id: metadata.institution.institution_id,
                        name: metadata.institution.name,
                      }
                    : undefined,
                },
              },
            })
            success.value = true
            if (onSuccessCallback) {
              await onSuccessCallback()
            }
          }
          catch (err: unknown) {
            error.value = handleApiError(err)
          }
          finally {
            loading.value = false
          }
        },
        onExit: (err: PlaidLinkError | null) => {
          if (err) {
            error.value = err.display_message || 'Connection cancelled'
          }
          loading.value = false
        },
      })

      // 4. Open the Plaid Link UI
      handler.open()
    }
    catch (err: unknown) {
      error.value = handleApiError(err)
      loading.value = false
    }
  }

  async function openUpdateLink(itemId: string) {
    loading.value = true
    error.value = null
    success.value = false

    try {
      // 1. Fetch a link token in update mode (with item_id)
      const { link_token } = await $fetch<{ link_token: string }>('/api/plaid/link-token', {
        method: 'POST',
        body: { item_id: itemId },
      })

      // 2. Wait for the CDN script to be loaded
      await $plaidLinkReady

      if (!window.Plaid) {
        throw new Error('Plaid Link failed to load')
      }

      // 3. Create the Plaid Link handler in update mode
      handler = window.Plaid.create({
        token: link_token,
        onSuccess: async () => {
          // Update mode does NOT return a public_token to exchange.
          // Mark the item as healthy after successful re-authentication.
          try {
            await $fetch(`/api/plaid/items/${itemId}/status`, {
              method: 'PATCH',
              body: { status: 'healthy' },
            })
            success.value = true
            if (onSuccessCallback) {
              await onSuccessCallback()
            }
          }
          catch (err: unknown) {
            error.value = handleApiError(err)
          }
          finally {
            loading.value = false
          }
        },
        onExit: (err: PlaidLinkError | null) => {
          if (err) {
            error.value = err.display_message || 'Re-authentication cancelled'
          }
          loading.value = false
        },
      })

      // 4. Open the Plaid Link UI in update mode
      handler.open()
    }
    catch (err: unknown) {
      error.value = handleApiError(err)
      loading.value = false
    }
  }

  // Clean up handler on component unmount
  onUnmounted(() => {
    if (handler) {
      handler.destroy()
      handler = null
    }
  })

  return { openLink, openUpdateLink, loading, error, success }
}
