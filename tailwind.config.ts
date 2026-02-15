import type { Config } from 'tailwindcss'

export default <Config>{
    content: [
        './app.vue',
        './app/**/*.{vue,js,ts,jsx,tsx}',
        './components/**/*.{vue,js,ts}',
        './layouts/**/*.{vue,js,ts}',
        './pages/**/*.{vue,js,ts}',
        './composables/**/*.{js,ts}',
        './plugins/**/*.{js,ts}',
        './utils/**/*.{js,ts}',
        './{A,a}pp.{vue,js,jsx,mjs,ts,tsx}',
        './{E,e}rror.{vue,js,jsx,mjs,ts,tsx}',
        './app.config.{js,ts,mjs}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                heading: ['Outfit', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#F0F9FF',
                    100: '#E0F2FE',
                    200: '#BAE6FD',
                    300: '#7DD3FC',
                    400: '#38BDF8',
                    500: '#0EA5E9',
                    600: '#0284C7',
                    700: '#0369A1',
                    800: '#075985',
                    900: '#0C4A6E',
                    950: '#082F49',
                },
                success: {
                    500: '#10B981',
                    600: '#059669',
                },
                // We use slate as the neutral gray scale by default in Tailwind, 
                // but explicit mapping helps if we switch to gray/zinc later.
                slate: {
                    850: '#172033', // Custom dark shade between 800 and 900
                }
            }
        }
    }
}
