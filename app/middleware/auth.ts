export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/login')
  }

  if (!user.value?.emailVerified && to.path !== '/verify-email') {
    return navigateTo('/verify-email')
  }
})
