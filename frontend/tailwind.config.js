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
        gray: {
          650: '#2a3447',
          750: '#1a2234',
          850: '#111726',
          950: '#090d16'
        }
      }
    },
  },
  plugins: [],
}