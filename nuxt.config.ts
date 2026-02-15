// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap' }
      ]
    }
  },

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
      github: {
        clientId: process.env.NUXT_OAUTH_GITHUB_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET
      },
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET
      },
    },
  },
})
