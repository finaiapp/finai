export function handleApiError(err: any): string {
  // If 401, session expired — redirect to login
  if (err?.statusCode === 401 || err?.status === 401) {
    const { clear } = useUserSession()
    clear().then(() => { navigateTo('/login') })
    return 'Session expired. Redirecting to login...'
  }
  return extractErrorMessage(err)
}
