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
        blue: {
          50: '#FFF1F2',   // Light crimson tint
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#FF1E42',
          600: '#E5092F', // Money Heist Primary Red
          700: '#B11226', // Money Heist Dark Crimson
          800: '#880D1E',
          900: '#5C0815',
          950: '#38040B', // Deep red surface
        },
        slate: {
          50: '#F4F1ED',  // Warm off-white light mode background
          100: '#EBEBE6',
          200: '#E2DDD7', // Light border
          300: '#D1CBC3',
          400: '#A7A7A7', // Muted text
          500: '#6E6E6E',
          600: '#4F4F4F',
          700: '#333333',
          800: '#1F1F1F', // Elevated panel
          900: '#141414', // Tactical Dark Surface
          950: '#0B0B0B', // Money Heist Deepest Charcoal
        },
        brand: {
          blue: {
            50: '#FFF1F2',
            100: '#FFE4E6',
            500: '#FF1E42',
            600: '#E5092F',
            700: '#B11226',
          },
          green: {
            50: '#F0FDF4',
            100: '#DCFCE7',
            500: '#22C55E',
            600: '#16A34A',
            700: '#15803D',
          },
          orange: {
            50: '#FFF7ED',
            100: '#FFEDD5',
            500: '#F97316',
            600: '#EA580C',
            700: '#C2410C',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'lg': '8px',     // 8px
        'xl': '10px',    // 10px (for inputs/buttons)
        '2xl': '12px',   // 12px (for cards)
        '3xl': '16px',   // 16px (for cards/outer panels)
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.03), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.025)',
      }
    },
  },
  plugins: [],
}
