export default defineNuxtRouteMiddleware(() => {
  const { loggedIn, user } = useUserSession()

  if (loggedIn.value && user.value?.emailVerified) {
    return navigateTo('/dashboard')
  }
})
