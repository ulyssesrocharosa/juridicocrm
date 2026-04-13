/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4fa',
          100: '#d9e4f0',
          200: '#b3c8e1',
          300: '#7fa5cb',
          400: '#5082b5',
          500: '#2e619e',
          600: '#1e4b85',
          700: '#1e3a5f',
          800: '#172d4a',
          900: '#0f1f35',
        },
        gold: {
          300: '#f0c75a',
          400: '#e8b535',
          500: '#d4a017',
          600: '#b88a10',
          700: '#97710c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
