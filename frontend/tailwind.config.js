/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        pizzaRed: {
          500: '#e11d48',
          600: '#be123c',
          700: '#9f1239',
        }
      }
    },
  },
  plugins: [
    function({ addVariant }) {
      addVariant('light', ['html.light &', '[data-theme="light"] &']);
    }
  ],
}
