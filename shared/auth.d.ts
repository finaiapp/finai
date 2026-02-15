declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    name: string
    avatarUrl: string | null
    emailVerified: boolean
    provider: string | null
  }
}

export {}
