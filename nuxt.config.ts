// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/test-utils',
    '@nuxt/ui',
    '@nuxtjs/ngrok',
    '@oro.ad/nuxt-claude-devtools',
    'nuxt-auth-utils',
  ],

  runtimeConfig: {
    session: {
      maxAge: 604800,
    },
    oauth: {
      github: {
        clientId: '',
        clientSecret: '',
      },
      google: {
        clientId: '',
        clientSecret: '',
      },
    },
  },
})
