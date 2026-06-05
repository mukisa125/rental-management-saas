/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#16a34a',
          600: '#15803d',
          700: '#14532d',
          800: '#064e3b',
          900: '#022c22',
        },
      },
    },
  },
  plugins: [],
}
