interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  emailVerified: boolean
  provider: string
}

interface LoginResponse {
  user: AuthUser
}

interface RegisterResponse {
  message: string
}

export function useAuth() {
  const { loggedIn, user, session, fetch, clear } = useUserSession()

  async function login(email: string, password: string): Promise<LoginResponse> {
    const data = await $fetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    await fetch() // refresh client-side session state
    return data
  }

  async function register(email: string, password: string, name: string): Promise<RegisterResponse> {
    return await $fetch<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: { email, password, name },
    })
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/')
  }

  return { loggedIn, user, session, login, register, logout, refreshSession: fetch }
}
