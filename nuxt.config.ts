// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/test-utils',
    '@nuxt/ui',
    '@oro.ad/nuxt-claude-devtools',
    'nuxt-auth-utils',
    '@nuxtjs/ngrok',
  ],

  ngrok: {
    authtoken: process.env.NGROK_AUTHTOKEN,
  },

  devServer: {
    host: '0.0.0.0',
    port: 3889
  },

  vite: {
    server: {
      // Allow ngrok hosts in development
      allowedHosts: [
        'localhost',
        'ununited-mentionable-miyoko.ngrok-free.dev',  // Add exact host
        '.localhost',
        '.ngrok-free.dev',
        '.ngrok.io',
        '.ngrok.app',
      ],
      hmr: {
        protocol: 'wss',
        clientPort: 443,
      },
    },
  },

  runtimeConfig: {
    session: {
      maxAge: 604800,
      password: process.env.SESSION_PASSWORD!,
    },
    oauth: {
      github: { clientId: '', clientSecret: '' },
      google: { clientId: '', clientSecret: '' },
    },
  },
})
