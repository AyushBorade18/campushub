/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['DM Sans', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 500: '#6366f1', 600: '#4f46e5', 100: '#e0e7ff' },
      },
    },
  },
  plugins: [],
}
