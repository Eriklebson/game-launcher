/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        steam: {
          dark: '#1b2838',
          darker: '#171a21',
          darkest: '#0e1621',
          card: '#1e2a3a',
          'card-hover': '#2a475e',
          hover: '#3d6c8e',
          blue: '#66c0f4',
          'blue-dark': '#4b8bb9',
          green: '#a4d007',
          'green-dark': '#7ba305',
          orange: '#cf6a32',
          red: '#d94126',
          text: '#c7d5e0',
          'text-secondary': '#8b9bb4',
          light: '#ffffff',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.4)',
        'dropdown': '0 4px 16px rgba(0, 0, 0, 0.5)',
        'glow-blue': '0 0 20px rgba(102, 192, 244, 0.2)',
        'glow-green': '0 0 20px rgba(164, 208, 7, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
}
