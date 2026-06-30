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
          card: '#2a475e',
          hover: '#3d6c8e',
          blue: '#66c0f4',
          green: '#a4d007',
          text: '#c7d5e0',
          light: '#ffffff',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
