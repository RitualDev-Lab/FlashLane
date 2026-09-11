/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#06090e',
          900: '#0b0f17',
          850: '#111723',
          800: '#182030',
          700: '#232d42',
          600: '#33415c',
        },
        brand: {
          cyan: '#00D4FF',
          indigo: '#6366f1',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        mono: ['"Fira Code"', 'Consolas', 'Monaco', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 212, 255, 0.35)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.35)',
        'inset-skeuo': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.6), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
