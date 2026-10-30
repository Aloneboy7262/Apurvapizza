/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#090d16',
        darkSurface: '#0f172a',
        darkCard: 'rgba(15, 23, 42, 0.75)',
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        kds: {
          pending: '#f59e0b',
          preparing: '#3b82f6',
          ready: '#10b981',
          delivered: '#64748b'
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(249, 115, 22, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(249, 115, 22, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
