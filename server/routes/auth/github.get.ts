export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true,
    scope: ['user:email', 'read:user'],
  },
  async onSuccess(event, { user: ghUser }) {
    const user = await upsertOAuthUser('github', {
      id: String(ghUser.id),
      email: ghUser.email as string,
      name: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url,
    })

    if (!user) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create or update user' })
    }

    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        provider: user.provider,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/dashboard')
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/login?error=github_auth_failed')
  },
})
